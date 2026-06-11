# MIMIR — Беклог і Roadmap

> Цей файл не завантажується автоматично в Claude Code. Читай його коли потрібен контекст по беклогу, roadmap або що вже реалізовано.

---

## Статус (2026-06-10) — Що реалізовано

### Finance
- BalanceHero, TodayCard (delta/streak), StatsGrid (бонус/середнє/прогрес)
- TopupForm, ExpenseForm (кастомні категорії + субкатегорії, сканування чеків)
- TransactionList — фільтри з анімацією, inline редагування назви, сортування по createdAt
- ExpenseChart — donut (Recharts), **вже виключає "Накопичення"**
- GoalsList + GoalDetail — savings goals з deposits[]
- RecurringPayments — іконки сервісів, UAH/USD/EUR конвертація, sessionStorage кеш
  - ✅ Push-нагадування (1/2/7 днів, cron 09:00 UTC)
  - ✅ Підтвердження списання в день платежу → Transaction
- Streak економії (persist local), бюджетний цикл від 10-го числа
- ✅ ShoppingTracker — додано на Finance екран після RecurringPayments

### Sprint / Quests
- Тижневий список задач: sprint / shopping / todo / уроки
- TaskDetailModal: МІТКИ, ДЕДЛАЙН, ЧЕК-ЛІСТ, ОПИС, LabelPicker
- Фільтр (bottom sheet): тип + статус (default: тільки активні)
- Рутини з repeat/nextDue/completionHistory, індикатор badge
- RepeatConfigScreen — гнучке налаштування повторень (weekly/monthly/custom)
- TrashBin — soft-delete (TTL 24h MongoDB), відновлення або purge
- useSwipeToDismiss + useModalHistory хуки
- Spring-анімація відкриття TaskDetailModal (0.46s cubic-bezier)
- ✅ assignedTo — TaskDetailModal секція ВИКОНАВЦІ, "Від {name}" блок на Sprint екрані

### Watchlist
- Категорії: movie / series / anime / book
- Пошук: TMDB + Google Books (через backend proxy)
- WatchlistCard, WatchlistDetail, EpisodesList, StarRating
- watchedEpisodes[] (прогрес по сезонах), watchTogether тогл
- Коментарі між профілями (/api/watchlist/:id/comments)
- Push-нотифікації: нові епізоди (13:00) + нові сезони
- Схожі рекомендації, decade фільтр, жанровий фільтр
- Swipe-to-dismiss, fullscreen search preview
- ⬜ Прогрес читання книг (pageCount є в моделі, але currentPage/UI нема)

### F1 (тільки admin)
- NextRaceCard (TrackSVG + draw-path + RaceCountdown)
- LastRaceCard (podium + fastest lap, Jolpica)
- RacePredictionCard (прогноз топ-3, scoring: exact=10/partial=5)
- RaceCalendarList (22 гонки 2026, тап → RaceDetail)
- ChampionshipTable: Календар / Пілоти / Конструктори / МІЙ СЕЗОН
- DriverStatsCard + ConstructorStatsCard (sessionStorage кеш, PixelCar анімація)
- RaceDetail: CircuitStatsSection, SessionScheduleSection, RaceWeatherSection, RacePodiumSection
- McLarenViewer (Three.js), аналоговий годинник (easter egg)
- ⬜ F1 Live Race Dashboard — не реалізовано
- ⬜ F1 екран редизайн — не завершено

### Memories
- Таймлайн по місяцях + сітка 3 колонки
- Вкладки СПОГАДИ / ПЛАНИ
- Плани: локація (Nominatim), статус, нотатки, фото, конвертація в спогад
- Пошук, "Цей день рік тому" банер
- Генерація постера: Anthropic Haiku → Pollinations.ai → Cloudinary

### Push-нотифікації
- VAPID підключено, підписка в БД
- Тригери: F1 гонка за 1г, нові епізоди, нові сезони, рутини 09:00 UTC
- ✅ Нагадування по регулярних платежах (1/2/7 днів)

### Глобально
- JWT auth (multi-profile, без пароля)
- Кастомні категорії транзакцій з субкатегоріями
- Теми (ThemePicker)
- PWA: service worker, Web Push, іконки

---

## Найближчий спринт — ТЗ

### 1. Finance: місячна аналітика

**Мета:** дати відповідь на питання "куди пішли гроші цього місяця?"

**Frontend — новий компонент `MonthlyReport`** (`/finance` після ExpenseChart):
- Вибір місяця: `<` / назва / `>` (дефолт — поточний)
- **Топ-5 категорій** — горизонтальні бари з % і сумою (виключати "Накопичення")
- **Порівняння з попереднім місяцем** — для кожної категорії: `↑ +X ₴` / `↓ -X ₴`
- **Тижні місяця** — 4 міні-бари: найдорожчий (accent), найдешевший (green)
- **Рекомендація** — 1 рядок: "Найбільший ріст: {категорія} +{X} ₴ vs минулого місяця"

**Підхід:** все рахується на frontend з наявних `transactions` (без нового ендпоінту). Фільтрація по `date.startsWith('YYYY-MM')`.

**Що НЕ треба:** AI-рекомендації — достатньо детермінованої логіки ("найбільший ріст").

---

### 2. Recipes: AI-генерація рецепту

**Backend — новий ендпоінт:**
```
POST /api/recipes/generate
Body: { ingredients: string, restrictions?: string }
```
- Anthropic claude-haiku-4-5 (дешево і швидко)
- Системний промпт: поверни JSON `{ title, ingredients[], instructions[], cookTime, servings, calories, difficulty, category }`
- Парсити JSON з відповіді (може бути обгорнутий в ``` markdown)
- Повертати розпарсений об'єкт або 422 якщо не вдалось

**Frontend:**
- Кнопка "✨ Згенерувати" поруч з "Додати рецепт" в хедері `/recipes`
- Модалка: `textarea` "Що є в холодильнику?" + `textarea` "Обмеження (алергії, дієта)"
- Кнопка "Генерувати" → лоадер (3-8 сек) → відкрити `RecipeForm` з заповненими полями
- При помилці — toast "Не вдалося згенерувати, спробуй ще раз"

**Чому не у CLAUDE.md наступний спринт:** додаю окремо бо є конкретне ТЗ.

---

### 3. Sprint: assignedTo профілів

**Мета:** Котька і Коська бачать спільні задачі.

**Backend:**
- `User`: додати `linkedProfiles: ObjectId[]`
- `SprintTask`: додати `assignedTo: string[]` (userId array)
- `POST /api/profiles/link { targetUsername }` — взаємне зв'язування
- `GET /api/sprint/tasks` — повертати також задачі де `assignedTo includes req.userId`

**Frontend:**
- TaskDetailModal секція "ВИКОНАВЦІ": аватари linked profiles + toggle assign/unassign
- Sprint екран: задачі від іншого профілю — окремий блок "Від {name}" (collapsed за замовч.)
- ProfilePage: кнопка "Зв'язати профіль" → ввести username

---

### 4. Книги: прогрес читання

**Мінімально:**
- `WatchlistItem` додати `currentPage: number` (totalPages/pageCount вже є)
- WatchlistDetail для `category === 'book'`: степпер "сторінка X з Y"
- Прогрес-бар на WatchlistCard для книг зі статусом 'watching' (= "Читаю")
- "Читаю зараз" секція на `/watchlist` поруч з "Дивлюсь зараз" (якщо є)

**Backend:** `PATCH /api/watchlist/:id` вже є → просто додати `currentPage` в allowed fields.

---

## Беклог — по пріоритетах

### 🔴 P1 — Quicknotes

**Чому зараз:** найшвидша фіча, максимальна цінність для щоденного використання.

**ТЗ:**
- FAB на Dashboard: додати 4-ю опцію "Нотатка"
- Backend: `POST /api/notes { text, tags? }`, `GET /api/notes`, `PATCH`, `DELETE`
- Model: `{ text, tags[], isPinned, userId, createdAt }`
- Screen `/notes` або модалка список нотаток (вирішити окремо)
- Підтримка тегів-пінів, пошук по тексту
- Без форматування — тільки plain text

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

### 🟡 P2 — Музика / Подкасти

- Нова категорія у Watchlist: `music`
- Трекінг альбомів (хочу прослухати / слухаю / прослухав)
- Пошук: Last.fm API або MusicBrainz (безкоштовні)
- Підкасти: окрема категорія `podcast`, прогрес епізодів аналогічно серіалам

---

### 🟢 P3 — "Мій день"

- Роут `/day` або overlay
- Секції: Ранок / День / Вечір
- Елементи: рутини на сьогодні, заплановані задачі, погода
- Трекер настрою (5 позицій, emoji або абстрактна форма)
- Підсумок дня ввечері (push о 21:00)

---

### 🟢 P3 — Виправлення ShoppingTracker

- Компонент `ShoppingTracker` існує але не рендериться на `/finance`
- Вирішити: або додати назад на Finance екран, або видалити компонент
- Якщо лишити — в окремій секції після RecurringPayments

---

## F1 Live Race Dashboard — ТЗ

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

## Roadmap — MIMIR як продукт

### Фаза 0 — Фінальний редизайн (в процесі)
- ✅ Watchlist редизайн
- ✅ Memories редизайн
- ✅ Push-нотифікації
- ✅ Sprint: trash, анімації, хуки
- ✅ Finance: recurring payments reminders + confirm
- ⬜ Finance: місячна аналітика
- ⬜ F1 Live Dashboard
- ⬜ Закрити ShoppingTracker / виправити

### Фаза 1 — Фундамент (перед публічним launch)

**Auth:**
- Замінити профільну систему на email + password + Google OAuth
- JWT: access token 15хв + refresh 30д
- Верифікація email (Resend або Nodemailer)
- Міграція існуючих даних (Котька/Коська → нові акаунти)

**Multi-tenancy cleanup:**
- Аудит всіх ендпоінтів — фільтрація по `userId`
- Видалити хардкод Котька/Коська, `role: 'admin'` → `features` в підписці
- `f1Enabled` залишити як user feature flag

**Інфраструктура:**
- `helmet.js` на бекенд
- Rate limiting (`express-rate-limit`) — всі API
- Zod валідація на всіх POST/PATCH
- Sentry для error tracking
- Видалити `console.log` з продакшн (є в `/api/ai/poster-prompt`)
- CORS whitelist: тільки `hud-murex.vercel.app`
- MongoDB Atlas M10+ (поточний M0 = 512MB free tier)

### Фаза 1.5 — Offline / PWA (Workbox)
- Cache First для статики (JS/CSS/іконки)
- Network First з fallback для API відповідей
- Background Sync — офлайн дії (додавання транзакцій, задач)
- Офлайн-індикатор в AppHeader

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
| Повноцінний auth (email+password) | 🔴 Блокер |
| Видалити console.log з ai.ts і деінде | 🔴 Безпека |
| helmet.js на бекенд | 🔴 Безпека |
| CORS whitelist тільки prod | 🔴 Безпека |
| Rate limiting на всі API | 🟡 Важливо |
| Zod валідація POST/PATCH | 🟡 Важливо |
| Всі AI виклики через backend (не з frontend) | 🟡 Важливо |
| Видалити хардкод профілів/ролей | 🟡 До launch |
| ShoppingTracker — вирішити долю компонента | 🟢 Cleanup |
| Email верифікація через Resend (купити домен mimir.app, верифікувати DNS, відновити sendVerificationEmail в register + isVerified=false при реєстрації) | 🟡 До launch |
| MongoDB M10+ (зараз M0 = 512MB) | 🟢 Перед 100+ юзерів |

---

## Монетизація (чернетка)

> ⚠️ Ціни орієнтовні — потребують обговорення перед launch

- **Free** — Sprint + базові фінанси, без AI, без push, ліміт 50 транзакцій/місяць
- **Pro ~$4.99/міс** — все включено: AI, push, необмежено, F1
- **Family ~$7.99/міс** — два Pro акаунти + партнерський простір

Break-even: ~100 Pro юзерів. Ціль Year 1: 500 Pro юзерів.
