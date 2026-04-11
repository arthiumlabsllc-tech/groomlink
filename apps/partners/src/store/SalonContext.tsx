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

export function SalonProvider({ children }: { children: ReactNode }) {
  const [salon, setSalon] = useState<Salon | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSalon = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // First check if user is authenticated and has the right role
      try {
        const userResponse = await api.getCurrentUser()
        if (userResponse.success) {
          console.log('Current user role:', userResponse.data.role)
          if (userResponse.data.role !== 'SALON_OWNER') {
            setError(`Access denied: Your account role is '${userResponse.data.role}'. Partners dashboard requires SALON_OWNER role. Please contact support.`)
            setLoading(false)
            return
          }
        }
      } catch (userErr) {
        console.error('Failed to get user info:', userErr)
        // Continue to try fetching salon anyway
      }
      
      const response = await api.getMySalon()
      if (response.success && response.data) {
        setSalon(response.data)
      } else {
        console.warn('No salon found for this user')
        setError('No salon found. Please create a salon first or contact support.')
      }
    } catch (err) {
      console.error('Failed to fetch salon:', err)
      const errorMessage = (err as Error).message || 'Failed to fetch salon'
      
      // Check if it's an authentication error
      if (errorMessage.includes('token') || errorMessage.includes('UNAUTHORIZED') || errorMessage.includes('Authentication')) {
        setError('Authentication failed. Please log in again.')
      } else {
        setError(errorMessage)
      }
      // Don't set salon to null on error, keep existing data
    } finally {
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
