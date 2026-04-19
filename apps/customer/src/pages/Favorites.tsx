import { useState, useEffect } from 'react'
import Icon from '../components/Icon'
import apiClient from '../lib/api'

interface Salon {
  id: string
  name: string
  rating?: number
  reviewCount?: number
  category?: string
  address?: string
  images?: string[]
  image?: string
  isOpen?: boolean
  distance?: string
}

type SortOption = 'recent' | 'topRated' | 'nearest'

export default function Favorites() {
  const [favoritesList, setFavoritesList] = useState<Salon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('recent')

  useEffect(() => {
    fetchFavorites()
  }, [])

  const fetchFavorites = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.get('/users/favorites')
      const favorites = response.data.data || response.data || []
      setFavoritesList(favorites)
    } catch (err) {
      setError('Failed to load favorites. Please try again.')
      console.error('Error fetching favorites:', err)
    } finally {
      setLoading(false)
    }
  }

  const removeFavorite = async (salonId: string) => {
    try {
      setRemovingId(salonId)
      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, 300))
      await apiClient.delete(`/users/favorites/${salonId}`)
      setFavoritesList(prev => prev.filter(item => item.id !== salonId))
    } catch (err) {
      console.error('Error removing favorite:', err)
      alert('Failed to remove favorite. Please try again.')
    } finally {
      setRemovingId(null)
    }
  }

  const getSalonImage = (salon: Salon) => {
    if (salon.images && salon.images.length > 0) {
      return salon.images[0]
    }
    if (salon.image) {
      return salon.image
    }
    return 'https://images.unsplash.com/photo-1585747860715-2d3b4c7e3a23?w=400&h=300&fit=crop'
  }

  const getSalonName = (salon: Salon) => salon.name || 'Unnamed Salon'
  const getSalonRating = (salon: Salon) => salon.rating ?? 0
  const getReviewCount = (salon: Salon) => salon.reviewCount ?? 0
  const getCategory = (salon: Salon) => salon.category || 'Salon'
  const getAddress = (salon: Salon) => salon.address || 'Address not available'

  // Sort favorites based on selected option
  const sortedFavorites = [...favoritesList].sort((a, b) => {
    switch (sortBy) {
      case 'topRated':
        return (b.rating ?? 0) - (a.rating ?? 0)
      case 'nearest':
        // Simple distance sort if distance string exists (e.g., "1.2 km")
        const distA = parseFloat(a.distance?.replace(/[^0-9.]/g, '') || '999')
        const distB = parseFloat(b.distance?.replace(/[^0-9.]/g, '') || '999')
        return distA - distB
      case 'recent':
      default:
        return 0 // Keep original order
    }
  })

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
            <Icon name="favorite" size={20} className="text-[#CE1126]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Favorites</h1>
            <p className="text-gray-600 text-sm">Loading your saved salons...</p>
          </div>
        </div>
        
        {/* Skeleton Loading */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card-v2 overflow-hidden">
              <div className="skeleton-shimmer h-40 sm:h-48 w-full" />
              <div className="p-4 space-y-3">
                <div className="skeleton-shimmer h-5 w-3/4" />
                <div className="skeleton-shimmer h-4 w-1/2" />
                <div className="skeleton-shimmer h-4 w-2/3" />
                <div className="flex gap-2 pt-2">
                  <div className="skeleton-shimmer h-8 w-20" />
                  <div className="skeleton-shimmer h-8 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
            <Icon name="favorite" size={20} className="text-[#CE1126]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Favorites</h1>
            <p className="text-gray-600 text-sm">Your saved salons and barbershops</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Icon name="error" size={48} className="text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Something went wrong</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button onClick={fetchFavorites} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
            <Icon name="favorite" size={20} className="text-[#CE1126]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">My Favorites</h1>
              {favoritesList.length > 0 && (
                <span className="px-2.5 py-0.5 bg-primary-100 text-[#CE1126] text-sm font-semibold rounded-full">
                  {favoritesList.length}
                </span>
              )}
            </div>
            <p className="text-gray-600 text-sm">Your saved salons and barbershops</p>
          </div>
        </div>
        
        {/* Sort Options */}
        {favoritesList.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 hidden sm:inline">Sort by:</span>
            <div className="flex gap-1.5">
              {[
                { key: 'recent', label: 'Recent' },
                { key: 'topRated', label: 'Top Rated' },
                { key: 'nearest', label: 'Nearest' },
              ].map((option) => (
                <button
                  key={option.key}
                  onClick={() => setSortBy(option.key as SortOption)}
                  className={`tab-pill ${
                    sortBy === option.key ? 'tab-pill-active' : 'tab-pill-inactive'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {favoritesList.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-16 sm:py-20 px-4 animate-fade-in-up">
          <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mb-6">
            <Icon name="favorite" size={40} className="text-[#CE1126]" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No favorites yet</h3>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto text-center">
            Explore salons and save your favorites to book them quickly later!
          </p>
          <a 
            href="/explore" 
            className="inline-flex items-center gap-2 btn-primary px-6 py-3 text-base shadow-card hover:shadow-card-hover transition-shadow"
          >
            <Icon name="explore" size={20} />
            Start exploring salons
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {sortedFavorites.map((salon, index) => (
            <div 
              key={salon.id} 
              className={`card-v2 overflow-hidden animate-fade-in-up ${
                removingId === salon.id ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="relative img-zoom">
                <a href={`/salon/${salon.id}`}>
                  <img 
                    src={getSalonImage(salon)} 
                    alt={getSalonName(salon)} 
                    className="w-full h-40 sm:h-48 object-cover" 
                  />
                </a>
                <button 
                  onClick={() => removeFavorite(salon.id)} 
                  disabled={removingId === salon.id}
                  className="absolute top-3 right-3 p-2.5 bg-white rounded-full shadow-card hover:bg-red-50 hover:shadow-card-hover transition-all duration-200 disabled:opacity-50 group"
                >
                  {removingId === salon.id ? (
                    <Icon name="progress_activity" size={18} className="text-red-500 animate-spin" />
                  ) : (
                    <Icon name="favorite" size={18} filled className="text-[#CE1126] group-hover:scale-110 transition-transform" />
                  )}
                </button>
                {salon.isOpen !== undefined && (
                  <span className={`absolute bottom-3 left-3 px-2.5 py-1 text-xs font-semibold rounded-full ${
                    salon.isOpen ? 'bg-green-500 text-white' : 'bg-gray-600 text-white'
                  }`}>
                    {salon.isOpen ? 'Open Now' : 'Closed'}
                  </span>
                )}
              </div>
              <div className="p-4">
                <a href={`/salon/${salon.id}`} className="block group">
                  <h3 className="font-semibold text-gray-900 group-hover:text-[#CE1126] transition-colors text-base line-clamp-1">
                    {getSalonName(salon)}
                  </h3>
                </a>
                <div className="flex items-center gap-2 mt-1.5">
                  <Icon name="star" size={16} filled className="text-yellow-400" />
                  <span className="text-sm font-semibold text-gray-900">{getSalonRating(salon).toFixed(1)}</span>
                  <span className="text-sm text-gray-500">({getReviewCount(salon)} reviews)</span>
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-500">
                  <Icon name="location_on" size={16} className="flex-shrink-0 text-gray-400" />
                  <span className="truncate">{getAddress(salon)}</span>
                  {salon.distance && (
                    <>
                      <span className="mx-1 flex-shrink-0 text-gray-300">•</span>
                      <span className="flex-shrink-0 font-medium text-gray-700">{salon.distance}</span>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <span className="text-xs bg-primary-50 text-[#CE1126] px-2.5 py-1 rounded-full font-medium">
                    {getCategory(salon)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <a 
                    href={`/salon/${salon.id}`} 
                    className="text-sm text-gray-600 hover:text-[#CE1126] font-medium transition-colors"
                  >
                    View Details
                  </a>
                  <a 
                    href={`/salon/${salon.id}/book`} 
                    className="inline-flex items-center gap-1.5 bg-[#CE1126] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#A00D1E] transition-colors shadow-sm hover:shadow-md"
                  >
                    Book Now
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
