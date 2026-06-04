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

## Статус (2026-05-31)

**Зроблено:**
- Повний scaffold, дизайн-система (6 тем), всі екрани
- Backend інтеграція: transactions / sprint / goals / watchlist / lessons / recipes / memories
- Auth мультипрофіль (Котька admin / Коська user), PWA, Cloudinary, Three.js
- F1 розширення: DriverStatsCard, ConstructorStatsCard, LastRaceCard, PixelCar
- F1 прогнози: RacePredictionCard + f1PredictionsStore (local persist, scoring, lockout)
- MySeasonStats: streak, accuracy, race-by-race за сезон
- RaceDetail: circuit data, session schedule (Jolpica), weather (wttr.in), podium results
- circuitData.ts: 22 траси 2026 з характеристиками та рекордами
- RecipeDetail screen з stepper порцій + wishlist
- ShoppingList screen + shoppingListStore (local persist, addFromRecipe з ingredient parsing)
- RecipeForm: кастомні chip-picker категорій (emoji) та 3-кнопковий picker складності
- Dashboard: TasksAccordion (Задачі + Покупки), анімація при відмітці покупки

**Наступне:**
- ⬜ Push-нотифікації (VAPID підключено, логіка відправки не реалізована)
- ⬜ Фінансовий аналітик / менторський помічник (агенти)

---

## Наступний спринт

### Finance: місячна аналітика
- Звіт в кінці місяця: топ витрат, порівняння з попереднім місяцем
- Виключити категорію "Накопичення" з графіку витрат і аналітики
- Найдешевший/найдорожчий тиждень місяця
- Рекомендації де можна зекономити (на основі категорій)

### Sprint: асайн профілів до задач (сімейні відносини)

**Концепція:** профілі можуть бути пов'язані як "сім'я" — тоді вони можуть
асайнити один одного до задач і покупок.

**Backend:**
- Додати поле `familyId` або `linkedProfiles: ObjectId[]` в модель User
- Ендпоінт `POST /api/profiles/link` — зв'язати два профілі
- Задачі (sprint tasks, shopping items) отримують поле `assignedTo: ObjectId[]`
- GET задач повертає задачі де `userId === me` OR `assignedTo includes me`

**Frontend:**
- В TaskDetailModal і ShoppingItem — секція "ВИКОНАВЦІ"
- Показувати аватари доступних профілів (тільки linked)
- Тап на аватар → toggle assignee
- В списку задач — маленький аватар виконавця поруч з назвою
- Якщо задача заасайнена на тебе іншим профілем → окремий бейдж або секція "Від Коськи"

**Сімейні відносини:**
- Зробити універсально — не хардкодити Котька/Коська
- `POST /api/profiles/link { targetUsername }` — запит на зв'язок
- В майбутньому: підтвердження з боку другого профілю

### Recipes: генерація рецепту через AI
- Кнопка "🤖 Згенерувати рецепт" на сторінці рецептів
- Модалка: textarea "Що є в холодильнику? Які обмеження?"
- `POST /api/recipes/generate` → Anthropic API
- Claude повертає JSON рецепту в форматі моделі Recipe
- Одразу відкривається форма з заповненими полями для підтвердження
