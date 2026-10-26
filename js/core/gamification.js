/* gamification.js — опыт (XP), уровни, серия дней и начисление опыта за задачи. */
(function (App) {
  'use strict';

  const { XP_BY_PRIORITY, XP_PER_LEVEL, PRIORITY_CYCLE } = App.config;

  // Сколько опыта стоит задача
  function taskXP(item) {
    return XP_BY_PRIORITY[item.priority] ?? XP_BY_PRIORITY.medium;
  }

  // Отметка/снятие галочки: опыт начисляется один раз и снимается при отмене
  function handleTaskToggle(item) {
    const xp = taskXP(item);
    if (item.done && !item.xpGiven) {
      item.xpGiven = true;
      addXP(xp);
    } else if (!item.done && item.xpGiven) {
      item.xpGiven = false;
      addXP(-xp);
    }
  }

  // Смена приоритета у уже выполненной задачи не должна «дюпать» опыт
  function changeTaskPriority(item, nextPriority) {
    const next = nextPriority || PRIORITY_CYCLE[item.priority || 'medium'] || 'medium';
    if (next === item.priority) return next;
    if (item.done && item.xpGiven) addXP(XP_BY_PRIORITY[next] - taskXP(item));
    item.priority = next;
    return next;
  }

  // Удаление задачи штрафует только тот опыт, который уже начислен.
  // Нужно отнимать опыт или нет — решает константа XP_PENALTY_ON_TASK_DELETE в config.js.
  function chargeTaskDelete(item) {
    if (!App.config.XP_PENALTY_ON_TASK_DELETE) return;
    if (item.xpGiven) addXP(-taskXP(item));
  }

  function addXP(amount) {
    // XP не уходит в минус, но и дюпать с нуля нельзя
    App.state.xp = Math.max(0, App.state.xp + amount);
    if (amount > 0) updateStreak();
    App.save();
    updateXP();
  }

  function updateStreak() {
    const today = new Date().toDateString();
    if (App.state.lastActiveDate === today) return;

    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (App.state.lastActiveDate === yesterday) App.state.streak += 1;
    else App.state.streak = 1;

    App.state.lastActiveDate = today;
  }

  function updateXP() {
    const label = document.getElementById('xp-label');
    const fill = document.getElementById('xp-fill');
    const streakEl = document.getElementById('streak');
    if (!label || !fill || !streakEl) return;

    const level = Math.floor(App.state.xp / XP_PER_LEVEL) + 1;
    const progress = App.state.xp % XP_PER_LEVEL;

    label.textContent = `Ур. ${level} · ${App.state.xp} XP`;
    fill.style.width = `${progress}%`;
    streakEl.textContent = `🔥 ${App.state.streak}`;
  }

  App.xp = {
    taskXP,
    handleTaskToggle,
    changeTaskPriority,
    chargeTaskDelete,
    addXP,
    updateXP
  };
})(window.App = window.App || {});
