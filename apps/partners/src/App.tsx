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
import NotFound from './pages/NotFound'
import { SalonProvider } from './store/SalonContext'
import { api } from './lib/api'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SalonSetupWrapper } from './components/SalonSetupWrapper'

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
            <Route path="/" element={
              <ProtectedRoute>
                <SalonSetupWrapper>
                  <Dashboard />
                </SalonSetupWrapper>
              </ProtectedRoute>
            } />
            <Route path="/queue" element={
              <ProtectedRoute>
                <SalonSetupWrapper>
                  <Queue />
                </SalonSetupWrapper>
              </ProtectedRoute>
            } />
            <Route path="/bookings" element={
              <ProtectedRoute>
                <SalonSetupWrapper>
                  <Bookings />
                </SalonSetupWrapper>
              </ProtectedRoute>
            } />
            <Route path="/staff" element={
              <ProtectedRoute>
                <SalonSetupWrapper>
                  <Staff />
                </SalonSetupWrapper>
              </ProtectedRoute>
            } />
            <Route path="/services" element={
              <ProtectedRoute>
                <SalonSetupWrapper>
                  <Services />
                </SalonSetupWrapper>
              </ProtectedRoute>
            } />
            <Route path="/reviews" element={
              <ProtectedRoute>
                <SalonSetupWrapper>
                  <Reviews />
                </SalonSetupWrapper>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <SalonSetupWrapper>
                  <Settings />
                </SalonSetupWrapper>
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TokenHandler>
      </BrowserRouter>
    </SalonProvider>
  )
}

export default App
