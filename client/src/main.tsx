import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './styles/global.css'
import App from './App.tsx'
import { runCacheMigration } from '@/shared/utils/appCache'

Sentry.init({
  dsn: 'https://a9775f0abf0185947b076628bf8b681b@o4511556414603264.ingest.de.sentry.io/4511556432887888',
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.2,
})

runCacheMigration()

// Apply stored theme before React mounts to prevent flash
try {
  const stored = JSON.parse(localStorage.getItem('hud-ui') || '{}')
  const theme = stored?.state?.theme ?? 'velvet'
  document.documentElement.setAttribute('data-theme', theme)
} catch {
  document.documentElement.setAttribute('data-theme', 'velvet')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
