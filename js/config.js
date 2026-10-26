/* config.js — константы, значения по умолчанию и справочники приложения.
   Всё, что может понадобиться при масштабировании, живёт здесь. */
(function (App) {
  'use strict';

  const STORAGE_KEY = 'school_planner_v3';

  // ===== Задачи: приоритеты и опыт =====
  const PRIORITIES = ['high', 'medium', 'low'];
  const PRIORITY_ICONS = { high: '🔴', medium: '🟡', low: '🟢' };
  const PRIORITY_TITLES = { high: 'Высокий', medium: 'Средний', low: 'Низкий' };
  const PRIORITY_CYCLE = { high: 'medium', medium: 'low', low: 'high' };
  const DEFAULT_PRIORITY = 'high';

  // Разный опыт за разный приоритет
  const XP_BY_PRIORITY = { high: 15, medium: 10, low: 5 };
  const XP_PER_LEVEL = 100;
  const XP_FOR_LESSON_STEP = 100;
  const XP_FOR_MONTH_REVIEW = 20;

  // За цель даём заметно больше опыта, чем за задачу
  const XP_BY_GOAL_PRIORITY = { high: 60, medium: 45, low: 30 };

  // Задача помодоро — вспомогательная, поэтому опыта меньше, чем за обычную задачу
  const XP_PER_POMODORO_TASK = 5;

  // Отнимать ли опыт при удалении уже выполненной задачи (список, матрица, расписание).
  // false — удаление бесплатное; true — начисленный опыт снимается.
  // Удаление задач помодоро опыт не снимает никогда.
  const XP_PENALTY_ON_TASK_DELETE = false;

  // ===== Матрица Эйзенхауэра =====
  // Приоритет задачи задаётся категорией (квадрантом), вручную не меняется.
  const QUADRANTS = [
    { key: 'q1', cls: 'quad-q1', label: '🔴 Срочно и важно', priority: 'high' },
    { key: 'q2', cls: 'quad-q2', label: '🟡 Важно, не срочно', priority: 'medium' },
    { key: 'q3', cls: 'quad-q3', label: '🔵 Срочно, не важно', priority: 'low' },
    { key: 'q4', cls: 'quad-q4', label: '⚪ Не срочно, не важно', priority: 'low' }
  ];

  // ===== Цели: критерии SMART =====
  const GOAL_SMART_FIELDS = [
    { key: 'specific', letter: 'S', title: 'Конкретная', hint: 'Что именно я сделаю?' },
    { key: 'measurable', letter: 'M', title: 'Измеримая', hint: 'Как пойму, что цель достигнута?' },
    { key: 'achievable', letter: 'A', title: 'Достижимая', hint: 'Что у меня уже есть для этого?' },
    { key: 'relevant', letter: 'R', title: 'Значимая', hint: 'Зачем мне эта цель?' },
    { key: 'timeBound', letter: 'T', title: 'Ограниченная сроком', hint: 'К какому сроку?' }
  ];

  // ===== Помодоро =====
  const POMODORO_DEFAULTS = { work: 25, break: 5 };

  const POMODORO_MESSAGES = {
    start: [
      'Погнали! Таймер запущен — и ты вместе с ним.',
      '25 минут. Телефон в сторону.',
      'Одна задача. Ничего больше.',
      'Время работает на тебя, не наоборот.',
      'Начал — уже молодец. Держи темп.',
      'Работаем. Потом будет чем гордиться.',
      'Один помидор — один шаг вперёд.',
      'Сконцентрируйся: мир подождёт 25 минут.'
    ],
    pause: [
      'Пауза — тоже часть работы.',
      'Передохни и возвращайся.',
      'Иногда сбавить темп — самое мудрое решение.',
      'Сохранил силы — значит не потратил их зря.',
      'Пауза не отменяет прогресс.'
    ],
    stop: [
      'Остановился. Главное — вернуться.',
      'Работа подождёт, но не забудет.',
      'Сброс — не поражение. Запустишь заново.',
      'Стоп — это тоже решение. Продолжим позже.',
      'Не страшно остановиться, страшно не вернуться.'
    ],
    workDone: [
      'Сессия закрыта! Заслуженный перерыв.',
      'Красавчик. Мозгу нужен воздух.',
      'Работа сделана — отдохни как следует.',
      'Сессия позади. Ты справился.',
      'Мозгу нужен воздух — и ему, и тебе.'
    ],
    breakDone: [
      'Отдохнул? Возвращайся к делу.',
      'Перерыв закончился, таймер ждёт.',
      'Новый подход — новые силы.',
      'Ещё один заход — и дело готово.',
      'Размялся? Тогда продолжим.'
    ],
    taskDone: [
      'Задача закрыта. Ещё одну?',
      'Плюс опыт. Плюс спокойствие.',
      'Галочка есть — двигаемся дальше.'
    ]
  };

  // ===== Подсказки на главной (как сплэши в Minecraft) =====
  const SPLASHES = [
    'Сделай сначала самое неприятное',
    'Маленькие шаги тоже шаги',
    'Пять минут — это уже начало',
    'Записал — значит не забыл',
    'Одна задача за раз',
    'Отдых тоже часть плана',
    'Не идеально, а готово',
    'Сегодняшний ты поблагодарит вчерашнего',
    'Отложенное копится',
    'Дыши. Потом делай',
    'План без действия — мечта',
    'Двадцать пять минут и минута гордости',
    'Ставь цели по SMART',
    'Не сравнивай себя с другими',
    'Тетрадь надёжнее памяти',
    'Начни с двух минут',
    'Список дел не кусается',
    'Опыт капает за каждую галочку',
    'Цель без даты — пожелание',
    'У тебя есть план. Просто начни',
    'Устал — отдохни, а не сдавайся',
    'Хвали себя за мелочи',
    'Сложное дели на части',
    'Сегодня — лучший день начать',
    'Сначала начать, потом улучшать',
    'Список короче — голова светлее',
    'Половина пути — это уже путь',
    'Сделай один маленький шаг сейчас',
    'Не жди настроения — оно догонит',
    'Твой темп важнее чужого рекорда',
    'Вычеркни — и станет легче',
    'Ошибка — это тоже данные',
    'Лучше сорок минут, чем ноль',
    'Учись, пока интересно',
    'Порядок в делах — порядок в голове',
    'Таймер не судья, он помощник',
    'Помни: перерыв тоже задача',
    'Сегодня хотя бы одна галочка',
    'Не бойся начать с черновика',
    'Скучная задача тоже ведёт к цели',
    'Ты уже ближе, чем вчера',
    'Делай проще, чем кажется',
    'Сравнивай себя с собой вчерашним'
  ];

  // ===== Календарь =====
  const DAYS_OF_WEEK = [
    { key: 'mon', label: 'Понедельник', short: 'Пн' },
    { key: 'tue', label: 'Вторник', short: 'Вт' },
    { key: 'wed', label: 'Среда', short: 'Ср' },
    { key: 'thu', label: 'Четверг', short: 'Чт' },
    { key: 'fri', label: 'Пятница', short: 'Пт' },
    { key: 'sat', label: 'Суббота', short: 'Сб' },
    { key: 'sun', label: 'Воскресенье', short: 'Вс' }
  ];

  const DAY_FULL_NAMES = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  const MONTH_GENITIVE = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  // «в октябре 2025» — предложный падеж для текстов про месяц
  const MONTH_PREPOSITIONAL = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
  const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  // ===== Типы блоков =====
  function createEmptyMatrix() {
    const data = {};
    QUADRANTS.forEach(q => { data[q.key] = []; });
    return data;
  }

  const BLOCK_TYPES = [
    { type: 'todo', label: 'Список дел', defaultData: () => [] },
    { type: 'matrix', label: 'Матрица Эйзенхауэра', defaultData: createEmptyMatrix },
    { type: 'notes', label: 'Заметки', defaultData: () => '' },
    { type: 'schedule', label: 'Расписание на день', defaultData: () => ({}) },
    { type: 'pomodoro', label: 'Помодоро', defaultData: () => ({}) },
    { type: 'goals', label: 'Цели', defaultData: () => ({ ids: [] }) }
  ];

  // ===== Состояние по умолчанию =====
  function createDefaultState() {
    return {
      blocks: [
        { id: 'todo-1', type: 'todo', title: 'Список дел', data: [] },
        { id: 'matrix-1', type: 'matrix', title: 'Матрица Эйзенхауэра', data: createEmptyMatrix() },
        { id: 'notes-1', type: 'notes', title: 'Заметки', data: '' },
        { id: 'schedule-1', type: 'schedule', title: 'Расписание на день', data: {} },
        { id: 'pomodoro-1', type: 'pomodoro', title: 'Помодоро', data: {} },
        { id: 'goals-1', type: 'goals', title: 'Цели', data: { ids: [] } }
      ],
      order: ['todo-1', 'matrix-1', 'schedule-1', 'pomodoro-1', 'goals-1', 'notes-1'],
      hidden: [],
      xp: 0,
      streak: 0,
      lastActiveDate: null,
      selectedDate: null, // YYYY-MM-DD, null означает сегодня
      stepsProgress: {},
      editingMode: false,
      weekSchedule: { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
      dayNotes: {},
      dailyTasks: {},
      monthReviews: [],
      goals: [],
      pomodoro: {
        tasks: [],
        activeTaskId: null,
        settings: { work: POMODORO_DEFAULTS.work, break: POMODORO_DEFAULTS.break },
        phase: 'work',
        endAt: null,
        remaining: POMODORO_DEFAULTS.work * 60,
        message: '',
        messageKind: ''
      },
      // блоки помодоро и целей у старых сохранений добавляются один раз
      flags: { pomodoroBlockAdded: true, goalsBlockAdded: true }
    };
  }

  App.config = {
    STORAGE_KEY,
    PRIORITIES,
    PRIORITY_ICONS,
    PRIORITY_TITLES,
    PRIORITY_CYCLE,
    DEFAULT_PRIORITY,
    XP_BY_PRIORITY,
    XP_PER_LEVEL,
    XP_FOR_LESSON_STEP,
    XP_FOR_MONTH_REVIEW,
    XP_BY_GOAL_PRIORITY,
    XP_PER_POMODORO_TASK,
    XP_PENALTY_ON_TASK_DELETE,
    QUADRANTS,
    GOAL_SMART_FIELDS,
    POMODORO_DEFAULTS,
    POMODORO_MESSAGES,
    SPLASHES,
    DAYS_OF_WEEK,
    DAY_FULL_NAMES,
    MONTH_GENITIVE,
    MONTH_PREPOSITIONAL,
    MONTH_NAMES,
    BLOCK_TYPES,
    createEmptyMatrix,
    createDefaultState
  };
})(window.App = window.App || {});
