# Екрани HUD

## 1. Dashboard (`/`)
- ClockBlock — годинник (Furore) + дата зліва, ThemePicker справа
- HeroCard — компактний hero-блок: баланс (Furore, gold border-left), dailyBudget bar, nextRace, sprint-прогрес
- TodayRoutines — inline рядок "Сьогодні: назва · назва" для рутин без `isDoneToday`
- TasksAccordion — акордеон з двома секціями: **Задачі** (sprint, expand за замовчуванням) та **Покупки** (shopping/todo, закрито за замовчуванням)
  - Анімація закреслення + fade-out при відмітці покупки виконаною
- NASA APOD через довгий тап на логотип HUD
- CarHero — 3D McLaren MP4/5 (Three.js, 260px, OrbitControls + particles)
- FAB — розкривний (rotate 45° при відкритті), 3 опції: **Витрата** / **Квест** / **Покупка**; закривається кліком поза меню
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
- MealBanner — блюдо тижня з TheMealDB (кеш по тижню в store)
- MealDetail — повний рецепт у модалці
- CategoriesSlider — горизонтальний фільтр по категоріях
- Instagram-grid рецептів (RecipeCard), фільтр по категорії
- RecipeForm з кастомними пікерами (chip-grid категорій, 3-кнопки складності)
- Тап на картку → RecipeDetail

## 8. RecipeDetail (`/recipes/:id`)
- Hero-фото рецепту (або placeholder)
- Мета: час готування, порції (stepper +/−), калорії, складність, категорія
- Інгредієнти з перерахунком під кількість порцій
- Кнопка "Додати до списку покупок" → `shoppingListStore.addFromRecipe(recipe, servings)`
- Wishlist heart (toggle)
- Edit / Delete (тільки свої рецепти або admin)

## 9. Watchlist (`/watchlist`)
- Категорії: movie / series / anime / book
- Пошук: TMDB API (фільми/серіали/аніме) або backend proxy `/api/books/search` (книги, Google Books з кешем)
- Search overlay: fullscreen backdrop, fixed search bar під AppHeader (`--header-height: 56px`), "Скасувати"
- WatchlistCard — pill-бейдж статусу на постері, book-aware лейбли (ЧИТАЮ / ПРОЧИТАВ)
- WatchlistDetail — status chips (book-aware), StarRating, EpisodesList для серіалів/аніме
- Кастомний постер через ImageUploadButton + Cloudinary

## 10. Memories (`/memories`, `/memories/:id`)
- Список спогадів з обкладинками
- MemoryDetail — фотографії, підписи, обкладинка (setCover)
- Cloudinary upload для фото

## 11. ProfileSelect (`/profile-select`) — публічний маршрут
- Сітка профілів (Котька + Коська)
- Аватар 96px, fallback — перша літера імені
- Тап → `selectProfile(username)` → JWT → redirect `/`
