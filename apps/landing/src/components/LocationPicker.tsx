import { useState, useEffect, useRef, useMemo } from 'react'
import Icon from './Icon'
import { GHANA_CITIES, findNearestCity, flattenAreas, isWithinGhana, isAccuracyAcceptable } from '../data/ghanaCities'

const LOCATION_STORAGE_KEY = 'groomlink_user_location_v1'
const LOCATION_AUTO_DENIED_KEY = 'groomlink_location_auto_denied_v1'

export interface SelectedLocation {
  /** Display name to show in the pill, e.g. "East Legon, Accra" or "Accra" */
  label: string
  city: string
  area?: string
  /** Set when the location came from device GPS rather than manual selection */
  source: 'gps' | 'manual'
  lat?: number
  lng?: number
}

interface LocationPickerProps {
  /** Visual variant */
  variant?: 'hero' | 'compact'
  /** Callback when user picks a location (manual or GPS) */
  onChange?: (loc: SelectedLocation) => void
  /** Initial value (e.g. from URL or saved preference) */
  value?: SelectedLocation | null
  /** Auto-prompt for GPS on mount if no saved location and not previously dismissed */
  autoPrompt?: boolean
  className?: string
}

function loadSaved(): SelectedLocation | null {
  try {
    const raw = localStorage.getItem(LOCATION_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SelectedLocation
  } catch {
    return null
  }
}

function saveLocation(loc: SelectedLocation) {
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(loc))
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('groomlink:location-changed'))
    }
  } catch {
    /* ignore */
  }
}

/**
 * Reverse-geocode lat/lng using OpenStreetMap Nominatim (free, no API key).
 * Returns specific neighborhood/suburb when available, falling back to city.
 * Resolves null on any failure so the caller can fall back to nearest-city.
 */
async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ city?: string; area?: string } | null> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 6000)
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en' },
      signal: ctrl.signal,
    })
    clearTimeout(t)
    if (!res.ok) return null
    const json: any = await res.json()
    const a = json?.address || {}
    const area =
      a.neighbourhood ||
      a.suburb ||
      a.quarter ||
      a.residential ||
      a.hamlet ||
      a.village ||
      a.town ||
      undefined
    const city =
      a.city ||
      a.municipality ||
      a.county ||
      a.state_district ||
      a.town ||
      a.village ||
      undefined
    if (!area && !city) return null
    return { city, area: area && area !== city ? area : undefined }
  } catch {
    return null
  }
}

export default function LocationPicker({
  variant = 'hero',
  onChange,
  value,
  autoPrompt = true,
  className = '',
}: LocationPickerProps) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<SelectedLocation | null>(value ?? loadSaved())
  const [searchTerm, setSearchTerm] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const autoTriggeredRef = useRef(false)

  // Sync external value changes
  useEffect(() => {
    if (value) setSelected(value)
  }, [value])

  // Auto-detect on mount: silently request GPS once if no saved location
  // and the user hasn't previously denied. Browser will show its own prompt.
  useEffect(() => {
    if (!autoPrompt) return
    if (selected) return
    if (typeof window === 'undefined') return
    if (autoTriggeredRef.current) return
    if (!navigator.geolocation) return
    const denied = localStorage.getItem(LOCATION_AUTO_DENIED_KEY)
    if (denied) return
    autoTriggeredRef.current = true
    handleUseGps(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrompt, selected])

  // Close panel on outside click
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  // Focus search input when opening
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const handleUseGps = (silent = false) => {
    setGpsError(null)
    if (!navigator.geolocation) {
      if (!silent) setGpsError('Your browser does not support location services.')
      return
    }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        
        // Validate coordinates are within Ghana
        if (!isWithinGhana(latitude, longitude)) {
          setGpsLoading(false)
          if (!silent) {
            setGpsError('Location appears to be outside Ghana. Please try again or select your city manually.')
          }
          console.warn('[LocationPicker] Coordinates outside Ghana:', { latitude, longitude })
          return
        }
        
        // Validate GPS accuracy
        if (!isAccuracyAcceptable(accuracy)) {
          setGpsLoading(false)
          if (!silent) {
            setGpsError(`GPS accuracy is too low (${Math.round(accuracy)}m). Please try again in an open area or select your city manually.`)
          }
          console.warn('[LocationPicker] Poor GPS accuracy:', accuracy)
          return
        }
        
        // Try precise reverse-geocoding first; fall back to nearest-city centroid.
        const geo = await reverseGeocode(latitude, longitude)
        const nearest = findNearestCity(latitude, longitude)
        // Prefer the Ghana cities we know about (so filtering matches our DB)
        let cityName = geo?.city || nearest?.city.city || 'Ghana'
        const knownCity = GHANA_CITIES.find(
          (c) => cityName && c.city.toLowerCase() === cityName.toLowerCase()
        )
        if (!knownCity && nearest) {
          // Fall back to closest known Ghana city for backend filtering
          cityName = nearest.city.city
        }
        const areaName = geo?.area
        const label = areaName ? `${areaName}, ${cityName}` : cityName
        const loc: SelectedLocation = {
          label,
          city: cityName,
          area: areaName,
          source: 'gps',
          lat: latitude,
          lng: longitude,
        }
        setSelected(loc)
        saveLocation(loc)
        onChange?.(loc)
        setGpsLoading(false)
        setOpen(false)
        console.log('[LocationPicker] GPS location detected:', {
          city: cityName,
          area: areaName,
          accuracy: `${Math.round(accuracy)}m`
        })
      },
      (err) => {
        setGpsLoading(false)
        if (err.code === err.PERMISSION_DENIED) {
          // Remember the denial so we don't keep auto-prompting
          try {
            localStorage.setItem(LOCATION_AUTO_DENIED_KEY, '1')
          } catch {
            /* ignore */
          }
          if (!silent) {
            setGpsError(
              'Location access denied. You can pick your city or area manually below.'
            )
          }
        } else if (err.code === err.TIMEOUT) {
          if (!silent) setGpsError('Location request timed out. Please try again.')
        } else {
          if (!silent) setGpsError('Could not get your location. Pick your area below.')
        }
      },
      { enableHighAccuracy: true, timeout: 18000, maximumAge: 0 }
    )
  }

  const handleSelect = (city: string, area?: string) => {
    const loc: SelectedLocation = {
      label: area ? `${area}, ${city}` : city,
      city,
      area,
      source: 'manual',
    }
    setSelected(loc)
    saveLocation(loc)
    onChange?.(loc)
    setOpen(false)
    setSearchTerm('')
  }

  const handleClear = () => {
    setSelected(null)
    try {
      localStorage.removeItem(LOCATION_STORAGE_KEY)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('groomlink:location-changed'))
      }
    } catch {
      /* ignore */
    }
    onChange?.({ label: '', city: '', source: 'manual' })
  }

  // Search filtering: matches city name OR area name
  const searchResults = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return null
    const all = flattenAreas()
    const cityMatches = GHANA_CITIES.filter((c) =>
      c.city.toLowerCase().includes(q)
    ).map((c) => ({ kind: 'city' as const, city: c.city, area: undefined }))
    const areaMatches = all
      .filter(
        (a) =>
          a.area.toLowerCase().includes(q) || a.city.toLowerCase().includes(q)
      )
      .slice(0, 30)
      .map((a) => ({ kind: 'area' as const, city: a.city, area: a.area }))
    return [...cityMatches, ...areaMatches]
  }, [searchTerm])

  const pillLabel = selected?.label || (gpsLoading ? 'Detecting location…' : 'Choose your area')
  const isHero = variant === 'hero'

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger pill */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          isHero
            ? 'group inline-flex items-center gap-2 max-w-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 rounded-full px-4 py-2 text-white transition-all'
            : 'group inline-flex items-center gap-2 max-w-full bg-white border border-gray-200 hover:border-[#CE1126]/40 rounded-full px-3 py-1.5 text-gray-800 transition-all shadow-sm'
        }
      >
        <span
          className={
            isHero
              ? 'w-7 h-7 rounded-full bg-[#CE1126] text-white flex items-center justify-center flex-shrink-0'
              : 'w-6 h-6 rounded-full bg-[#CE1126]/10 text-[#CE1126] flex items-center justify-center flex-shrink-0'
          }
        >
          <Icon
            name={selected?.source === 'gps' ? 'my_location' : 'location_on'}
            size={isHero ? 16 : 14}
            filled={selected?.source === 'gps'}
          />
        </span>
        <span className="flex flex-col items-start min-w-0 leading-tight">
          <span className={isHero ? 'text-[10px] uppercase tracking-wider text-white/60' : 'text-[10px] uppercase tracking-wider text-gray-400'}>
            {selected?.source === 'gps' ? 'Your location' : 'Showing salons in'}
          </span>
          <span className="text-sm font-semibold truncate max-w-[180px] sm:max-w-[260px]">
            {pillLabel}
          </span>
        </span>
        <Icon
          name="expand_more"
          size={18}
          className={`flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${isHero ? 'text-white/70' : 'text-gray-400'}`}
        />
      </button>

      {/* Picker panel */}
      {open && (
        <div className="absolute left-0 right-auto sm:right-auto top-full mt-2 w-[min(92vw,420px)] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-40 animate-fade-in">
          {/* Use my location button */}
          <button
            type="button"
            onClick={() => handleUseGps(false)}
            disabled={gpsLoading}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#FCD116]/10 transition-colors border-b border-gray-100 disabled:opacity-60"
          >
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[#CE1126] to-[#FCD116] flex items-center justify-center text-white flex-shrink-0">
              <Icon
                name={gpsLoading ? 'progress_activity' : 'my_location'}
                size={18}
                className={gpsLoading ? 'animate-spin' : ''}
              />
            </span>
            <span className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900">
                {gpsLoading
                  ? 'Detecting your location…'
                  : selected?.source === 'gps'
                    ? 'Update to current location'
                    : 'Use my current location'}
              </p>
            </span>
            <Icon name="chevron_right" size={18} className="text-gray-300" />
          </button>

          {/* GPS error message */}
          {gpsError && (
            <div className="px-4 py-2 bg-amber-50 text-amber-800 text-xs flex items-center gap-2 border-b border-amber-100">
              <Icon name="info" size={14} />
              <span>{gpsError}</span>
            </div>
          )}

          {/* Search input */}
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#CE1126]/30 transition-all">
              <Icon name="search" size={18} className="text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search city, area or neighborhood…"
                className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400 min-w-0"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                  aria-label="Clear"
                >
                  <Icon name="close" size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Selected indicator with clear button */}
          {selected && !searchTerm && (
            <div className="px-4 py-2 bg-[#006B3F]/5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Icon name="check_circle" size={16} className="text-[#006B3F] flex-shrink-0" />
                <span className="text-xs text-gray-700 truncate">
                  Currently: <span className="font-semibold">{selected.label}</span>
                </span>
              </div>
              <button
                onClick={handleClear}
                className="text-xs font-medium text-[#CE1126] hover:underline flex-shrink-0 ml-2"
              >
                Clear
              </button>
            </div>
          )}

          {/* Results / Default city list */}
          <div className="max-h-[55vh] overflow-y-auto">
            {searchResults && searchResults.length === 0 && (
              <div className="px-4 py-8 text-center">
                <Icon name="search_off" size={28} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-600 font-medium">
                  No matches for "{searchTerm}"
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Try a different city or area name
                </p>
              </div>
            )}

            {searchResults && searchResults.length > 0 && (
              <ul className="py-1">
                {searchResults.map((r, i) => (
                  <li key={`${r.kind}-${r.city}-${r.area ?? ''}-${i}`}>
                    <button
                      onClick={() => handleSelect(r.city, r.area)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#FCD116]/10 transition-colors text-left"
                    >
                      <Icon
                        name={r.kind === 'city' ? 'location_city' : 'place'}
                        size={18}
                        className="text-gray-400 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 truncate">
                          {r.area ? (
                            <>
                              <span className="font-medium">{r.area}</span>
                              <span className="text-gray-500">, {r.city}</span>
                            </>
                          ) : (
                            <span className="font-semibold">{r.city}</span>
                          )}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {r.kind === 'city' ? 'City • All areas' : 'Area'}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!searchResults && (
              <div className="py-2">
                <p className="px-4 py-1 text-[11px] uppercase tracking-wider text-gray-400 font-semibold">
                  Popular cities
                </p>
                {GHANA_CITIES.map((c) => (
                  <button
                    key={c.city}
                    onClick={() => handleSelect(c.city)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#FCD116]/10 transition-colors text-left"
                  >
                    <span className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <img
                        src={c.image}
                        alt={c.city}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </span>
                    <span className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{c.city}</p>
                      <p className="text-[11px] text-gray-500">
                        {c.areas.length} areas
                      </p>
                    </span>
                    <Icon name="chevron_right" size={18} className="text-gray-300" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export { LOCATION_STORAGE_KEY }
