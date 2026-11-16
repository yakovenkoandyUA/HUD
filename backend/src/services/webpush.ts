import webpush, { PushSubscription, SendResult } from 'web-push'
import PushSubscriptionModel from '../models/PushSubscription'

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
  payload: { title: string; body: string; icon?: string; url?: string; tag?: string },
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
  payload: { title: string; body: string; icon?: string; url?: string; tag?: string },
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

export async function sendToAll(
  subscriptions: Array<{ endpoint: string; keys: { p256dh: string; auth: string }; id: string }>,
  payload: { title: string; body: string; icon?: string; url?: string; tag?: string },
  onExpired?: (id: string) => Promise<void>
): Promise<void> {
  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload)
      } catch (err: unknown) {
        if ((err as { expired?: boolean }).expired && onExpired) {
          await onExpired(sub.id)
        }
      }
    })
  )
}
