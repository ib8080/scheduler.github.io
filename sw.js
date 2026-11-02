/* sw.js — офлайн-режим для установленного ежедневника.
   При изменении файлов приложения меняйте CACHE_VERSION, чтобы телефон
   подхватил новую версию (старый кеш удалится при активации). */
const CACHE_VERSION = 'planner-2026-11-02-4';
const CACHE_NAME = CACHE_VERSION;

const APP_SHELL = [
  './index.html',
  './css-classes.html',
  './manifest.webmanifest',
  './css/base.css',
  './css/dashboard.css',
  './css/goals.css',
  './css/learn.css',
  './css/matrix.css',
  './css/modals.css',
  './css/notes.css',
  './css/pomodoro.css',
  './css/review.css',
  './css/schedule.css',
  './css/settings.css',
  './css/tasks.css',
  './css/themes.css',
  './css/timer-alert.css',
  './css/week.css',
  './js/app.js',
  './js/config.js',
  './js/ui/block-picker.js',
  './js/ui/goal-picker.js',
  './js/ui/header.js',
  './js/ui/navigation.js',
  './js/ui/overlay-guard.js',
  './js/ui/settings.js',
  './js/ui/task-controls.js',
  './js/ui/theme.js',
  './js/ui/timer-alert.js',
  './js/screens/dashboard.js',
  './js/screens/goals.js',
  './js/screens/learn.js',
  './js/screens/review.js',
  './js/screens/week.js',
  './js/core/gamification.js',
  './js/core/goals.js',
  './js/core/pomodoro.js',
  './js/core/pwa.js',
  './js/core/sound.js',
  './js/core/sounds.js',
  './js/core/state.js',
  './js/core/storage.js',
  './js/core/utils.js',
  './js/blocks/goals-block.js',
  './js/blocks/matrix-block.js',
  './js/blocks/notes-block.js',
  './js/blocks/pomodoro-block.js',
  './js/blocks/registry.js',
  './js/blocks/schedule-block.js',
  './js/blocks/todo-block.js',
  './lessons/lesson-01.html',
  './lessons/lesson-02.html',
  './lessons/lesson-03.html',
  './lessons/lesson-04.html',
  './lessons/lesson-05.html',
  './lessons/lesson-06.html',
  './lessons/lesson-07.html',
  './lessons/lesson-08.html',
  './lessons/lesson-09.html',
  './lessons/lesson-10.html',
  './lessons/lesson-11.html',
  './lessons/lesson-12.html',
  './lessons/lesson.css',
  './lessons/lesson.js',
  './lessons/lesson-theme.js',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Страницы: сначала сеть (чтобы подхватывать обновления), офлайн — из кеша
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // Файлы приложения: отдаём из кеша и потихоньку обновляем
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
