# HUD — Personal Organizer PWA

## Концепція
**HUD** (Heads Up Display) — особистий органайзер для повного контролю над фінансами, розкладом F1, менторською програмою, тижневими спрінтами та особистим контентом. Назва відсилає одночасно до геймінгу, sci-fi та F1 — відображає характер власника: гік + фанат Формули 1.

---

## Структура репозиторію

```
/
├── client/          # Frontend — React + TypeScript PWA
│   ├── public/
│   │   ├── fonts/   # furore.woff2 / furore.ttf
│   │   ├── icons/   # icon-192.png, icon-512.png (існують)
│   │   ├── tracks/  # SVG траси F1
│   │   └── models/  # mclaren_mp45__formula_1.glb
│   └── src/
│       ├── components/
│       ├── screens/
│       ├── hooks/
│       ├── store/
│       ├── types/
│       ├── utils/
│       ├── data/
│       └── styles/
└── backend/         # Backend — Node.js + Express + MongoDB
    ├── src/
    │   ├── routes/      # auth, transactions, sprint, goals, lessons, recipes, watchlist, push
    │   ├── models/      # User, Transaction, SprintTask, TodoItem, SavingsGoal, Lesson, Recipe, WatchlistItem, PushSubscription
    │   ├── controllers/ # Логіка обробки запитів
    │   ├── middleware/  # requireAuth, requireAdmin, error handling
    │   ├── scripts/     # seedUsers.ts, migrateToKotka.ts
    │   ├── services/    # WebPush
    │   └── config/      # MongoDB підключення
    ├── .env.example
    └── package.json
```

---

## Технічний стек

### Frontend (`/client`)
- **React 18** + **TypeScript**
- **Vite** + `vite-plugin-pwa` (`injectManifest` strategy, custom `src/sw.ts`)
- **Zustand** — стейт менеджмент
- **React Router v6** — навігація
- **CSS Modules** — стилізація
- **Recharts** — діаграми витрат у Finance
- **Three.js** — 3D модель McLaren на Dashboard і F1
- **Service Worker** — офлайн + Web Push (VAPID підключено)

### Backend (`/backend`)
- **Node.js** + **Express** — REST API
- **Mongoose** — ODM для MongoDB Atlas
- **JWT** — авторизація (profile selection, без пароля)
- **Web Push (VAPID)** — push-нотифікації на Android
- **Деплой** — Railway (`hud-production.up.railway.app`)

**Архітектура:**
```
GitHub репо
    ├── /client  → Vercel        (hud-murex.vercel.app)
    └── /backend → Railway       (hud-production.up.railway.app)
                      ↓
               MongoDB Atlas     (512MB free tier)
                      ↓
               Web Push VAPID → Android PWA
```

**Env змінні:**
```
# /backend .env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...

# /client .env
VITE_API_URL=https://hud-production.up.railway.app
VITE_CLOUDINARY_CLOUD_NAME=cold-house
VITE_CLOUDINARY_UPLOAD_PRESET=mimir_uploads
```

---

## Автентифікація — мультипрофіль без пароля

Замість одного юзера з паролем — вибір профілю з екрану ProfileSelect.

**Профілі:**
- **Котька** — `role: 'admin'` (бачить F1 екран, повний доступ)
- **Коська** — `role: 'user'` (без F1)

**Flow:**
1. Відкрити додаток → `/profile-select` (якщо немає токена)
2. Натиснути на аватар профілю → `POST /api/auth/select { username }` → JWT 30 днів
3. Токен зберігається у `profileStore` → `localStorage` (ключ `profile-storage`)
4. Всі API запити через `authFetch` з Bearer токеном

**Backend endpoints:**
```
GET  /api/auth/profiles      — список профілів (публічний)
POST /api/auth/select        — видає JWT по username (без пароля)
PATCH /api/auth/me           — оновити avatarUrl
```

**Сідинг бази:**
```bash
cd backend
railway run npx ts-node src/scripts/seedUsers.ts      # створює Котька + Коська
railway run npx ts-node src/scripts/migrateToKotka.ts # мігрує дані зі старого userId:'admin'
```

**JWT payload:** `{ userId, role }` — роль перевіряється middleware `requireAdmin`.

---

## Правила написання компонентів

**ОБОВ'ЯЗКОВО** — перед кожним компонентом у файлі писати JSDoc-опис інтерфейсу:

```tsx
/**
 * BalanceHero
 * ----------
 * Головна картка балансу на екрані фінансів.
 *
 * Props:
 * @prop {number} balance     — поточний баланс (грн)
 * @prop {number} dailyBudget — розрахований денний бюджет до кінця місяця
 */
interface BalanceHeroProps {
  balance: number
  dailyBudget: number
}

const BalanceHero: React.FC<BalanceHeroProps> = ({ ... }) => { ... }
```

---

## Дизайн-система

### Система тем
Застосунок підтримує **5 тем**: RETRO (default), WARM, DARK, JAPAN, HEROES.
Тема зберігається в `uiStore` → `localStorage` (ключ `hud-ui`).
Перемикання через `data-theme` атрибут на `<html>`.

```tsx
// uiStore.ts
theme: 'retro' | 'warm' | 'dark' | 'japan' | 'heroes'
setTheme: (theme) => void
```

---

### Тема 1 — RETRO 🎮 *(за замовчуванням)*

```css
[data-theme="retro"] {
  --bg: #0d0d0d;  --bg2: #141414;  --bg3: #1c1a18;
  --surface: #201e1b;  --surface2: #272421;
  --border: #2e2b27;  --border2: #3a3630;
  --accent: #B83A2D;  --accent-dim: #7a2720;
  --accent-glow: rgba(184,58,45,0.25);  --accent-soft: rgba(184,58,45,0.12);
  --second: #4E6851;  --second-soft: rgba(78,104,81,0.15);
  --gold: #DCC9A9;  --gold-dim: rgba(220,201,169,0.15);
  --text: #EDE0CC;  --text2: #9a8f82;  --text3: #5c5248;
  --positive: #4E6851;  --negative: #B83A2D;
}
```

### Тема 2 — WARM 🌅

```css
[data-theme="warm"] {
  --bg: #1a2328;  --bg2: #1f2c33;  --bg3: #24343c;
  --surface: #264653;  --surface2: #2d5060;
  --border: #2f5a69;  --border2: #386070;
  --accent: #E76F51;  --accent-dim: #a84e38;
  --accent-glow: rgba(231,111,81,0.25);  --accent-soft: rgba(231,111,81,0.12);
  --second: #2A9D8F;  --second-soft: rgba(42,157,143,0.15);
  --gold: #E9C46A;  --gold-dim: rgba(233,196,106,0.15);
  --text: #f0ece8;  --text2: #9ab0b8;  --text3: #5a7a82;
  --positive: #2A9D8F;  --negative: #E76F51;
}
```

### Тема 3 — DARK ⬛

```css
[data-theme="dark"] {
  --bg: #0a0a0a;  --bg2: #111111;  --bg3: #1a1a1a;
  --surface: #1e1e1e;  --surface2: #252525;
  --border: #2a2a2a;  --border2: #333333;
  --accent: #c8102e;  --accent-dim: #8b0b1f;
  --second: #2ecc71;  --second-soft: rgba(46,204,113,0.12);
  --gold: #d4a017;  --gold-dim: rgba(212,160,23,0.15);
  --text: #f0ece8;  --text2: #9a9490;  --text3: #5a5652;
  --positive: #2ecc71;  --negative: #c8102e;
}
```

### Тема 4 — JAPAN 🎌

```css
[data-theme="japan"] {
  --bg: #F5F0EB;  --bg2: #EDE8E2;  --bg3: #E5DED6;
  --surface: #EDE8E2;  --surface2: #E0D9D0;
  --border: #D5CEC5;  --border2: #C8C0B6;
  --accent: #C8102E;  --accent-dim: #8b0b1f;
  --second: #1a1a1a;  --second-soft: rgba(26,26,26,0.08);
  --gold: #8B7355;  --gold-dim: rgba(139,115,85,0.15);
  --text: #1a1a1a;  --text2: #6b6560;  --text3: #a09890;
  --positive: #2d6a4f;  --negative: #C8102E;
  --font-display: 'Cormorant Garamond', 'Furore', serif;
}
```

### Тема 5 — HEROES ⚡

```css
[data-theme="heroes"] {
  --bg: #0d0f1a;  --bg2: #111420;  --bg3: #161928;
  --surface: #1e2235;  --surface2: #242840;
  --border: #2e3450;  --border2: #353c5e;
  --accent: #d4a017;  --accent-dim: #9b7510;
  --second: #6a4fc8;  --second-soft: rgba(106,79,200,0.15);
  --gold: #d4a017;  --gold-dim: rgba(212,160,23,0.15);
  --text: #e8d5a0;  --text2: #9a8f70;  --text3: #5c5240;
  --positive: #4a9e5c;  --negative: #c8102e;
}
```

---

### Важливо про змінні
Всі компоненти використовують **семантичні змінні** — не хардкодити кольори!

```tsx
// ❌ Неправильно
color: '#B83A2D'
// ✅ Правильно
color: 'var(--accent)'
```

### Типографіка

```css
--font-display:  'Furore', 'Barlow Condensed', sans-serif
--font-ui:       'Barlow Condensed', sans-serif
--font-body:     'Barlow', sans-serif
--font-mono:     'JetBrains Mono', monospace
```

- **Furore** — логотип HUD, великі заголовки, числові hero-значення (баланс, відлік F1)
- **₴** — Barlow Condensed (Furore не підтримує гривню)
- **JetBrains Mono** — числові значення, дати, технічні рядки
- **Barlow Condensed** — навігація, теги, кнопки, підписи

---

## Екрани (Screens)

### 1. Dashboard (`/`)
- Логотип HUD зліва, годинник справа (Furore)
- BalanceMini, MealMini (TheMealDB), NextRaceMini, SprintMini, LessonsMini, TodosMini
- NASA APOD через довгий тап на логотип
- CitySplash анімація при першому відкритті (sessionStorage)
- CarHero — 3D McLaren MP4/5 (Three.js, 260px, OrbitControls + particles)

### 2. Finance (`/finance`)
- BalanceHero, TodayCard, StatsGrid
- TopupForm, ExpenseForm (модалки)
- TransactionList — кожна категорія свого кольору
- ShoppingTracker — трекер магазинних покупок
- GoalsList — savings goals з горизонтальним скролом (backend)
- ExpenseChart — donut chart (Recharts)

**Логіка:**
```
dailyBudget = Math.floor(currentBalance / daysLeftInMonth)
delta = dailyBudget - todayExpense
bonus = (dailyBudget * daysElapsed) - totalMonthExpense
```

### 3. F1 (`/f1`) — тільки для admin (Котька)
- NextRaceCard з TrackSVG (draw-path анімація)
- RaceCalendarList — 22 гонки 2026, пройдені затемнені
- ChampionshipTable — пілоти (фото через `images.weserv.nl`) + команди
- McLarenViewer — Three.js на F1 екрані
- F1 маршрути захищені `AdminRoute`

### 4. Sprint (`/sprint`)
- WeekHeader + SprintProgress (прогрес тижня)
- Єдиний список задач: **sprint** / **shopping** / **todo** + уроки (lessonStore)
- **Фільтр** (кнопка `≡`) — відкриває панель з dropdown-select:
  - **Тип:** Всі / Спринт / Покупки / Todo / Уроки
  - **Статус:** Активні (default) / Завершені / Всі
  - Кнопки "Скинути" та "Готово" в футері панелі
- За замовчуванням показуються тільки **активні** (не done) задачі
- TaskDetailModal — МІТКИ / ДЕДЛАЙН / ЧЕК-ЛІСТ / ОПИС + LabelPicker
- Форма додавання: тип (Спринт/Покупка/Todo) + назва + пріоритет (для shopping/todo)
- Категорії спринту (dev/mentorship/personal/learning) — задаються тільки через TaskDetailModal

### 5. Recipes (`/recipes`)
- MealBanner — блюдо тижня з TheMealDB (кеш по тижню в store)
- MealDetail — повний рецепт у модалці
- RecipeCard, RecipeForm — особисті рецепти з ImageUploadButton

### 6. Watchlist (`/watchlist`)
- Категорії: movie / series / anime / book
- Пошук через TMDB API (фільми/серіали/аніме) та Google Books API
- WatchlistDetail — статус, рейтинг, нагадування
- Кастомний постер через ImageUploadButton + Cloudinary

### 7. Memories (`/memories`, `/memories/:id`)
- Список спогадів з обкладинками
- MemoryDetail — фотографії, підписи, обкладинка (setCover)
- Cloudinary upload для фото

### 8. ProfileSelect (`/profile-select`) — публічний маршрут
- Сітка профілів (Котька + Коська)
- Аватар 96px, fallback — перша літера імені
- Тап → `selectProfile(username)` → JWT → redirect `/`

---

## Структура компонентів

```
components/
├── ui/
│   ├── Button, Card, Input, Badge, ProgressBar
│   ├── Modal, Toast (ToastContainer)
│   ├── PriorityBadge       ← ▲◆▽ (urgent/normal/low)
│   ├── CustomDatePicker    ← нативний UI замість input[type=date]
│   ├── ImageUploadButton   ← Cloudinary upload (square/wide варіанти)
│   ├── CitySplash          ← анімація запуску
│   └── PwaInstallBanner    ← банер встановлення PWA
├── layout/
│   ├── TopBar
│   ├── BottomNav           ← F1 іконка тільки для admin
│   └── ThemePicker         ← теми + профіль + install PWA + кеш
├── finance/
│   ├── BalanceHero, TodayCard, StatsGrid
│   ├── TopupForm, ExpenseForm, TransactionList
│   ├── ShoppingTracker, GoalsList, SavingsGoalCard
│   └── ExpenseChart        ← Recharts donut
├── f1/
│   ├── NextRaceCard, RaceCalendarList
│   ├── ChampionshipTable   ← пілоти (фото) + команди
│   ├── TrackSVG            ← draw-path анімація
│   └── McLarenViewer       ← Three.js
├── sprint/
│   ├── TaskCard            ← прогрес-бар чек-листа, лічильник ☑ X/Y
│   ├── TaskDetailModal     ← МІТКИ/ДЕДЛАЙН/ЧЕК-ЛІСТ/ОПИС
│   ├── SprintProgress, WeekHeader
│   └── (TodoList/TodoItem — видалено, замінено TaskCard)
├── lessons/
│   ├── LessonItem, LessonForm
├── recipes/
│   ├── MealBanner, MealDetail, RecipeCard, RecipeForm
├── watchlist/
│   ├── WatchlistHero, WatchlistGrid, WatchlistSearch, WatchlistDetail
├── memories/
│   ├── MemoryCard, MemoryForm, PhotoGrid
└── dashboard/
    ├── CarHero             ← Three.js McLaren, 260px, particles
    ├── BalanceMini, NextRaceMini, SprintMini
    ├── LessonsMini, TodosMini, MealMini, NasaApod
```

---

## Стейт (Zustand stores)

```
store/
├── profileStore.ts   — token, activeProfile, profiles; persist: token+profile (ключ: profile-storage)
├── financeStore.ts   — balance, transactions; БЕЗ persist (backend-only)
├── goalsStore.ts     — savings goals; БЕЗ persist (backend-only)
├── sprintStore.ts    — items, globalLabels; persist тільки items+globalLabels (ключ: hud-sprint-v2)
├── lessonStore.ts    — уроки; persist localStorage (ключ: hud-lessons)
├── recipesStore.ts   — рецепти + mealOfWeek; persist localStorage (ключ: hud-recipes)
├── watchlistStore.ts — watchlist items; БЕЗ persist (backend-only)
├── memoriesStore.ts  — спогади + фото; persist localStorage (ключ: memories-storage)
└── uiStore.ts        — theme, toasts; persist тільки theme (ключ: hud-ui)
```

**Правило persist:**
- `financeStore`, `watchlistStore`, `goalsStore` — **без** persist, дані завжди з backend
- `sprintStore` — часткова persist: `items` (для rich local fields: checklist/labels/dueDate/description) + `globalLabels`; решта з backend при `fetchItems`
- `lessonStore`, `recipesStore`, `memoriesStore` — повна persist, backend не підключено

---

## Backend API

| Route | Метод | Опис |
|-------|-------|------|
| `/api/auth/profiles` | GET | Список профілів (публічний) |
| `/api/auth/select` | POST | Видає JWT по username |
| `/api/auth/me` | PATCH | Оновити avatarUrl |
| `/api/transactions` | GET/POST | Транзакції |
| `/api/transactions/:id` | DELETE | Видалити транзакцію |
| `/api/sprint/tasks` | GET/POST | Sprint tasks |
| `/api/sprint/tasks/:id` | PATCH/DELETE | Оновити/видалити task |
| `/api/sprint/todos` | GET/POST | Todo items |
| `/api/sprint/todos/:id` | PATCH/DELETE | Оновити/видалити todo |
| `/api/goals` | GET/POST | Savings goals |
| `/api/goals/:id` | PATCH/DELETE | Оновити/видалити goal |
| `/api/watchlist` | GET/POST | Watchlist items |
| `/api/watchlist/:id` | PATCH/DELETE | Оновити/видалити item |

**Middleware:**
- `requireAuth` — перевіряє JWT, додає `req.userId`, `req.userRole`
- `requireAdmin` — 403 якщо `req.userRole !== 'admin'`

---

## Зовнішні API

| API | Використання | Ключ |
|-----|-------------|------|
| **TheMealDB** | Блюдо тижня, рецепти | Не потрібен |
| **NASA APOD** | Astronomy Picture of the Day | Безкоштовний (api.nasa.gov) |
| **OpenF1 API** | Залік пілотів (`/v1/championship_drivers?year=2026`) | Не потрібен |
| **Jolpica API** | Залік команд (`/ergast/f1/current/constructorstandings/`) | Не потрібен |
| **TMDB API** | Пошук фільмів/серіалів у Watchlist | Потрібен ключ |
| **Google Books** | Пошук книг у Watchlist | Не потрібен |
| **Cloudinary** | Upload аватарів, постерів, фото | unsigned preset |

---

## F1 Календар 2026

Зберігається в `/client/src/data/f1Season2026.ts` — 22 гонки.
Поле `trackSvg: string | null` — шлях до SVG або `null` (Chinese GP — відсутній файл).

**SVG траси** — `/client/public/tracks/` — є всі крім Chinese.
Анімація draw-path (JS-driven через `getTotalLength()`):
- Наступна гонка: `stroke: var(--accent)`
- Пройдені: `stroke: var(--text3)`

---

## 3D модель

**McLaren MP4/5** — `/client/public/models/mclaren_mp45__formula_1.glb`
- Ліцензія CC Attribution: *McLaren MP4/5 by dark_igorek (Sketchfab)*
- `renderer.dispose()` + geometry/material dispose при unmount — обов'язково
- DRACOLoader: `https://www.gstatic.com/draco/versioned/decoders/1.5.6/`
- `alpha: true` на WebGLRenderer

**CarHero** (Dashboard): 260px canvas, 80 частинок, OrbitControls, theme-aware освітлення
**McLarenViewer** (F1): менша висота, окремий компонент

---

## Cloudinary

```
VITE_CLOUDINARY_CLOUD_NAME=cold-house
VITE_CLOUDINARY_UPLOAD_PRESET=mimir_uploads
```

`uploadToCloudinary(file, folder)` — unsigned upload через FormData.
Папки: `mimir/recipes`, `mimir/watchlist`, `mimir/avatars`, `mimir` (default).
Хук: `useImageUpload(folder, onSuccess)` → `{ trigger, uploading, error, inputElement }`.
Компонент: `ImageUploadButton` — `square` (1:1) або `wide` (16:9).

---

## PWA

- `vite-plugin-pwa` + `injectManifest` + custom `src/sw.ts`
- `display: 'standalone'`, `theme_color: '#0d0d0d'`
- `vercel.json` — rewrite all routes to `index.html` (обов'язково для SPA)
- `PwaInstallBanner` — показується якщо не в standalone і не dismissed (3 дні)
- Кнопка "Встановити додаток" також у ThemePicker (постійно доступна)
- Service Worker підключений до Web Push (VAPID)

---

## Важливі домовленості

1. **Компонентний підхід** — кожен компонент в окремій папці з `index.tsx` + `*.module.css`
2. **JSDoc перед кожним компонентом** — опис пропсів перед `interface`
3. **5 тем** — RETRO / WARM / DARK / JAPAN / HEROES через `data-theme` на `<html>`
4. **Семантичні CSS змінні** — завжди `var(--accent)`, `var(--positive)`, ніколи hex
5. **Furore** — логотип, великі заголовки, числові hero-значення
6. **₴** — Barlow Condensed (Furore не підтримує)
7. **JetBrains Mono** — числа, дати, технічні рядки
8. **Без символу `+` на кнопках** — використовувати SVG іконку
9. **PriorityBadge** — ▲◆▽ символи + pill, не emoji
10. **Sprint фільтр** — dropdown-select, дефолт показує тільки активні задачі
11. **Без зайвих залежностей** — не додавати бібліотеки якщо можна нативно

---

## Статус реалізації (станом на 2026-05-27)

**Зроблено:**
- ✅ Scaffold, дизайн-система (5 тем), шрифти, CSS змінні
- ✅ UI: Card, Button, Input, Badge, ProgressBar, Modal, Toast, PriorityBadge, CustomDatePicker, ImageUploadButton, CitySplash, PwaInstallBanner
- ✅ Layout: TopBar, BottomNav (F1 тільки admin), ThemePicker (теми + профіль + PWA install + кеш)
- ✅ Dashboard: CarHero (3D McLaren + particles), BalanceMini, NextRaceMini, SprintMini, LessonsMini, TodosMini, MealMini, NasaApod
- ✅ Finance: BalanceHero, TodayCard, StatsGrid, TransactionList, ShoppingTracker, GoalsList, ExpenseChart
- ✅ F1 (admin only): NextRaceCard + TrackSVG, RaceCalendarList, RaceDetail, ChampionshipTable (пілоти з фото + команди), McLarenViewer
- ✅ Sprint: єдиний список (sprint/shopping/todo/lessons), filter panel з dropdown-select, TaskDetailModal (МІТКИ/ДЕДЛАЙН/ЧЕК-ЛІСТ/ОПИС), TaskCard з прогрес-баром чек-листа
- ✅ Recipes: MealBanner (TheMealDB, кеш по тижню), MealDetail, RecipeCard, RecipeForm
- ✅ Watchlist: пошук TMDB/Google Books, WatchlistDetail, ImageUploadButton для постерів
- ✅ Memories: список + детальна сторінка, photo grid, setCover, Cloudinary upload
- ✅ Cloudinary: `uploadToCloudinary.ts` + `useImageUpload` + `ImageUploadButton`
- ✅ `appCache.ts`: `clearApiCaches()`, versioned migration
- ✅ `formatDate.ts`: `formatDateUA`, `isOverdue`, `isTodayOrTomorrow`
- ✅ PWA: іконки, `vercel.json` SPA rewrite, install banner + кнопка в ThemePicker
- ✅ Backend: Express + Mongoose + JWT + VAPID, Railway деплой
- ✅ Auth: мультипрофіль (Котька/admin + Коська/user), ProfileSelect екран, ProtectedRoute, AdminRoute
- ✅ Backend інтеграція: transactions, sprint tasks/todos, goals, watchlist (без persist в store)
- ✅ `sprintStore` persist тільки rich local fields (checklist, labels, dueDate, description, globalLabels)
- ✅ Видалено `migrateToBackend.ts` — всі міграції завершено

**Залишилось / наступне:**
- ⬜ Сід-скрипти на Railway (`seedUsers.ts`, `migrateToKotka.ts`) — потрібно запустити 1 раз
- ⬜ Backend для lessons, recipes, memories — поки localStorage
- ⬜ Push-нотифікації — VAPID підключено, логіка відправки не реалізована
- ⬜ Фінансовий аналітик / менторський помічник (агенти) — майбутнє
