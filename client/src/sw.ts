/// <reference lib="webworker" />
/// <reference lib="es2015" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute, NavigationRoute, Route } from 'workbox-routing'
import { NetworkFirst, CacheFirst, NetworkOnly } from 'workbox-strategies'
import { BackgroundSyncPlugin } from 'workbox-background-sync'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()

// ── Static assets: CacheFirst (JS/CSS/icons/fonts) ───────────────────────────
precacheAndRoute(self.__WB_MANIFEST)

// ── API GET calls: NetworkFirst, fallback to cache (30s timeout) ─────────────
const API_URL = 'https://hud-production.up.railway.app'

registerRoute(
  ({ url, request }) =>
    url.origin === API_URL && request.method === 'GET',
  new NetworkFirst({
    cacheName: 'api-cache-v1',
    networkTimeoutSeconds: 8,
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 5 * 60 }),
    ],
  })
)

// ── API write calls (POST/PATCH/PUT/DELETE): NetworkOnly + Background Sync ───
const bgSyncPlugin = new BackgroundSyncPlugin('api-write-queue', {
  maxRetentionTime: 24 * 60, // 24h
})

registerRoute(
  ({ url, request }) =>
    url.origin === API_URL &&
    ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method),
  new NetworkOnly({ plugins: [bgSyncPlugin] }),
  'POST'
)

// ── Images: CacheFirst with expiration ───────────────────────────────────────
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache-v1',
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  })
)

// ── SW lifecycle ─────────────────────────────────────────────────────────────
self.addEventListener('install', () => { self.skipWaiting() })
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()) })

// ── Push notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event: PushEvent) => {
  const data = event.data?.json() as {
    title: string; body: string; icon?: string; url?: string
  } | undefined
  if (!data) return
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon ?? '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url ?? '/' },
    })
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? '/'
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(url))
        if (existing) return existing.focus()
        return self.clients.openWindow(url)
      })
  )
})
