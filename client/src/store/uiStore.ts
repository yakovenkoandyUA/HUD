import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

export type Theme = 'velvet' | 'japan' | 'cyber' | 'noir' | 'pixel' | 'arctic'
export type NavStyle = 'classic' | 'pill' | 'hub'

export const DEFAULT_PINNED_SECTIONS = ['/', '/finance', '/sprint', '/watchlist']
export const NAV_STYLE_MAX_PINNED: Record<NavStyle, number> = { classic: 8, pill: 7, hub: 4 }

interface UiState {
  toasts: Toast[]
  activeModal: string | null
  theme: Theme
  navStyle: NavStyle
  pinnedSections: string[]
  updateAvailable: boolean
  showToast: (message: string, type?: Toast['type']) => void
  dismissToast: (id: string) => void
  openModal: (name: string) => void
  closeModal: () => void
  setTheme: (theme: Theme) => void
  setNavStyle: (style: NavStyle) => void
  setPinnedSections: (sections: string[]) => void
  setUpdateAvailable: (v: boolean) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      toasts: [],
      activeModal: null,
      theme: 'velvet',
      navStyle: 'hub',
      pinnedSections: DEFAULT_PINNED_SECTIONS,
      updateAvailable: false,

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

      setNavStyle: (navStyle) => set({ navStyle }),
      setPinnedSections: (pinnedSections) => set({ pinnedSections }),

      setUpdateAvailable: (v) => set({ updateAvailable: v }),
    }),
    {
      name: 'hud-ui',
      partialize: (s) => ({ theme: s.theme, navStyle: s.navStyle, pinnedSections: s.pinnedSections }),
    }
  )
)
