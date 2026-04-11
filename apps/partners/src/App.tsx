import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Bookings from './pages/Bookings'
import Staff from './pages/Staff'
import Services from './pages/Services'
import Reviews from './pages/Reviews'
import Settings from './pages/Settings'
import Queue from './pages/Queue'
import { SalonProvider } from './store/SalonContext'
import { api } from './lib/api'

// Component to handle token from URL
function TokenHandler({ children }: { children: React.ReactNode }) {
  const [searchParams] = useSearchParams()
  
  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      // Store the token
      api.setToken(token)
      // Remove token from URL for security
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [searchParams])
  
  return <>{children}</>
}

function App() {
  return (
    <SalonProvider>
      <BrowserRouter>
        <TokenHandler>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/queue" element={<Queue />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/services" element={<Services />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </TokenHandler>
      </BrowserRouter>
    </SalonProvider>
  )
}

export default App
