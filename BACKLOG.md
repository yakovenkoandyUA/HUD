# MIMIR — Беклог і Roadmap

> Цей файл не завантажується автоматично в Claude Code. Читай його коли потрібен контекст по беклогу, roadmap або що вже реалізовано.

---

## Стратегічний напрямок продукту — Цифрова пам'ять / Family OS

> Репозиціонування з "персонального органайзера" в "цифру пам'ять людського життя" / Family OS. Не скасовує існуючі модулі (фінанси/спринт/рецепти лишаються) — додає над ними шар, що зв'язує дані в історію, а не просто список записів. Деталі ціноутворення під цей напрямок → [`MONETIZATION.md`](MONETIZATION.md), розділ "Репозиціонування монетизації".

### Family Timeline — ✅ MVP реалізовано (2026-06-21, не задеплоєно)
Хронологічна стрічка, що мерджить Memory + visited Plan + Watchlist (`watchedWith`) + CookLog/Recipe + MoodLog (агреговано по місяцях, тільки тренд — без raw score/note). `GET /api/timeline?year=&scope=all|mine|family`, екран `/timeline`, entry point на Dashboard (`TimelineTeaser`). Деталі реалізації — `backend/src/controllers/timelineController.ts`, `client/src/screens/Timeline/`.
**Privacy-рішення цієї сесії:** Plan зараз приватний (без family-scope в `/api/plans`) — додано в Timeline з family-видимістю свідомо (узгоджено з юзером). Mood — тільки агрегований тренд, ніколи конкретні дні/нотатки.
**Не зроблено:** жодного фічевого гейту (немає Free/Pro обмежень на глибину історії чи кількість подій) — Timeline зараз повністю відкритий усім юзерам. Це навмисно для MVP, але білінг-фаза має вирішити, чи лишати так.

### Family Yearbook — концепція, не розпочато
Річний "Wrapped"-звіт на основі тих самих джерел що Timeline + кешований MongoDB-документ (`YearbookReport`) замість генерації на кожен запит. Поглинає і замінює пункт "📊 MIMIR Wrapped" нижче в пріоритезованому плані — той самий продукт, точніша назва. AI-наратив (Anthropic) — опційна надбудова над deterministic-статистикою, не основа.

### Memory Engine
Робоча назва для backend-агрегаційного шару, який вже існує у вигляді `timelineController` (мердж кількох колекцій в єдину хронологію за userId+family). Поки що це один контролер, не окремий сервіс — виносити в окрему абстракцію немає сенсу, доки немає другого споживача (Yearbook стане другим).

### Personal Knowledge Graph — аспіраційно, Фаза 3+
Зв'язки між сутностями (місце ↔ спогад ↔ рецепт ↔ людина ↔ настрій) як граф, не просто хронологія. Жодної технічної підготовки під це не закладено — поточні моделі не мають полів для типізованих зв'язків між сутностями. Не починати, доки Timeline/Yearbook не підтвердять, що юзери взаємодіють з агрегованими даними.

### F1 — Labs / нішевий преміум-модуль, не core-позиціонування
F1 вже технічно ізольований через `f1Enabled` boolean-флаг в профілі (не роль) — фактично це вже "Labs"-фіча для одного юзера (Котька), не частина основного продуктового наративу "цифрова пам'ять для сім'ї". Маркетингово і в ціновій сітці F1 не повинен з'являтись поруч з Timeline/Yearbook/Spogady — це окремий "для фанатів" додаток, не core value proposition.

### Ціноутворення на основі цінності пам'яті/сім'ї
Розгорнуто в `MONETIZATION.md` → "Репозиціонування монетизації". Коротко: відхід від продажу лімітів (кількість записів/сканів) до продажу глибини й тривалості сімейного архіву (Personal vs Couple vs Family/Home). Старі тарифи (Free/Pro/Family, 149/249₴) лишаються чинними — нова сітка позначена як пропозиція на розгляді, не рішення.

---

## Статус (2026-06-20) — Що реалізовано

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
- `plans` — місця (want/planned/visited), LocationIQ геокодинг, конвертація в Memory
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

**Jobs/schedulers:** routineReminders, recurringReminders, dayReminder, episodeReminder, f1Scheduler (22 GP 2026 + live notifications)

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
- `/memories` — таймлайн + сітка + Leaflet карта, "Цей день рік тому"; МІСЦЕ через LocationSearch (LocationIQ автокомпліт) або LocationMapPicker (тап на карті)
- `/memories/:id` — фото, Canvas export → PNG/Web Share (поставити обкладинкою — лише з галереї фото або EditMemoryModal, без накладання тексту)
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
- `DayOverlay` — МІЙ ДЕНЬ: слоти morning/afternoon/evening, mood tracker (SVG), сімейні настрої, місячний heatmap
- `MemoryMap` — Leaflet піни планів і спогадів (координати з LocationIQ); тап на пін плану — popup/highlight на карті, тап на пін спогаду — navigate на `/memories/:id`
- `LocationSearch` / `LocationMapPicker` — пошук місця (LocationIQ автокомпліт) або тап на карті, спільні для AddMemoryModal і PlanForm
- `ReceiptScanner` — Anthropic Vision
- `Modal` — drag-to-dismiss (0.4× damping, 120px cap, 0.18s overlay fade)
- `useSwipeToDismiss` / `useModalHistory` — стандартні хуки для bottom sheets

**Теми (7):** retro / velvet / japan / cyber / noir / pixel / arctic

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

### 🟡 Не починалось (продуктові фічі)
- **MIMIR Wrapped** — річна статистика à la Spotify Wrapped
- **Letterboxd / Goodreads імпорт** — Monobank є, але інші імпорти ні
- **Книги (Books)** — backend `/api/books/search` (Google Books) є, але UI у Watchlist позначено "В РОЗРОБЦІ" (тоггл в профілі disabled, placeholder при відкритті табу)

### ✅ AI Chef-асистент — зроблено
Кнопка "Шеф" в `RecipeDetail` (поряд з Wishlist/Покупки/Приготував) відкриває `ChefChatSheet` — той самий UI-паттерн що `AiChatSheet` з Dashboard (SSE streaming, Claude Haiku). Контекст рецепту (title/ingredients/instructions/servings/difficulty/cookTime/calories) передається в тілі запиту з фронтенду напряму в `POST /api/ai/chef-chat` — без додаткового похід в БД і дублювання scope-логіки доступу до рецептів (mine/family/all).

### ✅ Memories: форма "Нова подія" — доопрацьовано
Компактна обкладинка, МІСЦЕ+ДАТА в один ряд, дата DD.MM.YYYY. Пошук місця замінено з Nominatim на LocationIQ (POI-пошук закладів, не лише адрес; Mapbox оцінювався, але вимагає картку навіть на free tier). Додано "Обрати на карті" (`LocationMapPicker`, тап на Leaflet + реверс-геокодинг), центрується по введеному запиту або геолокації. Прибрано "Поставити постер як обкладинку" (`PosterGenerator`) — псувало фото текстом, дублюючи вже чистіші шляхи (галерея фото / EditMemoryModal); "Поділитись" (export PNG) залишився.

### ✅ Memories: карта з пінами спогадів
`Memory` модель отримала `lat`/`lng` (опціонально). `AddMemoryModal`/`EditMemoryModal` зберігають координати разом з адресою. `MemoryMap` (таб КАРТА) тепер показує піни і планів, і спогадів одночасно — план відкриває popup/highlight на карті, спогад одразу веде на `/memories/:id`. Старі спогади без координат не з'являються на карті, поки їх не відредагувати через EditMemoryModal.

### 🟠 Потребує доопрацювання
- Інше по Memories — за потреби, уточнювати з юзером

### 🔵 Стратегічне (Фаза 2+)
- **Onboarding flow** — welcome 3-4 кроки, empty states з підказками, вибір модулів
- **Лендінг** — mimir.app або аналог
- **Web/desktop layout** — зараз mobile-first
- **Stripe білінг** — Free/Pro/Family підписки
- **GDPR export** — JSON архів даних
- **iOS/Android віджети** — домашній екран
- **MongoDB M10+** — некритично поки < 100 юзерів

---

## Пріоритизований план — що далі і в якій послідовності

### ~~1. 🔧 Memories доопрацювання~~ ✅ Зроблено
Пошук місця (LocationIQ), "Обрати на карті" (LocationMapPicker), дата DD.MM.YYYY, прибраний постер-як-обкладинка, карта з пінами планів+спогадів, z-index фікс модалки плану.

### ~~2. 🎮 Games — окремий UI у Watchlist~~ ✅ Зроблено
Game tab повністю інтегрований у `/watchlist` (GameSearch overlay, GameCard, GameDetail, GameHero, сортування, фільтр жанрів). Окремий екран `/screens/Games` видалено — `/games` редіректить на `/watchlist`.

### ~~2a. 🤖 AI Chef-асистент~~ ✅ Зроблено
Кнопка "Шеф" у `RecipeDetail` → `ChefChatSheet` (SSE, Claude Haiku, контекст рецепту з фронтенду). Деталі в розділі "Що реалізовано" вище.

### ~~3. 📧 Верифікація email~~ ✅ Зроблено
Домен `mimir-hud.tech`, Resend, `VerificationBanner`, enforcement у receipt scanner — все є.

### 4. 📊 MIMIR Wrapped → Family Yearbook
Перейменовано/уточнено в розділі "Стратегічний напрямок продукту" вище — той самий продукт, точніша назва під Family OS позиціонування. Річна статистика: топ-категорії витрат, скільки рецептів приготовано, скільки фільмів переглянуто, топ-настрій, F1 accuracy. Canvas/SVG шаркейбл картка. Anthropic для narrative summary. Кешувати в Mongo (`YearbookReport`), не генерувати на кожен запит. Будувати на тих самих джерелах, що вже агрегує Family Timeline (✅ MVP реалізовано) — не дублювати query-логіку.

### 5. 📥 Letterboxd / Goodreads імпорт
CSV парсинг на бекенді → масовий import в watchlistStore. Letterboxd і Goodreads обидва дають CSV export.

### 6. 🚀 Onboarding
Welcome screen при першому вході (після реєстрації): вибір модулів, перші кроки, empty states з підказками. Передумова для публічного launch.

### 7. 💳 Stripe білінг
Free/Pro/Family. Тільки якщо буде рішення про монетизацію.

---

## Технічний борг — залишок

| Задача | Статус |
|--------|--------|
| Верифікація email | ✅ Закрито (mimir-hud.tech + Resend) |
| MongoDB M10+ | 🟢 Некритично поки < 100 юзерів |
| Усі інші | ✅ Закрито |
