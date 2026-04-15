import { useState, useEffect } from 'react'
import { Heart, MapPin, Star, Loader2, AlertCircle } from 'lucide-react'
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

export default function Favorites() {
  const [favoritesList, setFavoritesList] = useState<Salon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Favorites</h1>
          <p className="text-gray-600 mt-1">Your saved salons and barbershops</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <span className="ml-3 text-gray-600">Loading favorites...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Favorites</h1>
          <p className="text-gray-600 mt-1">Your saved salons and barbershops</p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Favorites</h1>
        <p className="text-gray-600 mt-1">Your saved salons and barbershops</p>
      </div>

      {favoritesList.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No favorites yet</h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">Explore salons and save your favorites to book them quickly later!</p>
          <a href="/explore" className="inline-block btn-primary px-6 py-3">Explore Salons</a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoritesList.map((salon) => (
            <div key={salon.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative">
                <a href={`/salon/${salon.id}`}>
                  <img 
                    src={getSalonImage(salon)} 
                    alt={getSalonName(salon)} 
                    className="w-full h-48 object-cover hover:opacity-95 transition-opacity" 
                  />
                </a>
                <button 
                  onClick={() => removeFavorite(salon.id)} 
                  disabled={removingId === salon.id}
                  className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {removingId === salon.id ? (
                    <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
                  ) : (
                    <Heart className="w-5 h-5 text-red-500 fill-current" />
                  )}
                </button>
                {salon.isOpen !== undefined && (
                  <span className={'absolute bottom-3 left-3 px-2 py-1 text-xs font-medium rounded ' + (salon.isOpen ? 'bg-green-500 text-white' : 'bg-gray-500 text-white')}>
                    {salon.isOpen ? 'Open Now' : 'Closed'}
                  </span>
                )}
              </div>
              <div className="p-4">
                <a href={`/salon/${salon.id}`} className="block">
                  <h3 className="font-semibold text-gray-900 hover:text-primary-600 transition-colors">{getSalonName(salon)}</h3>
                </a>
                <div className="flex items-center gap-2 mt-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-medium">{getSalonRating(salon).toFixed(1)}</span>
                  <span className="text-sm text-gray-500">({getReviewCount(salon)} reviews)</span>
                </div>
                <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{getAddress(salon)}</span>
                  {salon.distance && <span className="mx-1 flex-shrink-0">•</span>}
                  {salon.distance && <span className="flex-shrink-0">{salon.distance}</span>}
                </div>
                <div className="flex flex-wrap gap-1 mt-3">
                  <span className="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded">{getCategory(salon)}</span>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <a 
                    href={`/salon/${salon.id}`} 
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    View Details
                  </a>
                  <a 
                    href={`/salon/${salon.id}/book`} 
                    className="btn-primary text-sm py-1.5 px-4"
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
