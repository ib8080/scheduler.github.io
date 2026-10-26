/* state.js — единый источник состояния приложения.
   Объект создаётся один раз; модули меняют его поля и вызывают App.storage.saveState(). */
(function (App) {
  'use strict';

  App.state = App.storage.loadState();

  // Сохранение — частый вызов, держим короткий алиас
  App.save = App.storage.saveState;

  // Дата, с которой работает дашборд (null = сегодня)
  App.getSelectedDateKey = function () {
    return App.state.selectedDate || App.utils.getTodayKey();
  };

  // Список внеплановых задач на выбранную дату (создаётся при первом обращении)
  App.getDailyTasks = function (dateKey) {
    if (!Array.isArray(App.state.dailyTasks[dateKey])) App.state.dailyTasks[dateKey] = [];
    return App.state.dailyTasks[dateKey];
  };
})(window.App = window.App || {});
