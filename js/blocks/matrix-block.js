/* matrix-block.js — блок «Матрица Эйзенхауэра».
   Поле создания — как в списке дел, но приоритет берётся от квадранта автоматически. */
(function (App) {
  'use strict';

  const { QUADRANTS } = App.config;
  const { createAddForm, createDeleteButton, taskTextHtml } = App.ui.taskControls;

  function renderMatrixBlock(container, block) {
    container.innerHTML = '';

    QUADRANTS.forEach(quadrant => {
      if (!Array.isArray(block.data[quadrant.key])) block.data[quadrant.key] = [];

      const details = document.createElement('details');
      details.className = `matrix-quad ${quadrant.cls}`;

      const summary = document.createElement('summary');
      details.appendChild(summary);

      const list = document.createElement('div');
      list.className = 'quad-list';
      details.appendChild(list);

      const form = createAddForm({
        placeholder: 'Новая задача...',
        withPriority: false,          // приоритет выставляется автоматом от категории
        priority: quadrant.priority,
        onSubmit: ({ text, priority }) => {
          block.data[quadrant.key].push({ text, done: false, priority, xpGiven: false });
          App.save();
          renderItems();
        }
      });

      function renderItems() {
        list.innerHTML = '';
        summary.textContent = `${quadrant.label} (${block.data[quadrant.key].length})`;

        block.data[quadrant.key].forEach(item => {
          const row = document.createElement('div');
          row.className = 'quad-task';
          row.innerHTML = `
            <input type="checkbox" class="task-check" ${item.done ? 'checked' : ''}>
            ${taskTextHtml(item, 'quad-task-text')}
            <span class="xp-chip">+${App.xp.taskXP(item)}</span>
          `;

          row.querySelector('input').addEventListener('change', (e) => {
            item.done = e.target.checked;
            App.xp.handleTaskToggle(item);
            App.save();
            renderItems();
          });

          row.appendChild(createDeleteButton(item, () => {
            App.xp.chargeTaskDelete(item);
            const index = block.data[quadrant.key].indexOf(item);
            if (index >= 0) block.data[quadrant.key].splice(index, 1);
            App.save();
            renderItems();
          }));

          list.appendChild(row);
        });

        list.appendChild(form.el);
      }

      renderItems();
      container.appendChild(details);
    });
  }

  App.blocks = App.blocks || {};
  App.blocks.matrix = renderMatrixBlock;
})(window.App = window.App || {});
