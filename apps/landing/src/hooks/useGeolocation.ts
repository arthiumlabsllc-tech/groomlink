import { useState, useEffect, useCallback } from 'react'
import { isWithinGhana, isAccuracyAcceptable } from '../data/ghanaCities'

type GeolocationState = 'idle' | 'requesting' | 'granted' | 'denied' | 'error' | 'unsupported'

interface GeolocationData {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

interface UseGeolocationReturn {
  state: GeolocationState
  data: GeolocationData | null
  error: string | null
  request: () => void
  reset: () => void
}

const CACHE_KEY = 'groomlink_location'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes (reduced for fresher data)

function loadCached(): GeolocationData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GeolocationData
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }
    // Validate cached data is still acceptable
    if (!isAccuracyAcceptable(parsed.accuracy)) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function saveCached(data: GeolocationData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    // ignore
  }
}

export function useGeolocation(): UseGeolocationReturn {
  const [state, setState] = useState<GeolocationState>('idle')
  const [data, setData] = useState<GeolocationData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Auto-load cached location on mount
  useEffect(() => {
    const cached = loadCached()
    if (cached) {
      setData(cached)
      setState('granted')
    }
  }, [])

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setState('unsupported')
      setError('Geolocation is not supported by your browser')
      return
    }

    // Check cached again before requesting
    const cached = loadCached()
    if (cached) {
      setData(cached)
      setState('granted')
      return
    }

    setState('requesting')
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        
        // Validate coordinates are within Ghana
        if (!isWithinGhana(latitude, longitude)) {
          setState('error')
          setError('Location appears to be outside Ghana. Please enable accurate location services.')
          console.warn('[Geolocation] Coordinates outside Ghana:', { latitude, longitude })
          return
        }
        
        // Validate GPS accuracy
        if (!isAccuracyAcceptable(accuracy)) {
          setState('error')
          setError(`GPS accuracy is too low (${Math.round(accuracy)}m). Please try again in an open area.`)
          console.warn('[Geolocation] Poor accuracy:', accuracy)
          return
        }
        
        const loc: GeolocationData = {
          latitude,
          longitude,
          accuracy,
          timestamp: Date.now(),
        }
        saveCached(loc)
        setData(loc)
        setState('granted')
        console.log('[Geolocation] Location detected successfully:', {
          latitude,
          longitude,
          accuracy: `${Math.round(accuracy)}m`
        })
      },
      (err) => {
        let message = 'Unable to retrieve your location'
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setState('denied')
            message = 'Location access was denied. You can enable it in your browser settings.'
            break
          case err.POSITION_UNAVAILABLE:
            setState('error')
            message = 'Location information is unavailable.'
            break
          case err.TIMEOUT:
            setState('error')
            message = 'The request to get location timed out.'
            break
        }
        setError(message)
      },
      {
        enableHighAccuracy: true, // Changed to true for better accuracy
        timeout: 15000,
        maximumAge: 0, // Changed to 0 to disable caching and get fresh data
      }
    )
  }, [])

  const reset = useCallback(() => {
    localStorage.removeItem(CACHE_KEY)
    setData(null)
    setError(null)
    setState('idle')
  }, [])

  return { state, data, error, request, reset }
}

/** Haversine distance in kilometers */
export function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/** Format distance for display */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`
  }
  return `${km.toFixed(1)} km`
}
