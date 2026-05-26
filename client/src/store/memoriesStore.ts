import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Memory, MemoryPhoto } from '../types/memory'

/**
 * memoriesStore
 * -------------
 * Zustand store для сторінки Спогади.
 * Зберігається в localStorage через persist.
 */
interface MemoriesState {
  memories: Memory[]
  addMemory: (memory: Omit<Memory, 'id' | 'createdAt'>) => string
  updateMemory: (id: string, updates: Partial<Omit<Memory, 'id' | 'createdAt'>>) => void
  deleteMemory: (id: string) => void
  addPhoto: (memoryId: string, photo: Omit<MemoryPhoto, 'id' | 'createdAt'>) => void
  deletePhoto: (memoryId: string, photoId: string) => void
  setCover: (memoryId: string, photoUrl: string) => void
  updatePhoto: (memoryId: string, photoId: string, updates: Partial<MemoryPhoto>) => void
}

export const useMemoriesStore = create<MemoriesState>()(
  persist(
    (set) => ({
      memories: [],

      addMemory: (memory) => {
        const id = crypto.randomUUID()
        set(s => ({
          memories: [
            { ...memory, id, createdAt: new Date().toISOString() },
            ...s.memories,
          ],
        }))
        return id
      },

      updateMemory: (id, updates) => {
        set(s => ({
          memories: s.memories.map(m => m.id === id ? { ...m, ...updates } : m),
        }))
      },

      deleteMemory: (id) => {
        set(s => ({ memories: s.memories.filter(m => m.id !== id) }))
      },

      addPhoto: (memoryId, photo) => {
        const newPhoto: MemoryPhoto = {
          ...photo,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        }
        set(s => ({
          memories: s.memories.map(m =>
            m.id === memoryId ? { ...m, photos: [...m.photos, newPhoto] } : m
          ),
        }))
      },

      deletePhoto: (memoryId, photoId) => {
        set(s => ({
          memories: s.memories.map(m =>
            m.id === memoryId
              ? { ...m, photos: m.photos.filter(p => p.id !== photoId) }
              : m
          ),
        }))
      },

      setCover: (memoryId, photoUrl) => {
        set(s => ({
          memories: s.memories.map(m =>
            m.id === memoryId ? { ...m, coverUrl: photoUrl } : m
          ),
        }))
      },

      updatePhoto: (memoryId, photoId, updates) => {
        set(s => ({
          memories: s.memories.map(m =>
            m.id === memoryId
              ? { ...m, photos: m.photos.map(p => p.id === photoId ? { ...p, ...updates } : p) }
              : m
          ),
        }))
      },
    }),
    { name: 'memories-storage' }
  )
)
