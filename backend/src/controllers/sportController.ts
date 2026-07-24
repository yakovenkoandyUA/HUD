import { Request, Response } from 'express'
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

    const allowed = ['sport', 'level', 'goal', 'photoUrl', 'prs'] as const
    if (!space.sportProfile) {
      space.sportProfile = { sport: '', level: null, goal: '', photoUrl: '', prs: [] }
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

    const { date, title, duration, metrics, notes } = req.body
    const event = await SportEvent.create({
      spaceId:  req.params.id,
      userId:   req.userId,
      date:     date ?? new Date().toISOString().slice(0, 10),
      title:    title  ?? '',
      duration: duration ?? null,
      metrics:  metrics  ?? [],
      notes:    notes    ?? '',
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

    const allowed = ['date', 'title', 'duration', 'metrics', 'notes'] as const
    allowed.forEach(key => {
      if (req.body[key] !== undefined) (event as unknown as Record<string, unknown>)[key] = req.body[key]
    })
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
    if (count >= 2) { res.status(400).json({ error: 'Max 2 programs per space' }); return }

    const { name, exercises } = req.body as { name?: string; exercises?: unknown[] }
    if (!name?.trim()) { res.status(400).json({ error: 'Name required' }); return }

    const program = await WorkoutProgram.create({
      spaceId:   req.params.id,
      userId:    req.userId,
      name:      name.trim(),
      exercises: exercises ?? [],
    })
    res.status(201).json(program)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

/** PATCH /api/spaces/:id/sport/programs/:programId */
export async function updateWorkoutProgram(req: Request, res: Response): Promise<void> {
  try {
    const program = await WorkoutProgram.findOne({ _id: req.params.programId, spaceId: req.params.id })
    if (!program) { res.status(404).json({ error: 'Not found' }); return }

    if (req.body.name      !== undefined) program.name      = req.body.name
    if (req.body.exercises !== undefined) program.exercises = req.body.exercises
    await program.save()
    res.json(program)
  } catch {
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

    const { programId, programName, date, completedExercises, totalExercises, notes } = req.body as {
      programId: string; programName: string; date: string
      completedExercises: string[]; totalExercises: number; notes?: string
    }

    const session = await WorkoutSession.create({
      spaceId: req.params.id,
      userId:  req.userId,
      programId, programName, date,
      completedExercises: completedExercises ?? [],
      totalExercises,
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
