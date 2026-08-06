import { create } from 'zustand'
import { authFetch } from '@/shared/services/api'
import type { SportProfile } from '@/features/memories/store/spacesStore'
import type { RepeatConfig } from '@/shared/types'
import type { ReminderUnit } from '@/features/sprint/components/sprint/ReminderFields'

export interface SportEventReminder {
  amount: number
  unit:   ReminderUnit
}

export interface WorkoutMetric {
  name:  string
  value: string
  unit:  string
}

export type SportRepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'

export interface SportEvent {
  _id:          string
  spaceId:      string
  userId:       string
  date:         string
  time:         string | null
  title:        string
  duration:     number | null
  metrics:      WorkoutMetric[]
  notes:        string
  repeat:       SportRepeatType
  repeatConfig: RepeatConfig | null
  programIds:   string[]
  programNames: string[]
  reminder:     SportEventReminder | null
  reminderSent: boolean
  createdAt:    string
}

export interface SportEventInput {
  date:           string
  time?:          string | null
  title?:         string
  duration?:      number | null
  metrics?:       WorkoutMetric[]
  notes?:         string
  repeat?:        SportRepeatType
  repeatConfig?:  RepeatConfig | null
  programIds?:    string[]
  programNames?:  string[]
  reminder?:      SportEventReminder | null
}

export interface WorkoutSetTarget {
  reps:   number | null
  weight: number | null
}

export interface WorkoutExercise {
  id:          string
  name:        string
  /** План по кожному підходу (реп + вага). Джерело правди для нових вправ. */
  setTargets?: WorkoutSetTarget[] | null
  /** Legacy fallback — для вправ створених до появи setTargets */
  sets?:       number | null
  reps?:       number | null
  duration?:   number | null
  restSec?:    number | null
  notes?:      string
}

export interface WorkoutProgram {
  _id:       string
  spaceId:   string
  name:      string
  exercises: WorkoutExercise[]
  createdAt: string
}

/** Нормалізує план підходів вправи — джерело правди для читання (нове поле + legacy fallback) */
export function getSetTargets(ex: WorkoutExercise): WorkoutSetTarget[] {
  if (ex.setTargets && ex.setTargets.length > 0) return ex.setTargets
  const count = ex.sets && ex.sets > 0 ? ex.sets : 1
  return Array.from({ length: count }, () => ({ reps: ex.reps ?? null, weight: null }))
}

export interface WorkoutSetLog {
  reps:   number | null
  weight: number | null
}

export interface WorkoutExerciseLog {
  exerciseId: string
  name:       string
  sets:       WorkoutSetLog[]
}

export interface WorkoutSession {
  _id:                string
  spaceId:            string
  programId:          string
  programName:        string
  date:               string
  completedExercises: string[]
  totalExercises:     number
  exerciseLogs?:      WorkoutExerciseLog[]
  notes:              string
  createdAt:          string
}

interface SportStore {
  eventsBySpace:    Record<string, SportEvent[]>
  programsBySpace:  Record<string, WorkoutProgram[]>
  sessionsBySpace:  Record<string, WorkoutSession[]>
  todayEvents:      SportEvent[]
  loading:          boolean

  fetchEvents:          (spaceId: string) => Promise<void>
  fetchTodayEvents:     () => Promise<void>
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
  deleteSession:        (spaceId: string, sessionId: string) => Promise<void>
}

// Guards against a slow fetchEvents/fetchPrograms/fetchSessions(spaceId)
// overwriting an item created/edited for that space while it was still in
// flight with stale data — one map per list, keyed per spaceId, so
// mutating one list doesn't invalidate an in-flight fetch of a different
// list or a different space. See spacesStore.ts for the base pattern.
function makeReqIdBumper() {
  const ids = new Map<string, number>()
  return {
    bump: (key: string) => {
      const next = (ids.get(key) ?? 0) + 1
      ids.set(key, next)
      return next
    },
    current: (key: string) => ids.get(key),
  }
}
const sportEventReqIds   = makeReqIdBumper()
const sportProgramReqIds = makeReqIdBumper()
const sportSessionReqIds = makeReqIdBumper()

export const useSportStore = create<SportStore>((set) => ({
  eventsBySpace:   {},
  programsBySpace: {},
  sessionsBySpace: {},
  todayEvents:     [],
  loading:         false,

  fetchTodayEvents: async () => {
    try {
      const res = await authFetch('/api/spaces/sport/today')
      if (!res.ok) return
      const data: SportEvent[] = await res.json()
      set({ todayEvents: data })
    } catch {
      // silent — non-critical dashboard widget
    }
  },

  fetchEvents: async (spaceId) => {
    const reqId = sportEventReqIds.bump(spaceId)
    set({ loading: true })
    try {
      const res = await authFetch(`/api/spaces/${spaceId}/sport/events`)
      if (!res.ok) return
      const data: SportEvent[] = await res.json()
      if (reqId !== sportEventReqIds.current(spaceId)) return // stale — dropped
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
    sportEventReqIds.bump(spaceId)
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
    sportEventReqIds.bump(spaceId)
    set(s => ({
      eventsBySpace: {
        ...s.eventsBySpace,
        [spaceId]: (s.eventsBySpace[spaceId] ?? []).map(e => e._id === eventId ? updated : e),
      },
    }))
  },

  deleteEvent: async (spaceId, eventId) => {
    sportEventReqIds.bump(spaceId)
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
    const reqId = sportProgramReqIds.bump(spaceId)
    const res = await authFetch(`/api/spaces/${spaceId}/sport/programs`)
    if (!res.ok) return
    const data: WorkoutProgram[] = await res.json()
    if (reqId !== sportProgramReqIds.current(spaceId)) return // stale — dropped
    set(s => ({ programsBySpace: { ...s.programsBySpace, [spaceId]: data } }))
  },

  createProgram: async (spaceId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/sport/programs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => null) as { error?: string } | null
      throw new Error(err?.error ?? 'Create failed')
    }
    const program: WorkoutProgram = await res.json()
    sportProgramReqIds.bump(spaceId)
    set(s => ({ programsBySpace: { ...s.programsBySpace, [spaceId]: [...(s.programsBySpace[spaceId] ?? []), program] } }))
    return program
  },

  updateProgram: async (spaceId, programId, data) => {
    const res = await authFetch(`/api/spaces/${spaceId}/sport/programs/${programId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => null) as { error?: string } | null
      throw new Error(err?.error ?? 'Update failed')
    }
    const updated: WorkoutProgram = await res.json()
    sportProgramReqIds.bump(spaceId)
    set(s => ({ programsBySpace: { ...s.programsBySpace, [spaceId]: (s.programsBySpace[spaceId] ?? []).map(p => p._id === programId ? updated : p) } }))
  },

  deleteProgram: async (spaceId, programId) => {
    sportProgramReqIds.bump(spaceId)
    set(s => ({ programsBySpace: { ...s.programsBySpace, [spaceId]: (s.programsBySpace[spaceId] ?? []).filter(p => p._id !== programId) } }))
    await authFetch(`/api/spaces/${spaceId}/sport/programs/${programId}`, { method: 'DELETE' })
  },

  fetchSessions: async (spaceId) => {
    const reqId = sportSessionReqIds.bump(spaceId)
    const res = await authFetch(`/api/spaces/${spaceId}/sport/sessions`)
    if (!res.ok) return
    const data: WorkoutSession[] = await res.json()
    if (reqId !== sportSessionReqIds.current(spaceId)) return // stale — dropped
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
    sportSessionReqIds.bump(spaceId)
    set(s => ({
      sessionsBySpace: { ...s.sessionsBySpace, [spaceId]: [session, ...(s.sessionsBySpace[spaceId] ?? [])] },
    }))
    return session
  },

  deleteSession: async (spaceId, sessionId) => {
    sportSessionReqIds.bump(spaceId)
    set(s => ({
      sessionsBySpace: {
        ...s.sessionsBySpace,
        [spaceId]: (s.sessionsBySpace[spaceId] ?? []).filter(s => s._id !== sessionId),
      },
    }))
    await authFetch(`/api/spaces/${spaceId}/sport/sessions/${sessionId}`, { method: 'DELETE' })
  },
}))
