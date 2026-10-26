/* schedule-block.js — блок «Расписание на день»:
   плановые занятия из вкладки «Неделя» + внеплановые задачи с приоритетом и опытом. */
(function (App) {
  'use strict';

  const { DAY_FULL_NAMES } = App.config;
  const {
    createAddForm,
    createPriorityCycleButton,
    createDeleteButton,
    createXpChip
  } = App.ui.taskControls;

  function renderScheduleBlock(container) {
    const dateKey = App.getSelectedDateKey();
    const dayKey = App.utils.dayOfWeekKey(dateKey);
    const dayName = DAY_FULL_NAMES[App.utils.parseDateKey(dateKey).getDay()];
    const planned = App.state.weekSchedule[dayKey] || [];
    const extraTasks = App.getDailyTasks(dateKey);

    container.innerHTML = '';

    // Описание блока — только день недели
    const sub = document.createElement('p');
    sub.className = 'sched-sub';
    sub.textContent = dayName;
    container.appendChild(sub);

    const list = document.createElement('div');
    list.className = 'schedule-list';
    container.appendChild(list);

    function renderItems() {
      list.innerHTML = '';

      // общий список: плановые + внеплановые, сортировка по времени начала
      const entries = [
        ...planned.map(item => ({ kind: 'planned', item })),
        ...extraTasks.map(item => ({ kind: 'extra', item }))
      ].sort((a, b) => {
        const timeA = a.item.time || '99:99';
        const timeB = b.item.time || '99:99';
        return timeA.localeCompare(timeB);
      });

      if (entries.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'planned-empty';
        empty.textContent = 'Пусто. Плановые занятия настраиваются во вкладке «Неделя», внеплановые добавляются ниже.';
        list.appendChild(empty);
        return;
      }

      entries.forEach(({ kind, item }) => {
        const isExtra = kind === 'extra';
        const row = document.createElement('div');
        row.className = `day-schedule-item ${kind}${item.done ? ' done' : ''}`;

        if (!isExtra) {
          // плановые занятия не отмечаются — только время и предмет
          const timeSpan = document.createElement('span');
          timeSpan.className = 'item-time-static';
          timeSpan.textContent = item.time || '';
          const subject = document.createElement('span');
          subject.className = 'item-subject';
          subject.textContent = item.subject || '';
          row.append(timeSpan, subject);
          list.appendChild(row);
          return;
        }

        const check = document.createElement('input');
        check.type = 'checkbox';
        check.className = 'task-check';
        check.checked = Boolean(item.done);
        check.addEventListener('change', () => {
          item.done = check.checked;
          App.xp.handleTaskToggle(item);
          App.save();
          renderItems();
        });

        const timeInput = document.createElement('input');
        timeInput.type = 'time';
        timeInput.className = 'item-time';
        timeInput.value = item.time || '09:00';
        timeInput.addEventListener('change', () => {
          item.time = timeInput.value;
          App.save();
          renderItems(); // пересортировать по новому времени
        });

        const subject = document.createElement('span');
        subject.className = 'item-subject';
        subject.textContent = item.text || '';

        row.append(
          check,
          timeInput,
          subject,
          createXpChip(item),
          createPriorityCycleButton(item, (nextPriority) => {
            App.xp.changeTaskPriority(item, nextPriority);
            App.save();
            renderItems();
          }),
          createDeleteButton(item, () => {
            App.xp.chargeTaskDelete(item);
            const index = extraTasks.indexOf(item);
            if (index >= 0) extraTasks.splice(index, 1);
            App.save();
            renderItems();
          })
        );

        list.appendChild(row);
      });
    }

    renderItems();

    const form = createAddForm({
      placeholder: 'Внеплановая задача...',
      withTime: true,
      withPriority: true,
      priorityPosition: 'last',
      onSubmit: ({ text, priority, time }) => {
        extraTasks.push({ text, time: time || '09:00', priority, done: false, xpGiven: false });
        App.save();
        renderItems();
      }
    });
    form.el.classList.add('extra-add-wrap');
    container.appendChild(form.el);
  }

  App.blocks = App.blocks || {};
  App.blocks.schedule = renderScheduleBlock;
})(window.App = window.App || {});
