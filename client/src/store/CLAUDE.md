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
│                            БЕЗ persist (backend-only, /api/sprint/tasks)
│                            globalLabels → backend /api/labels
│                            migrateFromLocalStorage() — одноразова міграція з hud-sprint-v2
├── lessonStore.ts         — уроки
│                            БЕЗ persist (backend-only, /api/lessons)
├── recipesStore.ts        — рецепти (backend-only) + wishlistIds + cookStats
│                            persist тільки wishlistIds (ключ: hud-recipes)
│                            cookStats: Record<recipeId, { count, lastCooked }> — з /api/recipes/cook-stats
│                            logCook(id) — optimistic update + POST /api/recipes/:id/cook
├── mealPlanStore.ts       — тижневий планер страв
│                            БЕЗ persist (backend /api/meal-plan, MealPlan модель)
│                            fetchPlan() при mount MealPlannerScreen
│                            addToDay/removeFromDay/clearWeek — optimistic + PUT /api/meal-plan
├── shoppingListStore.ts   — список покупок
│                            БЕЗ persist (backend-only, /api/shopping)
├── watchlistStore.ts      — watchlist items
│                            БЕЗ persist (backend-only)
├── memoriesStore.ts       — спогади + фото + places[] + dateEnd + isTrip + withProfiles[] + coverAttribution
│                            БЕЗ persist (backend-only, /api/memories)
│                            toPlace() нормалізує backend `_id` → `id` для places[]
│                            Memory: dateEnd, isTrip, withProfiles: string[], coverAttribution: string
├── f1PredictionsStore.ts  — прогнози гонок F1 + підрахунок очок
│                            БЕЗ persist (backend-only, /api/f1/predictions)
└── uiStore.ts             — theme, toasts
                             persist тільки theme (ключ: hud-ui)
```

## Правила persist

- `financeStore`, `watchlistStore`, `goalsStore`, `lessonStore`, `memoriesStore` — **без** persist, дані завжди з backend
- `sprintStore` — **без** persist, backend-only `/api/sprint/tasks`; всі поля (checklist/labels/dueDate/description) зберігаються на бекенді; `globalLabels` — `/api/labels`
- `recipesStore` — persist тільки `mealOfWeek` + `mealWeekKey` (TheMealDB кеш на тиждень); рецепти — backend
- `shoppingListStore` — **без** persist, backend `/api/shopping`; `fetchItems()` при mount
- `f1PredictionsStore` — **без** persist, backend `/api/f1/predictions`; `fetchPredictions()` при mount F1Screen
- `streakStore` — persist local (лише числові лічильники, не контент)
- Жодного юзерського контенту в localStorage — тільки auth token, тема UI, sprint items (rich local cache), streak лічильники

## profileStore — PIN lock

- `pinLocked: boolean` — НЕ персистується (скидається при refresh)
- `verifyPIN(pin)` — використовує `authFetch` (автоматичний refresh токена, не сирий fetch)
- `unlockPIN()` — встановлює `sessionStorage['hud-pin-session'] = '1'`
- `PinGuard` в App.tsx блокує при кожному свіжому завантаженні якщо sessionStorage ключ відсутній
- `sessionStorage` очищається при закритті вкладки/refresh → PIN запитується при кожному відкритті

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

## Memory — структура фото і places

Embedded photos subdocument `{ url, caption, createdAt }`.
Фото-операції: `POST/PATCH/DELETE /api/memories/:id/photos/:photoId`.

`places: { id, name, address, lat, lng }[]` — заклади всередині спогаду (рендеряться окремими `kind: 'place'` пінами на `MemoryMap`, колір `var(--second)`). Зберігаються через звичайний `PATCH /api/memories/:id` (немає окремого роута). **UI додавання place в `AddMemoryModal`/`PlanForm` ще не реалізований** — поле тільки читається/рендериться.

## sprintStore / UnifiedTodo — dueTime, timeOfDay, reminder

- `dueTime?: string` (HH:MM) — опційний час дедлайну, редагується через `TimeWheelPicker` (доступний тільки коли вже стоїть `dueDate`)
- `timeOfDay?: 'morning'|'afternoon'|'evening'|null` — слот доби для звички, керує іконкою в `RoutineRing`/`TodayHabits` (sunrise/sun/moon)
- `reminder?: { amount: number; unit: 'minutes'|'hours'|'days'|'weeks' }` — редагується через спільний `ReminderFields` (DeadlineSheet / TaskDetailModal / AddSprintItemModal-звички), бекенд скидає `reminderSent` при будь-якій зміні `dueDate`/`dueTime`/`nextDue`/`reminder`
- `calcWeekRate()` (`utils/sprint.ts`, нова) — % виконання звички за останні 7 днів, споживається `RoutineRing`; поряд з уже існуючими `calcMonthRate()`/`calcStreak()`/`calcRecord()`
