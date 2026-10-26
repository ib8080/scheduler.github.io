/* task-controls.js — общие элементы задач: поле создания, выбор приоритета,
   кнопка смены приоритета, галочка, чип опыта, кнопка удаления.
   Используются блоками «Список дел», «Матрица Эйзенхауэра» и «Расписание на день». */
(function (App) {
  'use strict';

  const { PRIORITIES, PRIORITY_ICONS, PRIORITY_TITLES, PRIORITY_CYCLE, DEFAULT_PRIORITY } = App.config;
  const { escapeHtml } = App.utils;

  // Enter добавляет задачу и НЕ уводит фокус на следующее поле
  function bindEnterSubmit(input, submit) {
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      e.stopPropagation();
      submit();
    });
  }

  // Ряд кнопок-кружков выбора приоритета
  function createPriorityPicker(options) {
    const { value = DEFAULT_PRIORITY, onChange } = options || {};
    const el = document.createElement('div');
    el.className = 'priority-buttons';

    let current = value;
    const buttons = PRIORITIES.map(priority => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `priority-btn ${priority}` + (priority === current ? ' active' : '');
      btn.dataset.p = priority;
      btn.title = `Приоритет: ${PRIORITY_TITLES[priority]}`;
      btn.textContent = PRIORITY_ICONS[priority];
      btn.addEventListener('click', () => {
        current = priority;
        buttons.forEach(b => b.classList.toggle('active', b.dataset.p === priority));
        if (onChange) onChange(priority);
      });
      el.appendChild(btn);
      return btn;
    });

    return { el, get value() { return current; } };
  }

  /* Поле создания задачи — то же, что в «Списке дел»:
     необязательные кнопки приоритета (сверху или снизу), необязательное время,
     поле ввода, кнопка «+» и обработчик Enter. */
  function createAddForm(options) {
    const {
      placeholder = 'Новая задача...',
      withPriority = true,
      priority = DEFAULT_PRIORITY,
      priorityPosition = 'first', // 'first' | 'last'
      withTime = false,
      time = '09:00',
      onSubmit
    } = options || {};

    const wrap = document.createElement('div');
    wrap.className = 'todo-input-wrap task-add-form';

    const picker = withPriority ? createPriorityPicker({ value: priority }) : null;
    if (picker && priorityPosition === 'first') wrap.appendChild(picker.el);

    const row = document.createElement('div');
    row.className = 'todo-add-row';

    let timeInput = null;
    if (withTime) {
      timeInput = document.createElement('input');
      timeInput.type = 'time';
      timeInput.className = 'task-time-input';
      timeInput.value = time || '09:00';
      row.appendChild(timeInput);
    }

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'todo-text-input';
    input.placeholder = placeholder;
    row.appendChild(input);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'add-btn task-add-btn';
    addBtn.textContent = '+';
    addBtn.setAttribute('aria-label', 'Добавить задачу');
    row.appendChild(addBtn);

    wrap.appendChild(row);
    if (picker && priorityPosition === 'last') wrap.appendChild(picker.el);

    const submit = () => {
      const text = input.value.trim();
      if (!text) return;
      onSubmit({
        text,
        priority: picker ? picker.value : priority,
        time: timeInput ? (timeInput.value || '09:00') : undefined
      });
      input.value = '';
      input.focus();
    };

    addBtn.addEventListener('click', submit);
    bindEnterSubmit(input, submit);

    return { el: wrap, input, timeInput, submit };
  }

  // Кнопка смены приоритета — как в списке задач
  function createPriorityCycleButton(item, onCycle) {
    const priority = item.priority || 'medium';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icon-btn priority-cycle';
    btn.title = `Приоритет: ${PRIORITY_TITLES[priority] || 'Средний'} — нажми, чтобы сменить`;
    btn.textContent = PRIORITY_ICONS[priority] || PRIORITY_ICONS.medium;
    btn.addEventListener('click', () => onCycle(PRIORITY_CYCLE[priority] || 'medium'));
    return btn;
  }

  function createDeleteButton(item, onDelete) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icon-btn item-del';
    btn.title = 'Удалить';
    btn.textContent = '✕';
    btn.addEventListener('click', () => onDelete(item));
    return btn;
  }

  function createXpChip(item) {
    const chip = document.createElement('span');
    chip.className = 'xp-chip';
    chip.textContent = `+${App.xp.taskXP(item)}`;
    return chip;
  }

  function createCheckbox(item, onChange) {
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.className = 'task-check';
    box.checked = Boolean(item.done);
    box.addEventListener('change', () => {
      item.done = box.checked;
      onChange(item);
    });
    return box;
  }

  // Разметка строки задачи (без кнопок — их добавляет блок)
  function taskTextHtml(item, extraClass) {
    const cls = ['task-text', extraClass || '', item.done ? 'done' : ''].filter(Boolean).join(' ');
    return `<span class="${cls}">${escapeHtml(item.text)}</span>`;
  }

  App.ui = App.ui || {};
  App.ui.taskControls = {
    bindEnterSubmit,
    createPriorityPicker,
    createAddForm,
    createPriorityCycleButton,
    createDeleteButton,
    createXpChip,
    createCheckbox,
    taskTextHtml
  };
})(window.App = window.App || {});
