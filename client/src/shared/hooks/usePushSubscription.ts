import { useEffect, useState } from 'react'
import { authFetch } from '@/shared/services/api'
import { useProfileStore } from '@/shared/store/profileStore'
import { canUsePush, subscribeToPush, syncPushSubscription, unsubscribeFromPush } from '@/shared/utils/pushManager'

export function usePushSubscription() {
  const userId = useProfileStore(state => state.activeProfile?.id)
  const [subscriptionOwner, setSubscriptionOwner] = useState<string>()
  const isSupported = canUsePush()
  const isSubscribed = Boolean(userId && subscriptionOwner === userId)

  useEffect(() => {
    if (!isSupported || !userId) return
    let cancelled = false
    const sync = async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (cancelled) return
        const saved = sub && Notification.permission === 'granted' && await syncPushSubscription(sub)
        if (!cancelled) setSubscriptionOwner(saved ? userId : undefined)
      } catch {
        if (!cancelled) setSubscriptionOwner(undefined)
      }
    }
    void sync()
    return () => { cancelled = true }
  }, [isSupported, userId])

  const subscribe = async (): Promise<boolean> => {
    if (!userId) return false
    const saved = await subscribeToPush()
    setSubscriptionOwner(saved ? userId : undefined)
    return saved
  }

  const unsubscribe = async (): Promise<void> => {
    await unsubscribeFromPush()
    setSubscriptionOwner(undefined)
  }

  const sendTest = async (): Promise<void> => {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) {
      setSubscriptionOwner(undefined)
      throw new Error('Device subscription missing')
    }
    const res = await authFetch('/api/push/test', {
      method: 'POST',
      body: JSON.stringify({ endpoint: sub.endpoint }),
    })
    if (res.status === 410) {
      setSubscriptionOwner(undefined)
      await sub.unsubscribe()
    } else if (res.status === 404) {
      setSubscriptionOwner(undefined)
    }
    if (!res.ok) throw new Error('Push test failed')
  }

  return { isSubscribed, isSupported, subscribe, unsubscribe, sendTest }
}
