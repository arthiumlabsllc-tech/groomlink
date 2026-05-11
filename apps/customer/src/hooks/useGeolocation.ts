import { useState, useEffect, useCallback } from 'react'

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
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

function loadCached(): GeolocationData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GeolocationData
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
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
        const loc: GeolocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
        }
        saveCached(loc)
        setData(loc)
        setState('granted')
      },
      (err) => {
        let message = 'Unable to retrieve your location'
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setState('denied')
            message = 'Location access was denied'
            break
          case err.POSITION_UNAVAILABLE:
            setState('error')
            message = 'Location information is unavailable'
            break
          case err.TIMEOUT:
            setState('error')
            message = 'Location request timed out'
            break
        }
        setError(message)
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 60000,
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
  const R = 6371
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
