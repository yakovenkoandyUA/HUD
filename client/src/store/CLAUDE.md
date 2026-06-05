# Zustand stores HUD

## Stores

```
store/
├── profileStore.ts        — token, activeProfile, profiles, f1Enabled
│                            persist: token+profile (ключ: profile-storage)
├── financeStore.ts        — balance, transactions
│                            БЕЗ persist (backend-only)
├── goalsStore.ts          — savings goals
│                            БЕЗ persist (backend-only)
├── streakStore.ts         — streak економії (currentStreak, bestStreak)
│                            persist local (ключ: hud-streak)
├── sprintStore.ts         — items, globalLabels
│                            persist тільки items (ключ: hud-sprint-v2)
│                            globalLabels → backend /api/labels
├── lessonStore.ts         — уроки
│                            БЕЗ persist (backend-only, /api/lessons)
├── recipesStore.ts        — рецепти (backend-only) + mealOfWeek
│                            persist тільки mealOfWeek+mealWeekKey (ключ: hud-recipes)
├── shoppingListStore.ts   — список покупок
│                            БЕЗ persist (backend-only, /api/shopping)
├── watchlistStore.ts      — watchlist items
│                            БЕЗ persist (backend-only)
├── memoriesStore.ts       — спогади + фото
│                            БЕЗ persist (backend-only, /api/memories)
├── f1PredictionsStore.ts  — прогнози гонок F1 + підрахунок очок
│                            БЕЗ persist (backend-only, /api/f1/predictions)
└── uiStore.ts             — theme, toasts
                             persist тільки theme (ключ: hud-ui)
```

## Правила persist

- `financeStore`, `watchlistStore`, `goalsStore`, `lessonStore`, `memoriesStore` — **без** persist, дані завжди з backend
- `sprintStore` — часткова persist: тільки `items` (rich local fields: checklist/labels/dueDate/description); `globalLabels` — backend `/api/labels`
- `recipesStore` — persist тільки `mealOfWeek` + `mealWeekKey` (TheMealDB кеш на тиждень); рецепти — backend
- `shoppingListStore` — **без** persist, backend `/api/shopping`; `fetchItems()` при mount
- `f1PredictionsStore` — **без** persist, backend `/api/f1/predictions`; `fetchPredictions()` при mount F1Screen
- `streakStore` — persist local (лише числові лічильники, не контент)
- Жодного юзерського контенту в localStorage — тільки auth token, тема UI, sprint items (rich local cache), streak лічильники

## shoppingListStore — структура

```ts
interface ShoppingItem {
  id: string
  name: string
  amount: number
  unit: string          // г | кг | мл | л | шт | ч.л. | ст.л.
  recipeId?: string
  recipeName?: string
  checked: boolean
}

// Actions
addFromRecipe(recipe, servings)  // парсить ingredients, масштабує під servings
addManual(name, amount, unit)
toggleItem(id)
removeItem(id)
clearChecked()
clearAll()
```

`addFromRecipe` — regex парсинг: `(\d+(?:[.,]\d+)?)\s*(кг|г|л|мл|шт|ч\.л\.|ст\.л\.)?` для кожного рядка ingredients.

## f1PredictionsStore — структура

```ts
interface RacePrediction {
  raceId: string           // формат: "2026-r{round}"
  raceName: string
  raceRound: number
  p1: string               // driverId
  p2: string
  p3: string
  savedAt: string          // ISO
  result?: {
    p1Match: 'exact' | 'partial' | 'miss'
    p2Match: 'exact' | 'partial' | 'miss'
    p3Match: 'exact' | 'partial' | 'miss'
    actualP1: string; actualP2: string; actualP3: string
    points: number         // 0–30
  }
}

// State
predictions: RacePrediction[]
totalPoints: number

// Actions
savePrediction(race, p1, p2, p3)   // замінює існуючий для того ж raceId
checkResult(raceId, p1, p2, p3)    // guard проти double-check, додає points
```

**Скоринг:** exact (той самий пілот + позиція) = 10 pts; partial (правильний пілот, інша позиція) = 5 pts; miss = 0 pts. Максимум 30 pts за гонку.

**Локаут:** `isRaceLocked(race)` — `race.date + 'T13:00:00Z'` мінус 2 години.

**Auto-check:** `RacePredictionCard` слухає `useLastRace()`, при появі нового результату викликає `checkResult` з `podium[0..2].driverId`.

## Маппінг полів Lesson (frontend ↔ backend)

- `description` ↔ `desc`
- `notes` ↔ `sessionNotes`

## Memory — структура фото

Embedded photos subdocument `{ url, caption, createdAt }`.
Фото-операції: `POST/PATCH/DELETE /api/memories/:id/photos/:photoId`.
