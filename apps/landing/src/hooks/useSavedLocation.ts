import { useEffect, useState } from 'react'

/**
 * Shared helpers for reading the user's saved location (set by LocationPicker)
 * and applying it as filters to /api/salons calls.
 *
 * The location is persisted to localStorage by LocationPicker; whenever it
 * changes a `groomlink:location-changed` CustomEvent is dispatched on window.
 * Components using `useSavedLocation()` will re-render and re-fetch
 * automatically when the user changes their location.
 */

export const LOCATION_STORAGE_KEY = 'groomlink_user_location_v1'

export interface SavedLocation {
  label: string
  city: string
  area?: string
  source: 'gps' | 'manual'
  lat?: number
  lng?: number
}

export function loadSavedLocation(): SavedLocation | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LOCATION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedLocation
    if (!parsed?.city) return null
    return parsed
  } catch {
    return null
  }
}

/**
 * React hook returning the current saved location and updating reactively
 * when the user picks a new one (via LocationPicker) or when localStorage
 * changes in another tab.
 */
export function useSavedLocation(): SavedLocation | null {
  const [loc, setLoc] = useState<SavedLocation | null>(() => loadSavedLocation())

  useEffect(() => {
    const refresh = () => setLoc(loadSavedLocation())
    window.addEventListener('storage', refresh)
    window.addEventListener('groomlink:location-changed', refresh as EventListener)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('groomlink:location-changed', refresh as EventListener)
    }
  }, [])

  return loc
}

/**
 * Append location-based query parameters to a URLSearchParams instance so
 * `/api/salons` returns only salons matching the user's chosen city/area.
 *
 * Strategy:
 *  - Always send `city=` so the backend filters by city (case-insensitive).
 *  - When the user has GPS coordinates, ALSO send `lat`/`lng`/`radius` so the
 *    backend can use a bounding-box filter (more precise than city alone).
 *  - When the user has picked a specific area inside a city, append it to
 *    `search=` so name / serviceArea matches are biased to that area.
 */
export function appendLocationParams(
  params: URLSearchParams,
  loc: SavedLocation | null,
  opts: { radiusKm?: number; includeAreaInSearch?: boolean } = {}
): URLSearchParams {
  if (!loc) return params
  const { radiusKm = 15, includeAreaInSearch = false } = opts
  if (loc.city) params.set('city', loc.city)
  if (loc.source === 'gps' && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
    params.set('lat', String(loc.lat))
    params.set('lng', String(loc.lng))
    params.set('radius', String(radiusKm))
  }
  if (includeAreaInSearch && loc.area && !params.has('search')) {
    params.set('search', loc.area)
  }
  return params
}

/**
 * Convenience: build a query string with the user's saved location applied.
 * Pass extra params via `extra`.
 */
export function buildSalonQuery(
  loc: SavedLocation | null,
  extra: Record<string, string | number | undefined> = {},
  opts?: { radiusKm?: number; includeAreaInSearch?: boolean }
): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(extra)) {
    if (v === undefined || v === null || v === '') continue
    p.set(k, String(v))
  }
  appendLocationParams(p, loc, opts)
  return p.toString()
}
