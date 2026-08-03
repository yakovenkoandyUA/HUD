# MIMIR — Personal Organizer PWA

**MIMIR** — особистий органайзер (фінанси, F1, спринти, рецепти, серіали/фільми, спогади).
Назва відсилає до нордичної міфології — Мімір, охоронець криниці мудрості. Слоган: **DRINK DEEP**.

> Беклог, roadmap, технічний борг, реалізовано → [`BACKLOG.md`](BACKLOG.md)

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
- Компоненти (правила, структура, JSDoc, 3D) → [`client/src/shared/components/CLAUDE.md`](client/src/shared/components/CLAUDE.md)
- Стейт (Zustand stores, persist, маппінг) → [`client/src/shared/store/CLAUDE.md`](client/src/shared/store/CLAUDE.md)
- Backend (API, middleware, env, зовнішні API) → [`backend/CLAUDE.md`](backend/CLAUDE.md)

---

## Архітектура фронтенду

```
client/src/
├── features/          ← фіча-модулі (один модуль = один домен)
│   ├── finance/       │  index.tsx          — головний екран
│   ├── sprint/        │  [sub].tsx          — суб-сторінки
│   ├── recipes/       │  components/[name]/ — UI тільки цієї фічі
│   ├── watchlist/     │  store/             — Zustand store(s) фічі
│   ├── memories/      │  utils/             — утиліти фічі
│   ├── f1/            │  types/             — типи фічі
│   ├── dashboard/     │  data/              — статичні дані фічі
│   ├── profile/       │  hooks/             — хуки фічі
│   ├── notes/
│   ├── timeline/
│   ├── spaces/
│   ├── achievements/
│   ├── drinks/
│   ├── football/      ← Sport hub (колишній F1) + Football tab
│   └── auth/          ← Login, Register, Onboarding, VerifyEmail, Landing, ...
└── shared/            ← все що використовується 3+ фічами
    ├── components/
    │   ├── ui/        — Button, Modal, Input, PillSelector, ...
    │   └── layout/    — BottomNav, AppHeader
    ├── store/         — profileStore, uiStore, familyStore, achievementsStore
    ├── hooks/         — useSwipeToDismiss, usePwaInstall, ...
    ├── services/      — api.ts (authFetch), cloudinary, push
    ├── utils/         — дата, формати, геолокація, ...
    ├── types/         — спільні TypeScript типи
    ├── data/          — спільні статичні дані
    └── constants/     — product.ts, ...
```

### Правила імпортів
- **Всередині фічі** — відносні шляхи: `./store/financeStore`, `../components/BalanceHero`
- **Cross-feature або до shared** — абсолютні з `@/`: `@/shared/store/profileStore`, `@/features/sprint/components/sprint/TaskDetailModal`
- **Ніколи** `../../` з однієї фічі в іншу — тільки через `@/features/...`

### Критерії де розміщувати
| Де | Умова |
|----|-------|
| `features/[name]/` | Логіка, UI, стейт що стосується лише цього домену |
| `shared/` | Компонент/хук/утиліта що використовується у **3+ фічах** |
| `shared/store/` | Store що імпортується у **5+ різних фічах** |

### Шлях аліас
`@/` → `client/src/` (налаштовано у `tsconfig.app.json` + `vite.config.ts`)

---

## Автентифікація

Email + password (bcrypt) + Google OAuth (GIS). JWT access 15хв + refresh 30д (httpOnly cookie, rotation) → `profileStore` → `localStorage` (`profile-storage`).

Ролі: `role: 'admin' | 'user'` — зберігається в User моделі і JWT. **Доступ до фіч визначається boolean флагами в профілі**, не роллю:
- `f1Enabled: boolean` — F1 екран (BottomNav іконка, `/f1/live`, HeroCard блок)
- Backend `requireAdmin` middleware — тільки для `/api/auth/admin/users` (список всіх юзерів)

Flow: `/login` → `POST /api/auth/login { email, password }` або Google → access JWT + refresh cookie → `profileStore`.
Реєстрація: `POST /api/auth/register { email, password, name, username }` — якщо username вже існує без email, прикріплює credentials до існуючого профілю.
Google OAuth: GIS `renderButton` → callback → `POST /api/auth/google { credential }` → JWT.
Refresh: `POST /api/auth/refresh` — читає `rt` cookie, rotate → новий access token. `POST /api/auth/logout` — очищає cookie і DB запис.

**PIN-lock:** 4-цифровий PIN опціонально (bcrypt). Блокується при кожному свіжому завантаженні сторінки (`sessionStorage 'hud-pin-session'`) та після 5 хв неактивності. `pinLocked` в store НЕ персистується. `verifyPIN` використовує `authFetch` (автоматичний refresh).

**Верифікація email:** Resend + домен `mimir-hud.tech`. При реєстрації → `sendVerificationEmail` → лист з посиланням `/verify?token=...` → `POST /api/auth/verify-email` → `User.isVerified = true`. `VerificationBanner` показується незверифікованим юзерам. Деякі фічі (receipt scanner) вимагають `isVerified`. `POST /api/auth/resend-verification` — повторна відправка.

Всі запити через `authFetch` з Bearer токеном (проактивний refresh < 60с до expiry, singleton refresh race prevention). Маршрути захищені `ProtectedRoute`.

**Env:**
```
# /client
VITE_API_URL=https://hud-production.up.railway.app
VITE_CLOUDINARY_CLOUD_NAME=mimir-hud
VITE_CLOUDINARY_UPLOAD_PRESET=mimirorg
VITE_VAPID_PUBLIC_KEY=...
VITE_GOOGLE_CLIENT_ID=1067623625292-c8jdgeea4q3ub1nf0bp0jgg5vf1nmigi.apps.googleusercontent.com
VITE_MAPBOX_TOKEN=...
```

## Сімейні профілі (FamilyLink)

Модель `FamilyLink`: `requester`, `recipient`, `status: 'pending'|'accepted'`.

**Ізоляція даних:**
- **Спогади** — `userId: { $in: [myId, ...familyIds] }` — всі спогади сімейних профілів
- **Watchlist** — `$or: [{userId: myId}, {userId: {$in: familyIds}, watchedWith: myId}]` — тільки позначені `watchedWith`

**WatchlistItem.watchedWith** — `string[]` userId — замінив `watchTogether: boolean`.
Відображається як family member checkboxes в WatchlistDetail (ДИВИЛИСЬ РАЗОМ).

**MemoryCard** — показує аватар/ініціал власника якщо `ownerName` є (сімейна пам'ять).

**API:** `GET|POST /api/family`, `GET /api/family/search`, `POST /api/family/request`,
`POST /api/family/accept/:linkId`, `DELETE /api/family/:linkId`.

**UI:** Секція СІМ'Я в ProfilePage — пошук, pending/accepted відображення.

---

## PWA / Offline

`vite-plugin-pwa` + `injectManifest` + custom `src/sw.ts`.
`vercel.json` — rewrite all → `index.html` (обов'язково для SPA).
Service Worker підключений до Web Push (VAPID) — підписка, відправка та тригери реалізовані.
Іконки PWA згенеровані з `mimir-logo.svg` через `scripts/generate-icons.mjs` (sharp).

**Workbox стратегії (sw.ts):**
- `precacheAndRoute(__WB_MANIFEST)` — CacheFirst для всіх статичних assets (JS/CSS/іконки)
- `NetworkFirst` для API GET (`hud-production.up.railway.app`) — 8с timeout, кеш 5хв, max 100 записів
- `NetworkOnly + BackgroundSyncPlugin` для write (POST/PATCH/PUT/DELETE) — черга 24г
- `CacheFirst` для зображень — 7 днів, max 200 записів
- Офлайн-індикатор в `AppHeader` — пульсуючий бейдж при `navigator.onLine === false`

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
9. **Емодзі — мінімально.** Іконки/індикатори в UI — завжди SVG в стилі застосунку (stroke=currentColor, узгоджена товщина лінії), не emoji. Якщо серед існуючих іконок компонента немає відповідної — спитати користувача перед вибором/створенням нової (він підбирає варіанти сам), а не вставляти emoji як швидке рішення

---

## Правила комунікації з Claude (токен-ефективність)

- **CSS-only зміна → пропускати `tsc --noEmit`** — CSS Modules не мають TypeScript помилок за визначенням
- **Якщо юзер назвав точний файл + зміну → йти одразу**, без grep-exploration
- **Підсумок після задачі — max 1 речення**, без bullet-рекапу того що видно в diff-і
- **Без нарації перед tool calls** — не писати "Читаю файл..." / "Знаходжу..." перед інструментом
- **`++`, "давай", "ок" від юзера = старт негайно**, без повторного підтвердження плану
- **Матеріали від Джонні (дизайнера) → спочатку план** (що робимо, в якому порядку, які файли) → чекати підтвердження → тільки потім імплементація

---

## Правила написання коду (обов'язково для кожної сесії)

### React — useEffect
- НІКОЛИ не викликати `setState` синхронно в тілі `useEffect`
- Всі setState після async — тільки всередині async функції
- Завжди `cancelled` flag для cleanup

**ЗАБОРОНЕНО** (синхронний setState в тілі ефекту):
```tsx
// ❌ НЕПРАВИЛЬНО — setForm/setLoading синхронно в тілі useEffect
useEffect(() => {
  if (currency === 'UAH') {
    setExchangeRate(1)   // ← ПОМИЛКА: синхронно в тілі
    setRateLoading(false) // ← ПОМИЛКА
    return
  }
  setForm({ name: payment.name }) // ← ПОМИЛКА: синхронно перед async
  const fetchRate = async () => { ... }
  fetchRate()
}, [dep])
```

**ПРАВИЛЬНО** — весь setState всередині async або через useMemo/initializer:
```tsx
useEffect(() => {
  let cancelled = false
  const load = async () => {
    if (currency === 'UAH') {
      if (!cancelled) { setExchangeRate(1); setRateLoading(false) }
      return
    }
    setRateLoading(true)
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

> Якщо потрібно ініціалізувати форму з `editPayment` — передавати як `useState(initialValue)` або `useEffect` з повним async wrap, ніколи не `setForm(...)` голим рядком в тілі ефекту.

### React — загальні правила
- Optimistic update: спочатку UI, потім бекенд
- При помилці бекенду — відкотити стан
- PATCH — тільки змінені поля
- Debounce 800мс для степперів і текстових полів
- `useRef` для пропуску першого render при debounce

### Swipe-to-dismiss (bottom sheets)
- ОБОВ'ЯЗКОВО використовувати хук `useSwipeToDismiss(onClose, options)` з `client/src/hooks/useSwipeToDismiss.ts`
- НЕ писати власні imperative touchmove listeners у компонентах
- Параметри: `enabled` (вмикач), `bodyRef` (скролабельний inner element якщо відокремлений), `overlayRef` (backdrop для opacity анімації)
- Threshold 80px, damping 0.4, velocity check (delta>60 + velocity>0.5)

### Типізація
- ЗАВЖДИ явний `interface` для props
- ЗАВЖДИ JSDoc перед компонентом
- НІКОЛИ `any` — тільки конкретні типи або `unknown`
- Якщо форма має `FormState` і `FormErrors` — `setField` повинен приймати `keyof FormErrors`, не `keyof FormState`. `FormErrors` містить лише поля що валідуються, а `FormState` може містити поля без валідації (масиви, булеани тощо) — індексація `errors[field]` де `field: keyof FormState` — помилка компіляції.

### Акордеони — завжди з анімацією
- НІКОЛИ `{open && <Content />}` — це миттєвий mount/unmount без анімації
- ЗАВЖДИ `max-height` + `opacity` transition:

```css
.body {
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  transition: max-height 260ms ease-in-out, opacity 200ms ease-in-out;
}
.bodyOpen { max-height: 800px; opacity: 1; }
```

```tsx
<div className={`${styles.body} ${open ? styles.bodyOpen : ''}`}>
  {content}
</div>
```

- Стрілка: `transition: transform 0.2s ease` + `rotate(180deg)` при open
- `max-height` — ставити з запасом (800px для списків, 400px для форм)

### UI — використовувати існуючі компоненти

| Потреба | Компонент |
|---------|-----------|
| Вибір дати | `CustomDatePicker` |
| Модалка | `Modal` з prop `draggable` |
| Toast | `useUiStore().showToast(text, type)` |
| Завантаження фото | `ImageUploadButton` + `uploadToCloudinary` |
| Пріоритет | `PriorityBadge` (▲◆▽) |
| Прогрес-бар | `ProgressBar` |
| Вибір між варіантами (pill-chips) | `PillSelector` |

- НІКОЛИ `input[type=date]` — тільки `CustomDatePicker`
- НІКОЛИ нову модалку з нуля — тільки `Modal`
- НІКОЛИ власні pill-кнопки для вибору варіанту — тільки `PillSelector`

**PillSelector** (`client/src/components/ui/PillSelector`):
```tsx
<PillSelector
  options={[{ value: 'a', label: 'Варіант A', icon: <i className="ti ti-star" /> }]}
  value={selected}
  onChange={setSelected}
  columns={4}   // якщо потрібен grid (н-д 4 колонки); без цього — flex-wrap
/>
```
Активний стан — outline (border + text акцент + легкий тінт), не суцільна заливка.

### Стилі
- ЗАВЖДИ `var(--accent)` — ніколи hex
- ЗАВЖДИ окрема папка: `ComponentName/index.tsx` + `*.module.css`
- НЕ inline styles (крім динамічних значень)
- НЕ `!important`
- Числа/дати — `var(--font-mono)`
- Гривня ₴ — `var(--font-ui)` (Furore не підтримує ₴)
- Кнопки — SVG іконка, не символи
- `backdrop-filter` — ЗАВЖДИ разом з `-webkit-backdrop-filter` (Safari/iOS вимагає префікс)

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
- Нові npm залежності — ок якщо фіча того потребує (карти, canvas, 3D тощо); уникати для того що можна нативно
- НЕ `console.log` в продакшн (тільки `console.error`)
- НЕ хардкодити userId, імена профілів, ролі
- НЕ дублювати логіку — утиліта якщо 2+ рази

---

## Завершення сесії (обов'язково)

Після того як всі задачі сесії виконані — **оновити документацію** перед прощанням:

1. **`BACKLOG.md`** — додати реалізоване в розділ "Що реалізовано" (відповідний підрозділ: Dashboard / Finance / Recipes / тощо). Якщо щось було скасовано або змінено в підході — відобразити це.

2. **`client/src/shared/store/CLAUDE.md`** — додати нові stores або оновити опис існуючих (persist стратегія, нові actions, нові поля стану).

3. **`backend/CLAUDE.md`** — додати нові ендпоінти в таблицю API, нові моделі в розділ "Моделі".

4. **`client/src/shared/components/CLAUDE.md`** — якщо додані нові компоненти або змінилась структура папок.

> Немає окремого `client/src/screens/CLAUDE.md` — екрани це `features/[name]/index.tsx`, документуються описово в root CLAUDE.md/BACKLOG.md, не в окремому файлі.

Commit з docs-змінами окремо після основного коду: `docs: sync CLAUDE.md and BACKLOG with <session topic>`.
