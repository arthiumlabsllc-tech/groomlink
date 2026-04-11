import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Search, 
  MapPin, 
  Star, 
  Filter,
  Grid,
  List,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Store
} from 'lucide-react'
import apiClient from '../lib/api'

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

const formatCategoryLabel = (type: string): string => {
  const category = categories.find(c => c.value === type)
  return category?.label || type
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

export default function Explore() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [salons, setSalons] = useState<Salon[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 12

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1) // Reset to first page on search change
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchSalons = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching salons')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, selectedCategory, page, limit])

  useEffect(() => {
    fetchSalons()
  }, [fetchSalons])

  const handleSalonClick = (salonId: string) => {
    navigate(`/salon/${salonId}`)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
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
          <ChevronLeft className="w-5 h-5" />
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
          <ChevronRight className="w-5 h-5" />
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
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search salons, services, or locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ghana-green focus:border-transparent"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden">
            <button 
              onClick={() => setViewMode('grid')} 
              className={`p-2 ${viewMode === 'grid' ? 'bg-ghana-green/10 text-ghana-green' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')} 
              className={`p-2 ${viewMode === 'list' ? 'bg-ghana-green/10 text-ghana-green' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category.value || 'all'}
            onClick={() => {
              setSelectedCategory(category.value)
              setPage(1)
            }}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
              selectedCategory === category.value
                ? 'bg-ghana-green text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
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
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-12 h-12 text-ghana-green animate-spin mb-4" />
          <p className="text-gray-600">Loading salons...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && salons.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Store className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No salons found</h3>
          <p className="text-gray-600 max-w-md">
            {debouncedSearch || selectedCategory
              ? 'Try adjusting your search or filters to find what you\'re looking for.'
              : 'There are no approved salons available at the moment. Please check back later.'}
          </p>
          {(debouncedSearch || selectedCategory) && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('')
                setPage(1)
              }}
              className="mt-4 px-4 py-2 bg-ghana-green text-white rounded-lg hover:bg-ghana-green/90 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Salons Grid/List */}
      {salons.length > 0 && (
        <>
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {salons.map((salon) => (
              <div
                key={salon.id}
                onClick={() => handleSalonClick(salon.id)}
                className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all cursor-pointer group ${
                  viewMode === 'list' ? 'flex' : ''
                }`}
              >
                <div className={`relative overflow-hidden ${viewMode === 'grid' ? 'w-full h-48' : 'w-48 h-full flex-shrink-0'}`}>
                  <img
                    src={getSalonImage(salon)}
                    alt={salon.businessName || 'Salon'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = 'https://images.unsplash.com/photo-1522337360788-8b13ee0af107?w=400&h=300&fit=crop'
                    }}
                  />
                  <div className="absolute top-2 right-2">
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
                        <Star className="w-4 h-4 text-ghana-gold fill-current" />
                        <span className="text-sm font-medium">{salon.rating?.toFixed(1) || '0.0'}</span>
                        <span className="text-sm text-gray-500">({salon.reviewCount || 0} reviews)</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{salon.address || 'Address not available'}</span>
                  </div>
                  {salon.city && (
                    <div className="text-sm text-gray-400 mt-1">
                      {salon.city}{salon.region ? `, ${salon.region}` : ''}
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
          </div>
        </>
      )}
    </div>
  )
}
