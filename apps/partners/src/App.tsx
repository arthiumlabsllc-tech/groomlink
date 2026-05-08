import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Bookings from './pages/Bookings'
import Staff from './pages/Staff'
import Services from './pages/Services'
import Reviews from './pages/Reviews'
import Settings from './pages/Settings'
import Queue from './pages/Queue'
import KYC from './pages/KYC'
import BrandedPage from './pages/BrandedPage'
import Notifications from './pages/Notifications'
import Insights from './pages/Insights'
import PricingPage from './pages/PricingPage'
import Subscription from './pages/Subscription'
import NotFound from './pages/NotFound'
import { SalonProvider } from './store/SalonContext'
import { SocketProvider } from './components/SocketProvider'
import { api } from './lib/api'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SalonSetupWrapper } from './components/SalonSetupWrapper'

const queryClient = new QueryClient()

// Component to handle token from URL (e.g. impersonation flow)
function TokenHandler({ children }: { children: React.ReactNode }) {
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    const impersonationLogId = searchParams.get('impersonation_log_id')
    const isImpersonating = searchParams.get('impersonation') === 'true'
    
    if (token) {
      // Store the token
      api.setToken(token)
      // Store impersonation log id if present
      if (impersonationLogId) {
        localStorage.setItem('impersonation_log_id', impersonationLogId)
      }
      if (isImpersonating) {
        localStorage.setItem('is_impersonating', 'true')
      }
      // Remove token from URL for security
      window.history.replaceState({}, document.title, window.location.pathname)
      // Dispatch auth:login event to notify SalonContext and other listeners
      window.dispatchEvent(new CustomEvent('auth:login'))
    }
  }, [searchParams])

  return <>{children}</>
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <SalonProvider>
      <SocketProvider>
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
              <Route path="/kyc" element={
                <ProtectedRoute>
                  <KYC />
                </ProtectedRoute>
              } />
              <Route path="/branded-page" element={
                <ProtectedRoute>
                  <SalonSetupWrapper>
                    <BrandedPage />
                  </SalonSetupWrapper>
                </ProtectedRoute>
              } />
              <Route path="/notifications" element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              } />
              <Route path="/insights" element={
                <ProtectedRoute>
                  <SalonSetupWrapper>
                    <Insights />
                  </SalonSetupWrapper>
                </ProtectedRoute>
              } />
              <Route path="/pricing" element={
                <ProtectedRoute>
                  <SalonSetupWrapper>
                    <PricingPage />
                  </SalonSetupWrapper>
                </ProtectedRoute>
              } />
              <Route path="/subscription" element={
                <ProtectedRoute>
                  <SalonSetupWrapper>
                    <Subscription />
                  </SalonSetupWrapper>
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TokenHandler>
        </BrowserRouter>
      </SocketProvider>
    </SalonProvider>
    </QueryClientProvider>
  )
}

export default App
