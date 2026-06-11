import React, { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import BottomNav from './components/layout/BottomNav'
import ToastContainer from './components/ui/Toast'
import PwaInstallBanner from './components/ui/PwaInstallBanner'
import CitySplash from './components/ui/CitySplash'
import PinLock from './components/ui/PinLock'
import { usePwaInstall } from './hooks/usePwaInstall'
import { useProfileStore } from './store/profileStore'
import { useUiStore } from './store/uiStore'
import { usePushSubscription } from './hooks/usePushSubscription'
import Dashboard from './screens/Dashboard'
import Finance from './screens/Finance'
import F1Screen from './screens/F1'
import RaceDetailPage from './screens/RaceDetail'
import MySeasonPage from './screens/MySeasonPage'
import Sprint from './screens/Sprint'
import Recipes from './screens/Recipes'
import RecipeDetailScreen from './screens/RecipeDetail'
import ShoppingListScreen from './screens/ShoppingList'
import Watchlist from './screens/Watchlist'
import MemoriesScreen from './screens/Memories'
import MemoryDetailScreen from './screens/MemoryDetail'
import LoginScreen from './screens/Login'
import RegisterScreen from './screens/Register'
import ProfilePage from './screens/ProfilePage'
import VerifyEmail from './screens/VerifyEmail'
import './App.css'

const PIN_TIMEOUT_MS = 5 * 60 * 1000 // 5 хв

/** Redirects to /login if no token */
const ProtectedRoute: React.FC = () => {
  const { token } = useProfileStore()
  if (!token) return <Navigate to="/login" replace />
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
        <Route path="/profile-select" element={<Navigate to="/login" replace />} />

        {/* Protected — require token */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/sprint" element={<Sprint />} />
          <Route path="/recipes" element={<Recipes />} />
          <Route path="/recipes/:id" element={<RecipeDetailScreen />} />
          <Route path="/shopping" element={<ShoppingListScreen />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/memories" element={<MemoriesScreen />} />
          <Route path="/memories/:id" element={<MemoryDetailScreen />} />
          <Route path="/profile" element={<ProfilePage />} />

          {/* F1 module — f1Enabled only */}
          <Route element={<F1Route />}>
            <Route path="/f1" element={<F1Screen />} />
            <Route path="/f1/my-season" element={<MySeasonPage />} />
            <Route path="/f1/:round" element={<RaceDetailPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

const NavGuard: React.FC = () => {
  const { pathname } = useLocation()
  if (/^\/f1\/\d+$/.test(pathname)) return null
  if (pathname === '/f1/my-season') return null
  if (/^\/memories\/.+/.test(pathname)) return null
  if (/^\/recipes\/.+/.test(pathname)) return null
  if (pathname === '/shopping') return null
  if (pathname === '/login') return null
  if (pathname === '/register') return null
  if (pathname === '/profile-select') return null
  if (pathname === '/profile') return null
  return <BottomNav />
}

/** Tracks user inactivity and locks app with PIN after timeout */
const PinGuard: React.FC = () => {
  const { activeProfile, pinLocked, lockWithPIN } = useProfileStore()
  const lastActivity = useRef(Date.now())

  useEffect(() => {
    if (!activeProfile?.hasPIN) return

    const resetTimer = () => { lastActivity.current = Date.now() }
    const events = ['mousemove', 'mousedown', 'touchstart', 'keydown', 'scroll'] as const
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))

    const interval = setInterval(() => {
      if (Date.now() - lastActivity.current >= PIN_TIMEOUT_MS) {
        lockWithPIN()
      }
    }, 30_000)

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      clearInterval(interval)
    }
  }, [activeProfile?.hasPIN, lockWithPIN])

  if (!pinLocked) return null
  return <PinLock />
}

const App: React.FC = () => {
  const [splashDone, setSplashDone] = useState(
    () => sessionStorage.getItem('hud-city-splash') === '1'
  )
  const { isInstallable, isIOS, isDismissed, promptInstall, dismiss } = usePwaInstall()
  const { token, activeProfile } = useProfileStore()
  const { setUpdateAvailable } = useUiStore()
  const { isSupported, isSubscribed, subscribe } = usePushSubscription()

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

  const showBanner = !isDismissed && (isInstallable || isIOS)

  return (
    <BrowserRouter>
      <AnimatedRoutes />
      {showBanner && (
        <PwaInstallBanner
          isIOS={isIOS}
          onInstall={promptInstall}
          onDismiss={dismiss}
        />
      )}
      <NavGuard />
      <PinGuard />
      <ToastContainer />
      {!splashDone && <CitySplash onDone={() => setSplashDone(true)} />}
    </BrowserRouter>
  )
}

export default App
