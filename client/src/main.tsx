import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.tsx'
import { runCacheMigration } from './utils/appCache'

runCacheMigration()

// Apply stored theme before React mounts to prevent flash
try {
  const stored = JSON.parse(localStorage.getItem('hud-ui') || '{}')
  const theme = stored?.state?.theme ?? 'warm'
  document.documentElement.setAttribute('data-theme', theme)
} catch {
  document.documentElement.setAttribute('data-theme', 'warm')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
