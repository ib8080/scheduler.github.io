/* app.js — точка входа: связывает экраны, шапку и модалки. */
(function (App) {
  'use strict';

  function init() {
    App.ui.header.render();
    App.ui.navigation.init();
    App.ui.blockPicker.init();

    // Кнопка в шапке: настройки, а в режиме редактирования — «Готово»
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        if (App.state.editingMode) {
          App.state.editingMode = false;
          App.save();
          App.screens.dashboard.render();
          return;
        }
        App.ui.settings.open();
      });
    }

    // Отрисовка экранов
    App.screens.dashboard.render();
    App.screens.learn.render();
    App.screens.week.render();
    App.screens.goals.init();
    App.screens.goals.render();
    App.screens.review.render();

    // Установка на телефон и офлайн-режим (нужен https:// или localhost)
    if (App.pwa) App.pwa.register();
  }

  window.addEventListener('error', (e) => {
    console.error('Глобальная ошибка:', e && e.error);
  });

  document.addEventListener('DOMContentLoaded', init);
})(window.App = window.App || {});
