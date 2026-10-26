/* goals.js (экран) — вкладка «Цели»: постановка цели по SMART, список с автосортировкой
   по дате, карточка цели с описанием и отметка о выполнении. */
(function (App) {
  'use strict';

  const { GOAL_SMART_FIELDS, PRIORITY_TITLES } = App.config;
  const { escapeHtml, formatDateShort, getTodayKey } = App.utils;
  const { createPriorityPicker } = App.ui.taskControls;

  let showDone = false;

  function render() {
    renderForm();
    renderList();
    renderDoneList();
  }

  // ===== Форма постановки цели =====

  function renderForm() {
    const form = document.getElementById('goal-form');
    if (!form) return;

    form.innerHTML = `
      <h2 class="goals-heading">Новая цель</h2>
      <label class="goal-label" for="goal-title">Цель</label>
      <input id="goal-title" class="goal-input" type="text" placeholder="Например: сдать экзамен по физике на «5»">
      ${GOAL_SMART_FIELDS.map(field => `
        <label class="goal-label" for="goal-${field.key}">
          <span class="smart-badge">${field.letter}</span> ${field.title}
          <span class="goal-hint">${field.hint}</span>
        </label>
        <textarea id="goal-${field.key}" class="goal-textarea" rows="2" placeholder="${field.hint}"></textarea>
      `).join('')}
      <div class="goal-row">
        <label class="goal-label" for="goal-due">Конечная дата</label>
        <input id="goal-due" class="goal-input" type="date" min="${getTodayKey()}">
      </div>
      <div class="goal-row">
        <span class="goal-label">Приоритет</span>
        <div class="goal-priority-slot"></div>
      </div>
      <button id="add-goal" class="primary-btn">Добавить цель</button>
    `;

    const picker = createPriorityPicker({ value: 'medium' });
    form.querySelector('.goal-priority-slot').appendChild(picker.el);

    const valueOf = (id) => {
      const el = document.getElementById(id);
      return el ? el.value : '';
    };

    form.querySelector('#add-goal').addEventListener('click', () => {
      const goal = App.goals.add({
        title: valueOf('goal-title'),
        specific: valueOf('goal-specific'),
        measurable: valueOf('goal-measurable'),
        achievable: valueOf('goal-achievable'),
        relevant: valueOf('goal-relevant'),
        timeBound: valueOf('goal-timeBound'),
        dueDate: valueOf('goal-due'),
        priority: picker.value
      });

      if (!goal) {
        const title = document.getElementById('goal-title');
        if (title) {
          title.classList.add('invalid');
          title.focus();
        }
        return;
      }
      render();
    });
  }

  // ===== Список целей =====

  function smartFilled(goal) {
    return GOAL_SMART_FIELDS.filter(field => String(goal[field.key] || '').trim()).length;
  }

  function goalCard(goal) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'goal-card' + (goal.done ? ' done' : '');
    card.dataset.goalId = goal.id;
    card.innerHTML = `
      <span class="goal-card-main">
        <span class="goal-card-title">${escapeHtml(goal.title)}</span>
        <span class="goal-card-meta">
          <span class="priority-dot priority-${goal.priority}"></span>
          ${formatDateShort(goal.dueDate) || 'без даты'}
          · ${PRIORITY_TITLES[goal.priority] || 'Средний'}
          ${goal.done ? ` · выполнено ${formatDateShort(goal.doneDate)}` : ''}
        </span>
      </span>
      <span class="goal-card-side">
        <span class="xp-chip">+${App.goals.goalXP(goal)}</span>
        <span class="goal-smart-count">SMART ${smartFilled(goal)}/5</span>
      </span>
    `;
    card.addEventListener('click', () => openGoal(goal.id));
    return card;
  }

  function renderList() {
    const list = document.getElementById('goals-list');
    if (!list) return;
    list.innerHTML = '';

    const goals = App.goals.sortedActive();
    if (!goals.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-hint';
      empty.textContent = 'Активных целей нет. Сформулируй первую выше — и поставь срок.';
      list.appendChild(empty);
      return;
    }
    goals.forEach(goal => list.appendChild(goalCard(goal)));
  }

  function renderDoneList() {
    const section = document.getElementById('goals-done');
    const toggle = document.getElementById('toggle-done-goals');
    if (!section || !toggle) return;

    const doneGoals = App.goals.doneGoals()
      .slice()
      .sort((a, b) => String(b.doneDate || '').localeCompare(String(a.doneDate || '')));

    toggle.textContent = showDone ? 'Скрыть выполненные' : `Выполненные (${doneGoals.length})`;
    toggle.disabled = doneGoals.length === 0;

    section.innerHTML = '';
    section.classList.toggle('hidden', !showDone);
    if (!showDone) return;

    if (!doneGoals.length) {
      section.innerHTML = '<p class="empty-hint">Пока ни одной выполненной цели.</p>';
      return;
    }
    doneGoals.forEach(goal => section.appendChild(goalCard(goal)));
  }

  // ===== Карточка цели с описанием по SMART =====

  function openGoal(goalId) {
    const goal = App.goals.byId(goalId);
    if (!goal) return;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content goal-detail">
        <h2>${escapeHtml(goal.title)}</h2>
        <p class="goal-card-meta">
          <span class="priority-dot priority-${goal.priority}"></span>
          ${formatDateShort(goal.dueDate) || 'без даты'}
          · ${PRIORITY_TITLES[goal.priority] || 'Средний'}
          · +${App.goals.goalXP(goal)} XP
        </p>
        <div class="goal-smart">
          ${GOAL_SMART_FIELDS.map(field => {
            const value = String(goal[field.key] || '').trim();
            return `
              <div class="smart-row${value ? '' : ' empty'}">
                <span class="smart-badge">${field.letter}</span>
                <span class="smart-text">
                  <span class="smart-title">${field.title}</span>
                  <span class="smart-value">${escapeHtml(value || '—')}</span>
                </span>
              </div>
            `;
          }).join('')}
        </div>
        ${goal.done
          ? `<p class="goal-hint">Выполнена ${formatDateShort(goal.doneDate) || ''}${goal.reviewAdded ? ' · записана в итоги месяца' : ''}</p>`
          : `<button type="button" class="primary-btn complete-goal-btn">Цель выполнена (+${App.goals.goalXP(goal)} XP)</button>`}
        <button type="button" class="secondary-btn delete-goal-btn">Удалить цель</button>
        <button type="button" class="secondary-btn close-goal-btn">Закрыть</button>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
    modal.querySelector('.close-goal-btn').addEventListener('click', () => modal.remove());

    const completeBtn = modal.querySelector('.complete-goal-btn');
    if (completeBtn) {
      completeBtn.addEventListener('click', () => {
        modal.remove();
        openCompleteConfirm(goal);
      });
    }

    modal.querySelector('.delete-goal-btn').addEventListener('click', () => {
      if (!confirm(`Удалить цель «${goal.title}»?`)) return;
      App.goals.remove(goal.id);
      modal.remove();
      render();
    });
  }

  // Подтверждение выполнения: чекбокс «добавить в итоги месяца» включён по умолчанию
  function openCompleteConfirm(goal) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Цель выполнена?</h2>
        <p class="goal-confirm-title">«${escapeHtml(goal.title)}»</p>
        <label class="checkbox-row">
          <input type="checkbox" id="goal-to-review" checked>
          <span>Добавить в итоги месяца (поле «Чего я добился?»)</span>
        </label>
        <button type="button" class="primary-btn" id="confirm-goal-done">Да, выполнена (+${App.goals.goalXP(goal)} XP)</button>
        <button type="button" class="secondary-btn" id="cancel-goal-done">Отмена</button>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#cancel-goal-done').addEventListener('click', () => modal.remove());
    modal.querySelector('#confirm-goal-done').addEventListener('click', () => {
      const addToReview = modal.querySelector('#goal-to-review').checked;
      App.goals.complete(goal, { addToReview });
      modal.remove();
      render();
      if (App.screens.review && App.screens.review.refreshIfVisible) App.screens.review.refreshIfVisible();
    });
  }

  function init() {
    const toggle = document.getElementById('toggle-done-goals');
    if (toggle) {
      toggle.addEventListener('click', () => {
        showDone = !showDone;
        renderDoneList();
      });
    }
  }

  App.screens = App.screens || {};
  App.screens.goals = { render, init, openGoal, openCompleteConfirm };
})(window.App = window.App || {});
