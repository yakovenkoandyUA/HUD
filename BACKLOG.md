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

**Jobs/schedulers:** routineReminders, recurringReminders (окремий daily cron, відділений від reminder-циклу), dayReminder, f1Scheduler (22 GP 2026 + live notifications) — task/todo reminders тепер на 5-хвилинному циклі, точні до `dueTime` (раніше — раз на день, без часу). `episodeReminder.ts` видалено (2026-07-30) — мертвий код, ніде не імпортувався.

### Frontend — 21 екран, 20 Zustand stores, 12 хуків

**Екрани:**
- `/` Dashboard — DaySummaryCard, HeroCard (sparkline), DayOverlay, FAB, CarHero (Three.js)
- `/finance` — BalanceHero, TransactionList, ExpenseChart, GoalsList, RecurringPayments, ShoppingTracker, MonthlyReport (AI)
- `/sprint` — tasks/routines/todos/lessons, WeekHeader (week/month toggle), WeekExpandedView, TrashBin, filter bottom sheet; drag-to-reorder логіка → `hooks/useSprintDrag`, календарна навігація → `hooks/useSprintCalendar`
- `/shopping` — список покупок з рецептів + manual
- `/recipes` — сітка, фільтри, AI-генератор, «Що є вдома?» ingredient search
- `/recipes/:id` — Складові/Приготування таби, step checklist, CookLog, wishlist
- `/recipes/planner` — тижневий планер Пн–Нд
- `/watchlist` — movie/series/anime/book/game (OpenMoji таби), TMDB пошук; налаштування видимості табів у профілі; **game tab** — повний UI (RAWG пошук через GameSearch overlay, сортування, фільтр жанрів, GameHero, статуси); WatchlistStatsSheet (кнопка статистики) — реальна тривалість з TMDB (з фолбеком на оцінку для елементів без даних), SVG-іконки замість emoji; **bug fix:** `countEpisodes` тепер пріоритизує `watchedEpisodes.length` над `totalEpisodes` (TMDB міг повертати завищену кількість включно з майбутніми сезонами); **настрій-профіль (радар)** — секція "НАСТРІЙ" у WatchlistDetail (movie/series/anime), 6 осей (Гумор/Напруга/Романтика/Екшн/Драма/Атмосферність) 0-5, виставляється вручну pill-кнопками, той самий `RadarChart` що й флейвор-профіль напоїв (вінесено в спільний `shared/components/ui/RadarChart`)
- `/memories` — таймлайн + сітка + Mapbox GL карта (globe projection, теми, 3D, маршрути, карусель пінів), "Цей день рік тому", статистика відстаней; МІСЦЕ через LocationSearch (Mapbox Search Box автокомпліт) або LocationMapPicker (тап на карті)
- `/memories/:id` — фото, Canvas export → PNG/Web Share з мінікартою-бейджем (поставити обкладинкою — лише з галереї фото або EditMemoryModal, без накладання тексту); fixed bottomBar (фото/поділитись/нотатка/теги); trip-спогади: блок "ВИТРАТИ В ПОЇЗДЦІ" з підсумком і до 5 транзакцій (`tripMemoryId` на Transaction)
- `/notes` — inline edit, пошук
- `/profile` — MeTab (avatar, name, username — тільки hero-картка), WalletTab, PlanTab, AdminTab; **ProfileDrawer:** Вигляд → Система → Модулі → Близькі → **Тариф** (→ `/profile?tab=plan`) → Адмін → **Акаунт** (→ `/profile/account`); при `updateAvailable` — рядок під Акаунтом → `ChangelogSheet`
- `/profile/account` — **MeAccount**: Експорт даних (JSON), Юридична інформація (Terms/Privacy + checkbox підтвердження), Небезпечна зона (видалення акаунту з confirmation input)
- `/f1` — таб-хаб "Спорт" (Формула 1 / Футбол, показується тільки коли ввімкнено обидва). F1-таб: NextRaceCard, LastRaceCard, RacePredictionCard, ChampionshipTable (Пілоти/Конструктори/МІЙ СЕЗОН), McLarenViewer (Three.js). Футбол-таб: `FootballPanel` (топ-5 європейських ліг + ЛЧ через football-data.org, `PillSelector` вибір ліги, найближчий матч, турнірна таблиця) — керується новим `footballEnabled` boolean-флагом (дзеркально до `f1Enabled`), toggle в Профіль → Модулі → Спорт. Баскетбол лишається `wip` (немає пристойного безкоштовного live API)
- `/f1/live` — F1 Live Dashboard (OpenF1 polling)
- `/f1/:round` — RaceDetail (CircuitStats, SessionSchedule, Weather, Podium)
- `/f1/my-season` — особисті прогнози + scoring
- `/login`, `/register`, `/verify` — auth flow
- `*` — NotFound

**Stores:** profileStore, financeStore, goalsStore, streakStore, sprintStore, lessonStore, recipesStore, mealPlanStore, shoppingListStore, watchlistStore, memoriesStore, f1PredictionsStore, footballStore, notesStore, categoryStore, uiStore, familyStore, moodStore, bankStore, gamesStore

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

**Теми (6):** aurum / vellum / cyber / noir / pixel / arctic

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
- ~~**Книги (Books)**~~ ✅ Тоггл в профілі і UI в Watchlist вже працюють (2026-07-30, підтверджено юзером — попередній запис був застарілий).
- ~~**Goodreads імпорт**~~ ✅ Зроблено (2026-08-17) — той самий generic CSV/XLSX import flow (`watchlistImportController.ts`), додано `author`/`isbn`/`pageCount` в `MimirField`+`FIELD_KEYWORDS`, категорія `'book'` в детекції + константа "Книга (всі записи)" в `ColumnMappingStep`, `searchGoogleBooks()` (аналог `searchTmdb`) замінює TMDB-пошук для книжкових рядків — обкладинка пишеться в `thumbnail` (повний URL), не `posterPath` (той зарезервований під TMDB-шлях). Dedup для книг — по `isbn`, fallback на title. `statusMappingDictionary.ts`: Goodreads `Exclusive Shelf` (`read`/`currently-reading`/`to-read`) додано в `watched`/`watching`/`want` (з реордером `want` перед `watched`, бо `'to-read'.includes('read')` інакше хибно матчився як watched).

### ✅ WatchlistDetail — рев'ю від Джонні, частина 1 (2026-08-17)

Фідбек по detail-модалці фільму/серіалу. Зроблено все крім двох пунктів (навмисно пропущені — не додають ваги без окремої продуктової фічі): перетворення "Дивитись разом" у full social block з "Запросити" (бо invite-механізму тут нема, це не Plan Group) і загальна ре-ієрархізація ваги секцій (потребує мокапу, не тільки тексту).

- **Опис** — clamp з 5 до 3 рядків + "Читати далі"/"Згорнути" toggle (`overviewExpanded` state)
- **Close-кнопка на hero** — символ `✕` замінено на SVG (проєктне правило "іконка не символ"), трохи легша (26px, менш контрастний фон)
- **"Прибрати" оцінку** — текстовий лінк замінено на невелику круглу icon-кнопку (X), в обох місцях (звичайний і `watchedStatsRow` для завершених серіалів)
- **Статус-чіпи** — компактніші (padding 8→6px, font 12→11px), склад не міняли (4 стани лишились рівноправні)
- **Настрій** — додано підказку шкали "слабко → сильно" в заголовку і числовий індикатор (1-5/—) в кінці кожного рядка; крапки тепер мають бордер у неактивному стані (раніше — просто притлумлений колір, зливались)
- **Актори/Схожі** — назви/імена тепер `line-clamp: 2` замість грубого single-line ellipsis, ширші картки й gap (cast 64→72px/12→16px gap, similar gap 10→14px), підпис ролі актора трохи контрастніший (9px text3 → 10px text2)
- **Дивитись разом** — компактніші чіпи (avatar 22→19px, padding/font зменшені), без зміни логіки видимості

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

**Залишається відкритим:** ~~UI додавання places[]~~ ✅ Реалізовано (кнопка + Modal + LocationSearch в MemoryDetail, backlog був застарілий), історична погода на дату спогаду (wttr.in past dates), stats sheet розширення.

### ✅ UX polish — аудит-фідбек (2026-07-07)

- **BottomNav: labels** — classic стиль отримав підписи під всіма іконками. Pill/hub стиль: label тільки для активного item (item розширюється з круглого 46px в mini-pill форму).
- **Life Spaces strip на Dashboard** — новий компонент `SpacesStrip`: горизонтальний скрол просторів між `TodayHabits` і calendar wrap. Прихований якщо 0 spaces і f1Enabled=false. F1 virtual card (некліка́бельні space-карти поки немає detail route; F1 card → /f1).
- **MemoryDetail context block** — нова секція "З КИМ" + "НАСТРІЙ" над секцією МІСЦЯ. З КИМ: chips з аватарами/ініціалами з familyStore, mapped з `withProfiles[]`. Настрій: fetch `/api/mood/history?month=`, кольоровий dot 1–5 + score/5.
- **SpacesStrip chip → context-card** — мінімальний чіп замінений на ширшу контекстну картку (200–260px): emoji, повна назва без обрізання, тип + кількість учасників, "відкрити →" футер. F1 virtual card (`--space-color: #e10600`).
- **SpaceDetail self-sufficient** — екран `/spaces/:spaceId` більше не потребує ProfilePage для редагування: edit bottom sheet (назва/emoji/тип/колір/delete з підтвердженням), управління учасниками (додати за username, видалити) — все inline в SpaceDetail. SPACE_CONTEXT config per-type для 8 типів просторів.
- **S2A Notes in Spaces** — `Note` model: `spaceId` поле; `GET /api/notes?spaceId=`, `POST /api/notes` приймає `spaceId`; `notesStore.addNote(text, spaceId?)`; SpaceDetail: inline textarea + список нотаток з датою і видаленням.
- **S2B SprintTask in Spaces** — `SprintTask` model: `spaceId` поле з індексом; `GET /api/sprint/tasks?spaceId=` filter; TASK_ALLOWED + updateTaskSchema; SpaceDetail: inline task creation (Enter=save/Escape=cancel), checkbox toggle, delete; задача отримує поточний weekStart → видна і у Sprint-екрані.
- **S2C Transactions in Spaces** — `Transaction` model: `spaceId` поле з індексом; `GET /api/transactions?spaceId=` filter; `createTransactionSchema` + `Transaction` type (frontend); SpaceDetail: секція ВИТРАТИ — summary chip (загальна сума витрат) + хронологічний список (read-only, додавати транзакції через Finance з вибором простору).

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

### ✅ Hard delete cascade + 30-денний cron (2026-08-17)

`DELETE /api/user/me` й далі робить тільки soft-delete (`accountStatus:'deletion_requested'`). Додано:
- `backend/src/scripts/hardDeleteUser.ts` — `hardDeleteUser(userId)`: видаляє ~40 колекцій власних даних юзера (за патерном `dedupeCategories.ts`, з CLI-entry `railway run npx ts-node src/scripts/hardDeleteUser.ts <userId>`), видаляє власні Spaces + все що в них за `spaceId` (щоб не лишити осиротілі записи інших учасників простору), скрабить посилання на юзера в чужих документах (`FamilyLink`, `PlanGroupInvite`, `User.planGroupPayerId`, `Space.members[]`, `WatchlistItem.watchedWith[]`/`watchedEpisodes[]`, `Recipe.ratings[]`, `SprintTask.assignedTo[]`, `Memory.withProfiles[]`), і зрештою видаляє сам `User` документ.
- `backend/src/jobs/accountDeletionCron.ts` — щоденний cron (04:00 UTC, патерн `cleanupSprintImages.ts`), шукає `accountStatus:'deletion_requested'` з `deletedAt` старшим за 30 днів, викликає `hardDeleteUser` для кожного.
- Свідомо НЕ видаляються: `BillingOrder`, `ProcessedBillingEvent` (фінансовий аудит), `Feedback` (історія підтримки) — лишаються з осиротілим `userId`, ніде не JOIN-яться для показу іншим юзерам.
- `User.accountStatus` отримав індекс (для `find` в кроні).

### ✅ "Drink Deep" — новий вхід замість фейкового Space (2026-08-17)

`drinksEnabled`-юзери (зараз 2) мали автостворюваний `Space` типу `cellar` в загальній стрічці просторів — концептуально не space (напої не мають `spaceId`, це просто userId-скоуплена колекція), просто навігаційна обгортка навколо `CellarSpaceView`. Прибрано з UI просторів (dashboard-стрічка + Профіль → Всі простори), функціонал і сам `Space`-документ лишились — новий вхід кружечком з іконкою келиха поруч з FAB на екрані рецептів (тільки для `drinksEnabled`).

- `SpacesStrip`/`SpacesTab` — фільтрують `type !== 'cellar'` з відображуваного списку (лічильник `maxSpaces`-ліміту й далі рахує по повному, нефільтрованому масиву — щоб не занизити ліміт)
- `features/recipes/index.tsx` — новий `.fabAi` кружечок (келих, SVG), `onClick` → `fetchSpaces()` + `ensureCellarSpace()` (той самий find-or-create екшн що й раніше в Dashboard) → `navigate(/spaces/:id)`, той самий `CellarSpaceView` що й був
- Dashboard і далі eager-створює cellar Space при вході (не займали) — просто тепер не показується в стрічці

### 🔵 Стратегічне (Фаза 2+)
- ~~**Onboarding flow**~~ ✅ Зроблено
- ~~**Лендінг**~~ ✅ Публічна сторінка `/` (`features/auth/Landing.tsx`) — деталі в "Лендінг" нижче
- **Web/desktop layout** — зараз mobile-first. Рішення (2026-07-29): не адаптувати UI під десктоп — для залогінених юзерів з широким viewport показувати окремий "install on phone" екран замість стиснутого mobile UI. Не реалізовано, потребує: breakpoint, контент екрану (QR/інструкція), scope (усі protected routes чи тільки деякі)
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

**Оновлення (2026-08-03):** "Близькі" (FamilyLink) перероблено з булевого feature-гейту на кількісний ліміт — повний бан на free/personal відчувався зайвим. Тепер `maxFamilyLinks`: free/personal — 2, couple/family — безліміт. Бекенд: `assertLimit` інлайн у `familyController.sendRequest` (не middleware — потрібен async count query). Клієнт: `FamilyTab` рахує `accepted+pendingSent+pendingReceived` і показує `UpgradePrompt` тільки по досягненню ліміту, а не завжди для free/personal.

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
- ~~Видимий банер внизу Profile → таб "Я" з кнопкою ОНОВИТИ (`window.location.reload()`)~~ → **замінено** на рядок оновлення в `ProfileDrawer` під пунктом "Налаштування" з відкриттям `ChangelogSheet` (журнал змін перед перезавантаженням)
- `uiStore.updateAvailable` — сет через `controllerchange` event Service Worker

### ~~8б. 💳 Duo/Group — реальний shared-payer тариф~~ ✅ Зроблено (2026-08-14)

До цього "couple"/"family" були просто дорожчими **персональними** тарифами з вищими лімітами — кожен запрошений юзер платив за себе сам, хоча маркетинг обіцяв "поділись з одним"/"необмежені учасники". Тепер один платник (payer) купує Duo (2 місця) або Group (5 місць) і запрошує учасників, які отримують тарифні права безкоштовно, поки вони в групі й payer має активну підписку.

**Backend:**
- `User.planGroupPayerId`/`planGroupJoinedAt` — якщо не null, юзер може успадкувати план цього payer'а
- `PlanGroupInvite` — нова модель (payerId, inviteeId, status: pending/accepted/declined/cancelled)
- `backend/src/utils/planGroup.ts` — `resolveEffectivePlan(user)` (own vs group plan, бере вищий за рангом, self-healing: якщо payer перестає платити — учасники миттєво падають на власний план без крон-джобів), `PLAN_RANK`, `GROUP_SEATS` (couple: 2, family: 5)
- `loadUser` middleware резолвить `effectivePlan` (plain property, не mongoose `.set()` — щоб випадковий `.save()` не запис чужий план в БД), `entitlements.ts.getUserPlan` читає `effectivePlan ?? plan`
- `planGroupController.ts` + `/api/plan-group/*` — invite/accept/decline/cancel/removeMember/leave, пошук інвайта по username/email (як family search)
- `/auth/me` повертає `effectivePlan`/`planSource`/`planPayerName`

**Frontend:**
- `usePlan()` читає `effectivePlan` замість `plan` напряму
- `PlanTab.tsx`: банер "Ви на плані Duo/Group завдяки {payer}" + "Покинути групу" для member; секція "Учасники плану" (пошук, seats-індикатор, remove/cancel) для payer; список вхідних запрошень (accept/decline) для будь-кого
- `features/profile/store/planGroupStore.ts` — новий feature store

**Свідомо поза MVP:** дублювання `client/shared/config/plans.ts` ↔ `backend/config/plans.ts` не усунено; email-запрошення незареєстрованих юзерів не підтримується (тільки existing users); адмін не керує seats напряму — тільки payer.

### 9-11. 💳 Білінг Phase 4B/4C/5A — WayForPay Checkout + Callback
> **⏸ НА ПАУЗІ — виконати тільки за явною вказівкою розробника**
> Поточна монетизація: Monobank банка + ручний апгрейд плану через адмін-панель. WayForPay підключається коли буде ~20 перших платників і ФОП відкрито.

- **4B:** `POST /api/billing/checkout` — генерація WayForPay payment URL, HMAC підпис
- **4C:** PlanTab реальні кнопки → redirect на WayForPay hosted page, `/payment/result` з polling
- **5A:** `POST /api/billing/wayforpay/callback` — HMAC-MD5 верифікація, idempotency, оновлення плану

### 12. 🚗 Vehicle Space MVP

**Концепція (розроблена з Джонні):** Автомобіль — не окремий модуль, а спеціалізований тип Space. Формула: `MIMIR Space → Vehicle Space → Profile + Timeline + Expenses + Documents + Reminders + AI Insights`.

**Phase 12A — Backend**

- `Space.type` розширити: `"general" | "vehicle"` (і далі інші типи — property, pet тощо)
- `VehicleProfile` sub-document на `Space` моделі: `make`, `model`, `year`, `plateNumber`, `vin`, `currentMileage`, `fuelType`, `purchaseDate`, `photoUrl`
- Нова модель `VehicleEvent`: `spaceId`, `type` (`"fuel"|"maintenance"|"repair"|"inspection"|"insurance"|"tire_change"|"document"|"note"`), `date`, `mileage`, `cost`, `currency`, `vendor`, `notes`, `attachments: string[]` (Cloudinary URLs)
- CRUD: `GET|POST /api/spaces/:id/vehicle/events`, `PATCH|DELETE /api/spaces/:id/vehicle/events/:eventId`
- `GET /api/spaces/:id/vehicle/profile`, `PATCH /api/spaces/:id/vehicle/profile`

**Phase 12B — Frontend**

- `SpaceDetail` для `type === 'vehicle'` рендерить `VehicleSpaceView` замість generic view
- `VehicleHeader`: фото авто, `Make Model Year · XXX xxx km`
- 4 quick action кнопки: `+ Заправка`, `+ ТО / ремонт`, `+ Документ`, `+ Нотатка`
- Форми (bottom sheets):
  - **Заправка:** дата, пробіг, літри, сума, АЗС, тип пального
  - **ТО:** дата, пробіг, що зроблено, сума, сервіс, фото/чек (Cloudinary)
  - **Документ:** тип, дата закінчення, файл/фото, нагадати
  - **Нотатка:** вільний текст + дата
- `VehicleTimeline` — хронологічна стрічка подій з іконками по типах
- `VehicleStats` — базова статистика:
  - Витрати цього місяця / за рік
  - Середня витрата пального (л/100 км, якщо є літри + пробіг між заправками)
  - Вартість 1 км
  - Поточний пробіг (останній запис)
  - Документи, що закінчуються скоро (< 30 днів)
- `vehicleStore` (Zustand) — profile + events, оптимістичні оновлення
- `CreateSpaceSheet` — додати вибір типу (`general` / `vehicle`) при створенні простору; при `vehicle` — крок профілю авто після назви

**Що НЕ робити в MVP:** OBD-інтеграція, AI-сканер чеків, garage dashboard, порівняння АЗС, кілька авто в одному просторі.

**Наступне після MVP:** нагадування по пробігу (наст. ТО через N км), push-сповіщення для документів що закінчуються, AI-інсайти по витратах.

---

## 13. 🚗 Spaces — 3-раундний спринт покращень

> Стартуємо після Vehicle Space MVP (✅). Мета: глибина Vehicle + utility для всіх Spaces + universal AI.

### ✅ Раунд 1 — Vehicle (2026-07-10)

- [x] **Хронологія в Timeline/Yearbook** — `VehicleEvent` мерджиться в `timelineController` (`type: 'vehicle'`, payload: eventType/vehicleLabel/cost/vendor); нова секція АВТО в `YearbookTab` (умовна, тільки якщо є дані); `YearbookReport` отримав `vehicleStats`; frontend `TimelineEventCard` — car icon + `VEHICLE_EVENT_LABELS`
- [x] **Вартість поїздки** — калькулятор в `VehicleStats`: поле "відстань (км)" → рахує ліво/100км × ціна/літр (з останньої заправки з known liters+cost); результат показується inline без бекенду
- [x] **Нагадування по пробігу** — `nextServiceMileage: number | null` в `VehicleProfile` (бекенд: `Space.ts` + `vehicleController`; фронтенд: `spacesStore.ts` тип + поле в EditProfileSheet); бейдж в `VehicleHeader`: "ТО через N км" (accent color) або "Час на ТО!" (red) коли пробіг ≥ порогу

### ✅ Раунд 2 — всі Spaces (2026-07-10)

- [x] **Space архівування** — `archived: boolean` на `Space` моделі; фільтр "показати архівні" у SpacesList; swipe-to-archive в SpacesStrip; `PATCH /api/spaces/:id` вже є — додати `archived`
- [x] **Space обкладинка** — `coverUrl: string | null` на `Space` моделі; Unsplash picker (той самий `UnsplashPicker` що Memories) в `EditSpaceSheet`; відображається як blur-фон або header в `SpaceDetail`
- [x] **Space бюджет** — `budget: number | null` + `budgetCurrency` на `Space` моделі; прогрес-бар сума витрат / ліміт у `SpaceDetail`; бейдж стану (норма/увага/перевищено)

### ✅ Раунд 3 (часткова реалізація, 2026-07-11)

- [x] **Space шаблони** — при створенні `vehicle`/`trip`/`project` space показувати модальний вибір шаблону зі starter-задачами та нотатками; статичний `data/spaceTemplates.ts` (без бекенду)
- [x] **Space тижневий дайджест** — `backend/src/jobs/spaceWeeklyDigest.ts`, cron щонеділі 08:00 UTC → push нотифікація по кожному Space з задачами/спогадами/витратами за тиждень
- [x] **ШІ-асистент per Space** — кнопка в хедері `SpaceDetail` → bottom sheet → SSE чат; `POST /api/ai/space-chat` приймає `spaceId` + `messages[]`; system prompt залежить від `space.type` (vehicle → механік, trip → travel planner, project → PM); Claude Haiku; контекст: назва/тип + останні 5 подій/задач/нотаток

### ✅ MoodCalendar — деталі дня по тапу (2026-07-28)

- **Тап на день в MoodCalendar** (в `DayOverlay` → "НАСТРІЙ / МІСЯЦЬ") відкриває `MoodDayDetail` — draggable `Modal` з власною відміткою+нотаткою за той день і настроєм+нотаткою кожного сімейного профілю за той самий день. Майбутні дні неклікабельні.
- Backend: `GET /api/mood/family/:date` (новий, поряд з існуючим `/family/today`) — той самий join з `getAcceptedFamilyIds`, винесений у спільну `getFamilyMoodsForDate(userId, date)`.
- Frontend: `moodStore` — `familyMoodsByDate: Record<string, FamilyMoodEntry[]>` кеш + `fetchFamilyMoodsForDate(date)`.

### ✅ Базова аналітика — launch-readiness funnel (2026-07-29)

Замість стороннього сервісу (PostHog/GA) чи окремого event-трекінгу — funnel виводиться з уже наявних timestamp-полів: `User.createdAt`/`onboardingCompleted`, `Space.createdAt`, `Memory.createdAt`. Причина: MIMIR позиціонується на приватності (RELEASE.md "Приватність"), сторонній аналітичний сервіс — ще один процесор персональних даних, якого треба додавати в `/privacy`; на масштабі <100 юзерів повний event-pipeline — оверінжиніринг.

- **Backend**: `User.lastLoginAt: Date|null` — оновлюється (fire-and-forget) в `sendAuthResponse` (login/register/google/verify/reset) і в `refresh` — proxy для "активний юзер" без окремого heartbeat-механізму. `backend/src/controllers/analyticsController.ts` → `GET /api/auth/admin/analytics` (requireAdmin): total users, onboarding/перший Space/перший Memory % (через `Space.distinct('ownerId')`/`Memory.distinct('userId')`), активні за 7д/30д (`lastLoginAt`), реєстрації по днях (aggregate).
- **Frontend**: `AdminTab` → `AnalyticsPanel` — грід з 5 плиток (onboarding%, перший Space%, перший Memory%, активні 7д, активні 30д) над списком юзерів.
- Закриває чекбокс "Базова аналітика" з RELEASE.md Етап 0. Якщо пізніше знадобиться по-екранний/поведінковий трекінг — окремий легкий event-лог (свій, не сторонній), не раніше.

### ✅ Відновлення пароля + Spaces фікси (2026-07-29)

- **Forgot/Reset password** — `POST /api/auth/forgot-password` ({email} → якщо акаунт з паролем існує, генерує `resetPasswordToken`+`resetPasswordExpires` (1г), шле лист через Resend; завжди `{ok:true}` — анти-enumeration) + `POST /api/auth/reset-password` ({token, newPassword} → перевіряє токен+expiry, хешує новий пароль, автологінить JWT+refresh, як verify-email). Frontend: `/forgot-password` (ForgotPassword.tsx), `/reset-password?token=` (ResetPassword.tsx, автологін+редірект), лінк "Забули пароль?" на Login. Закриває блокер з RELEASE.md Етап 0 (реєстрація була, відновлення доступу — не було).
- **TripSpaceView — quick actions баг** — `trip` був у exclusion-списку generic actions/content блоку в `spaces/index.tsx` (додано раніше щоб не дублювати ВИТРАТИ), через що trip-простір не мав жодного способу додати задачу/нотатку/спогад. Виправлено: `trip` прибрано з обох exclusion-умов (actions + content), секція "ВИТРАТИ" в generic-блоці явно виключена тільки для `trip` (вже рендериться в `TripSpaceView`) — уникнуто повторного дублювання транзакцій.
- **HomeSpaceView видалено** — компонент був повністю не використаний (ніде не імпортувався, `home`-простори фактично йшли через generic-блок); `homeStore.ts` теж видалено після того як лишився без референсів. Backend (`HomeEvent` модель, `homeController`, роути) не займали — лишається про запас.

### ✅ Лендінг — hero "криниця", маскот, реальні скріншоти (2026-08-03)

- **Hero-анімація** (`Landing.tsx`/`.module.css`) — мотив криниці Мімісбрунн: пульсуюче світіння, брижі-хвилі що розходяться, іскри-думки що спливають вгору, асиметричне подвійне кільце + приглушена руна в центрі
- **Маскот у двох секціях** — тихий, приглушений (без акценту) у блоці Life Spaces (цитата-бульбашка внизу блоку) і в секції "Як працює MIMIR" (більш виразна репліка-запрошення поруч з маскотом)
- **4-й Life Space** — "Компанія / друзі" (було 3: Я / Сім'я-пара / Подорож-проєкт)
- **"Реальний інтерфейс"** — плейсхолдери замінено реальними скріншотами (`client/public/screenshot/{dashboard,space,memory,mimir}.webp` — сконвертовано з PNG через `sharp`, ~93% менша вага, 2026-08-03)
- **Hero CTA** — "Створити свій простір →" веде напряму на `/register` (без waitlist-гейту — див. RELEASE.md щодо стратегії бета/паблік)
- Копірайт спрощено за фідбеком Джонні: прибрано потрійний повтор "MIMIR" на екрані, замінено штучне "рішеннями твого життя", вирівняно контраст слогану, ущільнено вертикаль hero
- **Баг-фікс:** `RaceCountdownStrip` — градієнт-оверлей банера був закоментований у JSX, F1-банер показував голе світле фото без темного скріму на темних темах
- **Баг-фікс:** `GreetingBlock.THEME_PHOTOS` — ключ мапи лишився `mimir` після перейменування теми на `vellum`, фон привітального блоку зникав на дефолтній темі

### ✅ Launch: прибрано beta-гейт, дрібні фікси (2026-08-03)

- **Рішення: без закритої бети.** `AppHeader` — прибрано бейдж ".beta" біля лого. `Landing` — waitlist-форма ("Закрита бета" → `/api/waitlist`) замінена на прямий CTA-блок з лінками на `/register`/`/login`: **продукт публічний, гейту немає**. Backend `/api/waitlist` роут і модель лишені як є (для історичних записів, адмін-перегляд не чіпали). Це закриває стратегічну розбіжність з моделлю запуску в RELEASE.md — рішення вже прийнято, документ був не оновлений.
- **fix(mood):** `PATCH /:date/note` не нотифікував сім'ю — тільки `PUT /:date` це робив
- **fix:** override-селектор мав нижчу специфічність ніж правило яке мав перебити
- **fix:** іконки простору на обкладинці рендерились суцільними чорними блоками на темах vellum/pixel

### ✅ Оптимізація прод-білда (2026-08-03)

- **Route-level code splitting** — усі екрани крім Login/Register/Landing/Dashboard (критичні для першого пейнту) переведено на `React.lazy()` + `<Suspense>` в `App.tsx`. Головний entry-чанк: **2104KB → 746KB** (535KB→199KB gzip)
- **manualChunks (`vite.config.ts`)** — `mapbox-gl`/`@mapbox` і `@nivo` (важкі, фіча-специфічні бібліотеки) винесено з загального `vendor` в окремі `map-vendor`/`charts-vendor` чанки — більше не вантажаться на кожній сторінці, тільки коли реально відкривається Memories-карта чи Watchlist-статистика. Спільний `vendor`: **2238KB → 148KB** (635KB→50KB gzip)
- **Скріншоти лендінгу → WebP** — 4 файли конвертовано через `sharp` (вже в залежностях): **3873KB → 256KB** (~93% менше), оригінальні PNG видалено з `client/public/screenshot/`
- **Sentry sourcemaps** — додано `filesToDeleteAfterUpload` в `sentryVitePlugin`: карти вивантажуються в Sentry для читабельних стек-трейсів, потім видаляються з `dist/` — раніше лежали в публічному білді поруч з JS і були технічно фетчабельні
- **Разом:** критичний шлях першого пейнту (react-dom + vendor + entry-чанк) — приблизно **1229KB → 306KB gzip**, без зміни функціональності
- **Прибирання мертвих ассетів `client/public/` — 180MB → 33MB.** Купа папок мала одночасно важкий оригінал (2-17MB PNG/JPG) і вже готовий `.webp`, який реально використовує код — оригінали ніде не читались, просто лежали задеплоєні. Видалено: `theme/*.png`/`*.jpg` (застарілі + перейменовані castle/japan теми, ~58MB), `hand_drawn/` (18MB, 0 звернень у коді), `achivement/monolith-leveling/` + `category-bg.png` (~21MB), `achive/*.png` крім `profile/` та `mimir-runes-transparent/` (~33MB), `mascot/` (3.8MB, дублює `mimir/*.webp`), `mimir/mimir-empty-memories.png`+`mimir-notifications.png` (~3.3MB), `toggler/*.png` крім `f1.png` (~3.1MB), кореневі сирітські файли (`achive_tree.png`, старі favicon/badge/logo, ~2.6MB). **Не займали** `achive/profile/level-*.png` (10 файлів, ~3.1MB) — виглядає як заготовка під невпроваджену фічу (портрети рівнів), лишено про запас.
- **Backend: `compression` middleware** — API не стискав JSON-відповіді взагалі (Railway, на відміну від Vercel, не робить це сам за проксі-рівнем). Додано `app.use(compression())` в `backend/src/index.ts` після `helmet()`.
- **Backend: індекси перевірені** — усі гарячі моделі (SprintTask/TodoItem/Memory/Note/RecurringPayment) мають inline `index: true` на `userId`/`spaceId`, реальної прогалини не знайдено.
- **Шрифти: `@import` → `<link>`** — 15 родин шрифтів (усі 6 тем) вантажились одним рендер-блокуючим `@import` в `global.css` замість паралельного `<link>` в `<head>`. Перенесено в `index.html`, додано `preconnect` до `fonts.gstatic.com` (раніше був лише до `fonts.googleapis.com` — сам файл шрифту вантажиться з gstatic).
- **Прибрано мертвий `animejs` CDN-скрипт** — синхронний блокуючий `<script>` в `index.html`, `window.anime` ніде не використовується в коді (0 звернень).
- **Tabler Icons запінено** — `@tabler/icons-webfont@latest` (CDN) замінено на конкретну версію `@3.46.0`, яку резолвив `@latest` на момент перевірки.
- Перевірено вручну (Puppeteer): логін, дашборд, перемикання теми Vellum→Cyber→Vellum — фонові фото, кастомні шрифти і Tabler-іконки рендеряться коректно.

- **Баг:** `isRoutineDueOnDay` (`client/src/features/sprint/utils/sprint.ts`) не перевіряв дату створення звички для `daily`/`weekly`/`monthly` repeat (тільки `custom`-interval мав anchor-перевірку) — щойно створена звичка рахувалась "запланованою" і для тижнів **до** свого створення, показуючи фантомні пропуски (0%) у статистиці. Виправлено: anchor-перевірка (`repeatStartDate ?? createdAt`) тепер застосовується до всіх типів repeat одразу на вході функції.
- **Замінено віджет "Виконання звичок"** (тижневий % виконання, який був вразливий до цього бага за конструкцією — фіксовані тижневі вікна замість "рахувати до першого пропуску") на **серію звичок** (`calcOverallStreak` в `WeekExpandedView`): поточна серія + рекорд (дні поспіль коли всі заплановані на день звички виконані; дні без запланованих звичок не рвуть і не подовжують серію) + смужка крапок за останні 14 днів.

- **HeroCard — фінанс блок:** видалено bar chart; замінено на stat strip (Сьогодні / 7 днів / Пік з назвою дня). Фон `var(--accent-soft)`. Контраст тексту налагоджено по всіх 6 темах: noir — `var(--surface)` фон як у решти блоків; pixel — білий текст; arctic/japan — dark text overrides; cyber — `var(--text)` для лейблів; velvet — золота ₴ і peak accent.
- **F1 RaceCountdownStrip — баннер:** виправлено `LIGHT_THEMES`: arctic видалено (баннер dark), japan залишено (баннер light). `new Set(['pixel', 'japan'])`.
- **VehicleSpaceView — фото авто:** виправлено відображення після завантаження — `profile?.photoUrl` тепер рендерить `<img>` замість SVG-medallion.
- **VehicleSpaceView — navbar:** кнопки "Назад" і "Редагувати" перенесено з `position: absolute` всередині картки в окремий `vehicleNavBar` рядок над hero card — більше не перекриваються з фото.
- **SpacesStrip — назва картки:** `-webkit-line-clamp` змінено з 1 на 2 рядки.
- **SpacesStrip — створення простору:** кнопка "Додати" тепер відкриває inline sheet (template → form) замість переходу на `/profile?tab=spaces`. Реалізовано через `createPortal(…, document.body)` щоб уникнути overflow/transform stacking context. `useSwipeToDismiss` для drag-to-close.
- **AchievementsTab — XP display:** змінено з `"60 рун · до рівня 3: 20"` на `"60 / 2000 рун"` (game-style). `score.earned` — більший і яскравий (`.heroSubCurrent`), total — приглушений. Шрифт `var(--font-mono)`.

### ✅ HeroCard, SpacesStrip, Memories, Profile polish (2026-07-21)

- **HeroCard redesign:** без бюджету — 30/70 split: ліво баланс + "today chip" (витрачено / денний бюджет), право SVG area chart (7 днів). З бюджетом — full-width: progress bar + 3 стати. Видалено bar chart і `upcomingTotal`/`upcomingCount` відображення з картки.
- **SpacesStrip — 85px avatars:** при `f1Enabled=false` аватари в SpacesStrip рендеряться через клас `.avatarLarge` (85px замість 64px) — більше місця без F1 блоку.
- **Profile readability:** username і email в hero-картці профілю отримали колір `var(--text2)` замість `var(--text3)` — кращий контраст.
- **Cyber theme surface:** `--surface` змінено з `#0a1628` на `#0e1828` — злегка тепліший, менш агресивний.
- **memoriesStore `_deletingIds`:** виправлена race condition — при паралельному `deleteMemory` + `fetchMemories` список міг показати щойно видалений елемент. `_deletingIds: Set<string>` фільтрує результати fetch.
- **Achievements — UX cleanup:** видалено тестову кнопку "Unlock All"; celebration modal отримав плавніший enter/exit; картки ачівок відсортовані по категоріям.
- **DeadlineSheet redesign:** перероблено з vertical radio-list на pill-chips (PillSelector) для вибору часового інтервалу нагадування.

### ✅ Типізовані Space-вʼюхи (2026-07-11)

- [x] **Home Space** — `homeProfile` sub-doc (`address/ownership/area/floor/moveInDate/photo`); `HomeEvent` модель (repair/payment/purchase/document/inspection/note/photo); CRUD `/api/spaces/:id/home/(profile|events)`; `HomeSpaceView` — профільна картка + 6 quick actions + хронологія; toggle-пікери дат
- [x] **Pet Space** — `petProfile` sub-doc (`name/species/breed/birthDate/weight/photo/chip/passport`); `PetEvent` модель (vet_visit/vaccination/medication/grooming/weight/note); CRUD `/api/spaces/:id/pet/(profile|events)`; `PetSpaceView` — профільна картка з круглим фото + 5 quick actions + хронологія
- [x] **Trip Space** — `tripProfile` sub-doc (`destination/startDate/endDate/travelers/status`); profile routes `/api/spaces/:id/trip/profile`; `TripSpaceView` — картка напрямку, дати/тривалість, статус-бейдж (planning/ongoing/completed)
- [x] **spacesStore** — `setHomeProfile` / `setPetProfile` / `setTripProfile` локальне оновлення; `homeStore` / `petStore` / `tripStore` Zustand stores; `SpaceDetail` рендерить typed view за `space.type`
- [x] **Виправлення VehicleSpaceView** — infinite render loop у `VehicleStats` (`?? []` всередині Zustand-селектора → нова reference кожен render; виправлено `EMPTY_VEHICLE_EVENTS` const поза компонентом); форма профілю не скидалась після збереження (додано `setVehicleProfile` action); date-picker кнопки одразу відкривали календар (виправлено toggle-state + conditional render паттерн в усіх 4 шитах)

---

## 14. Design System — аудит тем і семантичні токени

### ✅ Фаза 1 — Контраст, атмосфера, z-index (2026-07-11, за рекомендацією Джонні)

> Назви тем нижче історичні на момент запису: `velvet` → перейменовано в `aurum`, `japan` → перейменовано в `mimir` → потім в `vellum` (поточна назва в коді).

- [x] **velvet** — `--accent: #c99a2e` (потемніло для кращого контрасту), `--gold: #e0b95a`, `--gold-dim`
- [x] **noir** — явний `--text3: #6a6a6a`, `--border: #303030`, `--border2: #464646`
- [x] **cyber** — opacity сітки 0.04→0.025, scanline 0.05→0.032 (менш агресивно)
- [x] **japan** — `body::after` (washi ruled lines), `body::before` (червона пляма зверху)
- [x] **pixel** — явний `--font-ui: 'JetBrains Mono'`, `--font-body: 'PT Sans'`
- [x] **Виправлення z-index** — всі `body::before/after` атмосфери: `z-index: 9996-9998` → `z-index: 0`; `#root`: `position: relative; z-index: 1` — гарантує що модалки/тости не перекриваються
- [x] **japan/pixel tap feedback** — `--tap-bg: rgba(0,0,0,0.05)` для правильних пресс-станів

### ✅ Фаза 2 — Семантичні токени (2026-07-11)

Новий блок CSS-змінних у `global.css` `:root`:

```css
--panel-danger-bg, --panel-danger-border        /* danger-info-panels */
--panel-info-bg,   --panel-info-border          /* info-panels */
--panel-success-bg, --panel-success-border      /* success-panels */
--tint-danger, --tint-gold, --tint-success      /* transparent tints for buttons/badges */
--card-bg, --card-border                        /* surfaces (cards vs panels) */
--nav-bg, --nav-border                          /* bottom nav surface */
--tap-bg                                        /* press/tap feedback */
--focus-ring                                    /* keyboard focus outline */
```

- [x] **Міграція Sprint** — `Sprint.module.css`, `AddSprintItemModal.module.css`, `TaskDetailModal.module.css`, `PriorityBadge.module.css`: всі `color-mix(in srgb, ...)` → семантичні токени
- [x] **inputError** — `rgba(184,58,45,0.08)` → `var(--panel-danger-bg)` в `global.css`
- [x] **Повна міграція color-mix** — автоматична (Python-скрипт `scripts/migrate-color-mix.py`): 15 нових токенів в `global.css`, 94 заміни у 37 файлах. Залишились тільки виправдані `color-mix()`: gradient-stop значення, hex-кольори в WeatherModal, dynamic CSS vars (`--space-color`, `--cat-color`, etc.)

  Нові токени: `--tint-accent-xs/sm/10/md/lg/xl`, `--accent-wash`, `--accent-wash-md`, `--accent-border-strong`, `--tint-gold-sm/md`, `--border-alpha-50/60`, `--tint-muted`, `--tint-second`

---

---

## Функціональний аудит сторінок (2026-07-21)

> Відомі UX-прогалини і шорсткості по кожній сторінці після аудиту коду.

### Dashboard
- **HeroCard — баланс vs витрати:** `displayed` анімує `balance` (топап − витрати всіх часів), але лейбл "цей місяць" — семантичний розрив. Без бюджету юзер бачить загальний баланс але думає що це місячна витрата.
- ~~**FAB — немає "Спогад"**~~ ❌ Свідоме рішення (2026-07-30, підтверджено юзером) — Dashboard FAB навмисно без швидкого додавання спогаду, не додавати.
- ~~**MimirHint — нема fallback**~~ ✅ Досліджено (2026-07-30): не баг — поки `aiHint` вантажиться і немає daily greeting, компонент рендериться як `null` (не порожній DOM-елемент); `.mimirFloat` до того ж завжди `height:0`, тож навіть якщо контент є — layout shift неможливий за дизайном.

### Finance
- ~~**patchTransaction не відправляє на бекенд**~~ ✅ Закрито — перевірено (2026-07-29): вже викликає `authFetch` PATCH з rollback при помилці (backlog був застарілий).
- **Кеш sessionStorage обмежений 200 транзакціями:** якщо юзер робить `fetchTransactions(month)` для різних місяців — кожен раз fetchuje знову без кешу, але і не показує stale-стан.
- ~~**addTopup/addExpense — немає error rollback**~~ ✅ Закрито (2026-07-29): при помилці POST тепер видаляється temp-транзакція і відкочується баланс; той самий фікс додано і в `deleteTransaction` (rollback при помилці DELETE).

### Sprint (Квести)
- ~~**AddSprintItemModal deadline chips**~~ ✅ Перевірено (2026-07-30): `AddSprintItemModal` не має edit-режиму взагалі (тільки add) — `draftTime` завжди стартує з `'09:00'` і ніколи не читається з існуючої задачі, бо редагування йде окремо через `TaskDetailModal` (без local mirror state, PATCH напряму в стор). Компонент `DeadlineSheet` виявився мертвим кодом (ніде не імпортувався) — видалено разом зі стейл-згадкою в `ReminderFields`.
- **Drag-to-reorder (useSprintDrag):** не реалізовано для задач в SpaceDetail — там порядок фіксований по `createdAt`.
- **TrashBin soft-delete:** TTL 24г на бекенді — юзер може не встигнути відновити якщо не знає про кошик.

### Memories
- ~~**fetchRelated**~~ ✅ Досліджено (2026-07-30): не мертвий код — живить карусель "ПОВ'ЯЗАНІ СПОГАДИ" в `detail.tsx`. Relevance-скоринг (+3 спільний тег, +2 fuzzy локація, +1 той самий місяць+рік, +0.5 той самий місяць інший рік, +1 річниця ±7 днів; поріг 2, топ 6) задокументовано докстрінгом над `getRelated` у `memoryController.ts`.
- **MemoryMap — пустий стан:** якщо у юзера 0 спогадів і 0 планів — карта показує глобус без пінів, нема underlay hint.
- ~~**EditMemoryModal `withProfiles`**~~ ✅ Закрито — перевірено (2026-07-29): бага немає, `onSave` завжди відправляє поточний `withProfiles`, зміна обкладинки йде окремим PATCH `{coverUrl}` що не чіпає інші поля.

### Spaces
- ~~**SpaceDetailScreen — дублювання транзакцій DOM**~~ ✅ Закрито — `trip` додано до exclusion list generic content block (2026-07-23).
- ~~**SpacesStrip — `general` тип відсутній в TYPE_OPTIONS**~~ ✅ Закрито — перевірено (2026-07-29): типу `'general'` не існує ніде в коді (ні backend enum, ні frontend), пункт був застарілий/помилковий (плутанина з `blank`).
- ~~**TripSpaceView — без quick actions**~~ ✅ Закрито — `trip` прибрано з exclusion-списку generic actions/content блоку, ВИТРАТИ в generic-блоці виключена тільки для trip щоб не дублювати (2026-07-29).

### Recipes
- ~~**AI генератор — gate через PaywallGate**~~ ✅ Закрито (2026-07-30) — реальний баг: кнопки взагалі не мала гейту (`useCanUseFeature`/`PaywallGate` не викликались), free-план міг відкрити генератор і отримати помилку тільки після сабміту (бекенд вже enforce'ив `requireFeature('aiChat')`). Додано `useCanUseFeature('aiChat')` + редірект на `/profile?tab=plan` + lock-бейдж, за зразком AppHeader.
- ~~**RecipeDetail "Шеф"**~~ ✅ Закрито (2026-07-30) — причина: ефект автоскролу вниз спрацьовував на кожен SSE-чанк, тому `scrollTop` ніколи не міг дійти до 0, а `useSwipeToDismiss` дозволяє drag тільки коли scrollable body вгорі. Додано sticky-bottom автоскрол — стежить за низом лише поки юзер сам не проскролив вище.

### Watchlist
- ~~**Книги (Books):**~~ ✅ Реалізовано (backlog був застарілий).
- ~~**WatchlistStatsSheet**~~ ✅ Закрито (2026-07-30) — аніме виявилось коректним (окремий TMDB `/tv/` запит + свій фолбек 24хв/еп, а не 45хв серіалів). Реальний баг: книги взагалі не потрапляли в розрахунок тривалості (0 внесок у години/розподіл). Додано оцінку часу читання за `pageCount` (~1.2хв/сторінку, фолбек 300 стор.) + сегмент "Книги" в розподілі.

### Profile
- **ChangelogSheet workflow:** задокументовано що потрібно дописувати `CHANGELOG` перед кожним пушем — на практиці часто пропускається. Немає валідації в pre-push hook.
- ~~**MeAccount / export:**~~ ✅ Закрито — VehicleEvent/HomeEvent/PetEvent додані до `/api/user/export` (2026-07-23).

### Achievements
- ~~**Локальний стор**~~ ✅ Вже синкаються через `achievementsStore.unlock()` → `profileStore.updateProfile({ unlockedAchievements })` → `PATCH /api/auth/me` (backlog був застарілий).
- **useAchievementProgress / AutoUnlockWatcher:** досліджено (2026-07-29) — прогрес не може хибно "стрибнути" (рахується від реальних масивів, тільки зростає), тож false unlock немає. Реальний нюанс: `AutoUnlockWatcher` встановлює "seenOnMount" baseline при ПЕРШІЙ непорожній `toUnlock`, а не при справжньому першому рендері — тому якщо у юзера це перший unlock за сесію і stores ще не встигли догрузитись, celebration-модалка може бути пропущена (тихо запишеться як catch-up). Виправити технічно можна, але потребує сигналу "stores hydrated", якого зараз немає в жодному з 6 stores — потрібне архітектурне рішення, не зробив.

### F1
- ~~**OpenF1 polling на `/f1/live`**~~ ✅ Досліджено і закрито (2026-07-29): реального 404-шторму не було (backend проксі вже повертає `[]`/помилку без падінь), але `/f1` (не `/f1/live`) молотив `sessions?meeting_key=latest` кожні 60с цілий рік незалежно від сезону. Тепер polling запускається тільки в тиждень реальної гонки (`getRaceThisWeek`).

### Технічний борг — useEffect setState (2026-07-29)
- ~~**RecurringPayments**~~ ✅ Вже виправлено в попередній сесії (backlog був застарілий) — обидва ефекти коректно обгорнуті.
- ✅ Знайдено і виправлено той самий патерн (синхронний setState перед async-логікою в тілі ефекту) ще в 4 місцях: `f1/index.tsx` (у власному щойно написаному фіксі), `spaces/index.tsx` (Unsplash trip-cover ефект), `shared/hooks/useWeather.ts`, `shared/hooks/usePushSubscription.ts` (останній також не мав `cancelled`-гарду — можливий setState після unmount).

---

## Технічний борг — залишок

| Задача | Статус |
|--------|--------|
| Верифікація email | ✅ Закрито (mimir-hud.tech + Resend) |
| MongoDB M10+ | 🟢 Некритично поки < 100 юзерів |
| Семантичні токени (міграція CSS) | ✅ Закрито — 15 нових токенів, 94 заміни у 37 файлах |
| `patchTransaction` — немає authFetch на бекенд | ✅ Закрито — authFetch вже є; додано whitelist-фільтр на backend update (2026-07-23) |
| MeAccount export — VehicleEvent/HomeEvent/PetEvent | ✅ Закрито — додано до `/api/user/export` (2026-07-23) |
| Achievements localStorage — немає бекенд sync | ✅ Закрито — вже синкаються через profileStore → `PATCH /api/auth/me` (backlog був застарілий) |
| ChangelogSheet — ручний процес, немає pre-push hook | 🟡 Процесний борг |
| SpaceDetail — дублювання generic content для trip/home/pet | ✅ Закрито — trip додано до exclusion list (2026-07-23) |
| Usі інші | ✅ Закрито |
