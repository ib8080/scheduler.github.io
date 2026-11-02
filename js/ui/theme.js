/* theme.js — светлая, тёмная и своя тема из вставленного CSS.
   Тема хранится в состоянии и применяется атрибутом data-theme на <html>.
   Своя тема подключается отдельным <style>, который выключается при смене темы. */
(function (App) {
  'use strict';

  const MODES = App.config.THEME_MODES;
  const DEFAULTS = App.config.DEFAULT_THEME;

  function get() {
    if (!App.state.theme || typeof App.state.theme !== 'object') {
      App.state.theme = { ...DEFAULTS };
    }
    const theme = App.state.theme;
    if (!MODES.includes(theme.mode)) theme.mode = 'light';
    if (typeof theme.customName !== 'string') theme.customName = '';
    if (typeof theme.customCSS !== 'string') theme.customCSS = '';
    return theme;
  }

  function customStyleElement() {
    let el = document.getElementById('custom-theme-style');
    if (!el) {
      el = document.createElement('style');
      el.id = 'custom-theme-style';
      document.head.appendChild(el);
    }
    return el;
  }

  function injectCustom(css, active) {
    const el = customStyleElement();
    const text = typeof css === 'string' ? css : '';
    if (el.textContent !== text) el.textContent = text;
    // выключенная своя тема не должна перебивать светлую/тёмную
    el.disabled = !active;
  }

  function apply(mode, options) {
    const opts = options || {};
    const theme = get();
    let next = MODES.includes(mode) ? mode : 'light';
    if (next === 'custom' && !theme.customCSS.trim()) next = 'light';

    theme.mode = next;
    const root = document.documentElement;
    root.dataset.theme = next;
    root.style.colorScheme = next === 'dark' ? 'dark' : 'light';
    injectCustom(theme.customCSS, next === 'custom');

    if (opts.save !== false) App.save();
    return next;
  }

  function saveCustom(name, css) {
    const theme = get();
    const cleanName = String(name || '').trim().slice(0, 40);
    theme.customName = cleanName || 'Своя тема';
    theme.customCSS = String(css || '');
    return apply('custom');
  }

  function removeCustom() {
    const theme = get();
    theme.customCSS = '';
    theme.customName = '';
    const el = document.getElementById('custom-theme-style');
    if (el) el.textContent = '';
    if (theme.mode === 'custom') apply('light');
    else App.save();
  }

  function label(mode) {
    const theme = get();
    if (mode === 'dark') return 'Тёмная';
    if (mode === 'custom') return theme.customName.trim() || 'Своя тема';
    return 'Светлая';
  }

  App.ui = App.ui || {};
  App.ui.theme = { get, apply, saveCustom, removeCustom, label };

  // Применяем сразу при загрузке скрипта — до первой отрисовки, чтобы не мигало
  apply(get().mode, { save: false });
})(window.App = window.App || {});
