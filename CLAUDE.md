# MIMIR — Personal Organizer PWA

**MIMIR** — особистий органайзер (фінанси, F1, спринти, рецепти, серіали/фільми, спогади).
Назва відсилає до нордичної міфології — Мімір, охоронець криниці мудрості. Слоган: **DRINK DEEP**.

---

## Репозиторій

```
/
├── client/   → Vercel (hud-murex.vercel.app)           — React + TypeScript PWA
└── backend/  → Railway (hud-production.up.railway.app) — Node.js + Express + MongoDB
```

**Frontend стек:** React 18, TypeScript, Vite + vite-plugin-pwa, Zustand, React Router v6, CSS Modules, Recharts, Three.js

Деталі по розділах:
- Дизайн-система (теми, змінні, типографіка) → [`client/src/styles/CLAUDE.md`](client/src/styles/CLAUDE.md)
- Компоненти (правила, структура, JSDoc, 3D) → [`client/src/components/CLAUDE.md`](client/src/components/CLAUDE.md)
- Екрани (поведінка кожного screen) → [`client/src/screens/CLAUDE.md`](client/src/screens/CLAUDE.md)
- Стейт (Zustand stores, persist, маппінг) → [`client/src/store/CLAUDE.md`](client/src/store/CLAUDE.md)
- Backend (API, middleware, env, зовнішні API) → [`backend/CLAUDE.md`](backend/CLAUDE.md)

---

## Автентифікація

Мультипрофіль без пароля (тимчасово — до Фази 1):
- **Котька** — `role: 'admin'` (F1 екран, повний доступ)
- **Коська** — `role: 'user'` (без F1)

Flow: `/profile-select` → `POST /api/auth/select { username }` → JWT 30 днів → `profileStore` → `localStorage` (`profile-storage`).
Всі запити через `authFetch` з Bearer токеном. Маршрути захищені `ProtectedRoute` / `AdminRoute`.

**Env:**
```
# /client
VITE_API_URL=https://hud-production.up.railway.app
VITE_CLOUDINARY_CLOUD_NAME=mimir-hud
VITE_CLOUDINARY_UPLOAD_PRESET=mimirorg
VITE_VAPID_PUBLIC_KEY=...
```

---

## PWA

`vite-plugin-pwa` + `injectManifest` + custom `src/sw.ts`.
`vercel.json` — rewrite all → `index.html` (обов'язково для SPA).
Service Worker підключений до Web Push (VAPID) — підписка, відправка та тригери реалізовані.
Іконки PWA згенеровані з `mimir-logo.svg` через `scripts/generate-icons.mjs` (sharp).

---

## Ключові домовленості

1. Кожен компонент — окрема папка `index.tsx` + `*.module.css`
2. JSDoc перед кожним компонентом (опис пропсів перед `interface`)
3. Семантичні CSS змінні — `var(--accent)`, не hex
4. Furore — логотип і hero-числа; ₴ — Barlow Condensed; JetBrains Mono — числа/дати
5. Кнопки — SVG іконка замість символу `+`
6. PriorityBadge — ▲◆▽ + pill, не emoji
7. Sprint фільтр — bottom sheet з pill-chips, дефолт тільки активні задачі
8. Без зайвих залежностей — нативно якщо можливо

---

## Статус (2026-06-08)

### ✅ Реалізовано

**Finance:**
- Редизайн екрану, цілі накопичення (GoalDetail), сканування чеків (Anthropic Vision API)
- Регулярні платежі з іконками сервісів + підтримка валют USD/EUR з конвертацією
- Фільтри транзакцій з анімацією, кастомні категорії (`/api/categories`)
- Streak економії, прогноз залишку по денному ліміту
- Бюджетний цикл 10-го числа (getPeriodStart), правильний підрахунок monthSpent
- Метрика "Середнє/день", tooltip для прогнозу
- Сортування транзакцій по `createdAt`, редагування назви inline

**Sprint:**
- Мінімалістичний WeekHeader, фільтрація по дню
- Bottom sheet фільтр з pill-chips (тип + статус)
- Drag-to-dismiss модалки (imperative passive:false listeners)
- Індикатор сповіщень на рутинах
- Міграція sprintStore на бекенд

**Watchlist:**
- Бейджі статусів — ліва акцентна риска + темна підложка
- Інтерактивна статистика з фільтром по статусу (per-category)
- "Дивлюсь зараз" — горизонтальний скрол з backdrop зображеннями
- Жанри з TMDB + горизонтальний фільтр, decade фільтр
- Fullscreen preview при додаванні з пошуку (slideInRight)
- Прогрес серіалу через чекбокси епізодів (watchedEpisodes[])
- Пагінація по сезонах — `totalSeasons` з TMDB API (авторитетне джерело)
- Схожі рекомендації (/recommendations endpoint)
- Коментарі між профілями (/api/watchlist/:id/comments)
- "Дивитись разом" тогл (watchTogether boolean)
- Нагадування про нові серії/сезони (push-нотифікації)
- Сортування сітки: watching → want → watched → paused
- Swipe-to-dismiss: `startScrollTop` ref — не конфліктує зі скролом
- WatchlistSearch preview: кнопка "←" з backdrop-filter, свайп через onTouchStart/End refs

**Push-нотифікації:**
- VAPID підключено, підписка зберігається в БД
- `sendPushToUser` утиліта
- Тригери: F1 гонка за 1 годину, нові епізоди о 13:00, нові сезони

**F1:**
- Аналоговий годинник як easter egg (довгий тап на ClockBlock)
- Цифровий RaceCountdown повернуто в NextRaceCard

**Memories:**
- Редизайн: таймлайн по місяцях + сітка 3 колонки (квадратні картки, `aspect-ratio: 1`)
- Вкладки СПОГАДИ / ПЛАНИ
- Плани з локацією (OpenStreetMap Nominatim), статусом, нотатками, фото
- Пошук спогадів по назві (flat grid при активному пошуку)
- "Цей день рік тому" банер
- Генерація постера: `POST /api/memories/generate-poster-prompt` (Anthropic Haiku) → Pollinations.ai
- Нотатки і теги до спогаду (inline редагування, optimistic update)
- Конвертація плану в спогад при статусі "Відвідали"

**Глобально:**
- Push-нотифікації повністю реалізовані
- NASA APOD прибрано
- Аудит localStorage → backend
- CLAUDE.md оновлено з правилами коду

---

## Наступний спринт

### Finance: місячна аналітика
- Звіт: топ витрат, порівняння з попереднім місяцем
- Виключити категорію "Накопичення" з графіку витрат
- Найдешевший/найдорожчий тиждень місяця
- Рекомендації де можна зекономити

### Recipes: генерація рецепту через AI
- Кнопка "Згенерувати рецепт" на сторінці рецептів
- Модалка: textarea "Що є в холодильнику? Які обмеження?"
- `POST /api/recipes/generate` → Anthropic API
- Claude повертає JSON рецепту → форма з заповненими полями

### Sprint: асайн профілів до задач
- `linkedProfiles: ObjectId[]` в модель User
- `assignedTo: ObjectId[]` в задачах
- `POST /api/profiles/link { targetUsername }`
- TaskDetailModal секція "ВИКОНАВЦІ" з аватарами
- Задачі від іншого профілю — окрема секція "Від Коськи"

---

## Беклог — майбутні фічі

### 🔴 Пріоритет 1 — Трекінг звичок
- Окрема секція/сторінка (відмінна від Sprint рутин)
- GitHub-style heat map по кожній звичці
- Стрік по кожній звичці окремо з рекордом
- Інтеграція з існуючими рутинами Sprint

### 🔴 Пріоритет 1 — Quicknotes
- Швидкі нотатки/думки/цитати без структури
- FAB на головній → "Нотатка"
- Список нотаток — проста стрічка з датою
- Підтримка тегів, пін важливих
- Backend: `/api/notes`

### 🟡 Пріоритет 2 — Прогрес читання книг
- У Watchlist для `type === 'book'` — степпер сторінок
- `currentPage` / `totalPages` в моделі
- Прогрес-бар на картці книги
- "Читаю зараз" секція поруч з "Дивлюсь зараз"

### 🟡 Пріоритет 2 — Музика / Подкасти
- Нова категорія у Watchlist
- Трекінг альбомів (прослухав / хочу / слухаю)
- Підкасти з прогресом епізодів
- Пошук через MusicBrainz або Last.fm API

### 🟡 Пріоритет 2 — Memories: експорт і карта
- **Експорт спогаду** — картинка (обкладинка + назва + дата + теги) для Stories/квадрат, `html2canvas` → PNG
- **Карта спогадів** — Leaflet.js, піни для спогадів з локацією

### 🟢 Пріоритет 3 — "Мій день" сторінка
- Єдиний погляд на день: ранок / день / вечір
- Що заплановано, погода, трекер настрою
- Підсумок дня ввечері

---

## Roadmap — MIMIR як продукт

### Фаза 0 — Фінальний редизайн (майже завершено)
- ✅ Watchlist редизайн
- ✅ Memories редизайн
- ✅ Push-нотифікації
- ⬜ F1 екран редизайн
- ⬜ Finance аналітика
- ⬜ Закрити всі pending баги

### Фаза 1 — Фундамент
**Auth:**
- Замінити профільну систему без пароля на повноцінний auth
- Email + password + Google OAuth (passport.js або better-auth)
- JWT refresh tokens (access 15хв + refresh 30д)
- Верифікація email

**Multi-tenancy:**
- Аудит всіх ендпоінтів — фільтрація по `userId`
- Видалити хардкод профілів (Котька/Коська)
- Видалити `role: 'admin'` хардкод — замінити на `features` в підписці

**Інфраструктура:**
- MongoDB Atlas M10+ для продакшну
- Rate limiting на всі API ендпоінти
- Error tracking (Sentry)
- Логування запитів

### Фаза 1.5 — Офлайн / Кешування (Workbox)
- Cache First для статики
- Network First з fallback для API
- Background Sync для офлайн дій
- Офлайн-індикатор в AppHeader

### Фаза 2 — Білінг (Stripe)
- Підписка ~$4.99/міс (Pro), ~$7.99/міс (Family)
- Free tier: Sprint + базові фінанси, без AI, ліміт 50 транзакцій
- Webhook активації/деактивації
- Grace period 3 дні

### Фаза 3 — Onboarding
- Welcome flow (3-4 кроки)
- Empty states з підказками
- Персоналізація: вибір модулів при реєстрації

### Фаза 4 — Зріст
- Лендінг (mimir.app)
- Реферальна програма
- Web/десктоп layout
- Export даних (GDPR)

### Фаза 5 — Growth features
- **AI-асистент** — контекстний чат що знає всі дані MIMIR
- **Віджети** на домашній екран (баланс, F1, задачі)
- **Партнерський простір** — спільний Watchlist, покупки, рецепти
- **Імпорт** — Letterboxd, Goodreads, Monobank API
- **MIMIR Wrapped** — річна статистика як Spotify Wrapped
- **Теми як монетизація** — преміум і сезонні теми

### Монетизація (чернетка, ціни не фінальні)

> ⚠️ Ціни орієнтовні — потребують окремого обговорення перед launch

- **Free** — Sprint + базові фінанси, без AI, без push, ліміт 50 транзакцій
- **Pro ~$4.99/міс** — все включено, AI, push, необмежено
- **Family ~$7.99/міс** — два Pro акаунти в партнерському просторі

Break-even: ~100 Pro юзерів. Ціль Year 1: 500 Pro юзерів.

---

## Технічний борг перед launch
- [ ] Повноцінний auth (пріоритет 1)
- [ ] Всі AI виклики через backend (не з фронту напряму)
- [ ] CORS — whitelist тільки продакшн домени
- [ ] Видалити console.log з продакшн білду
- [ ] Додати helmet.js на бекенд
- [ ] Input validation (zod або joi) на всіх POST/PATCH
- [ ] Видалити хардкод профілів і ролей

---

## Правила написання коду (обов'язково для кожної сесії)

### React — useEffect
- НІКОЛИ не викликати `setState` синхронно в тілі `useEffect`
- Всі setState після async — тільки всередині async функції
- Завжди `cancelled` flag для cleanup:

```tsx
useEffect(() => {
  let cancelled = false
  const load = async () => {
    try {
      const data = await fetchSomething()
      if (!cancelled) setState(data)
    } catch {
      if (!cancelled) setError(true)
    }
  }
  load()
  return () => { cancelled = true }
}, [dep])
```

### React — загальні правила
- Optimistic update: спочатку UI, потім бекенд
- При помилці бекенду — відкотити стан
- PATCH — тільки змінені поля
- Debounce 800мс для степперів і текстових полів
- `useRef` для пропуску першого render при debounce

### Swipe-to-dismiss (bottom sheets)
- `startScrollTop` ref — запам'ятати `scrollTop` на touchstart
- `isDragging` ref — не state, щоб не викликати ре-рендер
- Imperative `addEventListener('touchmove', fn, { passive: false })` — для `preventDefault()`
- Умова drag: `deltaY > 0 && scrollTop === 0 && startScrollTop === 0`
- Threshold 80px для закриття

### Типізація
- ЗАВЖДИ явний `interface` для props
- ЗАВЖДИ JSDoc перед компонентом
- НІКОЛИ `any` — тільки конкретні типи або `unknown`

### UI — використовувати існуючі компоненти

| Потреба | Компонент |
|---------|-----------|
| Вибір дати | `CustomDatePicker` |
| Модалка | `Modal` з prop `draggable` |
| Toast | `useUiStore().showToast(text, type)` |
| Завантаження фото | `ImageUploadButton` + `uploadToCloudinary` |
| Пріоритет | `PriorityBadge` (▲◆▽) |
| Прогрес-бар | `ProgressBar` |

- НІКОЛИ `input[type=date]` — тільки `CustomDatePicker`
- НІКОЛИ нову модалку з нуля — тільки `Modal`

### Стилі
- ЗАВЖДИ `var(--accent)` — ніколи hex
- ЗАВЖДИ окрема папка: `ComponentName/index.tsx` + `*.module.css`
- НЕ inline styles (крім динамічних значень)
- НЕ `!important`
- Числа/дати — `var(--font-mono)`
- Гривня ₴ — `var(--font-ui)` (Furore не підтримує ₴)
- Кнопки — SVG іконка, не символи

### Збереження форм
- `onBlur` + `Enter` для inline редагування
- Валідація перед відправкою на бекенд
- Error стан на конкретному полі, не тільки toast

### Бекенд — PATCH endpoints
```ts
const doc = await Model.findOne({ _id: req.params.id, userId: req.userId })
if (!doc) return res.status(404).json({ error: 'Not found' })
const allowed = ['field1', 'field2', 'field3']
allowed.forEach(key => {
  if (req.body[key] !== undefined) doc[key] = req.body[key]
})
await doc.save()
res.json(doc)
```

### Загальні заборони
- НЕ нові npm залежності без крайньої необхідності
- НЕ `console.log` в продакшн (тільки `console.error`)
- НЕ хардкодити userId, імена профілів, ролі
- НЕ дублювати логіку — утиліта якщо 2+ рази

## F1 Live Race Dashboard — Беклог

### Джерело даних
**OpenF1 API** — `https://api.openf1.org/v1/` — безкоштовний, затримка ~3-4 сек

### Роутинг
`/f1/live` — новий роут, захищений F1Route, активний тільки під час гонки

### Фічі (пріоритет)
1. **Race Info хедер** — назва гонки, круг X/Y, race time, статус (RACING/SC/VSC/RED FLAG)
   - Endpoint: `/v1/sessions`, `/v1/laps`

2. **Live Standings таблиця** — позиція, пілот, команда, gap, піти, tire compound
   - Endpoint: `/v1/position`, `/v1/intervals`, `/v1/drivers`

3. **Tire Compounds** — тип гуми + tyre age для кожного пілота
   - Endpoint: `/v1/stints`
   - Кольори: червоний=Soft, жовтий=Medium, сірий=Hard, зелений=Inter, синій=Wet

4. **Circuit Map** — SVG траси + кольорові крапки пілотів в реальному часі
   - Endpoint: `/v1/location` (X/Y координати)
   - SVG файли вже є в `/client/public/tracks/`

5. **Sector Times** — S1/S2/S3 останнього кола
   - Endpoint: `/v1/laps`
   - Кольори: фіолетовий=fastest overall, зелений=personal best, жовтий=normal

6. **Telemetry** — швидкість, gear, RPM, tyre age для обраного пілота
   - Endpoint: `/v1/car_data`

7. **DRS статус** — enabled/disabled
   - Endpoint: `/v1/car_data`

### Polling інтервали
- Позиції на мапі: 3000ms
- Таблиця standings: 5000ms  
- Телеметрія: 1000ms

### Важливо
- Показувати тільки під час активної сесії
- Визначати активну сесію: `GET /v1/sessions?date_start>=now`
- Поза гонкою → редірект на `/f1`