/* app.js — точка входа: связывает экраны, шапку и модалки. */
(function (App) {
  'use strict';

  function init() {
    App.ui.header.render();
    App.ui.navigation.init();
    App.ui.blockPicker.init();

    // Переключатель режима редактирования
    const editToggle = document.getElementById('edit-mode-toggle');
    if (editToggle) {
      editToggle.addEventListener('click', () => {
        App.state.editingMode = !App.state.editingMode;
        App.save();
        App.screens.dashboard.render();
      });
    }

    // Отрисовка экранов
    App.screens.dashboard.render();
    App.screens.learn.render();
    App.screens.week.render();
    App.screens.goals.init();
    App.screens.goals.render();
    App.screens.review.render();
  }

  window.addEventListener('error', (e) => {
    console.error('Глобальная ошибка:', e && e.error);
  });

  document.addEventListener('DOMContentLoaded', init);
})(window.App = window.App || {});
