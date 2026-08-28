# Shared Stores — MIMIR

> Zustand stores в `shared/store/` — ті що імпортуються у 5+ різних фічах. Всі інші stores живуть у відповідних `features/[name]/store/`.

## profileStore

```ts
// persist: 'profile-storage' (localStorage)
interface ProfileState {
  profile: UserProfile | null
  accessToken: string | null
  isLoading: boolean
  // actions
  setProfile(p: UserProfile | null): void
  setToken(token: string | null): void
  fetchProfile(): Promise<void>
  updateProfile(data: Partial<UserProfile>): Promise<void>
  logout(): void
  verifyPIN(pin: string): Promise<boolean>
  setPIN(pin: string): Promise<void>
  removePIN(): Promise<void>
  pinLocked: boolean        // НЕ персистується
  setPinLocked(v: boolean): void
}
```

**Password reset actions:** `requestPasswordReset(email)` — POST `/api/auth/forgot-password`. `resetPasswordWithToken(token, newPassword)` — POST `/api/auth/reset-password`, автологінить (set token+activeProfile) при успіху.

**UserProfile ключові поля:**
- `f1Enabled: boolean` — показ F1 фіч (BottomNav іконка, HeroCard F1 блок, `/f1`)
- `isVerified: boolean` — верифікований email (gate для AI-фіч)
- `onboardingCompleted: boolean` — пройдений onboarding (redirect /onboarding якщо false)
- `plan: 'free'|'personal'|'couple'|'family'` — власний тарифний план (billing)
- `subscriptionStatus: 'active'|'past_due'|'cancelled'|'trialing'|null`
- `effectivePlan`/`planSource: 'own'|'group'`/`planPayerName` — реальний план з урахуванням Plan Group (Duo/Group shared payer): якщо юзер в чиїйсь групі й план payer'а вищий за власний — `effectivePlan` = план payer'а. `usePlan()` хук читає `effectivePlan`, не `plan` напряму. Керування групою — `features/profile/store/planGroupStore.ts` (не shared, лише PlanTab)
- `accountStatus: 'active'|'deletion_requested'|'deleted'`
- `salaryDay: number` — день поповнення (для Finance)
- `city: string` — місто (для погоди і геолокації за замовчанням)
- `role: 'admin'|'user'`

**PIN lock flow:**
- `pinLocked` не зберігається — при кожному `window.load` встановлюється `true` якщо є PIN
- Перевіряється через `sessionStorage['hud-pin-session']`
- Після 5 хв неактивності — знову lock
- `verifyPIN` використовує `authFetch` (автоматичний refresh токена)

---

## uiStore

```ts
// persist: 'hud-ui' (localStorage), version 4 + міграції
interface UiState {
  theme: 'aurum'|'vellum'|'cyber'|'noir'|'pixel'|'arctic'
  navStyle: 'classic'|'pill'|'hub'
  navLabelMode: 'always'|'active'|'never'
  pinnedSections: string[]
  pinnedProfileTabs: string[]
  mimirMode: 'wise'|'witty'|'dark'
  mimirFrequency: 'active'|'balanced'|'silent'
  updateAvailable: boolean
  toasts: Toast[]              // масив, не одиночний об'єкт
  activeModal: string | null
  modalDepth: number
  aiChatOpen: boolean
  aiChatSuggestions: string[] | null
  // actions
  openAiChat(suggestions?: string[]): void
  closeAiChat(): void
  setTheme(theme): void
  setNavStyle(style): void
  setNavLabelMode(mode): void
  setPinnedSections(ids: string[]): void
  setPinnedProfileTabs(ids: string[]): void
  setMimirMode(mode): void
  setMimirFrequency(freq): void
  showToast(message: string, type: 'success'|'error'|'info'): void
  dismissToast(id: string): void
  setUpdateAvailable(v: boolean): void
  pushModal(id: string): void
  popModal(): void
  openModal(id: string): void
  closeModal(): void
}
```

- `updateAvailable` — встановлюється через `controllerchange` event Service Worker. Показує пульсуючу крапку на аватарі в AppHeader і банер в ProfilePage → МЯ таб
- `theme` — пишеться як `data-theme` атрибут на `<html>` в App.tsx. **Історія перейменувань:** `japan→mimir` (v1→v2), `velvet→aurum` (v2→v3), `mimir→vellum` (v3→v4) — усі три міграції в persist `migrate()`
- `toasts` — масив, кожен toast має свій `id` і auto-dismiss через 3с (`dismissToast(id)`), не одиночний об'єкт
- `mimirMode`/`mimirFrequency` — характер і частота підказок Міміра (Профіль → Вигляд)
- `pinnedSections`/`pinnedProfileTabs` — закріплені розділи дашборду / вкладки профілю (дефолти: `DEFAULT_PINNED_SECTIONS`/`DEFAULT_PINNED_PROFILE_TABS`)
- `activeModal`/`modalDepth` + `pushModal`/`popModal`/`openModal`/`closeModal` — стек модалок для коректної поведінки back-button (`useModalHistory`)
- `aiChatOpen`/`aiChatSuggestions` + `openAiChat(suggestions?)`/`closeAiChat()` — глобальний стан AI-чату (`AiChatSheet`), змонтованого один раз в `AppHeader`. Не персистується. `AppHeader` сам підставляє контекстні suggestions за поточним роутом (напр. фінансові приклади питань на `/finance`) замість дефолтних із `AiChatSheet`

---

## familyStore

```ts
// persist: НЕ персистується
interface FamilyState {
  accepted: FamilyMember[]
  pendingSent: FamilyLink[]
  pendingReceived: FamilyLink[]
  isLoading: boolean
  // actions
  fetchFamily(): Promise<void>
  sendRequest(recipientId: string): Promise<void>
  acceptRequest(linkId: string): Promise<void>
  removeLink(linkId: string): Promise<void>
  searchUsers(q: string): Promise<UserSearchResult[]>
}
```

`accepted` — масив прийнятих сімейних членів. Використовується в:
- `MemoryMap` / `AddMemoryModal` — секція "З КИМ"
- `PlanForm` — секція "З КИМ"
- `WatchlistDetail` — checkboxes "ДИВИЛИСЬ РАЗОМ"
- `MemoryCard` — micro-аватари
- `MemoryDetail` — секція "З КИМ"
- `features/spaces/index.tsx` — member management

---

## achievementsStore

```ts
// persist: 'achievements-storage' (localStorage)
interface AchievementsState {
  unlockedIds: string[]
  unlock(id: string): void
  isUnlocked(id: string): boolean
}
```

Ачівки розраховуються на фронтенді через `useAchievementProgress` хук (зчитує дані з різних stores). Бекенд їх **не зберігає** — тільки localStorage.

`AchievementUnlockedModal` — slide-down toast при першому `unlock(id)`. Перевірка нових ачівок відбувається в `App.tsx` при кожному mount і через підписку на зміни stores.

---

---

## memoriesStore (`features/memories/store/memoriesStore.ts`)

```ts
// persist: НЕ персистується
interface MemoriesState {
  memories: Memory[]
  isLoading: boolean
  _deletingIds: Set<string>   // ← race-condition guard
  // actions
  fetchMemories(): Promise<void>
  addMemory(m: Omit<Memory, 'id' | 'createdAt' | 'userId'>): Promise<string>
  updateMemory(id: string, updates: Partial<...>): Promise<void>
  deleteMemory(id: string): Promise<void>
  addPhoto(memoryId, photo): Promise<void>
  deletePhoto(memoryId, photoId): Promise<void>
  setCover(memoryId, photoUrl): Promise<void>
  updatePhoto(memoryId, photoId, updates): Promise<void>
  fetchRelated(memoryId): Promise<Memory[]>
}
```

**`_deletingIds` — race condition guard:**
Коли `deleteMemory` викликається і потім одразу стартує `fetchMemories`, новий fetch може повернути ще-не-видалений елемент з бекенду (реплікаційна затримка або повільна відповідь).
`_deletingIds: Set<string>` містить id елементів що знаходяться в процесі DELETE. `fetchMemories` фільтрує результати через `filter(m => !deletingIds.has(m.id))`. Після завершення DELETE (в `finally`) id видаляється з Set.
Шаблон:
```ts
deleteMemory: async (id) => {
  set(s => ({ memories: s.memories.filter(m => m.id !== id), _deletingIds: new Set([...s._deletingIds, id]) }))
  try { await authFetch(`/api/memories/${id}`, { method: 'DELETE' }) }
  finally { set(s => { const ids = new Set(s._deletingIds); ids.delete(id); return { _deletingIds: ids } }) }
}
```

---

## financeStore (`features/finance/store/financeStore.ts`)

```ts
// persist: sessionStorage 'hud-finance-v1' (тільки дефолтний запит без фільтру)
interface FinanceState {
  balance: number
  transactions: Transaction[]
  syncStatus: 'local' | 'syncing' | 'synced' | 'error'
  // actions
  fetchTransactions(month?: string): Promise<void>
  addTopup(amount, desc, incomeCategory?, spaceId?): void
  addExpense(amount, desc, category?, tripMemoryId?, spaceId?, subcategory?, date?): void
  deleteTransaction(id): void
  renameTransaction(id, title): void
  patchTransaction(id, patch): void
  tagTripExpenses(ids, tripMemoryId): void
  setSyncStatus(s): void
}
```

- Optimistic updates для всіх мутацій: UI оновлюється одразу, потім синхронізується з бекендом
- Транзакції кешуються в `sessionStorage` (max 200 записів у пам'яті)
- `fetchTransactions(month)` — якщо передано місяць, кеш НЕ оновлюється (фільтрований результат)
- `tagTripExpenses` — bulk PATCH: optimistic update + паралельний PATCH для кожного id (fire-and-forget з `.catch(() => {})`)

---

## recurringPaymentStore (`features/finance/store/recurringPaymentStore.ts`)

```ts
// persist: sessionStorage 'hud-recurring-v1', TTL 5хв
interface RecurringPaymentState {
  payments: RecurringPayment[]
  loading: boolean
  fetchPayments(): Promise<void>
  setPayments(payments): void
  updatePayment(id, patch): void
}
```

Винесено з `RecurringPayments` компонента (раніше тримав список локально) — потрібен був спільний доступ для `BalanceHero` (прогноз до зарплати враховує заплановані платежі, `calcSalaryForecast()` в `finance/utils/finance.ts`).

---

## Правила

- Для нового store в `shared/` — тільки якщо він потрібен у 5+ різних фічах
- Persist: явно вказувати які поля персистуються (`partialize`)
- `pinLocked` — НІКОЛИ не персистувати (безпека)
- Cross-feature дані (сімейні члени, план юзера) — читати через shared stores, не дублювати в feature stores
- Feature stores завжди в `features/[name]/store/` (financeStore, spacesStore, vehicleStore тощо)
