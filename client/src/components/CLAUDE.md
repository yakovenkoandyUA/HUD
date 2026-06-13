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
│   ├── BottomNav           ← F1 іконка тільки якщо f1Enabled (boolean feature flag)
│   └── ThemePicker         ← теми + профіль + install PWA + кеш
├── finance/
│   ├── BalanceHero, TodayCard, StatsGrid
│   ├── TopupForm, ExpenseForm, TransactionList
│   ├── ShoppingTracker, GoalsList, GoalDetail  ← GoalDetail: модалка деталей цілі накопичення
│   ├── ReceiptScanner      ← Anthropic Vision API, розпізнавання чеків
│   ├── RecurringPayments   ← регулярні платежі з іконками сервісів
│   └── ExpenseChart        ← Recharts donut
├── f1/
│   ├── NextRaceCard        ← наступна гонка з TrackSVG і RaceCountdown
│   ├── RaceCalendarList    ← 22 гонки 2026, пройдені затемнені, тап → /f1/:round
│   ├── LastRaceCard        ← останній результат (Jolpica), podium + fastest lap
│   │                          експортує useLastRace hook та типи LastRaceData/PodiumEntry
│   ├── ChampionshipTable   ← пілоти (фото через images.weserv.nl) + команди
│   │                          expand/collapse рядок → DriverStatsCard / ConstructorStatsCard
│   ├── DriverStatsCard     ← деталі пілота: wins/poles/podiums/FL, прогрес-бар очок
│   │                          Jolpica: results + qualifying, sessionStorage кеш
│   ├── ConstructorStatsCard← деталі команди: PixelCar анімація, пілоти, stats grid
│   │                          паралельний fetch results + qualifying
│   ├── RacePredictionCard  ← прогноз топ-3 перед гонкою, auto-check після результату
│   │                          локаут за 2г до старту, scoring: exact=10/partial=5/miss=0
│   ├── MySeasonStats       ← таб "МІЙ СЕЗОН": streak, accuracy, race-by-race список
│   ├── TrackSVG            ← draw-path анімація (JS via getTotalLength())
│   ├── RaceCountdown       ← live countdown до наступної гонки
│   └── McLarenViewer       ← Three.js
├── PixelCar/               ← SVG pixel-art болид (viewBox 0 0 48 16), team-colored fill
│                              Props: team (string), size (number)
├── sprint/
│   ├── TaskCard            ← прогрес-бар чек-листа, лічильник ☑ X/Y
│   ├── TaskDetailModal     ← МІТКИ/ДЕДЛАЙН/ЧЕК-ЛІСТ/ОПИС + LabelPicker
│   └── SprintProgress, WeekHeader
├── lessons/
│   └── LessonItem, LessonForm
├── recipes/
│   ├── RecipeCard          ← картка рецепту в Instagram-grid, wishlist heart
│   ├── RecipeForm          ← форма з кастомними chip-пікерами категорії та складності
│   │                          Категорія: pill-chips з emoji, Складність: 3 кнопки (зелений/золотий/червоний)
│   ├── CategoriesSlider    ← горизонтальний slider фільтра категорій
│   └── CategoryCard        ← картка категорії з grid 1–4 фото рецептів
├── watchlist/
│   ├── WatchlistHero, WatchlistGrid
│   ├── WatchlistSearch     ← fullscreen search overlay (backdrop + "Скасувати"), TMDB + Google Books
│   ├── WatchlistDetail     ← деталі + статус chips (book-aware labels) + StarRating + EpisodesList
│   ├── WatchlistCard       ← pill-бейдж статусу на постері (book-aware labels)
│   ├── StarRating          ← зіркова оцінка 1–10, readOnly та interactive режими
│   └── EpisodesList        ← список епізодів для серіалів/аніме
├── memories/
│   └── MemoryCard, MemoryForm, PhotoGrid
└── dashboard/
    ├── CarHero             ← Three.js McLaren, 260px canvas, 80 частинок, OrbitControls
    ├── HeroCard            ← компактний hero-блок: баланс + nextRace + спринт-прогрес
    │                          border-left gold accent, Furore для числа балансу
    ├── RaceHeroCard        ← F1 блок в Dashboard (тільки для admin, f1Enabled)
    ├── ClockBlock          ← годинник Furore + дата
    ├── TasksAccordion      ← акордеон КВЕСТИ / ПОКУПКИ / НОТАТКИ (expand/collapse секції)
    │                          анімація strike+fadeout при відмітці покупки; нотатки → /notes
    └── SprintMini, LessonsMini, TodosMini
```

---

## Специфічні правила

- **Кнопки** — без символу `+`, використовувати SVG іконку
- **PriorityBadge** — ▲◆▽ символи + pill стиль, не emoji
- **Без зайвих залежностей** — не додавати бібліотеки якщо можна нативно
- **Модалки без URL** — обов'язково використовують `useModalHistory(onClose, isOpen)` з `client/src/hooks/useModalHistory.ts`. Це дозволяє системному swipe "назад" та кнопці "←" закривати модалку замість переходу на попередню сторінку.

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

---

## F1 зовнішні API та кешування

- **Jolpica (Ergast)**: `https://api.jolpi.ca/ergast/f1/` — standings, results, qualifying, schedule
- **OpenF1**: headshots пілотів
- **images.weserv.nl**: proxy для headshot зображень (fallback → initials)
- Кешування: sessionStorage, ключ формат `hud-{name}-v{N}-{YYYY-MM-DD}` (денне)
- DriverStatsCard / ConstructorStatsCard: кеш у Map через props `cachedStats / onStats`
