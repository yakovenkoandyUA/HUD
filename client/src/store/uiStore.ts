import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

export type Theme = 'retro' | 'warm' | 'japan'

interface UiState {
  toasts: Toast[]
  activeModal: string | null
  theme: Theme
  showToast: (message: string, type?: Toast['type']) => void
  dismissToast: (id: string) => void
  openModal: (name: string) => void
  closeModal: () => void
  setTheme: (theme: Theme) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      toasts: [],
      activeModal: null,
      theme: 'warm',

      showToast: (message, type = 'info') =>
        set((s) => {
          const id = crypto.randomUUID()
          setTimeout(() => s.dismissToast(id), 3000)
          return { toasts: [...s.toasts, { id, message, type }] }
        }),

      dismissToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      openModal: (name) => set({ activeModal: name }),
      closeModal: () => set({ activeModal: null }),

      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme)
        set({ theme })
      },
    }),
    {
      name: 'hud-ui',
      partialize: (s) => ({ theme: s.theme }),
    }
  )
)
