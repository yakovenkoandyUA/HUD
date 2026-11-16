import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<void>

const mocks = vi.hoisted(() => ({
  handlers: new Map<string, Handler>(),
  findOne: vi.fn(),
  deleteOne: vi.fn(),
  sendNotification: vi.fn(),
}))

vi.mock('express', () => ({
  Router: () => ({
    use: vi.fn(),
    delete: vi.fn(),
    post: (path: string, handler: Handler) => mocks.handlers.set(path, handler),
  }),
}))
vi.mock('../middleware/auth', () => ({ requireAuth: vi.fn() }))
vi.mock('../models/PushSubscription', () => ({
  default: { findOne: mocks.findOne, deleteOne: mocks.deleteOne },
}))
vi.mock('../services/webpush', () => ({
  isWebPushConfigured: () => true,
  sendNotification: mocks.sendNotification,
}))

import './push'

describe('POST /api/push/test', () => {
  const subscription = { endpoint: 'current-phone', keys: { p256dh: 'key', auth: 'auth' }, _id: 'sub-1' }

  beforeEach(() => { vi.resetAllMocks() })

  async function sendTest(endpoint?: string) {
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() }
    const next = vi.fn()
    await mocks.handlers.get('/test')!(
      { userId: 'user-1', body: { endpoint } } as Request,
      res as unknown as Response,
      next,
    )
    expect(next).not.toHaveBeenCalled()
    return res
  }

  it('targets the specified device under the authenticated user', async () => {
    mocks.findOne.mockResolvedValue(subscription)
    mocks.sendNotification.mockResolvedValue({ statusCode: 201 })
    const res = await sendTest(subscription.endpoint)
    expect(mocks.findOne).toHaveBeenCalledWith({ userId: 'user-1', endpoint: subscription.endpoint })
    expect(mocks.sendNotification).toHaveBeenCalledWith(
      { endpoint: subscription.endpoint, keys: subscription.keys }, expect.anything(), 60,
    )
    expect(res.json).toHaveBeenCalledWith({ accepted: true })
  })

  it('reports a provider failure', async () => {
    mocks.findOne.mockResolvedValue(subscription)
    mocks.sendNotification.mockResolvedValue(null)
    expect((await sendTest(subscription.endpoint)).status).toHaveBeenCalledWith(502)
  })

  it('removes an expired subscription and reports that the device must re-subscribe', async () => {
    mocks.findOne.mockResolvedValue(subscription)
    mocks.sendNotification.mockRejectedValue({ expired: true })
    expect((await sendTest(subscription.endpoint)).status).toHaveBeenCalledWith(410)
    expect(mocks.deleteOne).toHaveBeenCalledWith(expect.objectContaining({
      _id: subscription._id,
      userId: 'user-1',
    }))
  })

  it('rejects a request without a device endpoint without attempting a send', async () => {
    expect((await sendTest()).status).toHaveBeenCalledWith(400)
    expect(mocks.sendNotification).not.toHaveBeenCalled()
  })
})
