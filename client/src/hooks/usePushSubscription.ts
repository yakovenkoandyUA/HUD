import { useState, useEffect } from 'react'
import { authFetch } from '../services/api'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export function usePushSubscription() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [loading, setLoading]         = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      console.warn('[push] Service workers not supported')
      return
    }
    if (!('PushManager' in window)) {
      console.warn('[push] PushManager not supported')
      return
    }
    if (!VAPID_KEY) {
      console.warn('[push] VITE_VAPID_PUBLIC_KEY is not set — push disabled')
      return
    }
    setIsSupported(true)
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => {
        console.log('[push] existing subscription:', sub ? sub.endpoint.slice(-20) : 'none')
        setIsSubscribed(!!sub)
      })
    )
  }, [])

  const subscribe = async (): Promise<boolean> => {
    if (!isSupported || !VAPID_KEY) return false
    setLoading(true)
    try {
      console.log('[push] awaiting service worker ready…')
      const reg = await navigator.serviceWorker.ready
      console.log('[push] SW active, calling pushManager.subscribe…')
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY) as BufferSource,
      })
      console.log('[push] browser subscription created:', sub.endpoint.slice(-20))
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      const res = await authFetch('/api/push/subscribe', {
        method: 'POST',
        body: JSON.stringify(json),
      })
      if (!res.ok) throw new Error(`Server rejected subscription (${res.status})`)
      console.log('[push] subscription saved to backend ✓')
      setIsSubscribed(true)
      return true
    } catch (e) {
      console.error('[push] subscribe failed:', e)
      return false
    } finally {
      setLoading(false)
    }
  }

  const unsubscribe = async (): Promise<void> => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await authFetch('/api/push/unsubscribe', {
          method: 'DELETE',
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setIsSubscribed(false)
    } finally {
      setLoading(false)
    }
  }

  const sendTest = async (): Promise<void> => {
    await authFetch('/api/push/test', { method: 'POST' })
  }

  return { isSubscribed, isSupported, loading, subscribe, unsubscribe, sendTest }
}
