import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage          from './pages/LoginPage'
import RegisterPage       from './pages/RegisterPage'
import FamilySetupPage    from './pages/FamilySetupPage'
import HomePage           from './pages/HomePage'
import FeedPage           from './pages/FeedPage'
import TrackingPage       from './pages/TrackingPage'
import HealthRecordPage   from './pages/HealthRecordPage'
import GrowthPage         from './pages/GrowthPage'
import VaccinationPage    from './pages/VaccinationPage'
import RoutinePage        from './pages/RoutinePage'
import NotificationsPage  from './pages/NotificationsPage'
import AiAssistantPage    from './pages/AiAssistantPage'
import ProfilePage        from './pages/ProfilePage'
import FloatingAiAssistant from './components/FloatingAiAssistant'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('bediary_token')
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('bediary_theme')
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    const theme = savedTheme || (prefersDark ? 'dark' : 'light')
    document.documentElement.dataset.theme = theme
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected */}
        <Route path="/family-setup"   element={<PrivateRoute><FamilySetupPage /></PrivateRoute>} />
        <Route path="/"               element={<PrivateRoute><HomePage /></PrivateRoute>} />
        <Route path="/feed"           element={<PrivateRoute><FeedPage /></PrivateRoute>} />
        <Route path="/tracking"       element={<PrivateRoute><TrackingPage /></PrivateRoute>} />
        <Route path="/health"         element={<PrivateRoute><HealthRecordPage /></PrivateRoute>} />
        <Route path="/growth"         element={<PrivateRoute><GrowthPage /></PrivateRoute>} />
        <Route path="/vaccinations"   element={<PrivateRoute><VaccinationPage /></PrivateRoute>} />
        <Route path="/routines"       element={<PrivateRoute><RoutinePage /></PrivateRoute>} />
        <Route path="/notifications"  element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
        <Route path="/ai"             element={<PrivateRoute><AiAssistantPage /></PrivateRoute>} />
        <Route path="/profile"        element={<PrivateRoute><ProfilePage /></PrivateRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <FloatingAiAssistant />
    </BrowserRouter>
  )
}



