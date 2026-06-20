import { create } from 'zustand'
import { authFetch, getToken } from '../services/api'
import type { Memory, MemoryPhoto } from '../types/memory'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPhoto(p: Record<string, any>): MemoryPhoto {
  return {
    id:        p._id,
    url:       p.url,
    caption:   p.caption ?? undefined,
    createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date(p.createdAt).toISOString(),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toMemory(d: Record<string, any>): Memory {
  return {
    id:             d._id,
    title:          d.title,
    location:       d.location || undefined,
    lat:            d.lat ?? null,
    lng:            d.lng ?? null,
    date:           d.date,
    coverUrl:       d.coverUrl ?? '',
    notes:          d.notes ?? '',
    tags:           d.tags ?? [],
    photos:         (d.photos ?? []).map(toPhoto),
    createdAt:      typeof d.createdAt === 'string' ? d.createdAt : new Date(d.createdAt).toISOString(),
    ownerName:      d.ownerName ?? undefined,
    ownerAvatarUrl: d.ownerAvatarUrl ?? undefined,
  }
}

/**
 * memoriesStore
 * -------------
 * Zustand store для сторінки Спогади — backend-backed через /api/memories.
 */
interface MemoriesState {
  memories: Memory[]
  fetchMemories: () => Promise<void>
  addMemory: (memory: Omit<Memory, 'id' | 'createdAt'>) => Promise<string>
  updateMemory: (id: string, updates: Partial<Omit<Memory, 'id' | 'createdAt'>>) => Promise<void>
  deleteMemory: (id: string) => Promise<void>
  addPhoto: (memoryId: string, photo: Omit<MemoryPhoto, 'id' | 'createdAt'>) => Promise<void>
  deletePhoto: (memoryId: string, photoId: string) => Promise<void>
  setCover: (memoryId: string, photoUrl: string) => Promise<void>
  updatePhoto: (memoryId: string, photoId: string, updates: Partial<MemoryPhoto>) => Promise<void>
}

export const useMemoriesStore = create<MemoriesState>()((set) => ({
  memories: [],

  fetchMemories: async () => {
    if (!getToken()) return
    const res = await authFetch('/api/memories')
    if (!res.ok) return
    const data = await res.json()
    set({ memories: data.map(toMemory) })
  },

  addMemory: async (memory) => {
    const res = await authFetch('/api/memories', {
      method: 'POST',
      body: JSON.stringify(memory),
    })
    if (!res.ok) throw new Error('Failed to create memory')
    const item = await res.json()
    const m = toMemory(item)
    set(s => ({ memories: [m, ...s.memories] }))
    return m.id
  },

  updateMemory: async (id, updates) => {
    set(s => ({
      memories: s.memories.map(m => m.id === id ? { ...m, ...updates } : m),
    }))
    await authFetch(`/api/memories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  },

  deleteMemory: async (id) => {
    set(s => ({ memories: s.memories.filter(m => m.id !== id) }))
    await authFetch(`/api/memories/${id}`, { method: 'DELETE' })
  },

  addPhoto: async (memoryId, photo) => {
    const tempPhoto: MemoryPhoto = {
      ...photo,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    set(s => ({
      memories: s.memories.map(m =>
        m.id === memoryId ? { ...m, photos: [...m.photos, tempPhoto] } : m
      ),
    }))
    const res = await authFetch(`/api/memories/${memoryId}/photos`, {
      method: 'POST',
      body: JSON.stringify(photo),
    })
    if (res.ok) {
      const updated = await res.json()
      set(s => ({
        memories: s.memories.map(m => m.id === memoryId ? toMemory(updated) : m),
      }))
    }
  },

  deletePhoto: async (memoryId, photoId) => {
    set(s => ({
      memories: s.memories.map(m =>
        m.id === memoryId
          ? { ...m, photos: m.photos.filter(p => p.id !== photoId) }
          : m
      ),
    }))
    await authFetch(`/api/memories/${memoryId}/photos/${photoId}`, { method: 'DELETE' })
  },

  setCover: async (memoryId, photoUrl) => {
    set(s => ({
      memories: s.memories.map(m =>
        m.id === memoryId ? { ...m, coverUrl: photoUrl } : m
      ),
    }))
    await authFetch(`/api/memories/${memoryId}`, {
      method: 'PATCH',
      body: JSON.stringify({ coverUrl: photoUrl }),
    })
  },

  updatePhoto: async (memoryId, photoId, updates) => {
    set(s => ({
      memories: s.memories.map(m =>
        m.id === memoryId
          ? { ...m, photos: m.photos.map(p => p.id === photoId ? { ...p, ...updates } : p) }
          : m
      ),
    }))
    await authFetch(`/api/memories/${memoryId}/photos/${photoId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  },
}))
