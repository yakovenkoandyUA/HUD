import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  schedule: vi.fn(),
  findTasks: vi.fn(),
  updateTask: vi.fn(),
  findSessions: vi.fn(),
  updateSession: vi.fn(),
  sendScheduledPushToUser: vi.fn(),
}))

vi.mock('node-cron', () => ({ default: { schedule: mocks.schedule } }))
vi.mock('../models/SprintTask', () => ({
  default: { find: mocks.findTasks, updateOne: mocks.updateTask },
}))
vi.mock('../models/TodoItem', () => ({
  default: { find: () => ({ lean: async () => [] }) },
}))
vi.mock('../models/F1SessionReminder', () => ({
  default: { find: mocks.findSessions, updateOne: mocks.updateSession },
}))
vi.mock('./webpush', () => ({
  isWebPushConfigured: () => true,
  sendScheduledPushToUser: mocks.sendScheduledPushToUser,
}))

import { startF1Scheduler } from './f1Scheduler'
import { questReminderTime } from '../utils/questReminderTime'

describe('Kyiv quest reminder time', () => {
  it.each([
    ['2026-11-16', '2026-11-16T12:55:00.000Z'],
    ['2026-07-16', '2026-07-16T11:55:00.000Z'],
  ])('calculates 5 minutes before 15:00 on %s', (date, expected) => {
    const schedule = questReminderTime(date, '15:00', { amount: 5, unit: 'minutes' })
    expect(schedule?.reminderAt).toBe(Date.parse(expected))
  })

  it('keeps the 09:00 default on both sides of a daylight saving change', () => {
    const schedule = questReminderTime('2026-03-29', undefined, { amount: 1, unit: 'days' })
    expect(schedule).toEqual({
      dueAt: Date.parse('2026-03-29T06:00:00Z'),
      reminderAt: Date.parse('2026-03-28T07:00:00Z'),
    })
  })

  it('ignores invalid dates and offsets', () => {
    expect(questReminderTime('2026-02-30', '15:00', { amount: 1, unit: 'days' })).toBeNull()
    expect(questReminderTime('2026-11-16', '15:00', { amount: 0, unit: 'minutes' })).toBeNull()
  })
})

it('retries a subscribed F1 session until all available devices accept it and only before the session starts', async () => {
  const sessionAt = new Date('2026-11-16T13:00:00Z')
  const previous = new Date('2026-11-16T12:30:00Z')
  vi.useFakeTimers()
  try {
    vi.setSystemTime(previous)
    mocks.schedule.mockClear()
    mocks.updateSession.mockClear()
    mocks.findSessions.mockReturnValue({
      lean: async () => [{ _id: 'session', userId: 'owner', round: 20, sessionKey: 'race', sessionLabel: 'Гонка', sessionAt }],
    })
    startF1Scheduler()
    const [, callback] = mocks.schedule.mock.calls.find(([spec]) => spec === '*/5 * * * *')!
    mocks.sendScheduledPushToUser.mockResolvedValue({ accepted: 1, pending: 1 })
    await callback()
    expect(mocks.findSessions).toHaveBeenCalledWith({
      sent: false, remindAt: { $lte: previous }, sessionAt: { $gt: previous },
    })
    expect(mocks.updateSession).not.toHaveBeenCalled()
    mocks.sendScheduledPushToUser.mockResolvedValue({ accepted: 2, pending: 0 })
    await callback()
    expect(mocks.updateSession).toHaveBeenCalledWith({ _id: 'session', sessionAt }, { $set: { sent: true } })
  } finally {
    vi.useRealTimers()
  }
})

describe('quest reminder cron', () => {
  const task = {
    _id: 'quest-1',
    userId: 'user-1',
    title: 'Test quest',
    dueDate: '2026-11-16',
    dueTime: '15:00',
    repeat: 'none',
    reminder: { amount: 5, unit: 'minutes' },
  }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-16T12:55:00Z'))
    mocks.findTasks.mockReturnValue({ lean: async () => [task] })
    mocks.updateTask.mockResolvedValue({ matchedCount: 1 })
  })

  afterEach(() => { vi.useRealTimers() })

  async function tick() {
    startF1Scheduler()
    const [, callback] = mocks.schedule.mock.calls.find(([spec]) => spec === '* * * * *')!
    await callback()
  }

  function timedShopping(scheduledAt: string, flags = {}) {
    mocks.findTasks.mockReturnValue({
      lean: async () => [{
        ...task, type: 'shopping', reminder: null, automaticReminderSince: new Date(scheduledAt), ...flags,
      }],
    })
    mocks.sendScheduledPushToUser.mockResolvedValue({ accepted: 1, pending: 0 })
  }

  it.each([0, 1])('does not mark sent after zero acceptances across %i subscriptions', async subscriptions => {
    mocks.sendScheduledPushToUser.mockResolvedValue({ pending: subscriptions, accepted: 0 })
    await tick()
    expect(mocks.sendScheduledPushToUser).toHaveBeenCalledOnce()
    expect(mocks.updateTask).not.toHaveBeenCalledWith(expect.anything(), { $set: { reminderSent: true } })
    expect(mocks.updateTask).toHaveBeenLastCalledWith(
      expect.objectContaining({ _id: task._id }), { $unset: { reminderClaimUntil: '' } },
    )
  })

  it('marks sent when no devices need retries and scopes the write to the same schedule', async () => {
    mocks.sendScheduledPushToUser.mockResolvedValue({ pending: 0, accepted: 1 })
    await tick()
    expect(mocks.sendScheduledPushToUser).toHaveBeenCalledWith(
      task.userId, expect.objectContaining({ url: '/sprint?quest=quest-1' }), expect.objectContaining({ expiresAt: Date.parse('2026-11-17T13:00:00Z') }),
    )
    expect(mocks.updateTask).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: task._id,
        dueDate: task.dueDate,
        dueTime: task.dueTime,
        reminderClaimUntil: expect.any(Date),
      }),
      { $set: { reminderSent: true } },
    )
  })

  it('keeps the occurrence eligible while another device still needs a retry', async () => {
    mocks.sendScheduledPushToUser.mockResolvedValue({ accepted: 1, pending: 1 })
    await tick()
    expect(mocks.updateTask).not.toHaveBeenCalledWith(expect.anything(), { $set: { reminderSent: true } })
  })

  it('does not send when another cron run already claimed the schedule', async () => {
    mocks.updateTask.mockResolvedValue({ matchedCount: 0 })
    await tick()
    expect(mocks.sendScheduledPushToUser).not.toHaveBeenCalled()
  })

  it('ignores reminders whose deadline passed more than a day ago', async () => {
    vi.setSystemTime(new Date('2026-11-17T13:05:00Z'))
    await tick()
    expect(mocks.updateTask).not.toHaveBeenCalled()
    expect(mocks.sendScheduledPushToUser).not.toHaveBeenCalled()
  })

  it('sends the preview independently from the deadline alert for a timed purchase', async () => {
    timedShopping('2026-11-16T12:00:00Z')
    vi.setSystemTime(new Date('2026-11-16T12:30:00Z'))
    await tick()
    expect(mocks.sendScheduledPushToUser).toHaveBeenLastCalledWith(
      task.userId, expect.objectContaining({ title: 'Покупка за 30 хвилин', tag: 'reminder-quest-1' }), expect.objectContaining({ expiresAt: Date.parse('2026-11-16T13:00:00Z') }),
    )
    expect(mocks.updateTask).toHaveBeenCalledWith(expect.anything(), { $set: { reminderSent: true } })

    timedShopping('2026-11-16T12:00:00Z', { reminderSent: true })
    vi.setSystemTime(new Date('2026-11-16T13:00:00Z'))
    await tick()
    expect(mocks.sendScheduledPushToUser).toHaveBeenLastCalledWith(
      task.userId, expect.objectContaining({ tag: 'reminder-quest-1-due' }), expect.objectContaining({ expiresAt: Date.parse('2026-11-16T13:15:00Z') }),
    )
    expect(mocks.updateTask).toHaveBeenCalledWith(expect.anything(), { $set: { dueReminderSent: true } })
  })

  it('skips the preview when the schedule is saved less than 30 minutes before the deadline', async () => {
    timedShopping('2026-11-16T12:45:00Z')
    await tick()
    expect(mocks.sendScheduledPushToUser).not.toHaveBeenCalled()

    vi.setSystemTime(new Date('2026-11-16T13:00:00Z'))
    await tick()
    expect(mocks.sendScheduledPushToUser).toHaveBeenCalledOnce()
  })

  it('does not send a stale deadline alert', async () => {
    timedShopping('2026-11-16T12:00:00Z')
    vi.setSystemTime(new Date('2026-11-16T13:15:00Z'))
    await tick()
    expect(mocks.sendScheduledPushToUser).not.toHaveBeenCalled()
  })

  it('does not send deadline notifications for an older task without a configured reminder', async () => {
    mocks.findTasks.mockReturnValue({ lean: async () => [{ ...task, reminder: null }] })
    vi.setSystemTime(new Date('2026-11-16T13:00:00Z'))
    await tick()
    expect(mocks.sendScheduledPushToUser).not.toHaveBeenCalled()
  })
})
