/* navigation.js — переключение экранов нижней навигацией. */
(function (App) {
  'use strict';

  const SCREEN_IDS = ['dashboard', 'learn', 'week', 'goals', 'review'];

  function show(screenId) {
    if (!SCREEN_IDS.includes(screenId)) return;

    document.querySelectorAll('.screen').forEach(section => {
      section.classList.toggle('active', section.id === `screen-${screenId}`);
    });
    document.querySelectorAll('.bottom-nav button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.screen === screenId);
    });

    const screen = App.screens[screenId];
    if (screen && typeof screen.render === 'function') screen.render();
  }

  function init() {
    document.querySelectorAll('.bottom-nav button').forEach(btn => {
      btn.addEventListener('click', () => show(btn.dataset.screen));
    });
  }

  App.ui = App.ui || {};
  App.ui.navigation = { init, show };
})(window.App = window.App || {});
