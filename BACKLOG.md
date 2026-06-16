# MIMIR — Беклог і Roadmap

> Цей файл не завантажується автоматично в Claude Code. Читай його коли потрібен контекст по беклогу, roadmap або що вже реалізовано.

---

## Статус (2026-06-16) — Що реалізовано

> Технічний борг: Sentry ✅, Zod ✅, JWT refresh rotation ✅, helmet+CORS+rate-limit ✅, multi-tenancy audit ✅, PWA offline ✅, AI via backend ✅, feature flags замість ролей ✅



### Dashboard
- GreetingBlock (привітання + дата), HeroCard (баланс + sparkline 7 днів + dailyBudget bar)
- ✅ Interactive sparkline — 7 днів витрат, tap/hover tooltip з сумою і днем, auto-dismiss
- ✅ **DaySummaryCard** — уніфікований блок "СЬОГОДНІ" (замінив TasksAccordion + meal chips):
  - Рутин-чіпи: горизонтальний scroll, без фону і border-radius, `□ назва`, роздільник `·`
  - 2×2 грід: Квести / Покупки / Страва / Нотатки — кожен з окремою навігацією
  - Фон: `color-mix(in srgb, var(--accent) 22%, var(--bg))` + per-theme overrides
  - Плаский стиль без border-radius; HeroCard теж отримав плаский стиль
  - Dashboard `.content` gap: 0, точкові margin-top замість однакового gap
- WeekHeader з routines badge (X/Y), RaceCountdownStrip, RaceHeroCard (якщо гонка тижня)
- FAB (Витрата / Квест / Покупка / Нотатка), CarHero (Three.js McLaren)
- Pull-to-refresh, pixel CRT scanlines (pixel тема)
- ~~Nav chips (finance/sprint/f1)~~ — видалено як дублікат BottomNav

### Finance
- BalanceHero, TodayCard (delta/streak), StatsGrid (бонус/середнє/прогрес)
- TopupForm, ExpenseForm (кастомні категорії + субкатегорії, сканування чеків)
- TransactionList — фільтри з анімацією, inline редагування назви, сортування по createdAt
- ExpenseChart — donut (Recharts), виключає "Накопичення"
- GoalsList + GoalDetail — savings goals з deposits[]
- RecurringPayments — іконки сервісів, UAH/USD/EUR конвертація, sessionStorage кеш
  - Push-нагадування (1/2/7 днів, cron 09:00 UTC)
  - Підтвердження списання в день платежу → Transaction
- ShoppingTracker — на Finance екрані після RecurringPayments
- Streak економії (persist local)
- ✅ salaryDay — конфігурований день зарплати (1-31), зберігається в профілі; бюджетний цикл рахується від нього
- financeStore: sessionStorage кеш при mount (миттєве відображення без мерехтіння)

### Sprint / Quests
- Тижневий список задач: sprint / shopping / todo / уроки
- TaskDetailModal: МІТКИ, ДЕДЛАЙН, ЧЕК-ЛІСТ, ОПИС, LabelPicker
- Фільтр (bottom sheet): тип + статус (default: тільки активні)
- Рутини з repeat/nextDue/completionHistory, індикатор badge; WeekHeader показує X/Y рутин дня
- RepeatConfigScreen — гнучке налаштування повторень (weekly/monthly/custom)
- TrashBin — soft-delete (TTL 24h MongoDB), відновлення або purge
- useSwipeToDismiss + useModalHistory хуки
- Spring-анімація відкриття TaskDetailModal (0.46s cubic-bezier)
- assignedTo — TaskDetailModal секція ВИКОНАВЦІ, "Від {name}" блок на Sprint екрані; assignee може оновлювати/закривати задачу
- ✅ **WeekExpandedView — повний редизайн календаря:**
  - Місячна сітка: фіксована висота клітинок `grid-auto-rows: 62px`, кольорові числа (зелений/золотий/червоний) + кольорові крапки-індикатори
  - Inline день-деталь панель замість bottom sheet — відображає рутини та квести вибраного дня прямо під сіткою
  - Фільтр задач у панелі: тільки задачі з `dueDate === panelDay` (прибрано показ всіх без дати)
  - Кнопка «+» в day panel → `onAddForDay`: закриває overlay, відкриває форму додавання з pre-filled датою
  - Stats section: кольорові картки з реальними датами, прогрес-бар (зелений ≥80% / золотий ≥50% / червоний), підсвічування поточного тижня
  - Навігація по тижнях у вкладці ТИЖДЕНЬ: `viewWeekStart` state, `<`/`>` кнопки, swipe жести
  - Анімація переходу між тижнями: slide left/right залежно від напрямку (`weekSlideDirRef`)
  - «Повернутись на сьогодні» — кнопка знизу списку днів (замість незрозумілого чіпа «зараз»)
- ✅ **WeekHeader — перемикач вигляду календаря:**
  - Toggle кнопка поряд з ↗ (expand) — перемикає `'week' | 'month'`
  - **Week mode** (default): поточний 7-денний стрип
  - **Month mode**: компактна місячна сітка прямо в WeekHeader (34px клітинки, nav `< Місяць Рік >`), кольорові числа + крапки
  - Тап на день у month mode — фільтрує список квестів нижче; повторний тап → скидає на сьогодні
  - Стан зберігається в `localStorage` (`sprint-calendar-mode`)

### Watchlist
- Категорії: movie / series / anime / book
- Пошук: TMDB + Google Books (через backend proxy)
- WatchlistCard, WatchlistDetail, EpisodesList, StarRating
- watchedEpisodes[] (прогрес по сезонах), watchedWith (family members)
- Коментарі між профілями (/api/watchlist/:id/comments)
- Push-нотифікації: нові епізоди (13:00) + нові сезони
- Схожі рекомендації, decade фільтр, жанровий фільтр
- Swipe-to-dismiss, fullscreen search preview

### F1 (тільки admin)
- NextRaceCard (TrackSVG + draw-path + RaceCountdown)
- LastRaceCard (podium + fastest lap, Jolpica)
- RacePredictionCard (прогноз топ-3, scoring: exact=10/partial=5)
- RaceCalendarList (22 гонки 2026, тап → RaceDetail)
- ChampionshipTable: Календар / Пілоти / Конструктори / МІЙ СЕЗОН
- DriverStatsCard + ConstructorStatsCard (sessionStorage кеш, PixelCar анімація)
- RaceDetail: CircuitStatsSection, SessionScheduleSection, RaceWeatherSection, RacePodiumSection
- McLarenViewer (Three.js), аналоговий годинник (easter egg)
- ✅ F1 Live Race Dashboard — реалізовано (backend proxy + useOpenF1 hook + F1Live screen)

### Memories
- Таймлайн по місяцях + сітка 3 колонки
- Вкладки СПОГАДИ / ПЛАНИ
- Плани: локація (Nominatim), статус, нотатки, фото, конвертація в спогад
- Пошук, "Цей день рік тому" банер
- Генерація постера: Anthropic Haiku → Pollinations.ai → Cloudinary

### Push-нотифікації
- VAPID підключено, підписка в БД
- Тригери: F1 гонка за 1г, нові епізоди, нові сезони, рутини 09:00 UTC
- Нагадування по регулярних платежах (1/2/7 днів)

### Auth / Профілі
- ✅ Email + password (bcrypt) + Google OAuth (GIS) — повноцінний auth
- JWT 30 днів, profileStore + localStorage
- PIN-lock (4-цифри, bcrypt, 5хв неактивності)
- FamilyLink (запит/прийняти/відхилити), ізоляція даних (спогади + watchlist)
- ✅ ProfilePage — повністю реворкнуто: 4 таби через BottomNav адаптацію
  - **Я** — аватар, ім'я, username (inline edit + uniqueness check), зміна пароля (accordion)
  - **Гаманець** — salaryDay stepper (debounce 800ms) + категорії витрат
  - **Сім'я** — FamilyLink management
  - **Вигляд** — 6 тем (swatches grid) + Web Push toggle
- ✅ BottomNav адаптується на `/profile` → 4 профільні таби замість nav

### Recipes
- RecipeCard редизайн: фото 4/3 зверху, solid info блок знизу, category + difficulty pills (color-mix)
- Owner badge в info блоці (для сімейних рецептів)
- Категорія ховається на картці якщо активний фільтр по категорії
- «Що приготувати?» — dice кнопка, рандомний рецепт з видимих
- «Що є вдома?» — bottom sheet з пошуком по інгредієнтах, swipe-to-dismiss, multi-chip фільтр
- «Я приготував» — кнопка в RecipeDetail: CookLog модель (MongoDB), logCook/getCookStats API, optimistic update в store, лічильник "Готував N×"
- Meal Planner (`/recipes/planner`) — тижневий планер Пн–Нд, рецепти по дням, бекенд (MealPlan модель, GET/PUT /api/meal-plan), генерація списку покупок
- body::after прибрано на `/recipes` для velvet/pixel/cyber тем
- ✅ **Default tab: СПІЛЬНОТА** — `recipesStore` ініціалізує `scope: 'all'` замість `'mine'`
- ✅ **DoodleIllustration** — inline SVG компонент, 6 варіантів (recipes/memories/watchlist/sprint/shopping/finance), `opacity: 0.18`, на empty state замість тексту
- ✅ **FabHint** — одноразова підказка (localStorage dismiss per storageKey), curved arrow SVG, показується після 600мс коли список порожній
- ✅ **RecipeDetail redesign** — Ingredients/Instructions таби + step-by-step checklist з вертикальною timeline-лінією між кроками; крок → checkmark на тап; «Скинути» кнопка
- ✅ **instructions[] field** — backend `Recipe` модель додає `instructions: [String]`; RecipeForm ініціалізує з `instructions[]` або fallback split по `steps`; backward compat
- ✅ **IngredientIcon** — Fluent Emoji 3D через CDN (jsdelivr fluentui-emoji); `ingredientIcons.ts` 100+ українських ключів → folder/filename mapping; 38px `<img>` з onError fallback; відображається в RecipeForm (рядки інгредієнтів) та RecipeDetail (Складові таб)
- ✅ **RecipeForm redesign** — textarea інгредієнтів → individual rows з live IngredientIcon; steps textarea → numbered rows; Enter додає новий рядок, × видаляє
- ✅ **MemoryCard star decorator** — позиція варіюється по `title.charCodeAt(0) % 3`, SVG star

### Watchlist
- Категорії: movie / series / anime / book
- Пошук: TMDB + Google Books (через backend proxy)
- WatchlistCard, WatchlistDetail, EpisodesList, StarRating
- watchedEpisodes[] (прогрес по сезонах), watchedWith (family members)
- Коментарі між профілями (/api/watchlist/:id/comments)
- Push-нотифікації: нові епізоди (13:00) + нові сезони
- Схожі рекомендації, decade фільтр, жанровий фільтр
- Swipe-to-dismiss, fullscreen search preview
- ✅ **OpenMoji category tab icons** — `openmojiUrl.ts` utility (jsdelivr openmoji@15.0.0/color/svg); таби стали flex-column icon+label: 🎬 Фільми / 📺 Серіали / 🌸 Аніме / 📚 Книги

### Глобально
- Кастомні категорії транзакцій з субкатегоріями
- Теми: retro / velvet / japan / cyber / noir / pixel / **arctic** (7 штук; `dark`, `heroes`, `castle` видалено/перейменовано)
  - **Arctic** — Nord color palette (polar blues + aurora borealis); фон: `radial-gradient` + gradient overlay; watermark: Elder Futhark рунічні символи (SVG data URI, opacity 0.07); aurora shimmer анімація вгорі екрану; шрифт: Uncial Antiqua / Philosopher
- PWA: service worker, Web Push, іконки
- ErrorBoundary компонент, NotFound екран

---


## Беклог — по пріоритетах

### ✅ P1 — Quicknotes — ЗРОБЛЕНО

**Мета:** швидко записати думку/ідею/нагадування прямо з дашборду.

---

#### Backend

**Model** `Note` (`backend/src/models/Note.ts`):
```ts
{ text: string, userId: ObjectId, createdAt: Date, updatedAt: Date }
```

**Routes** `backend/src/routes/notes.ts` → підключити в `app.ts` як `/api/notes`:
- `GET /api/notes` — всі нотатки юзера, сортування `-createdAt`
- `POST /api/notes { text }` — створити
- `PATCH /api/notes/:id { text }` — оновити текст
- `DELETE /api/notes/:id` — видалити

Всі роути через `requireAuth`. PATCH/DELETE перевіряють `userId === req.userId`.

---

#### Frontend

**Store** `client/src/store/notesStore.ts` (Zustand, **без persist** — дані в БД):
```ts
{ notes: Note[], fetchNotes, addNote, updateNote, deleteNote }
```
`authFetch` для всіх запитів. Optimistic update: спочатку UI, потім бекенд, відкат при помилці.

**Screen** `client/src/screens/Notes/index.tsx` + `Notes.module.css`:
- Роут `/notes` в `App.tsx` (захищений `ProtectedRoute`)
- `AppHeader` зверху
- Пошук: `input` з іконкою лупи — фільтрує локально по `text.includes(query)`, з'являється тільки якщо є нотатки
- Список нотаток: картки в колонку, найновіша зверху
- Кожна картка: текст (до 3 рядків з `overflow: hidden`), дата (JetBrains Mono, `--text3`), кнопка видалити (×, з'являється при tap/hover)
- Тап на картку → inline редагування: `textarea` розгортається на місці, `onBlur` + `Enter` (без Shift) зберігають, `Escape` скасовує
- Порожній стан: "Ще немає нотаток. Додай першу через +" (центровано)

**FAB** (`client/src/components/dashboard/FAB/index.tsx`):
- Додати 4-й пункт "Нотатка" з іконкою олівця
- Тап → закрити FAB + `navigate('/notes')` + невеликий `state: { autoFocus: true }` щоб екран одразу відкривав нову нотатку

**NotesScreen при `autoFocus: true`**:
- При mount якщо `location.state?.autoFocus` — одразу показати `textarea` для нової нотатки вгорі списку
- `onBlur` + непорожній текст → `addNote(text)` → очистити textarea

**BottomNav**: нотатки не отримують окремої таби — доступ тільки через FAB і прямий URL. Не перевантажуємо nav.

---

#### Порядок реалізації
1. Backend: Model + routes + підключення
2. `notesStore`
3. `Notes` screen (список + пошук + inline edit)
4. FAB 4-й пункт
5. `autoFocus` flow при переході з FAB
6. `tsc --noEmit` на client + backend, commit, push

---

### 🔴 P1 — Трекер звичок (Habits)

**Чому після Quicknotes:** складніше, але критично для продуктової цінності MIMIR.

**ТЗ:**
- Новий роут `/habits` або секція на Sprint
- Model: `{ name, icon?, color?, userId, createdAt }` + `HabitLog { habitId, date, userId }`
- Backend: CRUD habits + `POST /api/habits/:id/log { date }` + `DELETE /api/habits/:id/log/:date`
- Frontend:
  - GitHub-style heat map (52 тижні × 7 днів) по кожній звичці
  - Поточний стрік + рекорд
  - Тап на сьогоднішній день → відмітити виконано
- Не інтегрувати з Sprint рутинами (різна логіка)

---

### 🟡 P2 — F1 Live Race Dashboard

**Детальне ТЗ вже є в цьому файлі (розділ нижче)**. Перенесено як P2 бо потрібна активна гонка для тестування.

---

### 🟡 P2 — Memories: карта та експорт

**Карта спогадів:**
- Leaflet.js (легша за Google Maps, без ключа)
- Піни для спогадів і планів де є `location`
- Клік по піну → mini-картка з фото + назва → посилання на деталі
- Таб "КАРТА" поруч з "СПОГАДИ" / "ПЛАНИ"

**Експорт спогаду:**
- Кнопка "Поділитись" в MemoryDetail
- `html2canvas` → PNG: обкладинка + назва + дата + теги
- Формат: квадрат (Instagram) або 9:16 (Stories)
- Завантаження або Web Share API

---

---

### 🟢 P3 — "Мій день"

- Роут `/day` або overlay
- Секції: Ранок / День / Вечір
- Елементи: рутини на сьогодні, заплановані задачі, погода
- Трекер настрою (5 позицій, emoji або абстрактна форма)
- Підсумок дня ввечері (push о 21:00)

---


### Джерело даних
**OpenF1 API** — `https://api.openf1.org/v1/` — безкоштовний, затримка ~3-4 сек

### Роутинг
`/f1/live` — захищений F1Route, активний тільки під час гонки.
Визначення активної сесії: `GET /v1/sessions?date_start>=now-4h&date_end<=now+1h`.
Поза гонкою → редірект на `/f1`.

### Компоненти (пріоритет реалізації)

**1. Race Info хедер**
- Назва гонки, Круг X/Y, Race time, Статус (RACING / SC / VSC / RED FLAG)
- Ендпоінт: `/v1/sessions`, `/v1/laps`

**2. Live Standings таблиця**
- Поля: позиція, ім'я/команда, gap до лідера, піт-стопи, гума (compound + age)
- Ендпоінт: `/v1/position`, `/v1/intervals`, `/v1/drivers`, `/v1/stints`
- Кольори гуми: 🔴 Soft, 🟡 Medium, ⚪ Hard, 🟢 Inter, 🔵 Wet
- Polling: 5000ms

**3. Circuit Map**
- SVG треків вже є в `/client/public/tracks/`
- Кольорові крапки пілотів в реальному часі по X/Y координатах
- Ендпоінт: `/v1/location`
- Polling: 3000ms

**4. Sector Times** (для виділеного пілота)
- S1/S2/S3 останнього кола
- Кольори: purple=fastest overall, green=personal best, yellow=normal
- Ендпоінт: `/v1/laps`

**5. Telemetry панель** (для виділеного пілота)
- Speed, Gear, RPM, DRS on/off
- Ендпоінт: `/v1/car_data`
- Polling: 1000ms

### Архітектурне рішення
- Компонент `F1LiveDashboard` — окремий екран, не модалка
- `useOpenF1` хук з polling та автоматичним cleanup
- Backend proxy `/api/f1/live/*` — щоб не ходити з браузера напряму (CORS, кешування)
- Показувати лише під час активної сесії (перевірка при mount + кожні 60с)

---

---

## ❄️ На заморозці — потенційно реально, але не зараз

### Музика / Подкасти

- Нова категорія у Watchlist: `music` — трекінг альбомів (хочу / слухаю / прослухав)
- Пошук: Last.fm API або MusicBrainz (безкоштовні)
- Підкасти: окрема категорія `podcast`, прогрес епізодів аналогічно серіалам
- Епізоди через iTunes Search API (пошук) + RSS парсинг на бекенді (список епізодів)

---

## Roadmap — MIMIR як продукт

### Фаза 0 — Фінальний редизайн (в процесі)
- ✅ Watchlist редизайн
- ✅ Memories редизайн
- ✅ Push-нотифікації
- ✅ Sprint: trash, анімації, хуки, assignedTo
- ✅ Finance: recurring payments reminders + confirm, ShoppingTracker
- ✅ Dashboard: interactive sparkline, прибрано зайві nav chips
- ✅ ProfilePage: повний реворк (4 таби, BottomNav адаптація, salaryDay)
- ✅ Quicknotes (Notes screen + notesStore + FAB + TasksAccordion секція НОТАТКИ)
- ✅ Habits: стрік + heatmap + місячний % вбудовано в рутини Sprint (TaskDetailModal + TaskCard flame badge)
- ✅ Memories: карта планів (Leaflet, Voyager tiles) + експорт спогаду (Canvas API + Web Share)
- ✅ МІЙ ДЕНЬ — DayOverlay (mood tracker SVG, рутини по слотах, погода wttr.in, swipe-dismiss)
- ✅ F1 Live Dashboard — реалізовано, не протестовано в умовах живої гонки

### Фаза 1 — Фундамент (перед публічним launch)

**Auth:**
- ✅ Email + password + Google OAuth — реалізовано
- ✅ JWT access 15хв + refresh 30д (httpOnly cookie, rotation, logout)
- ✅ PIN-lock
- ⬜ Верифікація email (Resend: купити домен, верифікувати DNS)

**Multi-tenancy cleanup:**
- ✅ Аудит всіх ендпоінтів — Memory і WatchlistItem update/remove тепер фільтруються по userId
- ✅ Feature flags замість hardcoded ролей — `f1Enabled` boolean гейтує F1 у frontend; `role: 'admin'` залишився тільки для backend `/admin/users` endpoint; видалено Котька/Коська references з docs

**Інфраструктура:**
- ✅ `helmet.js` на бекенд
- ✅ Rate limiting (`express-rate-limit`) — 100 req/15хв загальний, 10 для /auth
- ✅ Zod валідація на POST/PATCH (auth, sprint, transactions, notes, mood)
- ✅ Sentry (mimir-client + mimir-backend проекти, DSN вшитий)
- ✅ Видалено `console.log` з routes/ai.ts і routes/memories.ts
- ✅ CORS whitelist: тільки `hud-murex.vercel.app` + localhost:5173
- ⬜ MongoDB Atlas M10+ (поточний M0 = 512MB free tier)

### Фаза 1.5 — Offline / PWA (Workbox)
- ✅ NetworkFirst для API GET з 8с timeout + кеш 5хв (workbox-routing + workbox-strategies)
- ✅ CacheFirst для зображень (7 днів, max 200 записів)
- ✅ Background Sync для write операцій (POST/PATCH/PUT/DELETE) — черга 24г
- ✅ Офлайн-індикатор в AppHeader (пульсуючий бейдж "офлайн")

### Фаза 2 — Білінг (Stripe)
- Підписка: Free / Pro ~$4.99/міс / Family ~$7.99/міс
- Free tier: Sprint + базові фінанси, без AI, без push, ліміт 50 транзакцій
- Stripe webhooks: активація/деактивація підписки
- Grace period 3 дні після несплати

### Фаза 3 — Onboarding
- Welcome flow (3-4 кроки при першому вході)
- Empty states з підказками (зараз — порожні екрани)
- Вибір модулів при реєстрації (Finance / Sprint / Watchlist / F1 / Memories)
- Персоналізоване перше наповнення (приклади рецептів, задач)

### Фаза 4 — Зріст
- Лендінг (mimir.app або аналог)
- Web/desktop layout (поточний дизайн mobile-first)
- Export даних (GDPR — JSON архів)
- Реферальна програма

### Фаза 5 — Growth Features
- **AI-асистент** — чат що знає всі дані MIMIR (транзакції, задачі, спогади)
- **Імпорт** — Monobank API, Letterboxd, Goodreads
- **MIMIR Wrapped** — річна статистика à la Spotify Wrapped
- **Партнерський простір** — спільний Watchlist, покупки (вже є watchTogether)
- **Теми як монетизація** — преміум і сезонні теми
- **Віджети** на домашній екран (iOS/Android)

---

## Технічний борг — перед launch

| Задача | Критичність |
|--------|-------------|
| ~~Повноцінний auth (email+password)~~ | ✅ Зроблено |
| ~~helmet.js, CORS whitelist, rate-limit~~ | ✅ Зроблено |
| ~~Zod валідація POST/PATCH~~ | ✅ Зроблено |
| ~~Sentry error tracking~~ | ✅ Зроблено |
| ~~Видалити console.log з ai.ts і деінде~~ | ✅ Зроблено |
| ~~JWT refresh token rotation~~ | ✅ Зроблено |
| ~~Multi-tenancy audit (Memory, Watchlist)~~ | ✅ Зроблено |
| ~~PWA: NetworkFirst + CacheFirst + BackgroundSync + офлайн-індикатор~~ | ✅ Зроблено |
| Верифікація email (Resend + домен mimir.app) | 🔴 До launch |
| ~~Видалити хардкод ролей, `role: 'admin'` → feature flags~~ | ✅ Зроблено |
| ~~Всі AI виклики через backend (не з frontend)~~ | ✅ Зроблено (receipt + poster через /api/receipt/scan і /api/ai/poster-prompt) |
| MongoDB M10+ (зараз M0 = 512MB) | 🟢 Перед 100+ юзерів |

---

## Монетизація (чернетка)

> ⚠️ Ціни орієнтовні — потребують обговорення перед launch

- **Free** — Sprint + базові фінанси, без AI, без push, ліміт 50 транзакцій/місяць
- **Pro ~$4.99/міс** — все включено: AI, push, необмежено, F1
- **Family ~$7.99/міс** — два Pro акаунти + партнерський простір

Break-even: ~100 Pro юзерів. Ціль Year 1: 500 Pro юзерів.
