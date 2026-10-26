/* notes-block.js — блок «Заметки» (заметки привязаны к выбранной дате). */
(function (App) {
  'use strict';

  function renderNotesBlock(container) {
    const dateKey = App.getSelectedDateKey();

    const textarea = document.createElement('textarea');
    textarea.className = 'notes-area';
    textarea.placeholder = 'Напиши свои мысли, идеи, планы...';
    textarea.value = App.state.dayNotes[dateKey] || '';

    textarea.addEventListener('input', () => {
      App.state.dayNotes[dateKey] = textarea.value;
      App.save();
    });

    container.appendChild(textarea);
  }

  App.blocks = App.blocks || {};
  App.blocks.notes = renderNotesBlock;
})(window.App = window.App || {});
