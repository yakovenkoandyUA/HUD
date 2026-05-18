import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import BottomNav from './components/layout/BottomNav'
import ToastContainer from './components/ui/Toast'
import WeatherSplash from './components/ui/WeatherSplash'
import Dashboard from './screens/Dashboard'
import Finance from './screens/Finance'
import F1Screen from './screens/F1'
import RaceDetailPage from './screens/RaceDetail'
import Sprint from './screens/Sprint'
import Recipes from './screens/Recipes'
import Watchlist from './screens/Watchlist'
import './App.css'

const AnimatedRoutes: React.FC = () => {
  const location = useLocation()
  return (
    <div key={location.pathname} className="pageWrapper">
      <Routes location={location}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/f1" element={<F1Screen />} />
        <Route path="/f1/:round" element={<RaceDetailPage />} />
        <Route path="/sprint" element={<Sprint />} />
        <Route path="/recipes" element={<Recipes />} />
        <Route path="/watchlist" element={<Watchlist />} />
      </Routes>
    </div>
  )
}

// Hide bottom nav on drill-down pages that have their own back button
const NavGuard: React.FC = () => {
  const { pathname } = useLocation()
  if (/^\/f1\/\d+$/.test(pathname)) return null
  return <BottomNav />
}

const App: React.FC = () => {
  const [splashDone, setSplashDone] = useState(false)

  return (
    <BrowserRouter>
      <AnimatedRoutes />
      <NavGuard />
      <ToastContainer />
      {!splashDone && <WeatherSplash onDone={() => setSplashDone(true)} />}
    </BrowserRouter>
  )
}

export default App
