import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'

const mocks = vi.hoisted(() => ({ create: vi.fn(), findOne: vi.fn() }))
vi.mock('../models/SprintTask', () => ({ default: mocks }))

import { createTask, updateTask } from './sprintController'

const now = new Date('2026-11-16T12:00:00Z')

describe('timed quest and purchase schedules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(now)
    mocks.create.mockResolvedValue({ assignedTo: [] })
  })
  afterEach(() => { vi.useRealTimers() })

  it.each(['todo', 'shopping'])('automatically configures a timed %s', async type => {
    await createTask(
      { userId: 'owner', body: { type, dueDate: '2026-11-16', dueTime: '15:00' } } as Request,
      { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response,
    )
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      automaticReminderSince: now,
      reminderSent: false,
      dueReminderSent: false,
    }))
  })

  it.each([
    { type: 'shopping', dueDate: '2026-11-16' },
    { type: 'todo', dueDate: '2026-11-16', dueTime: '15:00', reminder: { amount: 1, unit: 'hours' } },
  ])('keeps a date-only task or an explicit manual reminder out of the automatic schedule', async body => {
    await createTask(
      { userId: 'owner', body } as Request,
      { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response,
    )
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ ...body, automaticReminderSince: null }))
  })

  it('rearms both alerts after a deadline change and disables them when time is cleared', async () => {
    const task = {
      userId: 'owner',
      assignedTo: [],
      dueDate: '2026-11-16',
      dueTime: '15:00',
      repeat: 'none',
      automaticReminderSince: new Date('2026-11-16T11:00:00Z'),
      set: vi.fn(),
      markModified: vi.fn(),
      save: vi.fn(),
    }
    mocks.findOne.mockResolvedValue(task)
    const response = { json: vi.fn() } as unknown as Response
    const request = { userId: 'owner', params: { id: 'task' } }

    await updateTask({ ...request, body: { dueTime: '16:00' } } as unknown as Request, response)
    expect(task.set).toHaveBeenLastCalledWith(expect.objectContaining({
      automaticReminderSince: now, reminderSent: false, dueReminderSent: false,
    }))

    await updateTask({ ...request, body: { dueTime: null } } as unknown as Request, response)
    expect(task.set).toHaveBeenLastCalledWith(expect.objectContaining({ automaticReminderSince: null }))
  })
})
