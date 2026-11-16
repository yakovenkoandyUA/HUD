import { authFetch } from '@/shared/services/api'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

export function canUsePush(): boolean {
  return Boolean(VAPID_PUBLIC_KEY) && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

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
  if (!canUsePush()) return false

  try {
    const permission = Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission
    if (permission !== 'granted') return false
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
    return await syncPushSubscription(sub)
  } catch {
    return false
  }
}

export async function syncPushSubscription(sub: PushSubscription): Promise<boolean> {
  const response = await authFetch('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(sub.toJSON()),
  })
  return response.ok
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    const response = await authFetch('/api/push/unsubscribe', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint: sub.endpoint }),
    })
    if (!response.ok) throw new Error('Could not remove push subscription')
    await sub.unsubscribe()
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
