import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon'
import { GHANA_CITIES, type CityArea } from '../data/ghanaCities'

interface CityDiscoveryProps {
  variant?: 'chips' | 'grid' | 'accordion'
}

export default function CityDiscovery({ variant = 'chips' }: CityDiscoveryProps) {
  const navigate = useNavigate()
  const [expandedCity, setExpandedCity] = useState<string | null>(null)

  const handleCityClick = (cityName: string) => {
    navigate(`/explore?city=${encodeURIComponent(cityName)}`)
  }

  const handleAreaClick = (cityName: string, areaName: string) => {
    navigate(`/explore?city=${encodeURIComponent(cityName)}&area=${encodeURIComponent(areaName)}`)
  }

  const toggleCity = (cityName: string) => {
    setExpandedCity((prev) => (prev === cityName ? null : cityName))
  }

  if (variant === 'accordion') {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Explore by City & Area</h2>
        <div className="space-y-2">
          {GHANA_CITIES.map((city) => (
            <div
              key={city.city}
              className="border border-gray-200 rounded-xl overflow-hidden bg-white"
            >
              {/* City Header */}
              <button
                onClick={() => toggleCity(city.city)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <img
                      src={city.image}
                      alt={city.city}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-brand-text text-sm">{city.city}</p>
                    <p className="text-xs text-gray-500">{city.areas.length} areas</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCityClick(city.city)
                    }}
                    className="text-xs font-medium text-[#006B3F] hover:underline px-2 py-1 rounded-md hover:bg-[#006B3F]/10 transition-colors"
                  >
                    View All
                  </span>
                  <Icon
                    name="expand_more"
                    size={20}
                    className={`text-gray-400 transition-transform duration-200 ${expandedCity === city.city ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              {/* Areas Grid */}
              {expandedCity === city.city && (
                <div className="px-4 pb-4">
                  <div className="border-t border-gray-100 pt-3">
                    <div className="flex flex-wrap gap-2">
                      {city.areas.map((area) => (
                        <button
                          key={area}
                          onClick={() => handleAreaClick(city.city, area)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-[#006B3F]/10 text-gray-700 hover:text-[#006B3F] text-xs font-medium rounded-full transition-colors"
                        >
                          {area}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (variant === 'chips') {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Popular Cities</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {GHANA_CITIES.map((city) => (
            <button
              key={city.city}
              onClick={() => handleCityClick(city.city)}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:border-[#CE1126] hover:text-[#CE1126] transition-colors shadow-sm"
            >
              <Icon name="location_on" size={16} />
              {city.city}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Grid variant
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">Discover by City</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {GHANA_CITIES.map((city) => (
          <button
            key={city.city}
            onClick={() => handleCityClick(city.city)}
            className="relative h-24 rounded-xl overflow-hidden group"
          >
            <img
              src={city.image}
              alt={city.city}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
              <p className="font-semibold text-white text-sm">{city.city}</p>
              <p className="text-xs text-white/80">{city.areas.length} areas</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
