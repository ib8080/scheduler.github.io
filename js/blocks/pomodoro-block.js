/* pomodoro-block.js — блок «Помодоро»: задачи, настройки длительности,
   таймер и мотивационные сообщения при запуске и остановке. */
(function (App) {
  'use strict';

  const { escapeHtml } = App.utils;
  const { createAddForm, createCheckbox } = App.ui.taskControls;

  function renderPomodoroBlock(container, block) {
    if (!block.data || typeof block.data !== 'object') block.data = {};

    container.innerHTML = '';

    const controller = document.createElement('div');
    controller.className = 'pomodoro-controller';
    container.appendChild(controller);

    const settings = document.createElement('div');
    settings.className = 'pomodoro-settings';
    settings.innerHTML = `
      <label class="pomodoro-setting">
        <span>Работа, мин</span>
        <input type="number" class="pomodoro-minutes" inputmode="numeric" min="1" max="120">
      </label>
      <label class="pomodoro-setting">
        <span>Перерыв, мин</span>
        <input type="number" class="pomodoro-minutes" inputmode="numeric" min="1" max="120">
      </label>
    `;
    const inputs = settings.querySelectorAll('input');
    const workInput = inputs[0];
    const breakInput = inputs[1];
    workInput.addEventListener('change', () => applySettings());
    breakInput.addEventListener('change', () => applySettings());

    function applySettings() {
      App.pomodoro.setSettings(workInput.value, breakInput.value);
      const state = App.pomodoro.state();
      workInput.value = state.settings.work;
      breakInput.value = state.settings.break;
      renderController();
    }

    container.appendChild(settings);

    const tasksWrap = document.createElement('div');
    tasksWrap.className = 'pomodoro-tasks';
    container.appendChild(tasksWrap);

    const form = createAddForm({
      placeholder: 'Задача для помодоро...',
      withPriority: false,
      onSubmit: ({ text }) => {
        App.pomodoro.addTask(text);
        renderTasks();
        renderController();
      }
    });
    container.appendChild(form.el);

    function renderController() {
      const state = App.pomodoro.state();
      const running = App.pomodoro.isRunning();
      const task = App.pomodoro.activeTask();

      workInput.value = state.settings.work;
      breakInput.value = state.settings.break;

      controller.innerHTML = `
        <div class="pomodoro-phase">${state.phase === 'break' ? 'Перерыв' : 'Работа'}</div>
        <div class="pomodoro-timer">${App.pomodoro.format(App.pomodoro.remainingSeconds())}</div>
        <div class="pomodoro-current">${task
          ? 'Сейчас: ' + escapeHtml(task.text)
          : 'Задача не выбрана'}</div>
        <div class="pomodoro-controls">
          <button type="button" class="primary-btn pomodoro-toggle">${running ? 'Пауза' : 'Старт'}</button>
          <button type="button" class="secondary-btn pomodoro-reset">Сброс</button>
        </div>
        <p class="pomodoro-message${state.messageKind ? ' ' + state.messageKind : ''}">${escapeHtml(
          state.message || 'Нажми «Старт», когда будешь готов.'
        )}</p>
      `;

      controller.querySelector('.pomodoro-toggle').addEventListener('click', () => {
        App.pomodoro.toggle();
        renderController();
      });
      controller.querySelector('.pomodoro-reset').addEventListener('click', () => {
        App.pomodoro.reset();
        renderController();
      });
    }

    function renderTasks() {
      const state = App.pomodoro.state();
      tasksWrap.innerHTML = '';

      const tasks = App.pomodoro.tasks();
      if (!tasks.length) {
        const empty = document.createElement('p');
        empty.className = 'planned-empty';
        empty.textContent = 'Задач нет. Добавь первую — таймер привяжется к ней.';
        tasksWrap.appendChild(empty);
        return;
      }

      tasks.forEach(task => {
        const row = document.createElement('div');
        row.className = 'pomodoro-task-row'
          + (task.done ? ' done' : '')
          + (task.id === state.activeTaskId ? ' active' : '');

        // Галочка выполнения — как у обычных задач, но опыт меньше
        const box = createCheckbox(task, (item) => {
          App.pomodoro.setTaskDone(item.id, item.done);
          renderTasks();
          renderController();
        });
        box.title = task.done ? 'Снять отметку' : 'Выполнено';

        const pick = document.createElement('button');
        pick.type = 'button';
        pick.className = 'pomodoro-task-text';
        pick.textContent = task.text;
        pick.title = task.done ? 'Выполненная задача' : 'Выбрать эту задачу';
        pick.disabled = task.done;
        pick.addEventListener('click', () => {
          App.pomodoro.selectTask(task.id);
          renderTasks();
          renderController();
        });

        const chip = document.createElement('span');
        chip.className = 'xp-chip';
        chip.textContent = `+${App.pomodoro.taskXP()}`;
        chip.title = 'Опыт за выполнение';

        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'icon-btn item-del';
        del.title = 'Удалить задачу';
        del.textContent = '✕';
        del.addEventListener('click', () => {
          App.pomodoro.removeTask(task.id); // опыт за удаление не снимается
          renderTasks();
          renderController();
        });

        row.append(box, pick, chip, del);
        tasksWrap.appendChild(row);
      });
    }

    renderController();
    renderTasks();

    // Отсчёт раз в секунду; старый интервал этого блока снимаем
    if (block._pomodoroTimer) clearInterval(block._pomodoroTimer);
    block._pomodoroTimer = setInterval(() => {
      if (!container.isConnected) {
        clearInterval(block._pomodoroTimer);
        block._pomodoroTimer = null;
        return;
      }
      if (App.pomodoro.tick()) {
        renderController(); // фаза сменилась — обновляем целиком
        return;
      }
      const timerEl = controller.querySelector('.pomodoro-timer');
      if (timerEl) timerEl.textContent = App.pomodoro.format(App.pomodoro.remainingSeconds());
    }, 1000);
  }

  App.blocks = App.blocks || {};
  App.blocks.pomodoro = renderPomodoroBlock;
})(window.App = window.App || {});
