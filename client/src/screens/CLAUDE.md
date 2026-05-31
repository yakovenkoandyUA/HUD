# Екрани HUD

## 1. Dashboard (`/`)
- ClockBlock — годинник (Furore) + дата зліва, ThemePicker справа
- HeroCard — баланс, dailyBudget, nextRace, sprint-прогрес в одному блоці
- TasksAccordion — акордеон з двома секціями: **Задачі** (sprint, expand за замовчуванням) та **Покупки** (shopping/todo, закрито за замовчуванням)
  - Анімація закреслення + fade-out при відмітці покупки виконаною
- NASA APOD через довгий тап на логотип HUD
- CarHero — 3D McLaren MP4/5 (Three.js, 260px, OrbitControls + particles)
- FAB кнопка — швидке додавання витрати (ExpenseForm модалка)
- `fetchTransactions()` викликається при mount (баланс завантажується одразу)

## 2. Finance (`/finance`)
- BalanceHero, TodayCard, StatsGrid
- TopupForm, ExpenseForm (модалки)
- TransactionList — кожна категорія свого кольору
- ShoppingTracker — трекер магазинних покупок
- GoalsList — savings goals з горизонтальним скролом (backend)
- ExpenseChart — donut chart (Recharts)

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
- Маршрути захищені `AdminRoute`

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
- WeekHeader + SprintProgress (прогрес тижня)
- Єдиний список задач: **sprint** / **shopping** / **todo** + уроки (lessonStore)
- **Фільтр** (`≡`) — панель з dropdown-select:
  - Тип: Всі / Спринт / Покупки / Todo / Уроки
  - Статус: Активні (default) / Завершені / Всі
  - Кнопки "Скинути" та "Готово" в футері
- За замовчуванням — тільки **активні** (не done) задачі
- TaskDetailModal — МІТКИ / ДЕДЛАЙН / ЧЕК-ЛІСТ / ОПИС + LabelPicker
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
- Пошук через TMDB API (фільми/серіали/аніме) та Google Books API
- WatchlistDetail — статус, рейтинг, нагадування
- Кастомний постер через ImageUploadButton + Cloudinary

## 10. Memories (`/memories`, `/memories/:id`)
- Список спогадів з обкладинками
- MemoryDetail — фотографії, підписи, обкладинка (setCover)
- Cloudinary upload для фото

## 11. ProfileSelect (`/profile-select`) — публічний маршрут
- Сітка профілів (Котька + Коська)
- Аватар 96px, fallback — перша літера імені
- Тап → `selectProfile(username)` → JWT → redirect `/`
