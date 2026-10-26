/* goals.js — данные целей: создание, сортировка по дате, выполнение,
   опыт за цель и автоматическая запись в «Чего я добился?» итогов месяца. */
(function (App) {
  'use strict';

  const { XP_BY_GOAL_PRIORITY, PRIORITIES } = App.config;
  const { getMonthKey, getTodayKey } = App.utils;

  function list() {
    if (!Array.isArray(App.state.goals)) App.state.goals = [];
    return App.state.goals;
  }

  function byId(id) {
    return list().find(goal => goal.id === id) || null;
  }

  function active() {
    return list().filter(goal => !goal.done);
  }

  function doneGoals() {
    return list().filter(goal => goal.done);
  }

  function goalXP(goal) {
    return XP_BY_GOAL_PRIORITY[goal.priority] ?? XP_BY_GOAL_PRIORITY.medium;
  }

  // Цели без даты — в конце, при равной дате выше более приоритетная
  function sortByDue(a, b) {
    const dateA = a.dueDate || '9999-99-99';
    const dateB = b.dueDate || '9999-99-99';
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return goalXP(b) - goalXP(a);
  }

  function sortedActive() {
    return active().slice().sort(sortByDue);
  }

  // Активные цели в порядке, выбранном для блока на главной
  function selectedForBlock(ids) {
    return (Array.isArray(ids) ? ids : [])
      .map(byId)
      .filter(goal => goal && !goal.done);
  }

  function createId() {
    return `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }

  function add(fields) {
    const title = String((fields && fields.title) || '').trim();
    if (!title) return null;

    const goal = {
      id: createId(),
      title,
      specific: String(fields.specific || '').trim(),
      measurable: String(fields.measurable || '').trim(),
      achievable: String(fields.achievable || '').trim(),
      relevant: String(fields.relevant || '').trim(),
      timeBound: String(fields.timeBound || '').trim(),
      dueDate: fields.dueDate || '',
      priority: PRIORITIES.includes(fields.priority) ? fields.priority : 'medium',
      createdAt: getTodayKey(),
      done: false,
      doneDate: null,
      xpGiven: false,
      reviewAdded: null
    };

    list().push(goal);
    App.save();
    return goal;
  }

  function remove(id) {
    App.state.goals = list().filter(goal => goal.id !== id);
    App.save();
  }

  // Дописать выполненную цель в итоги текущего месяца (поле «Чего я добился?»)
  function addToMonthReview(goal) {
    if (!goal || goal.reviewAdded) return;

    const monthKey = getMonthKey();
    let review = App.state.monthReviews.find(entry => entry.monthKey === monthKey);
    if (!review) {
      review = { monthKey, whatDone: '', whatAchieved: '', whatNext: '', motivation: '', timeControl: '' };
      App.state.monthReviews.push(review);
    }

    const line = `✓ ${goal.title}`;
    const previous = String(review.whatAchieved || '').trim();
    review.whatAchieved = previous ? `${previous}\n${line}` : line;
    goal.reviewAdded = monthKey;
  }

  function complete(goal, options) {
    if (!goal || goal.done) return;

    const addToReview = !options || options.addToReview !== false;

    goal.done = true;
    goal.doneDate = getTodayKey();

    if (!goal.xpGiven) {
      goal.xpGiven = true;
      App.xp.addXP(goalXP(goal));
    }
    if (addToReview) addToMonthReview(goal);

    App.save();
  }

  App.goals = {
    list,
    byId,
    active,
    doneGoals,
    sortedActive,
    selectedForBlock,
    goalXP,
    sortByDue,
    add,
    remove,
    complete,
    addToMonthReview
  };
})(window.App = window.App || {});
