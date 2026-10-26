/* review.js — экран «Итоги месяца»: рефлексия за любой месяц (в том числе задним числом),
   редактирование сохранённого итога и полная история. */
(function (App) {
  'use strict';

  const { XP_FOR_MONTH_REVIEW, MONTH_NAMES } = App.config;
  const { escapeHtml, getMonthKey, monthLabel, monthInLabel } = App.utils;

  const REVIEW_FIELDS = [
    { id: 'whatDone', label: (key) => `Что я сделал в ${monthInLabel(key)}?`, placeholder: 'Перечисли главное...' },
    { id: 'whatAchieved', label: () => 'Чего я добился?', placeholder: 'Даже маленькие победы важны' },
    { id: 'whatNext', label: () => 'Что нужно сделать в следующем месяце?', placeholder: '1–3 конкретных шага' },
    { id: 'motivation', label: () => 'Мотивация', placeholder: 'Почему это важно для меня?' },
    { id: 'timeControl', label: () => 'Контроль времени', placeholder: 'На что ушло больше всего времени? Что оптимизировать?' }
  ];

  // Какой месяц сейчас открыт в форме (YYYY-MM). По умолчанию — текущий.
  let selectedMonthKey = getMonthKey();

  function splitMonthKey(key) {
    const [year, month] = key.split('-').map(Number);
    return { year, month };
  }

  function makeMonthKey(year, month) {
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  function findReview(monthKey) {
    return App.state.monthReviews.find(r => r.monthKey === monthKey) || null;
  }

  // Годы для выбора: текущий и три предыдущих + все годы, за которые есть итоги
  function getYearOptions() {
    const currentYear = new Date().getFullYear();
    const years = new Set();
    for (let y = currentYear; y >= currentYear - 3; y--) years.add(y);
    App.state.monthReviews.forEach(review => {
      const year = parseInt(String(review.monthKey).slice(0, 4), 10);
      if (year) years.add(year);
    });
    years.add(splitMonthKey(selectedMonthKey).year);
    return [...years].sort((a, b) => b - a);
  }

  function renderForm() {
    const form = document.getElementById('review-form');
    if (!form) return;

    const existing = findReview(selectedMonthKey);
    const { year, month } = splitMonthKey(selectedMonthKey);
    const isCurrent = selectedMonthKey === getMonthKey();

    const statusText = existing
      ? `Итог за ${monthLabel(selectedMonthKey)} сохранён — можно дополнить или исправить.`
      : `Итог за ${monthLabel(selectedMonthKey)} ещё не заполнен.`;

    form.innerHTML = `
      <div class="review-month-row">
        <label for="review-month">Месяц итогов</label>
        <div class="review-month-controls">
          <select id="review-month" class="review-select">
            ${MONTH_NAMES.map((name, i) => `<option value="${i + 1}"${i + 1 === month ? ' selected' : ''}>${name}</option>`).join('')}
          </select>
          <select id="review-year" class="review-select">
            ${getYearOptions().map(y => `<option value="${y}"${y === year ? ' selected' : ''}>${y}</option>`).join('')}
          </select>
        </div>
      </div>
      <p class="review-status">${statusText}</p>
      ${REVIEW_FIELDS.map(field => `
        <label for="${field.id}">${field.label(selectedMonthKey)}</label>
        <textarea id="${field.id}" placeholder="${field.placeholder}">${escapeHtml((existing && existing[field.id]) || '')}</textarea>
      `).join('')}
      <button id="save-review">${existing ? 'Сохранить изменения' : 'Сохранить итоги месяца'}</button>
      ${isCurrent ? '' : '<button id="review-to-current" class="secondary-btn">Перейти к текущему месяцу</button>'}
    `;

    form.querySelector('#review-month').addEventListener('change', (e) => {
      selectMonth(makeMonthKey(year, Number(e.target.value)));
    });
    form.querySelector('#review-year').addEventListener('change', (e) => {
      selectMonth(makeMonthKey(Number(e.target.value), month));
    });

    const toCurrentBtn = form.querySelector('#review-to-current');
    if (toCurrentBtn) toCurrentBtn.addEventListener('click', () => selectMonth(getMonthKey()));

    form.querySelector('#save-review').addEventListener('click', saveSelectedMonth);
  }

  function selectMonth(monthKey) {
    selectedMonthKey = monthKey;
    render();
  }

  function saveSelectedMonth() {
    const entry = { monthKey: selectedMonthKey };
    REVIEW_FIELDS.forEach(field => {
      const el = document.getElementById(field.id);
      entry[field.id] = el ? el.value : '';
    });

    const index = App.state.monthReviews.findIndex(r => r.monthKey === selectedMonthKey);
    const isNew = index < 0;

    // Пустой новый итог не сохраняем, но подсказываем, что не так
    const filled = REVIEW_FIELDS.some(field => String(entry[field.id] || '').trim() !== '');
    if (isNew && !filled) {
      const status = document.querySelector('.review-status');
      if (status) {
        status.textContent = 'Заполни хотя бы одно поле — пустой итог не сохраняется.';
        status.classList.add('warn');
      }
      return;
    }

    if (isNew) App.state.monthReviews.push(entry);
    else App.state.monthReviews[index] = entry;

    App.state.monthReviews.sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    App.save();
    render();

    // Опыт — только за первый итог этого месяца: исправления не награждаются
    if (isNew) App.xp.addXP(XP_FOR_MONTH_REVIEW);
  }

  function renderHistory() {
    const hist = document.getElementById('month-history');
    if (!hist) return;

    hist.innerHTML = '<h2 class="history-title">Сохранённые итоги</h2>';
    if (App.state.monthReviews.length === 0) {
      hist.innerHTML += '<p class="empty-hint">Пока пусто. Заполни итоги текущего месяца — или выбери другой месяц выше.</p>';
      return;
    }

    [...App.state.monthReviews]
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
      .forEach(review => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'dashboard-card history-card' + (review.monthKey === selectedMonthKey ? ' selected' : '');
        card.title = 'Открыть итог для редактирования';
        card.innerHTML = `
          <span class="history-head">
            <strong>${monthLabel(review.monthKey)}</strong>
            <span class="history-edit">✎ Изменить</span>
          </span>
          ${REVIEW_FIELDS.map(field => `
            <span class="history-field${(review[field.id] || '').trim() ? '' : ' empty'}">
              <span class="history-label">${field.label(review.monthKey)}</span>
              <span class="history-value">${escapeHtml((review[field.id] || '').trim() || '—')}</span>
            </span>
          `).join('')}
        `;
        card.addEventListener('click', () => {
          selectedMonthKey = review.monthKey;
          render();
          const form = document.getElementById('review-form');
          if (form && form.scrollIntoView) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        hist.appendChild(card);
      });
  }

  function render() {
    renderForm();
    renderHistory();
  }

  // Вызывается после изменения целей: обновить итоги, если экран открыт
  function refreshIfVisible() {
    const screen = document.getElementById('screen-review');
    if (screen && screen.classList.contains('active')) render();
  }

  App.screens = App.screens || {};
  App.screens.review = { render, refreshIfVisible };
})(window.App = window.App || {});
