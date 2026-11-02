/* sound.js — короткие сигналы без аудиофайлов: синтез через Web Audio API.
   Работает офлайн и не требует папки assets. Если AudioContext недоступен
   (старый браузер, тестовая среда), просто молчим.
   Встроенные сигналы полифонические: у каждой ноты свой голос, поэтому
   мелодия, аккомпанемент и бас звучат одновременно. */
(function (App) {
  'use strict';

  let context = null;

  // Ноты (Гц). Нужны, чтобы записывать мелодии по нотам, а не по числам.
  const NOTE = {
    B1: 61.74, C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.0, A2: 110.0, B2: 123.47,
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, Fs4: 369.99, G4: 392.0, Gs4: 415.3,
    A4: 440.0, Bb4: 466.16, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46,
    G5: 783.99, A5: 880.0, B5: 987.77, C6: 1046.5
  };

  // Событие: { n: нота | [ноты], t: смещение в секундах, d: длительность,
  //            v: громкость (0..1), w: форма волны }
  function note(n, t, d, v, w) {
    return { n, t, d, v: v == null ? 0.16 : v, w: w || 'sine' };
  }

  // «Марш Тореадора» из оперы Бизе «Кармен» — припев «Toréador, en garde!».
  // Мелодия в фа мажоре, с маршевым басом и аккордами на сильные доли.
  const TOREADOR = [
    // 1-я фраза: Toréador, en garde!
    note(NOTE.F4, 0.00, 0.26), note(NOTE.F4, 0.30, 0.14),
    note(NOTE.G4, 0.46, 0.26), note(NOTE.A4, 0.76, 0.14),
    note(NOTE.Bb4, 0.92, 0.44), note(NOTE.A4, 1.40, 0.14),
    note(NOTE.G4, 1.56, 0.14), note(NOTE.F4, 1.72, 0.62),
    // 2-я фраза: Toréador! Toréador!
    note(NOTE.F4, 2.50, 0.14), note(NOTE.G4, 2.66, 0.14),
    note(NOTE.A4, 2.82, 0.14), note(NOTE.Bb4, 2.98, 0.26),
    note(NOTE.C5, 3.28, 0.44), note(NOTE.Bb4, 3.76, 0.14),
    note(NOTE.A4, 3.92, 0.14), note(NOTE.G4, 4.08, 0.14),
    note(NOTE.F4, 4.24, 1.05),
    // Бас: «раз-и-два-и» маршем
    note(NOTE.F2, 0.00, 0.26, 0.13, 'triangle'),
    note(NOTE.C3, 0.46, 0.18, 0.09, 'triangle'),
    note(NOTE.F2, 0.92, 0.26, 0.13, 'triangle'),
    note(NOTE.C3, 1.40, 0.18, 0.09, 'triangle'),
    note(NOTE.F2, 1.72, 0.40, 0.13, 'triangle'),
    note(NOTE.F2, 2.50, 0.26, 0.13, 'triangle'),
    note(NOTE.C3, 2.82, 0.18, 0.09, 'triangle'),
    note(NOTE.F2, 3.28, 0.26, 0.13, 'triangle'),
    note(NOTE.C3, 3.76, 0.18, 0.09, 'triangle'),
    note(NOTE.F2, 4.24, 0.70, 0.13, 'triangle'),
    // Аккорды на сильные доли (полифония: три ноты одним ударом)
    note([NOTE.F4, NOTE.A4, NOTE.C5], 0.00, 0.30, 0.055, 'triangle'),
    note([NOTE.F4, NOTE.A4, NOTE.C5], 0.92, 0.30, 0.055, 'triangle'),
    note([NOTE.F4, NOTE.A4, NOTE.C5], 1.72, 0.40, 0.055, 'triangle'),
    note([NOTE.F4, NOTE.A4, NOTE.C5], 2.50, 0.30, 0.055, 'triangle'),
    note([NOTE.F4, NOTE.A4, NOTE.C5], 3.28, 0.36, 0.055, 'triangle'),
    note([NOTE.F4, NOTE.A4, NOTE.C5], 4.24, 0.90, 0.055, 'triangle')
  ];

  // «Grandfather clock» — куранты Вестминстера (Westminster Quarters).
  // Четыре ноты: G#4, E4, F#4, B4 — их играют башенные часы и «дедушкины» часы.
  // Каждая нота с обертонами звучит как колокольчик, а низкий удар в конце — «бой часов».
  const CLOCK = [
    note(NOTE.Gs4, 0.00, 0.62, 0.13), note(NOTE.Gs4, 0.00, 0.62, 0.05, 'triangle'),
    note(NOTE.E4, 0.72, 0.62, 0.13), note(NOTE.E4, 0.72, 0.62, 0.05, 'triangle'),
    note(NOTE.Fs4, 1.44, 0.62, 0.13), note(NOTE.Fs4, 1.44, 0.62, 0.05, 'triangle'),
    note(NOTE.B4, 2.16, 1.00, 0.14), note(NOTE.B4, 2.16, 1.00, 0.05, 'triangle'),
    // второй раз — как на четверти часа
    note(NOTE.Gs4, 3.40, 0.62, 0.12), note(NOTE.Gs4, 3.40, 0.62, 0.05, 'triangle'),
    note(NOTE.E4, 4.12, 0.62, 0.12), note(NOTE.E4, 4.12, 0.62, 0.05, 'triangle'),
    note(NOTE.Fs4, 4.84, 0.62, 0.12), note(NOTE.Fs4, 4.84, 0.62, 0.05, 'triangle'),
    note(NOTE.B4, 5.56, 1.00, 0.13), note(NOTE.B4, 5.56, 1.00, 0.05, 'triangle'),
    // низкий «бонг» на часах, с обертонами
    note(NOTE.B2, 6.90, 2.20, 0.16, 'sine'),
    note(NOTE.B3, 6.90, 2.20, 0.10, 'sine'),
    note(NOTE.Fs4, 6.90, 1.80, 0.06, 'sine'),
    // тиканье маятника
    note(NOTE.E2, 0.36, 0.05, 0.05, 'square'),
    note(NOTE.E2, 1.08, 0.05, 0.05, 'square'),
    note(NOTE.E2, 1.80, 0.05, 0.05, 'square'),
    note(NOTE.E2, 2.52, 0.05, 0.05, 'square')
  ];

  const PATTERNS = {
    // Внутренние id оставлены прежними (alarm/soft), чтобы не ломать
    // сохранённые настройки и тесты; в интерфейсе это «Марш Тореадора»
    // и «Grandfather clock».
    alarm: TOREADOR,
    soft: CLOCK,
    // Короткий деловой «бип»
    beep: [
      note(NOTE.B5, 0.00, 0.11, 0.16),
      note(NOTE.B5, 0.16, 0.11, 0.16)
    ]
  };

  function getContext() {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    if (!context) {
      try {
        context = new AudioCtor();
      } catch (e) {
        return null;
      }
    }
    if (context.state === 'suspended') {
      try { context.resume(); } catch (e) { /* браузер решит сам */ }
    }
    return context;
  }

  // Одна нота с плавным входом и выходом — без щелчков
  function tone(ctx, frequency, startAt, duration, volume, wave) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = wave || 'sine';
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.02);
    gain.gain.setValueAtTime(volume, startAt + duration - 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.02);
  }

  function playBuiltin(kind) {
    const pattern = PATTERNS[kind] || PATTERNS.alarm;
    const ctx = getContext();
    if (!ctx) return false;

    const base = ctx.currentTime + 0.02;
    pattern.forEach(event => {
      const notes = Array.isArray(event.n) ? event.n : [event.n];
      notes.forEach(frequency => {
        tone(ctx, frequency, base + event.t, event.d, event.v, event.w);
      });
    });
    return true;
  }

  // Встроенные сигналы синтезируем сами, свои файлы берём из IndexedDB
  function play(kind) {
    if (!kind || kind === 'none') return false;

    const prefix = App.config.CUSTOM_SOUND_PREFIX;
    if (kind.indexOf(prefix) === 0) {
      const id = kind.slice(prefix.length);
      if (!App.sounds) return false;
      App.sounds.play(id).then((started) => {
        // файл могли удалить — тогда звучит «Марш Тореадора»;
        // отменённое воспроизведение не озвучиваем
        if (started === false) playBuiltin('alarm');
      });
      return true;
    }

    return playBuiltin(kind);
  }

  function stop() {
    if (App.sounds) App.sounds.stop();
  }

  function supported() {
    return Boolean(window.AudioContext || window.webkitAudioContext);
  }

  // Политика автоплея: первый жест пользователя «разблокирует» звук
  document.addEventListener('pointerdown', () => {
    const ctx = getContext();
    if (ctx && ctx.state === 'suspended') {
      try { ctx.resume(); } catch (e) { /* ничего страшного */ }
    }
  }, { once: true });

  App.sound = { play, stop, supported };
})(window.App = window.App || {});
