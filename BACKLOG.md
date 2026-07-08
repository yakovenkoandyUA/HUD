# MIMIR — Беклог і Roadmap

> Цей файл не завантажується автоматично в Claude Code. Читай його коли потрібен контекст по беклогу, roadmap або що вже реалізовано.

---

## Стратегічний напрямок продукту — Цифрова пам'ять / Family OS

> Репозиціонування з "персонального органайзера" в "цифру пам'ять людського життя" / Family OS. Не скасовує існуючі модулі (фінанси/спринт/рецепти лишаються) — додає над ними шар, що зв'язує дані в історію, а не просто список записів. Деталі ціноутворення під цей напрямок → [`MONETIZATION.md`](MONETIZATION.md), розділ "Репозиціонування монетизації".

### Family Timeline — ✅ MVP реалізовано (2026-06-21, не задеплоєно)
Хронологічна стрічка, що мерджить Memory + visited Plan + Watchlist (`watchedWith`) + CookLog/Recipe + MoodLog (агреговано по місяцях, тільки тренд — без raw score/note). `GET /api/timeline?year=&scope=all|mine|family`, екран `/timeline`, entry point на Dashboard (`TimelineTeaser`). Деталі реалізації — `backend/src/controllers/timelineController.ts`, `client/src/screens/Timeline/`.
**Privacy-рішення цієї сесії:** Plan зараз приватний (без family-scope в `/api/plans`) — додано в Timeline з family-видимістю свідомо (узгоджено з юзером). Mood — тільки агрегований тренд, ніколи конкретні дні/нотатки.
**Не зроблено:** жодного фічевого гейту (немає Free/Pro обмежень на глибину історії чи кількість подій) — Timeline зараз повністю відкритий усім юзерам. Це навмисно для MVP, але білінг-фаза має вирішити, чи лишати так.

### Family Yearbook — ✅ MVP реалізовано (2026-06-21, не задеплоєно)
Кешований річний звіт: `GET /api/yearbook/:year` (404 якщо ще не генерувався, інакше повертає кеш + `stale: boolean` якщо джерела змінились з моменту генерації), `POST /api/yearbook/:year/generate` (рахує і перезаписує — тільки за явним натиском кнопки, ніколи автоматично). Модель `YearbookReport` (`{userId, year}` unique) кешує deterministic-секції: спогади + топ-місця, медіа по категоріях, рецепти приготовані, mood-тренд за рік, фінанси (топ категорій витрат), F1 accuracy (якщо є прогнози за рік). Екран `/yearbook/:year`, вхід через кнопку "Підсумки {year}" в `TimelineBody`.
**Privacy-рішення:** спогади/місця/медіа/рецепти/настрій — родинний скоуп (як Timeline), але **фінанси і F1-прогнози рахуються тільки по `req.userId`, без family-агрегації** — ці фічі взагалі не мають family-sharing в додатку, тож показ чужих грошей/прогнозів у звіті власника був би новою, ненавмисною витоком даних.
**Не зроблено:** AI-наратив (Anthropic) над статистикою, export/share як картинка — обидва свідомо відкладені, MVP лишається deterministic-only.

### Memory Engine
Робоча назва для backend-агрегаційного шару, який вже існує у вигляді `timelineController` (мердж кількох колекцій в єдину хронологію за userId+family). Поки що це один контролер, не окремий сервіс — виносити в окрему абстракцію немає сенсу, доки немає другого споживача (Yearbook стане другим).

### Personal Knowledge Graph — аспіраційно, Фаза 3+
Зв'язки між сутностями (місце ↔ спогад ↔ рецепт ↔ людина ↔ настрій) як граф, не просто хронологія. Жодної технічної підготовки під це не закладено — поточні моделі не мають полів для типізованих зв'язків між сутностями. Не починати, доки Timeline/Yearbook не підтвердять, що юзери взаємодіють з агрегованими даними.

### F1 — Labs / нішевий преміум-модуль, не core-позиціонування
F1 вже технічно ізольований через `f1Enabled` boolean-флаг в профілі (не роль) — фактично це вже "Labs"-фіча для одного юзера (Котька), не частина основного продуктового наративу "цифрова пам'ять для сім'ї". Маркетингово і в ціновій сітці F1 не повинен з'являтись поруч з Timeline/Yearbook/Spogady — це окремий "для фанатів" додаток, не core value proposition.

### Ціноутворення на основі цінності пам'яті/сім'ї
Розгорнуто в `MONETIZATION.md`. Коротко: продаємо глибину й тривалість сімейного архіву, не ліміти фіч. **Затверджена сітка (2026-07-06):** Free / Personal 149₴ / Couple 249₴ / Family 399₴. Деталі feature gates і launch order — у MONETIZATION.md.

---

## Статус (2026-06-29) — Що реалізовано

> Технічний борг: Sentry ✅, Zod ✅, JWT refresh rotation ✅, helmet+CORS+rate-limit ✅, multi-tenancy audit ✅, PWA offline ✅, AI via backend ✅, feature flags замість ролей ✅

### Backend — 26 API роутів, 26 моделей MongoDB

**Роути:**
- `auth` — email+password, Google OAuth, PIN, JWT refresh, email верифікація (Resend), logout
- `transactions` — CRUD, фільтри, категорії, source (manual/monobank/csv)
- `categories` — кастомні категорії витрат + субкатегорії, icon/color, order
- `recurring` — регулярні платежі (UAH/USD/EUR), cron-нагадування
- `goals` — savings goals з deposits[]
- `sprint` — tasks/routines/todos + trash (soft-delete TTL 24г) + restore
- `lessons` — уроки (CRUD)
- `recipes` — CRUD + AI-генерація (Anthropic) + logCook + cook-stats
- `mealPlan` — тижневий планер (Map<date, recipeId[]>)
- `shopping` — список покупок
- `watchlist` — movie/series/anime/book (TMDB + Google Books proxy)
- `watchlistComments` — коментарі між профілями
- `memories` — спогади + фото (Cloudinary) + теги + Canvas-експорт для "Поділитись" (без зовнішніх AI-сервісів)
- `plans` — місця (want/planned/visited), Mapbox геокодинг (фронтенд напряму), конвертація в Memory
- `notes` — нотатки
- `mood` — трекер настрою (1-5), MoodLog, сімейні настрої
- `family` — FamilyLink (pending/accepted), пошук юзерів
- `push` — Web Push підписки (VAPID), test endpoint
- `ai` — SSE streaming чат (Claude Haiku)
- `finance` — AI-аналіз фінансів по місяцях (Anthropic), FinancialReport модель
- `receipt` — сканування чеків (Anthropic Vision API), auto-categorize
- `bank` — Monobank OAuth (3-етапний flow) + sync транзакцій + CSV import, AES-256-GCM шифрування токену
- `f1` — прогнози гонок (CRUD + scoring exact=10/partial=5)
- `weather` — проксі wttr.in (Cache-Control 30хв)
- `books` — Google Books proxy (кеш 10хв)

**Jobs/schedulers:** routineReminders, recurringReminders (окремий daily cron, відділений від reminder-циклу), dayReminder, episodeReminder, f1Scheduler (22 GP 2026 + live notifications) — task/todo reminders тепер на 5-хвилинному циклі, точні до `dueTime` (раніше — раз на день, без часу)

### Frontend — 21 екран, 20 Zustand stores, 12 хуків

**Екрани:**
- `/` Dashboard — DaySummaryCard, HeroCard (sparkline), DayOverlay, FAB, CarHero (Three.js)
- `/finance` — BalanceHero, TransactionList, ExpenseChart, GoalsList, RecurringPayments, ShoppingTracker, MonthlyReport (AI)
- `/sprint` — tasks/routines/todos/lessons, WeekHeader (week/month toggle), WeekExpandedView, TrashBin, filter bottom sheet
- `/shopping` — список покупок з рецептів + manual
- `/recipes` — сітка, фільтри, AI-генератор, «Що є вдома?» ingredient search
- `/recipes/:id` — Складові/Приготування таби, step checklist, CookLog, wishlist
- `/recipes/planner` — тижневий планер Пн–Нд
- `/watchlist` — movie/series/anime/book/game (OpenMoji таби), TMDB пошук; налаштування видимості табів у профілі; **game tab** — повний UI (RAWG пошук через GameSearch overlay, сортування, фільтр жанрів, GameHero, статуси); WatchlistStatsSheet (кнопка статистики) — реальна тривалість з TMDB (з фолбеком на оцінку для елементів без даних), SVG-іконки замість emoji
- `/memories` — таймлайн + сітка + Mapbox GL карта (globe projection, теми, 3D, маршрути, карусель пінів), "Цей день рік тому", статистика відстаней; МІСЦЕ через LocationSearch (Mapbox Search Box автокомпліт) або LocationMapPicker (тап на карті)
- `/memories/:id` — фото, Canvas export → PNG/Web Share з мінікартою-бейджем (поставити обкладинкою — лише з галереї фото або EditMemoryModal, без накладання тексту); fixed bottomBar (фото/поділитись/нотатка/теги); trip-спогади: блок "ВИТРАТИ В ПОЇЗДЦІ" з підсумком і до 5 транзакцій (`tripMemoryId` на Transaction)
- `/notes` — inline edit, пошук
- `/profile` — MeTab (avatar, name, username, password, секція МЕДІА — toggles для movie/series/anime/game + книги "в розробці", СІМ'Я), WalletTab (Monobank, salaryDay, категорії pill-cloud + ВИТРАТИ/ПОПОВНЕННЯ таби + icon picker), PlanTab, AdminTab
- `/f1` — NextRaceCard, LastRaceCard, RacePredictionCard, ChampionshipTable (Пілоти/Конструктори/МІЙ СЕЗОН), McLarenViewer (Three.js)
- `/f1/live` — F1 Live Dashboard (OpenF1 polling)
- `/f1/:round` — RaceDetail (CircuitStats, SessionSchedule, Weather, Podium)
- `/f1/my-season` — особисті прогнози + scoring
- `/login`, `/register`, `/verify` — auth flow
- `*` — NotFound

**Stores:** profileStore, financeStore, goalsStore, streakStore, sprintStore, lessonStore, recipesStore, mealPlanStore, shoppingListStore, watchlistStore, memoriesStore, f1PredictionsStore, notesStore, categoryStore, uiStore, familyStore, moodStore, bankStore, gamesStore

**Ключові компоненти:**
- `AiChatSheet` — SSE streaming AI чат (Dashboard), markdown rendering
- `DayOverlay` — МІЙ ДЕНЬ: слоти morning/afternoon/evening, mood tracker (SVG), сімейні настрої, місячний heatmap, RoutineRing для звичок
- `MemoryMap` — Mapbox GL (Standard style, globe projection), піни планів/спогадів/places, карусель карток, попап-полароїд з кнопкою маршруту (Directions API), тема/3D/обертання
- `LocationSearch` / `LocationMapPicker` — пошук місця (Mapbox Search Box автокомпліт) або тап на карті, спільні для AddMemoryModal і PlanForm
- `DeadlineSheet` / `ReminderFields` / `TimeWheelPicker` — об'єднаний редактор дедлайну (дата+час+нагадування) для квестів, без дублювання верстки між TaskDetailModal/AddSprintItemModal
- `RoutineRing` / `TodayHabits` — кільце прогресу звички (7 днів) і компактний рядок чіпів на Dashboard
- `ReceiptScanner` — Anthropic Vision
- `Modal` — drag-to-dismiss (0.4× damping, 120px cap, 0.18s overlay fade)
- `useSwipeToDismiss` / `useModalHistory` — стандартні хуки для bottom sheets

**Теми (6):** velvet / japan / cyber / noir / pixel / arctic

---

## Що реально НЕ зроблено

### ✅ Верифікація email — повністю реалізована і активована
Домен `mimir-hud.tech` куплено на nic.ua, підключено до Vercel і Resend. DNS записи (DKIM/SPF/DMARC/MX) прописані. `noreply@mimir-hud.tech` → стилізований HTML лист (темний фон, золота кнопка, DRINK DEEP) → `/verify?token=...` → автологін (бекенд повертає JWT після верифікації). CORS і Google OAuth оновлені для нового домену.

### ✅ Обмеження AI-фіч для непідтверджених email — requireVerified gate
Бекенд: `requireVerified` middleware (`backend/src/middleware/requireVerified.ts`) — DB-lookup `isVerified` (не в JWT), 403 якщо false. Навішаний тільки на фічі що коштують Anthropic API: `/api/ai/chat`, `/api/ai/chef-chat`, `/api/receipt/scan`, `/api/recipes/generate`, `POST /api/finance/report/:month` (генерація; GET кешованого звіту лишився відкритим). Core CRUD (задачі/фінанси/рецепти/нотатки/watchlist/спогади) свідомо НЕ заблоковано — інакше сімейні профілі без email (username-only) втратили б основний функціонал.
Фронтенд: мікс UX-гейтів за розміром елемента — статичний бейдж "ВЕРИФІКАЦІЯ" там де є місце для тексту (ReceiptScanner кнопка в ExpenseForm, MonthlyReport "Аналіз"/"Оновити"), тільки toast по тапу на дрібних іконках (AiChatSheet тригер у AppHeader, "Шеф" у RecipeDetail, AI-генератор FAB у Recipes).

### ✅ PIN lock — виправлено два баги
- `verifyPIN` тепер використовує `authFetch` замість сирого `fetch` — токен автоматично рефреститься якщо протух (раніше 401 від `requireAuth` помилково трактувався як "невірний PIN")
- `PinGuard` блокує при кожному свіжому завантаженні через `sessionStorage['hud-pin-session']` (раніше при refresh `pinLocked` скидався і PIN не показувався)

### ✅ Універсальний Watchlist імпорт — зроблено (CSV / XLSX / PDF / зображення)
`ImportWatchlistModal` замінила стару `ImportLetterboxdModal`. Кроки: upload → mapping → preview → confirm → done.
- **Backend**: `POST /api/watchlist/import/parse` (multer + xlsx/csv-парсер) → headers + rows + suggestedMapping. `POST /api/watchlist/import/confirm` (TMDB lookup батчами по 20 + bulk insertMany). `POST /api/watchlist/import/parse-ai` (Anthropic Vision/текст для PDF та зображень).
- **Frontend**: `importWatchlistStore` (Zustand), `ColumnMappingStep` (таблиця відповідності з дропдаунами), `ImportPreviewTable` (перші 10 рядків з бейджами статусів, warning для нерозпізнаних), done-summary з лічильниками.
- Автомапінг колонок за ключовими словами укр/рос/англ. Словник статусів `statusMappingDictionary.ts`. Дублікат-детекція по tmdbId і title. Кнопка імпорту доступна у всіх медіа-табах (movie/series/anime).
- Підтримувані сервіси: MyShows, Letterboxd, Trakt, IMDb, Кінопошук та будь-який CSV/XLSX-експорт.

### 🟡 Не починалось (продуктові фічі)
- **Goodreads імпорт** — books-таб у Watchlist взагалі "В РОЗРОБЦІ" (нижче), тож імпорт книг чекає на сам books-функціонал, не тільки на парсер
- **Книги (Books)** — backend `/api/books/search` (Google Books) є, але UI у Watchlist позначено "В РОЗРОБЦІ" (тоггл в профілі disabled, placeholder при відкритті табу)

### ✅ AI Chef-асистент — зроблено
Кнопка "Шеф" в `RecipeDetail` (поряд з Wishlist/Покупки/Приготував) відкриває `ChefChatSheet` — той самий UI-паттерн що `AiChatSheet` з Dashboard (SSE streaming, Claude Haiku). Контекст рецепту (title/ingredients/instructions/servings/difficulty/cookTime/calories) передається в тілі запиту з фронтенду напряму в `POST /api/ai/chef-chat` — без додаткового похід в БД і дублювання scope-логіки доступу до рецептів (mine/family/all).

### ✅ Memories: форма "Нова подія" — доопрацьовано
Компактна обкладинка, МІСЦЕ+ДАТА в один ряд, дата DD.MM.YYYY. Додано "Обрати на карті" (`LocationMapPicker`, тап на карті + реверс-геокодинг), центрується по введеному запиту або геолокації. Прибрано "Поставити постер як обкладинку" (`PosterGenerator`) — псувало фото текстом, дублюючи вже чистіші шляхи (галерея фото / EditMemoryModal); "Поділитись" (export PNG) залишився.

### ✅ Memories: карта з пінами спогадів
`Memory` модель отримала `lat`/`lng` (опціонально) + `places[]` (заклади всередині спогаду, поле є — UI додавання ще нема). `MemoryMap` показує піни планів+спогадів+places одночасно, тап на пін → flyTo+popup (не одразу навігація — деталі нижче).

### ✅ Memories/Plans: повна міграція Leaflet → Mapbox GL
Причина: користувача зацікавила візуальна якість Mapbox (vector tiles, 3D, кастомні стилі) — погоджено повний перехід, включно з геокодингом (LocationIQ → Mapbox).
- **Геокодинг**: `LocationSearch` (автокомпліт) тепер на **Mapbox Search Box API** (`/suggest`+`/retrieve`, session-token флоу, POI-обізнаний — знаходить заклади, не лише адреси), `LocationMapPicker` reverse-geocode — на **Mapbox Geocoding API v6**. `utils/mapboxGeocode.ts`.
- **Карти**: `react-map-gl` + `mapbox-gl` (`mapStyle="mapbox://styles/mapbox/standard"`), пакети `leaflet`/`react-leaflet`/`@types/leaflet` видалені. `VITE_MAPBOX_TOKEN` замінив `VITE_LOCATIONIQ_KEY`.
- **5 "вау"-фіч додано окремим заходом** (за прямим запитом юзера, після того як стало видно що Mapbox вже в проєкті):
  1. **Тема карти** — `lightPreset` 'day'/'night' підв'язаний до `useUiStore` теми (`utils/mapboxTheme.ts`), реагує на зміну теми наживо.
  2. **Globe projection** — `MemoryMap` показує карту як 3D-кулю на малому зумі (`projection={{name:'globe'}}`).
  3. **Маршрут із попапу** — кнопка "Маршрут" на піні: геолокація юзера → Mapbox Directions API → лінія на карті (`Source`+`Layer`) + "X км · Y хв" прямо в кнопці.
  4. **Мінікарта в шер-постері** — `generateMemoryPoster.ts` додає округлену картку-бейдж (Mapbox Static Images API) з піном, якщо у спогаду є координати.
  5. **Статистика відстаней** — "N км подорожей" в рядку статистики (СПОГАДИ) — сума Haversine-відстаней між хронологічно послідовними спогадами (`utils/geo.ts`).
- **UX-полірування після фідбеку**: кнопка **3D** (pitch toggle), українські підписи (`map.setLanguage('uk')`), zoom +/− (`NavigationControl`), двопальцеве обертання (дефолтна поведінка Mapbox, нічого не вимикали). Виправлений баг — `Popup` за умовчанням `closeOnClick: true`, через що попап сам закривався одразу після кліку на пін (бо клік по піну рахується і кліком по карті) — додано `closeOnClick={false}`.
- **Клік по піну/рядку списку** тепер **завжди** тільки виділяє пін + flyTo + popup (раніше клік на спогад одразу вів на `/memories/:id`, мимо карти) — перехід в деталі тільки тапом по самому попапу.
- **Попап-полароїд**: обкладинка спогаду в білій рамці з нахилом -4° (випрямляється на hover) замість маленької квадратної мініатюри.
- **Карусель** замінила вертикальний список пінів під картою.
- **Одноразова підказка** (`MapFeatureHint`) — обертання двома пальцями / кнопка 3D / тап-пін-маршрут, дисміситься в localStorage.
- **Стартовий zoom** — прибрано авто-`fitBounds` (раніше карта одразу наближалась на всі піни); тепер фіксований zoom 2 (огляд-глобус) за дефолтом, наближення тільки по тапу.

### ✅ Точні нагадування по часу (dueTime) — зроблено
Квести/тудушки отримали опційний `dueTime` (доступний тільки коли вже стоїть дедлайн). Backend reminder-цикл переведено з щоденного крону на кожні 5 хвилин — нагадування шле в конкретну хвилину (`dueDate`+`dueTime`, дефолт 09:00 якщо час не вказано), з `reminderSent` прапорцем щоб не дублювати; пропущені (>24г, напр. деплой) — не спамляться постфактум. Зміна дедлайну/часу/повторення/нагадування скидає `reminderSent`. Регулярні платежі винесено в окремий daily cron, незалежний від 5-хвилинного циклу.

### ✅ Дедлайн/час/нагадування — об'єднаний UI, без дублювання верстки
- `TimeWheelPicker` — iOS-style scroll-колесо (а не два текстові поля), tap-to-select на числі.
- `DeadlineSheet` — дата + опційний час + опційне нагадування злиті в один компактний флоу (раніше три окремі чіпи "Дедлайн"/"Час"/"Нагадати", що рвало рядок на ламаний перенос).
- `ReminderFields` — спільний редактор "за N <одиниця> до" (великий інпут + сітка 2×4 пілюль), витягнутий в один компонент і підключений в DeadlineSheet, TaskDetailModal і AddSprintItemModal (звички) — прибрав потрійне дублювання верстки вертикального radio-списку.
- `RepeatConfigScreen` — інтервал повтору тепер pill-grid (день/тиждень/місяць/рік), а не нативний `<select>` (раніше при тапі відкривав системний OS-дропдаун замість кастомного UI застосунку).

### ✅ "Рутина" → "звичка" — перейменування по всьому застосунку
Слово "рутина" звучало депресивно для юзера. Замінено на "звичка" в усіх UI-текстах, aria-labels, push-копірайтінгу і коментарях (фронтенд + бекенд), включно з keyword-стемом для AI-чат domain detection (`рутин` → `звичк`). Внутрішні імена змінних/файлів (`routineItems`, `isRoutineDueOnDay`, `RoutineRing`, job `routineReminders`) лишені англійською — не user-facing текст.

### ✅ Dashboard: звички винесені з DaySummaryCard в TodayHabits
`DaySummaryCard` тепер тільки навігаційний 2×2 грід (Квести/Покупки/Страва/Нотатки). Звички — окремий компактний компонент `TodayHabits` (рядок чіпів) одразу під привітанням, бо концептуально ближче до "як пройде день" ніж до навігації по модулях. Деталізований вигляд звички (кільце прогресу за 7 днів, `RoutineRing` + `calcWeekRate`) — у WeekExpandedView (ДЕНЬ-таб) і DayOverlay, де є місце.

### ✅ BottomNav: 3 стилі навігації
`navStyle`: classic (повна панель) / pill (плаваюча, тільки закріплені розділи) / hub (плаваюча + центральна руна Ансуз, що відкриває радіальне меню решти розділів, rotate 180° при відкритті). На `/profile` завжди повна панель табів незалежно від стилю.

### ✅ Досягнення — toast замість fullscreen modal, грід без примусового порядку
`AchievementUnlockedModal` тепер компактний non-blocking slide-down toast (раніше — fullscreen overlay з пульсуючим бейджем, що блокував взаємодію). Лінійну "стежку" з fog-of-war (іконка видна тільки для розблокованих + одне наступне) замінено на `AchievementGrid` — кожна картка одразу показує іконку+назву, юзер сам обирає що тапнути й дослідити; опис розкривається тільки після розблокування (до того — підказка що зробити, без "виконай попередні кроки"). "Далі: X" підказку в MeTab прибрано з тієї ж причини — жодна ачівка не привілейована як "наступна". Doodle-іконки в гріді збільшені (56px); додано 4 нові ачівки (нотатки/ціль/настрій/streak) з відповідними новими `DoodleIllustration` variant-ами.

### ✅ Авто-визначення міста — зроблено
При першому логіні (`App.tsx`) — геолокація + реверс-геокодинг (Nominatim, спільний `utils/geocode.ts`) автоматично заповнює `city` в профілі, якщо ще не задане. `CitySplash` (блокуюча анімація запуску) прибрано — авто-визначення відбувається мовчки у фоні, юзер завжди може поправити місто вручну в MeSystem.

### 🟠 Потребує доопрацювання
~~- Memories: `places[]` — UI додавання закладів всередині спогаду~~  ✅ Зроблено
~~- Memories: "з ким" тег прямо на Memory~~  ✅ Зроблено
~~- Memories: тривалість на trip-картках~~  ✅ Зроблено

### ✅ Memories доопрацювання — зроблено (2026-06-30)

1. ~~**AddMemoryModal — позиція кнопки фото.**~~ ✅ Повноширинна зона обкладинки (130px) над хедером, замість кнопки в тілі форми. Реюз `useImageUpload` хука напряму (без `ImageUploadButton`). `PlanForm` — кнопка обкладинки в `headingRow` хедері з thumbnail + count-badge.
2. ~~**EditMemoryModal — баг автовідкриття пошуку адрес.**~~ ✅ `skipSearch = useRef(initial.length > 0)` в `LocationSearch` — скіп першого trigger коли є initial значення.
3. ~~**LocationSearch — релевантність пошуку закладів.**~~ ✅ `proximity` (геолокація юзера, фолбек Київ) + `country: 'ua'` в `mapboxGeocode.ts`. Результати розбиті на `.resultName` + `.resultAddr` для кращої читабельності POI.
4. ~~**Поїздки (trip) — діапазон дат на Memory.**~~ ✅ `dateEnd: string | null` + `isTrip: boolean` в MongoDB-моделі, frontend типах, sторі. AddMemoryModal/EditMemoryModal: toggle "→" + другий DatePicker. MemoryCard: "Дата · Nд" при isTrip+dateEnd.
5. ~~**Поїздки — зв'язок з витратами.**~~ ✅ `tripMemoryId?: string | null` на Transaction (бекенд+фронт). **Ретроактивний флоу** (спогад зазвичай додається після поїздки): після збереження trip-спогаду перевіряє чи є витрати в цьому діапазоні дат без `tripMemoryId` → відкриває `TripExpensesSheet` (bottom sheet з чекбоксами, "виділити всі", "Пропустити") → `tagTripExpenses(ids, tripMemoryId)` в `financeStore` (optimistic bulk PATCH). `MemoryDetail`: блок "ВИТРАТИ В ПОЇЗДЦІ" (IIFE-паттерн для multi-statement JSX) з підсумком і до 5 транзакцій. `ExpenseForm`: picker категорій компактний 5-кол сітка + акордеон-розкриття для "ще N" категорій.
6. ~~**Компаньйон (з ким) у Планах.**~~ ✅ `PlanForm`: "З КИМ" секція — chips прийнятих сімейних членів (аватар/ініціал + name), `withProfiles` передається в `onSubmit`. `useFamilyStore`, `fetchFamily` при mount.

7. ~~**AddMemoryModal — cramped date field.**~~ ✅ ДАТА тепер один повноширинний рядок. При вмиканні isTrip — з'являється окремий `tripRow` нижче (ПОЇЗДКА label + кінцева дата + × кнопка), а не вузький ряд flex:1. `tripAddBtn` — link-кнопка "+ Додати кінцеву дату поїздки".
8. ~~**LocationSearch — auto-search on mount (EditMemoryModal).**~~ ✅ Замінено `skipSearch = useRef(initial.length > 0)` на `userTyped = useRef(false)` (надійно в React StrictMode — ефект запускається двічі, перший підхід падав). Додано `inlineResults` prop: результати в `position: static` (не абсолютний дропдаун) для вбудованих модалок "ДОДАТИ ЗАКЛАД".
9. ~~**FlashbackModal.**~~ ✅ Fullscreen попап "цього дня N років тому" — показується раз на добу (sessionStorage). Навігація вліво/вправо якщо кілька спогадів. Фолбек — градієнтний фон з хешу назви якщо немає обкладинки.

### ✅ Memories — фінальне доопрацювання (2026-06-30, сесія 2)

- **Unsplash обкладинка** — `AddMemoryModal` і `EditMemoryModal`: дві опції у cover zone (Завантажити / Unsplash). `UnsplashPicker` bottom sheet, debounced пошук (600мс), 3×3 сітка, attribution overlay при hover. Вибір тригерить `/photos/:id/download` (Unsplash TOS). `coverAttribution` поле в моделі + типах + store.
- **EditMemoryModal дата-баг** — `formatDisplayDate` тепер `iso.slice(0, 10)` перед спліттом — ISO timestamp більше не ламає відображення.
- **Секція МІСЦЯ в MemoryDetail** — виведена зі стрічки чіпів у окрему секцію з горизонтальним скролом warm cards (золота ліва рамка, пін-іконка, адреса, "На карті" посилання).
- **Градієнт-плейсхолдер** — картки без обкладинки отримують унікальний теплий градієнт (`titleGradient()`, hsl-хеш від назви).
- **Trip duration на картках** — `tripDateLabel()`: "30 — 4 лип. · 5д" замість однієї дати.
- **Фото-бейдж** — SVG camera icon + count у верхньому лівому куті картки (замість emoji).
- **"З КИМ" на спогадах** — `withProfiles: string[]` в моделі Memory (бекенд + фронтенд). `AddMemoryModal`: секція "З КИМ" з чіпами сімейних членів (як PlanForm). Картки: micro-аватари 18px у правому нижньому куті, перекриваються (-5px margin), max 3.
- **PlanForm** — статус-кнопки (Хочу/План/Були) повністю прибрані. Всі нові плани створюються зі статусом `'want'`. Поле дати стало завжди видиме (необов'язкове).

**Залишається відкритим:** історична погода на дату спогаду (wttr.in past dates), stats sheet розширення.

### ✅ UX polish — аудит-фідбек (2026-07-07)

- **BottomNav: labels** — classic стиль отримав підписи під всіма іконками. Pill/hub стиль: label тільки для активного item (item розширюється з круглого 46px в mini-pill форму).
- **Life Spaces strip на Dashboard** — новий компонент `SpacesStrip`: горизонтальний скрол просторів між `TodayHabits` і calendar wrap. Прихований якщо 0 spaces і f1Enabled=false. F1 virtual card (некліка́бельні space-карти поки немає detail route; F1 card → /f1).
- **MemoryDetail context block** — нова секція "З КИМ" + "НАСТРІЙ" над секцією МІСЦЯ. З КИМ: chips з аватарами/ініціалами з familyStore, mapped з `withProfiles[]`. Настрій: fetch `/api/mood/history?month=`, кольоровий dot 1–5 + score/5.

### ✅ Phase 3A — Billing Readiness: Legal + Data Rights (2026-07-07)

**Backend:**
- `User` model: `accountStatus: 'active'|'deletion_requested'|'deleted'` + `deletedAt: Date | null` (safe defaults)
- `GET /api/user/export` — JSON export всіх даних юзера: memories, plans, transactions, categories, goals, recurring, tasks, todos, recipes, watchlist, moods, notes, financialReports, spaces. Виключені: passwordHash, pinHash, verificationToken, paddleCustomerId, paddleSubscriptionId, billingProvider
- `DELETE /api/user/me` — soft delete: `accountStatus: 'deletion_requested'`, `deletedAt`, видалення всіх RefreshToken, очищення cookie. Вимагає `{ confirmation: 'DELETE' }` у body
- `authController`: блокує login і refresh для `deletion_requested`/`deleted` акаунтів (403)

**Frontend:**
- `/terms` і `/privacy` — публічні сторінки (без auth, без BottomNav), standalone layout з draft-банером. Охоплюють: що таке MIMIR, відповідальність, контент, AI-функції, підписка (placeholder), GDPR-права, треті сторони (MongoDB/Cloudinary/Mapbox/Anthropic/Resend/Monobank/Vercel/Railway/Paddle)
- Профіль → таб "Дані" (`SettingsTab`): Export JSON + Danger Zone (введи `DELETE` → видалити акаунт → logout → /login)
- `BottomNav` profile tabs: доданий таб "Дані" (налаштування/export/delete)
- Login + Register: legal footer links (Умови · Конфіденційність)

**Пропущено:** AI-чати (немає persistent storage); GameLog/CookLog/WatchlistComment (внутрішні, не власний контент)
**Не реалізовано:** hard delete cascade, реальне автоматичне видалення через 30 днів (потребує cron job)

### 🔵 Стратегічне (Фаза 2+)
- ~~**Onboarding flow**~~ ✅ Зроблено
- **Лендінг** — mimir.app або аналог
- **Web/desktop layout** — зараз mobile-first
- **Білінг (Paddle)** — Free/Personal/Couple/Family підписки
- **GDPR export** — JSON архів даних
- **iOS/Android віджети** — домашній екран
- **MongoDB M10+** — некритично поки < 100 юзерів

---

## Пріоритизований план — що далі і в якій послідовності

### ~~1. 🔧 Memories доопрацювання~~ ✅ Зроблено
Пошук місця (тоді LocationIQ, з 2026-06-29 — Mapbox), "Обрати на карті" (LocationMapPicker), дата DD.MM.YYYY, прибраний постер-як-обкладинка, карта з пінами планів+спогадів, z-index фікс модалки плану.

### ~~2. 🎮 Games — окремий UI у Watchlist~~ ✅ Зроблено
Game tab повністю інтегрований у `/watchlist` (GameSearch overlay, GameCard, GameDetail, GameHero, сортування, фільтр жанрів). Окремий екран `/screens/Games` видалено — `/games` редіректить на `/watchlist`.

### ~~2a. 🤖 AI Chef-асистент~~ ✅ Зроблено
Кнопка "Шеф" у `RecipeDetail` → `ChefChatSheet` (SSE, Claude Haiku, контекст рецепту з фронтенду). Деталі в розділі "Що реалізовано" вище.

### ~~3. 📧 Верифікація email~~ ✅ Зроблено
Домен `mimir-hud.tech`, Resend, `VerificationBanner`, enforcement у receipt scanner — все є.

### ~~4. 📊 MIMIR Wrapped → Family Yearbook~~ ✅ MVP зроблено
Деталі в розділі "Стратегічний напрямок продукту" вище. Лишилось на майбутнє: AI-наратив, export/share картинкою, retrofit лімітів під білінг.

### ~~5. 📥 Letterboxd імпорт~~ ✅ Зроблено (тільки фільми)
Деталі в розділі "Що реалізовано" вище. Goodreads/книги — окремо, чекає на books-функціонал (нижче), не просто на CSV-парсер.

### ~~6. 🚀 Onboarding~~ ✅ Зроблено
5-кроковий флоу при першій реєстрації: Welcome (MimirFillIcon) → Фінанси (день поповнення 1–31 grid + категорії витрат) → Звичка (preset chips + custom input) → Перший план (куди мрієш поїхати, skippable) → Done (MimirFillIcon fill-анімація + "Криниця відкрита. Мімір пам'ятає все — тепер і твоє. Твоя хроніка починається."). `onboardingCompleted: boolean` на User модель, `ProtectedRoute` редіректить на `/onboarding` якщо `=== false`, бекенд `updateMe` зберігає після Done.

### ~~7. 💳 Білінг Phase 1 + 2~~ ✅ Зроблено (архітектура без Paddle)

**Phase 1A** — `plan` / `subscriptionStatus` / Paddle-поля на User-моделі (safe defaults, не Breaking change). `backend/src/config/plans.ts` — single source of truth (features + limits). `entitlements.ts` — `assertFeature`/`assertLimit`/`requireFeature` (no-ops поки `BILLING_ENABLED !== "true"`). `loadUser` middleware (тільки на гейтованих роутах). `plan` + `subscriptionStatus` у профільній відповіді. Фронтенд `client/src/config/plans.ts` + `usePlan()` / `useCanUseFeature()` hooks.

**Phase 1B** — backend guards навішані: `requireFeature('aiChat'/'aiChefChat')` на `/api/ai/*`, `requireFeature('receiptScanner')` на `/api/receipt/scan`, `requireFeature('yearbookGenerate')` на `POST /api/yearbook/:year/generate`, `requireFeature('familyLink')` на `POST /api/family/request`, `requireFeature('advancedFinance')` на `POST /api/finance/report/:month`, `assertLimit(maxSpaces/maxMembersPerSharedSpace/sharedSpaces)` в SpaceController, timeline history year check в `timelineController`. Централізована обробка `PLAN_GATE`/`PLAN_LIMIT` в `errorHandler.ts`.

**Phase 2** — frontend soft locks: `PaywallGate` wrapper + `UpgradePrompt` frosted-glass компонент (feature/limit варіанти, compact mode). Гейти: AI-кнопка AppHeader, chef-кнопка RecipeDetail, scan-кнопка ExpenseForm, AI-звіт MonthlyReport, generate-кнопка Yearbook (→ UpgradePrompt замість кнопки), search FamilyTab (PaywallGate), addBtn SpacesTab (UpgradePrompt compact при maxSpaces), TimelineBody locked year (UpgradePrompt). PlanTab переписаний: 4 тири (free/personal/couple/family) з реальним `usePlan().plan` замість хардкоду.

**Наступне:** Phase 4B — WayForPay checkout route (backend), Phase 4C — frontend upgrade flow.

### ~~8. 💳 Білінг Phase 3A — Legal + Data Rights~~ ✅ Зроблено
Деталі вище в розділі "Що реалізовано".

### ~~8а. 💳 Білінг Phase 4A — Provider-neutral billing models~~ ✅ Зроблено (2026-07-07)

Рішення: **WayForPay + українська ФОП** для MVP (замість Paddle). Архітектура provider-neutral — можна замінити провайдера без зміни ентайтлментів.

**Backend:**
- `backend/src/config/pricing.ts` — ціни в копійках (без float): personal 149/1199 грн, couple 249/1999 грн, family 399/3199 грн за місяць/рік. `getPrice()`, `validatePaidPlan()`, `validateBillingInterval()`
- `backend/src/models/BillingOrder.ts` — трекінг платіжних спроб: orderReference (opaque: `mimir_{YYYYMMDD}_{16hex}`), status pipeline (pending→paid/failed/refunded/expired), expiresAt індекс для cleanup cron
- `backend/src/models/ProcessedBillingEvent.ts` — idempotency таблиця (unique compound index `{provider, eventKey}`) для захисту від дублювання callback
- `backend/src/utils/billing.ts` — `generateOrderReference()` (randomBytes, без userId), `calculateCurrentPeriodEnd()` (calendar-aware, end-of-month clamping), `getGracePeriodEnd()` (+3 дні), `buildWayForPayEventKey()`
- `User` model розширений: `billingInterval: 'month'|'year'|null`, `billingOrderId: string|null`, `cancelAtPeriodEnd: boolean`, `lastBillingSyncAt: Date|null`, `billingProvider` enum додано `'wayforpay'`

**PWA Update Banner** (окрема задача в цьому ж PR):
- Пульсуюча крапка на аватарі в TopBar (видима з будь-якого екрану)
- Видимий банер внизу Profile → таб "Я" з кнопкою ОНОВИТИ (`window.location.reload()`)
- `uiStore.updateAvailable` — сет через `controllerchange` event Service Worker

### 9. 💳 Білінг Phase 4B — WayForPay Checkout (backend)
`POST /api/billing/checkout` — генерація WayForPay payment URL, HMAC підпис, повертає `{ paymentUrl, orderReference }`. Тест в sandbox перед релізом.

### 10. 💳 Білінг Phase 4C — Frontend Upgrade Flow
PlanTab реальні кнопки → redirect на WayForPay hosted page. `/payment/result` публічна сторінка з polling статусу замовлення.

### 11. 💳 Білінг Phase 5A — Callback Verification
`POST /api/billing/wayforpay/callback` (public) — HMAC-MD5 верифікація підпису, idempotency через ProcessedBillingEvent, оновлення BillingOrder + User.plan після успішної оплати.

---

## Технічний борг — залишок

| Задача | Статус |
|--------|--------|
| Верифікація email | ✅ Закрито (mimir-hud.tech + Resend) |
| MongoDB M10+ | 🟢 Некритично поки < 100 юзерів |
| Усі інші | ✅ Закрито |
