// =====================================================
// Tetris Vault-Tec — game logic, stage R-3
// Цель этапа: фигура T падает сверху вниз по таймеру.
// Раз в FALL_INTERVAL_MS мс опускается на одну строку.
// Доходит до нижнего края поля и останавливается.
// Стека пока нет — board заполнен нулями.
// =====================================================

// === Размеры поля ===
// ROWS — количество строк (высота),
// COLS — количество колонок (ширина).
// const = "константа", это значение нельзя переназначить.
const ROWS = 24;
const COLS = 12;

// === Скорость падения ===
// Шаг таймера в миллисекундах. 1000 мс = 1 секунда.
// Вынесено в именованную константу — легко поменять скорость.
const FALL_INTERVAL_MS = 1000;

// === "Память" поля: двумерный массив board ===
// board[row][col] хранит число:
//   0 — клетка пустая,
//   1 — клетка занята (часть осевшего стека).
// На этапе R-3 стека ещё нет, массив остаётся целиком нулевым.
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

// === Отрисовка поля в HTML ===
// Перерисовывает поле целиком: 288 div-ов (24 × 12).
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
    clearInterval(fallTimer);
    console.log("Vault-Tec terminal: T-piece reached the floor.");
    return;
  }

  pieceRow++;
  drawBoard();
}

// === Запуск ===
// Тег <script> подключён в конце <body>, поэтому к моменту
// выполнения этой строки HTML уже распарсен и контейнер
// #game-board точно существует на странице.
drawBoard();

// Запускаем таймер: dropStep будет вызываться каждые FALL_INTERVAL_MS мс,
// пока его не остановит clearInterval внутри самого dropStep.
const fallTimer = setInterval(dropStep, FALL_INTERVAL_MS);

// Маяк в консоли DevTools (F12 → Console) — подтверждает,
// что скрипт запустился и таймер падения активирован.
console.log("Vault-Tec terminal online. Falling T-piece engaged.");
