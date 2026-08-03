# Shared Components — MIMIR

> Компоненти в `shared/` використовуються у 3+ фічах. Нові компоненти сюди тільки якщо відповідають цьому критерію.

## UI компоненти (`shared/components/ui/`)

### Modal
Універсальна модалка з drag-to-dismiss.
```tsx
<Modal open={open} onClose={onClose} title="Заголовок" draggable>
  {children}
</Modal>
```
- `draggable` — вмикає drag handle зверху + swipe-down dismiss
- Використовує `useSwipeToDismiss` хук (damping 0.4, 120px cap, 0.18s overlay fade)
- **Не писати нову модалку з нуля** — тільки цей компонент

### PillSelector
Вибір між варіантами (pill-chips). Активний стан — outline (border + text акцент + легкий тінт), не суцільна заливка.
```tsx
<PillSelector
  options={[{ value: 'a', label: 'Варіант A', icon: <svg/> }]}
  value={selected}
  onChange={setSelected}
  columns={4}   // grid 4 колонки; без — flex-wrap
/>
```
**Не писати власні pill-кнопки** — тільки `PillSelector`

### CustomDatePicker
Кастомний вибір дати. **Ніколи** `input[type=date]` — тільки цей компонент.
```tsx
<CustomDatePicker value={date} onChange={setDate} label="Дата" />
```

### PriorityBadge
Пріоритет: ▲◆▽ + pill. Не emoji, не просто текст.
```tsx
<PriorityBadge priority="high" />  // ▲ HIGH
```

### ProgressBar
```tsx
<ProgressBar value={60} max={100} color="var(--accent)" />
```

### ImageUploadButton
Завантаження фото на Cloudinary.
```tsx
<ImageUploadButton onUpload={(url) => setPhotoUrl(url)} />
```
Разом з `uploadToCloudinary` з `@/shared/services/cloudinary`.

### Toast / useUiStore().showToast
```tsx
const { showToast } = useUiStore()
showToast('Збережено', 'success')   // 'success' | 'error' | 'info'
```
**Не створювати власні toast** — тільки через `showToast`.

### PaywallGate / UpgradePrompt
Feature gates для білінгу.
```tsx
// Wrapper — ховає children якщо фіча недоступна
<PaywallGate feature="aiChat">
  <AiButton />
</PaywallGate>

// Inline промпт (compact для маленьких місць)
<UpgradePrompt feature="advancedFinance" compact />
```
Пов'язані з `usePlan()` і `useCanUseFeature()` хуками з `client/src/config/plans.ts`.

### TimeWheelPicker
iOS-style scroll-колесо для вибору часу (HH:MM).
```tsx
<TimeWheelPicker value="09:00" onChange={setTime} />
```
Використовується в `DeadlineSheet` — не дублювати.

### DoodleIllustration
SVG ілюстрації досягнень. `variant` відповідає назві ачівки.
```tsx
<DoodleIllustration variant="first_memory" size={56} />
```

### MimirIcon / MimirFillIcon / MimirHint
Маскот MIMIR. `MimirHint` — контекстна підказка з позою і текстом.
```tsx
<MimirHint mode="wise" text="Криниця чекає..." />
```
Пов'язаний з `useMimirHint` / `useMimirAiHint` хуками.

### UnsplashPicker (`features/memories/components/memories/UnsplashPicker`)
Picker для обкладинок з Unsplash. Debounced пошук, 3×3 сітка, attribution overlay.
Використовується в `AddMemoryModal`, `EditMemoryModal`, `EditSpaceSheet`.
**Не в `shared/`** — живе в фічі `memories`, бо ще не досяг порогу 3+ фіч.

### AchievementUnlockedModal
Slide-down toast при розблокуванні ачівки (non-blocking, не fullscreen).

### VerificationBanner
Банер для незверифікованих email. Показується на всіх сторінках де є AppHeader.

### LegalDocModal
Рендерить Terms/Privacy документи в модальному вікні.

### Інше (ui/, недокументовані детально)
`Button`, `Card`, `Input`, `Badge`, `ErrorBoundary`, `PinLock`, `PasswordToggleButton`, `ProfileEditModal`, `PwaInstallBanner`, `WeatherSplash`, `FeedbackSheet`, `FabHint`, `AutoUnlockWatcher`, `MimirAchievementLayer` (глобальний overlay для achievement-діалогів Міміра, монтується в `App.tsx`), `IngredientIcon`, `UnitPicker` (рецепти).

---

## Layout компоненти (`shared/components/layout/`)

### AppHeader
Верхній хедер: лого MIMIR, офлайн-індикатор (пульсуючий бейдж), кнопка AI-чату, аватар юзера.
- Офлайн-індикатор — пульсуючий бейдж при `navigator.onLine === false`
- AI-кнопка — PaywallGate для `aiChat` фічі + requireVerified
- PWA update — пульсуюча крапка на аватарі при `uiStore.updateAvailable`

**Примітка про `uiStore.mimirMode`:** Dashboard читає `mimirMode` з uiStore для вибору тексту діалогів Міміра (`getMimirText(key, mimirMode)`). Три режими: `'dark'|'witty'|'wise'`. Зберігається в `uiStore` (localStorage `hud-ui`).

### ChangelogSheet (`features/profile/components/ChangelogSheet`)
Bottom sheet з журналом змін. Відкривається з `ProfileDrawer` при наявності оновлення PWA.
Дані: `shared/data/changelog.ts` — `CHANGELOG: ChangelogEntry[]` + `APP_VERSION`.
Кнопка "Встановити оновлення" → reload + зберігає `lastSeenVersion` в localStorage.
**Workflow:** перед кожним пушем дописати новий запис `{ version, date, notes[] }` в `changelog.ts`.

### ProfileDrawer
Slide-in panel from the left, triggered by the avatar in AppHeader.
- Порядок: Вигляд → Система → Модулі → **Близькі** → **Тариф** → Адмін (admin only) → **Акаунт** (внизу, шестерня)
- "Тариф" → `/profile?tab=plan` (підписка, ліміти)
- "Акаунт" → `/profile/account` (дані, юридичне, небезпечна зона)
- При `uiStore.updateAvailable` — рядок оновлення під Акаунтом → `ChangelogSheet`

### BottomNav
Нижня навігація. 3 стилі через `uiStore.navStyle`:
- **classic** — повна панель з підписами під всіма іконками
- **pill** — плаваюча, label тільки для активного item (розширюється в mini-pill)
- **hub** — плаваюча + центральна руна Ансуз → радіальне меню решти розділів

На `/profile` завжди повна панель незалежно від стилю.

---

## Shared Hooks (`shared/hooks/`)

| Хук | Призначення |
|-----|-------------|
| `useSwipeToDismiss(onClose, options)` | Bottom sheets — ОБОВ'ЯЗКОВО для всіх шитів, не писати власні touch listeners |
| `useModalHistory()` | Back button behavior для модалок |
| `useImageUpload()` | Upload flow + Cloudinary URL |
| `usePlan()` | Поточний план юзера (`free\|personal\|couple\|family`) |
| `usePwaInstall()` | PWA install prompt |
| `usePushSubscription()` | Web Push підписка |
| `useAuth()` | Зручний доступ до profileStore |
| `useWeather()` | Погода по місту профілю |
| `useMimirHint(context)` | Статична підказка Міміра по контексту |
| `useMimirAiHint(context)` | AI-підказка Міміра (SSE) |
| `useSwipeTabs(count)` | Свайп між табами |
| `useLongPress(callback)` | Long press gesture |
| `usePullToRefresh(callback)` | Pull-to-refresh gesture |

### useSwipeToDismiss — обов'язкові параметри
```tsx
const sheetRef = useSwipeToDismiss(onClose, {
  enabled: open,
  overlayRef,   // backdrop для opacity анімації
  bodyRef,      // скролабельний inner element якщо є
})
// Threshold 80px, damping 0.4, velocity check (delta>60 + velocity>0.5)
```

---

## Shared Services (`shared/services/`)

- **`api.ts`** — `authFetch()`: автоматичний JWT refresh (проактивний < 60с до expiry, singleton race prevention)
- **`billing.ts`** — `createBillingCheckout()` та інші billing API виклики (WayForPay checkout, план/ліміти)
- Cloudinary upload — `shared/utils/uploadToCloudinary.ts` (не `services/`), unsigned preset `mimirorg`
- Web Push — `shared/utils/pushManager.ts` + `shared/hooks/usePushSubscription.ts` (не `services/push.ts`)

---

## Правила

- Новий компонент в `shared/` тільки якщо він буде в 3+ фічах
- JSDoc перед кожним компонентом (опис пропсів перед `interface`)
- Семантичні SVG іконки замість emoji у всіх компонентах
- Якщо немає підходящої існуючої іконки — питати юзера, не вставляти emoji
