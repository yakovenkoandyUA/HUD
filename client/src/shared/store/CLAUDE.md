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

**UserProfile ключові поля:**
- `f1Enabled: boolean` — показ F1 фіч (BottomNav іконка, HeroCard F1 блок, `/f1`)
- `isVerified: boolean` — верифікований email (gate для AI-фіч)
- `onboardingCompleted: boolean` — пройдений onboarding (redirect /onboarding якщо false)
- `plan: 'free'|'personal'|'couple'|'family'` — тарифний план (billing)
- `subscriptionStatus: 'active'|'past_due'|'cancelled'|'trialing'|null`
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
// persist: 'hud-ui' (localStorage)
interface UiState {
  theme: 'velvet'|'japan'|'cyber'|'noir'|'pixel'|'arctic'
  navStyle: 'classic'|'pill'|'hub'
  updateAvailable: boolean
  // toast
  toast: { message: string; type: 'success'|'error'|'info' } | null
  // actions
  setTheme(theme): void
  setNavStyle(style): void
  showToast(message: string, type: 'success'|'error'|'info'): void
  setUpdateAvailable(v: boolean): void
}
```

- `updateAvailable` — встановлюється через `controllerchange` event Service Worker. Показує пульсуючу крапку на аватарі в AppHeader і банер в ProfilePage → МЯ таб
- `theme` — пишеться як `data-theme` атрибут на `<html>` в App.tsx
- Toast auto-dismiss після 3с

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
- `SpacesStore` — member management

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

## Правила

- Для нового store в `shared/` — тільки якщо він потрібен у 5+ різних фічах
- Persist: явно вказувати які поля персистуються (`partialize`)
- `pinLocked` — НІКОЛИ не персистувати (безпека)
- Cross-feature дані (сімейні члени, план юзера) — читати через shared stores, не дублювати в feature stores
- Feature stores завжди в `features/[name]/store/` (financeStore, spacesStore, vehicleStore тощо)
