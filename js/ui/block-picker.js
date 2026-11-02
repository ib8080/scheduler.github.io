/* block-picker.js — модалка «Добавить блок». */
(function (App) {
  'use strict';

  const { BLOCK_TYPES } = App.config;

  function close() {
    const picker = document.getElementById('block-picker');
    if (picker) picker.classList.add('hidden');
  }

  function open() {
    const picker = document.getElementById('block-picker');
    const options = document.getElementById('block-picker-options');
    if (!picker || !options) return;
    options.innerHTML = '';

    BLOCK_TYPES.forEach(blockType => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'picker-option';
      btn.textContent = blockType.label;
      btn.addEventListener('click', () => {
        const id = `${blockType.type}-${Date.now()}`;
        App.state.blocks.push({
          id,
          type: blockType.type,
          title: blockType.label,
          data: blockType.defaultData(),
          settings: typeof blockType.defaultSettings === 'function' ? blockType.defaultSettings() : {}
        });
        App.state.order.push(id);
        App.save();
        App.screens.dashboard.render();
        close();
      });
      options.appendChild(btn);
    });

    picker.classList.remove('hidden');
  }

  function init() {
    const fab = document.getElementById('add-block-btn');
    const closeBtn = document.getElementById('close-picker');
    if (fab) fab.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
  }

  App.ui = App.ui || {};
  App.ui.blockPicker = { init, open, close };
})(window.App = window.App || {});
