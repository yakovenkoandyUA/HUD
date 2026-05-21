import webpush from 'web-push'

export function initWebPush(): void {
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) {
    console.warn('⚠️  VAPID keys not set — push notifications disabled')
    return
  }
  webpush.setVapidDetails('mailto:admin@hud.app', pub, priv)
  console.log('✅ Web Push initialized')
}

export { webpush }
