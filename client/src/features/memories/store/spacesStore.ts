import { create } from 'zustand'
import { authFetch } from '@/shared/services/api'

export type SpaceType = 'personal' | 'shared' | 'trip' | 'family' | 'friends' | 'hobby' | 'sports' | 'project' | 'vehicle'

export interface SpaceMember {
  userId:    string
  role:      'owner' | 'member'
  name:      string
  username:  string
  avatarUrl: string | null
}

export interface VehicleProfile {
  make:               string
  model:              string
  year:               number | null
  plateNumber:        string
  vin:                string
  currentMileage:     number | null
  fuelType:           string
  purchaseDate:       string | null
  photoUrl:           string
  nextServiceMileage: number | null
}

export interface Space {
  id:             string
  name:           string
  type:           SpaceType
  color:          string
  emoji:          string
  coverUrl:       string
  ownerId:        string
  members:        SpaceMember[]
  vehicleProfile: VehicleProfile | null
  archived:       boolean
  createdAt:      string
}

export interface SpaceInput {
  name:      string
  type?:     SpaceType
  color?:    string
  emoji?:    string
  coverUrl?: string
  archived?: boolean
}

interface SpacesStore {
  spaces:        Space[]
  archivedSpaces: Space[]
  loading:       boolean
  fetchSpaces:   () => Promise<void>
  fetchArchived: () => Promise<void>
  createSpace:   (data: SpaceInput) => Promise<Space>
  updateSpace:   (id: string, changes: Partial<SpaceInput>) => Promise<void>
  archiveSpace:  (id: string) => Promise<void>
  unarchiveSpace:(id: string) => Promise<void>
  deleteSpace:   (id: string) => Promise<void>
  addMember:     (spaceId: string, username: string) => Promise<void>
  removeMember:  (spaceId: string, userId: string) => Promise<void>
}

export const useSpacesStore = create<SpacesStore>((set, get) => ({
  spaces:         [],
  archivedSpaces: [],
  loading:        false,

  fetchSpaces: async () => {
    set({ loading: true })
    try {
      const res = await authFetch('/api/spaces')
      if (!res.ok) throw new Error('fetch failed')
      const data: Space[] = await res.json()
      set({ spaces: data })
    } finally {
      set({ loading: false })
    }
  },

  fetchArchived: async () => {
    const res = await authFetch('/api/spaces?archived=true')
    if (!res.ok) return
    const data: Space[] = await res.json()
    set({ archivedSpaces: data })
  },

  createSpace: async (data) => {
    const res = await authFetch('/api/spaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Create failed')
    const space: Space = await res.json()
    set(s => ({ spaces: [space, ...s.spaces] }))
    return space
  },

  updateSpace: async (id, changes) => {
    const res = await authFetch(`/api/spaces/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    })
    if (!res.ok) return
    const updated: Space = await res.json()
    set(s => ({ spaces: s.spaces.map(sp => sp.id === id ? updated : sp) }))
  },

  archiveSpace: async (id) => {
    const res = await authFetch(`/api/spaces/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: true }),
    })
    if (!res.ok) return
    const archived: Space = await res.json()
    // optimistic: remove from active, add to archived list
    set(s => ({
      spaces:         s.spaces.filter(sp => sp.id !== id),
      archivedSpaces: [archived, ...s.archivedSpaces],
    }))
  },

  unarchiveSpace: async (id) => {
    const res = await authFetch(`/api/spaces/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: false }),
    })
    if (!res.ok) return
    const active: Space = await res.json()
    set(s => ({
      archivedSpaces: s.archivedSpaces.filter(sp => sp.id !== id),
      spaces:         [active, ...s.spaces],
    }))
  },

  deleteSpace: async (id) => {
    await authFetch(`/api/spaces/${id}`, { method: 'DELETE' })
    set(s => ({
      spaces:         s.spaces.filter(sp => sp.id !== id),
      archivedSpaces: s.archivedSpaces.filter(sp => sp.id !== id),
    }))
  },

  addMember: async (spaceId, username) => {
    const res = await authFetch(`/api/spaces/${spaceId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    })
    if (!res.ok) {
      const err = await res.json() as { error?: string }
      throw new Error(err.error ?? 'Failed')
    }
    const updated: Space = await res.json()
    set(s => ({ spaces: s.spaces.map(sp => sp.id === spaceId ? updated : sp) }))
  },

  removeMember: async (spaceId, userId) => {
    await authFetch(`/api/spaces/${spaceId}/members/${userId}`, { method: 'DELETE' })
    set(s => ({
      spaces: s.spaces.map(sp =>
        sp.id === spaceId
          ? { ...sp, members: sp.members.filter(m => m.userId !== userId) }
          : sp
      ),
    }))
  },
}))
