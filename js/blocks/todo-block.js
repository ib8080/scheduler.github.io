/* todo-block.js — блок «Список дел»: приоритеты, галочки и опыт. */
(function (App) {
  'use strict';

  const { createAddForm, createPriorityCycleButton, createDeleteButton, taskTextHtml } = App.ui.taskControls;

  function renderTodoBlock(container, block) {
    const list = document.createElement('div');
    list.className = 'task-list';

    function renderItems() {
      list.innerHTML = '';

      block.data.forEach(item => {
        const row = document.createElement('div');
        row.className = 'todo-item';
        row.innerHTML = `
          <input type="checkbox" class="task-check" ${item.done ? 'checked' : ''}>
          <span class="priority-dot priority-${item.priority || 'medium'}"></span>
          ${taskTextHtml(item, 'todo-text')}
          <span class="xp-chip">+${App.xp.taskXP(item)}</span>
        `;

        row.querySelector('input').addEventListener('change', (e) => {
          item.done = e.target.checked;
          App.xp.handleTaskToggle(item);
          App.save();
          renderItems();
        });

        row.appendChild(createPriorityCycleButton(item, (nextPriority) => {
          App.xp.changeTaskPriority(item, nextPriority);
          App.save();
          renderItems();
        }));

        row.appendChild(createDeleteButton(item, () => {
          App.xp.chargeTaskDelete(item);
          const index = block.data.indexOf(item);
          if (index >= 0) block.data.splice(index, 1);
          App.save();
          renderItems();
        }));

        list.appendChild(row);
      });
    }

    renderItems();

    const form = createAddForm({
      placeholder: 'Новая задача...',
      onSubmit: ({ text, priority }) => {
        block.data.push({ text, done: false, priority, xpGiven: false });
        App.save();
        renderItems();
      }
    });

    container.appendChild(list);
    container.appendChild(form.el);
  }

  App.blocks = App.blocks || {};
  App.blocks.todo = renderTodoBlock;
})(window.App = window.App || {});
