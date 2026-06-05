import { authFetch } from '../services/api'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const buf = new ArrayBuffer(rawData.length)
  const output = new Uint8Array(buf)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

export async function subscribeToPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  if (!VAPID_PUBLIC_KEY) return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
    await authFetch('/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify(sub.toJSON()),
    })
    return true
  } catch {
    return false
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    await sub.unsubscribe()
    await authFetch('/api/push/unsubscribe', { method: 'DELETE' })
  }
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    return !!sub
  } catch {
    return false
  }
}
