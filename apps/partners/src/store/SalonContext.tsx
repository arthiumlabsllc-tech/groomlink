import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api, Salon } from '../lib/api'

interface User {
  id: string
  role: string
  email: string
  phoneNumber: string
  firstName: string
  lastName: string
}

interface SalonContextType {
  salon: Salon | null
  salonId: string | null
  user: User | null
  loading: boolean
  error: string | null
  hasSalon: boolean | null // null = still loading, true = has salon, false = no salon (new partner)
  refetch: () => Promise<void>
}

const SalonContext = createContext<SalonContextType | undefined>(undefined)

const FETCH_TIMEOUT = 15000 // 15 seconds overall timeout

export function SalonProvider({ children }: { children: ReactNode }) {
  const [salon, setSalon] = useState<Salon | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasSalon, setHasSalon] = useState<boolean | null>(null) // null = unknown/loading

  const fetchSalon = async () => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    // CRITICAL: Check for token BEFORE making any API calls
    // This prevents race condition where SalonProvider mounts before login completes
    const token = api.getToken()
    if (!token) {
      console.log('SalonContext: No auth token found - skipping fetch')
      setLoading(false)
      setHasSalon(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Create a timeout promise for the overall fetch operation
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Request timed out')), FETCH_TIMEOUT)
      })

      const fetchOperation = async () => {
        // First check if user is authenticated and has the right role
        try {
          const userResponse = await api.getCurrentUser()
          if (userResponse.success && userResponse.data) {
            console.log('Current user role:', userResponse.data.role)
            // Store user data for email pre-fill in settings
            setUser(userResponse.data)
            const isImpersonating = !!localStorage.getItem('is_impersonating')
            // During impersonation, allow access regardless of role
            // (support agents impersonate SALON_OWNERs but the token has the target user's role)
            if (userResponse.data.role !== 'SALON_OWNER' && !isImpersonating) {
              // This is a real error - user has wrong role
              setError(`Access denied: Your account role is '${userResponse.data.role}'. Partners dashboard requires SALON_OWNER role. Please contact support.`)
              setHasSalon(false)
              return
            }
          }
        } catch (userErr: any) {
          console.error('Failed to get user info:', userErr)
          // If it's an authentication error (401), the token is invalid - clear it gracefully
          const errorMessage = userErr?.message || ''
          const errorStatus = userErr?.status
          if (errorStatus === 401 || errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('Authentication')) {
            // Clear the stale/invalid token from localStorage
            localStorage.removeItem('auth_token')
            setUser(null)
            setHasSalon(false)
            setError(null) // Don't show error - just treat as logged out
            setLoading(false)
            return // Don't try anything else
          }
          // For other errors (network, etc.), continue to try fetching salon
        }

        // Try to fetch the salon
        try {
          const response = await api.getMySalon()
          if (response.success && response.data) {
            // User has a salon - this is the normal case for existing partners
            setSalon(response.data)
            setHasSalon(true)
            setError(null)
          } else {
            // No salon found - this is a VALID state for new partners!
            console.log('No salon found for this user - new partner without salon')
            setSalon(null)
            setHasSalon(false)
            setError(null) // NOT an error - just means they need to create a salon
          }
        } catch (salonErr: any) {
          // Check if it's a 404 or "not found" type error - that's OK for new partners
          const errMsg = salonErr?.message || ''
          if (errMsg.includes('404') || errMsg.includes('Not Found') || errMsg.includes('no salon')) {
            console.log('No salon found for this user - new partner without salon')
            setSalon(null)
            setHasSalon(false)
            setError(null)
          } else if (errMsg.includes('401') || errMsg.includes('Unauthorized')) {
            // 401 from salon endpoint - token expired, this is a real auth issue
            console.error('Auth error fetching salon:', salonErr)
            setError('Authentication failed. Please log in again.')
            setHasSalon(false)
          } else if (errMsg.includes('403') || errMsg.includes('Forbidden')) {
            // 403 - user is authenticated but may not have permissions yet
            // This could happen for new SALON_OWNER users who haven't created their salon
            console.log('Permission issue - may be new partner without salon')
            setSalon(null)
            setHasSalon(false)
            setError(null) // Not an error - just needs to create salon
          } else {
            // Other errors (network, etc.) - set a retryable error but don't clear token
            console.error('Network/server error fetching salon:', salonErr)
            setError('Unable to load salon data. Please check your connection and try again.')
            setHasSalon(null) // Unknown state - retry might help
          }
        }
      }

      // Race between fetch operation and timeout
      await Promise.race([fetchOperation(), timeoutPromise])
    } catch (err) {
      console.error('Failed to fetch salon:', err)
      const errorMessage = (err as Error).message || 'Failed to fetch salon'
      
      // Only set auth errors - network/timeout errors are retryable
      if (errorMessage.includes('token') || errorMessage.includes('UNAUTHORIZED') || errorMessage.includes('Authentication')) {
        setError('Authentication failed. Please log in again.')
        setHasSalon(false)
      } else {
        setError(errorMessage)
        setHasSalon(null) // Unknown state
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
      // CRITICAL: Always set loading to false, no matter what happens
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSalon()

    // Listen for auth:login event to re-fetch after login
    const handleAuthLogin = () => {
      console.log('SalonContext: auth:login event received - fetching salon')
      fetchSalon()
    }
    window.addEventListener('auth:login', handleAuthLogin)

    return () => {
      window.removeEventListener('auth:login', handleAuthLogin)
    }
  }, [])

  return (
    <SalonContext.Provider value={{ 
      salon, 
      salonId: salon?.id || null, 
      user,
      loading, 
      error,
      hasSalon,
      refetch: fetchSalon 
    }}>
      {children}
    </SalonContext.Provider>
  )
}

export function useSalon() {
  const context = useContext(SalonContext)
  if (context === undefined) {
    throw new Error('useSalon must be used within a SalonProvider')
  }
  return context
}
