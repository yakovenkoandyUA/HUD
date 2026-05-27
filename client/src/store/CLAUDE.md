# Zustand stores HUD

## Stores

```
store/
├── profileStore.ts   — token, activeProfile, profiles
│                       persist: token+profile (ключ: profile-storage)
├── financeStore.ts   — balance, transactions
│                       БЕЗ persist (backend-only)
├── goalsStore.ts     — savings goals
│                       БЕЗ persist (backend-only)
├── sprintStore.ts    — items, globalLabels
│                       persist тільки items+globalLabels (ключ: hud-sprint-v2)
├── lessonStore.ts    — уроки
│                       БЕЗ persist (backend-only, /api/lessons)
├── recipesStore.ts   — рецепти (backend-only) + mealOfWeek
│                       persist тільки mealOfWeek+mealWeekKey (ключ: hud-recipes)
├── watchlistStore.ts — watchlist items
│                       БЕЗ persist (backend-only)
├── memoriesStore.ts  — спогади + фото
│                       БЕЗ persist (backend-only, /api/memories)
└── uiStore.ts        — theme, toasts
                        persist тільки theme (ключ: hud-ui)
```

## Правила persist

- `financeStore`, `watchlistStore`, `goalsStore`, `lessonStore`, `memoriesStore` — **без** persist, дані завжди з backend
- `sprintStore` — часткова persist: `items` (rich local fields: checklist/labels/dueDate/description) + `globalLabels`; решта з backend при `fetchItems`
- `recipesStore` — persist тільки `mealOfWeek` + `mealWeekKey` (TheMealDB кеш на тиждень); рецепти — backend
- Жодного юзерського контенту в localStorage — тільки auth token, тема UI, та API-кеш

## Маппінг полів Lesson (frontend ↔ backend)

- `description` ↔ `desc`
- `notes` ↔ `sessionNotes`

## Memory — структура фото

Embedded photos subdocument `{ url, caption, createdAt }`.
Фото-операції: `POST/PATCH/DELETE /api/memories/:id/photos/:photoId`.
