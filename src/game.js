// =====================================================
// Tetris Vault-Tec — game logic, stage R-11 (финал Модуля 5)
// Цели этапа:
//   1) Game Over: новая фигура спавнится в занятых клетках →
//      экран Game Over (swap с #game-board), запись best score
//      в localStorage, клавиша R для рестарта.
//   2) Lock delay 500 мс (как в NES): фигура коснулась дна →
//      пауза перед фиксацией; движения НЕ перезапускают таймер,
//      сброс только если фигура снова смогла двинуться вниз.
//   3) Best score: новая четвёртая строка табло, чтение из
//      localStorage при старте, запись при Game Over если побит.
//   4) Закрытие двух заделов:
//      • hardDrop теперь явно перезапускает fall таймер после
//        spawn (R-9);
//      • soft drop корректно сохраняется при level-up через
//        флаг isSoftDropping (R-10).
// =====================================================

// === Размеры поля ===
// ROWS — количество строк (высота),
// COLS — количество колонок (ширина).
const ROWS = 24;
const COLS = 12;

// === Скорости падения ===
// BASE_FALL_INTERVAL_MS — обычное падение на УРОВНЕ 0 (старт игры).
//                         С каждым уровнем уменьшается на LEVEL_SPEED_STEP_MS,
//                         но не ниже MIN_FALL_INTERVAL_MS. См. computeFallInterval ниже.
// FAST_FALL_INTERVAL_MS — soft drop (зажатая ↓), всегда 100 мс независимо от уровня.
// LEVEL_SPEED_STEP_MS   — насколько ускоряется обычное падение с каждым уровнем.
// MIN_FALL_INTERVAL_MS  — нижняя планка для обычной скорости (cap),
//                         чтобы игра не стала неиграбельной на высоких уровнях.
const BASE_FALL_INTERVAL_MS = 1000;
const FAST_FALL_INTERVAL_MS = 100;
const LEVEL_SPEED_STEP_MS = 80;
const MIN_FALL_INTERVAL_MS = 100;

// === Система очков (Nintendo) ===
// LINE_SCORES[count] — базовые очки за одновременное удаление count линий.
// Реальное начисление: LINE_SCORES[count] * (level + 1).
// Индексы 0..4: 0 — ничего не удалили (0 очков); 4 — «Tetris» (1200 базовых).
// Больше 4 за один раз невозможно — фигура максимум занимает 4 строки.
const LINE_SCORES = [0, 40, 100, 300, 1200];

// === Параметры роста уровня ===
// LINES_PER_LEVEL — сколько линий надо удалить за всю партию, чтобы
// уровень вырос на 1. Уровень = floor(linesTotal / LINES_PER_LEVEL).
const LINES_PER_LEVEL = 10;

// === Lock delay (R-11) ===
// Когда фигура коснулась дна (canMove(1,0) === false), она НЕ
// фиксируется мгновенно. Запускается таймер LOCK_DELAY_MS — за это
// время игрок может ещё сдвинуть фигуру вбок над выемкой или
// повернуть её. По истечении — performLock (freeze + spawn + ...).
// NES-канон: сами движения НЕ перезапускают таймер; сброс только
// если фигура после движения снова смогла двинуться вниз.
// (В современных Тетрисах с SRS делают reset на каждое движение —
// это «infinite stall», но пользователь явно попросил NES-вариант.)
const LOCK_DELAY_MS = 500;

// === localStorage best score (R-11) ===
// Ключ под лучшим за всю историю счётом. Читается один раз при
// загрузке (loadBestScore), пишется на Game Over если score побил
// рекорд (saveBestScore). Обе операции обёрнуты в try/catch —
// приватный режим браузера может выбросить SecurityError.
const BEST_SCORE_KEY = 'tetris-vault-best-score';

// === Каталог фигур (single source of truth) ===
// Семь классических тетромино. Каждая запись:
//   id    — одна буква, имя фигуры в каноне Тетриса. Используется
//           двояко: как суффикс CSS-класса (piece-T, piece-I и т. д.,
//           см. style.css) и как значение, которое уходит в stack
//           при фиксации фигуры (чтобы запомнить её цвет).
//   shape — каноническая SRS-матрица в КВАДРАТНОЙ рамке:
//             I — 4×4, заполнена строка 1 (по SRS-спецификации);
//             O — 2×2 (фигура заполняет весь бокс, паддинг не нужен);
//             T, S, Z, L, J — 3×3, фигура занимает строки 0 и 1,
//             нижняя строка нулевая (паддинг).
//           Квадратная рамка — обязательное условие для SRS-поворотов:
//           центр вращения совпадает с центром бокса, и стандартная
//           таблица wall kicks (см. SRS_KICKS ниже) применяется напрямую.
//           Нулевые клетки невидимы при отрисовке и пропускаются
//           в canMove / freezePiece — они «нарисованы», но не «существуют».
// Цвет каждой фигуры в JS НЕ дублируется — он живёт в CSS-переменной
// --color-piece-<id>. Связь только через id.
//
// Примечание про T: в R-7 фигура была [[1,1,1],[0,1,0]] (cap вниз).
// В R-8 переведена на канонический SRS-вид [[0,1,0],[1,1,1],[0,0,0]]
// (cap вверх), как в большинстве современных Тетрисов. Это обязательно
// для того, чтобы наш state 0 совпадал с canonical SRS state 0 — иначе
// пришлось бы циклически сдвигать SRS_KICKS только для T.
const SHAPES = [
  {
    id: 'I',
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  {
    id: 'O',
    shape: [
      [1, 1],
      [1, 1],
    ],
  },
  {
    id: 'T',
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
  },
  {
    id: 'S',
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
  },
  {
    id: 'Z',
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
  },
  {
    id: 'L',
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
  },
  {
    id: 'J',
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
  },
];

// === Стек осевших блоков ===
// stack[row][col] хранит:
//   null            — клетка пустая;
//   строка ('T', 'I', 'O', ...) — клетка занята; значение — это
//                                  id фигуры, которой эта клетка
//                                  когда-то принадлежала.
// Зачем строка вместо 1: чтобы после фиксации цвет фигуры
// сохранился — drawBoard добавит к клетке класс piece-<id>.
const stack = [];
for (let row = 0; row < ROWS; row++) {
  stack.push(Array(COLS).fill(null));
}

// === Состояние текущей падающей фигуры ===
// pieceRow / pieceCol — координаты верхне-левого угла фигуры в поле.
// currentShape       — её ТЕКУЩАЯ матрица (используется canMove / freezePiece / drawBoard).
//                      При успешном повороте заменяется на повёрнутую копию.
// currentPieceId     — её id-буква (для CSS-класса и для записи в stack).
//                      При повороте НЕ меняется — id принадлежит фигуре, а не её позе.
// currentRotation    — текущее состояние поворота, целое 0..3
//                      (0 = spawn, 1 = R, 2 = 180°, 3 = L). Инкремент `% 4`
//                      при успешном повороте; сброс в 0 в spawnNewPiece().
//                      Используется как индекс в SRS_KICKS.
// Все пять значений проставляет spawnNewPiece().
let pieceRow;
let pieceCol;
let currentShape;
let currentPieceId;
let currentRotation;

// === Текущий 7-bag ===
// «Мешок» из ещё не выданных фигур. Когда мешок пустеет —
// getNextPiece() пересоздаёт его через createBag(). Этим
// гарантируется честное распределение: внутри каждых семи
// спавнов выпадает РОВНО каждая из семи фигур, ни одна не
// «прячется» и ни одна не идёт несколько раз подряд из мешка.
let currentBag = [];

// === Состояние таймера падения ===
// fallTimer — идентификатор, который вернул setInterval. Через него
// можно остановить таймер (clearInterval). null = «таймера нет».
let fallTimer = null;

// === Состояние lock delay (R-11) ===
// lockDelayTimer — идентификатор setTimeout, который через LOCK_DELAY_MS
// зафиксирует фигуру через performLock. null = таймер не запущен.
// Управляется через armLockDelay / cancelLockDelay (см. ниже).
let lockDelayTimer = null;

// === Состояние счёта (R-10, расширено R-11) ===
// score          — суммарные очки за партию.
// linesTotal     — суммарное количество удалённых линий за партию.
// level          — текущий уровень = floor(linesTotal / LINES_PER_LEVEL).
//                  Влияет на скорость падения и на множитель очков.
// bestScore      — лучший счёт за всю историю (читается из localStorage
//                  при старте, обновляется на Game Over если побит).
// isSoftDropping — флаг «↓ сейчас удерживается игроком». Нужен
//                  applyCleared, чтобы при level-up сохранить soft drop
//                  (FAST), а не сбросить его на скорость уровня.
//                  Закрывает задел R-10.
// isGameOver     — глобальный флаг «партия закончена». Все игровые
//                  действия (dropStep / tryMove / tryRotate / hardDrop)
//                  делают `if (isGameOver) return;`. Снимает только
//                  resetGame по клавише R.
let score = 0;
let linesTotal = 0;
let level = 0;
let bestScore = 0;
let isSoftDropping = false;
let isGameOver = false;

// === Создание нового перетасованного мешка ===
// Возвращает копию массива SHAPES в случайном порядке.
// Алгоритм Фишера–Йетса: проходим с конца, на каждом шаге меняем
// текущий элемент с одним из ранее не выбранных (j из 0..i включительно).
// Время O(n), без дубликатов, равномерное распределение перестановок.
function createBag() {
  const bag = SHAPES.slice(); // мелкая копия — оригинал SHAPES не трогаем
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = bag[i];
    bag[i] = bag[j];
    bag[j] = tmp;
  }
  return bag;
}

// === Достать следующую фигуру из мешка ===
// Если мешок пуст — пересоздаём (это и есть суть 7-bag).
// shift() удаляет и возвращает первый элемент массива.
function getNextPiece() {
  if (currentBag.length === 0) {
    currentBag = createBag();
  }
  return currentBag.shift();
}

// === Отрисовка поля в HTML ===
// Перерисовывает поле целиком: ROWS × COLS div-ов.
// Сначала рисует стек (массив stack), потом поверх — текущую падающую фигуру.
// Каждой непустой клетке добавляются два класса:
//   - filled        — структурный (position / z-index, см. style.css);
//   - piece-<id>    — цвет фона и свечения, тоже из style.css.
function drawBoard() {
  const boardEl = document.getElementById('game-board');

  // Очищаем содержимое — иначе клетки добавлялись бы поверх старых.
  boardEl.innerHTML = '';

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = document.createElement('div');
      cell.className = 'cell';

      // 1) Клетка из стека: если там лежит id — закрашиваем в её цвет.
      const stackId = stack[row][col];
      if (stackId !== null) {
        cell.classList.add('filled');
        cell.classList.add('piece-' + stackId);
      }

      // 2) Клетка из текущей падающей фигуры: считаем локальные
      // координаты относительно верхне-левого угла. Если попадаем
      // в рамку currentShape и там 1 — тоже закрашиваем (фигура
      // «поверх» стека, цвет — её собственный).
      const localRow = row - pieceRow;
      const localCol = col - pieceCol;
      const insideShape =
        localRow >= 0 && localRow < currentShape.length &&
        localCol >= 0 && localCol < currentShape[0].length;
      if (insideShape && currentShape[localRow][localCol] === 1) {
        cell.classList.add('filled');
        cell.classList.add('piece-' + currentPieceId);
      }

      boardEl.appendChild(cell);
    }
  }
}

// === Проверка возможности движения ===
// Может ли фигура `shape` сместиться от текущей позиции
// (pieceRow / pieceCol) на dRow строк вниз и dCol колонок вбок?
//   - dRow = +1, dCol =  0 → шаг вниз (используется в dropStep)
//   - dRow =  0, dCol = -1 → шаг влево
//   - dRow =  0, dCol = +1 → шаг вправо
// Возвращает false, если хотя бы одна занятая клетка shape окажется:
//   а) за границей поля (вышла из 0..ROWS-1 по строкам или 0..COLS-1 по колонкам),
//   б) на месте уже осевшего блока (stack[r][c] !== null).
//
// ПРЕДПОЛОЖЕНИЕ: shape — прямоугольная матрица (все строки одной длины).
// Все 7 классических фигур из SHAPES такие, поэтому ширина читается
// как shape[0].length. Если в R-8 у поворотов появится «рваная»
// матрица — придётся пересмотреть.
function canMove(shape, dRow, dCol) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[0].length; c++) {
      // Пропускаем «пустые» клетки фигуры — они никому не мешают.
      if (shape[r][c] !== 1) {
        continue;
      }

      // Координаты этой клетки фигуры в поле ПОСЛЕ предлагаемого сдвига.
      const newRow = pieceRow + dRow + r;
      const newCol = pieceCol + dCol + c;

      // (а) проверка границ поля
      if (newRow < 0 || newRow >= ROWS) {
        return false;
      }
      if (newCol < 0 || newCol >= COLS) {
        return false;
      }

      // (б) проверка пересечения со стеком
      if (stack[newRow][newCol] !== null) {
        return false;
      }
    }
  }
  return true;
}

// === Впечатывание фигуры в стек ===
// Вызывается, когда canMove(currentShape, 1, 0) вернул false:
// фигура не может опуститься ниже, значит она «садится».
// Все её занятые клетки переписываются в stack как currentPieceId
// (строка-идентификатор) — это сохранит цвет фигуры в стеке.
//
// В самом конце функция вызывает clearLines() — заполненные строки
// удаляются сразу же при фиксации фигуры, чтобы новый спавн уже
// видел очищенное поле. Возврат — количество удалённых линий,
// пригодится в R-10 для подсчёта очков.
//
// ВАЖНО: вызывать ТОЛЬКО после неудачной canMove. Сама функция не
// проверяет границы массива — она полагается на инвариант, что
// текущая (pieceRow, pieceCol) уже валидна (фигура внутри поля).
function freezePiece() {
  for (let r = 0; r < currentShape.length; r++) {
    for (let c = 0; c < currentShape[0].length; c++) {
      if (currentShape[r][c] === 1) {
        stack[pieceRow + r][pieceCol + c] = currentPieceId;
      }
    }
  }
  return clearLines();
}

// === Удаление заполненных линий стека ===
// Идём сверху вниз, отбираем строки, в которых ХОТЯ БЫ ОДНА клетка
// пустая (null). Все полные строки автоматически выпадают из набора.
// Затем переписываем массив stack по индексам: сверху N новых пустых
// строк (где N — сколько удалили), ниже — сохранённые непустые
// в том же порядке, в каком были.
//
// Stack объявлен через const, длину менять нельзя, но сами элементы
// (ссылки на массивы-строки) — переменные. Поэтому переприсваиваем
// stack[r] по индексам, длина массива не меняется.
//
// Возвращает количество удалённых линий (0..4 для одной фиксации;
// больше 4 невозможно — фигура максимум занимает 4 строки).
function clearLines() {
  const keptRows = [];
  for (let r = 0; r < ROWS; r++) {
    const row = stack[r];
    const isFull = row.every((cell) => cell !== null);
    if (!isFull) {
      // .slice() — копия строки, а не ссылка. Защита от случайной
      // мутации stack[r] при последующей перезаписи: если бы хранили
      // саму ссылку, при r == r' переписали бы строку, которую ещё
      // ждёт keptRows ниже. На текущей логике конфликта нет, но копия
      // делает инвариант явным и устойчивым к будущим правкам.
      keptRows.push(row.slice());
    }
  }

  const cleared = ROWS - keptRows.length;
  if (cleared === 0) {
    return 0;
  }

  // Сверху — cleared пустых строк, ниже — keptRows подряд.
  for (let r = 0; r < ROWS; r++) {
    if (r < cleared) {
      stack[r] = Array(COLS).fill(null);
    } else {
      stack[r] = keptRows[r - cleared];
    }
  }
  return cleared;
}

// === Спавн новой фигуры ===
// Берёт следующую фигуру из 7-bag (getNextPiece) и кладёт её
// сверху по центру. Формула центрирования живёт ровно здесь —
// единственное место, где она нужна.
// Game Over (новая фигура появляется прямо в занятых клетках стека)
// пока не обрабатываем — это будет в R-11.
function spawnNewPiece() {
  const next = getNextPiece();
  currentShape = next.shape;
  currentPieceId = next.id;
  currentRotation = 0;
  pieceRow = 0;
  pieceCol = Math.floor((COLS - currentShape[0].length) / 2);
}

// === Скорость падения на данном уровне ===
// Линейная кривая: на каждый уровень падение ускоряется
// на LEVEL_SPEED_STEP_MS мс, но не ниже MIN_FALL_INTERVAL_MS.
// Уровень 0  → 1000 мс  (start)
// Уровень 5  →  600 мс
// Уровень 10 →  200 мс
// Уровень 12 →  100 мс  (cap, дальше всё на минимуме)
function computeFallInterval(currentLevel) {
  const raw = BASE_FALL_INTERVAL_MS - currentLevel * LEVEL_SPEED_STEP_MS;
  return Math.max(MIN_FALL_INTERVAL_MS, raw);
}

// === Обработка результата фиксации фигуры ===
// Принимает count — число удалённых линий за этот freezePiece (0..4).
// Делает три вещи:
//   1) начисляет очки по таблице Nintendo, умноженные на (level + 1);
//   2) увеличивает linesTotal;
//   3) проверяет, не перешёл ли игрок на новый уровень, и если да —
//      перезапускает таймер на новой (более быстрой) скорости.
// В конце обновляет HTML-табло.
//
// Вызывается из dropStep и hardDrop сразу после freezePiece().
// При count === 0 (фигура села, но линии не очистились) функция всё
// равно зовётся: drawScorePanel перерисует панель (на случай, если
// уровень изменился из-за предыдущих линий — на самом деле такого не
// будет, но защита от рассинхрона).
function applyCleared(count) {
  if (count > 0) {
    // Защита от потенциального count > 4: clearLines гарантирует 0..4
    // (фигура максимум занимает 4 строки), но если контракт будущей
    // правкой сломается, без этого clamp обращение к LINE_SCORES[5]
    // вернёт undefined и score стал бы NaN навсегда.
    if (count > 4) {
      count = 4;
    }

    score += LINE_SCORES[count] * (level + 1);
    linesTotal += count;

    const newLevel = Math.floor(linesTotal / LINES_PER_LEVEL);
    if (newLevel !== level) {
      level = newLevel;
      // R-11 фикс задела R-10: если игрок сейчас удерживает ↓,
      // soft drop должен продолжаться на новой (более быстрой) скорости
      // уровня, а не сбрасываться обратно на BASE. Поэтому при level-up
      // сохраняем семантику текущей фазы через флаг isSoftDropping.
      startFallTimer(isSoftDropping ? FAST_FALL_INTERVAL_MS : computeFallInterval(level));
    }

    // drawScorePanel зовём только когда count > 0 — пустая фиксация
    // (без удалённых линий) не меняет ни одного значения, лишние
    // обращения к DOM не нужны. Стартовая отрисовка идёт отдельно
    // в самом низу файла (см. блок «Запуск»).
    drawScorePanel();
  }
}

// === DOM-ссылки (R-10 + R-11) ===
// Кэш ссылок на элементы интерфейса, чтобы не дёргать getElementById
// при каждом обновлении. Тег <script> подключён в конце <body>,
// поэтому к моменту вычисления этих const все элементы существуют.
// scoreEl / levelEl / linesEl / bestEl — четыре строки табло;
// gameBoardEl / gameOverScreenEl — переключаются swap'ом через
// атрибут hidden при Game Over и при рестарте (R);
// gameOverScoreEl — куда пишется итоговый счёт на экране Game Over.
const scoreEl = document.getElementById('score-value');
const levelEl = document.getElementById('level-value');
const linesEl = document.getElementById('lines-value');
const bestEl = document.getElementById('best-value');
const gameBoardEl = document.getElementById('game-board');
const gameOverScreenEl = document.getElementById('game-over-screen');
const gameOverScoreEl = document.getElementById('game-over-score-value');

// === Best score в localStorage (R-11) ===
// loadBestScore возвращает сохранённый рекорд или 0 при любых ошибках
// (нет ключа, нечисловое значение, отрицательное число, localStorage
// недоступен из-за приватного режима). Гладкая деградация: если
// SecurityError — мы просто играем без рекорда, скрипт не падает.
function loadBestScore() {
  try {
    const raw = localStorage.getItem(BEST_SCORE_KEY);
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed) || parsed < 0) {
      return 0;
    }
    return parsed;
  } catch (e) {
    return 0;
  }
}

// saveBestScore пишет рекорд в localStorage. Если приватный режим
// выбрасывает SecurityError — тихо игнорируем: рекорд продолжит
// работать в памяти текущей сессии, в localStorage просто не запишется.
function saveBestScore(value) {
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(value));
  } catch (e) {
    // намеренно пусто — никаких console.warn, чтобы не пугать
    // пользователя сообщениями в консоли в приватном режиме.
  }
}

// Простое обновление текста в четырёх HTML-элементах через закэшированные
// ссылки. Вызывается из applyCleared (только когда счёт реально
// изменился), из triggerGameOver (если bestScore обновился), из
// resetGame (после сброса), и один раз при старте.
function drawScorePanel() {
  scoreEl.textContent = score;
  levelEl.textContent = level;
  linesEl.textContent = linesTotal;
  bestEl.textContent = bestScore;
}

// === Шаг падения по таймеру ===
// Раз в computeFallInterval(level) мс (или FAST_FALL_INTERVAL_MS,
// если зажата ↓) эту функцию вызывает setInterval. Логика R-11:
//   - если isGameOver — return сразу (защита, на случай если таймер
//     не успели остановить до того, как тик прилетел);
//   - если фигура может опуститься на одну строку — опускаем
//     и отменяем lock delay (фигура снова в воздухе);
//   - если не может — запускаем lock delay (если ещё не активен).
//     freeze + spawn выполнится через LOCK_DELAY_MS мс из performLock.
// Таймер при этом НЕ останавливается: новая фигура подхватывает темп.
function dropStep() {
  if (isGameOver) {
    return;
  }

  if (canMove(currentShape, 1, 0)) {
    pieceRow++;
    // Фигура снова двинулась → если был активен lock delay
    // (например, висела на крае выемки и теперь съехала внутрь),
    // отменяем его. NES-канон: только переход к «can-move-down»
    // сбрасывает таймер, не само движение.
    cancelLockDelay();
    drawBoard();
  } else {
    // Не можем вниз — запускаем lock delay (если ещё не запущен).
    // performLock через LOCK_DELAY_MS мс впечатает фигуру и сам
    // вызовет drawBoard. До тех пор поле не перерисовываем — фигура
    // остаётся на месте, нечего обновлять.
    armLockDelay();
  }
}

// === Lock delay (R-11) ===
// armLockDelay     — запускает таймер на LOCK_DELAY_MS, если ещё не активен.
// cancelLockDelay  — отменяет активный таймер; вызывается когда фигура
//                    снова может вниз (dropStep, после успешного move/rotate),
//                    при hard drop (мгновенный freeze) и при Game Over.
// performLock      — то, что делает таймер по истечении: впечатать,
//                    начислить очки, спавнить следующую, проверить
//                    Game Over. Аналог «freeze»-ветки старого dropStep,
//                    только запускается отдельным setTimeout-таймером.

function armLockDelay() {
  if (lockDelayTimer !== null) {
    // NES-канон: таймер уже тикает — не перезапускаем.
    // Иначе движения внутри окна lock delay растягивали бы паузу
    // («infinite stall» из современного SRS — не наш вариант).
    return;
  }
  lockDelayTimer = setTimeout(performLock, LOCK_DELAY_MS);
}

function cancelLockDelay() {
  if (lockDelayTimer !== null) {
    clearTimeout(lockDelayTimer);
    lockDelayTimer = null;
  }
}

function performLock() {
  // Таймер только что отстрелял — обнуляем идентификатор.
  lockDelayTimer = null;

  const cleared = freezePiece();
  applyCleared(cleared);
  spawnNewPiece();

  // Game Over: новая фигура спавнится в занятых клетках стека.
  // canMove(currentShape, 0, 0) === false означает collision на спавне.
  if (!canMove(currentShape, 0, 0)) {
    triggerGameOver();
    return;
  }
  drawBoard();
}

// === Game Over (R-11) ===
// triggerGameOver — останавливает таймеры, обновляет рекорд, переключает
//                   #game-board на #game-over-screen через атрибут hidden.
// resetGame      — полный сброс state партии и старт новой игры.
//                   Вызывается из keydown по клавише R при isGameOver.

function triggerGameOver() {
  isGameOver = true;

  // Останавливаем все таймеры — игровая логика дальше не тикает.
  if (fallTimer !== null) {
    clearInterval(fallTimer);
    fallTimer = null;
  }
  cancelLockDelay();

  // Обновляем рекорд, если побит.
  if (score > bestScore) {
    bestScore = score;
    saveBestScore(bestScore);
  }
  drawScorePanel();

  // Показываем экран Game Over вместо поля.
  gameOverScoreEl.textContent = score;
  gameBoardEl.hidden = true;
  gameOverScreenEl.hidden = false;
}

function resetGame() {
  // 0) На всякий случай отменяем lock delay: при вызове из Game Over
  //    он уже отменён (triggerGameOver), но если когда-нибудь
  //    resetGame будет вызываться напрямую — гарантия без утечки.
  cancelLockDelay();

  // 1) Сбрасываем state партии.
  isGameOver = false;
  score = 0;
  linesTotal = 0;
  level = 0;
  isSoftDropping = false;

  // 2) Очищаем стек (переписываем все строки новыми массивами null).
  //    Stack объявлен через const, длину не меняем — переприсваиваем элементы.
  for (let r = 0; r < ROWS; r++) {
    stack[r] = Array(COLS).fill(null);
  }

  // 3) Пересоздаём 7-bag, чтобы новая партия не доедала остатки старого мешка.
  currentBag = [];

  // 4) Ставим первую фигуру.
  spawnNewPiece();

  // 5) Переключаем экраны: показываем поле, прячем Game Over.
  gameBoardEl.hidden = false;
  gameOverScreenEl.hidden = true;

  // 6) Синхронизируем UI и стартуем таймер на скорости уровня 0.
  drawBoard();
  drawScorePanel();
  startFallTimer(computeFallInterval(level));
}

// === Мгновенный сброс (hard drop) ===
// Опускает фигуру максимально вниз и фиксирует её в одном тике,
// без таймеров и промежуточных кадров.
// R-11:
//   • в начале guard isGameOver (на случай если R ещё не нажата);
//   • cancelLockDelay — если фигура висела на дне и lock delay
//     уже тикал, его надо отменить, иначе через 500 мс он повторно
//     зафиксировал бы уже несуществующую (новую!) фигуру;
//   • после spawn проверяем Game Over (collision на стартовой позиции);
//   • в конце перезапускаем fall таймер от нуля — закрывает задел R-9:
//     иначе остаток старого интервала «съел» бы 0..1000 мс новой фигуры.
//     При активном soft drop сохраняем FAST.
function hardDrop() {
  if (isGameOver) {
    return;
  }
  cancelLockDelay();

  while (canMove(currentShape, 1, 0)) {
    pieceRow++;
  }
  const cleared = freezePiece();
  applyCleared(cleared);
  spawnNewPiece();
  if (!canMove(currentShape, 0, 0)) {
    triggerGameOver();
    return;
  }
  drawBoard();
  startFallTimer(isSoftDropping ? FAST_FALL_INTERVAL_MS : computeFallInterval(level));
}

// === Запуск / переключение таймера падения ===
// Останавливает предыдущий таймер (если он был) и запускает новый
// с указанным интервалом. Используется и при старте игры, и при
// переключении между обычной и ускоренной скоростью падения.
function startFallTimer(intervalMs) {
  if (fallTimer !== null) {
    clearInterval(fallTimer);
  }
  fallTimer = setInterval(dropStep, intervalMs);
}

// === Управление клавиатурой ===
// Пытается сдвинуть фигуру на deltaCol колонок по горизонтали.
// deltaCol = -1 → влево, deltaCol = +1 → вправо.
// Проверка делается через canMove — она учитывает и границы поля,
// и стек. Если сдвиг невозможен — ничего не происходит.
// R-11: после успешного сдвига проверяем, не съехала ли фигура
// над выемкой — если canMove(1,0) снова true, отменяем lock delay.
// Сам сдвиг таймер НЕ перезапускает (NES-канон).
function tryMoveHorizontal(deltaCol) {
  if (isGameOver) {
    return;
  }
  if (canMove(currentShape, 0, deltaCol)) {
    pieceCol += deltaCol;
    drawBoard();
    if (canMove(currentShape, 1, 0)) {
      cancelLockDelay();
    }
  }
}

// === Поворот матрицы на 90° по часовой стрелке ===
// Чистая функция: принимает 2D-матрицу, возвращает НОВУЮ матрицу,
// повёрнутую по часовой. Исходную не трогает.
// Формула CW-поворота: result[c][rows - 1 - r] = shape[r][c].
// Для прямоугольной матрицы rows × cols результат — cols × rows
// (ширина и высота меняются местами). Для наших канонических SRS-боксов
// матрицы квадратные (2×2, 3×3, 4×4), поэтому размеры сохраняются —
// важное свойство для совместимости со стандартными SRS-сдвигами.
function rotateMatrix(shape) {
  const rows = shape.length;
  const cols = shape[0].length;
  const result = [];
  for (let r = 0; r < cols; r++) {
    result.push(Array(rows).fill(0));
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      result[c][rows - 1 - r] = shape[r][c];
    }
  }
  return result;
}

// === SRS wall kicks (стандартная таблица) ===
// ЭТО СПЕЦИФИКАЦИЯ из Super Rotation System (SRS) — публичный стандарт
// поворотов в современных Тетрисах. См. Tetris Wiki, «Super Rotation
// System». Числа в таблице — это не «магические значения», а данные
// внешнего стандарта; править их без причины нельзя.
//
// Структура:
//   SRS_KICKS[<семейство>][<from-состояние 0..3>] = массив из 5 пар [dCol, dRow].
//   Семейства:
//     'I'     — отдельная таблица для I-фигуры (она «длинная», свои сдвиги);
//     'JLSTZ' — общая таблица для J, L, S, T, Z;
//     O пропускается без поворота — для неё таблица не нужна.
//
// Координаты:
//   Значения записаны в НАШЕЙ системе, где dRow > 0 = вниз по полю,
//   dCol > 0 = вправо. В исходных SRS-таблицах используется (x, y_up),
//   где y_up > 0 = ВВЕРХ. Конвертация: dCol = x, dRow = -y_up.
//   Поэтому пары вида (0, -2) из спецификации записаны здесь как [0, +2]
//   (минус-два-вверх = плюс-два-вниз). Аналогично для всех y-компонент.
//
// Алгоритм применения (см. tryRotate ниже):
//   при попытке повернуть фигуру из состояния X в состояние X+1 берём
//   SRS_KICKS[family][X] и перебираем пять пар по очереди. Первая, при
//   которой canMove(rotated, dRow, dCol) вернёт true — применяется.
//   Если ни одна не подходит — поворот отменяется.
const SRS_KICKS = {
  JLSTZ: [
    // From state 0 (spawn) → R (state 1)
    [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    // From state 1 (R) → state 2 (180°)
    [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    // From state 2 → L (state 3)
    [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    // From state 3 (L) → state 0 (spawn)
    [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  ],
  I: [
    // From state 0 (spawn) → R (state 1)
    [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    // From state 1 (R) → state 2 (180°)
    [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
    // From state 2 → L (state 3)
    [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    // From state 3 (L) → state 0 (spawn)
    [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  ],
};

// === Попытка повернуть текущую фигуру по часовой ===
// Алгоритм SRS:
//   1) O — единственная фигура, поворот которой не виден визуально.
//      Стандартный SRS её пропускает — мы делаем так же (return).
//   2) Получаем повёрнутую копию через rotateMatrix.
//   3) Выбираем кик-таблицу: SRS_KICKS.I для I, SRS_KICKS.JLSTZ для остальных.
//   4) Берём пять сдвигов для currentRotation (= FROM-состояния) и перебираем.
//      Первый сдвиг, при котором canMove(rotated, dRow, dCol) разрешает
//      поставить кандидата в новую позицию — применяем:
//        - currentShape    = повёрнутая;
//        - currentRotation = (старая + 1) % 4;
//        - pieceCol / pieceRow подвинуты на dCol / dRow.
//      И перерисовываем поле.
//   5) Если ни один сдвиг не подошёл — фигура остаётся как была,
//      побочных эффектов нет.
function tryRotate() {
  if (isGameOver) {
    return;
  }
  if (currentPieceId === 'O') {
    return;
  }

  const rotated = rotateMatrix(currentShape);
  const kickFamily = currentPieceId === 'I' ? SRS_KICKS.I : SRS_KICKS.JLSTZ;
  const kicks = kickFamily[currentRotation];

  for (let i = 0; i < kicks.length; i++) {
    const dCol = kicks[i][0];
    const dRow = kicks[i][1];
    if (canMove(rotated, dRow, dCol)) {
      currentShape = rotated;
      currentRotation = (currentRotation + 1) % 4;
      pieceCol += dCol;
      pieceRow += dRow;
      drawBoard();
      // R-11: после успешного поворота проверяем — не открылась ли
      // под фигурой клетка для движения вниз. Если да, lock delay
      // сбрасывается. Сам поворот таймер не перезапускает (NES-канон).
      if (canMove(currentShape, 1, 0)) {
        cancelLockDelay();
      }
      return;
    }
  }
  // Ни один сдвиг не подошёл — поворот отменён, состояние не меняется.
}

// Список клавиш, которыми мы управляем игрой. Используется в двух
// местах keydown-обработчика: чтобы заглушить дефолтное поведение
// браузера (preventDefault) и чтобы развести логику по if/else if.
// 'Space' пока без игровой ветки — занят preventDefault до этапа
// мгновенного сброса (hard drop).
//
// ВАЖНО: значения здесь — это event.code (физическое имя клавиши),
// а не event.key (символ). Для стрелок это одно и то же ('ArrowLeft'
// и в event.key, и в event.code), но для пробела event.key === ' '
// (литерал пробела), а event.code === 'Space'. Хранить ' ' в массиве
// хрупко (легко спутать с пустой строкой), плюс event.code устойчив
// к раскладке клавиатуры — поэтому весь блок клавиатуры ниже сверяется
// с event.code, а не с event.key.
const CONTROLLED_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space'];

// Слушаем нажатия клавиш на всём документе. event.code —
// физическое имя клавиши: 'ArrowLeft' / 'ArrowRight' для ←/→,
// 'ArrowDown' для soft drop, 'ArrowUp' для поворота по часовой,
// 'Space' для hard drop, 'KeyR' для рестарта (только при Game Over).
document.addEventListener('keydown', (event) => {
  // Поведение браузера по умолчанию: стрелки ↓/↑ листают страницу,
  // пробел тоже скроллит (примерно на пол-экрана), ←/→ могут
  // прокручивать горизонтально внутри прокручиваемых блоков.
  // Для тех клавиш, которыми играем сами, отключаем дефолт сразу —
  // даже на Game Over экране пользователь мог бы случайно начать
  // скроллить страницу. Прочие клавиши (Tab, F5, Ctrl+R, KeyR и т. д.) —
  // пропускаем как есть. R специально НЕ в CONTROLLED_KEYS: она
  // не вызывает дефолтных действий браузера, preventDefault не нужен.
  if (CONTROLLED_KEYS.includes(event.code)) {
    event.preventDefault();
  }

  // R-11: при Game Over реагируем ТОЛЬКО на R (рестарт). Прочие
  // игровые клавиши игнорируются. event.repeat у R тоже отсекаем —
  // случайный зажим R не должен дёргать resetGame подряд.
  if (isGameOver) {
    if (event.code === 'KeyR' && !event.repeat) {
      resetGame();
    }
    return;
  }

  if (event.code === 'ArrowLeft') {
    tryMoveHorizontal(-1);
  } else if (event.code === 'ArrowRight') {
    tryMoveHorizontal(+1);
  } else if (event.code === 'ArrowUp') {
    // event.repeat === true — ОС-автоповтор при удержании клавиши.
    // Поворот делается строго на одно нажатие, удержание не крутит
    // фигуру беспрерывно (иначе она «жужжала» бы по 30+ оборотов в секунду).
    if (event.repeat) {
      return;
    }
    tryRotate();
  } else if (event.code === 'ArrowDown') {
    // event.repeat === true — ОС-автоповтор при удержании клавиши.
    // Переключение на ускоренный режим делается один раз, при первом
    // нажатии. Дальнейшие «повторы» игнорируем.
    if (event.repeat) {
      return;
    }
    // R-11: флаг для applyCleared, чтобы при level-up сохранить FAST.
    isSoftDropping = true;
    startFallTimer(FAST_FALL_INTERVAL_MS);
  } else if (event.code === 'Space') {
    // Тоже отсекаем ОС-автоповтор: один зажим пробела не должен
    // запускать каскад из десятков hard drop'ов подряд (новые
    // фигуры спавнятся быстрее, чем игрок успевает поднять палец).
    if (event.repeat) {
      return;
    }
    hardDrop();
  }
});

// Отпускание клавиши: для ↓ возвращаем обычную скорость падения.
// «Обычная» теперь зависит от уровня — берём из computeFallInterval(level).
// Если ↓ всё ещё держится, когда новая фигура спавнится — она
// продолжит падать ускоренно. Это поведение из канона Тетриса.
// R-11: всегда сбрасываем флаг isSoftDropping. Таймер перезапускаем
// ТОЛЬКО если не в состоянии Game Over (иначе мы бы оживляли игру).
document.addEventListener('keyup', (event) => {
  if (event.code === 'ArrowDown') {
    isSoftDropping = false;
    if (!isGameOver) {
      startFallTimer(computeFallInterval(level));
    }
  }
});

// === Запуск ===
// Тег <script> подключён в конце <body>, поэтому к моменту
// выполнения этой строки HTML уже распарсен — все DOM-элементы
// (#game-board, #score-panel, #game-over-screen) точно существуют.
// R-11: первым делом подгружаем рекорд из localStorage — он должен
// быть готов до первой отрисовки табло.
bestScore = loadBestScore();

// Ставим первую фигуру и рисуем поле + табло.
spawnNewPiece();
drawBoard();
drawScorePanel();

// Стартуем таймер на скорости уровня 0 (= BASE_FALL_INTERVAL_MS).
// Дальше скорость переключается через тот же startFallTimer:
// soft drop ↓ → FAST, отпускание ↓ → computeFallInterval(level),
// level-up в applyCleared → FAST (если isSoftDropping) или скорость уровня,
// hard drop → restart на текущей скорости, Game Over → останов.
startFallTimer(computeFallInterval(level));

// Маяк в консоли DevTools (F12 → Console) — подтверждает, что
// все системы инициализированы и слушают ввод.
console.log("Vault-Tec terminal online. Seven-piece bag loaded. Stack initialised. Score panel armed. Lock delay armed. Best score loaded. Keyboard armed (←/→/↑/↓/Space, R to restart on Game Over).");
