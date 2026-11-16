import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  findSubscriptions: vi.fn(),
  deleteSubscription: vi.fn(),
  findReceipts: vi.fn(),
  updateReceipt: vi.fn(),
}))
vi.mock('web-push', () => ({ default: { sendNotification: mocks.send } }))
vi.mock('../models/PushSubscription', () => ({
  default: { find: mocks.findSubscriptions, deleteOne: mocks.deleteSubscription },
}))
vi.mock('../models/PushSendReceipt', () => ({
  default: { find: mocks.findReceipts, updateOne: mocks.updateReceipt },
}))

import { sendScheduledPushToUser } from './webpush'

describe('scheduled Web Push', () => {
  const devices = ['desktop', 'phone'].map(endpoint => ({
    _id: endpoint, endpoint, keys: { auth: 'test-auth', p256dh: 'test-key' },
  }))
  const payload = { title: 'Test reminder', body: 'Test content' }
  const occurrence = { key: 'quest-occurrence', expiresAt: Date.parse('2026-11-16T12:15:00Z') }
  const receipts = new Map<string, { accepted?: boolean; leaseUntil?: Date }>()

  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-16T12:00:00Z'))
    vi.stubEnv('VAPID_PUBLIC_KEY', 'test')
    vi.stubEnv('VAPID_PRIVATE_KEY', 'test')
    receipts.clear()
    mocks.findSubscriptions.mockReturnValue({ lean: async () => devices })
    mocks.findReceipts.mockImplementation((filter: { _id: { $in: string[] } }) => ({
      select: () => ({
        lean: async () => filter._id.$in.filter(id => receipts.get(id)?.accepted).map(_id => ({ _id })),
      }),
    }))
    mocks.updateReceipt.mockImplementation(async (
      filter: { _id: string; leaseUntil?: Date },
      update: { $set?: { accepted?: boolean; leaseUntil?: Date }; $unset?: { leaseUntil: string } },
      options?: { upsert?: boolean },
    ) => {
      const receipt = receipts.get(filter._id) ?? {}
      if (options?.upsert && (receipt.accepted || (receipt.leaseUntil && receipt.leaseUntil.getTime() > Date.now()))) {
        throw Object.assign(new Error('Already claimed'), { code: 11000 })
      }
      if (filter.leaseUntil && filter.leaseUntil !== receipt.leaseUntil) return
      Object.assign(receipt, update.$set)
      if (update.$unset) delete receipt.leaseUntil
      receipts.set(filter._id, receipt)
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  it('retries only the phone after partial push-service acceptance', async () => {
    mocks.send.mockImplementation(async ({ endpoint }) => {
      if (endpoint === 'phone') throw Object.assign(new Error('Unavailable'), { statusCode: 503 })
      return { statusCode: 201 }
    })
    expect(await sendScheduledPushToUser('owner', payload, occurrence)).toEqual({ accepted: 1, pending: 1 })
    mocks.send.mockClear().mockResolvedValue({ statusCode: 201 })
    vi.advanceTimersByTime(60_000)

    expect(await sendScheduledPushToUser('owner', payload, occurrence)).toEqual({ accepted: 2, pending: 0 })
    expect(mocks.send).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ endpoint: 'phone' }), JSON.stringify(payload), { TTL: 840, timeout: 15000 },
    )
    mocks.send.mockClear()
    await sendScheduledPushToUser('owner', payload, occurrence)
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it('allows only one in-flight send per device and occurrence', async () => {
    mocks.send.mockResolvedValue({ statusCode: 201 })
    await Promise.all([
      sendScheduledPushToUser('owner', payload, occurrence),
      sendScheduledPushToUser('owner', payload, occurrence),
    ])
    expect(mocks.send).toHaveBeenCalledTimes(2)
  })

  it('removes a dead subscription and leaves no retry for it', async () => {
    mocks.send.mockImplementation(async ({ endpoint }) => {
      if (endpoint === 'phone') throw Object.assign(new Error('Gone'), { statusCode: 410 })
      return { statusCode: 201 }
    })
    expect(await sendScheduledPushToUser('owner', payload, occurrence)).toEqual({ accepted: 1, pending: 0 })
    expect(mocks.deleteSubscription).toHaveBeenCalledWith(expect.objectContaining({ _id: 'phone', userId: 'owner' }))
  })

  it('discards an expired occurrence before loading any devices', async () => {
    vi.setSystemTime(occurrence.expiresAt)
    expect(await sendScheduledPushToUser('owner', payload, occurrence)).toEqual({ accepted: 0, pending: 0 })
    expect(mocks.findSubscriptions).not.toHaveBeenCalled()
  })
})
