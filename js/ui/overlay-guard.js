/* overlay-guard.js — пока открыта модалка или оверлей, страница под ними
   не прокручивается, а Tab не уводит фокус в фон. Работает для всех модалок,
   включая статическую #block-picker, и для оверлея таймера. */
(function (App) {
  'use strict';

  const SELECTOR = '.modal:not(.hidden), .timer-alert';

  let locked = false;
  let savedScrollY = 0;

  function overlayExists() {
    return document.querySelector(SELECTOR) !== null;
  }

  function lock() {
    if (locked) return;
    locked = true;
    savedScrollY = window.scrollY || window.pageYOffset || 0;
    document.documentElement.classList.add('overlay-open');
    document.body.classList.add('overlay-open');
    // iOS: зафиксированное тело не даёт прокручивать страницу под оверлеем
    document.body.style.top = `-${savedScrollY}px`;
  }

  function unlock() {
    if (!locked) return;
    locked = false;
    document.documentElement.classList.remove('overlay-open');
    document.body.classList.remove('overlay-open');
    document.body.style.top = '';
    if (savedScrollY) {
      try {
        window.scrollTo(0, savedScrollY);
      } catch (e) { /* среда без прокрутки */ }
    }
  }

  function sync() {
    if (overlayExists()) lock();
    else unlock();
  }

  function topOverlay() {
    const alerts = document.querySelectorAll('.timer-alert');
    if (alerts.length) return alerts[alerts.length - 1];
    const modals = document.querySelectorAll('.modal:not(.hidden)');
    return modals.length ? modals[modals.length - 1] : null;
  }

  function focusable(root) {
    const items = root.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    return [...items].filter(element => !element.disabled && element.tabIndex !== -1 && !element.hidden);
  }

  // Tab ходит по кругу внутри верхнего оверлея и не попадает в фон
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const overlay = topOverlay();
    if (!overlay) return;

    const items = focusable(overlay);
    if (!items.length) {
      event.preventDefault();
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (!overlay.contains(active)) {
      event.preventDefault();
      first.focus();
      return;
    }
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  });

  // Модалки добавляются/удаляются, а #block-picker показывается классом hidden
  // MutationObserver сам объединяет изменения в один вызов на микротаск
  const observer = new MutationObserver(sync);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });

  sync();

  App.ui = App.ui || {};
  App.ui.overlayGuard = { sync, isLocked: () => locked };
})(window.App = window.App || {});
