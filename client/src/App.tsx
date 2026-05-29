import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import BottomNav from './components/layout/BottomNav'
import ToastContainer from './components/ui/Toast'
import PwaInstallBanner from './components/ui/PwaInstallBanner'
import CitySplash from './components/ui/CitySplash'
import { usePwaInstall } from './hooks/usePwaInstall'
import { useProfileStore } from './store/profileStore'
import Dashboard from './screens/Dashboard'
import Finance from './screens/Finance'
import F1Screen from './screens/F1'
import RaceDetailPage from './screens/RaceDetail'
import Sprint from './screens/Sprint'
import Recipes from './screens/Recipes'
import RecipeDetailScreen from './screens/RecipeDetail'
import ShoppingListScreen from './screens/ShoppingList'
import Watchlist from './screens/Watchlist'
import MemoriesScreen from './screens/Memories'
import MemoryDetailScreen from './screens/MemoryDetail'
import ProfileSelectScreen from './screens/ProfileSelect'
import './App.css'

/** Redirects to /profile-select if no token */
const ProtectedRoute: React.FC = () => {
  const { token } = useProfileStore()
  if (!token) return <Navigate to="/profile-select" replace />
  return <Outlet />
}

/** Redirects non-admin users to / */
const AdminRoute: React.FC = () => {
  const { activeProfile } = useProfileStore()
  if (activeProfile?.role !== 'admin') return <Navigate to="/" replace />
  return <Outlet />
}

const AnimatedRoutes: React.FC = () => {
  const location = useLocation()

  return (
    <div key={location.pathname} className="pageWrapper">
      <Routes location={location}>
        {/* Public */}
        <Route path="/profile-select" element={<ProfileSelectScreen />} />

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

          {/* Admin only */}
          <Route element={<AdminRoute />}>
            <Route path="/f1" element={<F1Screen />} />
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
  if (/^\/memories\/.+/.test(pathname)) return null
  if (/^\/recipes\/.+/.test(pathname)) return null
  if (pathname === '/shopping') return null
  if (pathname === '/profile-select') return null
  return <BottomNav />
}

const App: React.FC = () => {
  const [splashDone, setSplashDone] = useState(
    () => sessionStorage.getItem('hud-city-splash') === '1'
  )
  const { isInstallable, isIOS, isDismissed, promptInstall, dismiss } = usePwaInstall()

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
      <ToastContainer />
      {!splashDone && <CitySplash onDone={() => setSplashDone(true)} />}
    </BrowserRouter>
  )
}

export default App
