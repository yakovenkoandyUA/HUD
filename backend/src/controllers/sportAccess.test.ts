import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const models = vi.hoisted(() => ({
  membership: vi.fn(),
  findEvent: vi.fn(),
  deleteEvent: vi.fn(),
  findProgram: vi.fn(),
  deleteProgram: vi.fn(),
  deleteSessions: vi.fn(),
}))

vi.mock('../models/Space', () => ({ Space: { exists: models.membership } }))
vi.mock('../models/SportEvent', () => ({ SportEvent: { findOne: models.findEvent, deleteOne: models.deleteEvent } }))
vi.mock('../models/WorkoutProgram', () => ({ WorkoutProgram: { findOne: models.findProgram, deleteOne: models.deleteProgram } }))
vi.mock('../models/WorkoutSession', () => ({ WorkoutSession: { deleteMany: models.deleteSessions } }))

import { deleteSportEvent, deleteWorkoutProgram, updateSportEvent, updateWorkoutProgram } from './sportController'

const params = { id: 'sport-space', eventId: 'event', programId: 'program' }

function response() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn() }
}

describe('sport space membership', () => {
  beforeEach(() => vi.resetAllMocks())

  it.each([
    updateSportEvent, deleteSportEvent, updateWorkoutProgram, deleteWorkoutProgram,
  ])('rejects %s before touching data when membership is missing', async handler => {
    models.membership.mockResolvedValue(null)
    const res = response()
    await handler({ userId: 'other-user', params, body: {} } as unknown as Request, res as unknown as Response)
    expect(models.membership).toHaveBeenCalledWith({ _id: 'sport-space', 'members.userId': 'other-user' })
    expect(res.status).toHaveBeenCalledWith(404)
    for (const call of [models.findEvent, models.deleteEvent, models.findProgram, models.deleteProgram, models.deleteSessions]) {
      expect(call).not.toHaveBeenCalled()
    }
  })

  it('lets an invited coach change planned reps on a shared program', async () => {
    models.membership.mockResolvedValue({ _id: 'sport-space' })
    const program = { exercises: [], save: vi.fn() }
    models.findProgram.mockResolvedValue(program)
    const exercises = [{ id: 'push-ups', name: 'Відтискання', setTargets: [{ reps: 12, weight: null }] }]
    const res = response()

    await updateWorkoutProgram({ userId: 'coach', params, body: { exercises } } as unknown as Request, res as unknown as Response)
    expect(models.membership).toHaveBeenCalledWith({ _id: 'sport-space', 'members.userId': 'coach' })
    expect(models.findProgram).toHaveBeenCalledWith({ _id: 'program', spaceId: 'sport-space' })
    expect(program.exercises).toEqual(exercises)
    expect(program.save).toHaveBeenCalledOnce()
    expect(res.json).toHaveBeenCalledWith(program)
  })

  it('preserves completed session history when deleting a shared program', async () => {
    models.membership.mockResolvedValue({ _id: 'sport-space' })
    await deleteWorkoutProgram({ userId: 'coach', params } as unknown as Request, response() as unknown as Response)
    expect(models.deleteProgram).toHaveBeenCalledWith({ _id: 'program', spaceId: 'sport-space' })
    expect(models.deleteSessions).not.toHaveBeenCalled()
  })
})
