/* storage.js — загрузка, сохранение и миграции состояния в localStorage. */
(function (App) {
  'use strict';

  const { STORAGE_KEY, QUADRANTS } = App.config;

  // Приводит старые данные матрицы (просто строки) к формату задач.
  function normalizeMatrixData(data) {
    const source = data && typeof data === 'object' ? data : {};
    const result = {};
    QUADRANTS.forEach(q => {
      const list = Array.isArray(source[q.key]) ? source[q.key] : [];
      result[q.key] = list.map(item => (typeof item === 'string'
        ? { text: item, done: false, priority: q.priority, xpGiven: false }
        : {
            text: String(item && item.text != null ? item.text : ''),
            done: Boolean(item && item.done),
            priority: q.priority, // приоритет всегда от категории
            xpGiven: Boolean(item && item.xpGiven)
          }
      )).filter(item => item.text !== '');
    });
    return result;
  }

  function normalizeDailyTasks(dailyTasks) {
    const result = {};
    Object.keys(dailyTasks || {}).forEach(dateKey => {
      const list = dailyTasks[dateKey];
      if (!Array.isArray(list)) return;
      result[dateKey] = list.map(task => ({
        text: String(task.text || ''),
        time: task.time || '09:00',
        priority: task.priority || App.config.DEFAULT_PRIORITY,
        done: Boolean(task.done),
        xpGiven: Boolean(task.xpGiven)
      })).filter(task => task.text !== '');
    });
    return result;
  }

  function normalizeGoals(goals) {
    const source = Array.isArray(goals) ? goals : [];
    return source
      .filter(goal => goal && String(goal.title || '').trim())
      .map((goal, index) => ({
        id: goal.id || `goal-legacy-${index}`,
        title: String(goal.title).trim(),
        specific: String(goal.specific || ''),
        measurable: String(goal.measurable || ''),
        achievable: String(goal.achievable || ''),
        relevant: String(goal.relevant || ''),
        timeBound: String(goal.timeBound || ''),
        dueDate: /^\d{4}-\d{2}-\d{2}$/.test(String(goal.dueDate || '')) ? goal.dueDate : '',
        priority: ['high', 'medium', 'low'].includes(goal.priority) ? goal.priority : 'medium',
        createdAt: goal.createdAt || '',
        done: Boolean(goal.done),
        doneDate: goal.doneDate || null,
        xpGiven: Boolean(goal.xpGiven),
        reviewAdded: goal.reviewAdded || null
      }));
  }

  function normalizePomodoro(source) {
    const defaults = App.config.POMODORO_DEFAULTS;
    const src = source && typeof source === 'object' ? source : {};
    const rawSettings = src.settings && typeof src.settings === 'object' ? src.settings : {};
    const clampMinutes = (value, fallback) => {
      const number = Math.round(Number(value));
      return Number.isFinite(number) ? Math.min(120, Math.max(1, number)) : fallback;
    };

    const work = clampMinutes(rawSettings.work, defaults.work);
    const breakMinutes = clampMinutes(rawSettings.break, defaults.break);
    const phase = src.phase === 'break' ? 'break' : 'work';

    const tasks = Array.isArray(src.tasks)
      ? src.tasks
          .filter(task => task && String(task.text || '').trim())
          .map((task, index) => ({
            id: task.id || `pomo-legacy-${index}`,
            text: String(task.text).trim(),
            done: Boolean(task.done),
            xpGiven: Boolean(task.xpGiven)
          }))
      : [];

    const activeTaskId = tasks.some(task => task.id === src.activeTaskId)
      ? src.activeTaskId
      : (tasks[0] ? tasks[0].id : null);

    const endAt = Number(src.endAt) > 0 ? Number(src.endAt) : null;
    const maxSeconds = 120 * 60;
    let remaining = Math.round(Number(src.remaining));
    if (!Number.isFinite(remaining) || remaining < 0 || remaining > maxSeconds) {
      remaining = (phase === 'break' ? breakMinutes : work) * 60;
    }

    return {
      tasks,
      activeTaskId,
      settings: { work, break: breakMinutes },
      phase,
      endAt,
      remaining,
      message: String(src.message || ''),
      messageKind: String(src.messageKind || '')
    };
  }

  function loadState() {
    const defaults = App.config.createDefaultState();
    let loaded = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) loaded = JSON.parse(raw) || null;
    } catch (e) {
      loaded = null;
    }
    if (!loaded) return defaults;

    const merged = Object.assign(defaults, loaded);

    // миграция недельных итогов в месячные (старый формат)
    if (loaded.reviews && !loaded.monthReviews) {
      merged.monthReviews = loaded.reviews.map(r => ({
        ...r,
        monthKey: (r.weekKey || '').slice(0, 4) + '-01'
      }));
    }
    if (!Array.isArray(merged.monthReviews)) merged.monthReviews = [];
    // оставляем только записи с корректным ключом месяца (YYYY-MM)
    merged.monthReviews = merged.monthReviews.filter(r => r && /^\d{4}-\d{2}$/.test(String(r.monthKey || '')));

    merged.weekSchedule = { ...defaults.weekSchedule, ...(loaded.weekSchedule || {}) };
    merged.dayNotes = loaded.dayNotes || {};
    merged.dailyTasks = normalizeDailyTasks(loaded.dailyTasks);
    merged.stepsProgress = loaded.stepsProgress || {};
    if (!merged.selectedDate) merged.selectedDate = null;
    if (typeof merged.editingMode !== 'boolean') merged.editingMode = false;
    if (!Array.isArray(merged.blocks)) merged.blocks = defaults.blocks;
    if (!Array.isArray(merged.order)) merged.order = merged.blocks.map(b => b.id);
    if (!Array.isArray(merged.hidden)) merged.hidden = [];
    if (typeof merged.xp !== 'number') merged.xp = 0;
    if (typeof merged.streak !== 'number') merged.streak = 0;

    // блок «Расписание на день» добавляем, если его нет
    if (!merged.blocks.some(b => b.type === 'schedule')) {
      const id = 'schedule-' + Date.now();
      merged.blocks.push({ id, type: 'schedule', title: 'Расписание на день', data: {} });
      merged.order.push(id);
    } else {
      const scheduleBlock = merged.blocks.find(b => b.type === 'schedule');
      if (scheduleBlock && !merged.order.includes(scheduleBlock.id)) {
        merged.order.push(scheduleBlock.id);
      }
    }

    // миграция задач матрицы (раньше хранились строками, теперь объекты с XP)
    merged.blocks.forEach(block => {
      if (block.type === 'matrix') block.data = normalizeMatrixData(block.data);
      if (block.type === 'goals') {
        block.data = { ids: Array.isArray(block.data && block.data.ids) ? block.data.ids : [] };
      }
      if (block.type === 'pomodoro' && (!block.data || typeof block.data !== 'object')) block.data = {};
    });

    // цели и помодоро
    merged.goals = normalizeGoals(loaded.goals);
    merged.pomodoro = normalizePomodoro(loaded.pomodoro);

    // у старых сохранений блоков помодоро и целей ещё нет — добавляем один раз
    const rawFlags = loaded.flags && typeof loaded.flags === 'object' ? loaded.flags : {};
    merged.flags = {
      pomodoroBlockAdded: Boolean(rawFlags.pomodoroBlockAdded),
      goalsBlockAdded: Boolean(rawFlags.goalsBlockAdded)
    };
    if (!merged.flags.pomodoroBlockAdded && !merged.blocks.some(b => b.type === 'pomodoro')) {
      merged.blocks.push({ id: 'pomodoro-' + Date.now(), type: 'pomodoro', title: 'Помодоро', data: {} });
    }
    if (!merged.flags.goalsBlockAdded && !merged.blocks.some(b => b.type === 'goals')) {
      merged.blocks.push({ id: 'goals-' + Date.now(), type: 'goals', title: 'Цели', data: { ids: [] } });
    }
    merged.flags.pomodoroBlockAdded = true;
    merged.flags.goalsBlockAdded = true;

    // каждый блок должен быть в порядке отрисовки
    merged.blocks.forEach(block => {
      if (!merged.order.includes(block.id)) merged.order.push(block.id);
    });

    return merged;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(App.state));
    } catch (e) {
      console.error('Не удалось сохранить данные:', e);
    }
  }

  App.storage = { loadState, saveState, normalizeMatrixData };
})(window.App = window.App || {});
