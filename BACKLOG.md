# MIMIR — Беклог і Roadmap

> Цей файл не завантажується автоматично в Claude Code. Читай його коли потрібен контекст по беклогу, roadmap або що вже реалізовано.

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
- `memories` — спогади + фото (Cloudinary) + теги + PosterGenerator (Anthropic → Pollinations.ai)
- `plans` — місця (want/planned/visited), Nominatim, конвертація в Memory
- `notes` — нотатки
- `mood` — трекер настрою (1-5), MoodLog, сімейні настрої
- `family` — FamilyLink (pending/accepted), пошук юзерів
- `push` — Web Push підписки (VAPID), test endpoint
- `ai` — SSE streaming чат (Claude Haiku), генерація постерів
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
- `/watchlist` — movie/series/anime/book (OpenMoji таби), TMDB пошук
- `/memories` — таймлайн + сітка + Leaflet карта, "Цей день рік тому"
- `/memories/:id` — фото, Canvas export → PNG/Web Share
- `/notes` — inline edit, пошук
- `/profile` — MeTab (avatar, name, username, password, СІМ'Я), WalletTab (Monobank, salaryDay, категорії pill-cloud + ВИТРАТИ/ПОПОВНЕННЯ таби + icon picker), PlanTab, AdminTab
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
- `MemoryMap` — Leaflet + Nominatim піни
- `ReceiptScanner` — Anthropic Vision
- `PosterGenerator` — Anthropic Haiku → Pollinations.ai → Cloudinary
- `Modal` — drag-to-dismiss (0.4× damping, 120px cap, 0.18s overlay fade)
- `useSwipeToDismiss` / `useModalHistory` — стандартні хуки для bottom sheets

**Теми (7):** retro / velvet / japan / cyber / noir / pixel / arctic

---

## Що реально НЕ зроблено

### ✅ Верифікація email — повністю реалізована і активована
Домен `mimir-hud.tech` куплено на nic.ua, підключено до Vercel і Resend. DNS записи (DKIM/SPF/DMARC/MX) прописані. `noreply@mimir-hud.tech` → стилізований HTML лист (темний фон, золота кнопка, DRINK DEEP) → `/verify?token=...` → автологін (бекенд повертає JWT після верифікації). CORS і Google OAuth оновлені для нового домену.

### ✅ PIN lock — виправлено два баги
- `verifyPIN` тепер використовує `authFetch` замість сирого `fetch` — токен автоматично рефреститься якщо протух (раніше 401 від `requireAuth` помилково трактувався як "невірний PIN")
- `PinGuard` блокує при кожному свіжому завантаженні через `sessionStorage['hud-pin-session']` (раніше при refresh `pinLocked` скидався і PIN не показувався)

### 🟡 Не починалось (продуктові фічі)
- **MIMIR Wrapped** — річна статистика à la Spotify Wrapped
- **Letterboxd / Goodreads імпорт** — Monobank є, але інші імпорти ні
- **Ігри (Games)** — модель + store є (`gamesStore`, alias до watchlist), але окремого UI/екрану немає; не відображається в Watchlist табах

### 🟠 Потребує доопрацювання
- **Memories: карта + експорт** — реалізовано, але потребує polish (деталі уточнюються з юзером)

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

### 1. 🔧 Memories доопрацювання *(наступне)*
Конкретні проблеми уточнити з юзером. Карта і експорт є, але щось не влаштовує.

### 2. 🎮 Games — окремий UI у Watchlist
`gamesStore` і модель є, але ігри не відображаються в Watchlist. Додати таб 🎮 (OpenMoji) поруч з movie/series/anime/book. Мінімум: пошук (IGDB або RAWG API) або ручне додавання.

### ~~3. 📧 Верифікація email~~ ✅ Зроблено
Домен `mimir-hud.tech`, Resend, `VerificationBanner`, enforcement у receipt scanner — все є.

### 4. 📊 MIMIR Wrapped
Річна статистика: топ-категорії витрат, скільки рецептів приготовано, скільки фільмів переглянуто, топ-настрій, F1 accuracy. Canvas/SVG шаркейбл картка. Anthropic для narrative summary. Є сенс робити ближче до кінця року або як "підсумок місяця".

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
