# PROGRESS — Журнал прогресса

## Этап 2.2 — git init и первый коммит
- Папка Tetris превращена в Git-репозиторий
- Создан .gitignore
- Первый коммит: 'Initial commit — структура проекта'
- Hash коммита: d5fdb89
- Дата: 2026-05-12

## Этап 2.3-2.6 — Заливка на GitHub
- Создан удалённый репозиторий на GitHub:
  https://github.com/ademko501-ops/Tetris.git
- Ветка переименована: master → main
- Все коммиты залиты в origin/main
- Дата: 2026-05-12
- Visibility: Public

## Модуль 3 · Этап R-1 — Каркас HTML + пустое поле 12×24
- Дата: 13.05.2026
- Сделано: созданы src/index.html, src/style.css, src/game.js
- Результат: при открытии index.html — зелёная сетка 12×24
  на чёрном фоне, заголовок TETRIS VAULT-TEC, в консоли
  браузера сообщение "Vault-Tec terminal online."
- Хеш коммита кода: 4daebe2
- Следующий шаг: R-2 — первая статичная фигура на сетке

## Модуль 3 · Этап R-2 — Первая статичная фигура T на поле
- Дата: 13.05.2026
- Сделано:
  - в `src/game.js` появилась "память" поля — двумерный массив
    `board[24][12]`, заполненный нулями, плюс функция `drawBoard()`,
    которая читает массив и рисует 288 div'ов в `#game-board`.
    Фигура T размещена в верхней части поля (board[1][4..6] и board[2][5]).
  - `src/index.html` — убраны 288 захардкоженных клеток,
    контейнер `#game-board` теперь пустой и наполняется из JS.
  - `src/style.css` — заменён старый трюк с `gap`/`padding` на
    реальные `border` у каждой `.cell`; добавлен класс `.filled`
    с зелёной заливкой и свечением (`box-shadow`).
- Результат: при открытии `index.html` — поле 12×24 с горящей
  зелёной фигурой T в верхней части (три клетки в ряд + одна по центру вниз).
  В консоли: `Vault-Tec terminal online. Static T-piece rendered.`
- Хеш коммита кода: f14466f
- Следующий шаг: R-3 — падение фигуры (анимация по таймеру)

## Модуль 3 · Этап R-3 — Падение фигуры T по таймеру
- Дата: 13.05.2026
- Сделано:
  - в `src/game.js` фигура T теперь падает: появились переменные
    `pieceRow` / `pieceCol` (положение верхне-левого угла фигуры),
    `tShape` (форма в виде 2D-массива — задел под R-7), константа
    `FALL_INTERVAL_MS = 1000`, функция `dropStep()` (один шаг вниз
    с проверкой нижней границы) и `setInterval(dropStep, FALL_INTERVAL_MS)`,
    запускающий таймер. Когда нижний край фигуры упирается в 24-ю строку —
    `clearInterval(fallTimer)` останавливает падение.
  - `drawBoard()` переписана: сначала рисует «стек» (массив `board`,
    пока пустой), потом поверх накладывает падающую фигуру по `pieceRow`/`pieceCol`.
  - `src/style.css` — закрыты долги из аудита R-2: в блоке `:root` заведены
    CSS-переменные `--cell-size`, `--color-bg`, `--color-green`,
    `--color-green-glow`, `--cols`, `--rows`. Все четыре повторения `30px`
    заменены на `var(--cell-size)`; цвета поля идут через `var(--color-green)`
    и `var(--color-green-glow)`. По замечанию пост-аудита R-3 рядом
    с `--color-green-glow` добавлен пояснительный комментарий, связывающий
    `rgba(21,255,0,0.4)` с `#15ff00`.
- Результат: при открытии `index.html` — фигура T появляется сверху по центру,
  раз в секунду опускается на одну строку, доходит до 24-й строки и замирает.
  В консоли: `Vault-Tec terminal online. Falling T-piece engaged.`, при
  достижении дна — `Vault-Tec terminal: T-piece reached the floor.`
- Хеш коммита кода R-3: c90b104
- Хеш коммита фикса по аудиту: e726f17
- Аудиты этапа: `docs/R-2_audit.md` (фон), пост-аудит R-3 — два замечания
  (низкий + средний); средний закрыт фиксом-комментарием, низкий
  (лог при касании дна) отложен до R-4.
- Следующий шаг: R-4 — стек: фиксировать фигуру на дне и спавнить новую сверху

## Модуль 3 · Этап R-4 — Управление фигурой стрелками ← / →
- Дата: 13.05.2026
- Сделано:
  - в `src/game.js` появилась функция `tryMoveHorizontal(deltaCol)` —
    смещает `pieceCol` на `deltaCol` колонок, но только если новая позиция
    не выходит за границы поля. Проверка краёв делается **до** изменения
    `pieceCol`, поэтому при «упоре в стенку» фигура просто не движется,
    без ошибок.
  - `document.addEventListener('keydown', ...)` слушает нажатия клавиш:
    `event.key === 'ArrowLeft'` → `tryMoveHorizontal(-1)`,
    `event.key === 'ArrowRight'` → `tryMoveHorizontal(+1)`. Остальные
    клавиши пока игнорируются — это задел под `ArrowUp` (повороты, R-8)
    и `Space` (быстрый сброс).
  - таймер падения из R-3 не тронут — фигура продолжает падать сама,
    а игрок при этом может двигать её по горизонтали.
- Результат: при открытии `index.html` — фигура T падает раз в секунду,
  стрелки ← / → двигают её влево / вправо, у краёв поля фигура упирается
  и не вылезает за границу.
  В консоли: `Vault-Tec terminal online. Falling T-piece engaged. Keyboard armed.`
- Хеш коммита кода R-4: 681a648
- Хеш fix-коммита по аудиту: b052957
- Аудит этапа: vault-reviewer — три замечания низкого приоритета
  (устаревший заголовок `style.css`, избыточное условие `> COLS - 1`,
  магическое `288` в комментарии). Все закрыты одним `fix:`-коммитом
  по протоколу автоисправления (CLAUDE.md).
- Введён новый протокол работы: см. `CLAUDE.md` → «Протокол автоисправления
  после ревью». Низкий/средний — чиним сразу, высокий — стоп и к архитектору.
- Следующий шаг: R-5 — стек: фиксация фигуры на дне и спавн новой сверху

## Модуль 3 · Этап R-5 — Ускоренное падение (soft drop) на ↓
- Дата: 14.05.2026
- Сделано:
  - в `src/game.js` добавлена константа `FAST_FALL_INTERVAL_MS = 100`
    рядом с `FALL_INTERVAL_MS = 1000` — две именованные скорости падения,
    обычная и ускоренная в 10 раз.
  - заведены state-переменные `let fallTimer = null` и `let isFalling = true` —
    идентификатор активного таймера и флаг «фигура ещё падает».
  - введена функция `startFallTimer(intervalMs)` — единая точка
    переключения скорости: останавливает старый таймер через `clearInterval`
    и запускает новый через `setInterval`. Защищена флагом `isFalling`:
    после посадки фигуры таймер уже не «оживить».
  - `dropStep()` при достижении дна теперь ставит `isFalling = false`,
    очищает `fallTimer` и не печатает лог (по аудиту убрали — задел на R-6,
    когда фигур станет много).
  - обработчик `keydown` распознаёт `ArrowDown`: при первом нажатии
    (не `event.repeat`) → `startFallTimer(FAST_FALL_INTERVAL_MS)`.
    `event.repeat` отсекает ОС-автоповторы — переключение делается
    строго один раз.
  - добавлен слушатель `keyup`: на отпускание `ArrowDown` →
    `startFallTimer(FALL_INTERVAL_MS)`, обратно к обычной скорости.
    Если фигура уже упала — `isFalling === false`, и `startFallTimer`
    просто ничего не делает.
  - список обрабатываемых клавиш вынесен в константу
    `CONTROLLED_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowDown']`.
    Используется для двух целей: `preventDefault` (см. ниже про баг)
    и понимание, что вообще трогаем.
  - вычищены долги из аудита: добавлены CSS-переменные
    `--color-amber: #ffb000`, `--font-size-title: 32px`,
    `--letter-spacing-title: 4px` (закрыта дыра по палитре и
    голым числам в `h1`); устаревший комментарий «На этапе R-3» в
    `game.js` обновлён до нейтрального «Стека пока нет».
- Найден баг (#1 в `BUGS.md`): при зажатой ↓ браузер скроллил страницу
  параллельно с ускорением падения — UX-проблема, ревьюер её не поймал.
  Исправлен `event.preventDefault()` в начале `keydown` для клавиш из
  `CONTROLLED_KEYS`. Стрелка ↑ и пробел НЕ заблокированы (зарезервированы
  под R-7 / R-8).
- Результат: при открытии `index.html` — фигура T падает раз в секунду,
  ←/→ двигают её влево/вправо, ↓ ускоряет в 10 раз пока зажата, у дна
  фигура замирает. Страница не скроллится во время игры. Tab / F5 /
  Ctrl+R работают как обычно.
  В консоли: `Vault-Tec terminal online. Falling T-piece engaged. Keyboard armed (←/→/↓).`
- Хеш коммита кода R-5: c3c2327
- Хеш fix-коммита по аудиту R-5 (косметика, низкие/средние): f88a753
- Хеш fix-коммита по багу скролла: 0d92bdf
- Хеш fix-коммита по рефакторингу клавиш (после аудита фикса): d11a4e4
- Хеш docs-коммита `BUGS.md`: c37ec66
- Аудит этапа: vault-reviewer — два прогона. Первый: 2 средних
  (`--color-amber`, переменные шрифта заголовка) + 2 низких (лог в
  `dropStep`, устаревший комментарий) — все закрыты `fix:`-коммитом.
  Второй (после фикса скролла): 1 средний (дублирование списка клавиш)
  + 1 низкий (радиусы свечения в CSS) — средний закрыт `fix:`-ом,
  низкий отложен на ближайшее касание CSS.
- Следующий шаг: R-6 — стек: фиксация фигуры на дне в `board` и спавн новой сверху

## Модуль 3 · Этап R-6 — Стек, столкновения, фиксация фигуры и спавн новой
- Дата: 14.05.2026
- Сделано:
  - бывший `const board` переименован в `const stack` — теперь это
    реально работающий массив осевших блоков, а не пустая заглушка.
  - удалена state-переменная `let isFalling` — на R-6 таймер падения
    живёт всю игру, фигуры сменяют друг друга, флаг «посадилась»
    больше не нужен.
  - появилась функция `canMove(piece, dRow, dCol)` — единая точка
    проверки движения. Возвращает `false`, если хотя бы одна занятая
    клетка `piece` после сдвига окажется (а) за границей поля или
    (б) на занятой клетке стека. Используется во всех точках движения:
    `dropStep` (шаг вниз) и `tryMoveHorizontal` (стрелки ←/→).
  - появилась функция `freezePiece()` — впечатывает занятые клетки
    `tShape` в массив `stack` по координатам `pieceRow / pieceCol`.
    Полагается на инвариант «фигура внутри поля» — guard'ов нет,
    но в комментарии явно написано «вызывать только после неудачной canMove».
  - появилась функция `spawnNewPiece()` — единственное место с
    формулой центрирования по ширине поля. Game Over (новая фигура
    появилась в занятых клетках) пока не обрабатывается — задел на R-11.
  - `dropStep` переписан: `canMove(tShape, 1, 0)` → `pieceRow++`,
    иначе `freezePiece() + spawnNewPiece()`. Таймер при этом НЕ
    останавливается — новая фигура подхватывает темп.
  - `tryMoveHorizontal` теперь проверяет движение через `canMove` —
    фигура упирается не только в стенки, но и в осевшие блоки.
  - `startFallTimer` упрощён: убрана защита через `isFalling`, остался
    только `clearInterval + setInterval`.
  - в startup `spawnNewPiece()` вызывается ДО `drawBoard()` — формула
    центрирования живёт ровно в одном месте.
- Найден баг (#3 в `BUGS.md`): при нажатии пробела браузер скроллил
  страницу примерно на пол-экрана. Аналогичный класс UX-багов, что и
  #1 (со стрелкой ↓ в R-5). Исправлен добавлением `'Space'` в
  `CONTROLLED_KEYS` и переходом всего блока клавиатуры с `event.key`
  на `event.code` — для пробела `event.key === ' '` хрупко в массиве,
  `event.code === 'Space'` читаемее и устойчиво к раскладке.
- Зафиксировано известное ограничение (#2 в `BUGS.md`): если зажать ↓
  и переключить окно (Alt+Tab) — `keyup` не приходит, и таймер залипает
  на ускоренной скорости. Естественное место лечения — R-11
  (`window.addEventListener('blur', ...)`).
- Результат: при открытии `index.html` — фигура T падает, упирается
  в дно — впечатывается в стек, сверху по центру сразу появляется
  новая. Стрелки ←/→ упираются и в стенки, и в осевшие блоки.
  ↓ ускоряет в 10 раз. Пробел больше не скроллит страницу
  (игровая логика пробела появится в R-8).
  В консоли: `Vault-Tec terminal online. Stack initialised. Falling T-piece engaged. Keyboard armed (←/→/↓).`
- Хеш коммита кода R-6: cfcb7a8
- Хеш fix-коммита по аудиту R-6 (косметика, средние/низкие): 1d9f9c4
- Хеш docs-коммита `BUGS.md` с известным ограничением #2: 51dc651
- Хеш fix-коммита по багу пробела (#3): 8be4ff8
- Хеш docs-коммита `BUGS.md` с записью #3: 6ece150
- Аудит этапа: vault-reviewer — два прогона.
  Первый (после кода R-6): 2 средних (`freezePiece` без явного guard,
  stuck-↓ при потере фокуса) + 2 низких (дублирование формулы
  центрирования, допущение прямоугольной формы piece). Средние закрыты
  `fix:`-коммитом и записью в `BUGS.md`, низкие — комментариями.
  Второй (после фикса пробела): **0 замечаний**, ревьюер вернул «чисто».
- Следующий шаг: R-7 — все 7 классических тетромино (I, O, T, S, Z, L, J) и случайный выбор

## Модуль 3 · Этап R-7 — Семь тетромино + 7-bag
- Дата: 14.05.2026
- Сделано:
  - вместо единственной `tShape` появился `const SHAPES` — массив
    из 7 объектов `{id, shape}` для I, O, T, S, Z, L, J. Размеры:
    I = 1×4, O = 2×2, остальные = 2×3. Цвет фигуры в JS НЕ
    дублируется — он живёт только в CSS-переменной `--color-piece-<id>`,
    связь между JS и CSS идёт через id-букву (single source of truth).
  - `stack[r][c]` сменил тип: вместо `0/1` теперь `null` (пусто) или
    строка-id (`'T'`, `'I'`, ...) — это нужно, чтобы после фиксации
    клетки помнили цвет фигуры, к которой принадлежали.
  - появились state-переменные: `currentShape`, `currentPieceId` (для
    текущей падающей фигуры) и `currentBag` (массив ещё не выданных
    фигур из текущего мешка).
  - `createBag()` — копирует `SHAPES` через `.slice()` и тасует
    Фишером–Йетсом (`Math.floor(Math.random() * (i+1))` + swap через `tmp`).
  - `getNextPiece()` — если мешок пуст, пересоздаёт его; затем
    `shift()` первый элемент. Это и есть «7-bag»: внутри каждых семи
    спавнов выпадает РОВНО каждая из семи фигур.
  - `spawnNewPiece()` теперь использует `getNextPiece()`, прописывает
    `currentShape` / `currentPieceId`, центрирует по ширине НОВОЙ фигуры
    (`currentShape[0].length`).
  - `canMove(shape, dRow, dCol)` — параметр переименован `piece → shape`
    для семантической точности; проверка стека `=== 1` → `!== null`.
  - `freezePiece()` теперь пишет в стек `currentPieceId` (строку) вместо `1`.
  - `drawBoard()` для каждой непустой клетки навешивает два класса:
    `filled` (структура) + `piece-<id>` (цвет фон + свечение).
  - в `style.css` добавлены: 7 переменных `--color-piece-I/O/T/S/Z/J/L`
    (палитра R-7), 7 правил `.piece-<X>`, плюс структурные переменные
    `--glow-radius-sm: 8px` и `--spacing-base: 20px` (по аудиту).
  - `.filled` упрощён до структурного класса — `position` + `z-index`
    без цвета. Цвет даёт исключительно `.piece-<X>`.
- Найден баг (#?): нет в этом этапе, прогон чистый по этой части.
- Аудит этапа: vault-reviewer — 5 замечаний (3 средних + 2 низких).
  Закрыты:
    - **средний #1** (цвет L #5A3A22 плохо читался на тёмном фоне) —
      сменён на `#C77B3A` (светлая ржавчина) `fix:`-коммитом по
      согласованию архитектора. Цвет T #1F4E8C оставлен как
      фирменный синий Vault (решение архитектора).
    - **средний #2** (`h1 text-shadow` не использует `--glow-radius-sm`)
      и **средний #3** (`20px` как magic в `body` и `h1`) —
      закрыты `fix:`-коммитом 7d0946c: введена `--spacing-base: 20px`,
      `h1` теперь использует `--glow-radius-sm` и `--spacing-base`.
    - **низкий #4** (7 правил `.piece-X` можно сократить через
      `--piece-color` на элементе) — сознательно не правлен:
      по согласованию архитектора выбран вариант A (явность важнее DRY),
      reviewer сам пишет «оставить как есть».
    - **низкий #5** (порядок `console.log` после `startFallTimer`) —
      reviewer сам пишет «ничего не менять, просто знать».
- Результат: при открытии `index.html` — падают разные тетромино
  разных цветов (I-зелёный, O-жёлтый, T-синий Vault, S-лаймовый,
  Z-кирпично-красный, J-рыжий-коричневый, L-светлая ржавчина),
  после фиксации цвет в стеке сохраняется. 7-bag честно крутит
  все семь форм. Стрелки ←/→/↓ и блокировка пробела — без регрессий.
  В консоли: `Vault-Tec terminal online. Seven-piece bag loaded. Stack initialised. Keyboard armed (←/→/↓).`
- Хеш коммита кода R-7: 98533be
- Хеш fix-коммита по аудиту (косметика, средние #2/#3): 7d0946c
- Хеш fix-коммита по цвету L (средний #1): ddab61b
- Следующий шаг: R-8 — повороты фигур по стрелке вверх и мгновенный сброс по пробелу

## Модуль 3 · Этап R-8 — Поворот фигур по часовой + SRS wall kicks
- Дата: 15.05.2026
- Сделано:
  - матрицы фигур в `SHAPES` расширены до **канонических SRS-квадратных
    рамок**: I = 4×4 с фигурой в строке 1, O = 2×2 (без паддинга),
    остальные = 3×3 с нулевой нижней строкой. Это обязательное условие
    для прямого применения стандартной таблицы wall kicks: центр вращения
    совпадает с центром бокса, размер при повороте не меняется.
  - **T переориентирована** с R-7-вида `[[1,1,1],[0,1,0]]` (cap-down)
    на канонический SRS-вид `[[0,1,0],[1,1,1],[0,0,0]]` (cap-up). Это
    плановое следствие варианта (B), согласовано с архитектором: позволяет
    нашему state 0 совпадать с canonical SRS state 0, без сдвига индекса
    в таблице кикков. Других фигур переориентация не коснулась — только T.
  - **I визуально спавнится на одну строку ниже** верха поля (cells в
    row 1 4×4-бокса вместо row 0 1×4-матрицы из R-7). Тоже плановое
    следствие канонической рамки.
  - добавлена state-переменная `let currentRotation;` (целое 0..3:
    0=spawn, 1=R, 2=180°, 3=L). Сбрасывается в 0 в `spawnNewPiece()`.
    Инкрементируется `% 4` при успешном повороте, используется как
    индекс в `SRS_KICKS`.
  - **`rotateMatrix(shape)`** — чистая функция CW-поворота через формулу
    `result[c][rows-1-r] = shape[r][c]`. Возвращает НОВУЮ матрицу,
    исходную не трогает.
  - **`SRS_KICKS`** — стандартная таблица wall kicks из Super Rotation
    System (публичный стандарт, см. Tetris Wiki). Две семьи: `I`
    (особая, фигура «длинная») и `JLSTZ` (общая). Каждая = массив из 4
    from-состояний по 5 пар `[dCol, dRow]`. Все 40 пар сверены с каноном.
    Конвертированы из SRS-нотации `(x, y_up)` в нашу через `dRow = -y_up`.
    Это спецификация, не магия — в комментарии явно прописано.
  - **`tryRotate()`** — алгоритм SRS: для O `return` сразу (поворот не
    виден); иначе `rotated = rotateMatrix(currentShape)`, выбор таблицы
    по `currentPieceId === 'I'`, перебор пяти кикков для `currentRotation`.
    Первый сдвиг, где `canMove(rotated, dRow, dCol) === true` —
    применяется (currentShape, currentRotation `% 4`, pieceCol, pieceRow
    обновляются, drawBoard). Ни один не сработал — `return` без эффектов.
  - в `CONTROLLED_KEYS` добавлен `'ArrowUp'`. В `keydown` новая ветка
    `event.code === 'ArrowUp'` → `tryRotate()` с защитой `event.repeat`
    (поворот строго на одно нажатие, удержание не крутит беспрерывно).
  - сигнатуры `canMove`, `freezePiece`, `spawnNewPiece`, `getNextPiece`
    НЕ менялись (как обещано в плане этапа).
- Аудит этапа: vault-reviewer — 4 замечания (1 высокий + 2 средних + 1 низкий-подтверждение).
  Reviewer построчно сверил все 40 пар `SRS_KICKS` с каноном Tetris Wiki —
  совпадают. Подтвердил корректность `rotateMatrix`, `tryRotate`, отсутствие
  регрессий от расширения SHAPES, корректность защиты `event.repeat`.
  Закрытие:
    - **высокий #1** (цвета T `#1F4E8C` и Z `#B22222` вне палитры Pip-Boy) —
      по согласованию архитектора **подтверждены**: T = фирменный
      Vault-Tec blue, Z = классический Nuka-Cola red. Зафиксировано
      `fix:`-коммитом в `CLAUDE.md` (новый раздел «Палитра тетромино —
      архитектурное решение», все 7 цветов с обоснованием + явное
      правило для reviewer'а «не флагать как выходящие из Pip-Boy»).
    - **средний #2** (`h1 margin: ... 0 30px 0` — голое число) и
      **средний #3** (`#game-board box-shadow: 0 0 20px ...` — голое
      число) закрыты `fix:`-коммитом `f77d89d`: введены переменные
      `--spacing-title-bottom: 30px` и `--glow-radius-lg: 20px` в `:root`.
    - **низкий #4** — это не замечание, а подтверждение от reviewer'а:
      `event.repeat` для ↑ и ↓ независимы, конфликта при одновременном
      удержании нет.
- Результат: при открытии `index.html` — стрелка ↑ поворачивает фигуру
  по часовой; у стен и стека работают SRS wall kicks (фигура «отскакивает»
  от препятствия, пробуя 5 позиций); O при ↑ не шевелится (это норма SRS);
  T спавнится cap-up (отличие от R-7); I спавнится на 1 строку ниже; ↓/←/→
  без регрессий; одновременное ↑+↓ — без конфликтов.
  В консоли: `Vault-Tec terminal online. Seven-piece bag loaded. Stack initialised. Keyboard armed (←/→/↑/↓).`
- Хеш коммита кода R-8: c3bc4cd
- Хеш fix-коммита по аудиту (косметика, средние #2/#3): f77d89d
- Хеш fix-коммита с цветовой политикой в CLAUDE.md (закрытие высокого #1): 56a9e6d
- Следующий шаг: R-9 — мгновенный сброс пробелом (hard drop) и/или удаление заполненных линий

## Модуль 3 · Этап R-9 — Hard drop + удаление линий
- Дата: 15.05.2026
- Сделано:
  - **`freezePiece` расширен:** в самом конце функции (после записи
    клеток текущей фигуры в стек) добавлен `return clearLines();`.
    Подпись расширилась до `freezePiece(): number` — возвращает
    количество удалённых линий, пригодится в R-10 для подсчёта
    очков. `freezePiece` НЕ в списке защищённых сигнатур, расширение
    согласовано.
  - **Новая функция `clearLines()`:** двухпроходный алгоритм без
    `splice`/`unshift` (вариант A, согласованный с архитектором).
    Первый цикл собирает в локальный `keptRows` строки, где хотя бы
    одна клетка `=== null` (полные строки автоматически выпадают
    из набора). Второй цикл переписывает `stack[r]` по индексам:
    сверху `cleared = ROWS - keptRows.length` новых пустых строк
    (`Array(COLS).fill(null)`), ниже — `keptRows[r - cleared]`
    в том же порядке. Возвращает `cleared` (0..4 за одну фиксацию).
    `stack` — `const`, поэтому переприсваиваем элементы по индексам,
    а не меняем длину.
  - **Новая функция `hardDrop()`:** мгновенный сброс пробелом.
    `while (canMove(currentShape, 1, 0)) pieceRow++;` крутит цикл до
    упора (дно или стек), затем `freezePiece(); spawnNewPiece(); drawBoard();` —
    те же три шага, что во `freeze`-ветке `dropStep`. Никакого таймера,
    никаких промежуточных кадров — всё в одном тике обработчика. Если
    фигура уже на дне (canMove сразу false) — цикл не делает ни одного
    шага, остальные три вызова отрабатывают.
  - **В `keydown`** добавлена ветка `else if (event.code === 'Space')`
    с защитой `event.repeat` (один пробел = один drop, удержание не
    запускает каскад из десятков). Внутри — `hardDrop()`. Прежний
    комментарий «Space — намеренно нет ветки» удалён.
  - **Console-маяк** дополнен: `(←/→/↑/↓)` → `(←/→/↑/↓/Space)`.
  - **Что не менялось:** SHAPES, 7-bag (createBag, getNextPiece,
    currentBag), currentRotation, rotateMatrix, tryRotate, SRS_KICKS,
    canMove, spawnNewPiece, dropStep (только комментарий), startFallTimer,
    tryMoveHorizontal, CONTROLLED_KEYS (`Space` там с R-6),
    `keyup`-обработчик, CSS, index.html.
- Аудит этапа: vault-reviewer — 3 замечания (1 средний + 2 низких).
  Reviewer подтвердил: `clearLines` корректен (off-by-one отсутствует,
  работа с `const stack` через переприсваивание правильная), `hardDrop`
  всегда завершается, `event.repeat` для Space идентичен ArrowUp,
  JS однопоточен → ↓+Space без двойной фиксации, edge cases отработаны.
  Закрытие:
    - **средний #1** (`hardDrop` не останавливает таймер) — reviewer
      сам рекомендовал отложить, см. «Известный задел» ниже.
    - **низкий #2** (`clearLines` хранит прямые ссылки на строки stack
      в `keptRows` — конфликта нет, но хрупко к будущим правкам)
      закрыт `fix:`-коммитом `1d47aa3`: `keptRows.push(row)` →
      `keptRows.push(row.slice())`, защитная копия + поясняющий
      комментарий.
    - **низкий #3** (`pieceRow = 0` и `/2` в `spawnNewPiece` — голые
      числа) — reviewer сам пишет «вкусовщина, оставить как есть.
      `SPAWN_ROW` сделать в R-11, если понадобится смещать спавн».
- **Известный задел на R-11:** `hardDrop` не останавливает таймер
  падения перед `freezePiece`. Сейчас это не баг (JS однопоточен,
  двойной фиксации не происходит) и соответствует канону Тетриса:
  если ↓ зажат при пробеле, новая фигура продолжит падать ускоренно.
  Но когда в R-11 появится **lock delay** (короткая пауза перед
  фиксацией для возможности подкорректировать положение) или Game
  Over с остановкой игры, `hardDrop` нужно будет расширить явной
  парой `clearInterval` → `startFallTimer` вокруг `freezePiece` +
  `spawnNewPiece`. Reviewer рекомендовал отложить до lock delay.
- Результат: при открытии `index.html` — пробел мгновенно роняет
  фигуру до упора и фиксирует её, сразу спавнится следующая. Полные
  строки исчезают, всё что выше — проваливается. Удержание пробела
  не каскадит, один пробел = один drop. Soft drop / стрелки / повороты —
  без регрессий. В консоли: `Vault-Tec terminal online. Seven-piece bag loaded. Stack initialised. Keyboard armed (←/→/↑/↓/Space).`
- Хеш коммита кода R-9: 970b31e
- Хеш fix-коммита по аудиту (защитная копия в clearLines, низкий #2): 1d47aa3
- Следующий шаг: R-10 — счёт очков и счётчик удалённых линий (за каждую очищенную строку, бонус за «Tetris» = 4 строки разом).

## Модуль 3 · Этап R-10 — Очки, уровень, табло (раздел добавлен «догоном» 16.05.2026)
- Дата работы по этапу: 15.05.2026
- Примечание: в момент закрытия R-10 раздел PROGRESS пропустили
  по нашей ошибке (закоммитили только Stage_R-10.pdf, доки откладывали
  «подтверди — продолжаю?» — подтверждения не дождались, ушли в R-11).
  Догоняем сейчас, перед закрытием R-11, чтобы хронология
  PROGRESS была непрерывной.
- Сделано:
  - **HTML** (`src/index.html`): поле `#game-board` обёрнуто в
    `<div id="game-wrapper">` (flex row). Рядом с полем — новый
    `<aside id="score-panel">` с тремя `.panel-row`: SCORE, LEVEL, LINES.
    Каждая строка содержит `.panel-label` (метка) и `.panel-value`
    (число с уникальным id: `score-value` / `level-value` / `lines-value`).
    В HTML значения стартуют как «0» — заглушка, пока JS не отрисует.
  - **CSS** (`src/style.css`): шесть новых переменных в `:root` для
    параметров табло — `--panel-min-width: 140px`, `--panel-gap-h: 30px`
    (между полем и панелью), `--panel-gap-v: 20px` (между строками),
    `--font-size-panel-label: 14px`, `--font-size-panel-value: 28px`,
    `--letter-spacing-panel-label: 2px`. Комментарий у `--color-amber`
    обновлён: задел стал применением (цифры табло — янтарные, по
    рекомендации vault-reviewer ещё с R-5). Новые правила:
    `#game-wrapper` (flex + gap), `#score-panel` (тёмный фон, зелёная
    рамка, свечение `--glow-radius-lg`, padding `--spacing-base`),
    `.panel-row` (column), `.panel-label` (зелёная, мелкая, в разрядку),
    `.panel-value` (янтарная, крупная, со свечением).
  - **JS** (`src/game.js`):
    - **Переименование констант скорости:** `FALL_INTERVAL_MS` →
      `BASE_FALL_INTERVAL_MS` (1000 мс — обычная скорость на уровне 0).
      Добавлены `LEVEL_SPEED_STEP_MS = 80`, `MIN_FALL_INTERVAL_MS = 100`.
      `FAST_FALL_INTERVAL_MS = 100` (soft drop) НЕ менялся.
    - **Новые константы:** `LINE_SCORES = [0, 40, 100, 300, 1200]`
      (таблица Nintendo NES), `LINES_PER_LEVEL = 10`.
    - **Новые state-переменные:** `let score = 0`, `let linesTotal = 0`,
      `let level = 0` рядом с другими state.
    - **Новая `computeFallInterval(currentLevel)`:** линейная кривая
      `max(MIN_FALL_INTERVAL_MS, BASE_FALL_INTERVAL_MS - currentLevel * LEVEL_SPEED_STEP_MS)`.
      На уровне 0 → 1000 мс, на уровне 12 → 100 мс (cap), дальше всё
      на минимуме.
    - **Новая `applyCleared(count)`:** при `count > 0` начисляет
      `score += LINE_SCORES[count] * (level + 1)`, инкрементирует
      `linesTotal`, пересчитывает `level = Math.floor(linesTotal / LINES_PER_LEVEL)`,
      при level-up зовёт `startFallTimer(computeFallInterval(level))`.
      В конце — `drawScorePanel()`.
    - **Новая `drawScorePanel()`:** обновляет `.textContent` трёх
      DOM-элементов табло.
    - **DOM-cache:** ссылки `scoreEl` / `levelEl` / `linesEl` через
      `document.getElementById` объявлены один раз при загрузке
      файла — `drawScorePanel` обращается к закэшированным, а не
      ищет в DOM при каждом вызове.
    - **`dropStep`, `hardDrop`:** `freezePiece()` → `const cleared = freezePiece(); applyCleared(cleared);` —
      впервые читается возвращаемое значение `freezePiece` из R-9.
    - **`keyup` ↓:** `startFallTimer(FALL_INTERVAL_MS)` →
      `startFallTimer(computeFallInterval(level))` — «обычная»
      теперь зависит от уровня.
    - **Startup:** добавлен `drawScorePanel()` для синхронизации
      первого кадра табло. `startFallTimer(...)` теперь принимает
      `computeFallInterval(level)`. Console-маяк дополнен
      «Score panel armed».
- Аудит этапа: vault-reviewer — 6 замечаний (3 средних + 3 низких).
  Высоких не было.
  Закрыты fix-коммитом `20d53fd`:
    - **средний #1** (`applyCleared` зовёт `drawScorePanel()` при
      `count === 0` — лишние DOM-обращения каждую фиксацию без линий)
      — `drawScorePanel()` перенесён внутрь блока `if (count > 0)`.
    - **средний #2** (`drawScorePanel` ищет 3 элемента через
      `getElementById` при каждом вызове) — введены модульные const
      `scoreEl` / `levelEl` / `linesEl`, кэширование один раз при загрузке.
    - **средний #3** (нет защиты от `count > 4` — если контракт
      `clearLines` сломают, `LINE_SCORES[5] === undefined → score = NaN`
      навсегда) — добавлен clamp `if (count > 4) count = 4;`.
    - **низкий #6** (`.panel-row` без `align-items` — при добавлении
      иконки растянулась бы) — `align-items: flex-start` с однострочным
      комментарием.
  Не правились:
    - **низкий #4** (`--panel-min-width: 140px` может оказаться мало
      при счёте 7+ цифр) — reviewer сам пишет «оставить, проверить при R-11».
    - **низкий #5** (регрессия soft drop при level-up — таймер
      перебивает FAST на скорость уровня) — отложено reviewer'ом
      «до R-11 при общем рефакторинге состояния».
  Бонус-наблюдение reviewer'а (не замечание): `FAST_FALL_INTERVAL_MS == MIN_FALL_INTERVAL_MS == 100`
  → на уровне 12+ soft drop перестаёт давать ускорение. Не баг,
  известное ограничение.
- Заделы на R-11 (закрыты в R-11):
  - **`--panel-min-width`** — пересмотрен с 140px на 170px (4 строки + запас).
  - **Soft drop при level-up** — закрыт через флаг `isSoftDropping`,
    `applyCleared` теперь выбирает `FAST` или скорость уровня
    в зависимости от его значения.
  - **`FAST == MIN`** — известное ограничение, не закрывается в R-11
    (это сознательное архитектурное решение).
- Результат: при открытии `index.html` — справа от поля появляется
  зелёная панель с тремя метками (SCORE / LEVEL / LINES) и янтарными
  значениями. Очистка линии увеличивает SCORE по таблице Nintendo
  (40 / 100 / 300 / 1200 × (level+1)). После 10 линий — LEVEL = 1,
  падение ускоряется. Hard drop / soft drop / повороты — без регрессий.
  В консоли: `Vault-Tec terminal online. Seven-piece bag loaded. Stack initialised. Score panel armed. Keyboard armed (←/→/↑/↓/Space).`
- Хеш коммита кода R-10: 125083c
- Хеш fix-коммита по аудиту (3 средних + низкий #6): 20d53fd
- Хеш коммита Stage_R-10.pdf: 971e0fb
- Следующий шаг: R-11 — Game Over с экраном, перезапуск по клавише R, lock delay 500мс перед фиксацией (как в NES), best score через localStorage. Финал Модуля 5.

## Модуль 3 · Этап R-11 — Game Over + lock delay (финал Модуля 5)
- Дата: 16.05.2026
- Сделано:
  - **HTML** (`src/index.html`): внутри `#game-wrapper` добавлен
    `<div id="game-over-screen" hidden>` рядом с `#game-board`.
    Внутри — `<div class="game-over-title">GAME OVER</div>`,
    `<div class="game-over-score-row">` (label «SCORE» + value
    `id="game-over-score-value"`), `<div class="game-over-hint">PRESS R TO RESTART</div>`.
    Атрибут `hidden` — стартовое состояние. В `#score-panel` добавлена
    четвёртая `.panel-row` BEST (id `best-value`).
  - **CSS** (`src/style.css`):
    - `--panel-min-width: 140px` → `170px` (закрытие задела R-10:
      четыре строки + запас под счёт 6-7 цифр).
    - Новые переменные шрифтов Game Over: `--font-size-gameover-title: 36px`,
      `--font-size-gameover-score: 32px`, `--font-size-gameover-hint: 14px`,
      `--game-over-score-gap: 4px`, `--letter-spacing-gameover-hint: 2px`.
    - Глобальное правило `[hidden] { display: none !important; }` —
      чтобы атрибут `hidden` надёжно перебивал `display: flex`
      у `#game-over-screen`.
    - Новые правила: `#game-over-screen` (размер через
      `calc(var(--cell-size) * var(--cols)/var(--rows))` — совпадает
      с полем, layout не прыгает при swap), `.game-over-title`,
      `.game-over-score-row` / `.game-over-score-label` / `.game-over-score-value`,
      `.game-over-hint`.
  - **JS** (`src/game.js`):
    - **Новые константы:** `LOCK_DELAY_MS = 500`,
      `BEST_SCORE_KEY = 'tetris-vault-best-score'`.
    - **Новые state-переменные:** `lockDelayTimer = null`,
      `bestScore = 0`, `isSoftDropping = false`, `isGameOver = false`.
    - **Новые DOM-ссылки (закэшированы):** `bestEl`, `gameBoardEl`,
      `gameOverScreenEl`, `gameOverScoreEl`.
    - **Lock delay (NES-канон):**
      - `armLockDelay()` — `setTimeout(performLock, LOCK_DELAY_MS)`
        если ещё не активен. Сами движения НЕ перезапускают
        (никакого «infinite stall» из современного SRS).
      - `cancelLockDelay()` — clearTimeout + `lockDelayTimer = null`.
      - `performLock()` — что делает таймер по истечении:
        `lockDelayTimer = null` → `freezePiece` → `applyCleared`
        → `spawnNewPiece` → проверка Game Over (`canMove(0,0)`)
        → `drawBoard`.
    - **Game Over:**
      - `triggerGameOver()` — `isGameOver = true`, clearInterval(fallTimer)
        + `fallTimer = null`, `cancelLockDelay()`, обновление `bestScore`
        и `saveBestScore` (если побит), `drawScorePanel`,
        запись итогового `score` в `gameOverScoreEl`, swap
        `gameBoardEl.hidden = true` / `gameOverScreenEl.hidden = false`.
      - `resetGame()` — `cancelLockDelay()` (страховка), сброс state
        партии (score / linesTotal / level / isSoftDropping = 0),
        очистка `stack` через `stack[r] = Array(COLS).fill(null)`,
        `currentBag = []`, `spawnNewPiece()`, swap экранов обратно,
        `drawBoard` + `drawScorePanel`, `startFallTimer(computeFallInterval(level))`.
    - **localStorage best score:**
      - `loadBestScore()` — try/catch вокруг getItem + parseInt
        с фоллбэком на 0 (защита от NaN, отрицательных значений,
        приватного режима браузера).
      - `saveBestScore(value)` — try/catch вокруг setItem; в catch
        намеренно пусто (без console.warn — чтобы не пугать в
        приватном режиме).
      - Используется в startup (один раз: `bestScore = loadBestScore()`)
        и в `triggerGameOver` (если score побил).
    - **Изменения существующих функций (все с guards `if (isGameOver) return;`):**
      - `applyCleared`: при level-up `startFallTimer(isSoftDropping ? FAST_FALL_INTERVAL_MS : computeFallInterval(level))`
        — закрытие задела R-10.
      - `dropStep`: guard + при `canMove(1,0)` → `pieceRow++ + cancelLockDelay() + drawBoard()`;
        иначе → `armLockDelay()` (поле НЕ перерисовывается, фигура висит).
      - `hardDrop`: guard + `cancelLockDelay()` в начале, после spawn —
        проверка `canMove(0,0)` → `triggerGameOver` при collision;
        в конце — `startFallTimer(isSoftDropping ? FAST : computeFallInterval(level))`
        — закрытие задела R-9.
      - `tryMoveHorizontal`: guard + после успешного move
        `if (canMove(1,0)) cancelLockDelay()`.
      - `tryRotate`: guard + аналогичная отмена lock delay
        после успешного поворота.
      - `drawScorePanel`: добавлено `bestEl.textContent = bestScore`.
      - `keydown`: после preventDefault — `if (isGameOver) { if (KeyR && !event.repeat) resetGame(); return; }`.
        В ↓ — `isSoftDropping = true`.
      - `keyup`: при ↓ → `isSoftDropping = false`,
        `if (!isGameOver) startFallTimer(computeFallInterval(level))`.
      - Внутри `drawBoard` локальный `boardEl = document.getElementById('game-board')`
        убран — функция работает напрямую через закэшированный
        `gameBoardEl` (по аудиту прогона 2).
    - **Startup:** добавлен `bestScore = loadBestScore()` перед
      первой отрисовкой табло. Console-маяк дополнен про lock delay,
      best score и подсказку «R to restart on Game Over».
- Закрытие заделов:
  - **R-9** (hardDrop не останавливает таймер перед freeze) — закрыт:
    `hardDrop` теперь явно перезапускает fall таймер через `startFallTimer`
    в конце функции, после spawn новой фигуры.
  - **R-10** (`--panel-min-width: 140px` мало с 4 строками) — закрыт:
    `--panel-min-width: 170px`.
  - **R-10** (soft drop теряется при level-up) — закрыт: флаг
    `isSoftDropping`, `applyCleared` сохраняет FAST если он активен.
  - **R-10** (`FAST == MIN` на уровне 12+) — НЕ закрыт, остаётся
    как известное ограничение архитектора (сознательный выбор:
    soft drop = FAST_FALL_INTERVAL_MS, скорость уровня cap'ится
    на той же отметке).
- Аудит этапа: vault-reviewer — **два прогона**.
  - **Прогон 1** (после кода `d475a6a`): 3 замечания (1 средний + 2 низких).
    Высоких не было. Закрыты fix-коммитом `e9ecedd`:
    - **низкий #1** (`gap: 4px` без переменной в `.game-over-score-row`)
      — введена `--game-over-score-gap: 4px`.
    - **средний #2** (`performLock`: applyCleared при level-up
      может поднять fall-таймер, который тут же убивается
      `triggerGameOver` — контр-интуитивно, не баг) —
      добавлен пояснительный комментарий между freezePiece
      и applyCleared.
    - **низкий #3** (`drawBoard` дёргает `document.getElementById('game-board')`
      локально вместо закэшированного `gameBoardEl`) — локальная
      переменная убрана, функция работает напрямую через глобальный кэш.
  - **Прогон 2** (после fix `e9ecedd`): три исправления первого прогона
    закрыты чисто, TDZ-риска нет. Новые 3 замечания, все низкого приоритета.
    Закрыты fix-коммитом `75f3f10`:
    - **низкий #1** (комментарий в `spawnNewPiece` устарел: «Game Over
      пока не обрабатываем — это будет в R-11») — переписан под
      актуальное состояние, явно сказано что caller'ы (performLock /
      hardDrop) делают проверку.
    - **низкий #2** (комментарий к `applyCleared` говорит «Вызывается
      из dropStep и hardDrop», но после R-11 dropStep делегирует
      через performLock) — исправлено.
    - **низкий #3** (`.game-over-hint` использует
      `--letter-spacing-panel-label` — семантически чужое владение)
      — введена `--letter-spacing-gameover-hint: 2px`, у подсказки
      теперь собственная переменная.
- Результат: при открытии `index.html` — справа от поля табло
  с четырьмя строками (SCORE / LEVEL / LINES / BEST), BEST подтягивается
  из localStorage. Фигура у дна висит 500 мс (lock delay) — за это
  время можно сдвинуть/повернуть; если ушла над выемку (`canMove(1,0)`
  снова true), таймер сбрасывается. Hard drop игнорирует lock delay,
  фиксирует мгновенно. При collision на спавне — экран GAME OVER
  заменяет поле, показывает итоговый счёт и подсказку. R рестартует
  партию, обновлённый BEST сохраняется в localStorage. В Game Over
  все игровые клавиши игнорируются, только R работает.
  В консоли: `Vault-Tec terminal online. Seven-piece bag loaded. Stack initialised. Score panel armed. Lock delay armed. Best score loaded. Keyboard armed (←/→/↑/↓/Space, R to restart on Game Over).`
- Хеш коммита кода R-11: d475a6a
- Хеш fix-коммита по аудиту прогона 1 (средний + 2 низких): e9ecedd
- Хеш fix-коммита по аудиту прогона 2 (3 низких): 75f3f10
- Хеш docs-коммита R-10 (догон): 3b6a10d

### Заделы на R-12 (по рекомендациям vault-reviewer)
1. **Упростить шапку `game.js`** — сейчас в начале файла
   многострочный комментарий с целями этапа R-11 (наследие
   итеративной разработки). Перед R-12 (стилизация / полиш) имеет
   смысл оставить только актуальное описание текущего состояния
   модуля; история этапов уже в `PROGRESS.md`, дублирование не
   нужно.
2. **`--border-ui: 1px solid var(--color-green)`** —
   значение `1px solid var(--color-green)` повторяется в трёх
   местах `style.css`: рамка клетки `.cell`, рамка табло `#score-panel`,
   рамка экрана `#game-over-screen`. Если в R-12 полиш затронет
   рамки (например, толщина 2px или стиль `dashed`), править придётся
   в трёх местах. Кандидат на одну CSS-переменную — но только если
   R-12 действительно будет трогать рамки.

Оба пункта — низкий приоритет, не блокируют R-12. Зафиксированы
здесь, чтобы не потерялись.

- Следующий шаг: R-12 — стилизация / полиш. Финал учебной игры
  до упаковки в Electron.

