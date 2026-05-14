// =====================================================
// Tetris Vault-Tec — game logic, stage R-5
// Цель этапа: пока игрок держит стрелку ↓, фигура падает
// в 10 раз быстрее (раз в 100 мс вместо 1000 мс). После
// отпускания клавиши возвращается обычная скорость.
// Управление ← / → из R-4 и остановка у дна — без изменений.
// Стека пока нет — board заполнен нулями.
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

// === "Память" поля: двумерный массив board ===
// board[row][col] хранит число:
//   0 — клетка пустая,
//   1 — клетка занята (часть осевшего стека).
// Стека пока нет, массив остаётся целиком нулевым.
const board = [];
for (let row = 0; row < ROWS; row++) {
  // Для каждой строки делаем массив из COLS нулей и кладём в board.
  board.push(Array(COLS).fill(0));
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

// === Положение фигуры на поле ===
// pieceRow / pieceCol — координаты верхне-левого угла
// прямоугольника tShape в координатах поля.
// let (а не const), потому что значения будут меняться.
// Стартуем сверху и центрируем по горизонтали:
// (COLS - ширина фигуры) / 2 — отступ слева, делает фигуру
// симметрично посередине.
let pieceRow = 0;
let pieceCol = Math.floor((COLS - tShape[0].length) / 2);

// === Состояние таймера падения ===
// fallTimer — идентификатор, который вернул setInterval. Через него
// можно остановить таймер (clearInterval). null означает "таймер не запущен".
// isFalling — флаг "фигура ещё падает". Становится false, когда фигура
// упёрлась в дно поля. Защищает от перезапуска таймера после посадки
// (например, если игрок отпустит ↓ уже после касания пола).
let fallTimer = null;
let isFalling = true;

// === Отрисовка поля в HTML ===
// Перерисовывает поле целиком: ROWS × COLS div-ов.
// Сначала рисует "стек" (board), потом поверх — падающую фигуру.
function drawBoard() {
  // Находим на странице контейнер с id="game-board".
  const boardEl = document.getElementById('game-board');

  // Очищаем содержимое — иначе клетки добавлялись бы поверх старых.
  boardEl.innerHTML = '';

  // Двойной цикл: внешний по строкам, внутренний по колонкам.
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      // Создаём пустой div-элемент для клетки.
      const cell = document.createElement('div');
      cell.className = 'cell';

      // 1) Клетка из стека: если в board стоит 1 — закрашиваем.
      if (board[row][col] === 1) {
        cell.classList.add('filled');
      }

      // 2) Клетка из падающей фигуры: считаем локальные координаты
      // относительно верхне-левого угла фигуры. Если они попадают
      // в рамку tShape и там 1 — тоже закрашиваем.
      const localRow = row - pieceRow;
      const localCol = col - pieceCol;
      const insideShape =
        localRow >= 0 && localRow < tShape.length &&
        localCol >= 0 && localCol < tShape[0].length;
      if (insideShape && tShape[localRow][localCol] === 1) {
        cell.classList.add('filled');
      }

      // Кладём готовую клетку в контейнер поля.
      boardEl.appendChild(cell);
    }
  }
}

// === Шаг падения по таймеру ===
// Раз в FALL_INTERVAL_MS мс эта функция вызывается setInterval'ом.
// Двигает фигуру на одну строку вниз. Если дальше двигать некуда
// (нижний край фигуры упёрся в дно поля) — останавливает таймер.
function dropStep() {
  // Нижняя строка фигуры в координатах поля (включительно):
  //   bottom = pieceRow + tShape.length - 1
  // Чтобы шаг вниз остался в пределах поля, после шага должно быть:
  //   (pieceRow + 1) + tShape.length - 1 <= ROWS - 1
  // что равносильно: pieceRow + tShape.length < ROWS.
  // Если условие нарушено — фигура уже на дне, стоп.
  if (pieceRow + tShape.length >= ROWS) {
    isFalling = false;
    clearInterval(fallTimer);
    fallTimer = null;
    return;
  }

  pieceRow++;
  drawBoard();
}

// === Запуск / переключение таймера падения ===
// Останавливает предыдущий таймер (если он был) и запускает новый
// с указанным интервалом. Используется и при старте игры, и при
// переключении между обычной и ускоренной скоростью падения.
// Если фигура уже на дне (isFalling === false) — ничего не делает,
// чтобы случайно не "оживить" посаженную фигуру.
function startFallTimer(intervalMs) {
  if (!isFalling) {
    return;
  }
  if (fallTimer !== null) {
    clearInterval(fallTimer);
  }
  fallTimer = setInterval(dropStep, intervalMs);
}

// === Управление клавиатурой ===
// Пытается сдвинуть фигуру на deltaCol колонок по горизонтали.
// deltaCol = -1 → влево, deltaCol = +1 → вправо.
// Все проверки границ делаются ДО изменения pieceCol —
// если новая позиция выходит за поле, ничего не происходит.
function tryMoveHorizontal(deltaCol) {
  const newCol = pieceCol + deltaCol;

  // Левый край фигуры в координатах поля после сдвига = newCol.
  // Правый край = newCol + (ширина фигуры) - 1.
  // Оба должны лежать внутри поля: от 0 до COLS - 1 включительно.
  const newLeftEdge = newCol;
  const newRightEdge = newCol + tShape[0].length - 1;
  if (newLeftEdge < 0 || newRightEdge >= COLS) {
    return;
  }

  pieceCol = newCol;
  drawBoard();
}

// Слушаем нажатия клавиш на всём документе. event.key —
// имя нажатой клавиши: 'ArrowLeft' / 'ArrowRight' для ←/→,
// 'ArrowDown' для ускоренного падения. Стрелка ↑ и пробел
// пока игнорируются — они зарезервированы под повороты (R-7)
// и мгновенный сброс (R-8).
document.addEventListener('keydown', (event) => {
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

// Отпускание клавиши: для ↓ возвращаем обычную скорость.
// Если фигура к этому моменту уже на дне — startFallTimer
// увидит isFalling === false и просто ничего не сделает.
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
// что скрипт запустился, таймер падения активирован, клавиатура слушается.
console.log("Vault-Tec terminal online. Falling T-piece engaged. Keyboard armed (←/→/↓).");
