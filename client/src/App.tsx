import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import BottomNav from './components/layout/BottomNav'
import ToastContainer from './components/ui/Toast'
import WeatherSplash from './components/ui/WeatherSplash'
import Dashboard from './screens/Dashboard'
import Finance from './screens/Finance'
import F1Screen from './screens/F1'
import Sprint from './screens/Sprint'
import './App.css'

const AnimatedRoutes: React.FC = () => {
  const location = useLocation()
  return (
    <div key={location.pathname} className="pageWrapper">
      <Routes location={location}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/f1" element={<F1Screen />} />
        <Route path="/sprint" element={<Sprint />} />
      </Routes>
    </div>
  )
}

const App: React.FC = () => {
  const [splashDone, setSplashDone] = useState(false)

  return (
    <BrowserRouter>
      <AnimatedRoutes />
      <BottomNav />
      <ToastContainer />
      {!splashDone && <WeatherSplash onDone={() => setSplashDone(true)} />}
    </BrowserRouter>
  )
}

export default App
