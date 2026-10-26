/* registry.js — реестр рендереров блоков.
   Чтобы добавить новый тип блока: создай файл в js/blocks и зарегистрируй его здесь
   и в App.config.BLOCK_TYPES. */
(function (App) {
  'use strict';

  App.blockRenderers = {
    todo: App.blocks.todo,
    matrix: App.blocks.matrix,
    notes: App.blocks.notes,
    schedule: App.blocks.schedule,
    pomodoro: App.blocks.pomodoro,
    goals: App.blocks.goals
  };
})(window.App = window.App || {});
