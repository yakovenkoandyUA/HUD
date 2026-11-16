import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  schedule: vi.fn(),
  payments: vi.fn(),
  workouts: vi.fn(),
  updateWorkout: vi.fn(),
  send: vi.fn(),
}))
vi.mock('node-cron', () => ({ default: { schedule: mocks.schedule } }))
vi.mock('../models/RecurringPayment', () => ({ default: { find: mocks.payments } }))
vi.mock('../models/SportEvent', () => ({ SportEvent: { find: mocks.workouts, updateOne: mocks.updateWorkout } }))
vi.mock('../services/webpush', () => ({ isWebPushConfigured: () => true, sendScheduledPushToUser: mocks.send }))
import './recurringReminders'
import './workoutReminders'

const jobs = new Map<string, () => Promise<void>>(mocks.schedule.mock.calls.map(([spec, callback]) => [spec, callback]))
const basePayment = { _id: 'payment', userId: 'owner', name: 'Internet', amount: 100, currency: 'UAH', dayOfMonth: 2, reminderDays: [7] }

describe('operational reminders', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.send.mockReset().mockResolvedValue({ accepted: 1, pending: 0 })
    mocks.updateWorkout.mockClear()
  })
  afterEach(() => { vi.useRealTimers() })

  it('finds an advance payment date crossing from a short month into a longer one', async () => {
    vi.setSystemTime(new Date('2026-02-23T10:00:00Z'))
    mocks.payments.mockReturnValue({ lean: async () => [basePayment] })
    await jobs.get('*/5 12 * * *')!()
    expect(mocks.send).toHaveBeenCalledWith(
      'owner', expect.objectContaining({ title: expect.stringContaining('7') }),
      expect.objectContaining({ key: 'recurring-payment-2026-02-23-2026-03-02' }),
    )
  })

  it('uses the end of February for day 31 and skips an already confirmed payment', async () => {
    vi.setSystemTime(new Date('2026-02-28T06:00:00Z'))
    const payment = { ...basePayment, dayOfMonth: 31 }
    mocks.payments.mockReturnValue({ lean: async () => [payment, { ...payment, _id: 'paid', lastConfirmedMonth: '2026-02' }] })
    await jobs.get('*/5 8 * * *')!()
    expect(mocks.send).toHaveBeenCalledExactlyOnceWith(
      'owner', expect.objectContaining({ title: expect.stringContaining('сьогодні') }),
      expect.objectContaining({ key: 'recurring-payment-2026-02-28-2026-02-28' }),
    )
  })

  it('finds tomorrow’s repeating workout a day early and keeps it pending for a failed device', async () => {
    vi.setSystemTime(new Date('2026-11-16T13:00:00Z'))
    mocks.workouts.mockReturnValue({
      lean: async () => [{
        _id: 'workout', userId: 'owner', spaceId: 'space', date: '2026-11-17',
        time: '15:00', repeat: 'weekly', repeatConfig: null,
        reminder: { amount: 1, unit: 'days' },
      }],
    })
    mocks.send.mockResolvedValue({ accepted: 1, pending: 1 })
    const tick = jobs.get('*/5 * * * *')!
    await tick()
    expect(mocks.send).toHaveBeenCalledExactlyOnceWith(
      'owner', expect.objectContaining({ tag: 'workout-workout-2026-11-17' }),
      expect.objectContaining({ expiresAt: Date.parse('2026-11-16T14:00:00Z') }),
    )
    expect(mocks.updateWorkout).not.toHaveBeenCalled()

    mocks.send.mockResolvedValue({ accepted: 2, pending: 0 })
    await tick()
    expect(mocks.updateWorkout).toHaveBeenCalledWith(expect.anything(), {
      $set: { reminderSentFor: '2026-11-17' },
    })
  })
})
