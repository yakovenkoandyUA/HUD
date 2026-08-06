import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { Space } from '../models/Space'
import { SportEvent } from '../models/SportEvent'
import { WorkoutProgram } from '../models/WorkoutProgram'
import { WorkoutSession } from '../models/WorkoutSession'

/** GET /api/spaces/:id/sport/profile */
export async function getSportProfile(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }
    res.json(space.sportProfile ?? {})
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** PATCH /api/spaces/:id/sport/profile */
export async function updateSportProfile(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const allowed = ['sport', 'level', 'goal', 'photoUrl', 'prs', 'measurements'] as const
    if (!space.sportProfile) {
      space.sportProfile = { sport: '', level: null, goal: '', photoUrl: '', prs: [], measurements: [] }
    }
    allowed.forEach(key => {
      if (req.body[key] !== undefined) (space.sportProfile as unknown as Record<string, unknown>)[key] = req.body[key]
    })
    await space.save()
    res.json(space.sportProfile)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

// Чи припадає SportEvent на конкретний день, з урахуванням repeat/repeatConfig.
// Дзеркалить client/src/features/sprint/utils/sprint.ts isRoutineDueOnDay, адаптовано під
// SportEvent (де date — сама дата початку серії, без окремого nextDue).
// Використовується тут (getTodaySportEvents) і в jobs/workoutReminders.ts.
export function isSportEventDueOnDay(
  event: { date: string; repeat: string; repeatConfig: { unit?: string; weekDays?: number[]; interval?: number } | null },
  day: Date,
  dayIso: string
): boolean {
  if (!event.repeat || event.repeat === 'none') return event.date === dayIso

  const [ay, am, ad] = event.date.split('-').map(Number)
  const anchor = new Date(ay, am - 1, ad)
  if (day < anchor) return false

  if (event.repeat === 'daily')   return true
  if (event.repeat === 'weekly')  return day.getDay() === anchor.getDay()
  if (event.repeat === 'monthly') return day.getDate() === anchor.getDate()
  if (event.repeat === 'yearly')  return day.getMonth() === anchor.getMonth() && day.getDate() === anchor.getDate()

  if (event.repeat === 'custom' && event.repeatConfig) {
    const { unit, weekDays, interval } = event.repeatConfig
    if (unit === 'week' && weekDays && weekDays.length > 0) {
      return weekDays.includes((day.getDay() + 6) % 7)
    }
    if (interval && interval > 0) {
      if (unit === 'day') {
        const diffDays = Math.round((day.getTime() - anchor.getTime()) / 86_400_000)
        return diffDays % interval === 0
      }
      if (unit === 'month') {
        const monthDiff = (day.getFullYear() - anchor.getFullYear()) * 12 + (day.getMonth() - anchor.getMonth())
        return monthDiff >= 0 && monthDiff % interval === 0 && day.getDate() === anchor.getDate()
      }
      if (unit === 'year') {
        const yearDiff = day.getFullYear() - anchor.getFullYear()
        return yearDiff >= 0 && yearDiff % interval === 0 &&
          day.getMonth() === anchor.getMonth() && day.getDate() === anchor.getDate()
      }
    }
  }
  return false
}

/** GET /api/spaces/sport/today — тренування на сьогодні по всіх Sport-просторах юзера */
export async function getTodaySportEvents(req: Request, res: Response): Promise<void> {
  try {
    const spaces = await Space.find({ 'members.userId': req.userId, type: 'sports' }).select('_id').lean()
    const spaceIds = spaces.map(s => String(s._id))
    if (spaceIds.length === 0) { res.json([]); return }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayIso = today.toISOString().slice(0, 10)

    const events = await SportEvent.find({ spaceId: { $in: spaceIds }, date: { $lte: todayIso } }).lean()
    const due = events.filter(e => isSportEventDueOnDay(e, today, todayIso))
    res.json(due)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** GET /api/spaces/:id/sport/events */
export async function getSportEvents(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const { limit } = req.query as { limit?: string }
    const events = await SportEvent.find({ spaceId: req.params.id })
      .sort({ date: -1, createdAt: -1 })
      .limit(limit ? parseInt(limit, 10) : 200)

    res.json(events)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** POST /api/spaces/:id/sport/events */
export async function createSportEvent(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const { date, time, title, duration, metrics, notes, repeat, repeatConfig, programIds, programNames, reminder } = req.body
    const event = await SportEvent.create({
      spaceId:      req.params.id,
      userId:       req.userId,
      date:         date ?? new Date().toISOString().slice(0, 10),
      time:         time ?? null,
      title:        title  ?? '',
      duration:     duration ?? null,
      metrics:      metrics  ?? [],
      notes:        notes    ?? '',
      repeat:       repeat ?? 'none',
      repeatConfig: repeatConfig ?? null,
      programIds:   programIds   ?? [],
      programNames: programNames ?? [],
      reminder:        reminder ?? null,
      reminderSentFor: null,
    })
    res.status(201).json(event)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** PATCH /api/spaces/:id/sport/events/:eventId */
export async function updateSportEvent(req: Request, res: Response): Promise<void> {
  try {
    const event = await SportEvent.findOne({ _id: req.params.eventId, spaceId: req.params.id })
    if (!event) { res.status(404).json({ error: 'Not found' }); return }

    const allowed = ['date', 'time', 'title', 'duration', 'metrics', 'notes', 'repeat', 'repeatConfig', 'programIds', 'programNames', 'reminder'] as const
    allowed.forEach(key => {
      if (req.body[key] !== undefined) (event as unknown as Record<string, unknown>)[key] = req.body[key]
    })
    if (req.body.date !== undefined || req.body.time !== undefined || req.body.reminder !== undefined) event.reminderSentFor = null
    await event.save()
    res.json(event)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** DELETE /api/spaces/:id/sport/events/:eventId */
export async function deleteSportEvent(req: Request, res: Response): Promise<void> {
  try {
    await SportEvent.deleteOne({ _id: req.params.eventId, spaceId: req.params.id })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

// ── Workout programs ───────────────────────────────────────────────────────

/** GET /api/spaces/:id/sport/programs */
export async function getWorkoutPrograms(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }
    const programs = await WorkoutProgram.find({ spaceId: req.params.id }).sort({ createdAt: 1 })
    res.json(programs)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** POST /api/spaces/:id/sport/programs */
export async function createWorkoutProgram(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const count = await WorkoutProgram.countDocuments({ spaceId: req.params.id })
    if (count >= 7) { res.status(400).json({ error: 'Max 7 programs per space' }); return }

    const { name, exercises } = req.body as { name?: string; exercises?: { name?: string }[] }
    if (!name?.trim()) { res.status(400).json({ error: 'Name required' }); return }
    if (!exercises || exercises.length === 0) { res.status(400).json({ error: 'At least one exercise required' }); return }
    if (exercises.some(e => !e.name?.trim())) { res.status(400).json({ error: 'Every exercise needs a name' }); return }

    const program = await WorkoutProgram.create({
      spaceId:   req.params.id,
      userId:    req.userId,
      name:      name.trim(),
      exercises,
    })
    res.status(201).json(program)
  } catch (err) {
    if (err instanceof mongoose.Error.ValidationError) { res.status(400).json({ error: err.message }); return }
    res.status(500).json({ error: 'Server error' })
  }
}

/** PATCH /api/spaces/:id/sport/programs/:programId */
export async function updateWorkoutProgram(req: Request, res: Response): Promise<void> {
  try {
    const program = await WorkoutProgram.findOne({ _id: req.params.programId, spaceId: req.params.id })
    if (!program) { res.status(404).json({ error: 'Not found' }); return }

    if (req.body.name !== undefined) {
      if (!String(req.body.name).trim()) { res.status(400).json({ error: 'Name required' }); return }
      program.name = req.body.name
    }
    if (req.body.exercises !== undefined) {
      const exercises = req.body.exercises as { name?: string }[]
      if (exercises.length === 0) { res.status(400).json({ error: 'At least one exercise required' }); return }
      if (exercises.some(e => !e.name?.trim())) { res.status(400).json({ error: 'Every exercise needs a name' }); return }
      program.exercises = req.body.exercises
    }
    await program.save()
    res.json(program)
  } catch (err) {
    if (err instanceof mongoose.Error.ValidationError) { res.status(400).json({ error: err.message }); return }
    res.status(500).json({ error: 'Server error' })
  }
}

/** DELETE /api/spaces/:id/sport/programs/:programId */
export async function deleteWorkoutProgram(req: Request, res: Response): Promise<void> {
  try {
    await WorkoutProgram.deleteOne({ _id: req.params.programId, spaceId: req.params.id })
    await WorkoutSession.deleteMany({ programId: req.params.programId })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

// ── Workout sessions ───────────────────────────────────────────────────────

/** GET /api/spaces/:id/sport/sessions */
export async function getWorkoutSessions(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }
    const sessions = await WorkoutSession.find({ spaceId: req.params.id })
      .sort({ date: -1, createdAt: -1 })
      .limit(100)
    res.json(sessions)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** POST /api/spaces/:id/sport/sessions — log a completed workout + create SportEvent */
export async function createWorkoutSession(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }

    const { programId, programName, date, completedExercises, totalExercises, exerciseLogs, notes } = req.body as {
      programId: string; programName: string; date: string
      completedExercises: string[]; totalExercises: number
      exerciseLogs?: { exerciseId: string; name: string; sets: { reps: number | null; weight: number | null }[] }[]
      notes?: string
    }

    const session = await WorkoutSession.create({
      spaceId: req.params.id,
      userId:  req.userId,
      programId, programName, date,
      completedExercises: completedExercises ?? [],
      totalExercises,
      exerciseLogs: exerciseLogs ?? [],
      notes: notes ?? '',
    })

    // Also create a SportEvent so it appears in the workout log
    await SportEvent.create({
      spaceId:  req.params.id,
      userId:   req.userId,
      date:     date ?? new Date().toISOString().slice(0, 10),
      title:    programName,
      duration: null,
      metrics:  [{ name: 'Вправ виконано', value: `${completedExercises.length}/${totalExercises}`, unit: '' }],
      notes:    notes ?? '',
    })

    res.status(201).json(session)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** DELETE /api/spaces/:id/sport/sessions/:sessionId */
export async function deleteWorkoutSession(req: Request, res: Response): Promise<void> {
  try {
    const space = await Space.findOne({ _id: req.params.id, 'members.userId': req.userId })
    if (!space) { res.status(404).json({ error: 'Not found' }); return }
    await WorkoutSession.deleteOne({ _id: req.params.sessionId, spaceId: req.params.id })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}
