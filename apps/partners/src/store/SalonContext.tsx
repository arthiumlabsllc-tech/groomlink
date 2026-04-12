import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from '../lib/api'

interface Salon {
  id: string
  businessName: string
  [key: string]: any
}

interface SalonContextType {
  salon: Salon | null
  salonId: string | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const SalonContext = createContext<SalonContextType | undefined>(undefined)

const FETCH_TIMEOUT = 15000 // 15 seconds overall timeout

export function SalonProvider({ children }: { children: ReactNode }) {
  const [salon, setSalon] = useState<Salon | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSalon = async () => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    
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
          if (userResponse.success) {
            console.log('Current user role:', userResponse.data.role)
            if (userResponse.data.role !== 'SALON_OWNER') {
              setError(`Access denied: Your account role is '${userResponse.data.role}'. Partners dashboard requires SALON_OWNER role. Please contact support.`)
              return // Don't proceed to fetch salon
            }
          }
        } catch (userErr: any) {
          console.error('Failed to get user info:', userErr)
          // If it's an authentication error (401), don't proceed
          const errorMessage = userErr?.message || ''
          if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('Authentication')) {
            setError('Authentication failed. Please log in again.')
            return
          }
          // For other errors, continue to try fetching salon
        }

        const response = await api.getMySalon()
        if (response.success && response.data) {
          setSalon(response.data)
        } else {
          console.warn('No salon found for this user')
          setError('No salon found. Please create a salon first or contact support.')
        }
      }

      // Race between fetch operation and timeout
      await Promise.race([fetchOperation(), timeoutPromise])
    } catch (err) {
      console.error('Failed to fetch salon:', err)
      const errorMessage = (err as Error).message || 'Failed to fetch salon'
      
      // Check if it's an authentication error
      if (errorMessage.includes('token') || errorMessage.includes('UNAUTHORIZED') || errorMessage.includes('Authentication')) {
        setError('Authentication failed. Please log in again.')
      } else {
        setError(errorMessage)
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSalon()
  }, [])

  return (
    <SalonContext.Provider value={{ 
      salon, 
      salonId: salon?.id || null, 
      loading, 
      error,
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
