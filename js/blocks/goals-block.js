/* goals-block.js — блок «Цели» на главной: несколько выбранных целей,
   клик по цели ведёт на вкладку «Цели», где её можно вычеркнуть.
   Выбранные цели не привязаны к дате и живут между днями. */
(function (App) {
  'use strict';

  const { escapeHtml, formatDateShort, dueInfo } = App.utils;

  function renderGoalsBlock(container, block) {
    if (!block.data || typeof block.data !== 'object' || !Array.isArray(block.data.ids)) {
      block.data = { ids: [] };
    }

    container.innerHTML = '';

    // Выполненные цели в блоке не показываем
    const goals = App.goals.selectedForBlock(block.data.ids);

    const list = document.createElement('div');
    list.className = 'goals-block-list';

    if (!goals.length) {
      const empty = document.createElement('p');
      empty.className = 'planned-empty';
      empty.textContent = 'Цели не выбраны. Нажми «Выбрать цели» — выполнять их можно на вкладке «Цели».';
      list.appendChild(empty);
    }

    goals.forEach(goal => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'goals-block-item';
      row.title = 'Открыть цель на вкладке «Цели»';
      const due = dueInfo(goal.dueDate);
      const dueText = due ? due.short : 'без даты';
      const dueTitle = due
        ? `Срок: ${formatDateShort(goal.dueDate)} · ${due.text}`
        : (goal.dueDate ? `Срок: ${formatDateShort(goal.dueDate)}` : 'Без срока');
      row.innerHTML = `
        <span class="priority-dot priority-${goal.priority}"></span>
        <span class="goals-block-title">${escapeHtml(goal.title)}</span>
        <span class="goals-block-due${due && due.overdue ? ' overdue' : ''}" title="${escapeHtml(dueTitle)}">${dueText}</span>
        <span class="xp-chip">+${App.goals.goalXP(goal)}</span>
      `;
      row.addEventListener('click', () => {
        App.ui.navigation.show('goals');
        App.screens.goals.openGoal(goal.id);
      });
      list.appendChild(row);
    });

    container.appendChild(list);

    const pickBtn = document.createElement('button');
    pickBtn.type = 'button';
    pickBtn.className = 'block-action-btn';
    pickBtn.textContent = 'Выбрать цели';
    pickBtn.addEventListener('click', () => {
      App.ui.goalPicker.open(block.data.ids, (ids) => {
        block.data.ids = ids;
        App.save();
        App.screens.dashboard.render();
      });
    });
    container.appendChild(pickBtn);
  }

  App.blocks = App.blocks || {};
  App.blocks.goals = renderGoalsBlock;
})(window.App = window.App || {});
