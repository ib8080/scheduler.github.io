/* lesson-theme.js — страницы уроков принимают тему приложения.
   Уроки — отдельные HTML-документы, поэтому читаем тему из того же
   localStorage, что и ежедневник, и включаем её до отрисовки страницы. */
(function () {
  'use strict';

  var KEY = 'school_planner_v3';
  var MODES = ['light', 'dark', 'custom'];
  var theme = null;

  try {
    var raw = window.localStorage.getItem(KEY);
    if (raw) {
      var state = JSON.parse(raw);
      if (state && state.theme && typeof state.theme === 'object') theme = state.theme;
    }
  } catch (e) { /* localStorage может быть недоступен — останется светлая */ }

  // На случай, если урок открыли из приложения и localStorage почему-то пуст
  if (!theme && window.opener) {
    try {
      var openerState = window.opener.App && window.opener.App.state;
      if (openerState && openerState.theme) theme = openerState.theme;
    } catch (e) { /* другое происхождение — просто пропускаем */ }
  }

  var mode = theme && MODES.indexOf(theme.mode) !== -1 ? theme.mode : 'light';
  var customCSS = theme && typeof theme.customCSS === 'string' ? theme.customCSS : '';
  if (mode === 'custom' && !customCSS.trim()) mode = 'light';

  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode === 'dark' ? 'dark' : 'light';

  if (mode === 'custom') {
    var style = document.createElement('style');
    style.id = 'lesson-custom-theme';
    style.textContent = customCSS;
    document.head.appendChild(style);
  }
})();
