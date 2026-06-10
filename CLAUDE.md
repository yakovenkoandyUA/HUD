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
- Компоненти (правила, структура, JSDoc, 3D) → [`client/src/components/CLAUDE.md`](client/src/components/CLAUDE.md)
- Екрани (поведінка кожного screen) → [`client/src/screens/CLAUDE.md`](client/src/screens/CLAUDE.md)
- Стейт (Zustand stores, persist, маппінг) → [`client/src/store/CLAUDE.md`](client/src/store/CLAUDE.md)
- Backend (API, middleware, env, зовнішні API) → [`backend/CLAUDE.md`](backend/CLAUDE.md)

---

## Автентифікація

Мультипрофіль без пароля (тимчасово — до Фази 1):
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
VITE_VAPID_PUBLIC_KEY=...
```

---

## PWA

`vite-plugin-pwa` + `injectManifest` + custom `src/sw.ts`.
`vercel.json` — rewrite all → `index.html` (обов'язково для SPA).
Service Worker підключений до Web Push (VAPID) — підписка, відправка та тригери реалізовані.
Іконки PWA згенеровані з `mimir-logo.svg` через `scripts/generate-icons.mjs` (sharp).

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

---

## Наступний спринт

### Finance: місячна аналітика
- Звіт: топ витрат, порівняння з попереднім місяцем
- Виключити категорію "Накопичення" з графіку витрат
- Найдешевший/найдорожчий тиждень місяця
- Рекомендації де можна зекономити

### Recipes: генерація рецепту через AI
- Кнопка "Згенерувати рецепт" на сторінці рецептів
- Модалка: textarea "Що є в холодильнику? Які обмеження?"
- `POST /api/recipes/generate` → Anthropic API
- Claude повертає JSON рецепту → форма з заповненими полями

### Sprint: асайн профілів до задач
- `linkedProfiles: ObjectId[]` в модель User
- `assignedTo: ObjectId[]` в задачах
- `POST /api/profiles/link { targetUsername }`
- TaskDetailModal секція "ВИКОНАВЦІ" з аватарами
- Задачі від іншого профілю — окрема секція "Від Коськи"

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

### UI — використовувати існуючі компоненти

| Потреба | Компонент |
|---------|-----------|
| Вибір дати | `CustomDatePicker` |
| Модалка | `Modal` з prop `draggable` |
| Toast | `useUiStore().showToast(text, type)` |
| Завантаження фото | `ImageUploadButton` + `uploadToCloudinary` |
| Пріоритет | `PriorityBadge` (▲◆▽) |
| Прогрес-бар | `ProgressBar` |

- НІКОЛИ `input[type=date]` — тільки `CustomDatePicker`
- НІКОЛИ нову модалку з нуля — тільки `Modal`

### Стилі
- ЗАВЖДИ `var(--accent)` — ніколи hex
- ЗАВЖДИ окрема папка: `ComponentName/index.tsx` + `*.module.css`
- НЕ inline styles (крім динамічних значень)
- НЕ `!important`
- Числа/дати — `var(--font-mono)`
- Гривня ₴ — `var(--font-ui)` (Furore не підтримує ₴)
- Кнопки — SVG іконка, не символи

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
- НЕ нові npm залежності без крайньої необхідності
- НЕ `console.log` в продакшн (тільки `console.error`)
- НЕ хардкодити userId, імена профілів, ролі
- НЕ дублювати логіку — утиліта якщо 2+ рази
