import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import PushSubscription from '../models/PushSubscription'
import { isWebPushConfigured, sendNotification } from '../services/webpush'

const router = Router()

router.use(requireAuth)

// POST /api/push/subscribe
router.post('/subscribe', async (req: Request, res: Response): Promise<void> => {
  const { endpoint, keys } = req.body as {
    endpoint: string
    keys: { p256dh: string; auth: string }
  }
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: 'Invalid subscription object' })
    return
  }
  await PushSubscription.findOneAndUpdate(
    { endpoint },
    { endpoint, keys, userId: req.userId },
    { upsert: true, new: true }
  )
  res.json({ success: true })
})

// DELETE /api/push/unsubscribe
router.delete('/unsubscribe', async (req: Request, res: Response): Promise<void> => {
  const { endpoint } = req.body as { endpoint: string }
  await PushSubscription.deleteOne({ endpoint, userId: req.userId })
  res.json({ success: true })
})

// POST /api/push/test — the browser sends its current endpoint.
router.post('/test', async (req: Request, res: Response, next): Promise<void> => {
  const endpoint = req.body?.endpoint
  if (typeof endpoint !== 'string' || !endpoint) {
    res.status(400).json({ error: 'Device subscription required' })
    return
  }
  if (!isWebPushConfigured()) {
    res.status(503).json({ error: 'Web Push is unavailable' })
    return
  }
  try {
    const sub = await PushSubscription.findOne({ userId: req.userId, endpoint })
    if (!sub) {
      res.status(404).json({ error: 'Device subscription not found' })
      return
    }
    const result = await sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys },
      { title: 'Тестове сповіщення MIMIR', body: 'Цей пристрій отримує push-сповіщення.', url: '/profile', tag: 'push-test' },
      60,
    ).catch(async (error: unknown) => {
      if (!(error as { expired?: boolean }).expired) throw error
      await PushSubscription.deleteOne({ _id: sub._id, userId: req.userId, 'keys.auth': sub.keys.auth, 'keys.p256dh': sub.keys.p256dh })
      return 'expired' as const
    })
    if (result === 'expired') {
      res.status(410).json({ error: 'Device subscription expired' })
      return
    }
    if (!result) {
      res.status(502).json({ error: 'Push service rejected the notification' })
      return
    }
    res.json({ accepted: true })
  } catch (error) {
    next(error)
  }
})

export default router
