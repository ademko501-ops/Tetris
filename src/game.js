// =====================================================
// Tetris Vault-Tec — game logic, stage R-7
// Цель этапа: вместо одной фигуры T теперь все семь
// классических тетромино (I, O, T, S, Z, L, J). Какая
// фигура падает следующей — определяет «7-bag»: в каждом
// мешке каждая из семи фигур выпадает РОВНО один раз,
// потом мешок пересоздаётся заново.
// Каждая фигура раскрашивается своим цветом (через
// CSS-класс piece-<id>), цвет сохраняется в стеке после
// фиксации.
// =====================================================

// === Размеры поля ===
// ROWS — количество строк (высота),
// COLS — количество колонок (ширина).
const ROWS = 24;
const COLS = 12;

// === Скорости падения ===
// FALL_INTERVAL_MS      — обычное падение: один шаг в секунду.
// FAST_FALL_INTERVAL_MS — ускоренное падение, пока зажата ↓.
const FALL_INTERVAL_MS = 1000;
const FAST_FALL_INTERVAL_MS = 100;

// === Каталог фигур (single source of truth) ===
// Семь классических тетромино. Каждая запись:
//   id    — одна буква, имя фигуры в каноне Тетриса. Используется
//           двояко: как суффикс CSS-класса (piece-T, piece-I и т. д.,
//           см. style.css) и как значение, которое уходит в stack
//           при фиксации фигуры (чтобы запомнить её цвет).
//   shape — прямоугольная 2D-матрица: 1 — занятая клетка, 0 — пустая.
//           Размеры разные: I = 1×4, O = 2×2, остальные = 2×3.
// Цвет каждой фигуры в JS НЕ дублируется — он живёт в CSS-переменной
// --color-piece-<id>. Связь только через id.
const SHAPES = [
  {
    id: 'I',
    shape: [
      [1, 1, 1, 1],
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
      [1, 1, 1],
      [0, 1, 0],
    ],
  },
  {
    id: 'S',
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
  },
  {
    id: 'Z',
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
  },
  {
    id: 'L',
    shape: [
      [0, 0, 1],
      [1, 1, 1],
    ],
  },
  {
    id: 'J',
    shape: [
      [1, 0, 0],
      [1, 1, 1],
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
// currentShape       — её матрица (используется canMove / freezePiece / drawBoard).
// currentPieceId     — её id-буква (для CSS-класса и для записи в stack).
// Все четыре значения проставляет spawnNewPiece().
let pieceRow;
let pieceCol;
let currentShape;
let currentPieceId;

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
  pieceRow = 0;
  pieceCol = Math.floor((COLS - currentShape[0].length) / 2);
}

// === Шаг падения по таймеру ===
// Раз в FALL_INTERVAL_MS / FAST_FALL_INTERVAL_MS мс эту функцию
// вызывает setInterval. Логика:
//   - если фигура может опуститься на одну строку — опускаем;
//   - если не может (упёрлась в стек или дно) — впечатываем её в
//     stack и спавним следующую.
// Таймер при этом НЕ останавливается: новая фигура подхватывает темп.
function dropStep() {
  if (canMove(currentShape, 1, 0)) {
    pieceRow++;
  } else {
    freezePiece();
    spawnNewPiece();
  }
  drawBoard();
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
function tryMoveHorizontal(deltaCol) {
  if (canMove(currentShape, 0, deltaCol)) {
    pieceCol += deltaCol;
    drawBoard();
  }
}

// Список клавиш, которыми мы управляем игрой. Используется в двух
// местах keydown-обработчика: чтобы заглушить дефолтное поведение
// браузера (preventDefault) и чтобы развести логику по if/else if.
// Когда в R-8 добавится 'ArrowUp' (повороты) — дописываем сюда
// один раз, и оба места ниже подхватят правку автоматически.
//
// ВАЖНО: значения здесь — это event.code (физическое имя клавиши),
// а не event.key (символ). Для стрелок это одно и то же ('ArrowLeft'
// и в event.key, и в event.code), но для пробела event.key === ' '
// (литерал пробела), а event.code === 'Space'. Хранить ' ' в массиве
// хрупко (легко спутать с пустой строкой), плюс event.code устойчив
// к раскладке клавиатуры — поэтому весь блок клавиатуры ниже сверяется
// с event.code, а не с event.key.
const CONTROLLED_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'Space'];

// Слушаем нажатия клавиш на всём документе. event.code —
// физическое имя клавиши: 'ArrowLeft' / 'ArrowRight' для ←/→,
// 'ArrowDown' для ускоренного падения, 'Space' для будущего
// мгновенного сброса (R-8) — сейчас просто блокирует скролл
// браузера, игровой логики на пробеле пока нет.
// 'ArrowUp' (повороты) появится в R-8.
document.addEventListener('keydown', (event) => {
  // Поведение браузера по умолчанию: стрелка ↓ листает страницу вниз,
  // пробел тоже скроллит (примерно на пол-экрана), ←/→ могут
  // прокручивать горизонтально внутри прокручиваемых блоков.
  // Для тех клавиш, которыми играем сами (включая пока «немой»
  // пробел), отключаем дефолт сразу — иначе во время игры страница
  // уезжает под фигурой.
  // Прочие клавиши (Tab, F5, Ctrl+R, ↑ и т. д.) — пропускаем как есть.
  if (CONTROLLED_KEYS.includes(event.code)) {
    event.preventDefault();
  }

  if (event.code === 'ArrowLeft') {
    tryMoveHorizontal(-1);
  } else if (event.code === 'ArrowRight') {
    tryMoveHorizontal(+1);
  } else if (event.code === 'ArrowDown') {
    // event.repeat === true — ОС-автоповтор при удержании клавиши.
    // Переключение на ускоренный режим делается один раз, при
    // первом нажатии. Дальнейшие "повторы" игнорируем, иначе будем
    // зря дёргать clearInterval/setInterval каждые 30-50 мс.
    if (event.repeat) {
      return;
    }
    startFallTimer(FAST_FALL_INTERVAL_MS);
  }
  // 'Space' — намеренно нет ветки. preventDefault выше уже сработал,
  // а игровая логика пробела (мгновенный сброс) появится в R-8.
});

// Отпускание клавиши: для ↓ возвращаем обычную скорость падения.
// Если ↓ всё ещё держится, когда новая фигура спавнится — она
// продолжит падать ускоренно. Это поведение из канона Тетриса.
document.addEventListener('keyup', (event) => {
  if (event.code === 'ArrowDown') {
    startFallTimer(FALL_INTERVAL_MS);
  }
});

// === Запуск ===
// Тег <script> подключён в конце <body>, поэтому к моменту
// выполнения этой строки HTML уже распарсен и контейнер
// #game-board точно существует на странице.
// Сначала ставим первую фигуру в стартовую позицию (тот же
// spawnNewPiece, что вызывается при фиксации) — формула живёт
// в одном месте, мешок 7-bag создаётся при первом обращении.
spawnNewPiece();
drawBoard();

// Стартуем таймер на обычной скорости. Дальше скорость может
// переключаться нажатиями ↓ (через тот же startFallTimer).
startFallTimer(FALL_INTERVAL_MS);

// Маяк в консоли DevTools (F12 → Console) — подтверждает,
// что скрипт запустился, мешок фигур загружен, таймер падения
// активирован, стек живой, клавиатура слушается.
console.log("Vault-Tec terminal online. Seven-piece bag loaded. Stack initialised. Keyboard armed (←/→/↓).");
