import { create } from 'zustand'
import { authFetch } from '@/shared/services/api'

export type SpaceType = 'shared' | 'trip' | 'sports' | 'vehicle' | 'pet' | 'plant' | 'blank' | 'cellar'

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
  frameNumber:        string
  currentMileage:     number | null
  fuelType:           string
  purchaseDate:       string | null
  photoUrl:           string
  nextServiceMileage: number | null
}

export interface HomeProfile {
  addressLabel:  string
  ownershipType: 'rent' | 'own' | 'mortgage'
  area:          number | null
  floor:         number | null
  moveInDate:    string | null
  photoUrl:      string
}

export interface PetFoodItem {
  id:       string
  name:     string
  brand:    string
  reaction: 'yes' | 'maybe' | 'no'
  notes:    string
  imageUrl: string
}

export interface PetProfile {
  name:           string
  species:        string
  breed:          string
  birthDate:      string | null
  weight:         number | null
  photoUrl:       string
  chipNumber:     string
  passportNumber: string
  foodLog:        PetFoodItem[]
}

export interface PlantProfile {
  commonName:           string
  species:              string
  location:             string
  acquiredDate:         string | null
  wateringIntervalDays: number | null
  lastWateredAt:        string | null
  lastFertilizedAt:     string | null
  sunlight:             'low' | 'medium' | 'high' | null
  photoUrl:             string
  toxicToPets:          boolean | null
  careNotes:            string
}

export interface TripProfile {
  destination: string
  origin:      string
  startDate:   string | null
  endDate:     string | null
  travelers:   number | null
  status:      'planning' | 'booked' | 'ongoing' | 'completed'
}

export interface SportPR {
  id:    string
  name:  string
  value: string
  unit:  string
  date:  string | null
}

export interface SportProfile {
  sport:    string
  level:    'beginner' | 'intermediate' | 'advanced' | null
  goal:     string
  photoUrl: string
  prs:      SportPR[]
}

export interface Space {
  id:             string
  name:           string
  type:           SpaceType
  color:          string
  emoji:          string
  coverUrl:       string
  coverPosition:  string
  budget:         number | null
  budgetCurrency: string
  ownerId:        string
  members:        SpaceMember[]
  modules:        string[]
  vehicleProfile: VehicleProfile | null
  homeProfile:    HomeProfile | null
  petProfile:     PetProfile | null
  tripProfile:    TripProfile | null
  plantProfile:   PlantProfile | null
  sportProfile:   SportProfile | null
  notes:          string
  archived:       boolean
  createdAt:      string
  memoriesCount:  number
  openTasksCount: number
  notesCount:     number
  lastActivityAt: string | null
}

export interface SpaceInput {
  name:            string
  type?:           SpaceType
  color?:          string
  emoji?:          string
  coverUrl?:       string
  coverPosition?:  string
  budget?:         number | null
  budgetCurrency?: string
  notes?:          string
  modules?:        string[]
  archived?:       boolean
}

interface SpacesStore {
  spaces:        Space[]
  archivedSpaces: Space[]
  loading:       boolean
  fetchSpaces:   () => Promise<void>
  fetchArchived: () => Promise<void>
  createSpace:   (data: SpaceInput) => Promise<Space>
  updateSpace:          (id: string, changes: Partial<SpaceInput>) => Promise<void>
  setVehicleProfile:    (id: string, profile: VehicleProfile) => void
  setHomeProfile:       (id: string, profile: HomeProfile) => void
  setPetProfile:        (id: string, profile: PetProfile) => void
  setTripProfile:       (id: string, profile: TripProfile) => void
  setPlantProfile:      (id: string, profile: PlantProfile) => void
  setSportProfile:      (id: string, profile: SportProfile) => void
  archiveSpace:         (id: string) => Promise<void>
  unarchiveSpace:(id: string) => Promise<void>
  deleteSpace:   (id: string) => Promise<void>
  addMember:          (spaceId: string, username: string) => Promise<void>
  removeMember:       (spaceId: string, userId: string) => Promise<void>
  ensureCellarSpace:  () => Promise<Space>
}

export const useSpacesStore = create<SpacesStore>((set, get) => ({
  spaces:         [],
  archivedSpaces: [],
  loading:        true,

  fetchSpaces: async () => {
    set({ loading: true })
    try {
      const res = await authFetch('/api/spaces')
      if (!res.ok) throw new Error('fetch failed')
      const data: Space[] = await res.json()
      set({ spaces: data, loading: false })
    } catch (err) {
      set({ loading: false })
      throw err
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

  setVehicleProfile: (id, profile) => {
    set(s => ({
      spaces: s.spaces.map(sp => sp.id === id ? { ...sp, vehicleProfile: profile } : sp),
    }))
  },

  setHomeProfile: (id, profile) => {
    set(s => ({
      spaces: s.spaces.map(sp => sp.id === id ? { ...sp, homeProfile: profile } : sp),
    }))
  },

  setPetProfile: (id, profile) => {
    set(s => ({
      spaces: s.spaces.map(sp => sp.id === id ? { ...sp, petProfile: profile } : sp),
    }))
  },

  setTripProfile: (id, profile) => {
    set(s => ({
      spaces: s.spaces.map(sp => sp.id === id ? { ...sp, tripProfile: profile } : sp),
    }))
  },

  setPlantProfile: (id, profile) => {
    set(s => ({
      spaces: s.spaces.map(sp => sp.id === id ? { ...sp, plantProfile: profile } : sp),
    }))
  },

  setSportProfile: (id, profile) => {
    set(s => ({
      spaces: s.spaces.map(sp => sp.id === id ? { ...sp, sportProfile: profile } : sp),
    }))
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

  ensureCellarSpace: async (): Promise<Space> => {
    const existing = get().spaces.find((s: Space) => s.type === 'cellar')
    if (existing) return existing
    const res = await authFetch('/api/spaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Cellar', type: 'cellar', color: '' }),
    })
    if (!res.ok) throw new Error('Create cellar failed')
    const space: Space = await res.json()
    set(s => ({ spaces: [space, ...s.spaces] }))
    return space
  },
}))
