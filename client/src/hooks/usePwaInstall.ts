import { useCallback, useEffect, useRef, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'hud_install_dismissed'
const DISMISS_TTL = 3 * 24 * 60 * 60 * 1000 // 3 days

function dismissed(): boolean {
  const ts = localStorage.getItem(DISMISS_KEY)
  if (!ts) return false
  return Date.now() - Number(ts) < DISMISS_TTL
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
}

function detectIOS(): boolean {
  return (
    (/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

interface UsePwaInstall {
  isInstallable: boolean
  isIOS: boolean
  isDismissed: boolean
  promptInstall: () => void
  dismiss: () => void
}

export function usePwaInstall(): UsePwaInstall {
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isDismissedState, setIsDismissedState] = useState(() => dismissed())
  const isIOS = detectIOS()

  useEffect(() => {
    if (isStandalone()) return

    const handler = (e: Event) => {
      e.preventDefault()
      promptRef.current = e as BeforeInstallPromptEvent
      setIsInstallable(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setIsDismissedState(true)
  }, [])

  const promptInstall = useCallback(async () => {
    const prompt = promptRef.current
    if (!prompt) return
    await prompt.prompt()
    await prompt.userChoice
    // Close banner regardless of outcome — prompt was already shown
    promptRef.current = null
    setIsInstallable(false)
    dismiss()
  }, [dismiss])

  return { isInstallable, isIOS, isDismissed: isDismissedState, promptInstall, dismiss }
}
