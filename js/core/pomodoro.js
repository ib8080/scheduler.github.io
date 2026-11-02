/* pomodoro.js — таймер помодоро: задачи, настройки, запуск/пауза/сброс
   и мотивационные сообщения на старте и остановке.
   Время хранится меткой endAt, поэтому таймер живёт между перерисовками и перезагрузками. */
(function (App) {
  'use strict';

  const { POMODORO_DEFAULTS, POMODORO_MESSAGES, POMODORO_SOUND_DEFAULT } = App.config;

  function clampMinutes(value, fallback) {
    const number = Math.round(Number(value));
    if (!Number.isFinite(number)) return fallback;
    return Math.min(120, Math.max(1, number));
  }

  function state() {
    if (!App.state.pomodoro) {
      App.state.pomodoro = {
        tasks: [],
        activeTaskId: null,
        settings: {
          work: POMODORO_DEFAULTS.work,
          break: POMODORO_DEFAULTS.break,
          sound: POMODORO_SOUND_DEFAULT
        },
        phase: 'work',
        endAt: null,
        remaining: POMODORO_DEFAULTS.work * 60,
        message: '',
        messageKind: ''
      };
    }
    return App.state.pomodoro;
  }

  function phaseMinutes(phase) {
    const p = state();
    return phase === 'break' ? p.settings.break : p.settings.work;
  }

  function phaseSeconds(phase) {
    return Math.max(1, Math.round(phaseMinutes(phase) * 60));
  }

  function isRunning() {
    return Boolean(state().endAt);
  }

  function remainingSeconds() {
    const p = state();
    if (p.endAt) return Math.max(0, Math.ceil((p.endAt - Date.now()) / 1000));
    return Math.max(0, Math.round(p.remaining));
  }

  function format(seconds) {
    const safe = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(safe / 60);
    const rest = safe % 60;
    return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  }

  function randomMessage(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function setMessage(kind) {
    const p = state();
    const messages = POMODORO_MESSAGES[kind] || [];
    p.message = messages.length ? randomMessage(messages) : '';
    p.messageKind = kind;
  }

  function start() {
    const p = state();
    if (p.endAt) return;
    if (p.remaining <= 0) p.remaining = phaseSeconds(p.phase);
    p.endAt = Date.now() + p.remaining * 1000;
    setMessage('start');
    App.save();
  }

  function pause() {
    const p = state();
    if (!p.endAt) return;
    p.remaining = remainingSeconds();
    p.endAt = null;
    setMessage('pause');
    App.save();
  }

  function toggle() {
    if (isRunning()) pause();
    else start();
  }

  // Сброс всегда возвращает таймер к работе над задачей, даже если он стоял
  // на перерыве: после сброса снова 25 минут задачи, а не отдых.
  function reset() {
    const p = state();
    p.endAt = null;
    p.phase = 'work';
    p.remaining = phaseSeconds('work');
    setMessage('stop');
    App.save();
  }

  function setSettings(work, breakMinutes) {
    const p = state();
    p.settings.work = clampMinutes(work, p.settings.work);
    p.settings.break = clampMinutes(breakMinutes, p.settings.break);
    // запущенный таймер не сбиваем: он досчитает по старой длительности
    if (!p.endAt) p.remaining = phaseSeconds(p.phase);
    App.save();
  }

  // Звук конца таймера выбирается в редактировании блока «Помодоро»
  function setSound(value) {
    const p = state();
    p.settings.sound = App.config.isPomodoroSound(value) ? value : POMODORO_SOUND_DEFAULT;
    App.save();
  }

  // Раз в секунду: если время вышло — переключаем фазу и меняем сообщение.
  // Возвращает true, если фаза сменилась (тогда интерфейс надо обновить).
  function tick() {
    const p = state();
    if (!p.endAt) return false;
    if (Date.now() < p.endAt) return false;

    const finishedPhase = p.phase;
    p.endAt = null;
    p.phase = finishedPhase === 'work' ? 'break' : 'work';
    p.remaining = phaseSeconds(p.phase);
    setMessage(finishedPhase === 'work' ? 'workDone' : 'breakDone');
    App.save();

    // Будильник и оверлей: звук берём из настроек, показываем поверх любого экрана
    if (App.ui && App.ui.timerAlert) {
      App.ui.timerAlert.show({
        finished: finishedPhase,
        sound: p.settings.sound || POMODORO_SOUND_DEFAULT
      });
    }
    return true;
  }

  // ===== Задачи помодоро =====
  // Своя, меньшая награда: помодоро — вспомогательный инструмент, а не список дел.

  function taskXP() {
    return App.config.XP_PER_POMODORO_TASK;
  }


  function tasks() {
    const p = state();
    if (!Array.isArray(p.tasks)) p.tasks = [];
    return p.tasks;
  }

  function activeTask() {
    const p = state();
    return tasks().find(task => task.id === p.activeTaskId) || null;
  }

  function addTask(text) {
    const value = String(text || '').trim();
    if (!value) return null;
    const p = state();
    const task = {
      id: `pomo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: value,
      done: false,
      xpGiven: false
    };
    tasks().push(task);

    // Активной становится первая невыполненная задача
    if (!p.activeTaskId || !tasks().some(item => item.id === p.activeTaskId && !item.done)) {
      p.activeTaskId = task.id;
    }
    App.save();
    return task;
  }

  // Удаление задачи помодоро опыт не снимает — даже если она была выполнена
  function removeTask(id) {
    const p = state();
    p.tasks = tasks().filter(task => task.id !== id);
    if (p.activeTaskId === id) {
      const next = p.tasks.find(task => !task.done);
      p.activeTaskId = next ? next.id : null;
    }
    App.save();
  }

  // Галочка выполнения: опыт начисляется один раз, при снятии — снимается
  function setTaskDone(id, done) {
    const p = state();
    const task = tasks().find(item => item.id === id);
    if (!task) return;

    task.done = Boolean(done);

    if (task.done && !task.xpGiven) {
      task.xpGiven = true;
      App.xp.addXP(taskXP());
      setMessage('taskDone');
    } else if (!task.done && task.xpGiven) {
      task.xpGiven = false;
      App.xp.addXP(-taskXP());
    }

    // Выполненная задача не должна оставаться «текущей»
    if (task.done && p.activeTaskId === task.id) {
      const next = tasks().find(item => !item.done);
      p.activeTaskId = next ? next.id : null;
    } else if (!task.done && !p.activeTaskId) {
      p.activeTaskId = task.id;
    }

    App.save();
  }

  function toggleTask(id) {
    const task = tasks().find(item => item.id === id);
    if (task) setTaskDone(id, !task.done);
  }

  function selectTask(id) {
    const p = state();
    const task = tasks().find(item => item.id === id);
    if (!task || task.done) return; // выполненную задачу текущей не делаем
    p.activeTaskId = id;
    App.save();
  }

  App.pomodoro = {
    state,
    isRunning,
    remainingSeconds,
    format,
    phaseMinutes,
    phaseSeconds,
    start,
    pause,
    toggle,
    reset,
    setSettings,
    setSound,
    tick,
    taskXP,
    tasks,
    activeTask,
    addTask,
    removeTask,
    setTaskDone,
    toggleTask,
    selectTask
  };
})(window.App = window.App || {});
