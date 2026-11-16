import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  schedule: vi.fn(),
  findTasks: vi.fn(),
  updateTask: vi.fn(),
  sendPushToUser: vi.fn(),
}))

vi.mock('node-cron', () => ({ default: { schedule: mocks.schedule } }))
vi.mock('../models/SprintTask', () => ({
  default: { find: mocks.findTasks, updateOne: mocks.updateTask },
}))
vi.mock('../models/TodoItem', () => ({
  default: { find: () => ({ lean: async () => [] }) },
}))
vi.mock('./webpush', () => ({
  isWebPushConfigured: () => true,
  sendPushToUser: mocks.sendPushToUser,
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
    mocks.sendPushToUser.mockResolvedValue({ subscriptions: 1, accepted: 1 })
  }

  it.each([0, 1])('does not mark sent after zero acceptances across %i subscriptions', async subscriptions => {
    mocks.sendPushToUser.mockResolvedValue({ subscriptions, accepted: 0 })
    await tick()
    expect(mocks.sendPushToUser).toHaveBeenCalledOnce()
    expect(mocks.updateTask).not.toHaveBeenCalledWith(expect.anything(), { $set: { reminderSent: true } })
    expect(mocks.updateTask).toHaveBeenLastCalledWith(
      expect.objectContaining({ _id: task._id }), { $unset: { reminderClaimUntil: '' } },
    )
  })

  it('marks sent once a push service accepts and scopes the write to the same schedule', async () => {
    mocks.sendPushToUser.mockResolvedValue({ subscriptions: 2, accepted: 1 })
    await tick()
    expect(mocks.sendPushToUser).toHaveBeenCalledWith(
      task.userId, expect.objectContaining({ url: '/sprint?quest=quest-1' }), 86400,
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

  it('does not send when another cron run already claimed the schedule', async () => {
    mocks.updateTask.mockResolvedValue({ matchedCount: 0 })
    await tick()
    expect(mocks.sendPushToUser).not.toHaveBeenCalled()
  })

  it('ignores reminders whose deadline passed more than a day ago', async () => {
    vi.setSystemTime(new Date('2026-11-17T13:05:00Z'))
    await tick()
    expect(mocks.updateTask).not.toHaveBeenCalled()
    expect(mocks.sendPushToUser).not.toHaveBeenCalled()
  })

  it('sends the preview independently from the deadline alert for a timed purchase', async () => {
    timedShopping('2026-11-16T12:00:00Z')
    vi.setSystemTime(new Date('2026-11-16T12:30:00Z'))
    await tick()
    expect(mocks.sendPushToUser).toHaveBeenLastCalledWith(
      task.userId, expect.objectContaining({ title: 'Покупка за 30 хвилин', tag: 'reminder-quest-1' }), 1800,
    )
    expect(mocks.updateTask).toHaveBeenCalledWith(expect.anything(), { $set: { reminderSent: true } })

    timedShopping('2026-11-16T12:00:00Z', { reminderSent: true })
    vi.setSystemTime(new Date('2026-11-16T13:00:00Z'))
    await tick()
    expect(mocks.sendPushToUser).toHaveBeenLastCalledWith(
      task.userId, expect.objectContaining({ tag: 'reminder-quest-1-due' }), 900,
    )
    expect(mocks.updateTask).toHaveBeenCalledWith(expect.anything(), { $set: { dueReminderSent: true } })
  })

  it('skips the preview when the schedule is saved less than 30 minutes before the deadline', async () => {
    timedShopping('2026-11-16T12:45:00Z')
    await tick()
    expect(mocks.sendPushToUser).not.toHaveBeenCalled()

    vi.setSystemTime(new Date('2026-11-16T13:00:00Z'))
    await tick()
    expect(mocks.sendPushToUser).toHaveBeenCalledOnce()
  })

  it('does not send a stale deadline alert', async () => {
    timedShopping('2026-11-16T12:00:00Z')
    vi.setSystemTime(new Date('2026-11-16T13:15:00Z'))
    await tick()
    expect(mocks.sendPushToUser).not.toHaveBeenCalled()
  })

  it('does not send deadline notifications for an older task without a configured reminder', async () => {
    mocks.findTasks.mockReturnValue({ lean: async () => [{ ...task, reminder: null }] })
    vi.setSystemTime(new Date('2026-11-16T13:00:00Z'))
    await tick()
    expect(mocks.sendPushToUser).not.toHaveBeenCalled()
  })
})
