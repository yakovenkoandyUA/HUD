import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ schedule: vi.fn(), findEvents: vi.fn(), findSpace: vi.fn(), send: vi.fn() }))
vi.mock('node-cron', () => ({ default: { schedule: mocks.schedule } }))
vi.mock('../models/PetEvent', () => ({ PetEvent: { find: mocks.findEvents } }))
vi.mock('../models/Space', () => ({ Space: { findOne: mocks.findSpace } }))
vi.mock('../services/webpush', () => ({ isWebPushConfigured: () => true, sendScheduledPushToUser: mocks.send }))
import './petCareReminders'

describe('pet care push', () => {
  it('sends a current vaccination to space members and skips an outdated medicine reminder', async () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-11-16T07:00:00Z'))
      mocks.findEvents.mockReturnValue({ sort: () => ({ lean: async () => [
        { _id: 'latest', spaceId: 'pet', type: 'medication', medicationName: 'Ліки', nextDue: '2026-11-18' },
        { _id: 'old', spaceId: 'pet', type: 'medication', medicationName: 'Ліки', nextDue: '2026-11-16' },
        { _id: 'vaccine', spaceId: 'pet', type: 'vaccination', title: 'Щеплення', nextDue: '2026-11-16' },
      ] }) })
      mocks.findSpace.mockReturnValue({ select: () => ({ lean: async () => ({
        petProfile: { name: 'Фібі' }, members: [{ userId: 'owner' }, { userId: 'member' }],
      }) }) })
      const [, run] = mocks.schedule.mock.calls[0]
      await run()
      expect(mocks.send).toHaveBeenCalledTimes(2)
      for (const user of ['owner', 'member']) {
        expect(mocks.send).toHaveBeenCalledWith(
          user, expect.objectContaining({ title: 'Сьогодні щеплення', url: '/spaces/pet' }),
          { key: 'pet-care-vaccine-2026-11-16', expiresAt: Date.parse('2026-11-16T08:00:00Z') },
        )
      }
    } finally {
      vi.useRealTimers()
    }
  })
})
