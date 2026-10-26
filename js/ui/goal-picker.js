/* goal-picker.js — модалка выбора целей для блока «Цели» на главной.
   Выполненные цели в список не попадают. */
(function (App) {
  'use strict';

  const { escapeHtml, formatDateShort } = App.utils;

  function open(selectedIds, onSave) {
    const goals = App.goals.sortedActive();
    const selected = new Set(Array.isArray(selectedIds) ? selectedIds : []);

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Цели на главной</h2>
        <p class="goal-hint">${goals.length
          ? 'Отметь цели, которые хочешь видеть в блоке на главной.'
          : 'Активных целей нет. Добавь их на вкладке «Цели».'}</p>
        <div class="goal-picker-list">
          ${goals.map(goal => `
            <label class="checkbox-row">
              <input type="checkbox" value="${goal.id}"${selected.has(goal.id) ? ' checked' : ''}>
              <span class="goal-picker-text">
                ${escapeHtml(goal.title)}
                <span class="goal-picker-due">${formatDateShort(goal.dueDate) || 'без даты'}</span>
              </span>
            </label>
          `).join('')}
        </div>
        <button type="button" class="primary-btn" id="save-goal-picker">Сохранить</button>
        <button type="button" class="secondary-btn" id="cancel-goal-picker">Отмена</button>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (event) => {
      if (event.target === modal) modal.remove();
    });
    modal.querySelector('#cancel-goal-picker').addEventListener('click', () => modal.remove());
    modal.querySelector('#save-goal-picker').addEventListener('click', () => {
      const ids = [...modal.querySelectorAll('input[type="checkbox"]:checked')].map(input => input.value);
      modal.remove();
      onSave(ids);
    });
  }

  App.ui = App.ui || {};
  App.ui.goalPicker = { open };
})(window.App = window.App || {});
