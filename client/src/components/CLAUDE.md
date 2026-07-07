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
│   ├── PinLock             ← fullscreen PIN-оверлей, Mimir face watermark (guardian) над аватаром
│   ├── TimeWheelPicker     ← iOS-style scroll-колесо вибору часу (ГГ:ХХ), tap-to-select на числі;
│   │                          default export — самостійний bottom sheet; `TimeWheelRow` (named export) —
│   │                          ті ж барабани без обгортки-шіта, для вбудовування в DeadlineSheet
│   ├── AchievementUnlockedModal ← non-blocking slide-down toast при розблокуванні ачівки/рангу
│   ├── PwaInstallBanner    ← банер встановлення PWA
│   ├── UpgradePrompt       ← frosted-glass картка апгрейду плану (props: feature?, limitKey?,
│   │                          currentCount?, message?, compact?); CTA → /profile?tab=plan
│   └── PaywallGate         ← wrapper: `useCanUseFeature(feature)` → children або fallback/UpgradePrompt
├── layout/
│   ├── TopBar
│   ├── BottomNav           ← F1 іконка тільки якщо f1Enabled (boolean feature flag)
│   │                          3 стилі (`navStyle`): classic (повна панель) / pill (плаваюча, тільки
│   │                          закріплені) / hub (плаваюча + центральна руна Ансуз — відкриває
│   │                          радіальне меню решти розділів, rotate 180° при відкритті).
│   │                          Classic: label під кожною іконкою (завжди). Pill/hub: label тільки для
│   │                          активного item (item розширюється в mini-pill з текстом).
│   │                          На `/profile` завжди повна панель табів незалежно від navStyle
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
├── profile/
│   └── AchievementGrid     ← грід бейджів ачівок, БЕЗ примусового порядку — кожна картка
│                              сама показує іконку+назву одразу, тап розгортає опис (locked → hint)
│                              Doodle-іконки збільшені (56px, opacity 0.9 unlocked / 0.32 locked);
│                              `data/achievements.ts` — 4 нові ачівки (notes/goal/mood/streak),
│                              `DoodleIllustration` має відповідні нові variant-и
├── sprint/
│   ├── TaskCard            ← прогрес-бар чек-листа, лічильник ☑ X/Y
│   ├── TaskDetailModal     ← МІТКИ/ДЕДЛАЙН/ЧЕК-ЛІСТ/ОПИС + LabelPicker
│   ├── DeadlineSheet       ← об'єднаний bottom sheet: дата + опційний час (TimeWheelPicker) + опційне
│   │                          нагадування (ReminderFields) в одному флоу, замість трьох окремих чіпів
│   ├── ReminderFields      ← спільний редактор "за N <одиниця> до" (інпут числа + сітка 2×4 пілюль
│   │                          Хвилин/Годин/Днів/Тижнів); юзається в DeadlineSheet, TaskDetailModal,
│   │                          AddSprintItemModal (звички) — щоб не дублювати верстку
│   ├── RepeatConfigScreen  ← інтервал повтору тепер pill-grid (день/тиждень/місяць/рік) замість
│   │                          нативного `<select>` (раніше відкривав системний дропдаун)
│   ├── RoutineRing         ← SVG кільце прогресу звички за 7 днів (`calcWeekRate`), у центрі —
│   │                          іконка часу доби (sunrise/sun/moon) або ✓ якщо вже виконано сьогодні
│   ├── WeekHeader          ← 7-денний стрип або компактна місячна сітка (toggle `calendarMode`)
│   │                          Props: calendarMode 'week'|'month', onToggleCalendarMode
│   │                          Month mode: getMonthGrid, internal vmYear/vmMonth state, < > nav
│   ├── WeekExpandedView    ← повноекранний overlay; МІСЯЦЬ/ТИЖДЕНЬ/ДЕНЬ таби; звички в ДЕНЬ-вигляді
│   │                          показують RoutineRing замість простого чекбокса
│   │                          Тиждень: viewWeekStart state, slide анімація, «Повернутись на сьогодні»
│   │                          Місяць: inline день-деталь панель, onAddForDay callback
│   └── SprintProgress
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
│   ├── WatchlistStatsSheet ← bottom sheet статистики: години, розбивка по категоріях, жартівливі порівняння
│   │                          відкривається кнопкою 📊 у рядку статусів; фільм=2г, серіал=45хв/еп, аніме=24хв/еп
│   ├── StarRating          ← зіркова оцінка 1–10, readOnly та interactive режими
│   └── EpisodesList        ← список епізодів для серіалів/аніме
├── memories/
│   ├── MemoryCard, MemoryForm, PhotoGrid
│   ├── AddMemoryModal     ← cover zone: Завантажити | Unsplash (два варіанти в empty state, overlay chips у filled); "З КИМ" секція — chips сімейних членів → `withProfiles: string[]`; isTrip — `tripRow` під датою
│   ├── UnsplashPicker     ← bottom sheet: debounced пошук (600мс), 3×3 сітка, attribution overlay; тригерить `/photos/:id/download` (Unsplash TOS); `VITE_UNSPLASH_ACCESS_KEY`
│   ├── FlashbackModal     ← fullscreen "цього дня N років тому" (раз на добу, sessionStorage), навігація вліво/вправо по кількох спогадах
│   ├── TripExpensesSheet  ← bottom sheet ретроактивного тегування витрат у поїздці; відкривається після збереження trip-memory; checkboxes + bulk PATCH
│   ├── LocationSearch     ← автокомпліт місць через Mapbox Search Box API (`VITE_MAPBOX_TOKEN`) + "Обрати на карті"; `userTyped` ref (не `skipSearch`) — надійно в StrictMode; `inlineResults` prop (results в `position:static`) для вбудованих модалок
│   ├── LocationMapPicker  ← Mapbox GL bottom sheet, тап-вибір місця, реверс-геокодинг Mapbox Geocoding
│   │                          3D-кнопка (pitch toggle), українські підписи (`map.setLanguage('uk')`),
│   │                          lightPreset день/ніч під тему застосунку (`utils/mapboxTheme.ts`)
│   └── MemoryMap          ← Mapbox GL карта (Standard style, `projection: 'globe'`), самописна
│                              пиксель-кластеризація (без external lib); піни планів + спогадів + places[]
│                              (kind: 'plan'|'memory'|'place'); горизонтальна карусель карток замість
│                              старого вертикального списку; попап з обкладинкою-полароїдом
│                              (`.popupPolaroid`, rotate -4°, випрямляється на hover) + кнопкою
│                              "Маршрут" (Mapbox Directions API, лінія через Source+Layer, малює
│                              км/хв прямо в кнопці); одноразова `MapFeatureHint` (обертання двома
│                              пальцями / 3D / тап-пін-маршрут), localStorage `hud-map-hint-dismissed`;
│                              lightPreset день/ніч під тему; стартовий zoom 2 (огляд-глобус), без
│                              авто-fitBounds — тап на пін/карусель сам робить flyTo
└── dashboard/
    ├── CarHero             ← Three.js McLaren, 260px canvas, 80 частинок, OrbitControls
    ├── HeroCard            ← баланс (Furore) + sparkline 7 днів + dailyBudget bar
    │                          плаский стиль: border-top/bottom + border-left gold, без radius
    ├── TodayHabits         ← мінімалістичний рядок чіпів звичок на сьогодні (крапка + іконка часу
    │                          доби + назва), + кнопка "детальніше ›" → DayOverlay; замінив звичка-чіпи
    │                          що раніше були частиною DaySummaryCard
    ├── DaySummaryCard      ← тепер тільки навігаційний 2×2 грід: Квести(gold)/Покупки(accent)/
    │                          Страва(second)/Нотатки(text); звички повністю винесені в TodayHabits
    ├── RaceHeroCard        ← F1 блок в Dashboard (тільки якщо f1Enabled)
    ├── RaceCountdownStrip  ← стрічка відліку до наступної гонки
    ├── GreetingBlock       ← привітання + дата (компактніша версія)
    ├── SpacesStrip         ← горизонтальна стрічка Life Spaces на Dashboard; прихована якщо 0 spaces
    │                          і f1Enabled=false; F1 virtual card → /f1; реальні Space-карти поки
    │                          некліка́бельні (немає Space detail route)
    ├── DayOverlay          ← fullscreen "МІЙ ДЕНЬ" (mood, звички по слотах — RoutineRing в
    │                          деталізованому вигляді, погода)
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
