/* week.js — экран «Неделя»: повторяющееся расписание по дням и заметки на дату. */
(function (App) {
  'use strict';

  const { DAYS_OF_WEEK } = App.config;
  const { escapeHtml, toDateKey, getTodayKey, getMonday, getISOWeek } = App.utils;

  function render() {
    const container = document.getElementById('week-schedule');
    if (!container) return;
    container.innerHTML = '';

    const monday = getMonday(new Date());
    const todayKey = getTodayKey();

    const meta = document.getElementById('week-meta');
    if (meta) {
      const { year, week } = getISOWeek(new Date());
      meta.textContent = `${year} год · Неделя ${week}`;
    }

    DAYS_OF_WEEK.forEach((day, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateKey = toDateKey(date);
      const labelDate = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`;
      const isToday = dateKey === todayKey;

      const card = document.createElement('div');
      card.className = 'day-card' + (isToday ? ' today' : '');
      card.innerHTML = `
        <div class="day-header">
          <span>${day.label} <span class="day-date">${labelDate}${isToday ? ' · сегодня' : ''}</span></span>
        </div>
        <div class="day-schedule"></div>
        <div class="day-notes">
          <textarea class="day-notes-area" placeholder="Заметки на этот день...">${escapeHtml(App.state.dayNotes[dateKey] || '')}</textarea>
        </div>
      `;
      container.appendChild(card);

      renderDaySchedule(day.key, card.querySelector('.day-schedule'));

      const notes = card.querySelector('textarea');
      notes.addEventListener('input', () => {
        App.state.dayNotes[dateKey] = notes.value;
        App.save();
      });
    });
  }

  // Расписание по дням недели — повторяется каждую неделю
  function renderDaySchedule(dayKey, container) {
    container.innerHTML = '';
    if (!Array.isArray(App.state.weekSchedule[dayKey])) App.state.weekSchedule[dayKey] = [];
    const schedule = App.state.weekSchedule[dayKey];

    schedule.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'schedule-item';
      row.innerHTML = `
        <input type="time" class="week-time" value="${escapeHtml(item.time || '')}">
        <input type="text" class="week-subject" placeholder="Предмет / дело" value="${escapeHtml(item.subject || '')}">
        <button class="icon-btn item-del danger" title="Удалить">✕</button>
      `;

      row.querySelector('.week-time').addEventListener('change', (e) => {
        item.time = e.target.value;
        App.save();
      });
      row.querySelector('.week-subject').addEventListener('input', (e) => {
        item.subject = e.target.value;
        App.save();
      });
      row.querySelector('.item-del').addEventListener('click', () => {
        schedule.splice(index, 1);
        App.save();
        renderDaySchedule(dayKey, container);
      });

      container.appendChild(row);
    });

    const addRow = document.createElement('button');
    addRow.type = 'button';
    addRow.className = 'add-schedule-btn';
    addRow.textContent = '+ Добавить занятие';
    addRow.addEventListener('click', () => {
      schedule.push({ time: '09:00', subject: '' });
      App.save();
      renderDaySchedule(dayKey, container);
    });
    container.appendChild(addRow);
  }

  App.screens = App.screens || {};
  App.screens.week = { render };
})(window.App = window.App || {});
