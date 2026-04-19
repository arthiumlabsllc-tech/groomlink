import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon'
import apiClient from '../lib/api'

interface City {
  name: string
  salonCount: number
  image: string
}

interface CitiesResponse {
  success: boolean
  data: City[]
}

const DEFAULT_CITIES: City[] = [
  { name: 'Accra', salonCount: 0, image: 'https://images.unsplash.com/photo-1576487503230-b6dc3ad12eea?w=300&h=200&fit=crop' },
  { name: 'Kumasi', salonCount: 0, image: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=300&h=200&fit=crop' },
  { name: 'Takoradi', salonCount: 0, image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=300&h=200&fit=crop' },
  { name: 'Tamale', salonCount: 0, image: 'https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?w=300&h=200&fit=crop' },
  { name: 'Cape Coast', salonCount: 0, image: 'https://images.unsplash.com/photo-1544212281-43271b247165?w=300&h=200&fit=crop' },
  { name: 'Tema', salonCount: 0, image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=300&h=200&fit=crop' },
]

async function fetchCities(): Promise<City[]> {
  try {
    const response = await apiClient.get<CitiesResponse>('/discover/cities')
    const apiCities = response.data.data || []
    
    // Merge with default cities to ensure we have images
    return DEFAULT_CITIES.map(defaultCity => {
      const apiCity = apiCities.find(c => c.name === defaultCity.name)
      return {
        ...defaultCity,
        salonCount: apiCity?.salonCount || 0
      }
    })
  } catch (error) {
    // Return default cities if API fails
    return DEFAULT_CITIES
  }
}

interface CityDiscoveryProps {
  variant?: 'chips' | 'grid'
}

export default function CityDiscovery({ variant = 'chips' }: CityDiscoveryProps) {
  const navigate = useNavigate()
  const { data: cities, isLoading } = useQuery({
    queryKey: ['discover-cities'],
    queryFn: fetchCities,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const handleCityClick = (cityName: string) => {
    navigate(`/explore?city=${encodeURIComponent(cityName)}`)
  }

  if (variant === 'chips') {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Popular Cities</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {isLoading ? (
            // Loading skeleton
            [1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="flex-shrink-0 w-24 h-10 bg-gray-200 rounded-full animate-pulse"
              />
            ))
          ) : (
            cities?.map((city) => (
              <button
                key={city.name}
                onClick={() => handleCityClick(city.name)}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:border-ghana-red hover:text-ghana-red transition-colors shadow-sm"
              >
                <Icon name="location_on" size={16} />
                {city.name}
              </button>
            ))
          )}
        </div>
      </div>
    )
  }

  // Grid variant
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">Discover by City</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {isLoading ? (
          // Loading skeleton
          [1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-24 bg-gray-200 rounded-xl animate-pulse"
            />
          ))
        ) : (
          cities?.map((city) => (
            <button
              key={city.name}
              onClick={() => handleCityClick(city.name)}
              className="relative h-24 rounded-xl overflow-hidden group"
            >
              <img
                src={city.image}
                alt={city.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
                <p className="font-semibold text-white text-sm">{city.name}</p>
                <p className="text-xs text-white/80">
                  {city.salonCount > 0 ? `${city.salonCount} salons` : 'Explore'}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
