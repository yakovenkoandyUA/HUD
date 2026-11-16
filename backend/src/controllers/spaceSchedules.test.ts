import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findSpace: vi.fn(),
  createPlantEvent: vi.fn(),
  findPlantEvent: vi.fn(),
  deletePlantEvent: vi.fn(),
  deleteSportEvent: vi.fn(),
  deleteSession: vi.fn(),
}))
vi.mock('../models/Space', () => ({ Space: { findOne: mocks.findSpace } }))
vi.mock('../models/PlantEvent', () => ({
  PlantEvent: { create: mocks.createPlantEvent, findOne: mocks.findPlantEvent, findOneAndDelete: mocks.deletePlantEvent },
}))
vi.mock('../models/SportEvent', () => ({ SportEvent: { deleteOne: mocks.deleteSportEvent } }))
vi.mock('../models/WorkoutSession', () => ({ WorkoutSession: { deleteOne: mocks.deleteSession } }))

import { createPlantEvent, deletePlantEvent } from './plantController'
import { deleteWorkoutSession, isSportEventDueOnDay } from './sportController'

function isDue(date: string, repeatConfig: NonNullable<Parameters<typeof isSportEventDueOnDay>[0]['repeatConfig']>) {
  return isSportEventDueOnDay(
    { date: '2026-11-02', repeat: 'custom', repeatConfig },
    new Date(date + 'T00:00:00'),
    date,
  )
}

describe('workout schedule', () => {
  it('applies the interval and weekday together', () => {
    const config = { unit: 'week', interval: 2, weekDays: [0, 2] }
    expect(isDue('2026-11-09', config)).toBe(false)
    expect(isDue('2026-11-16', config)).toBe(true)
    expect(isDue('2026-11-18', config)).toBe(true)
  })

  it('stops after the configured date or number of occurrences', () => {
    expect(isDue('2026-11-05', { unit: 'day', interval: 1, endsType: 'date', endsDate: '2026-11-04' })).toBe(false)
    const count = { unit: 'day', interval: 2, endsType: 'after', endsAfter: 2 }
    expect(isDue('2026-11-04', count)).toBe(true)
    expect(isDue('2026-11-06', count)).toBe(false)
  })

  it('removes the matching journal entry when deleting a linked session', async () => {
    mocks.findSpace.mockResolvedValue({ _id: 'space' })
    mocks.deleteSportEvent.mockResolvedValue({ deletedCount: 1 })
    const response = { json: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as Response
    await deleteWorkoutSession({ userId: 'member', params: { id: 'space', sessionId: 'session' } } as unknown as Request, response)
    expect(mocks.deleteSportEvent).toHaveBeenCalledWith({ spaceId: 'space', sessionId: 'session' })
    expect(mocks.deleteSession).toHaveBeenCalledWith({ spaceId: 'space', _id: 'session' })
  })
})

describe('plant calendar from the log', () => {
  const space = { _id: 'plant', type: 'plant', plantProfile: { lastWateredAt: '2026-11-15' }, save: vi.fn() }
  const request = { userId: 'member', params: { id: 'plant', eventId: 'event' }, body: { type: 'watering', date: '2026-11-08' } } as unknown as Request

  beforeEach(() => {
    mocks.findSpace.mockResolvedValue(space)
    space.plantProfile.lastWateredAt = '2026-11-15'
  })

  it('keeps the newest care date when adding an older entry', async () => {
    const sort = vi.fn().mockReturnValue({ select: () => ({ lean: async () => ({ date: '2026-11-15' }) }) })
    mocks.createPlantEvent.mockResolvedValue({})
    mocks.findPlantEvent.mockReturnValue({ sort })
    await createPlantEvent(request, { json: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as Response)
    expect(sort).toHaveBeenCalledWith({ date: -1 })
    expect(space.plantProfile.lastWateredAt).toBe('2026-11-15')
  })

  it('resets the indicator when deleting the only watering record', async () => {
    mocks.deletePlantEvent.mockResolvedValue({ type: 'watering' })
    mocks.findPlantEvent.mockReturnValue({ sort: () => ({ select: () => ({ lean: async () => null }) }) })
    await deletePlantEvent(request, { json: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as Response)
    expect(space.plantProfile.lastWateredAt).toBeNull()
  })
})
