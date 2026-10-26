/* header.js — шапка дашборда: текущая дата, выбор даты, кнопка редактирования. */
(function (App) {
  'use strict';

  const { DAY_FULL_NAMES, MONTH_GENITIVE, SPLASHES } = App.config;

  // Как сплэш на главной в Minecraft: одно случайное сообщение на запуск
  const splashText = SPLASHES[Math.floor(Math.random() * SPLASHES.length)] || 'Привет!';

  function renderSplash() {
    const el = document.getElementById('app-greeting');
    if (el) el.textContent = splashText;
  }

  function renderCurrentDate() {
    const el = document.getElementById('current-date');
    if (!el) return;

    const todayKey = App.utils.getTodayKey();
    const selectedKey = App.getSelectedDateKey();
    const d = App.utils.parseDateKey(selectedKey);
    const isToday = selectedKey === todayKey;

    el.textContent = `${DAY_FULL_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_GENITIVE[d.getMonth()]} ${d.getFullYear()}${isToday ? ' (сегодня)' : ' (архив)'}`;
  }

  function renderDatePicker() {
    const picker = document.getElementById('date-picker');
    if (!picker) return;

    picker.max = App.utils.getTodayKey();
    picker.value = App.getSelectedDateKey();
    picker.onchange = (e) => {
      const value = e.target.value;
      App.state.selectedDate = value === App.utils.getTodayKey() ? null : value;
      App.save();
      App.screens.dashboard.render();
    };
  }

  function updateEditButton() {
    const btn = document.getElementById('edit-mode-toggle');
    if (!btn) return;
    btn.textContent = App.state.editingMode ? '✓ Готово' : '✎ Редактировать';
    btn.classList.toggle('active', App.state.editingMode);
  }

  function render() {
    renderSplash();
    renderCurrentDate();
    renderDatePicker();
    updateEditButton();
  }

  // Подставляем подсказку сразу при загрузке скрипта, не дожидаясь init
  renderSplash();

  App.ui = App.ui || {};
  App.ui.header = { render, renderSplash, renderCurrentDate, renderDatePicker, updateEditButton };
})(window.App = window.App || {});
