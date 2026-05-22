import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import PushSubscription from '../models/PushSubscription'
import { sendNotification } from '../services/webpush'

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

// POST /api/push/test
router.post('/test', async (req: Request, res: Response): Promise<void> => {
  const sub = await PushSubscription.findOne({ userId: req.userId })
  if (!sub) {
    res.status(404).json({ error: 'No subscription found for this user' })
    return
  }
  try {
    await sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys },
      { title: 'HUD Test 🏎', body: 'Push notifications work!', url: '/f1' }
    )
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Failed to send notification' })
  }
})

export default router
