# Екрани HUD

## 1. Dashboard (`/`)
- Логотип HUD зліва, годинник справа (Furore)
- HeroCard з балансом, dennyBudget, todaySpent, nextRace
- TasksAccordion — Sprint/Todos/Lessons міні-блоки
- NASA APOD через довгий тап на логотип
- CitySplash анімація при першому відкритті (sessionStorage)
- CarHero — 3D McLaren MP4/5 (Three.js, 260px, OrbitControls + particles)
- FAB кнопка — швидке додавання витрати (ExpenseForm модалка)
- `fetchTransactions()` викликається при mount (баланс завантажується одразу)

## 2. Finance (`/finance`)
- BalanceHero, TodayCard, StatsGrid
- TopupForm, ExpenseForm (модалки)
- TransactionList — кожна категорія свого кольору
- ShoppingTracker — трекер магазинних покупок
- GoalsList — savings goals з горизонтальним скролом (backend)
- ExpenseChart — donut chart (Recharts)

**Логіка бюджету:**
```
dailyBudget = Math.floor(currentBalance / daysLeftToNextSalary)
delta = dailyBudget - todayExpense
bonus = (dailyBudget * daysElapsed) - totalMonthExpense
```

## 3. F1 (`/f1`) — тільки admin (Котька)
- NextRaceCard з TrackSVG (draw-path анімація)
- RaceCalendarList — 22 гонки 2026, пройдені затемнені
- ChampionshipTable — пілоти (фото через `images.weserv.nl`) + команди
- McLarenViewer — Three.js
- Маршрути захищені `AdminRoute`

**F1 Календар:** `/client/src/data/f1Season2026.ts` — 22 гонки.
`trackSvg: string | null` — шлях до SVG або `null` (Chinese GP — відсутній).
SVG траси — `/client/public/tracks/`.
draw-path: наступна гонка `stroke: var(--accent)`, пройдені `stroke: var(--text3)`.

## 4. Sprint (`/sprint`)
- WeekHeader + SprintProgress (прогрес тижня)
- Єдиний список задач: **sprint** / **shopping** / **todo** + уроки (lessonStore)
- **Фільтр** (`≡`) — панель з dropdown-select:
  - Тип: Всі / Спринт / Покупки / Todo / Уроки
  - Статус: Активні (default) / Завершені / Всі
  - Кнопки "Скинути" та "Готово" в футері
- За замовчуванням — тільки **активні** (не done) задачі
- TaskDetailModal — МІТКИ / ДЕДЛАЙН / ЧЕК-ЛІСТ / ОПИС + LabelPicker
- Форма додавання: тип + назва + пріоритет (для shopping/todo)
- Категорії спринту (dev/mentorship/personal/learning) — тільки через TaskDetailModal

## 5. Recipes (`/recipes`)
- MealBanner — блюдо тижня з TheMealDB (кеш по тижню в store)
- MealDetail — повний рецепт у модалці
- RecipeCard, RecipeForm — особисті рецепти з ImageUploadButton

## 6. Watchlist (`/watchlist`)
- Категорії: movie / series / anime / book
- Пошук через TMDB API (фільми/серіали/аніме) та Google Books API
- WatchlistDetail — статус, рейтинг, нагадування
- Кастомний постер через ImageUploadButton + Cloudinary

## 7. Memories (`/memories`, `/memories/:id`)
- Список спогадів з обкладинками
- MemoryDetail — фотографії, підписи, обкладинка (setCover)
- Cloudinary upload для фото

## 8. ProfileSelect (`/profile-select`) — публічний маршрут
- Сітка профілів (Котька + Коська)
- Аватар 96px, fallback — перша літера імені
- Тап → `selectProfile(username)` → JWT → redirect `/`
