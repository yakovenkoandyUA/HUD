import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { uploadToCloudinary } from '../utils/uploadToCloudinary'
import { useSprintStore } from './sprintStore'

const BASE_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').trim()

/**
 * profileStore
 * ------------
 * Мульти-профільна система. Зберігає список профілів, активний профіль і JWT.
 * Профіль вибирається без пароля — тап на аватар → JWT на 30 днів.
 *
 * Persist key: 'profile-storage' (token + activeProfile).
 */

export interface Profile {
  id: string
  name: string
  username: string
  avatarUrl: string | null
  role: 'admin' | 'user'
  f1Enabled: boolean
}

interface ProfileState {
  profiles: Profile[]
  activeProfile: Profile | null
  token: string | null

  fetchProfiles: () => Promise<void>
  selectProfile: (username: string) => Promise<void>
  logout: () => void
  uploadAvatar: (file: File) => Promise<void>
  updateProfile: (patch: { name?: string; avatarUrl?: string; f1Enabled?: boolean }) => Promise<void>
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfile: null,
      token: null,

      fetchProfiles: async () => {
        if (!BASE_URL) return
        try {
          const res = await fetch(`${BASE_URL}/api/auth/profiles`)
          if (!res.ok) return
          const profiles = await res.json() as Profile[]
          // Also refresh activeProfile so f1Enabled (and other new fields) are always in sync
          const { activeProfile } = get()
          const freshActive = activeProfile
            ? (profiles.find(p => p.id === activeProfile.id) ?? activeProfile)
            : null
          set({ profiles, activeProfile: freshActive })
        } catch { /* offline — use cached */ }
      },

      selectProfile: async (username: string) => {
        if (!BASE_URL) throw new Error('API not configured')
        const res = await fetch(`${BASE_URL}/api/auth/select`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username }),
        })
        if (!res.ok) throw new Error('Failed to select profile')
        const { token, user } = await res.json() as { token: string; user: Profile }
        useSprintStore.getState().clearItems()
        set({ token, activeProfile: user })
      },

      logout: () => {
        set({ token: null, activeProfile: null })
      },

      uploadAvatar: async (file: File) => {
        const url = await uploadToCloudinary(file, 'mimir/avatars')
        await get().updateProfile({ avatarUrl: url })
      },

      updateProfile: async (patch: { name?: string; avatarUrl?: string; f1Enabled?: boolean }) => {
        const { token, activeProfile } = get()
        if (!activeProfile) return

        if (BASE_URL && token) {
          const res = await fetch(`${BASE_URL}/api/auth/me`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(patch),
          })
          if (!res.ok) throw new Error('Failed to update profile')
        }

        const updated = { ...activeProfile, ...patch }
        set({
          activeProfile: updated,
          profiles: get().profiles.map(p =>
            p.username === activeProfile.username ? { ...p, ...patch } : p
          ),
        })
      },
    }),
    {
      name: 'profile-storage',
      partialize: (s) => ({ token: s.token, activeProfile: s.activeProfile, profiles: s.profiles }),
    }
  )
)
