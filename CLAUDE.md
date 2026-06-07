# HUD — Personal Organizer PWA

**HUD** (Heads Up Display) — особистий органайзер (фінанси, F1, спринти, менторство, контент).
Назва відсилає до геймінгу, sci-fi та F1 — гік + фанат Формули 1.

---

## Репозиторій

```
/
├── client/   → Vercel (hud-murex.vercel.app)       — React + TypeScript PWA
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

Мультипрофіль без пароля:
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
```

---

## PWA

`vite-plugin-pwa` + `injectManifest` + custom `src/sw.ts`.
`vercel.json` — rewrite all → `index.html` (обов'язково для SPA).
Service Worker підключений до Web Push (VAPID).

---

## Ключові домовленості

1. Кожен компонент — окрема папка `index.tsx` + `*.module.css`
2. JSDoc перед кожним компонентом (опис пропсів перед `interface`)
3. Семантичні CSS змінні — `var(--accent)`, не hex
4. Furore — логотип і hero-числа; ₴ — Barlow Condensed; JetBrains Mono — числа/дати
5. Кнопки — SVG іконка замість символу `+`
6. PriorityBadge — ▲◆▽ + pill, не emoji
7. Sprint фільтр — dropdown-select, дефолт тільки активні задачі
8. Без зайвих залежностей — нативно якщо можливо

---

## Статус (2026-06-05)

**Зроблено з останнього спринту:**
- Finance: редизайн екрану, цілі накопичення з GoalDetail, сканування чеків (Anthropic Vision API), регулярні платежі з іконками сервісів, фільтри транзакцій з анімацією, кастомні категорії (backend `/api/categories`), streak економії, прогноз залишку
- Sprint: мінімалістичний WeekHeader, фільтрація по дню, drag-to-dismiss модалки (imperative passive:false listeners), індикатор сповіщень на рутинах, видалено WeekProgress
- Recipes: двокрокова форма, теги, бейдж складності, компактні інструменти
- Watchlist: search overlay (fullscreen, backdrop, "Скасувати"), редизайн pill-бейджів на постерах, пошук книг через Google Books API (backend proxy `/api/books/search` з кешем)
- Dashboard: рутини сьогодні (inline row), компактний HeroCard, розкривний FAB (3 опції: Витрата/Квест/Покупка), виправлена фільтрація типів задач
- Глобально: аватар в TopBar замість іконки, F1 як опціональний модуль (`f1Enabled` в профілі + `F1Route`), аудит localStorage → backend (shoppingList → `/api/shopping`, f1Predictions → `/api/f1/predictions`, globalLabels → `/api/labels`)

**Pending:**
- ⬜ Push-нотифікації (VAPID підключено, логіка відправки не реалізована)

---

## Фінальний спринт

### Finance: місячна аналітика
- Звіт в кінці місяця: топ витрат, порівняння з попереднім місяцем
- Виключити категорію "Накопичення" з графіку витрат і аналітики
- Найдешевший/найдорожчий тиждень місяця
- Рекомендації де можна зекономити

### Recipes: генерація рецепту через AI
- Кнопка "Згенерувати рецепт" на сторінці рецептів
- Модалка: textarea "Що є в холодильнику? Які обмеження?"
- `POST /api/recipes/generate` → Anthropic API
- Claude повертає JSON рецепту в форматі моделі Recipe
- Одразу відкривається форма з заповненими полями для підтвердження

### Sprint: асайн профілів до задач (сімейні відносини)
- Додати `familyId` або `linkedProfiles: ObjectId[]` в модель User
- Задачі отримують поле `assignedTo: ObjectId[]`
- В TaskDetailModal секція "ВИКОНАВЦІ" з аватарами linked профілів
- Задачі заасайнені на тебе відображаються окремо "Від Коськи"
- Зробити універсально — не хардкодити профілі
- `POST /api/profiles/link { targetUsername }` — запит на зв'язок

---

## Беклог — майбутні фічі

### 🔴 Пріоритет 1 — Трекінг звичок
- Окрема секція/сторінка для звичок (відмінна від Sprint рутин)
- GitHub-style heat map по кожній звичці
- Стрік по кожній звичці окремо з рекордом
- Можливо — інтеграція з існуючими рутинами Sprint

### 🔴 Пріоритет 1 — Quicknotes
- Швидкі нотатки/думки/цитати без структури
- FAB на головній → "Нотатка" (поруч з Витрата/Квест/Покупка)
- Список нотаток — проста стрічка з датою
- Підтримка тегів, пін важливих
- Backend: `/api/notes` (GET/POST/PATCH/DELETE)

### 🟡 Пріоритет 2 — Прогрес читання книг
- У Watchlist для type === 'book' — степпер сторінок (як епізоди для серіалів)
- `currentPage` / `totalPages` в моделі
- Прогрес-бар на картці книги
- "Читаю зараз" секція в hero поруч з "Дивлюсь зараз"

### 🟡 Пріоритет 2 — Музика / Подкасти
- Нова категорія у Watchlist або окрема мікро-секція
- Трекінг альбомів (прослухав / хочу / слухаю)
- Підкасти з прогресом епізодів (аналогічно серіалам)
- Пошук через MusicBrainz або Last.fm API

### 🟢 Пріоритет 3 — "Мій день" сторінка
- Єдиний погляд на день: ранок / день / вечір
- Що заплановано (задачі), що зроблено, погода
- Трекер настрою (emoji шкала)
- Підсумок дня ввечері — що зроблено, витрачено, переглянуто


---

## Roadmap — MIMIR як продукт

### Фаза 0 — Фінальний редизайн (зараз)
- Завершити редизайн всіх екранів (Watchlist, F1, Спогади)
- Реалізувати push-нотифікації
- Закрити всі pending баги
- Особисте використання як dogfooding — знайти всі болі

### Фаза 1 — Фундамент (після редизайну)
**Auth:**
- Замінити профільну систему без пароля на повноцінний auth
- Email + password + Google OAuth (passport.js або better-auth)
- JWT refresh tokens (зараз 30 днів — замінити на access 15хв + refresh 30д)
- Верифікація email

**Multi-tenancy:**
- Аудит всіх ендпоінтів — переконатись що кожен запит фільтрує по `userId`
- Видалити хардкод профілів (Котька/Коська) — зробити universally
- Видалити `role: 'admin'` хардкод для F1 — замінити на `features` в підписці

**Інфраструктура:**
- MongoDB Atlas M10+ (замість free tier) для продакшну
- Rate limiting на всі API ендпоінти
- Error tracking (Sentry)
- Логування запитів

### Фаза 1.5 — Офлайн / Кешування
**Service Worker стратегії:**
- Cache First для статики (JS/CSS/шрифти/іконки/постери)
- Network First з fallback для API — якщо немає інтернету,
  показувати закешовані дані з останнього успішного запиту
- Офлайн-індикатор в TopBar коли немає мережі

**Які екрани працюють офлайн (пріоритет):**
- Dashboard — завантажені дані показуються без мережі
- Finance — баланс і транзакції читаються з кешу
- Sprint — задачі доступні офлайн, зміни синхронізуються пізніше

**Background Sync:**
- Юзер додав витрату офлайн → запит ставиться в чергу (IndexedDB)
- При появі мережі → автоматична синхронізація
- Індикатор "очікує синхронізації" на транзакціях

**Технічно:**
- Workbox (вже є через vite-plugin-pwa) — налаштувати стратегії
- IndexedDB через `idb` бібліотеку для офлайн черги
- `sw.ts` розширити runtime caching правилами

### Фаза 2 — Білінг
- Stripe інтеграція — підписка $1.99/міс
- Модель User: додати `subscription: { status, stripeCustomerId, currentPeriodEnd }`
- Webhook `/api/stripe/webhook` — активація/деактивація підписки
- Free tier: обмежений функціонал (наприклад тільки Sprint + базові фінанси)
- Premium: всі екрани, push-нотифікації, AI фічі (сканування чеків, генерація рецептів)
- Grace period 3 дні після закінчення підписки

### Фаза 3 — Onboarding
- Welcome flow для нового юзера (3-4 кроки)
- Empty states з підказками на кожному екрані
- Персоналізація при реєстрації: які модулі цікаві?
  (Фінанси / Серіали / F1 / Рецепти / Задачі)
- Вимикати непотрібні модулі з навігації — не перевантажувати

### Фаза 4 — Зріст
- Лендінг сторінка (окремий домен, mimir.app або подібне)
- Реферальна програма — запроси друга, отримай місяць безкоштовно
- Web версія (зараз mobile-first PWA — добре, але десктоп layout)
- Export даних (GDPR compliance — юзер може скачати всі свої дані)
- Public profile — поділитись списком фільмів/книг (опціонально)

### Технічний борг який треба закрити перед launch
- [ ] Повноцінний auth (пріоритет 1)
- [ ] Всі AI виклики через backend (не з фронту напряму)
- [ ] Environment variables аудит — нічого секретного у VITE_ змінних
- [ ] CORS — whitelist тільки продакшн домени
- [ ] Видалити console.log з продакшн білду
- [ ] Додати helmet.js на бекенд
- [ ] Input validation (zod або joi) на всіх POST/PATCH ендпоінтах

### Метрики успіху Фази 1-2
- 100 реєстрацій → підтвердження що є попит
- 20 платних підписок → підтвердження що люди готові платити
- Churn < 20%/міс → підтвердження що продукт корисний

### Фаза 5 — Growth features

**AI-асистент (killer feature):**
- Контекстний асистент який знає всі твої дані в MIMIR
- "Що подивитись сьогодні?" → аналіз Watchlist + настрій
- "Як я витрачаю гроші?" → аналіз Finance з порадами
- "Що приготувати?" → Recipes на основі інгредієнтів
- Чат-інтерфейс окремою кнопкою в навігації або FAB
- Використовує Anthropic API (вже є ключ в проекті)

**Віджети на домашній екран:**
- iOS/Android PWA віджети
- Варіанти: баланс дня, наступна F1 гонка,
  задачі на сьогодні, що дивлюсь зараз
- Юзер бачить MIMIR не відкриваючи додаток

**Партнерський / сімейний простір:**
- Два акаунти об'єднані в спільний простір
- Спільний список покупок
- Спільний Watchlist (що дивимось разом)
- Спільні рецепти
- Selling point: пара платить разом — вища цінність за $1.99

**Імпорт з інших сервісів:**
- Letterboxd → імпорт переглянутих фільмів/серіалів
- Goodreads → імпорт книг зі статусами
- Monobank API → імпорт транзакцій у Finance
- Мета: нульовий поріг входу, не треба починати з нуля

**MIMIR Wrapped (статистика року):**
- Щорічний звіт як Spotify Wrapped
- Скільки фільмів/серіалів переглянуто
- Скільки зекономлено vs витрачено
- Скільки рецептів приготовано
- F1: точність прогнозів за сезон, улюблений пілот
- Найпродуктивніший місяць, найдовший streak
- Красива анімована картка для шерінгу в соцмережі → вірусність

**Теми як монетизація:**
- Спочатку — Теми 2.0: переглянути і доопрацювати всі 6 існуючих
- Преміум теми: сезонні (зима/літо), святкові, колаборації
- Низька вартість розробки — тільки CSS змінні
- Можливо: редактор теми — юзер сам налаштовує кольори (Pro feature)

### Монетизація (чернетка, ціни не фінальні)

> ⚠️ Ціни орієнтовні — потребують окремого обговорення перед launch

**Плани:**
- **Free** — Sprint + базові фінанси, без AI, без push-нотифікацій,
  ліміт 50 транзакцій/міс
- **Pro ~$4.99/міс** — все включено, AI асистент, push-нотифікації,
  необмежено всі модулі
- **Family ~$7.99/міс** — два Pro акаунти в партнерському просторі

**Що входить у Free vs Pro — визначити пізніше:**
- Які модулі залишити безкоштовними (onboarding hook)
- Ліміти на AI запити в Pro
- Чи включати F1 модуль у Free

**Технічно:**
- Stripe Billing (підписки) + Stripe Customer Portal
- Webhook для активації/деактивації
- Поле `subscription.plan: 'free' | 'pro' | 'family'` в моделі User
- Feature flags через план — не хардкодити обмеження

**Цільові показники (орієнтовно):**
- Break-even: ~100 Pro юзерів (~$499/міс покриває інфраструктуру)
- Ціль Year 1: 500 Pro юзерів

---

## Правила написання коду (обов'язково для кожної сесії)

### React — useEffect
- НІКОЛИ не викликати `setState` синхронно в тілі `useEffect`
- Всі setState після async операцій — тільки всередині async функції
- Завжди додавати `cancelled` flag для cleanup при fetch:

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

- Якщо useEffect тільки скидає стан (без async) — синхронний setState ok
- НІКОЛИ не змішувати синхронний setState з async в одному useEffect

### React — загальні правила
- Optimistic update: спочатку оновити UI локально, потім зберегти на бекенд
- При помилці бекенду — відкотити до попереднього стану через `setPrev`
- PATCH відправляти тільки змінені поля, не весь об'єкт
- Debounce 800мс для полів що змінюються часто (степпери, текстові поля):

```tsx
useEffect(() => {
  const timer = setTimeout(() => saveToBackend(value), 800)
  return () => clearTimeout(timer)
}, [value])
```

- Пропускати перший render при debounce через `useRef`:

```tsx
const isFirstRender = useRef(true)
useEffect(() => {
  if (isFirstRender.current) { isFirstRender.current = false; return }
  const timer = setTimeout(() => save(value), 800)
  return () => clearTimeout(timer)
}, [value])
```

### Типізація
- ЗАВЖДИ явний `interface` для props перед компонентом
- ЗАВЖДИ JSDoc перед кожним компонентом (вже є в правилах, нагадування)
- НІКОЛИ не використовувати `any` — тільки конкретні типи або `unknown`
- Для union типів — `type Status = 'active' | 'done' | 'paused'`

### UI — використовувати існуючі компоненти
Перед створенням нового UI елементу — перевірити чи є готовий:

| Потреба | Компонент |
|---------|-----------|
| Вибір дати | `CustomDatePicker` (`components/ui/CustomDatePicker`) |
| Модалка | `Modal` (`components/ui/Modal`) з prop `draggable` |
| Toast повідомлення | `useUiStore().showToast(text, type)` |
| Завантаження фото | `ImageUploadButton` + `uploadToCloudinary` |
| Пріоритет задачі | `PriorityBadge` (▲◆▽) |
| Прогрес-бар | `ProgressBar` (`components/ui/ProgressBar`) |

- НІКОЛИ не використовувати `input[type=date]` — тільки `CustomDatePicker`
- НІКОЛИ не створювати нову модалку з нуля — тільки існуючий `Modal`
- НІКОЛИ не використовувати нативний `select` без стилізації —
  або стилізувати через CSS Modules або використати існуючий dropdown

### Стилі
- ЗАВЖДИ `var(--accent)` — ніколи hex напряму в CSS або inline styles
- ЗАВЖДИ окрема папка компонента: `ComponentName/index.tsx` + `ComponentName.module.css`
- НЕ використовувати inline styles крім динамічних значень (ширина, висота, transform)
- НЕ використовувати `!important`
- Числа і дати — `font-family: var(--font-mono)` (JetBrains Mono)
- Гривня ₴ — `font-family: var(--font-ui)` (Furore не підтримує символ ₴)
- Кнопки — SVG іконка, не текстові символи (+, ×, →, ←)

### Збереження форм
- `onBlur` + `Enter` для збереження — не окрема кнопка "Зберегти"
  (якщо це inline редагування)
- Валідація перед відправкою на бекенд — не довіряти тільки HTML validation
- Показувати error стан на полі, не тільки загальний toast

### Бекенд — PATCH endpoints
Кожен PATCH handler має:
1. Знайти документ з перевіркою `userId` (безпека)
2. Оновлювати тільки поля що прийшли в `req.body` (не перезаписувати все)
3. Підтримувати всі поля моделі — не ігнорувати нові поля

```ts
// Правильний патерн
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
- НЕ додавати нові npm залежності без крайньої необхідності
- НЕ використовувати `console.log` в продакшн коді (тільки `console.error`)
- НЕ хардкодити userId, імена профілів або ролі
- НЕ дублювати логіку — винести в утиліту якщо використовується 2+ рази