// =====================================================
// Tetris Vault-Tec — game logic, stage R-6
// Цель этапа: появился реальный СТЕК. Когда фигура T не
// может опуститься ниже, её клетки впечатываются в массив
// stack, и сразу спавнится новая фигура сверху по центру.
// Управление ← / → и soft drop ↓ из R-4 / R-5 теперь
// учитывают стек: фигура упирается не только в стенки,
// но и в уже осевшие блоки.
// =====================================================

// === Размеры поля ===
// ROWS — количество строк (высота),
// COLS — количество колонок (ширина).
// const = "константа", это значение нельзя переназначить.
const ROWS = 24;
const COLS = 12;

// === Скорости падения ===
// FALL_INTERVAL_MS      — обычное падение: один шаг в секунду.
// FAST_FALL_INTERVAL_MS — ускоренное падение, пока зажата ↓:
//                         один шаг в 100 мс, то есть в 10 раз быстрее.
// Обе скорости вынесены в именованные константы — никаких
// "магических чисел" в коде, легко подкрутить значения.
const FALL_INTERVAL_MS = 1000;
const FAST_FALL_INTERVAL_MS = 100;

// === Стек осевших блоков ===
// stack[row][col] хранит число:
//   0 — клетка пустая,
//   1 — клетка занята (часть осевшего блока).
// Сам массив объявлен через const — переназначить ссылку нельзя,
// но содержимое (значения внутри) меняется при каждом freezePiece().
const stack = [];
for (let row = 0; row < ROWS; row++) {
  stack.push(Array(COLS).fill(0));
}

// === Форма падающей фигуры T ===
// Локальный 2D-массив: 1 — занятая клетка, 0 — пустая.
// Координаты внутри tShape — это смещение от верхне-левого
// угла фигуры. Задел под R-7: позже сюда можно подставлять
// другие формы (I, O, L, J, S, Z).
//
//   X X X
//   . X .
const tShape = [
  [1, 1, 1],
  [0, 1, 0],
];

// === Положение текущей падающей фигуры ===
// pieceRow / pieceCol — координаты верхне-левого угла прямоугольника
// tShape в координатах поля. Меняются: при шагах падения, при
// сдвигах стрелками и при спавне новой фигуры после фиксации.
let pieceRow = 0;
let pieceCol = Math.floor((COLS - tShape[0].length) / 2);

// === Состояние таймера падения ===
// fallTimer — идентификатор, который вернул setInterval. Через него
// можно остановить таймер (clearInterval). null = "таймера нет".
// На этапе R-6 таймер живёт всю игру: фигуры сменяют друг друга,
// каждая новая продолжает падать с той же скоростью, что и предыдущая.
let fallTimer = null;

// === Отрисовка поля в HTML ===
// Перерисовывает поле целиком: ROWS × COLS div-ов.
// Сначала рисует стек (массив stack), потом поверх — текущую падающую фигуру.
function drawBoard() {
  const boardEl = document.getElementById('game-board');

  // Очищаем содержимое — иначе клетки добавлялись бы поверх старых.
  boardEl.innerHTML = '';

  // Двойной цикл: внешний по строкам, внутренний по колонкам.
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = document.createElement('div');
      cell.className = 'cell';

      // 1) Клетка из стека: если в stack стоит 1 — закрашиваем.
      if (stack[row][col] === 1) {
        cell.classList.add('filled');
      }

      // 2) Клетка из падающей фигуры: считаем локальные координаты
      // относительно верхне-левого угла фигуры. Если они попадают
      // в рамку tShape и там 1 — тоже закрашиваем (фигура «поверх» стека).
      const localRow = row - pieceRow;
      const localCol = col - pieceCol;
      const insideShape =
        localRow >= 0 && localRow < tShape.length &&
        localCol >= 0 && localCol < tShape[0].length;
      if (insideShape && tShape[localRow][localCol] === 1) {
        cell.classList.add('filled');
      }

      boardEl.appendChild(cell);
    }
  }
}

// === Проверка возможности движения ===
// Может ли фигура `piece` сместиться от текущей позиции на dRow строк
// вниз и dCol колонок вбок?
//   - dRow = +1, dCol =  0 → шаг вниз (используется в dropStep)
//   - dRow =  0, dCol = -1 → шаг влево
//   - dRow =  0, dCol = +1 → шаг вправо
// Возвращает false, если хотя бы одна занятая клетка piece окажется:
//   а) за границей поля (вышла из 0..ROWS-1 по строкам или 0..COLS-1 по колонкам),
//   б) на месте уже осевшего блока (stack[r][c] === 1).
function canMove(piece, dRow, dCol) {
  for (let r = 0; r < piece.length; r++) {
    for (let c = 0; c < piece[0].length; c++) {
      // Пропускаем «пустые» клетки фигуры — они никому не мешают.
      if (piece[r][c] !== 1) {
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
      if (stack[newRow][newCol] === 1) {
        return false;
      }
    }
  }
  return true;
}

// === Впечатывание фигуры в стек ===
// Вызывается, когда canMove(tShape, 1, 0) вернул false:
// фигура не может опуститься ниже, значит она «садится».
// Все её занятые клетки переписываются в stack как 1.
function freezePiece() {
  for (let r = 0; r < tShape.length; r++) {
    for (let c = 0; c < tShape[0].length; c++) {
      if (tShape[r][c] === 1) {
        stack[pieceRow + r][pieceCol + c] = 1;
      }
    }
  }
}

// === Спавн новой фигуры ===
// Возвращает pieceRow / pieceCol в стартовую позицию: сверху и по центру.
// Game Over (новая фигура появляется прямо в занятых клетках стека)
// пока не обрабатываем — это будет в R-11.
function spawnNewPiece() {
  pieceRow = 0;
  pieceCol = Math.floor((COLS - tShape[0].length) / 2);
}

// === Шаг падения по таймеру ===
// Раз в FALL_INTERVAL_MS / FAST_FALL_INTERVAL_MS мс эта функция
// вызывается setInterval'ом. Логика:
//   - если фигура может опуститься на одну строку — опускаем;
//   - если не может (упёрлась в стек или дно) — впечатываем её в
//     stack и спавним следующую.
// Таймер при этом НЕ останавливается: новая фигура подхватывает темп.
function dropStep() {
  if (canMove(tShape, 1, 0)) {
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
  if (canMove(tShape, 0, deltaCol)) {
    pieceCol += deltaCol;
    drawBoard();
  }
}

// Список клавиш, которыми мы управляем игрой. Используется в двух
// местах keydown-обработчика: чтобы заглушить дефолтное поведение
// браузера (preventDefault) и чтобы развести логику по if/else if.
// Когда в R-7 / R-8 добавятся 'ArrowUp' / ' ' (пробел) — дописываем
// их сюда один раз, и оба места ниже подхватят правку автоматически.
const CONTROLLED_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowDown'];

// Слушаем нажатия клавиш на всём документе. event.key —
// имя нажатой клавиши: 'ArrowLeft' / 'ArrowRight' для ←/→,
// 'ArrowDown' для ускоренного падения. Стрелка ↑ и пробел
// пока игнорируются — они зарезервированы под повороты (R-7)
// и мгновенный сброс (R-8).
document.addEventListener('keydown', (event) => {
  // Поведение браузера по умолчанию: стрелка ↓ листает страницу вниз,
  // ←/→ могут прокручивать горизонтально внутри прокручиваемых блоков.
  // Для тех клавиш, которыми играем сами, отключаем дефолт сразу
  // в начале — иначе во время игры страница уезжает под фигурой.
  // Прочие клавиши (Tab, F5, Ctrl+R, ↑, пробел) — пропускаем как есть.
  if (CONTROLLED_KEYS.includes(event.key)) {
    event.preventDefault();
  }

  if (event.key === 'ArrowLeft') {
    tryMoveHorizontal(-1);
  } else if (event.key === 'ArrowRight') {
    tryMoveHorizontal(+1);
  } else if (event.key === 'ArrowDown') {
    // event.repeat === true — ОС-автоповтор при удержании клавиши.
    // Переключение на ускоренный режим делается один раз, при
    // первом нажатии. Дальнейшие "повторы" игнорируем, иначе будем
    // зря дёргать clearInterval/setInterval каждые 30-50 мс.
    if (event.repeat) {
      return;
    }
    startFallTimer(FAST_FALL_INTERVAL_MS);
  }
});

// Отпускание клавиши: для ↓ возвращаем обычную скорость падения.
// Если ↓ всё ещё держится, когда новая фигура спавнится — она
// продолжит падать ускоренно. Это поведение из канона Тетриса.
document.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowDown') {
    startFallTimer(FALL_INTERVAL_MS);
  }
});

// === Запуск ===
// Тег <script> подключён в конце <body>, поэтому к моменту
// выполнения этой строки HTML уже распарсен и контейнер
// #game-board точно существует на странице.
drawBoard();

// Стартуем таймер на обычной скорости. Дальше скорость может
// переключаться нажатиями ↓ (через тот же startFallTimer).
startFallTimer(FALL_INTERVAL_MS);

// Маяк в консоли DevTools (F12 → Console) — подтверждает,
// что скрипт запустился, таймер падения активирован, стек живой,
// клавиатура слушается.
console.log("Vault-Tec terminal online. Stack initialised. Falling T-piece engaged. Keyboard armed (←/→/↓).");
