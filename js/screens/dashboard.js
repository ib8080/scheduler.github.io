/* dashboard.js — главный экран: карточки-блоки, режим редактирования, drag-and-drop. */
(function (App) {
  'use strict';

  const { escapeHtml } = App.utils;
  const grid = document.getElementById('dashboard-grid');

  let dragState = null;

  function createCard(block) {
    const card = document.createElement('article');
    card.className = 'dashboard-card';
    card.dataset.blockId = block.id;

    const tools = App.state.editingMode ? `
      <button class="tool-btn rename-btn" aria-label="Переименовать">✎</button>
      <button class="tool-btn delete-btn" aria-label="Удалить">✕</button>
      <button class="handle" aria-label="Перетащить">☰</button>` : '';

    card.innerHTML = `
      <header class="card-header">
        <h2>${escapeHtml(block.title)}</h2>
        <div class="card-tools">${tools}</div>
      </header>
      <div class="card-body"></div>
    `;

    const body = card.querySelector('.card-body');
    const renderer = App.blockRenderers[block.type];
    if (renderer) renderer(body, block, block.id);

    if (App.state.editingMode) {
      card.querySelector('.rename-btn').onclick = () => {
        const title = prompt('Название блока:', block.title);
        if (title && title.trim()) {
          block.title = title.trim();
          App.save();
          render();
        }
      };

      card.querySelector('.delete-btn').onclick = () => {
        if (!confirm(`Удалить блок «${block.title}»?`)) return;
        App.state.blocks = App.state.blocks.filter(b => b.id !== block.id);
        App.state.order = App.state.order.filter(id => id !== block.id);
        App.state.hidden = App.state.hidden.filter(id => id !== block.id);
        App.save();
        render();
      };

      initDrag(card, block.id);
    }

    return card;
  }

  function render() {
    if (!grid) return;
    grid.innerHTML = '';
    document.body.classList.toggle('edit-mode', App.state.editingMode);

    App.state.order
      .filter(id => !App.state.hidden.includes(id))
      .forEach(id => {
        const block = App.state.blocks.find(b => b.id === id);
        if (block) grid.appendChild(createCard(block));
      });

    App.ui.header.render();
    App.xp.updateXP();
  }

  function initDrag(card, blockId) {
    const handle = card.querySelector('.handle');
    if (!handle) return;

    handle.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      dragState = { card, blockId };
      card.classList.add('dragging');
      if (handle.setPointerCapture) handle.setPointerCapture(e.pointerId);
    });

    handle.addEventListener('pointermove', (e) => {
      if (!dragState || dragState.blockId !== blockId) return;

      const cards = [...grid.querySelectorAll('.dashboard-card')];
      const currentIndex = cards.indexOf(card);

      for (let i = 0; i < cards.length; i++) {
        if (i === currentIndex) continue;
        const rect = cards[i].getBoundingClientRect();
        if (e.clientY > rect.top && e.clientY < rect.bottom) {
          const order = App.state.order.filter(id => !App.state.hidden.includes(id));
          const from = order.indexOf(blockId);
          const to = order.indexOf(cards[i].dataset.blockId);
          if (from !== -1 && to !== -1 && from !== to) {
            order.splice(from, 1);
            order.splice(to, 0, blockId);
            App.state.order = [...order, ...App.state.order.filter(id => App.state.hidden.includes(id))];
            App.save();
            if (from < to) grid.insertBefore(card, cards[i].nextSibling);
            else grid.insertBefore(card, cards[i]);
          }
          break;
        }
      }
    });

    const endDrag = () => {
      if (!dragState) return;
      dragState.card.classList.remove('dragging');
      dragState = null;
      App.save();
    };

    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
  }

  App.screens = App.screens || {};
  App.screens.dashboard = { render, initDrag };
})(window.App = window.App || {});
