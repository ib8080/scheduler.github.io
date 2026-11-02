/* learn.js — экран «Обучение»: 12 ступеней курса «Свой ежедневник».
   Сами уроки живут отдельными страницами в папке lessons/, здесь — карточки,
   прогресс и модалка с тремя действиями. */
(function (App) {
  'use strict';

  const { XP_FOR_LESSON_STEP } = App.config;
  const { escapeHtml } = App.utils;

  const LESSONS = [
    {
      month: 1, track: 'HTML', title: 'Каркас из тегов',
      file: 'lessons/lesson-01.html',
      tagline: 'Браузер читает разметку, а не красоту. Соберём скелет ежедневника: заголовок, список дел и поле для заметок.',
      topics: ['теги и вложенность', 'структура страницы', 'чекбоксы и кнопки'],
      outcome: 'Статичная страница: шапка, список из пяти дел, нижнее меню.'
    },
    {
      month: 2, track: 'CSS', title: 'Цвет, отступы, телефон',
      file: 'lessons/lesson-02.html',
      tagline: 'Скелет превращается в интерфейс: цвет, шрифт, отступы и первый мобильный вид без горизонтальной прокрутки. Плюс тема на CSS-переменных.',
      topics: ['селекторы и каскад', 'box model', 'CSS-переменные и темы', 'media queries'],
      outcome: 'Карточки с отступами, липкая навигация, удобный вид на 360px и переключение темы.'
    },
    {
      month: 3, track: 'CSS', title: 'Сетка и состояния',
      file: 'lessons/lesson-03.html',
      tagline: 'Карточек много, и они спорят за место. Grid расставит их сам, а классы-состояния покажут, что выполнено, активно или просрочено.',
      topics: ['CSS Grid и minmax', 'переполнение и flex-wrap', 'классы done, active и overdue'],
      outcome: 'Дашборд 1–2 колонки, зачёркнутая задача, активная вкладка и красная просрочка цели.'
    },
    {
      month: 4, track: 'JavaScript', title: 'Оживи список',
      file: 'lessons/lesson-04.html',
      tagline: 'Первый настоящий код: находим элементы, слушаем клики и меняем страницу без перезагрузки.',
      topics: ['переменные и функции', 'DOM и createElement', 'события click и Enter'],
      outcome: 'Добавление, отметка и удаление задач — пока только в памяти.'
    },
    {
      month: 5, track: 'JavaScript', title: 'Память браузера и бэкап',
      file: 'lessons/lesson-05.html',
      tagline: 'Закрыл вкладку — открыл, а задачи на месте. localStorage, JSON, экспорт и импорт резервной копии, защита от битых данных.',
      topics: ['состояние и JSON', 'save и load', 'экспорт и импорт', 'проверка файла'],
      outcome: 'После перезагрузки на месте задачи, а резервная копия восстанавливается из JSON-файла.'
    },
    {
      month: 6, track: 'JavaScript', title: 'Неделя и расписание',
      file: 'lessons/lesson-06.html',
      tagline: 'Даты, которые не путаются: ключ YYYY-MM-DD, расписание по дню недели и внеплановые задачи на конкретный день.',
      topics: ['Date и ключ даты', 'расписание по дням', 'сортировка по времени'],
      outcome: 'Вкладка «Неделя», блок «Расписание на день», архивный день.'
    },
    {
      month: 7, track: 'Архитектура', title: 'Файлы, модули и опыт',
      file: 'lessons/lesson-07.html',
      tagline: 'Один файл на 800 строк — это боль. Раскладываем код по полочкам, выносим настройки и добавляем опыт, уровни и серию дней.',
      topics: ['модули и window.App', 'порядок подключения', 'XP и серия дней', 'модуль настроек'],
      outcome: 'Структура из 15+ файлов, полоса опыта в шапке и отдельный модуль настроек.'
    },
    {
      month: 8, track: 'Логика', title: 'Матрица Эйзенхауэра',
      file: 'lessons/lesson-08.html',
      tagline: 'Срочно и важно — не одно и то же. Четыре квадранта сами выдают задаче приоритет и опыт.',
      topics: ['4 квадранта', 'данные по ключам', 'переиспользование компонентов'],
      outcome: 'Блок матрицы: q1 — высокий, q2 — средний, q3/q4 — низкий.'
    },
    {
      month: 9, track: 'Формы', title: 'Итоги месяца',
      file: 'lessons/lesson-09.html',
      tagline: 'Раз в месяц — остановиться и посмотреть назад. Форма, история и правка задним числом.',
      topics: ['textarea и select', 'одна запись на месяц', 'история и редактирование'],
      outcome: 'Вкладка «Итоги» с пятью полями и полной историей.'
    },
    {
      month: 10, track: 'Цели', title: 'Цели по SMART',
      file: 'lessons/lesson-10.html',
      tagline: '«Хочу учиться лучше» — пожелание. Превращаем в цель со сроком, критерием и приоритетом, а ещё показываем, сколько до срока осталось.',
      topics: ['5 критериев SMART', 'сколько осталось до срока', 'просрочка красным', 'связь с итогами'],
      outcome: 'Вкладка «Цели», блок на главной, обратный отсчёт, красная просрочка, +60 XP и строка в итогах.'
    },
    {
      month: 11, track: 'Таймеры', title: 'Помодоро и таймеры',
      file: 'lessons/lesson-11.html',
      tagline: '25 минут работы и 5 отдыха. Учимся хранить не счётчик, а время окончания — чтобы таймер не врал. А «Сброс» возвращает в режим задачи.',
      topics: ['setInterval и Date.now', 'метка endAt', 'пауза, сброс и звук'],
      outcome: 'Помодоро, живущий после перезагрузки, сброс в режим задачи и звук окончания.'
    },
    {
      month: 12, track: 'Финал', title: 'Полировка и защита',
      file: 'lessons/lesson-12.html',
      tagline: 'Темы, бэкап, установка, крайние случаи и пятиминутная защита проекта. Самая недооценённая часть работы.',
      topics: ['темы и CSS-переменные', 'экспорт и импорт', 'установка и офлайн', 'доступность и отладка'],
      outcome: 'Готовый проект по чек-листу, с бэкапом, установкой на телефон и уверенной защитой.'
    }
  ];

  function isDone(month) {
    return Boolean(App.state.stepsProgress[month]);
  }

  function doneCount() {
    return LESSONS.filter(lesson => isDone(lesson.month)).length;
  }

  // ===== Список ступеней =====

  function render() {
    renderProgress();
    renderList();
  }

  function renderProgress() {
    const box = document.getElementById('learn-progress');
    if (!box) return;

    const done = doneCount();
    const percent = Math.round((done / LESSONS.length) * 100);

    box.innerHTML = `
      <div class="learn-progress-row">
        <span class="learn-progress-label">Пройдено ${done} из ${LESSONS.length}</span>
        <span class="learn-progress-xp">${done * XP_FOR_LESSON_STEP} XP</span>
      </div>
      <div class="learn-progress-track"><div class="learn-progress-fill" style="width: ${percent}%"></div></div>
    `;
  }

  function renderList() {
    const list = document.getElementById('steps-list');
    if (!list) return;
    list.innerHTML = '';

    LESSONS.forEach(lesson => {
      const done = isDone(lesson.month);

      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'step-card' + (done ? ' done' : '');
      card.dataset.month = lesson.month;
      card.innerHTML = `
        <span class="step-card-main">
          <span class="month-badge">Месяц ${lesson.month} · ${escapeHtml(lesson.track)}</span>
          <span class="step-card-title">${escapeHtml(lesson.title)}</span>
          <span class="step-desc">${escapeHtml(lesson.tagline)}</span>
          <span class="step-topics">${lesson.topics.map(topic => escapeHtml(topic)).join(' · ')}</span>
        </span>
        <span class="step-card-side">
          ${done
            ? '<span class="step-status done">✓ Пройдено</span>'
            : `<span class="step-status">+${XP_FOR_LESSON_STEP} XP</span>`}
          <span class="step-open">${done ? 'Повторить' : 'Открыть'} →</span>
        </span>
      `;
      card.addEventListener('click', () => openLesson(lesson));
      list.appendChild(card);
    });
  }

  // ===== Модалка урока: описание + 3 действия =====

  function openLesson(lesson) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content lesson-modal">
        <span class="month-badge">Месяц ${lesson.month} · ${escapeHtml(lesson.track)}</span>
        <h2>${escapeHtml(lesson.title)}</h2>
        <p class="lesson-tagline">${escapeHtml(lesson.tagline)}</p>
        <ul class="lesson-topics">
          ${lesson.topics.map(topic => `<li>${escapeHtml(topic)}</li>`).join('')}
        </ul>
        <p class="lesson-outcome"><strong>Что получится:</strong> ${escapeHtml(lesson.outcome)}</p>
        <div class="lesson-actions">
          <a class="primary-btn lesson-open" href="${lesson.file}" target="_blank" rel="noopener">Открыть интерактивный урок</a>
          <button type="button" class="secondary-btn lesson-toggle"></button>
          <button type="button" class="secondary-btn lesson-back">Назад</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const toggle = modal.querySelector('.lesson-toggle');

    function syncToggle() {
      const done = isDone(lesson.month);
      toggle.textContent = done
        ? 'Снять отметку «выполнено»'
        : `Отметить выполненным (+${XP_FOR_LESSON_STEP} XP)`;
      toggle.classList.toggle('done', done);
    }
    syncToggle();

    toggle.addEventListener('click', () => {
      if (isDone(lesson.month)) {
        App.state.stepsProgress[lesson.month] = false;
        App.xp.addXP(-XP_FOR_LESSON_STEP);
      } else {
        App.state.stepsProgress[lesson.month] = true;
        App.xp.addXP(XP_FOR_LESSON_STEP);
      }
      render();
      syncToggle();
    });

    modal.querySelector('.lesson-back').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (event) => {
      if (event.target === modal) modal.remove();
    });
  }

  App.screens = App.screens || {};
  App.screens.learn = { render, openLesson, LESSONS };
})(window.App = window.App || {});
