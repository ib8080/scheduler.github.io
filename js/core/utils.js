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

  // Сколько осталось до срока цели: дни / недели / месяцы.
  // Возвращает { text, short, overdue, days } или null, если срока нет.
  // Просроченный срок помечается overdue: true — интерфейс красит его красным.
  function dueInfo(dueDate) {
    const key = String(dueDate || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
    const due = parseDateKey(key);
    if (Number.isNaN(due.getTime())) return null;

    const today = parseDateKey(getTodayKey());
    const dueUtc = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
    const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const days = Math.round((dueUtc - todayUtc) / 86400000);

    if (days < 0) {
      const left = Math.abs(days);
      const unit = left < 14 ? 'дн.' : (left < 60 ? 'нед.' : 'мес.');
      const amount = left < 14 ? left : (left < 60 ? Math.round(left / 7) : Math.round(left / 30));
      return { overdue: true, days, text: `просрочено на ${amount} ${unit}`, short: `−${amount} ${unit}` };
    }
    if (days === 0) return { overdue: false, days, text: 'сегодня', short: 'сегодня' };
    if (days === 1) return { overdue: false, days, text: 'завтра', short: 'завтра' };
    if (days < 14) return { overdue: false, days, text: `через ${days} дн.`, short: `${days} дн.` };
    if (days < 60) {
      const weeks = Math.round(days / 7);
      return { overdue: false, days, text: `через ${weeks} нед.`, short: `${weeks} нед.` };
    }
    const months = Math.round(days / 30);
    return { overdue: false, days, text: `через ${months} мес.`, short: `${months} мес.` };
  }

  // Сдвиг даты на N дней: shiftDateKey('2026-10-26', -1) → '2026-10-25'
  function shiftDateKey(dateKey, days) {
    const d = parseDateKey(dateKey);
    d.setDate(d.getDate() + Number(days || 0));
    return toDateKey(d);
  }

  // Скачивание JSON-файла. В некоторых средах (например, jsdom) недоступно —
  // тогда возвращаем false, чтобы интерфейс показал понятную подсказку.
  function downloadJSON(filename, data) {
    if (typeof Blob === 'undefined' || typeof URL === 'undefined'
      || typeof URL.createObjectURL !== 'function') return false;
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => {
        try { URL.revokeObjectURL(url); } catch (e) { /* уже отозван */ }
      }, 1000);
      return true;
    } catch (e) {
      return false;
    }
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
    dueInfo,
    shiftDateKey,
    downloadJSON,
    compareByTime
  };
})(window.App = window.App || {});
