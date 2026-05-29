import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'
import {
  loadSavedLocation,
  appendLocationParams,
  type SavedLocation,
} from '../hooks/useSavedLocation'

interface Salon {
  id: string
  businessName: string
  coverImage?: string
  logo?: string
  images?: string[]
  rating?: number
  reviewCount?: number
  city?: string
  address?: string
  location?: string
  startingPrice?: number
}

interface SearchBoxProps {
  variant?: 'mobile' | 'desktop'
  className?: string
}

const API_BASE_URL = 'https://groomlinkgh.com/api'

function getSalonImageUrl(salon: Salon): string | null {
  if (salon.images && salon.images.length > 0) return salon.images[0]
  if (salon.coverImage) return salon.coverImage
  if (salon.logo) return salon.logo
  return null
}

function mapSalonData(raw: any[]): Salon[] {
  return raw.map((s: any) => ({
    id: s.id,
    businessName: s.businessName,
    coverImage: s.coverImage || undefined,
    logo: s.logo || undefined,
    images: s.images || undefined,
    rating: s.rating,
    reviewCount: s.reviewCount,
    city: s.city,
    address: s.address,
    location: s.city || s.address,
    startingPrice: s.services?.length
      ? Math.min(...s.services.map((svc: any) => Number(svc.price)).filter(Boolean))
      : undefined,
  }))
}

export default function SearchBox({ variant = 'mobile', className = '' }: SearchBoxProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Salon[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [savedLocation, setSavedLocation] = useState<SavedLocation | null>(() =>
    typeof window !== 'undefined' ? loadSavedLocation() : null
  )

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isDesktop = variant === 'desktop'

  // Refresh saved location when LocationPicker updates it
  useEffect(() => {
    const refresh = () => setSavedLocation(loadSavedLocation())
    window.addEventListener('storage', refresh)
    window.addEventListener('groomlink:location-changed', refresh as EventListener)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('groomlink:location-changed', refresh as EventListener)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (query.length < 2) {
      setResults([])
      setIsSearching(false)
      setIsDropdownOpen(false)
      return
    }

    setIsSearching(true)
    setIsDropdownOpen(true)
    setActiveIndex(-1)

    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams()
        params.set('search', query)
        params.set('limit', '8')
        appendLocationParams(params, savedLocation)
        const response = await fetch(`${API_BASE_URL}/salons?${params.toString()}`)
        if (!response.ok) throw new Error('Failed to fetch')
        const data = await response.json()
        if (data.success && Array.isArray(data.data)) {
          setResults(mapSalonData(data.data.slice(0, 8)))
        } else {
          setResults([])
        }
      } catch (err) {
        console.error('Error searching salons:', err)
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, savedLocation])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isDropdownOpen) return

      if (e.key === 'Escape') {
        setIsDropdownOpen(false)
        inputRef.current?.blur()
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((prev) => Math.min(prev + 1, results.length - 1))
        return
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((prev) => Math.max(prev - 1, -1))
        return
      }

      if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < results.length) {
        e.preventDefault()
        // Navigate programmatically
        window.location.href = `/salon/${results[activeIndex].id}`
        setIsDropdownOpen(false)
        return
      }
    },
    [isDropdownOpen, results, activeIndex]
  )

  const handleClear = () => {
    setQuery('')
    setResults([])
    setIsDropdownOpen(false)
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  const handleSelectResult = () => {
    setIsDropdownOpen(false)
    setQuery('')
    setResults([])
    setActiveIndex(-1)
  }

  // Mobile variant styling
  if (!isDesktop) {
    return (
      <div ref={containerRef} className={`relative w-full ${className}`}>
        {/* Search Input */}
        <div className="bg-white rounded-full flex items-center gap-3 px-4 py-3 shadow-lg">
          <Icon name="search" size={20} className="text-[#CE1126] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (query.length >= 2) setIsDropdownOpen(true)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search salons, services, or locations"
            className="flex-1 bg-transparent text-base text-gray-800 placeholder-gray-400 outline-none"
          />
          {isSearching && (
            <Icon name="progress_activity" size={20} className="text-[#CE1126] animate-spin flex-shrink-0" />
          )}
          {query && !isSearching && (
            <button
              onClick={handleClear}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              <Icon name="close" size={16} className="text-gray-400" />
            </button>
          )}
        </div>

        {/* Dropdown Results */}
        {isDropdownOpen && query.length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-[400px] overflow-y-auto z-50">
            {isSearching && results.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <Icon name="progress_activity" size={20} className="text-[#CE1126] animate-spin mr-2" />
                <span className="text-gray-500 text-sm">Searching...</span>
              </div>
            )}

            {!isSearching && results.length === 0 && (
              <div className="px-4 py-6 text-center">
                <Icon name="search_off" size={28} className="text-gray-300 mx-auto mb-2" />
                <p className="text-gray-700 text-sm font-medium">
                  No salons{savedLocation ? <> in <span className="text-[#CE1126]">{savedLocation.label}</span></> : null} match '<span className="font-medium text-gray-700">{query}</span>'
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {savedLocation
                    ? "We're not in your area yet, or no provider offers this service. Try another city or service."
                    : 'Try a different keyword, or set your location to find pros around you.'}
                </p>
              </div>
            )}

            {results.map((salon, index) => {
              const imageUrl = getSalonImageUrl(salon)
              const displayLocation = salon.city || salon.address || salon.location
              return (
                <Link
                  key={salon.id}
                  to={`/salon/${salon.id}`}
                  onClick={handleSelectResult}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    index === activeIndex
                      ? 'bg-[#CE1126]/5'
                      : 'hover:bg-[#CE1126]/5'
                  } ${index === 0 ? 'rounded-t-xl' : ''} ${
                    index === results.length - 1 ? 'rounded-b-xl' : ''
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={salon.businessName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#CE1126]/20 to-[#FCD116]/20">
                        <span className="text-sm font-bold text-[#CE1126]/60">
                          {salon.businessName.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm line-clamp-1">
                      {salon.businessName}
                    </p>
                    {displayLocation && (
                      <div className="flex items-center gap-1 text-gray-500 text-xs mt-0.5">
                        <Icon name="location_on" size={12} className="flex-shrink-0" />
                        <span className="line-clamp-1">{displayLocation}</span>
                      </div>
                    )}
                  </div>

                  {/* Rating */}
                  {salon.rating && salon.rating > 0 && (
                    <div className="flex items-center gap-1 bg-[#CE1126]/10 px-2 py-1 rounded-md flex-shrink-0">
                      <Icon name="star" size={12} className="text-[#FCD116]" filled />
                      <span className="text-xs font-semibold text-gray-700">
                        {salon.rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Desktop variant styling
  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      {/* Search Input */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl flex items-center gap-3 px-5 py-4 border border-white/20 shadow-lg focus-within:bg-white/20 focus-within:border-white/40 transition-all">
        <Icon name="search" size={20} className="text-[#CE1126] flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.length >= 2) setIsDropdownOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search salons, services, or locations"
          className="flex-1 bg-transparent text-base text-white placeholder-white/60 outline-none"
        />
        {isSearching && (
          <Icon name="progress_activity" size={20} className="text-[#CE1126] animate-spin flex-shrink-0" />
        )}
        {query && !isSearching && (
          <button
            onClick={handleClear}
            className="p-1 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <Icon name="close" size={16} className="text-white/60" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isDropdownOpen && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-[400px] overflow-y-auto z-50">
          {isSearching && results.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <Icon name="progress_activity" size={20} className="text-[#CE1126] animate-spin mr-2" />
              <span className="text-gray-500 text-sm">Searching...</span>
            </div>
          )}

          {!isSearching && results.length === 0 && (
            <div className="px-4 py-6 text-center">
              <Icon name="search_off" size={28} className="text-gray-300 mx-auto mb-2" />
              <p className="text-gray-700 text-sm font-medium">
                No salons{savedLocation ? <> in <span className="text-[#CE1126]">{savedLocation.label}</span></> : null} match '<span className="font-medium text-gray-700">{query}</span>'
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {savedLocation
                  ? "We're not in your area yet, or no provider offers this service. Try another city or service."
                  : 'Try a different keyword, or set your location to find pros around you.'}
              </p>
            </div>
          )}

          {results.map((salon, index) => {
            const imageUrl = getSalonImageUrl(salon)
            const displayLocation = salon.city || salon.address || salon.location
            return (
              <Link
                key={salon.id}
                to={`/salon/${salon.id}`}
                onClick={handleSelectResult}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                  index === activeIndex
                    ? 'bg-[#CE1126]/5'
                    : 'hover:bg-[#CE1126]/5'
                } ${index === 0 ? 'rounded-t-xl' : ''} ${
                  index === results.length - 1 ? 'rounded-b-xl' : ''
                }`}
              >
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={salon.businessName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#CE1126]/20 to-[#FCD116]/20">
                      <span className="text-sm font-bold text-[#CE1126]/60">
                        {salon.businessName.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm line-clamp-1">
                    {salon.businessName}
                  </p>
                  {displayLocation && (
                    <div className="flex items-center gap-1 text-gray-500 text-xs mt-0.5">
                      <Icon name="location_on" size={12} className="flex-shrink-0" />
                      <span className="line-clamp-1">{displayLocation}</span>
                    </div>
                  )}
                </div>

                {/* Rating */}
                {salon.rating && salon.rating > 0 && (
                  <div className="flex items-center gap-1 bg-[#CE1126]/10 px-2 py-1 rounded-md flex-shrink-0">
                    <Icon name="star" size={12} className="text-[#FCD116]" filled />
                    <span className="text-xs font-semibold text-gray-700">
                      {salon.rating.toFixed(1)}
                    </span>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
