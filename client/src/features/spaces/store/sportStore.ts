import { create } from 'zustand'
import { authFetch } from '@/shared/services/api'
import type { SportProfile } from '@/features/memories/store/spacesStore'

export interface WorkoutMetric {
  name:  string
  value: string
  unit:  string
}

export interface SportEvent {
  _id:      string
  spaceId:  string
  userId:   string
  date:     string
  title:    string
  duration: number | null
  metrics:  WorkoutMetric[]
  notes:    string
  createdAt: string
}

export interface SportEventInput {
  date:      string
  title?:    string
  duration?: number | null
  metrics?:  WorkoutMetric[]
  notes?:    string
}

export interface WorkoutExercise {
  id:        string
  name:      string
  sets?:     number | null
  reps?:     number | null
  duration?: number | null
  notes?:    string
}

export interface WorkoutProgram {
  _id:       string
  spaceId:   string
  name:      string
  exercises: WorkoutExercise[]
  createdAt: string
}

export interface WorkoutSession {
  _id:                string
  spaceId:            string
  programId:          string
  programName:        string
  date:               string
  completedExercises: string[]
  totalExercises:     number
  notes:              string
  createdAt:          string
}

interface SportStore {
  eventsBySpace:    Record<string, SportEvent[]>
  programsBySpace:  Record<string, WorkoutProgram[]>
  sessionsBySpace:  Record<string, WorkoutSession[]>
  loading:          boolean

  fetchEvents:          (spaceId: string) => Promise<void>
  createEvent:          (spaceId: string, data: SportEventInput) => Promise<SportEvent>
  updateEvent:          (spaceId: string, eventId: string, data: Partial<SportEventInput>) => Promise<void>
  deleteEvent:          (spaceId: string, eventId: string) => Promise<void>
  updateProfile:        (spaceId: string, data: Partial<SportProfile>) => Promise<SportProfile>
  fetchPrograms:        (spaceId: string) => Promise<void>
  createProgram:        (spaceId: string, data: { name: string; exercises: WorkoutExercise[] }) => Promise<WorkoutProgram>
  updateProgram:        (spaceId: string, programId: string, data: { name?: string; exercises?: WorkoutExercise[] }) => Promise<void>
  deleteProgram:        (spaceId: string, programId: string) => Promise<void>
  fetchSessions:        (spaceId: string) => Promise<void>
  createSession:        (spaceId: string, data: Omit<WorkoutSession, '_id' | 'spaceId' | 'userId' | 'createdAt'>) => Promise<WorkoutSession>
}

export const useSportStore = create<SportStore>((set) => ({
  eventsBySpace:   {},
  programsBySpace: {},
  sessionsBySpace: {},
  loading:         false,

  fetchEvents: async (spaceId) => {
    set({ loading: true })
    try {
      const res = await authFetch(`/api/spaces/${spaceId}/sport/events`)
      if (!res.ok) return
      const data: SportEvent[] = await res.json()
      set(s => ({ eventsBySpace: { ...s.eventsBySpace, [spaceId]: data }, loading: false }))
    } catch {
      set({ loading: false })
    }
  },

  createEvent: async (spaceId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/sport/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Create failed')
    const event: SportEvent = await res.json()
    set(s => ({
      eventsBySpace: {
        ...s.eventsBySpace,
        [spaceId]: [event, ...(s.eventsBySpace[spaceId] ?? [])],
      },
    }))
    return event
  },

  updateEvent: async (spaceId, eventId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/sport/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) return
    const updated: SportEvent = await res.json()
    set(s => ({
      eventsBySpace: {
        ...s.eventsBySpace,
        [spaceId]: (s.eventsBySpace[spaceId] ?? []).map(e => e._id === eventId ? updated : e),
      },
    }))
  },

  deleteEvent: async (spaceId, eventId) => {
    set(s => ({
      eventsBySpace: {
        ...s.eventsBySpace,
        [spaceId]: (s.eventsBySpace[spaceId] ?? []).filter(e => e._id !== eventId),
      },
    }))
    await authFetch(`/api/spaces/${spaceId}/sport/events/${eventId}`, { method: 'DELETE' })
  },

  updateProfile: async (spaceId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/sport/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Update failed')
    return res.json() as Promise<SportProfile>
  },

  fetchPrograms: async (spaceId) => {
    const res = await authFetch(`/api/spaces/${spaceId}/sport/programs`)
    if (!res.ok) return
    const data: WorkoutProgram[] = await res.json()
    set(s => ({ programsBySpace: { ...s.programsBySpace, [spaceId]: data } }))
  },

  createProgram: async (spaceId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/sport/programs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Create failed')
    const program: WorkoutProgram = await res.json()
    set(s => ({ programsBySpace: { ...s.programsBySpace, [spaceId]: [...(s.programsBySpace[spaceId] ?? []), program] } }))
    return program
  },

  updateProgram: async (spaceId, programId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/sport/programs/${programId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) return
    const updated: WorkoutProgram = await res.json()
    set(s => ({ programsBySpace: { ...s.programsBySpace, [spaceId]: (s.programsBySpace[spaceId] ?? []).map(p => p._id === programId ? updated : p) } }))
  },

  deleteProgram: async (spaceId, programId) => {
    set(s => ({ programsBySpace: { ...s.programsBySpace, [spaceId]: (s.programsBySpace[spaceId] ?? []).filter(p => p._id !== programId) } }))
    await authFetch(`/api/spaces/${spaceId}/sport/programs/${programId}`, { method: 'DELETE' })
  },

  fetchSessions: async (spaceId) => {
    const res = await authFetch(`/api/spaces/${spaceId}/sport/sessions`)
    if (!res.ok) return
    const data: WorkoutSession[] = await res.json()
    set(s => ({ sessionsBySpace: { ...s.sessionsBySpace, [spaceId]: data } }))
  },

  createSession: async (spaceId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/sport/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Create failed')
    const session: WorkoutSession = await res.json()
    set(s => ({
      sessionsBySpace: { ...s.sessionsBySpace, [spaceId]: [session, ...(s.sessionsBySpace[spaceId] ?? [])] },
    }))
    return session
  },
}))
