import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

export type Theme = 'aurum' | 'mimir' | 'cyber' | 'noir' | 'pixel' | 'arctic'
export type NavStyle = 'classic' | 'pill' | 'hub'
export type NavLabelMode = 'always' | 'active' | 'never'
export type MimirMode = 'wise' | 'witty' | 'dark'
export type MimirFrequency = 'active' | 'balanced' | 'silent'

export const DEFAULT_PINNED_SECTIONS = ['/', '/finance', '/sprint', '/watchlist']
export const DEFAULT_PINNED_PROFILE_TABS = ['me', 'wallet', 'plan', 'timeline']
export const NAV_STYLE_MAX_PINNED: Record<NavStyle, number> = { classic: 8, pill: 7, hub: 4 }

interface UiState {
  toasts: Toast[]
  activeModal: string | null
  modalDepth: number
  pushModal: () => void
  popModal: () => void
  theme: Theme
  navStyle: NavStyle
  navLabelMode: NavLabelMode
  pinnedSections: string[]
  pinnedProfileTabs: string[]
  updateAvailable: boolean
  mimirMode: MimirMode
  setMimirMode: (mode: MimirMode) => void
  mimirFrequency: MimirFrequency
  setMimirFrequency: (freq: MimirFrequency) => void
  showToast: (message: string, type?: Toast['type']) => void
  dismissToast: (id: string) => void
  openModal: (name: string) => void
  closeModal: () => void
  setTheme: (theme: Theme) => void
  setNavStyle: (style: NavStyle) => void
  setNavLabelMode: (mode: NavLabelMode) => void
  setPinnedSections: (sections: string[]) => void
  setPinnedProfileTabs: (tabs: string[]) => void
  setUpdateAvailable: (v: boolean) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      toasts: [],
      activeModal: null,
      modalDepth: 0,
      pushModal: () => set((s) => ({ modalDepth: s.modalDepth + 1 })),
      popModal: () => set((s) => ({ modalDepth: Math.max(0, s.modalDepth - 1) })),
      theme: 'aurum',
      navStyle: 'classic',
      navLabelMode: 'always',
      pinnedSections: DEFAULT_PINNED_SECTIONS,
      pinnedProfileTabs: DEFAULT_PINNED_PROFILE_TABS,
      updateAvailable: false,
      mimirMode: 'wise',
      setMimirMode: (mimirMode) => set({ mimirMode }),
      mimirFrequency: 'balanced',
      setMimirFrequency: (mimirFrequency) => set({ mimirFrequency }),

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
      setNavLabelMode: (navLabelMode) => set({ navLabelMode }),
      setPinnedSections: (pinnedSections) => set({ pinnedSections }),
      setPinnedProfileTabs: (pinnedProfileTabs) => set({ pinnedProfileTabs }),

      setUpdateAvailable: (v) => set({ updateAvailable: v }),
    }),
    {
      name: 'hud-ui',
      version: 3,
      migrate: (persisted: unknown, version: number) => {
        const s = persisted as Partial<Omit<UiState, 'theme'>> & { theme?: string }
        // v0→v1: pill was experimental default; reset to classic
        if (version < 1 && s.navStyle === 'pill') s.navStyle = 'classic'
        // v1→v2: japan renamed to mimir
        if (s.theme === 'japan') s.theme = 'mimir' as Theme
        // v2→v3: velvet renamed to aurum
        if (s.theme === 'velvet') s.theme = 'aurum' as Theme
        return s as UiState
      },
      partialize: (s) => ({ theme: s.theme, navStyle: s.navStyle, navLabelMode: s.navLabelMode, pinnedSections: s.pinnedSections, pinnedProfileTabs: s.pinnedProfileTabs, mimirMode: s.mimirMode, mimirFrequency: s.mimirFrequency }),
    }
  )
)
