# Екрани HUD

## 1. Dashboard (`/`)
- GreetingBlock — привітання + дата (компактніша версія, менше вертикального місця)
- **AiChatSheet** — bottom sheet AI асистент (SSE streaming, Claude Haiku), domain-aware контекст, markdown rendering; відкривається кнопкою в хедері (`AppHeader`), toast-гейт якщо `!activeProfile.isVerified` (бекенд `requireVerified` на `/api/ai/chat`)
- **TodayHabits** — рядок чіпів звичок на сьогодні (крапка-індикатор + іконка часу доби + назва, тап тоглить) + кнопка "детальніше ›" → DayOverlay. Звички тепер живуть тут, **не** в DaySummaryCard — ближче до привітання/погоди, ніж до навігації по модулях
- WeekHeader (7-денний стрип) або RaceHeroCard (якщо гонка цього тижня) — в `.calendarWrap` з `margin-top: 10px`
- RaceCountdownStrip — стрічка відліку до наступної гонки (тільки якщо `f1Enabled && nextRace && !raceThisWeek`)
- **DaySummaryCard** — тепер тільки навігаційний 2×2 грід (звички винесені в TodayHabits):
  - 2×2 грід: **Квести** (gold) / **Покупки** (accent) / **Страва** (second) / **Нотатки** (text); кожна комірка — самостійна кнопка навігації
  - Фон: `color-mix(in srgb, var(--accent) 22%, var(--bg))`; per-theme overrides: velvet 90%, cyber 10%, japan/pixel 8%, noir → `var(--surface2)`
  - Плаский стиль: `border-top/bottom: 1px solid var(--border)`, без `border-radius`
- **HeroCard** — баланс + sparkline 7 днів + dailyBudget bar; `marginTop: 12` від DaySummaryCard
  - Плаский стиль: `border-top/bottom: 1px solid var(--border)`, `border-left: 3px solid var(--gold)`, без `border-radius`
- FAB — розкривний (rotate 45° при відкритті), 4 опції: **Витрата** / **Квест** / **Покупка** / **Нотатка**; закривається кліком поза меню
- `fetchTransactions()`, `fetchMealPlan()`, `fetchItems()`, `fetchNotes()` — всі викликаються при mount
- `.content` — `gap: 0`, тільки точкові відступи через `margin-top` на `.calendarWrap` (10px) і style на HeroCard (12px)

## 2. Finance (`/finance`)
- BalanceHero, TodayCard, StatsGrid
- TopupForm, ExpenseForm (модалки) — кастомні категорії з `/api/categories`
- TransactionList — фільтри з анімацією, кожна категорія свого кольору
- ReceiptScanner — сканування чеків через Anthropic Vision API; кнопка "Сканувати чек" у ExpenseForm показує бейдж "ВЕРИФІКАЦІЯ" + toast при кліку якщо `!activeProfile.isVerified` (бекенд `requireVerified` на `/api/receipt/scan`)
- RecurringPayments — регулярні платежі з іконками сервісів, UAH/USD/EUR конвертація
- ShoppingTracker — трекер магазинних покупок
- GoalsList + GoalDetail — savings goals з deposits[], горизонтальний скрол, деталі у модалці
- ExpenseChart — donut chart (Recharts)
- **MonthlyReport** — AI-аналіз витрат за місяць (Anthropic), markdown rendering, `GET /api/finance/report/:month` (кеш, відкритий) / `POST` (генерація, requireVerified); кнопка "Аналіз"/"Оновити" показує бейдж "ВЕРИФІКАЦІЯ" якщо email не підтверджено
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
- **calendarMode** `'week' | 'month'` — стан у Sprint screen, persist у `localStorage('sprint-calendar-mode')`
  - **week** (default): звичайний 7-денний стрип
  - **month**: компактна місячна сітка прямо в WeekHeader (34px клітинки), навігація `< Місяць Рік >`, кольорові числа + крапки; тап на день → фільтрує список квестів; повторний тап → скидає на сьогодні
  - Toggle кнопка (calendar/lines іконка) в `topRight` WeekHeader поряд з ↗
- Єдиний список задач: **sprint** / **shopping** / **todo** + уроки (lessonStore)
- Звички отримують індикатор сповіщень (badge) якщо не виконані сьогодні
- **Фільтр** (`≡`) — панель з dropdown-select:
  - Тип: Всі / Спринт / Покупки / Todo / Уроки
  - Статус: Активні (default) / Завершені / Всі
  - Кнопки "Скинути" та "Готово" в футері
- За замовчуванням — тільки **активні** (не done) задачі
- TaskDetailModal — МІТКИ / ДЕДЛАЙН / ЧЕК-ЛІСТ / ОПИС + LabelPicker
  - Дедлайн (одноразові задачі) → **DeadlineSheet**: дата + опційний час (`TimeWheelRow`) + опційне нагадування (`ReminderFields`), все в одному флоу
  - Сповіщення (звички) → той самий `ReminderFields`, інша обгортка-шіт
  - Swipe-to-dismiss: imperative `addEventListener('touchmove', fn, { passive: false })`; перевірка `bodyRef.current.scrollTop > 0` перед drag
- Форма додавання (`AddSprintItemModal`) — тип + назва + пріоритет (для shopping/todo); дедлайн теж через **DeadlineSheet** (один компактний чіп замість трьох); повторення → `RepeatConfigScreen` (pill-grid інтервалу, не нативний `<select>`)
- Категорії спринту (dev/mentorship/personal/learning) — тільки через TaskDetailModal
- **WeekExpandedView** — повноекранний overlay (3 таби: МІСЯЦЬ / ТИЖДЕНЬ / ДЕНЬ):
  - Місячна сітка: `grid-auto-rows: 62px`, кольорові числа (positive/gold/accent) + крапки, inline день-деталь панель
  - ТИЖДЕНЬ: навігація по тижнях (`viewWeekStart` state, `<`/`>`, swipe), slide анімація (left/right), «Повернутись на сьогодні» кнопка
  - ДЕНЬ-вигляд: звички показують **RoutineRing** (кільце прогресу за 7 днів) замість простого чекбокса
  - `onAddForDay` → закриває overlay, відкриває форму з pre-filled датою

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
- FAB-група: 📅 Планер / 🔍 Інгредієнти / 🤖 AI-генератор / ➕ Новий рецепт — AI-генератор без бейджа (іконка), тільки toast при кліці якщо `!activeProfile.isVerified` (бекенд `requireVerified` на `/api/recipes/generate`)
- `IngredientSearchSheet` — bottom sheet, multi-chip вибір інгредієнтів, swipe-to-dismiss
- body::after прибрано для velvet/pixel/cyber тем (`[data-theme][data-page="recipes"] body::after { display:none }`)

## 8. RecipeDetail (`/recipes/:id`)
- Hero-фото (або noHero header з кнопками)
- Мета: час готування, порції (stepper +/−), калорії, складність
- Кнопки дій: Wishlist heart / **Шеф** (AI чат, `ChefChatSheet`, toast-гейт якщо `!activeProfile.isVerified`, бекенд `requireVerified` на `/api/ai/chef-chat`) / Покупки (→ sprintStore shopping) / «Приготував» (flame)
- «Приготував» → `logCook(id)` — POST /api/recipes/:id/cook → CookLog MongoDB; оптимістичне оновлення `cookStats`; показує "Готував N×" + дату останнього разу
- **ChefChatSheet** — bottom-sheet AI асистент для конкретного рецепту (на відміну від RecipeGenerator — не створює новий рецепт, а консультує по вже відкритому: заміна інгредієнтів, адаптація порцій/дієти, калорійність, підказки під час готування). SSE streaming через `/api/ai/chef-chat`, контекст рецепту (ingredients/instructions/servings/difficulty) передається в тілі запиту з фронтенду; той самий UI-паттерн що `AiChatSheet` з Dashboard
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
- `totalPlanned` рахується тільки з ID, що резолвляться в існуючий рецепт (`recipes.some`) — щоб видалений рецепт не накручував лічильник на кнопці
- Кнопка «Покупки (N)» → `addItems` (sprintStore, type: 'shopping') → `navigate('/sprint', { state: { filterType: 'shopping' } })` — одразу відкриває таб ПОКУПКИ
- Кнопка «Очистити» — очищає всі дні поточного тижня
- BottomNav прихований на `/recipes/planner`

## 9. Watchlist (`/watchlist`)
- Категорії: movie / series / anime / game / book — **фільтруються за `activeProfile.mediaEnabledTabs`**
- Таби відображаються лише якщо увімкнені в профілі (`ALL_TABS.filter(t => enabledTabIds.includes(t.id))`)
- При відкритті автоматично вибирається перший увімкнений таб; якщо поточний таб вимикається — скидається на перший доступний (`useEffect`)
- **Tab icons (OpenMoji)**: 🎬 1F3AC / 📺 1F4FA / 🌸 1F338 / 🎮 1F3AE / 📚 1F4DA
- Пошук: TMDB API (фільми/серіали/аніме) або backend proxy `/api/books/search` (книги, Google Books з кешем)
- Search overlay: fullscreen backdrop, fixed search bar під AppHeader (`--header-height: 56px`), "Скасувати"
- **Книги (book)** — таб є в `ALL_TABS`, але при активації показується placeholder "Функція в розробці" (контент/пошук не підключені)
- **Game tab** — повний UI: пошук гри через `GameSearch` (fullscreen overlay, `isOpen`/`onClose`, RAWG API), `GameCard`/`GameDetail`/`GameHero`, статуси (хочу/граю/пройдено/анонс/кинув), сортування (дата/оцінка/години/назва), фільтр жанрів. Окремий екран `/screens/Games` видалено — `/games` редіректить на `/watchlist`
- **WatchlistStatsSheet** — bottom sheet, відкривається кнопкою статистики у рядку статусів (тільки для isMedia); SVG-іконки (без emoji): `FilmIcon`/`TvIcon`/`SparkleIcon` для розбивки, `WalkIcon`/`PlaneIcon`/`BooksIcon`/`RunIcon`/`MoonIcon` для порівнянь. Години рахуються з **реальної тривалості TMDB** (`runtimeMin` для фільмів, `episodeRuntimeMin` для серіалів/аніме) — бекфіл при відкритті sheet для елементів без збережених даних (`updateItem` персистить результат); фолбек-оцінка (2г/45хв/24хв) тільки якщо TMDB не дав даних
- WatchlistCard — pill-бейдж статусу на постері, book-aware лейбли (ЧИТАЮ / ПРОЧИТАВ)
- WatchlistDetail — status chips (book-aware, кольори через `color-mix` з `var(--text)` для читабельності на світлих темах), StarRating, EpisodesList для серіалів/аніме; рік/рейтинг/жанри в одному `metaRow` (без окремого лейбла "ЖАНРИ")
- Кастомний постер через ImageUploadButton + Cloudinary

## 10. Memories (`/memories`, `/memories/:id`)
- Таймлайн по місяцях + сітка 3 колонки
- Вкладки: СПОГАДИ / ПЛАНИ / КАРТА
- Рядок статистики (СПОГАДИ) — кількість спогадів/фото/місць + **"N км подорожей"** (сума Haversine-відстаней між хронологічно послідовними спогадами з координатами, `utils/geo.ts`; не показується якщо сума округлюється до 0)
- **MemoryMap** (КАРТА) — Mapbox GL, Standard style, `projection: 'globe'` (огляд-глобус на малому зумі), стартовий zoom 2, без авто-fitBounds
  - Піни: план / спогад / **place** (заклад всередині спогаду, `kind: 'place'`, колір `var(--second)`)
  - Самописна пиксель-кластеризація (без external lib); тап на кластер → flyTo + зум
  - Горизонтальна **карусель карток** під картою (замість старого вертикального списку) — тап картки = тап піна (flyTo + popup, **не** одразу навігація)
  - Попап: обкладинка-**полароїд** (`.popupPolaroid`, біла рамка, rotate -4°→0° на hover) + кнопка **"Маршрут"** (Mapbox Directions API, лінія через `Source`+`Layer`, показує "X км · Y хв" прямо в кнопці); тап по самому попапу → `/memories/:id` (тільки для спогадів)
  - Кнопка **3D** (pitch toggle), українські підписи (`setLanguage('uk')`), lightPreset день/ніч під тему застосунку
  - Одноразова `MapFeatureHint` (обертання/3D/маршрут), localStorage-дисміс
- **Плани** — PlanCard/PlanForm, статуси (want/planned/visited), конвертація в спогад
- "Цей день рік тому" банер
- MemoryDetail — фото (PhotoViewerModal fullscreen), обкладинка (setCover з фото галереї або через EditMemoryModal; "Постер" як обкладинка прибрано)
  - Адреса в заголовку — один рядок з `text-overflow: ellipsis` (раніше розгорталась на 3-4 рядки)
  - **Нотатка** — картка з пунктирною рамкою + іконкою-редагування (✎), а не голий текст; порожній стан "+ Додати нотатку" з SVG-плюсиком
  - **Тег** — кнопка "+ тег" теж із SVG-плюсиком замість символу `+`
  - **bottomBar** — ФОТО/ПОДІЛИТИСЬ + нотатка + теги тепер в одній плаваючій картці, `position: fixed` знизу екрана (в зоні досягання великим пальцем); "ПОВ'ЯЗАНІ СПОГАДИ" і фотогрід підняті нагору одразу під заголовок
- **Поділитись** — Canvas API → PNG (обкладинка + назва + дата + теги + **мінікарта-бейдж** у верхньому правому кутку якщо є координати, Mapbox Static Images API), Web Share API або download (`utils/generateMemoryPoster.ts`)
- Cloudinary upload для фото
- **AddMemoryModal** — поле МІСЦЕ через `LocationSearch` (Mapbox Search Box автокомпліт, `VITE_MAPBOX_TOKEN`) + "Обрати на карті" (`LocationMapPicker`, тап на Mapbox GL карті + реверс-геокодинг), ДАТА/МІСЦЕ в один ряд, дата відображається DD.MM.YYYY
  - `places[]` (заклади всередині спогаду) — поле в моделі/сторі вже є, рендериться на MemoryMap, **але UI додавання ще не реалізований** в AddMemoryModal/PlanForm

## 11. Notes (`/notes`)
- `notesStore` (Zustand, без persist) — `fetchNotes`, `addNote`, `updateNote`, `deleteNote`
- Список нотаток: найновіша зверху, кожна картка — текст (до 3 рядків) + дата (font-mono)
- Пошук: `input` з іконкою — фільтрує локально по `text.includes(query)`, тільки якщо є нотатки
- Тап на картку → inline редагування: `textarea` на місці, `onBlur` + `Enter` зберігають, `Escape` скасовує
- Видалення: кнопка × з'являється при tap/hover
- `autoFocus` flow: при `location.state?.autoFocus === true` одразу відкривається textarea нової нотатки вгорі
- Доступ: FAB "Нотатка" → `/notes?autoFocus=true`, або з TasksAccordion секції НОТАТКИ

## 12. ProfilePage (`/profile`) — 3 таби (me / wallet / plan / admin)

**BottomNav на `/profile`** адаптується: замість основних 5 іконок показує профільні таби.

**MeTab** — hero-картка (аватар, ім'я, username inline edit) + акордеон-меню підрозділів (локальний state `openSection`, один відкритий за раз; клік по рядку — toggle, chevron rotate 90° при відкритті, `.menuAccordionBody`/`.menuAccordionBodyOpen` max-height transition):
- **MeSecurity** — зміна пароля (вкладений accordion), PIN-код (numpad UI)
- **MeAppearance** — теми (6 палітр), стиль навігації (Класик/Пілюля/Хаб), закріплені розділи (pinning)
- **MeSystem** — місто (текст + геолокація через Nominatim reverse geocoding), F1 toggle, push-сповіщення, очищення кешу, оновлення/install PWA
- **MeMedia** — toggles movie/series/anime/game; книги disabled з бейджем "В РОЗРОБЦІ"; `mediaEnabledTabs: string[]` через `PATCH /api/auth/me`
- **MeFamily** — пошук юзерів, pending received (прийняти/відхилити), accepted members, pending sent; `useFamilyStore` (fetchFamily() в ProfilePage при mount); бейдж-лічильник у рядку меню "Сім'я"
- **MeAchievements** — грід бейджів досягнень (косметичний прогрес, не керує доступом до фіч); `ACHIEVEMENTS` з `data/achievements.ts`, `unlockedAchievements` в профілі; `useAchievementsStore.getState().unlock(id)` викликається в місцях першого досягнення (напр. зміна теми, прийняття сімейного запиту)
- Кожен підекран — окремий файл-компонент у `ProfilePage/`, повертає лише внутрішній контент (без власної `settingsCard`-обгортки — її дає `MeTab` на рівень акордеон-картки), читає потрібні Zustand stores напряму (без prop drilling)

**WalletTab:**
- Три settingsCard: РАХУНКИ / ДЕНЬ ЗАРПЛАТИ / КАТЕГОРІЇ
- Salary stepper — compact inline (28px кнопки, mono число, debounce 800ms)
- **Категорії — таб-свічер ВИТРАТИ / ПОПОВНЕННЯ**: ВИТРАТИ = базові + кастомні (Інвестиції/Заощадження відфільтровано через `INCOME_NAMES` Set); ПОПОВНЕННЯ = статичний список `INCOME_CATEGORIES`
- **Категорії — pill cloud**: wrapping flex, кожна категорія — pill-чіп; активна = кольоровий tint + кольорова рамка; неактивна = desaturated + opacity 0.38
- **Нова категорія — icon picker**: кнопка-чіп (пунктирна рамка + підпис "іконка") відкриває grid 7×5 з 35 Tabler іконок; авто-вибір кольору з `CAT_PALETTE` (16 кольорів), уникає вже використаних
- SubCategory modal (Modal draggable) — деталі категорії: увімкнути/вимкнути + список підкатегорій + додати підкатегорію
- Migration modal — при деактивації категорії з транзакціями: перенести в іншу або залишити без категорії

## 13. ProfileSelect (`/profile-select`) — публічний маршрут
- Сітка профілів (Котька + Коська)
- Аватар 96px, fallback — перша літера імені
- Тап → `selectProfile(username)` → JWT → redirect `/`
