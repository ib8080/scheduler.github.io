/* pwa.js — установка на телефон и офлайн-режим.
   Service worker и установка работают только в «безопасном контексте»:
   https:// или http://localhost. По обычному http:// с IP адреса телефона
   браузер их отключит — это ограничение браузеров, а не приложения. */
(function (App) {
  'use strict';

  const SW_URL = 'sw.js';

  const state = {
    deferredPrompt: null,
    registration: null,
    installed: isStandalone(),
    offlineReady: false,
    error: ''
  };

  function isStandalone() {
    try {
      return window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
    } catch (e) {
      return false;
    }
  }

  function isSecure() {
    const host = window.location.hostname;
    return window.location.protocol === 'https:'
      || host === 'localhost'
      || host === '127.0.0.1'
      || host === '[::1]';
  }

  function canRegister() {
    return typeof navigator !== 'undefined'
      && 'serviceWorker' in navigator
      && isSecure();
  }

  function canPrompt() {
    return Boolean(state.deferredPrompt);
  }

  function watch(registration) {
    const update = () => {
      if (registration.active || navigator.serviceWorker.controller) state.offlineReady = true;
    };
    update();
    if (registration.installing) registration.installing.addEventListener('statechange', update);
    if (registration.waiting) registration.waiting.addEventListener('statechange', update);
  }

  function register() {
    if (!canRegister()) return Promise.resolve(null);
    return navigator.serviceWorker.register(SW_URL)
      .then((registration) => {
        state.registration = registration;
        watch(registration);
        return registration;
      })
      .catch((error) => {
        state.error = String((error && error.message) || error);
        return null;
      });
  }

  function promptInstall() {
    const event = state.deferredPrompt;
    if (!event) return Promise.resolve('unavailable');
    state.deferredPrompt = null;
    try { event.prompt(); } catch (e) { return Promise.resolve('unavailable'); }
    const choice = event.userChoice;
    return choice ? choice.then(() => 'done').catch(() => 'done') : Promise.resolve('done');
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.deferredPrompt = event;
  });

  window.addEventListener('appinstalled', () => {
    state.installed = true;
    state.deferredPrompt = null;
  });

  App.pwa = {
    isStandalone,
    isSecure,
    canRegister,
    canPrompt,
    register,
    promptInstall,
    get installed() { return state.installed || isStandalone(); },
    get offlineReady() { return state.offlineReady; },
    get error() { return state.error; },
    get state() { return state; }
  };
})(window.App = window.App || {});
