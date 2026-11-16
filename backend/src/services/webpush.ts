import webpush, { PushSubscription, SendResult } from 'web-push'
import { createHash } from 'node:crypto'
import PushSubscriptionModel from '../models/PushSubscription'
import PushSendReceipt from '../models/PushSendReceipt'

interface PushPayload { title: string; body: string; icon?: string; url?: string; tag?: string }

export function isWebPushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

export function initWebPush(): void {
  const pub   = process.env.VAPID_PUBLIC_KEY
  const priv  = process.env.VAPID_PRIVATE_KEY
  const email = process.env.VAPID_EMAIL || 'mailto:admin@hud.app'
  if (!pub || !priv) {
    console.warn('⚠️  VAPID keys not set — push notifications disabled')
    return
  }
  webpush.setVapidDetails(email, pub, priv)
  console.log('✅ Web Push initialized')
}

export async function sendNotification(
  subscription: PushSubscription,
  payload: PushPayload,
  ttlSeconds?: number
): Promise<SendResult | null> {
  try {
    return await webpush.sendNotification(subscription, JSON.stringify(payload), {
      timeout: 15000,
      ...(ttlSeconds !== undefined && { TTL: ttlSeconds }),
    })
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode
    if (status === 410 || status === 404) {
      // Subscription expired — caller should delete it from DB
      throw Object.assign(new Error('Subscription gone'), { expired: true })
    }
    console.error('[Push] Send failed', { status })
    return null
  }
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
  ttlSeconds?: number
): Promise<{ subscriptions: number; accepted: number }> {
  const subs = await PushSubscriptionModel.find({ userId })
  const results = await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        return Boolean(await sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload, ttlSeconds))
      } catch (err: unknown) {
        if ((err as { expired?: boolean }).expired) {
          await PushSubscriptionModel.deleteOne({ _id: sub._id, userId, 'keys.auth': sub.keys.auth, 'keys.p256dh': sub.keys.p256dh })
        }
        return false
      }
    })
  )
  return {
    subscriptions: subs.length,
    accepted: results.filter(result => result.status === 'fulfilled' && result.value).length,
  }
}

/** Retry the current occurrence only for device subscriptions that haven't accepted it. */
export async function sendScheduledPushToUser(
  userId: string,
  payload: PushPayload,
  occurrence: { key: string; expiresAt: number },
): Promise<{ accepted: number; pending: number }> {
  const now = Date.now()
  if (!isWebPushConfigured() || occurrence.expiresAt <= now) return { accepted: 0, pending: 0 }

  const subscriptions = await PushSubscriptionModel.find({ userId }).lean()
  const devices = subscriptions.map(sub => ({
    sub,
    id: createHash('sha256').update(JSON.stringify([
      userId, occurrence.key, String(sub._id), sub.keys.auth, sub.keys.p256dh,
    ])).digest('hex'),
  }))
  if (!devices.length) return { accepted: 0, pending: 0 }

  const receipts = await PushSendReceipt.find({
    _id: { $in: devices.map(device => device.id) },
    accepted: true,
  }).select('_id').lean()
  const acceptedIds = new Set(receipts.map(receipt => receipt._id))
  const results = await Promise.allSettled(devices.map(async ({ sub, id }) => {
    if (acceptedIds.has(id)) return 'accepted'
    if (occurrence.expiresAt - Date.now() < 1000) return 'finished'
    const leaseUntil = new Date(Date.now() + 60_000)
    try {
      await PushSendReceipt.updateOne({
        _id: id,
        accepted: { $ne: true },
        $or: [{ leaseUntil: null }, { leaseUntil: { $lte: new Date() } }],
      }, {
        $set: { leaseUntil },
        $setOnInsert: { expiresAt: new Date(occurrence.expiresAt) },
      }, { upsert: true })
    } catch (error) {
      // The same device is leased or was accepted after the lookup above.
      if ((error as { code?: number }).code === 11000) return 'pending'
      throw error
    }

    try {
      const ttl = Math.min(Math.floor((occurrence.expiresAt - Date.now()) / 1000), 86400)
      if (ttl <= 0) return 'finished'
      const result = await sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload, ttl)
      if (!result) return 'pending'
      await PushSendReceipt.updateOne({ _id: id, leaseUntil }, { $set: { accepted: true } })
      return 'accepted'
    } catch (error) {
      if (!(error as { expired?: boolean }).expired) throw error
      await PushSubscriptionModel.deleteOne({ _id: sub._id, userId, 'keys.auth': sub.keys.auth, 'keys.p256dh': sub.keys.p256dh })
      return 'finished'
    } finally {
      await PushSendReceipt.updateOne({ _id: id, leaseUntil }, { $unset: { leaseUntil: '' } })
    }
  }))

  return {
    accepted: results.filter(result => result.status === 'fulfilled' && result.value === 'accepted').length,
    pending: results.filter(result => result.status === 'rejected' || result.value === 'pending').length,
  }
}
