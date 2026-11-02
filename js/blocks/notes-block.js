/* notes-block.js — блок «Заметки».
   По умолчанию заметка у каждого дня своя. В редактировании блок можно
   переключить в «общие заметки»: текст один на все дни и не привязан к дате.
   При включении текущая дневная заметка переносится в общие, если общие пусты.
   Показ вчерашних заметок работает только в дневном режиме. */
(function (App) {
  'use strict';

  const { escapeHtml, formatDateShort, shiftDateKey } = App.utils;

  function permanentText() {
    return String(App.state.permanentNotes || '');
  }

  function makeToggle(className, checked, label, title, onChange) {
    const toggle = document.createElement('label');
    toggle.className = 'notes-toggle';
    if (title) toggle.title = title;
    toggle.innerHTML = `
      <input type="checkbox" class="${className}"${checked ? ' checked' : ''}>
      <span>${label}</span>
    `;
    toggle.querySelector('input').addEventListener('change', onChange);
    return toggle;
  }

  function renderNotesBlock(container, block) {
    const dateKey = App.getSelectedDateKey();

    if (!block.settings || typeof block.settings !== 'object') block.settings = {};
    const settings = block.settings;
    const permanent = Boolean(settings.permanent);

    container.innerHTML = '';

    // В обычном режиме видно, что заметка общая, а не дневная
    if (permanent) {
      const hint = document.createElement('p');
      hint.className = 'notes-mode-hint';
      hint.textContent = 'Общие заметки — не привязаны к дню';
      container.appendChild(hint);
    }

    const textarea = document.createElement('textarea');
    textarea.className = 'notes-area';
    textarea.placeholder = permanent
      ? 'Общие заметки: то, что важно в любой день...'
      : 'Напиши свои мысли, идеи, планы...';
    textarea.value = permanent ? permanentText() : (App.state.dayNotes[dateKey] || '');

    textarea.addEventListener('input', () => {
      if (permanent) App.state.permanentNotes = textarea.value;
      else App.state.dayNotes[dateKey] = textarea.value;
      App.save();
    });

    container.appendChild(textarea);

    // Переключатели живут только в редактировании — в обычном режиме блок чистый
    if (App.state.editingMode) {
      container.appendChild(makeToggle(
        'notes-permanent-toggle',
        permanent,
        'Общие заметки (не по дням)',
        'Один текст на все дни. При включении сегодняшняя заметка станет общей, если общие ещё пусты.',
        (event) => {
          const next = event.target.checked;
          if (next) {
            const dailyText = String(App.state.dayNotes[dateKey] || '');
            if (!permanentText().trim() && dailyText.trim()) {
              App.state.permanentNotes = dailyText;
              delete App.state.dayNotes[dateKey];
            }
          }
          settings.permanent = next;
          App.save();
          renderNotesBlock(container, block);
        }
      ));

      if (!permanent) {
        container.appendChild(makeToggle(
          'notes-yesterday-toggle',
          settings.showYesterday,
          'Показывать заметки с прошлого дня',
          'Вчерашний текст показывается рядом с сегодняшним, но не копируется в него.',
          (event) => {
            settings.showYesterday = event.target.checked;
            App.save();
            renderNotesBlock(container, block);
          }
        ));
      }
    }

    if (!permanent && settings.showYesterday) {
      const previousKey = shiftDateKey(dateKey, -1);
      const previousText = String(App.state.dayNotes[previousKey] || '').trim();

      const panel = document.createElement('div');
      panel.className = 'notes-yesterday';
      panel.innerHTML = `
        <div class="notes-yesterday-head">
          <span class="notes-yesterday-label">С прошлого дня</span>
          <span class="notes-yesterday-date">${formatDateShort(previousKey)}</span>
        </div>
        <p class="notes-yesterday-text${previousText ? '' : ' empty'}">${previousText
          ? escapeHtml(previousText)
          : 'Вчера заметок не было'}</p>
      `;
      container.appendChild(panel);
    }
  }

  App.blocks = App.blocks || {};
  App.blocks.notes = renderNotesBlock;
})(window.App = window.App || {});
