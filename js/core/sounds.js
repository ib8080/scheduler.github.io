/* sounds.js — свои звуки будильника.
   Файлы хранятся в браузере в IndexedDB (Blob, без base64), поэтому
   остаются доступны после перезагрузки и работают офлайн. Если IndexedDB
   недоступна (например, в тестовой среде), звуки живут в памяти до перезагрузки. */
(function (App) {
  'use strict';

  const DB_NAME = 'school_planner_sounds';
  const STORE_NAME = 'files';
  const DB_VERSION = 1;
  const MAX_BYTES = 5 * 1024 * 1024;
  const ALLOWED_EXT = /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|webm)$/i;

  const memory = new Map();
  let dbPromise = null;
  let mode = typeof window.indexedDB !== 'undefined' ? 'indexeddb' : 'memory';
  let currentAudio = null;
  let currentUrl = '';
  let playToken = 0;

  function makeId() {
    return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function openDB() {
    if (mode !== 'indexeddb') return Promise.reject(new Error('indexeddb-unavailable'));
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        let request;
        try {
          request = window.indexedDB.open(DB_NAME, DB_VERSION);
        } catch (e) {
          reject(e);
          return;
        }
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('indexeddb-error'));
        request.onblocked = () => reject(new Error('indexeddb-blocked'));
      }).catch((error) => {
        dbPromise = null;
        mode = 'memory';
        throw error;
      });
    }
    return dbPromise;
  }

  function idbPut(record) {
    return openDB().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('indexeddb-write'));
      tx.onabort = () => reject(tx.error || new Error('indexeddb-abort'));
    }));
  }

  function idbGet(id) {
    return openDB().then(db => new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('indexeddb-read'));
    }));
  }

  function idbGetAll() {
    return openDB().then(db => new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error || new Error('indexeddb-read'));
    }));
  }

  function idbDelete(id) {
    return openDB().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('indexeddb-delete'));
    }));
  }

  function meta(record) {
    return {
      id: record.id,
      name: record.name,
      size: record.size,
      type: record.type,
      createdAt: record.createdAt,
      persistent: mode !== 'memory'
    };
  }

  function validate(file) {
    if (!file) return 'Файл не выбран.';
    const type = String(file.type || '').toLowerCase();
    const name = String(file.name || '').toLowerCase();
    if (!type.startsWith('audio/') && !ALLOWED_EXT.test(name)) {
      return 'Нужен аудиофайл: mp3, wav, ogg, m4a, aac или flac.';
    }
    if (file.size > MAX_BYTES) {
      return 'Файл больше 5 МБ — выбери звук покороче.';
    }
    return '';
  }

  function addFile(file) {
    const error = validate(file);
    if (error) return Promise.reject(new Error(error));

    const record = {
      id: makeId(),
      name: String(file.name || 'Звук').slice(0, 80),
      size: file.size || 0,
      type: file.type || '',
      createdAt: Date.now(),
      blob: file
    };

    if (mode !== 'indexeddb') {
      memory.set(record.id, record);
      return Promise.resolve(meta(record));
    }
    return idbPut(record).then(() => meta(record)).catch(() => {
      // не удалось записать в базу — хотя бы до перезагрузки
      mode = 'memory';
      memory.set(record.id, record);
      return meta(record);
    });
  }

  function list() {
    if (mode === 'memory') {
      return Promise.resolve([...memory.values()].map(meta).sort((a, b) => a.createdAt - b.createdAt));
    }
    return idbGetAll().then(records => records.map(meta).sort((a, b) => a.createdAt - b.createdAt))
      .catch(() => {
        mode = 'memory';
        return [...memory.values()].map(meta).sort((a, b) => a.createdAt - b.createdAt);
      });
  }

  function getBlob(id) {
    if (memory.has(id)) return Promise.resolve(memory.get(id).blob);
    if (mode === 'memory') return Promise.reject(new Error('not-found'));
    return idbGet(id).then((record) => {
      if (!record || !record.blob) throw new Error('not-found');
      return record.blob;
    });
  }

  function remove(id) {
    memory.delete(id);
    if (mode !== 'indexeddb') return Promise.resolve();
    return idbDelete(id).catch(() => {});
  }

  // Полная очистка: удаляет и файлы из IndexedDB, и запасную копию в памяти.
  // Нужна кнопке «Удалить все данные» в настройках.
  function clearAll() {
    memory.clear();
    stop();
    if (mode !== 'indexeddb') return Promise.resolve();
    return openDB().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('indexeddb-clear'));
      tx.onabort = () => reject(tx.error || new Error('indexeddb-clear-abort'));
    })).catch(() => {});
  }

  function stop() {
    playToken += 1;
    if (!currentAudio) return;
    const audio = currentAudio;
    currentAudio = null;
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (e) { /* уже остановлен */ }
    if (currentUrl) {
      try { URL.revokeObjectURL(currentUrl); } catch (e) { /* адрес уже отозван */ }
      currentUrl = '';
    }
  }

  // Проигрывает один раз. Возвращает false, если воспроизведение недоступно.
  function play(id) {
    stop();
    const token = playToken;
    return getBlob(id).then((blob) => {
      // пока файл загружался, звук уже отменили (например, закрыли оверлей)
      if (token !== playToken) return 'cancelled';
      if (typeof window.Audio === 'undefined' || typeof URL === 'undefined'
        || typeof URL.createObjectURL !== 'function') return false;

      const url = URL.createObjectURL(blob);
      const audio = new window.Audio(url);
      currentAudio = audio;
      currentUrl = url;

      const cleanup = () => {
        if (currentAudio === audio) stop();
      };
      audio.addEventListener('ended', cleanup);
      audio.addEventListener('error', cleanup);

      const started = audio.play();
      if (started && typeof started.catch === 'function') started.catch(cleanup);
      return true;
    }).catch(() => false);
  }

  App.sounds = {
    addFile,
    list,
    getBlob,
    remove,
    clearAll,
    play,
    stop,
    validate,
    MAX_BYTES,
    get persistent() { return mode !== 'memory'; }
  };
})(window.App = window.App || {});
