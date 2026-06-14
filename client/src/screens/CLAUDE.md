# Екрани HUD

## 1. Dashboard (`/`)
- ClockBlock — годинник (Furore) + дата зліва, ThemePicker справа
- HeroCard — компактний hero-блок: баланс (Furore, gold border-left), dailyBudget bar, nextRace, sprint-прогрес
- TodayRoutines — inline рядок "Сьогодні: назва · назва" для рутин без `isDoneToday`
- TasksAccordion — акордеон з трьома секціями: **Квести** (sprint/todo, expand за замовчуванням), **Покупки** (shopping, закрито), **Нотатки** (останні 3, тап → /notes, закрито)
  - Анімація закреслення + fade-out при відмітці покупки виконаною
- CarHero — 3D McLaren MP4/5 (Three.js, 260px, OrbitControls + particles)
- FAB — розкривний (rotate 45° при відкритті), 4 опції: **Витрата** / **Квест** / **Покупка** / **Нотатка**; закривається кліком поза меню
- `fetchTransactions()` викликається при mount (баланс завантажується одразу)

## 2. Finance (`/finance`)
- BalanceHero, TodayCard, StatsGrid
- TopupForm, ExpenseForm (модалки) — кастомні категорії з `/api/categories`
- TransactionList — фільтри з анімацією, кожна категорія свого кольору
- ReceiptScanner — сканування чеків через Anthropic Vision API
- RecurringPayments — регулярні платежі з іконками сервісів
- ShoppingTracker — трекер магазинних покупок
- GoalsList + GoalDetail — savings goals з горизонтальним скролом (backend), деталі у модалці
- ExpenseChart — donut chart (Recharts)
- streakStore — streak економії (persist local)

**Логіка бюджету:**
```
dailyBudget = Math.floor(currentBalance / daysLeftToNextSalary)
delta = dailyBudget - todayExpense
bonus = (dailyBudget * daysElapsed) - totalMonthExpense
```

## 3. F1 (`/f1`) — тільки admin (Котька)
- NextRaceCard з TrackSVG (draw-path анімація) + RaceCountdown
- LastRaceCard — останній результат GP (podium + fastest lap), Jolpica API
- RacePredictionCard — прогноз топ-3 для наступної гонки (перед табами)
- RaceCalendarList — 22 гонки 2026, пройдені затемнені, тап → RaceDetail
- ChampionshipTable — 4 таби:
  - **Календар** — RaceCalendarList
  - **Пілоти** — таблиця з фото, expand → DriverStatsCard
  - **Конструктори** — expand → ConstructorStatsCard з PixelCar анімацією
  - **МІЙ СЕЗОН** — MySeasonStats (streak, accuracy, race-by-race)
- McLarenViewer — Three.js
- Маршрути захищені `F1Route` (перевіряє `f1Enabled`)

**F1 Календар:** `/client/src/data/f1Season2026.ts` — 22 гонки.
`trackSvg: string | null` — шлях до SVG або `null`.
SVG траси — `/client/public/tracks/`.
draw-path: наступна гонка `stroke: var(--accent)`, пройдені `stroke: var(--text3)`.

## 4. RaceDetail (`/f1/:round`) — тільки admin
- TopBar: кнопка "← F1" + "Раунд NN"
- TrackSVG треку (accent для майбутніх, text2 для пройдених)
- Базова інфо: прапор, назва, трек, дата, бейджі (НАСТУПНА / ПРОЙДЕНО / SPRINT)
- **CircuitStatsSection** — довжина кола, кількість кіл, дистанція, поворотів, місто, перша гонка; рекорд кола + найбільше перемог (з `circuitData.ts`)
- **SessionScheduleSection** — розклад сесій з Jolpica API (`/2026/{round}.json`), кеш в sessionStorage. Sprint weekend: SecondPractice → "Sprint Qualifying"
- **RaceWeatherSection** — погода з wttr.in (тільки для майбутніх гонок), 6с timeout, silent fail
- **RacePodiumSection** — P1/P2/P3 + fastest lap (тільки для пройдених, дані з useLastRace)

**Дані:** `client/src/data/circuitData.ts` — CircuitInfo (length/laps/distance/turns/city/firstRace/lapRecord/mostWins) для всіх 22 трас; `ROUND_TO_CIRCUIT_ID` маппінг round → circuit key.

## 5. Sprint (`/sprint`)
- WeekHeader — мінімалістичний, фільтрація по дню тапом
- Єдиний список задач: **sprint** / **shopping** / **todo** + уроки (lessonStore)
- Рутини отримують індикатор сповіщень (badge) якщо не виконані сьогодні
- **Фільтр** (`≡`) — панель з dropdown-select:
  - Тип: Всі / Спринт / Покупки / Todo / Уроки
  - Статус: Активні (default) / Завершені / Всі
  - Кнопки "Скинути" та "Готово" в футері
- За замовчуванням — тільки **активні** (не done) задачі
- TaskDetailModal — МІТКИ / ДЕДЛАЙН / ЧЕК-ЛІСТ / ОПИС + LabelPicker
  - Swipe-to-dismiss: imperative `addEventListener('touchmove', fn, { passive: false })`; перевірка `bodyRef.current.scrollTop > 0` перед drag
- Форма додавання: тип + назва + пріоритет (для shopping/todo)
- Категорії спринту (dev/mentorship/personal/learning) — тільки через TaskDetailModal

## 6. ShoppingList (`/shopping`)
- Список покупок з `useShoppingListStore` (localStorage persist)
- Групування по рецептах (recipeId) + окремі ручні додавання
- Чекбокс кожного пункту, кнопка "видалити відмічені", "очистити все"
- Ручне додавання: назва + кількість + одиниця (г/кг/мл/л/шт/ч.л./ст.л.)
- Елементи з рецепту додаються через RecipeDetail → "Додати до списку"

## 7. Recipes (`/recipes`)
- CategoriesSlider — горизонтальний фільтр по категоріях; категорія ховається на картці при активному фільтрі
- Tags фільтр — pill-chips під слайдером
- Instagram 2-column grid рецептів (RecipeCard: фото 4/3 + info блок)
- RecipeCard: category pill, difficulty pill (color-mix: green/gold/red), owner badge, cookTime
- «Що приготувати?» — dice кнопка в scopeActions, рандомний navigate серед видимих
- Scope таби: МОЄ / СІМ'Я / СПІЛЬНОТА + wishlist toggle
- RecipeForm з кастомними chip-пікерами (категорія, складність)
- FAB-група: 📅 Планер / 🔍 Інгредієнти / 🤖 AI-генератор / ➕ Новий рецепт
- `IngredientSearchSheet` — bottom sheet, multi-chip вибір інгредієнтів, swipe-to-dismiss
- body::after прибрано для velvet/pixel/cyber тем (`[data-theme][data-page="recipes"] body::after { display:none }`)

## 8. RecipeDetail (`/recipes/:id`)
- Hero-фото (або noHero header з кнопками)
- Мета: час готування, порції (stepper +/−), калорії, складність
- Кнопки дій: Wishlist heart / Покупки (→ sprintStore shopping) / «Приготував» (flame)
- «Приготував» → `logCook(id)` — POST /api/recipes/:id/cook → CookLog MongoDB; оптимістичне оновлення `cookStats`; показує "Готував N×" + дату останнього разу
- **Таби «Складові» / «Приготування»** — `activeTab: 'ingredients' | 'instructions'` state
  - Складові: `<IngredientIcon ingredient={name} size={38} />` + назва + кількість з перерахунком
  - Приготування: `recipe.instructions[]` або fallback split `recipe.steps` по `\n`
  - Step checklist: `.stepCircle` (number → ✓ на тап), `.stepLine` (vertical connector), `.stepText` (strikethrough when done), «Скинути» кнопка
- Edit / Delete (тільки свої рецепти)

## 8a. MealPlanner (`/recipes/planner`)
- Тижневий вид Пн–Нд поточного тижня, сьогодні підсвічено акцентом
- Тап «Додати» → RecipePicker (bottom sheet з пошуком + swipe-to-dismiss)
- Рецепти по днях зберігаються на бекенді: `GET/PUT /api/meal-plan` (MealPlan модель: userId + plan Map<dayKey, recipeId[]>)
- `useMealPlanStore` — без localStorage persist, authFetch + optimistic local update
- `fetchPlan()` при mount разом з `fetchRecipes()`
- Кнопка «Список покупок (N страв)» → `addFromRecipe` для кожного рецепту → navigate('/shopping')
- Кнопка «Очистити» — очищає всі дні поточного тижня
- BottomNav прихований на `/recipes/planner`

## 9. Watchlist (`/watchlist`)
- Категорії: movie / series / anime / book
- **Tab icons (OpenMoji)**: 🎬 1F3AC / 📺 1F4FA / 🌸 1F338 / 📚 1F4DA — flex-column icon+label; `openmojiUrl(unicode)` → CDN SVG
- Пошук: TMDB API (фільми/серіали/аніме) або backend proxy `/api/books/search` (книги, Google Books з кешем)
- Search overlay: fullscreen backdrop, fixed search bar під AppHeader (`--header-height: 56px`), "Скасувати"
- WatchlistCard — pill-бейдж статусу на постері, book-aware лейбли (ЧИТАЮ / ПРОЧИТАВ)
- WatchlistDetail — status chips (book-aware), StarRating, EpisodesList для серіалів/аніме
- Кастомний постер через ImageUploadButton + Cloudinary

## 10. Memories (`/memories`, `/memories/:id`)
- Список спогадів з обкладинками
- MemoryDetail — фотографії, підписи, обкладинка (setCover)
- Cloudinary upload для фото

## 11. Notes (`/notes`)
- `notesStore` (Zustand, без persist) — `fetchNotes`, `addNote`, `updateNote`, `deleteNote`
- Список нотаток: найновіша зверху, кожна картка — текст (до 3 рядків) + дата (font-mono)
- Пошук: `input` з іконкою — фільтрує локально по `text.includes(query)`, тільки якщо є нотатки
- Тап на картку → inline редагування: `textarea` на місці, `onBlur` + `Enter` зберігають, `Escape` скасовує
- Видалення: кнопка × з'являється при tap/hover
- `autoFocus` flow: при `location.state?.autoFocus === true` одразу відкривається textarea нової нотатки вгорі
- Доступ: FAB "Нотатка" → `/notes?autoFocus=true`, або з TasksAccordion секції НОТАТКИ

## 12. ProfileSelect (`/profile-select`) — публічний маршрут
- Сітка профілів (Котька + Коська)
- Аватар 96px, fallback — перша літера імені
- Тап → `selectProfile(username)` → JWT → redirect `/`
