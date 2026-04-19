import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import apiClient, { salonApi } from '../lib/api'
import MapView from '../components/MapView'

// Types
interface Salon {
  id: string
  businessName: string
  description: string | null
  type: string
  status: string
  phoneNumber: string
  email: string | null
  address: string
  city: string
  region: string
  latitude: number | null
  longitude: number | null
  logo: string | null
  images: string[]
  openingTime: string | null
  closingTime: string | null
  workingDays: string[]
  hasParking: boolean
  hasWifi: boolean
  hasAC: boolean
  acceptsWalkIns: boolean
  rating: number
  reviewCount: number
  ownerId: string
  createdAt: string
  updatedAt: string
  distance?: number // Optional distance field for nearby search
  isSponsored?: boolean // Sponsored salon flag
}

interface PaginatedResponse {
  success: boolean
  data: Salon[]
  meta?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const categories = [
  { label: 'All', value: '' },
  { label: 'Barbershop', value: 'BARBERSHOP' },
  { label: 'Hair Salon', value: 'HAIR_SALON' },
  { label: 'Nail Salon', value: 'NAIL_SALON' },
  { label: 'Pedicure Salon', value: 'PEDICURE_SALON' },
  { label: 'Spa', value: 'SPA' },
  { label: 'Beauty Salon', value: 'BEAUTY_SALON' },
]

const radiusOptions = [
  { label: '1 km', value: 1 },
  { label: '3 km', value: 3 },
  { label: '5 km', value: 5 },
  { label: '10 km', value: 10 },
  { label: '25 km', value: 25 },
]

const formatCategoryLabel = (type: string): string => {
  const category = categories.find(c => c.value === type)
  return category?.label || type
}

const formatDistance = (distance: number): string => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m away`
  }
  return `${distance.toFixed(1)} km away`
}

const getSalonImage = (salon: Salon): string => {
  if (salon.images && salon.images.length > 0) {
    return salon.images[0]
  }
  if (salon.logo) {
    return salon.logo
  }
  // Default salon images based on type
  const defaultImages: Record<string, string> = {
    BARBERSHOP: 'https://images.unsplash.com/photo-1585747860715-2d3b4c7e3a23?w=400&h=300&fit=crop',
    HAIR_SALON: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop',
    NAIL_SALON: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=300&fit=crop',
    SPA: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop',
  }
  return defaultImages[salon.type] || 'https://images.unsplash.com/photo-1522337360788-8b13ee0af107?w=400&h=300&fit=crop'
}

type LocationMode = 'all' | 'nearby'
type DisplayMode = 'grid' | 'list' | 'map'

export default function Explore() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [displayMode, setDisplayMode] = useState<DisplayMode>('grid')
  const [salons, setSalons] = useState<Salon[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 12

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Near Me state
  const [locationMode, setLocationMode] = useState<LocationMode>('all')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedRadius, setSelectedRadius] = useState(10)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [gettingLocation, setGettingLocation] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1) // Reset to first page on search change
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch salons based on location mode
  const fetchSalons = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (locationMode === 'nearby' && userLocation) {
        // Use nearby search
        const response = await salonApi.getNearbySalons(
          userLocation.lat,
          userLocation.lng,
          selectedRadius,
          page,
          limit
        )
        
        if (response.success) {
          setSalons(response.data || [])
          setTotal(response.meta?.total || 0)
          setTotalPages(response.meta?.totalPages || 1)
        } else {
          setError('Failed to fetch nearby salons')
        }
      } else {
        // Use regular search
        const params: Record<string, string | number> = {
          status: 'APPROVED',
          page,
          limit,
        }
        if (debouncedSearch) {
          params.search = debouncedSearch
        }
        if (selectedCategory) {
          params.type = selectedCategory
        }

        const response = await apiClient.get<PaginatedResponse>('/salons', { params })
        
        if (response.data.success) {
          setSalons(response.data.data || [])
          setTotal(response.data.meta?.total || 0)
          setTotalPages(response.data.meta?.totalPages || 1)
        } else {
          setError('Failed to fetch salons')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching salons')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, selectedCategory, page, limit, locationMode, userLocation, selectedRadius])

  useEffect(() => {
    fetchSalons()
  }, [fetchSalons])

  // Handle Near Me button click
  const handleNearMeClick = useCallback(() => {
    if (locationMode === 'nearby') {
      // Toggle back to all salons
      setLocationMode('all')
      setUserLocation(null)
      setLocationError(null)
      setPage(1)
      return
    }

    // Request geolocation
    setGettingLocation(true)
    setLocationError(null)

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      setGettingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setLocationMode('nearby')
        setGettingLocation(false)
        setPage(1)
      },
      (error) => {
        setGettingLocation(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location permission denied. Please enable location access in your browser settings to use this feature.')
            break
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location information is unavailable. Please try again.')
            break
          case error.TIMEOUT:
            setLocationError('Location request timed out. Please try again.')
            break
          default:
            setLocationError('An unknown error occurred while getting your location.')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // Cache location for 5 minutes
      }
    )
  }, [locationMode])

  const handleSalonClick = (salonId: string) => {
    navigate(`/salon/${salonId}`)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  const handleRadiusChange = (radius: number) => {
    setSelectedRadius(radius)
    setPage(1)
  }

  const clearLocationError = () => {
    setLocationError(null)
  }

  const renderPagination = () => {
    if (totalPages <= 1) return null

    const pages: (number | string)[] = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (page <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      } else if (page >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = page - 1; i <= page + 1; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      }
    }

    return (
      <div className="flex items-center justify-center gap-2 mt-8">
        <button
          onClick={() => handlePageChange(page - 1)}
          disabled={page === 1 || loading}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon name="chevron_left" size={20} />
        </button>
        {pages.map((p, idx) => (
          p === '...' ? (
            <span key={idx} className="px-3 py-2 text-gray-400">...</span>
          ) : (
            <button
              key={idx}
              onClick={() => handlePageChange(p as number)}
              disabled={loading}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                page === p
                  ? 'bg-ghana-green text-white'
                  : 'border border-gray-200 hover:bg-gray-50 text-gray-700'
              }`}
            >
              {p}
            </button>
          )
        ))}
        <button
          onClick={() => handlePageChange(page + 1)}
          disabled={page === totalPages || loading}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon name="chevron_right" size={20} />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Explore Salons</h1>
        <p className="text-gray-600 mt-1">Discover the best salons near you</p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex-1 relative">
          <Icon name="search" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search salons, services, or locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-3 sm:py-3.5 bg-white shadow-card rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base transition-shadow hover:shadow-card-hover"
          />
          {loading && (
            <Icon name="progress_activity" size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Near Me Button */}
          <button
            onClick={handleNearMeClick}
            disabled={gettingLocation}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all text-sm sm:text-base ${
              locationMode === 'nearby'
                ? 'bg-ghana-green text-white shadow-md'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-ghana-green'
            } ${gettingLocation ? 'opacity-70 cursor-wait' : ''}`}
          >
            {gettingLocation ? (
              <>
                <Icon name="progress_activity" size={16} className="animate-spin" />
                <span className="hidden sm:inline">Getting location...</span>
                <span className="sm:hidden">Locating...</span>
              </>
            ) : (
              <>
                <Icon name="near_me" size={16} />
                <span>Near Me</span>
              </>
            )}
          </button>

          {/* Radius Filter - Only show when in nearby mode */}
          {locationMode === 'nearby' && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              <span className="text-xs text-gray-500 whitespace-nowrap">Within:</span>
              {radiusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleRadiusChange(option.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                    selectedRadius === option.value
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          <button className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm sm:text-base">
            <Icon name="filter_list" size={16} />
            <span className="hidden sm:inline">Filters</span>
          </button>
          <div className="flex bg-gray-100 rounded-full p-1 ml-auto">
            <button 
              onClick={() => setDisplayMode('grid')} 
              className={`p-2 rounded-full transition-all duration-200 ${displayMode === 'grid' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              title="Grid view"
            >
              <Icon name="grid_view" size={18} />
            </button>
            <button 
              onClick={() => setDisplayMode('list')} 
              className={`p-2 rounded-full transition-all duration-200 ${displayMode === 'list' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              title="List view"
            >
              <Icon name="list" size={18} />
            </button>
            <button 
              onClick={() => setDisplayMode('map')} 
              className={`p-2 rounded-full transition-all duration-200 ${displayMode === 'map' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              title="Map view"
            >
              <Icon name="map" size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Location Error Banner */}
      {locationError && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
          <Icon name="error" size={20} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Location access required</p>
            <p className="text-sm mt-1">{locationError}</p>
          </div>
          <button
            onClick={clearLocationError}
            className="p-1 hover:bg-amber-100 rounded transition-colors"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide scroll-smooth-x">
        {categories.map((category) => (
          <button
            key={category.value || 'all'}
            onClick={() => {
              setSelectedCategory(category.value)
              setPage(1)
            }}
            className={`tab-pill whitespace-nowrap ${
              selectedCategory === category.value
                ? 'tab-pill-active'
                : 'tab-pill-inactive'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Location mode indicator */}
      {locationMode === 'nearby' && userLocation && (
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-ghana-green/5 px-3 py-2 rounded-lg">
          <Icon name="location_on" size={16} className="text-ghana-green" />
          <span>Showing salons within {radiusOptions.find(r => r.value === selectedRadius)?.label} of your location</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <Icon name="error" size={20} className="flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Error loading salons</p>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={fetchSalons}
            className="px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && salons.length === 0 && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <div className="skeleton-shimmer w-20 h-8"></div>
            <div className="skeleton-shimmer w-24 h-8"></div>
            <div className="skeleton-shimmer w-16 h-8"></div>
          </div>
          <div className={displayMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card-v2 overflow-hidden">
                <div className="skeleton-shimmer w-full h-48"></div>
                <div className="p-4 space-y-3">
                  <div className="skeleton-shimmer w-3/4 h-5"></div>
                  <div className="skeleton-shimmer w-1/2 h-4"></div>
                  <div className="skeleton-shimmer w-2/3 h-4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && salons.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in-up">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <Icon name="store" size={48} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {locationMode === 'nearby' ? 'No salons found nearby' : 'No salons found'}
          </h3>
          <p className="text-gray-600 max-w-md mb-6">
            {locationMode === 'nearby'
              ? `No approved salons were found within ${radiusOptions.find(r => r.value === selectedRadius)?.label} of your location. Try expanding your search radius or browse all salons.`
              : debouncedSearch || selectedCategory
                ? 'We couldn\'t find any salons matching your search. Try adjusting your filters or search for something else.'
                : 'There are no approved salons available at the moment. Please check back later.'}
          </p>
          {locationMode === 'nearby' && (
            <button
              onClick={() => {
                setLocationMode('all')
                setUserLocation(null)
                setPage(1)
              }}
              className="px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium shadow-card hover:shadow-card-hover"
            >
              View All Salons
            </button>
          )}
          {(debouncedSearch || selectedCategory) && locationMode !== 'nearby' && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('')
                setPage(1)
              }}
              className="px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium shadow-card hover:shadow-card-hover"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Map View */}
      {displayMode === 'map' && salons.length > 0 && (
        <MapView 
          salons={salons} 
          userLocation={userLocation}
        />
      )}

      {/* Salons Grid/List */}
      {displayMode !== 'map' && salons.length > 0 && (
        <>
          <div className={displayMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {salons.map((salon) => (
              <div
                key={salon.id}
                onClick={() => handleSalonClick(salon.id)}
                className={`card-v2 overflow-hidden cursor-pointer group ${
                  displayMode === 'list' ? 'flex' : ''
                }`}
              >
                <div className={`img-zoom relative ${displayMode === 'grid' ? 'w-full h-48 rounded-t-2xl' : 'w-48 h-full rounded-l-2xl flex-shrink-0'}`}>
                  <img
                    src={getSalonImage(salon)}
                    alt={salon.businessName || 'Salon'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = 'https://images.unsplash.com/photo-1522337360788-8b13ee0af107?w=400&h=300&fit=crop'
                    }}
                  />
                  <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    {salon.isSponsored && (
                      <span className="px-2 py-1 text-xs font-medium rounded bg-amber-100 text-amber-700 border border-amber-300 flex items-center gap-1">
                        <Icon name="star" size={12} filled className="text-amber-700" />
                        Sponsored
                      </span>
                    )}
                    <span className="px-2 py-1 text-xs font-medium rounded bg-ghana-gold text-ghana-green">
                      {formatCategoryLabel(salon.type)}
                    </span>
                  </div>
                </div>
                <div className="p-4 flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{salon.businessName || 'Unnamed Salon'}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Icon name="star" size={16} filled className="text-ghana-gold" />
                        <span className="text-sm font-medium">{salon.rating?.toFixed(1) || '0.0'}</span>
                        <span className="text-sm text-gray-500">({salon.reviewCount || 0} reviews)</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                    <Icon name="location_on" size={16} className="flex-shrink-0" />
                    <span className="truncate">{salon.address || 'Address not available'}</span>
                  </div>
                  {salon.city && (
                    <div className="text-sm text-gray-400 mt-1">
                      {salon.city}{salon.region ? `, ${salon.region}` : ''}
                    </div>
                  )}
                  {/* Distance display for nearby mode */}
                  {locationMode === 'nearby' && salon.distance !== undefined && (
                    <div className="flex items-center gap-1 mt-2 text-sm font-medium text-ghana-green">
                      <Icon name="near_me" size={16} />
                      <span>{formatDistance(salon.distance)}</span>
                    </div>
                  )}
                  {(salon.openingTime || salon.closingTime) && (
                    <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {salon.openingTime || '--:--'} - {salon.closingTime || '--:--'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {renderPagination()}

          {/* Results count */}
          <div className="text-center text-sm text-gray-500 mt-4">
            Showing {salons.length} of {total} salons
            {locationMode === 'nearby' && ` within ${radiusOptions.find(r => r.value === selectedRadius)?.label}`}
          </div>
        </>
      )}
    </div>
  )
}
