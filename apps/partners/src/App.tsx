import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
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
import Earnings from './pages/Earnings'
import PricingPage from './pages/PricingPage'
import Subscription from './pages/Subscription'
import NotFound from './pages/NotFound'
import { SalonProvider } from './store/SalonContext'
import { SocketProvider } from './components/SocketProvider'
import { api } from './lib/api'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SalonSetupWrapper } from './components/SalonSetupWrapper'

const queryClient = new QueryClient()

/**
 * Process impersonation token from URL SYNCHRONOUSLY before React mounts.
 * This is critical: if we wait for useEffect, ProtectedRoute will redirect
 * to /login before the token is stored.
 */
function processImpersonationToken(): boolean {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')
  const impersonationLogId = params.get('impersonation_log_id')
  const isImpersonating = params.get('impersonation') === 'true'
  
  if (token) {
    // Store the token IMMEDIATELY so it's available when ProtectedRoute evaluates
    api.setToken(token)
    if (impersonationLogId) {
      localStorage.setItem('impersonation_log_id', impersonationLogId)
    }
    if (isImpersonating) {
      localStorage.setItem('is_impersonating', 'true')
    }
    // Remove token from URL for security (but keep the path)
    window.history.replaceState({}, document.title, window.location.pathname)
    return true
  }
  return false
}

// Process token SYNCHRONOUSLY at module load time, BEFORE React renders
const hasImpersonationToken = processImpersonationToken()

// Component to dispatch auth:login event after mount so SalonContext re-fetches
function TokenHandler({ children }: { children: React.ReactNode }) {
  const [, setForceUpdate] = useState(0)
  
  useEffect(() => {
    if (hasImpersonationToken) {
      // Dispatch auth:login event to notify SalonContext and other listeners
      // This triggers fetchSalon() in SalonContext which gets the salon data
      // using the token we already stored synchronously above
      console.log('TokenHandler: Dispatching auth:login event for impersonation')
      window.dispatchEvent(new CustomEvent('auth:login'))
    }
  }, [])

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
              <Route path="/earnings" element={
                <ProtectedRoute>
                  <SalonSetupWrapper>
                    <Earnings />
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
