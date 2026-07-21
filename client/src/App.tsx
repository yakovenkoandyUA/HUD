import React, { useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import BottomNav from '@/shared/components/layout/BottomNav'
import ToastContainer from '@/shared/components/ui/Toast'
import AchievementUnlockedModal from '@/shared/components/ui/AchievementUnlockedModal'
import MimirAchievementLayer from '@/shared/components/ui/MimirAchievementLayer'
import AutoUnlockWatcher from '@/shared/components/ui/AutoUnlockWatcher'
import PinLock from '@/shared/components/ui/PinLock'
import { useProfileStore } from '@/shared/store/profileStore'
import { useUiStore } from '@/shared/store/uiStore'
import { usePushSubscription } from '@/shared/hooks/usePushSubscription'
import { reverseGeocodeCity } from '@/features/memories/utils/geocode'
import Dashboard from '@/features/dashboard'
import Finance from '@/features/finance'
import F1Screen from '@/features/f1'
import F1Live from '@/features/f1/live'
import RaceDetailPage from '@/features/f1/raceDetail'
import MySeasonPage from '@/features/f1/mySeasonPage'
import Sprint from '@/features/sprint'
import Recipes from '@/features/recipes'
import RecipeDetailScreen from '@/features/recipes/detail'
import MealPlannerScreen from '@/features/recipes/planner'
import ShoppingListScreen from '@/features/sprint/shoppingList'
import Watchlist from '@/features/watchlist'
import MemoriesScreen from '@/features/memories'
import MemoryDetailScreen from '@/features/memories/detail'
import SpaceDetailScreen from '@/features/spaces'
import LoginScreen from '@/features/auth/Login'
import RegisterScreen from '@/features/auth/Register'
import ProfilePage from '@/features/profile'
import ProfileSubPage from '@/features/profile/ProfileSubPage'
import MeAppearance from '@/features/profile/MeAppearance'
import MeModules from '@/features/profile/MeModules'
import MeFamily from '@/features/profile/MeFamily'
import AdminTab from '@/features/profile/AdminTab'
import MeAccount from '@/features/profile/MeAccount'
import VerifyEmail from '@/features/auth/VerifyEmail'
import NotFound from '@/features/auth/NotFound'
import NotesScreen from '@/features/notes'
import TimelineScreen from '@/features/timeline'
import YearbookScreen from '@/features/auth/Yearbook'
import OnboardingScreen from '@/features/auth/Onboarding'
import TermsPage from '@/features/auth/TermsPage'
import PrivacyPage from '@/features/auth/PrivacyPage'
import PaymentResult from '@/features/auth/PaymentResult'
import PwaInstallBanner from '@/shared/components/ui/PwaInstallBanner'
import { usePwaInstall } from '@/shared/hooks/usePwaInstall'
import ErrorBoundary from '@/shared/components/ui/ErrorBoundary'
import './App.css'

const PIN_TIMEOUT_MS = 5 * 60 * 1000 // 5 хв
const PIN_BG_KEY = 'hud-pin-bg-time'

/** Redirects to /login if no token; to /onboarding if onboarding not yet completed */
const ProtectedRoute: React.FC = () => {
  const { token, activeProfile } = useProfileStore()
  const { pathname } = useLocation()
  if (!token) return <Navigate to="/login" replace />
  if (activeProfile && activeProfile.onboardingCompleted === false && pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }
  return <Outlet />
}

/** Redirects users without f1Enabled to / */
const F1Route: React.FC = () => {
  const { activeProfile } = useProfileStore()
  if (!activeProfile?.f1Enabled) return <Navigate to="/" replace />
  return <Outlet />
}

function pageSlug(pathname: string): string {
  if (pathname.startsWith('/f1')) return 'f1'
  if (pathname.startsWith('/memories')) return 'memories'
  const seg = pathname.split('/')[1]
  return seg || 'home'
}

const AnimatedRoutes: React.FC = () => {
  const location = useLocation()

  useEffect(() => {
    document.documentElement.dataset.page = pageSlug(location.pathname)
  }, [location.pathname])

  return (
    <div key={location.pathname} className="pageWrapper">
      <Routes location={location}>
        {/* Public */}
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/verify" element={<VerifyEmail />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/payment/result" element={<PaymentResult />} />
        <Route path="/profile-select" element={<Navigate to="/login" replace />} />

        {/* Protected — require token */}
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<OnboardingScreen />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/sprint" element={<Sprint />} />
          <Route path="/recipes" element={<Recipes />} />
          <Route path="/recipes/planner" element={<MealPlannerScreen />} />
          <Route path="/recipes/:id" element={<RecipeDetailScreen />} />
          <Route path="/shopping" element={<ShoppingListScreen />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/memories" element={<MemoriesScreen />} />
          <Route path="/memories/:id" element={<MemoryDetailScreen />} />
          <Route path="/spaces/:spaceId" element={<SpaceDetailScreen />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/appearance" element={<ProfileSubPage title="ВИГЛЯД"><MeAppearance /></ProfileSubPage>} />
          <Route path="/profile/modules"    element={<ProfileSubPage title="ПРОСТОРИ"><MeModules /></ProfileSubPage>} />
          <Route path="/profile/family"     element={<ProfileSubPage title="БЛИЗЬКІ"><MeFamily /></ProfileSubPage>} />
          <Route path="/profile/account"    element={<ProfileSubPage title="НАЛАШТУВАННЯ"><MeAccount /></ProfileSubPage>} />
          <Route path="/profile/admin"      element={<ProfileSubPage title="АДМІН"><AdminTab /></ProfileSubPage>} />
          <Route path="/notes" element={<NotesScreen />} />
          <Route path="/timeline" element={<TimelineScreen />} />
          <Route path="/yearbook/:year" element={<YearbookScreen />} />
          <Route path="/games" element={<Navigate to="/watchlist" replace />} />

          {/* F1 module — f1Enabled only */}
          <Route element={<F1Route />}>
            <Route path="/f1" element={<F1Screen />} />
            <Route path="/f1/live" element={<F1Live />} />
            <Route path="/f1/my-season" element={<MySeasonPage />} />
            <Route path="/f1/:round" element={<RaceDetailPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  )
}

const NavGuard: React.FC = () => {
  const { pathname } = useLocation()
  if (/^\/f1\/\d+$/.test(pathname)) return null
  if (pathname === '/f1/my-season') return null
  if (/^\/memories\/.+/.test(pathname)) return null
  if (/^\/spaces\/.+/.test(pathname)) return null
  if (pathname === '/recipes/planner') return null
  if (/^\/recipes\/.+/.test(pathname)) return null
  if (pathname === '/shopping') return null
  if (pathname === '/notes') return null
  if (/^\/profile\/.+/.test(pathname)) return null
  if (pathname === '/login') return null
  if (pathname === '/register') return null
  if (pathname === '/profile-select') return null
  if (pathname === '/onboarding') return null
  return <BottomNav />
}

/** Tracks user inactivity and locks app with PIN after timeout */
const PinGuard: React.FC = () => {
  const { activeProfile, pinLocked, lockWithPIN } = useProfileStore()
  const lastActivity = useRef(Date.now())

  useEffect(() => {
    if (!activeProfile?.hasPIN) return

    // Lock on every fresh page load (sessionStorage clears on tab close/reload)
    if (sessionStorage.getItem('hud-pin-session') !== '1') {
      lockWithPIN()
      return
    }

    // On mount: check if app was in background long enough to require PIN
    const savedBgTime = localStorage.getItem(PIN_BG_KEY)
    if (savedBgTime) {
      const elapsed = Date.now() - parseInt(savedBgTime, 10)
      if (elapsed >= PIN_TIMEOUT_MS) {
        lockWithPIN()
      } else {
        lastActivity.current = Date.now() - elapsed
      }
    }

    const resetTimer = () => {
      lastActivity.current = Date.now()
      localStorage.setItem(PIN_BG_KEY, String(lastActivity.current))
    }
    const events = ['mousemove', 'mousedown', 'touchstart', 'keydown', 'scroll'] as const
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))

    const handleVisibility = () => {
      if (document.hidden) {
        localStorage.setItem(PIN_BG_KEY, String(Date.now()))
      } else {
        const bg = localStorage.getItem(PIN_BG_KEY)
        if (bg && Date.now() - parseInt(bg, 10) >= PIN_TIMEOUT_MS) {
          lockWithPIN()
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    const interval = setInterval(() => {
      if (Date.now() - lastActivity.current >= PIN_TIMEOUT_MS) {
        lockWithPIN()
      }
    }, 30_000)

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      document.removeEventListener('visibilitychange', handleVisibility)
      clearInterval(interval)
    }
  }, [activeProfile?.hasPIN, lockWithPIN])

  if (!pinLocked) return null
  return <PinLock />
}

const App: React.FC = () => {

  const { token, activeProfile, updateProfile, refreshProfile } = useProfileStore()
  const { setUpdateAvailable } = useUiStore()
  const { isSupported, isSubscribed, subscribe } = usePushSubscription()
  const { isInstallable, isIOS, isDismissed, promptInstall, dismiss } = usePwaInstall()
  const cityAutoLocateRef = useRef(false)

  useEffect(() => {
    if (token) refreshProfile()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const watchForUpdate = () => {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setUpdateAvailable(true)
      })
    }
    if (navigator.serviceWorker.controller) {
      watchForUpdate()
    } else {
      navigator.serviceWorker.addEventListener('controllerchange', watchForUpdate, { once: true })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!token || !isSupported || isSubscribed || !activeProfile?.isVerified) return
    async function trySubscribe() {
      const perm = Notification.permission
      if (perm === 'denied') return
      const granted = perm === 'granted'
        ? true
        : await Notification.requestPermission().then(p => p === 'granted')
      if (!granted) return
      await subscribe()
    }
    trySubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isSupported, isSubscribed])

  useEffect(() => {
    if (!token || !activeProfile || activeProfile.city || cityAutoLocateRef.current) return
    if (!navigator.geolocation) return
    cityAutoLocateRef.current = true
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const found = await reverseGeocodeCity(pos.coords.latitude, pos.coords.longitude)
          if (found) await updateProfile({ city: found })
        } catch {
          // мовчки ігноруємо — користувач завжди може задати місто вручну в налаштуваннях
        }
      },
      () => {},
      { timeout: 8000 }
    )
  }, [token, activeProfile, updateProfile])

  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AnimatedRoutes />
      <NavGuard />
      <PinGuard />
      <ToastContainer />
      <AchievementUnlockedModal />
      <MimirAchievementLayer />
      <AutoUnlockWatcher />
      {(isInstallable || isIOS) && !isDismissed && (
        <PwaInstallBanner isIOS={isIOS} onInstall={promptInstall} onDismiss={dismiss} />
      )}
    </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
