/* settings.js — модалка настроек: редактирование главной, экспорт и импорт JSON,
   удаление данных, переключение темы и своя тема из вставленного CSS. */
(function (App) {
  'use strict';

  const { getTodayKey, getMonthKey, escapeHtml } = App.utils;

  let lastExport = null;
  let previewing = false;

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (e) {
      return value;
    }
  }

  function close() {
    // прослушивание своего звука не должно остаться после закрытия настроек
    if (previewing) {
      if (App.sound) App.sound.stop();
      previewing = false;
    }
    document.querySelectorAll('.settings-modal').forEach(modal => modal.remove());
  }

  function setStatus(element, kind, text) {
    if (!element) return;
    element.textContent = text || '';
    element.classList.toggle('ok', kind === 'ok');
    element.classList.toggle('warn', kind === 'warn');
  }

  // ===== Экспорт =====

  // Служебные поля рантайма (например, id интервала таймера) в файл не пишем
  function cleanBlocks(blocks) {
    return (blocks || []).map(block => {
      const copy = {};
      Object.keys(block).forEach(key => {
        if (key.charAt(0) !== '_') copy[key] = clone(block[key]);
      });
      return copy;
    });
  }

  // Прогресс интерактивных уроков лежит отдельными ключами lesson_progress_v1_<месяц>
  function collectLessonProgress() {
    const result = {};
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (!key || key.indexOf('lesson_progress_v1_') !== 0) continue;
        const raw = window.localStorage.getItem(key);
        try {
          result[key] = JSON.parse(raw);
        } catch (e) {
          result[key] = raw;
        }
      }
    } catch (e) { /* localStorage недоступен — просто пропускаем */ }
    return result;
  }

  function pickKeys(source, test) {
    const result = {};
    Object.keys(source || {}).forEach(key => {
      if (test(key)) result[key] = clone(source[key]);
    });
    return result;
  }

  function buildExport(options) {
    const opts = options || {};
    const state = App.state;
    const type = opts.period === 'month' || opts.period === 'range' ? opts.period : 'all';

    let period = { type: 'all' };
    let dateTest = () => true;
    let monthTest = () => true;

    if (type === 'month' && /^\d{4}-\d{2}$/.test(String(opts.month || ''))) {
      period = { type: 'month', month: opts.month };
      dateTest = key => String(key).startsWith(opts.month + '-');
      monthTest = key => String(key) === opts.month;
    } else if (type === 'range') {
      let from = String(opts.from || '');
      let to = String(opts.to || '');
      if (/^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
        if (from > to) {
          const swap = from;
          from = to;
          to = swap;
        }
        period = { type: 'range', from, to };
        dateTest = key => {
          const value = String(key).slice(0, 10);
          return value >= from && value <= to;
        };
        monthTest = key => {
          const month = String(key).slice(0, 7);
          return month >= from.slice(0, 7) && month <= to.slice(0, 7);
        };
      }
    }

    const goals = (state.goals || []).filter(goal => {
      if (period.type === 'all') return true;
      const dates = [goal.dueDate, goal.doneDate, goal.createdAt].filter(Boolean);
      return dates.some(date => dateTest(String(date).slice(0, 10)));
    });

    return {
      meta: {
        app: 'school-planner',
        version: 3,
        stateKey: App.config.STORAGE_KEY,
        exportedAt: new Date().toISOString(),
        period,
        note: 'Блоки и их настройки выгружаются всегда, данные — за выбранный период.'
      },
      blocks: cleanBlocks(state.blocks),
      order: [...(state.order || [])],
      hidden: [...(state.hidden || [])],
      xp: state.xp,
      streak: state.streak,
      weekSchedule: clone(state.weekSchedule || {}),
      dailyTasks: pickKeys(state.dailyTasks, dateTest),
      dayNotes: pickKeys(state.dayNotes, dateTest),
      monthReviews: (state.monthReviews || []).filter(review => monthTest(review.monthKey || '')),
      goals,
      permanentNotes: String(state.permanentNotes || ''),
      stepsProgress: clone(state.stepsProgress || {}),
      lessonProgress: collectLessonProgress(),
      pomodoro: clone(state.pomodoro),
      theme: clone(App.ui.theme.get()),
      flags: clone(state.flags || {})
    };
  }

  function exportFilename(period) {
    if (period && period.type === 'month') return `planner-${period.month}.json`;
    if (period && period.type === 'range') return `planner-${period.from}_${period.to}.json`;
    return `planner-${getTodayKey()}.json`;
  }

  // ===== Импорт =====

  function readFileText(file) {
    return new Promise((resolve, reject) => {
      if (file && typeof file.text === 'function') {
        file.text().then(resolve, reject);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('read-error'));
      reader.readAsText(file);
    });
  }

  function parseImport(text) {
    let payload;
    try {
      payload = JSON.parse(String(text || ''));
    } catch (e) {
      throw new Error('Файл повреждён: это не JSON.');
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('В файле нет данных ежедневника.');
    }
    const app = payload.meta && payload.meta.app;
    if (app && app !== 'school-planner') {
      throw new Error('Это файл другого приложения, а не ежедневника.');
    }
    if (!app && !Array.isArray(payload.blocks)) {
      throw new Error('В файле нет данных ежедневника.');
    }
    return payload;
  }

  // Полный экспорт — это бэкап: заменяем данные целиком.
  // Экспорт за месяц/период — дополняем текущие данные записями из файла.
  function applyImport(payload) {
    const isFull = !payload.meta || !payload.meta.period || payload.meta.period.type === 'all';
    let next;

    if (isFull) {
      next = App.config.createDefaultState();
      [
        'blocks', 'order', 'hidden', 'xp', 'streak', 'weekSchedule', 'dailyTasks',
        'dayNotes', 'permanentNotes', 'monthReviews', 'goals', 'stepsProgress',
        'pomodoro', 'theme', 'flags'
      ].forEach(key => {
        if (payload[key] !== undefined) next[key] = clone(payload[key]);
      });
    } else {
      next = clone(App.state);
      if (Array.isArray(payload.blocks)) next.blocks = clone(payload.blocks);
      if (Array.isArray(payload.order)) next.order = [...payload.order];
      if (Array.isArray(payload.hidden)) next.hidden = [...payload.hidden];
      next.xp = Math.max(Number(next.xp) || 0, Number(payload.xp) || 0);
      next.streak = Math.max(Number(next.streak) || 0, Number(payload.streak) || 0);
      if (payload.weekSchedule && typeof payload.weekSchedule === 'object') {
        next.weekSchedule = { ...(next.weekSchedule || {}), ...clone(payload.weekSchedule) };
      }
      next.dailyTasks = { ...(next.dailyTasks || {}), ...clone(payload.dailyTasks || {}) };
      next.dayNotes = { ...(next.dayNotes || {}), ...clone(payload.dayNotes || {}) };
      if (typeof payload.permanentNotes === 'string') next.permanentNotes = payload.permanentNotes;
      next.stepsProgress = { ...(next.stepsProgress || {}), ...clone(payload.stepsProgress || {}) };

      const reviews = new Map();
      (next.monthReviews || []).forEach(review => {
        if (review && review.monthKey) reviews.set(review.monthKey, review);
      });
      (payload.monthReviews || []).forEach(review => {
        if (review && review.monthKey) reviews.set(review.monthKey, review);
      });
      next.monthReviews = [...reviews.values()];

      const goals = new Map();
      (next.goals || []).forEach(goal => { if (goal && goal.id) goals.set(goal.id, goal); });
      (payload.goals || []).forEach(goal => { if (goal && goal.id) goals.set(goal.id, goal); });
      next.goals = [...goals.values()];

      if (payload.pomodoro) next.pomodoro = clone(payload.pomodoro);
      if (payload.theme) next.theme = clone(payload.theme);
      if (payload.flags) next.flags = { ...(next.flags || {}), ...clone(payload.flags) };
    }

    // Таймер из файла не должен «выстрелить» сразу после импорта
    if (next.pomodoro && typeof next.pomodoro === 'object') {
      next.pomodoro.endAt = null;
    }

    window.localStorage.setItem(App.config.STORAGE_KEY, JSON.stringify(next));

    Object.keys(payload.lessonProgress || {}).forEach(key => {
      if (key.indexOf('lesson_progress_v1_') !== 0) return;
      const value = payload.lessonProgress[key];
      window.localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    });

    App.state = App.storage.loadState();
    App.save();
    return isFull;
  }

  function importFile(file) {
    return readFileText(file)
      .then(text => {
        const payload = parseImport(text);
        const isFull = applyImport(payload);
        return { payload, isFull };
      });
  }

  // Перерисовываем приложение после импорта/удаления — без перезагрузки,
  // чтобы не терять прокрутку и не зависеть от file://.
  function refreshApp() {
    try {
      if (App.ui && App.ui.theme) App.ui.theme.apply(App.ui.theme.get().mode, { save: false });
      if (App.ui && App.ui.header && typeof App.ui.header.render === 'function') App.ui.header.render();
      if (App.screens) {
        ['dashboard', 'learn', 'week', 'goals', 'review'].forEach(name => {
          const screen = App.screens[name];
          if (screen && typeof screen.render === 'function') screen.render();
        });
      }
    } catch (e) {
      console.error('Не удалось обновить интерфейс:', e);
    }
  }

  // ===== Удаление всех данных =====

  function clearAllData() {
    // Сначала ставим состояние по умолчанию: запущенный таймер не успеет
    // сохранить старые данные обратно в localStorage.
    try {
      App.state = App.config.createDefaultState();
      App.save();
    } catch (e) { /* продолжаем удалять остальное */ }

    try {
      const keys = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (!key) continue;
        if (key === App.config.STORAGE_KEY || key.indexOf('lesson_progress_v1_') === 0) keys.push(key);
      }
      keys.forEach(key => {
        if (key !== App.config.STORAGE_KEY) window.localStorage.removeItem(key);
      });
    } catch (e) { /* localStorage недоступен */ }

    try {
      // Через App.sounds: он очистит и IndexedDB, и копию в памяти.
      // deleteDatabase напрямую может зависнуть, пока открыто соединение.
      if (App.sounds && typeof App.sounds.clearAll === 'function') {
        App.sounds.clearAll();
      } else if (window.indexedDB) {
        window.indexedDB.deleteDatabase('school_planner_sounds');
      }
    } catch (e) { /* IndexedDB недоступен */ }

    close();
    refreshApp();
  }

  function confirmDeleteAll() {
    const overlay = document.createElement('div');
    overlay.className = 'modal settings-modal';
    overlay.innerHTML = `
      <div class="modal-content">
        <h2>Удалить все данные?</h2>
        <p class="settings-hint">Пропадут задачи, цели, заметки, расписание, опыт, тема и свои звуки. Это действие нельзя отменить.</p>
        <div class="settings-row">
          <button type="button" class="secondary-btn" id="delete-cancel">Отмена</button>
          <button type="button" class="danger-btn" id="delete-confirm">Удалить всё</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const cancel = overlay.querySelector('#delete-cancel');
    const confirm = overlay.querySelector('#delete-confirm');
    cancel.addEventListener('click', () => overlay.remove());
    confirm.addEventListener('click', () => {
      confirm.disabled = true;
      clearAllData();
    });
    overlay.addEventListener('click', event => {
      if (event.target === overlay) overlay.remove();
    });
    cancel.focus();
  }

  function readExportOptions() {
    const periodEl = document.getElementById('export-period');
    const monthEl = document.getElementById('export-month');
    const fromEl = document.getElementById('export-from');
    const toEl = document.getElementById('export-to');

    const options = {
      period: periodEl ? periodEl.value : 'all',
      month: monthEl ? monthEl.value : '',
      from: fromEl ? fromEl.value : '',
      to: toEl ? toEl.value : ''
    };

    if (options.period === 'month' && !/^\d{4}-\d{2}$/.test(options.month)) {
      options.month = getMonthKey();
    }
    if (options.period === 'range') {
      if (!options.from) options.from = `${getMonthKey()}-01`;
      if (!options.to) options.to = getTodayKey();
    }
    return options;
  }

  function updateExportRows() {
    const select = document.getElementById('export-period');
    if (!select) return;
    const monthRow = document.getElementById('export-month-row');
    const rangeRow = document.getElementById('export-range-row');
    if (monthRow) monthRow.classList.toggle('hidden', select.value !== 'month');
    if (rangeRow) rangeRow.classList.toggle('hidden', select.value !== 'range');
  }

  function downloadExport() {
    const options = readExportOptions();
    const payload = buildExport(options);
    lastExport = payload;
    const filename = exportFilename(payload.meta.period);
    const started = App.utils.downloadJSON(filename, payload);
    const status = document.getElementById('export-status');
    if (started) {
      setStatus(status, 'ok', `Готово: ${filename}`);
    } else {
      setStatus(status, 'warn', 'Этот браузер не дал скачать файл. Открой ежедневник в обычном браузере.');
    }
    return payload;
  }

  // ===== Тема =====

  function renderThemeState(modal) {
    const theme = App.ui.theme.get();
    modal.querySelectorAll('.theme-option').forEach(button => {
      const mode = button.dataset.theme;
      button.classList.toggle('active', theme.mode === mode);
      if (mode === 'custom') {
        const name = theme.customName.trim();
        button.textContent = name || 'Своя';
        button.title = name ? `Своя тема: ${name}` : 'Своя тема из CSS';
      }
    });
  }

  function bindTheme(modal) {
    const nameInput = modal.querySelector('#theme-name');
    const cssInput = modal.querySelector('#theme-css');
    const details = modal.querySelector('.theme-custom');
    const status = modal.querySelector('#theme-status');
    const theme = App.ui.theme.get();

    nameInput.value = theme.customName;
    cssInput.value = theme.customCSS;

    modal.querySelectorAll('.theme-option').forEach(button => {
      button.addEventListener('click', () => {
        const mode = button.dataset.theme;
        if (mode === 'custom' && !App.ui.theme.get().customCSS.trim()) {
          if (details) details.open = true;
          cssInput.focus();
          setStatus(status, 'warn', 'Сначала вставь CSS своей темы.');
          return;
        }
        App.ui.theme.apply(mode);
        renderThemeState(modal);
        setStatus(status, 'ok', `Тема: ${App.ui.theme.label(mode)}`);
      });
    });

    modal.querySelector('#theme-save').addEventListener('click', () => {
      const css = cssInput.value.trim();
      if (!css) {
        setStatus(status, 'warn', 'Вставь CSS — например, набор переменных :root { … }.');
        cssInput.focus();
        return;
      }
      App.ui.theme.saveCustom(nameInput.value, css);
      renderThemeState(modal);
      setStatus(status, 'ok', `Своя тема «${App.ui.theme.label('custom')}» применена.`);
    });

    modal.querySelector('#theme-delete').addEventListener('click', () => {
      App.ui.theme.removeCustom();
      nameInput.value = '';
      cssInput.value = '';
      renderThemeState(modal);
      setStatus(status, 'ok', 'Своя тема удалена, включена светлая.');
    });

    renderThemeState(modal);
  }

  // ===== Свои звуки будильника =====

  function formatSize(bytes) {
    const size = Number(bytes) || 0;
    if (size < 1024) return `${size} Б`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} КБ`;
    return `${(size / (1024 * 1024)).toFixed(1)} МБ`;
  }

  function renderSounds(modal) {
    const listEl = modal.querySelector('#sounds-list');
    if (!listEl) return;

    App.sounds.list().then((items) => {
      if (!listEl.isConnected) return;
      listEl.innerHTML = '';
      if (!items.length) {
        const empty = document.createElement('p');
        empty.className = 'settings-hint';
        empty.textContent = 'Своих звуков пока нет.';
        listEl.appendChild(empty);
      }
      items.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'sound-row';
        row.innerHTML = `
          <span class="sound-info">
            <span class="sound-name">${escapeHtml(item.name)}</span>
            <span class="sound-size">${formatSize(item.size)}</span>
          </span>
          <button type="button" class="sound-play" aria-label="Прослушать">▶</button>
          <button type="button" class="sound-del" aria-label="Удалить">✕</button>
        `;

        row.querySelector('.sound-play').addEventListener('click', () => {
          previewing = true;
          if (App.sound) App.sound.play(App.config.CUSTOM_SOUND_PREFIX + item.id);
        });

        row.querySelector('.sound-del').addEventListener('click', () => {
          App.sounds.remove(item.id).then(() => {
            if (App.pomodoro.state().settings.sound === App.config.CUSTOM_SOUND_PREFIX + item.id) {
              App.pomodoro.setSound(App.config.POMODORO_SOUND_DEFAULT);
            }
            setStatus(modal.querySelector('#sound-status'), 'ok', 'Звук удалён.');
            renderSounds(modal);
          });
        });

        listEl.appendChild(row);
      });
    });
  }

  function bindSounds(modal) {
    const fileInput = modal.querySelector('#sound-file');
    const status = modal.querySelector('#sound-status');

    modal.querySelector('#sound-add').addEventListener('click', () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) {
        setStatus(status, 'warn', 'Выбери аудиофайл.');
        return;
      }
      App.sounds.addFile(file).then((item) => {
        setStatus(status, 'ok', `Добавлен звук: ${item.name}${item.persistent ? '' : ' (до перезагрузки)'}`);
        fileInput.value = '';
        renderSounds(modal);
      }).catch((error) => {
        setStatus(status, 'warn', (error && error.message) || 'Не удалось добавить звук.');
      });
    });

    if (!App.sounds.persistent) {
      const storage = modal.querySelector('#sound-storage');
      if (storage) storage.textContent = 'Этот браузер не сохранит звуки между перезагрузками.';
    }

    renderSounds(modal);
  }

  // ===== Приложение: установка и офлайн =====

  function renderApp(modal) {
    const status = modal.querySelector('#app-status');
    const hint = modal.querySelector('#app-hint');
    const install = modal.querySelector('#app-install');
    const pwa = App.pwa;

    install.classList.add('hidden');
    status.textContent = '';
    hint.textContent = '';

    if (pwa && pwa.installed) {
      status.textContent = 'Уже установлено';
      return;
    }

    hint.textContent = 'Кнопка установки — в меню браузера: Android Chrome → ⋮ → «Установить приложение»; iPhone Safari → «Поделиться» → «На экран „Домой“».';

    if (pwa && typeof pwa.canPrompt === 'function' && pwa.canPrompt()) {
      install.classList.remove('hidden');
    }
  }

  // ===== Модалка =====

  function open() {
    if (App.state.editingMode) return;
    close();

    const modal = document.createElement('div');
    modal.className = 'modal settings-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="settings-head">
          <h2>Настройки</h2>
          <button type="button" class="settings-close" id="settings-close" aria-label="Закрыть настройки">✕</button>
        </div>

        <section class="settings-section">
          <h3>Главная страница</h3>
          <p class="settings-hint">Переименовать блоки, удалить лишние, поменять порядок и добавить новые.</p>
          <button type="button" class="primary-btn" id="settings-edit">✎ Редактировать главную</button>
        </section>

        <section class="settings-section">
          <h3>Звуки будильника</h3>
          <p class="settings-hint">Свой mp3, wav или ogg до 5 МБ хранится в браузере и работает офлайн. Выбрать его можно в редактировании блока «Помодоро».</p>
          <div class="sound-add-row">
            <input type="file" id="sound-file" class="sound-file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac">
            <button type="button" class="secondary-btn" id="sound-add">Добавить</button>
          </div>
          <div class="sounds-list" id="sounds-list"></div>
          <p class="settings-hint" id="sound-storage"></p>
          <p class="settings-status" id="sound-status" role="status"></p>
        </section>

        <section class="settings-section">
          <h3>Экспорт данных</h3>
          <label class="settings-label" for="export-period">Что выгрузить</label>
          <select id="export-period" class="settings-select">
            <option value="all">Все данные</option>
            <option value="month">Один месяц</option>
            <option value="range">Период дат</option>
          </select>

          <div id="export-month-row" class="settings-row hidden">
            <label class="settings-label" for="export-month">Месяц</label>
            <input type="month" id="export-month" class="settings-input">
          </div>

          <div id="export-range-row" class="settings-row hidden">
            <label class="settings-label" for="export-from">С</label>
            <input type="date" id="export-from" class="settings-input">
            <label class="settings-label" for="export-to">По</label>
            <input type="date" id="export-to" class="settings-input">
          </div>

          <p class="settings-hint">Блоки и их настройки (порядок, звук таймера, заметки, тема) попадут в файл всегда.</p>
          <button type="button" class="secondary-btn" id="export-json">Скачать JSON</button>
          <p class="settings-status" id="export-status" role="status"></p>
        </section>

        <section class="settings-section">
          <h3>Импорт данных</h3>
          <p class="settings-hint">Выбери JSON, сохранённый кнопкой «Скачать JSON». Полный экспорт заменяет все данные, экспорт за месяц или период — добавляет записи к текущим.</p>
          <div class="sound-add-row">
            <input type="file" id="import-file" class="sound-file" accept="application/json,.json">
            <button type="button" class="secondary-btn" id="import-json">Импортировать</button>
          </div>
          <p class="settings-status" id="import-status" role="status"></p>
        </section>

        <section class="settings-section">
          <h3>Тема</h3>
          <p class="settings-hint">Светлая, тёмная или своя — из вставленного CSS.</p>
          <div class="theme-options">
            <button type="button" class="theme-option" data-theme="light">Светлая</button>
            <button type="button" class="theme-option" data-theme="dark">Тёмная</button>
            <button type="button" class="theme-option" data-theme="custom">Своя</button>
          </div>

          <details class="theme-custom">
            <summary>Своя тема из CSS</summary>
            <label class="settings-label" for="theme-name">Название</label>
            <input id="theme-name" class="settings-input" type="text" maxlength="40" placeholder="Например, «Ночная синяя»">
            <label class="settings-label" for="theme-css">CSS</label>
            <textarea id="theme-css" class="theme-css" rows="7" spellcheck="false" placeholder=":root {&#10;  --bg: #0b1020;&#10;  --card: #151f33;&#10;  --text: #e2e8f0;&#10;  --accent: #818cf8;&#10;}"></textarea>
            <p class="settings-hint">Список переменных и классов — в <a href="css-classes.html" target="_blank" rel="noopener">шпаргалке по CSS</a>.</p>
            <button type="button" class="secondary-btn" id="theme-save">Применить и сохранить</button>
            <button type="button" class="secondary-btn theme-delete" id="theme-delete">Удалить свою тему</button>
            <p class="settings-status" id="theme-status" role="status"></p>
          </details>
        </section>

        <section class="settings-section">
          <h3>Приложение</h3>
          <p class="settings-hint" id="app-status"></p>
          <button type="button" class="primary-btn hidden" id="app-install">Установить на телефон</button>
          <p class="settings-hint" id="app-hint"></p>
        </section>

        <section class="settings-section">
          <h3>Удаление данных</h3>
          <p class="settings-hint">Очистить задачи, цели, заметки, расписание, опыт, тему и свои звуки. Отменить это нельзя.</p>
          <button type="button" class="secondary-btn danger-btn" id="delete-all">Удалить все данные</button>
          <p class="settings-status" id="delete-status" role="status"></p>
        </section>
      </div>
    `;
    document.body.appendChild(modal);

    const monthInput = modal.querySelector('#export-month');
    const fromInput = modal.querySelector('#export-from');
    const toInput = modal.querySelector('#export-to');
    monthInput.value = getMonthKey();
    fromInput.value = `${getMonthKey()}-01`;
    toInput.value = getTodayKey();

    modal.querySelector('#export-period').addEventListener('change', updateExportRows);
    modal.querySelector('#export-json').addEventListener('click', downloadExport);
    updateExportRows();

    const importInput = modal.querySelector('#import-file');
    const importStatus = modal.querySelector('#import-status');
    modal.querySelector('#import-json').addEventListener('click', () => {
      const file = importInput.files && importInput.files[0];
      if (!file) {
        setStatus(importStatus, 'warn', 'Выбери JSON-файл.');
        return;
      }
      importFile(file).then(result => {
        setStatus(importStatus, 'ok', result.isFull
          ? 'Данные восстановлены из файла.'
          : 'Записи из файла добавлены.');
        setTimeout(() => {
          close();
          refreshApp();
        }, 600);
      }).catch(error => {
        setStatus(importStatus, 'warn', (error && error.message) || 'Не удалось импортировать файл.');
      });
    });

    modal.querySelector('#delete-all').addEventListener('click', confirmDeleteAll);

    modal.querySelector('#settings-edit').addEventListener('click', () => {
      close();
      App.state.editingMode = true;
      App.save();
      App.screens.dashboard.render();
    });

    modal.querySelector('#settings-close').addEventListener('click', close);
    modal.addEventListener('click', event => {
      if (event.target === modal) close();
    });

    bindTheme(modal);
    bindSounds(modal);
    renderApp(modal);

    modal.querySelector('#app-install').addEventListener('click', () => {
      App.pwa.promptInstall().then(() => renderApp(modal));
    });

    return modal;
  }

  // Esc закрывает настройки — один обработчик на все открытия
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.querySelector('.settings-modal')) close();
  });

  App.ui = App.ui || {};
  App.ui.settings = {
    open,
    close,
    buildExport,
    exportFilename,
    downloadExport,
    importFile,
    applyImport,
    clearAllData,
    get lastExport() { return lastExport; }
  };
})(window.App = window.App || {});
