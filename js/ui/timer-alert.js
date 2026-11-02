/* timer-alert.js — оверлей, который появляется, когда у помодоро закончилась фаза.
   Показывает звук (см. js/core/sound.js) и крупную кнопку продолжения. */
(function (App) {
  'use strict';

  function close() {
    const overlays = document.querySelectorAll('.timer-alert');
    overlays.forEach(overlay => overlay.remove());
    // длинный свой звук не должен доигрывать после закрытия
    if (overlays.length && App.sound) App.sound.stop();
  }

  function show(options) {
    const opts = options || {};
    const finished = opts.finished === 'break' ? 'break' : 'work';
    const isBreak = finished === 'break';

    close();

    // Звук играем после закрытия старого оверлея, чтобы он не оборвался
    if (App.sound) App.sound.play(opts.sound || 'alarm');

    const overlay = document.createElement('div');
    overlay.className = 'timer-alert';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'timer-alert-title');
    overlay.innerHTML = `
      <div class="timer-alert-card">
        <div class="timer-alert-emoji" aria-hidden="true">${isBreak ? '⏱️' : '⏰'}</div>
        <h2 id="timer-alert-title">${isBreak ? 'Перерыв закончился!' : 'Работа закончена!'}</h2>
        <p class="timer-alert-text">${isBreak
          ? 'Возвращайся к делу — следующая сессия уже готова.'
          : 'Пора отдохнуть. Перерыв уже настроен.'}</p>
        <button type="button" class="primary-btn timer-alert-action">${isBreak ? 'Начать работу' : 'Начать перерыв'}</button>
        <button type="button" class="secondary-btn timer-alert-ok">Понятно</button>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.timer-alert-ok').addEventListener('click', close);

    overlay.querySelector('.timer-alert-action').addEventListener('click', () => {
      close();
      App.pomodoro.start();
      if (App.screens.dashboard && App.screens.dashboard.render) App.screens.dashboard.render();
    });

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close();
    });

    // Фокус на главную кнопку — удобно и для клавиатуры, и для скринридера
    const action = overlay.querySelector('.timer-alert-action');
    if (action && typeof action.focus === 'function') action.focus();

    return overlay;
  }

  // Esc закрывает оверлей
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.querySelector('.timer-alert')) close();
  });

  App.ui = App.ui || {};
  App.ui.timerAlert = { show, close };
})(window.App = window.App || {});
