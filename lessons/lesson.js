/* lesson.js — общий движок интерактивных уроков курса «Свой ежедневник».
   Урок = данные (title, intro, steps) + этот файл. Типы шагов:
   theory (текст), quiz (вопросы с вариантами), playground (живой редактор),
   checklist (отметки «я сделал»). Прогресс хранится в localStorage урока. */
(function (global) {
  'use strict';

  const root = document.getElementById('app');
  const bar = document.getElementById('bar');
  const stars = document.getElementById('stars');

  let data = null;
  let state = null;
  let storageKey = '';

  // ===== Утилиты =====

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      /* приватный режим — просто не сохраняем */
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  // Сравнение кода без лишних пробелов: display:grid == display: grid
  function normalizeCode(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/\s*([:;{}(),<>=\[\]])\s*/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function maxPoints() {
    return data.steps.reduce((sum, step) => {
      if (step.type === 'quiz') {
        return sum + step.questions.length * (step.boss ? 15 : 10);
      }
      if (step.type === 'playground' || step.type === 'checklist') return sum + 10;
      return sum;
    }, 0);
  }

  function rank() {
    const total = maxPoints() || 1;
    const share = state.points / total;
    if (share >= 0.9) return { emoji: '🧠', name: 'Гуру урока' };
    if (share >= 0.7) return { emoji: '🛠️', name: 'Мастер' };
    if (share >= 0.45) return { emoji: '📘', name: 'Ученик' };
    return { emoji: '🌱', name: 'Новичок' };
  }

  // ===== Каркас страницы =====

  function updateChrome() {
    const total = data.steps.length;
    let progress = 0;
    if (state.screen === 'finish') progress = 1;
    else if (state.screen !== 'intro') progress = (state.index + 1) / total;

    bar.style.width = Math.round(progress * 100) + '%';
    stars.textContent = '⭐ ' + state.points;
  }

  function paint() {
    updateChrome();
    if (state.screen === 'intro') paintIntro();
    else if (state.screen === 'finish') paintFinish();
    else paintStep();
    window.scrollTo(0, 0);
  }

  // ===== Стартовый экран =====

  function paintIntro() {
    const started = state.index > 0 || state.points > 0;
    root.innerHTML = `
      <section class="intro card">
        <div class="chip">Месяц ${data.month} · ${escapeHtml(data.track)}</div>
        <div class="intro-emoji">${data.emoji || '🎯'}</div>
        <h1>${escapeHtml(data.title)}</h1>
        <p class="mission">${data.intro}</p>
        <ul class="learn-list">
          ${(data.whatYouLearn || []).map(item => `<li>${item}</li>`).join('')}
        </ul>
        <button class="btn primary" id="start" type="button">${started ? 'Продолжить урок' : 'Начать урок'}</button>
        <p class="tiny">10–15 минут · прогресс сохраняется в браузере</p>
        ${data.next ? `<p class="tiny">После урока — <a href="${escapeHtml(data.next)}">следующая ступень</a></p>` : ''}
      </section>
    `;

    root.querySelector('#start').addEventListener('click', () => {
      state.screen = 'step';
      save();
      paint();
    });
  }

  // ===== Шаг =====

  function paintStep() {
    const step = data.steps[state.index];
    const last = state.index === data.steps.length - 1;

    if (step.type === 'theory') state.done[state.index] = true;

    root.innerHTML = `
      <section class="step">
        <div class="step-top">
          <span class="step-num">Шаг ${state.index + 1} из ${data.steps.length}</span>
          ${step.tag ? `<span class="chip small">${escapeHtml(step.tag)}</span>` : ''}
        </div>
        ${step.title ? `<h2>${escapeHtml(step.title)}</h2>` : ''}
        <div id="step-body" class="step-body"></div>
        <div class="step-actions">
          <button class="btn ghost" id="prev" type="button" ${state.index === 0 ? 'disabled' : ''}>Назад</button>
          <button class="btn primary" id="next" type="button">${last ? 'Финиш' : 'Дальше'}</button>
        </div>
      </section>
    `;

    const body = root.querySelector('#step-body');
    if (step.type === 'theory') paintTheory(step, body);
    else if (step.type === 'quiz') paintQuiz(step, body);
    else if (step.type === 'playground') paintPlayground(step, body);
    else if (step.type === 'checklist') paintChecklist(step, body);

    const nextBtn = root.querySelector('#next');
    nextBtn.disabled = !state.done[state.index];

    root.querySelector('#prev').addEventListener('click', () => {
      if (state.index === 0) return;
      state.index -= 1;
      save();
      paint();
    });

    nextBtn.addEventListener('click', () => {
      if (state.index >= data.steps.length - 1) {
        state.screen = 'finish';
        save();
        paint();
        return;
      }
      state.index += 1;
      save();
      paint();
    });
  }

  // ===== Текст =====

  function paintTheory(step, body) {
    body.innerHTML = `
      ${step.html || ''}
      ${step.code ? `<pre class="code"><code>${escapeHtml(step.code)}</code></pre>` : ''}
      ${step.tip ? `<p class="tip">💡 ${step.tip}</p>` : ''}
    `;
  }

  // ===== Квиз =====

  function paintQuiz(step, body) {
    body.innerHTML = `
      ${step.intro ? `<p class="lead">${step.intro}</p>` : ''}
      <div class="questions">
        ${step.questions.map((question, qi) => `
          <div class="question" data-q="${qi}">
            <p class="q-text">${question.text}</p>
            ${question.code ? `<pre class="code"><code>${escapeHtml(question.code)}</code></pre>` : ''}
            <div class="options">
              ${question.options.map((option, oi) => `
                <button type="button" class="option" data-q="${qi}" data-o="${oi}">${escapeHtml(option)}</button>
              `).join('')}
            </div>
            <p class="explain" hidden></p>
          </div>
        `).join('')}
      </div>
    `;

    if (!state.answered[state.index]) state.answered[state.index] = [];

    body.querySelectorAll('.question').forEach((questionEl, qi) => {
      const question = step.questions[qi];
      const buttons = questionEl.querySelectorAll('.option');
      const explain = questionEl.querySelector('.explain');
      const chosen = state.answered[state.index][qi];

      if (chosen !== undefined && chosen !== null) {
        showAnswer(questionEl, question, chosen, explain, buttons);
      }

      buttons.forEach(button => {
        button.addEventListener('click', () => {
          const answers = state.answered[state.index];
          if (answers[qi] !== undefined && answers[qi] !== null) return;

          const choice = Number(button.dataset.o);
          answers[qi] = choice;
          const correct = choice === question.answer;
          if (correct) state.points += step.boss ? 15 : 10;

          showAnswer(questionEl, question, choice, explain, buttons);

          state.done[state.index] = step.questions.every((item, index) => {
            const value = answers[index];
            return value !== undefined && value !== null;
          });

          save();
          updateChrome();
          root.querySelector('#next').disabled = !state.done[state.index];
        });
      });
    });
  }

  function showAnswer(questionEl, question, choice, explain, buttons) {
    questionEl.classList.add('answered');
    buttons.forEach(button => {
      const index = Number(button.dataset.o);
      button.disabled = true;
      if (index === question.answer) button.classList.add('correct');
      if (index === choice && index !== question.answer) button.classList.add('wrong');
      if (index === choice) button.classList.add('chosen');
    });
    if (question.explain) {
      explain.hidden = false;
      explain.textContent = (choice === question.answer ? '✅ Верно! ' : '❌ Не совсем. ') + question.explain;
    }
  }

  // ===== Живой редактор =====

  const LOGGER = `<script>
(function () {
  function send(type, text) {
    try { parent.postMessage({ __lesson: true, type: type, text: String(text) }, '*'); } catch (e) {}
  }
  console.log = function () { send('log', Array.prototype.map.call(arguments, function (v) {
    if (v === null) return 'null';
    if (typeof v === 'object') { try { return JSON.stringify(v); } catch (e) { return String(v); } }
    return String(v);
  }).join(' ')); };
  window.addEventListener('error', function (event) { send('error', 'Ошибка: ' + event.message); });
})();
<\/script>`;

  function buildDoc(code) {
    return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<style>body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:12px;color:#0f172a;font-size:15px;line-height:1.5}
h1{font-size:1.4rem}h2{font-size:1.15rem}button{font:inherit;padding:8px 12px;border-radius:8px;border:1px solid #cbd5e1;background:#f8fafc;cursor:pointer}
ul{padding-left:20px}pre{white-space:pre-wrap}</style>
</head><body>${LOGGER}${code}</body></html>`;
  }

  function paintPlayground(step, body) {
    const code = state.codes[state.index] || step.start || '';
    body.innerHTML = `
      ${step.intro ? `<p class="lead">${step.intro}</p>` : ''}
      <div class="task-box"><strong>Задание.</strong> ${step.task}</div>
      <div class="editor">
        <div class="editor-bar">
          <span>Твой код</span>
          <span class="editor-btns">
            <button class="mini" id="reset" type="button">Сбросить</button>
            <button class="mini" id="run" type="button">▶ Запустить</button>
          </span>
        </div>
        <textarea id="code" spellcheck="false" autocapitalize="off" autocorrect="off"></textarea>
      </div>
      <div class="preview">
        <div class="editor-bar"><span>Результат</span><span class="tiny">по кнопке «Запустить»</span></div>
        <iframe id="frame" sandbox="allow-scripts" title="Результат твоего кода"></iframe>
      </div>
      <div class="console" id="console-panel" hidden>
        <div class="editor-bar"><span>Консоль</span></div>
        <pre id="console-out"></pre>
      </div>
      <div class="play-actions">
        <button class="btn primary" id="check" type="button">Проверить задание</button>
        ${step.hint ? '<button class="btn ghost" id="hint" type="button">Подсказка</button>' : ''}
      </div>
      <p class="hint-text" id="hint-text" hidden></p>
      <p class="verdict" id="verdict"></p>
    `;

    const textarea = body.querySelector('#code');
    const frame = body.querySelector('#frame');
    const consolePanel = body.querySelector('#console-panel');
    const consoleOut = body.querySelector('#console-out');
    const verdict = body.querySelector('#verdict');
    const nextBtn = root.querySelector('#next');

    textarea.value = code;
    textarea.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        event.preventDefault();
        const start = textarea.selectionStart;
        textarea.value = textarea.value.slice(0, start) + '  ' + textarea.value.slice(textarea.selectionEnd);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        run();
      }
    });

    function run() {
      state.codes[state.index] = textarea.value;
      save();
      consoleOut.textContent = '';
      consolePanel.hidden = true;
      frame.srcdoc = buildDoc(textarea.value);
    }

    body.querySelector('#run').addEventListener('click', run);
    body.querySelector('#reset').addEventListener('click', () => {
      textarea.value = step.start || '';
      state.codes[state.index] = textarea.value;
      save();
      run();
      verdict.textContent = '';
    });

    const hintButton = body.querySelector('#hint');
    if (hintButton) {
      hintButton.addEventListener('click', () => {
        const hintText = body.querySelector('#hint-text');
        hintText.hidden = false;
        hintText.innerHTML = '💡 ' + step.hint;
      });
    }

    body.querySelector('#check').addEventListener('click', () => {
      state.codes[state.index] = textarea.value;
      const normalized = normalizeCode(textarea.value);
      const required = step.check || [];
      const missing = required.filter(snippet => !normalized.includes(normalizeCode(snippet)));

      if (missing.length) {
        verdict.className = 'verdict bad';
        verdict.textContent = 'Пока не хватает: ' + missing.join(', ') + '. Посмотри подсказку и попробуй снова.';
        save();
        return;
      }

      verdict.className = 'verdict good';
      verdict.textContent = step.success || 'Отлично! Задание засчитано.';
      if (!state.done[state.index]) {
        state.done[state.index] = true;
        state.points += 10;
      }
      nextBtn.disabled = false;
      save();
      updateChrome();
      run();
    });

    run();
  }

  // ===== Чек-лист =====

  function paintChecklist(step, body) {
    if (!state.checked[state.index]) state.checked[state.index] = step.items.map(() => false);
    const checked = state.checked[state.index];

    body.innerHTML = `
      ${step.intro ? `<p class="lead">${step.intro}</p>` : ''}
      <div class="checklist">
        ${step.items.map((item, index) => `
          <label class="check-item">
            <input type="checkbox" data-i="${index}" ${checked[index] ? 'checked' : ''}>
            <span>${item}</span>
          </label>
        `).join('')}
      </div>
      <p class="tiny" id="check-progress"></p>
    `;

    const inputs = body.querySelectorAll('input[type="checkbox"]');
    const progress = body.querySelector('#check-progress');
    const nextBtn = root.querySelector('#next');

    function refresh() {
      const doneCount = checked.filter(Boolean).length;
      progress.textContent = `Отмечено ${doneCount} из ${checked.length}`;
      if (doneCount === checked.length && !state.done[state.index]) {
        state.done[state.index] = true;
        state.points += 10;
        nextBtn.disabled = false;
        updateChrome();
      }
      save();
    }

    inputs.forEach((input, index) => {
      input.addEventListener('change', () => {
        checked[index] = input.checked;
        refresh();
      });
    });

    refresh();
  }

  // ===== Финиш =====

  function paintFinish() {
    const total = maxPoints();
    const current = rank();
    const perfect = state.points >= total;

    root.innerHTML = `
      <section class="finish card">
        <div class="badge ${perfect ? 'perfect' : ''}">${perfect ? '🏆' : '🎉'}</div>
        <h1>${perfect ? 'Идеально пройдено!' : 'Урок пройден!'}</h1>
        <p class="finish-score">${state.points} из ${total} звёзд</p>
        <p class="finish-rank">Твой ранг: <strong>${current.emoji} ${current.name}</strong></p>
        <div class="finish-actions">
          <a class="btn primary" href="../index.html">Вернуться в ежедневник</a>
          ${data.next ? `<a class="btn ghost" href="${escapeHtml(data.next)}">Следующий урок →</a>` : ''}
        </div>
        <p class="tiny">Не забудь отметить урок выполненным в ежедневнике: во вкладке «Обучение» нажми на карточку месяца и выбери «Отметить выполненным» — за это дают 100 XP.</p>
        <button class="linklike" id="again" type="button">Пройти заново</button>
      </section>
    `;

    root.querySelector('#again').addEventListener('click', () => {
      try {
        localStorage.removeItem(storageKey);
      } catch (error) {
        /* ничего */
      }
      state = {
        screen: 'intro',
        index: 0,
        points: 0,
        done: {},
        answered: {},
        checked: {},
        codes: {}
      };
      paint();
    });
  }

  // ===== Запуск =====

  function render(lesson) {
    data = lesson;
    storageKey = 'lesson_progress_v1_' + data.month;

    const saved = load();
    state = saved && typeof saved === 'object'
      ? saved
      : { screen: 'intro', index: 0, points: 0, done: {}, answered: {}, checked: {}, codes: {} };

    state.done = state.done || {};
    state.answered = state.answered || {};
    state.checked = state.checked || {};
    state.codes = state.codes || {};

    if (state.screen !== 'intro' && state.screen !== 'finish' && !data.steps[state.index]) {
      state.screen = 'intro';
      state.index = 0;
    }

    document.title = `Месяц ${data.month}: ${data.title} — интерактивный урок`;
    paint();
  }

  global.addEventListener('message', (event) => {
    const message = event.data;
    if (!message || message.__lesson !== true) return;
    const panel = document.getElementById('console-panel');
    const out = document.getElementById('console-out');
    if (!panel || !out) return;
    panel.hidden = false;
    out.textContent += (out.textContent ? '\n' : '') + message.text;
  });

  global.Lesson = { render };
})(window);
