import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon'
import BottomNav from '../components/BottomNav'
import LocationPicker from '../components/LocationPicker'
import { useSavedLocation, appendLocationParams } from '../hooks/useSavedLocation'
import { HaircutIcon, BarberIcon, NailsIcon, BraidingIcon, MassageIcon, DreadlocksIcon } from '../components/CategoryIcons'

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

interface Category {
  name: string
  icon: React.ReactNode
  query: string
}

import { API_BASE_URL } from '../config'

const categories: Category[] = [
  { name: 'Hair', icon: <HaircutIcon className="w-4 h-4" />, query: 'Haircut' },
  { name: 'Barber', icon: <BarberIcon className="w-4 h-4" />, query: 'Beard Trim' },
  { name: 'Nails', icon: <NailsIcon className="w-4 h-4" />, query: 'Nails' },
  { name: 'Braiding', icon: <BraidingIcon className="w-4 h-4" />, query: 'Braiding' },
  { name: 'Massage', icon: <MassageIcon className="w-4 h-4" />, query: 'Massage' },
  { name: 'Dreadlocks', icon: <DreadlocksIcon className="w-4 h-4" />, query: 'Dreadlocks' },
]

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

function SalonCard({ salon }: { salon: Salon }) {
  const formatPrice = (price?: number) => {
    if (!price || price === 0) return 'Contact for price'
    return `From GHS ${price}`
  }

  const imageUrl = getSalonImageUrl(salon)
  const displayLocation = salon.city || salon.address || salon.location

  return (
    <Link
      to={`/salon/${salon.id}`}
      className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* Image */}
      <div className="relative h-40 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={salon.businessName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#CE1126]/20 to-[#FCD116]/20">
            <span className="text-3xl font-bold text-[#CE1126]/50">
              {salon.businessName.charAt(0)}
            </span>
          </div>
        )}

        {/* Rating Badge */}
        {salon.rating && salon.rating > 0 && (
          <div className="absolute top-2 right-2 bg-[#CE1126]/90 backdrop-blur-sm rounded-lg px-2 py-0.5 flex items-center gap-1">
            <Icon name="star" size={14} className="text-[#FCD116]" filled />
            <span className="text-white font-bold text-xs">{salon.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">
          {salon.businessName}
        </h3>

        {displayLocation && (
          <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
            <Icon name="location_on" size={12} className="flex-shrink-0" />
            <span className="line-clamp-1">{displayLocation}</span>
          </div>
        )}

        <div className="flex items-center justify-between mt-2">
          <p className="text-[#CE1126] font-semibold text-sm">
            {formatPrice(salon.startingPrice)}
          </p>
          {salon.reviewCount && salon.reviewCount > 0 && (
            <span className="text-gray-400 text-xs">
              {salon.reviewCount} review{salon.reviewCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialCategory = searchParams.get('category') || ''

  const [salons, setSalons] = useState<Salon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState(initialCategory)
  const [sortBy, setSortBy] = useState<'default' | 'rating' | 'price'>('default')
  const savedLocation = useSavedLocation()

  const fetchSalons = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('limit', '50')
      if (searchQuery) params.set('search', searchQuery)
      if (activeCategory) params.set('category', activeCategory)
      if (sortBy === 'rating') params.set('sort', 'rating')
      appendLocationParams(params, savedLocation)

      const response = await fetch(`${API_BASE_URL}/salons?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch salons')
      const data = await response.json()

      if (data.success && Array.isArray(data.data)) {
        let mapped = mapSalonData(data.data)

        // Client-side sort for price since API may not support it
        if (sortBy === 'price') {
          mapped = [...mapped].sort((a, b) => {
            if (!a.startingPrice) return 1
            if (!b.startingPrice) return -1
            return a.startingPrice - b.startingPrice
          })
        }

        setSalons(mapped)
      } else {
        setSalons([])
      }
    } catch (err) {
      console.error('Error fetching salons:', err)
      setError('Failed to load salons. Please try again.')
      setSalons([])
    } finally {
      setLoading(false)
    }
  }, [searchQuery, activeCategory, sortBy, savedLocation])

  useEffect(() => {
    fetchSalons()
  }, [fetchSalons])

  // Update URL when category changes
  useEffect(() => {
    if (activeCategory) {
      setSearchParams({ category: activeCategory }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }, [activeCategory, setSearchParams])

  const handleCategoryClick = (query: string) => {
    setActiveCategory(prev => prev === query ? '' : query)
  }

  const handleClearSearch = () => {
    setSearchQuery('')
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#1a0a0b] via-[#2d1215] to-[#1a1a1a] pt-6 pb-4 px-4 sticky top-0 z-40">
        {/* Title */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-1 h-6 bg-[#CE1126] rounded-full flex-shrink-0" />
            <h1 className="text-xl font-bold text-white truncate">Explore Salons</h1>
          </div>
          <LocationPicker variant="hero" autoPrompt={false} className="flex-shrink-0" />
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-full flex items-center gap-3 px-4 py-3 shadow-lg">
          <Icon name="search" size={20} className="text-[#CE1126] flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search salons, services, or locations"
            className="flex-1 bg-transparent text-base text-gray-800 placeholder-gray-400 outline-none"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              <Icon name="close" size={16} className="text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Category Chips */}
      <div className="sticky top-[132px] z-30 bg-[#F8F9FA] pt-3 pb-2 px-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
          {categories.map((category) => {
            const isActive = activeCategory === category.query
            return (
              <button
                key={category.name}
                onClick={() => handleCategoryClick(category.query)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  isActive
                    ? 'bg-[#CE1126] text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-[#CE1126]/30 hover:text-[#CE1126]'
                }`}
              >
                {category.icon}
                {category.name}
              </button>
            )
          })}
        </div>

        {/* Sort & Count */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-gray-500 text-sm">
            {loading ? 'Searching...' : `${salons.length} salon${salons.length !== 1 ? 's' : ''} found`}
          </span>
          <div className="flex items-center gap-1">
            <Icon name="tune" size={14} className="text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'default' | 'rating' | 'price')}
              className="text-sm text-gray-600 bg-transparent border-none outline-none cursor-pointer"
            >
              <option value="default">Default</option>
              <option value="rating">Top Rated</option>
              <option value="price">Price: Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-28">
        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="h-40 bg-[#CE1126]/10 animate-pulse" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                  <div className="h-3 bg-[#FCD116]/20 rounded w-1/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-[#CE1126]/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="search" size={32} className="text-[#CE1126]/50" />
            </div>
            <p className="text-gray-500 mb-4">{error}</p>
            <button
              onClick={fetchSalons}
              className="bg-[#CE1126] text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-[#B00E22] transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && salons.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-[#FCD116]/15 flex items-center justify-center mx-auto mb-4">
              <Icon name="search" size={32} className="text-[#FCD116]/60" />
            </div>
            <h3 className="text-gray-700 font-semibold mb-1">No salons found</h3>
            <p className="text-gray-500 text-sm mb-4">
              {searchQuery || activeCategory
                ? 'Try adjusting your search or filters'
                : savedLocation
                  ? <>No salons in <span className="font-semibold">{savedLocation.label}</span> yet. Try a nearby city.</>
                  : 'Check back soon for new salons'}
            </p>
            {(searchQuery || activeCategory) && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setActiveCategory('')
                  setSortBy('default')
                }}
                className="text-[#CE1126] font-medium text-sm hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Salon Grid */}
        {!loading && !error && salons.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
            {salons.map((salon) => (
              <SalonCard key={salon.id} salon={salon} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab="explore" />
    </div>
  )
}
