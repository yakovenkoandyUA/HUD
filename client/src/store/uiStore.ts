import { create } from 'zustand'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

export interface WeatherData {
  temp: number
  code: number
  city: string
}

interface UiState {
  toasts: Toast[]
  activeModal: string | null
  weather: WeatherData | null
  showToast: (message: string, type?: Toast['type']) => void
  dismissToast: (id: string) => void
  openModal: (name: string) => void
  closeModal: () => void
  setWeather: (data: WeatherData) => void
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  activeModal: null,
  weather: null,

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
  setWeather: (data) => set({ weather: data }),
}))
