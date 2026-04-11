import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api, Salon } from '../lib/api'

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
      const response = await api.getMySalon()
      if (response.success && response.data) {
        setSalon(response.data)
      }
    } catch (err) {
      console.error('Failed to fetch salon:', err)
      setError((err as Error).message || 'Failed to fetch salon')
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
