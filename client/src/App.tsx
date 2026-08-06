import React, { useEffect, useRef, Suspense, lazy } from 'react'
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
// Critical first-paint screens — loaded eagerly (no Suspense flash on the most common entry points)
import Dashboard from '@/features/dashboard'
import LoginScreen from '@/features/auth/Login'
import RegisterScreen from '@/features/auth/Register'
import Landing from '@/features/auth/Landing'
// Everything else — route-level code splitting, loaded on demand
const Finance = lazy(() => import('@/features/finance'))
const F1Screen = lazy(() => import('@/features/f1'))
const F1Live = lazy(() => import('@/features/f1/live'))
const RaceDetailPage = lazy(() => import('@/features/f1/raceDetail'))
const MySeasonPage = lazy(() => import('@/features/f1/mySeasonPage'))
const DriverDetailPage = lazy(() => import('@/features/f1/driverDetail'))
const Sprint = lazy(() => import('@/features/sprint'))
const Recipes = lazy(() => import('@/features/recipes'))
const RecipeDetailScreen = lazy(() => import('@/features/recipes/detail'))
const MealPlannerScreen = lazy(() => import('@/features/recipes/planner'))
const ShoppingListScreen = lazy(() => import('@/features/sprint/shoppingList'))
const Watchlist = lazy(() => import('@/features/watchlist'))
const MemoriesScreen = lazy(() => import('@/features/memories'))
const MemoryDetailScreen = lazy(() => import('@/features/memories/detail'))
const SpaceDetailScreen = lazy(() => import('@/features/spaces'))
const ProfilePage = lazy(() => import('@/features/profile'))
const ProfileSubPage = lazy(() => import('@/features/profile/ProfileSubPage'))
const MeAppearance = lazy(() => import('@/features/profile/MeAppearance'))
const MeModules = lazy(() => import('@/features/profile/MeModules'))
const MeFamily = lazy(() => import('@/features/profile/MeFamily'))
const AdminTab = lazy(() => import('@/features/profile/AdminTab'))
const MeAccount = lazy(() => import('@/features/profile/MeAccount'))
const MeLevels = lazy(() => import('@/features/profile/MeLevels'))
const VerifyEmail = lazy(() => import('@/features/auth/VerifyEmail'))
const ForgotPasswordScreen = lazy(() => import('@/features/auth/ForgotPassword'))
const ResetPasswordScreen = lazy(() => import('@/features/auth/ResetPassword'))
const NotFound = lazy(() => import('@/features/auth/NotFound'))
const NotesScreen = lazy(() => import('@/features/notes'))
const TimelineScreen = lazy(() => import('@/features/timeline'))
const YearbookScreen = lazy(() => import('@/features/auth/Yearbook'))
const OnboardingScreen = lazy(() => import('@/features/auth/Onboarding'))
const TermsPage = lazy(() => import('@/features/auth/TermsPage'))
const PrivacyPage = lazy(() => import('@/features/auth/PrivacyPage'))
const PaymentResult = lazy(() => import('@/features/auth/PaymentResult'))
const DrinkDetail = lazy(() => import('@/features/drinks/detail'))
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

/** "/" — Landing for guests (no token), Dashboard for authenticated users */
const RootRoute: React.FC = () => {
  const { token, activeProfile } = useProfileStore()
  if (!token) return <Landing />
  if (activeProfile && activeProfile.onboardingCompleted === false) {
    return <Navigate to="/onboarding" replace />
  }
  return <Dashboard />
}

/** Redirects users without f1Enabled or footballEnabled to / */
const F1Route: React.FC = () => {
  const { activeProfile } = useProfileStore()
  if (!activeProfile?.f1Enabled && !activeProfile?.footballEnabled) return <Navigate to="/" replace />
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
      <Suspense fallback={<div className="routeFallback"><span /></div>}>
      <Routes location={location}>
        {/* Public */}
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/verify" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
        <Route path="/reset-password" element={<ResetPasswordScreen />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/payment/result" element={<PaymentResult />} />
        <Route path="/" element={<RootRoute />} />
        {/* Protected — require token */}
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<OnboardingScreen />} />
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
          <Route path="/profile/family"     element={<MeFamily />} />
          <Route path="/profile/account"    element={<ProfileSubPage title="НАЛАШТУВАННЯ"><MeAccount /></ProfileSubPage>} />
          <Route path="/profile/levels"     element={<ProfileSubPage title="ШЛЯХ РІВНІВ" fullBleed darkHeader><MeLevels /></ProfileSubPage>} />
          <Route path="/profile/admin"      element={<ProfileSubPage title="АДМІН"><AdminTab /></ProfileSubPage>} />
          <Route path="/notes" element={<NotesScreen />} />
          <Route path="/timeline" element={<TimelineScreen />} />
          <Route path="/yearbook/:year" element={<YearbookScreen />} />
          <Route path="/games" element={<Navigate to="/watchlist" replace />} />
          <Route path="/drinks/:id" element={<DrinkDetail />} />

          {/* F1 module — f1Enabled only */}
          <Route element={<F1Route />}>
            <Route path="/f1" element={<F1Screen />} />
            <Route path="/f1/live" element={<F1Live />} />
            <Route path="/f1/my-season" element={<MySeasonPage />} />
            <Route path="/f1/drivers/:driverId" element={<DriverDetailPage />} />
            <Route path="/f1/:round" element={<RaceDetailPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </div>
  )
}

const NavGuard: React.FC = () => {
  const { pathname } = useLocation()
  const { token } = useProfileStore()
  if (!token) return null
  if (/^\/f1\/\d+$/.test(pathname)) return null
  if (pathname === '/f1/my-season') return null
  if (/^\/f1\/drivers\/.+/.test(pathname)) return null
  if (/^\/memories\/.+/.test(pathname)) return null
  if (/^\/spaces\/.+/.test(pathname)) return null
  if (pathname === '/recipes/planner') return null
  if (/^\/recipes\/.+/.test(pathname)) return null
  if (pathname === '/shopping') return null
  if (pathname === '/notes') return null
  if (/^\/profile\/.+/.test(pathname)) return null
  if (pathname === '/login') return null
  if (pathname === '/register') return null
  if (pathname === '/forgot-password') return null
  if (pathname === '/reset-password') return null
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
  const { isInstallable, isIOS, isStandalone, isDismissed, promptInstall, dismiss } = usePwaInstall()
  const cityAutoLocateRef = useRef(false)

  useEffect(() => {
    if (token) refreshProfile()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Re-sync profile when the app returns to the foreground — catches out-of-band
  // server-side changes (e.g. email verified via a link opened outside this tab)
  // that the already-running app has no other way to learn about.
  useEffect(() => {
    if (!token) return
    const handleVisibility = () => {
      if (!document.hidden) refreshProfile()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
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

  // Manually nudge the SW's offline write-queue to replay on reconnect — the
  // Background Sync API (which the queue otherwise relies on) doesn't exist on
  // iOS Safari at all, so without this, queued writes made offline on iOS would
  // just sit there until the SW happens to restart, if ever.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const replayQueue = () => {
      navigator.serviceWorker.controller?.postMessage({ type: 'REPLAY_QUEUE' })
    }
    window.addEventListener('online', replayQueue)
    return () => window.removeEventListener('online', replayQueue)
  }, [])

  useEffect(() => {
    if (!token || !activeProfile || !isSupported || isSubscribed) return
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
  }, [token, activeProfile, isSupported, isSubscribed])

  useEffect(() => {
    if (!token || !activeProfile || activeProfile.city || cityAutoLocateRef.current) return
    if (!navigator.geolocation) return
    // Only auto-locate if permission was already granted — never show the browser dialog automatically
    navigator.permissions?.query({ name: 'geolocation' }).then(status => {
      if (status.state !== 'granted') return
      cityAutoLocateRef.current = true
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const found = await reverseGeocodeCity(pos.coords.latitude, pos.coords.longitude)
            if (found) await updateProfile({ city: found })
          } catch {
            // ignore — user can set city manually in settings
          }
        },
        () => {},
        { timeout: 8000 },
      )
    }).catch(() => {})
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
      {(isInstallable || isIOS) && !isStandalone && !isDismissed && (
        <PwaInstallBanner isIOS={isIOS} onInstall={promptInstall} onDismiss={dismiss} />
      )}
    </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
