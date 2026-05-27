# Компоненти HUD

## Правило написання компонентів

**ОБОВ'ЯЗКОВО** — JSDoc-опис перед кожним компонентом:

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

Кожен компонент — окрема папка з `index.tsx` + `*.module.css`.

---

## Структура

```
components/
├── ui/
│   ├── Button, Card, Input, Badge, ProgressBar
│   ├── Modal, Toast (ToastContainer)
│   ├── PriorityBadge       ← ▲◆▽ (urgent/normal/low), не emoji
│   ├── CustomDatePicker    ← нативний UI замість input[type=date]
│   ├── ImageUploadButton   ← Cloudinary upload (square/wide варіанти)
│   ├── CitySplash          ← анімація запуску (sessionStorage)
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
│   ├── ChampionshipTable   ← пілоти (фото через images.weserv.nl) + команди
│   ├── TrackSVG            ← draw-path анімація (JS via getTotalLength())
│   └── McLarenViewer       ← Three.js
├── sprint/
│   ├── TaskCard            ← прогрес-бар чек-листа, лічильник ☑ X/Y
│   ├── TaskDetailModal     ← МІТКИ/ДЕДЛАЙН/ЧЕК-ЛІСТ/ОПИС + LabelPicker
│   └── SprintProgress, WeekHeader
├── lessons/
│   └── LessonItem, LessonForm
├── recipes/
│   └── MealBanner, MealDetail, RecipeCard, RecipeForm
├── watchlist/
│   └── WatchlistHero, WatchlistGrid, WatchlistSearch, WatchlistDetail
├── memories/
│   └── MemoryCard, MemoryForm, PhotoGrid
└── dashboard/
    ├── CarHero             ← Three.js McLaren, 260px canvas, 80 частинок, OrbitControls
    ├── BalanceMini, NextRaceMini, SprintMini
    └── LessonsMini, TodosMini, MealMini, NasaApod
```

---

## Специфічні правила

- **Кнопки** — без символу `+`, використовувати SVG іконку
- **PriorityBadge** — ▲◆▽ символи + pill стиль, не emoji
- **Без зайвих залежностей** — не додавати бібліотеки якщо можна нативно

---

## Cloudinary / ImageUploadButton

```
VITE_CLOUDINARY_CLOUD_NAME=mimir-hud
VITE_CLOUDINARY_UPLOAD_PRESET=mimirorg
```

`uploadToCloudinary(file, folder)` — unsigned upload через FormData.
Папки: `mimir/recipes`, `mimir/watchlist`, `mimir/avatars`, `mimir` (default).
Хук: `useImageUpload(folder, onSuccess)` → `{ trigger, uploading, error, inputElement }`.
`ImageUploadButton` — варіанти `square` (1:1) або `wide` (16:9).

---

## 3D модель (Three.js)

**McLaren MP4/5** — `/client/public/models/mclaren_mp45__formula_1.glb`
- Ліцензія CC Attribution: *McLaren MP4/5 by dark_igorek (Sketchfab)*
- `renderer.dispose()` + geometry/material dispose при unmount — обов'язково
- DRACOLoader: `https://www.gstatic.com/draco/versioned/decoders/1.5.6/`
- `alpha: true` на WebGLRenderer

**CarHero** (Dashboard): 260px canvas, 80 частинок, OrbitControls, theme-aware освітлення
**McLarenViewer** (F1): менша висота, окремий компонент
