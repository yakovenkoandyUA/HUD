import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { uploadToCloudinary } from '@/shared/utils/uploadToCloudinary'
import { useSprintStore } from '@/features/sprint/store/sprintStore'
import { saveRefreshToken, clearRefreshToken, authFetch } from '@/shared/services/api'

const BASE_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').trim()

/**
 * profileStore
 * ------------
 * Auth + профіль. JWT-based з email+password.
 * Зберігає token, activeProfile та pinLocked стан.
 *
 * Persist key: 'profile-storage' (token + activeProfile).
 */

export type PlanId = 'free' | 'personal' | 'couple' | 'family'
export type SubscriptionStatus = 'none' | 'trialing' | 'active' | 'past_due' | 'canceled'

export interface Profile {
  id: string
  name: string
  username: string
  email?: string
  avatarUrl: string | null
  role: 'admin' | 'user'
  f1Enabled: boolean
  salaryDay: number
  monthlySpendLimit: number | null
  city: string
  morningStart: number
  afternoonStart: number
  eveningStart: number
  hasPIN: boolean
  isVerified: boolean
  reportStyle: string
  mediaEnabledTabs: string[]
  unlockedAchievements: { id: string; unlockedAt: string }[]
  sprintTutorialSeen: boolean
  weekdayLongPressTutorialSeen: boolean
  swipeDismissTutorialSeen: boolean
  sprintTutorialShownCount: number
  weekdayLongPressShownCount: number
  swipeDismissShownCount: number
  onboardingCompleted: boolean
  mimirSeenHints: string[]
  plan?: PlanId
  subscriptionStatus?: SubscriptionStatus
}

interface ProfileState {
  profiles: Profile[]
  activeProfile: Profile | null
  token: string | null
  pinLocked: boolean

  fetchProfiles: () => Promise<void>
  refreshProfile: () => Promise<void>
  loginWithEmail: (username: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string, username: string) => Promise<void>
  selectProfile: (username: string) => Promise<void>
  logout: () => void
  uploadAvatar: (file: File) => Promise<void>
  updateProfile: (patch: { name?: string; avatarUrl?: string; f1Enabled?: boolean; salaryDay?: number; monthlySpendLimit?: number | null; username?: string; city?: string; morningStart?: number; afternoonStart?: number; eveningStart?: number; reportStyle?: string; mediaEnabledTabs?: string[]; unlockedAchievements?: { id: string; unlockedAt: string }[]; sprintTutorialSeen?: boolean; weekdayLongPressTutorialSeen?: boolean; swipeDismissTutorialSeen?: boolean; sprintTutorialShownCount?: number; weekdayLongPressShownCount?: number; swipeDismissShownCount?: number; onboardingCompleted?: boolean; mimirSeenHints?: string[] }) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  setPIN: (pin: string) => Promise<void>
  removePIN: () => Promise<void>
  verifyPIN: (pin: string) => Promise<boolean>
  lockWithPIN: () => void
  unlockPIN: () => void
  verifyEmailToken: (token: string) => Promise<void>
  resendVerification: () => Promise<void>
}

async function apiPost(path: string, body: unknown, token?: string | null) {
  if (!BASE_URL) throw new Error('API not configured')
  return fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
}

async function apiPatch(path: string, body: unknown, token: string) {
  if (!BASE_URL) throw new Error('API not configured')
  return fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
}

async function apiDelete(path: string, token: string) {
  if (!BASE_URL) throw new Error('API not configured')
  return fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfile: null,
      token: null,
      pinLocked: false,

      fetchProfiles: async () => {
        if (!BASE_URL) return
        try {
          const res = await fetch(`${BASE_URL}/api/auth/profiles`)
          if (!res.ok) return
          const profiles = await res.json() as Profile[]
          const { activeProfile } = get()
          // Merge server data with persisted profile — keep hasPIN/email which aren't in public list
          const serverProfile = activeProfile
            ? profiles.find(p => p.id === activeProfile.id)
            : null
          const freshActive = activeProfile
            ? (serverProfile ? { ...activeProfile, ...serverProfile, hasPIN: activeProfile.hasPIN } : activeProfile)
            : null
          set({ profiles, activeProfile: freshActive })
        } catch { /* offline — use cached */ }
      },

      refreshProfile: async () => {
        const { token, activeProfile } = get()
        if (!token || !activeProfile) return
        try {
          const res = await authFetch('/api/auth/me')
          if (!res.ok) return
          const fresh = await res.json() as Profile
          set({ activeProfile: { ...activeProfile, ...fresh, hasPIN: activeProfile.hasPIN } })
        } catch { /* offline — keep cached */ }
      },

      loginWithEmail: async (username: string, password: string) => {
        const res = await apiPost('/api/auth/login', { username, password })
        if (!res.ok) {
          const data = await res.json() as { error?: string }
          throw new Error(data.error ?? 'Помилка входу')
        }
        const { token, user, refreshToken } = await res.json() as { token: string; user: Profile; refreshToken?: string }
        if (refreshToken) saveRefreshToken(refreshToken)
        useSprintStore.getState().clearItems()
        set({ token, activeProfile: user, pinLocked: false })
      },

      register: async (email: string, password: string, name: string, username: string) => {
        const res = await apiPost('/api/auth/register', { email, password, name, username })
        if (!res.ok) {
          const data = await res.json() as { error?: string }
          throw new Error(data.error ?? 'Помилка реєстрації')
        }
        const { token, user, refreshToken } = await res.json() as { token: string; user: Profile; refreshToken?: string }
        if (refreshToken) saveRefreshToken(refreshToken)
        useSprintStore.getState().clearItems()
        set({ token, activeProfile: user, pinLocked: false })
      },

      selectProfile: async (username: string) => {
        if (!BASE_URL) throw new Error('API not configured')
        const res = await fetch(`${BASE_URL}/api/auth/select`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username }),
        })
        if (!res.ok) throw new Error('Failed to select profile')
        const { token, user, refreshToken } = await res.json() as { token: string; user: Profile; refreshToken?: string }
        if (refreshToken) saveRefreshToken(refreshToken)
        useSprintStore.getState().clearItems()
        set({ token, activeProfile: user, pinLocked: false })
      },

      logout: () => {
        const { token } = get()
        clearRefreshToken()
        if (BASE_URL) {
          fetch(`${BASE_URL}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }).catch(() => {})
        }
        set({ token: null, activeProfile: null, pinLocked: false })
      },

      uploadAvatar: async (file: File) => {
        const url = await uploadToCloudinary(file, 'mimir/avatars')
        await get().updateProfile({ avatarUrl: url })
      },

      updateProfile: async (patch: { name?: string; avatarUrl?: string; f1Enabled?: boolean; salaryDay?: number; monthlySpendLimit?: number | null; username?: string; city?: string; morningStart?: number; afternoonStart?: number; eveningStart?: number; reportStyle?: string; mediaEnabledTabs?: string[]; unlockedAchievements?: { id: string; unlockedAt: string }[]; sprintTutorialSeen?: boolean; weekdayLongPressTutorialSeen?: boolean; swipeDismissTutorialSeen?: boolean; sprintTutorialShownCount?: number; weekdayLongPressShownCount?: number; swipeDismissShownCount?: number; onboardingCompleted?: boolean; mimirSeenHints?: string[] }) => {
        const { token, activeProfile } = get()
        if (!activeProfile) return

        if (BASE_URL && token) {
          const res = await apiPatch('/api/auth/me', patch, token)
          if (!res.ok) {
            const data = await res.json() as { error?: string }
            throw new Error(data.error ?? 'Failed to update profile')
          }
        }

        const updated = { ...activeProfile, ...patch }
        set({
          activeProfile: updated,
          profiles: get().profiles.map(p =>
            p.username === activeProfile.username ? { ...p, ...patch } : p
          ),
        })
      },

      changePassword: async (currentPassword: string, newPassword: string) => {
        const { token } = get()
        if (!token) throw new Error('Not authenticated')
        const res = await apiPost('/api/auth/change-password', { currentPassword, newPassword }, token)
        if (!res.ok) {
          const data = await res.json() as { error?: string }
          throw new Error(data.error ?? 'Failed to change password')
        }
      },

      setPIN: async (pin: string) => {
        const { token, activeProfile } = get()
        if (!token || !activeProfile) throw new Error('Not authenticated')
        const res = await apiPatch('/api/auth/pin', { pin }, token)
        if (!res.ok) {
          const data = await res.json() as { error?: string }
          throw new Error(data.error ?? 'Помилка збереження PIN')
        }
        set({ activeProfile: { ...activeProfile, hasPIN: true } })
      },

      removePIN: async () => {
        const { token, activeProfile } = get()
        if (!token || !activeProfile) throw new Error('Not authenticated')
        const res = await apiDelete('/api/auth/pin', token)
        if (!res.ok) throw new Error('Помилка видалення PIN')
        set({ activeProfile: { ...activeProfile, hasPIN: false }, pinLocked: false })
      },

      verifyPIN: async (pin: string) => {
        try {
          // authFetch handles expired token: refreshes automatically, retries once.
          // A 401 here means the refresh also failed (logout triggered) or truly wrong PIN.
          const res = await authFetch('/api/auth/pin/verify', {
            method: 'POST',
            body: JSON.stringify({ pin }),
          })
          if (res.ok) return true
          if (res.status === 401) return false
          throw new Error('network')
        } catch (err) {
          if (err instanceof Error && err.message !== 'network') throw err
          throw new Error('network')
        }
      },

      lockWithPIN: () => {
        const { activeProfile } = get()
        if (activeProfile?.hasPIN) set({ pinLocked: true })
      },

      unlockPIN: () => {
        sessionStorage.setItem('hud-pin-session', '1')
        set({ pinLocked: false })
      },

      verifyEmailToken: async (token: string) => {
        const res = await apiPost('/api/auth/verify-email', { token })
        if (!res.ok) {
          const data = await res.json() as { error?: string }
          throw new Error(data.error ?? 'Помилка верифікації')
        }
        const { token: accessToken, user, refreshToken } = await res.json() as { token: string; user: Profile; refreshToken?: string }
        if (refreshToken) saveRefreshToken(refreshToken)
        set({ token: accessToken, activeProfile: user, pinLocked: false })
      },

      resendVerification: async () => {
        const { token } = get()
        if (!token) throw new Error('Not authenticated')
        const res = await apiPost('/api/auth/resend-verification', {}, token)
        if (!res.ok) {
          const data = await res.json() as { error?: string }
          throw new Error(data.error ?? 'Помилка відправки')
        }
      },
    }),
    {
      name: 'profile-storage',
      partialize: (s) => ({ token: s.token, activeProfile: s.activeProfile, profiles: s.profiles }),
    }
  )
)
