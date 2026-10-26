/* utils.js — мелкие помощники: экранирование и работа с датами. */
(function (App) {
  'use strict';

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function toDateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function parseDateKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function getTodayKey() {
    return toDateKey(new Date());
  }

  // Ключ дня недели (mon..sun) по дате в формате YYYY-MM-DD
  function dayOfWeekKey(dateKey) {
    const d = parseDateKey(dateKey);
    return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][d.getDay()];
  }

  function getMonday(d) {
    const date = new Date(d);
    const shift = (date.getDay() + 6) % 7; // пн = 0
    date.setDate(date.getDate() - shift);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function getISOWeek(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - dayNum + 3);
    const isoYear = date.getUTCFullYear();
    const firstThu = new Date(Date.UTC(isoYear, 0, 4));
    const thuNum = (firstThu.getUTCDay() + 6) % 7;
    firstThu.setUTCDate(firstThu.getUTCDate() - thuNum + 3);
    const week = 1 + Math.round((date - firstThu) / (7 * 86400000));
    return { year: isoYear, week };
  }

  function getMonthKey(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function monthLabel(key) {
    const [y, m] = key.split('-');
    return `${App.config.MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
  }

  // «октябре 2025» — для фраз вида «Что я сделал в …»
  function monthInLabel(key) {
    const [y, m] = key.split('-');
    return `${App.config.MONTH_PREPOSITIONAL[parseInt(m, 10) - 1]} ${y}`;
  }

  // DD.MM.YYYY для целей и подписей
  function formatDateShort(dateKey) {
    if (!dateKey) return '';
    const d = parseDateKey(dateKey);
    if (Number.isNaN(d.getTime())) return '';
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  }

  // Сравнение задач по времени начала (пустое время — в конец)
  function compareByTime(a, b) {
    return (a.time || '99:99').localeCompare(b.time || '99:99');
  }

  App.utils = {
    escapeHtml,
    toDateKey,
    parseDateKey,
    getTodayKey,
    dayOfWeekKey,
    getMonday,
    getISOWeek,
    getMonthKey,
    monthLabel,
    monthInLabel,
    formatDateShort,
    compareByTime
  };
})(window.App = window.App || {});
