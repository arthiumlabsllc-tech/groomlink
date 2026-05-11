import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'
import { GHANA_CITIES } from '../data/ghanaCities'

const CUSTOMER_APP_URL = 'https://my.groomlinkgh.com'

export default function CityDiscovery() {
  const [expandedCity, setExpandedCity] = useState<string | null>(null)

  const toggleCity = (cityName: string) => {
    setExpandedCity((prev) => (prev === cityName ? null : cityName))
  }

  const buildExploreUrl = (city: string, area?: string): string => {
    const base = `${CUSTOMER_APP_URL}/explore`
    const params = new URLSearchParams()
    params.set('city', city)
    if (area) params.set('area', area)
    return `${base}?${params.toString()}`
  }

  return (
    <section className="section-container py-12 md:py-16 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-brand-text mb-2">
            Explore by City & Area
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Find salons and barbershops in your neighborhood across Ghana's major cities
          </p>
        </div>

        {/* City Accordion */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {GHANA_CITIES.map((city) => (
            <div
              key={city.city}
              className="border border-gray-200 rounded-2xl overflow-hidden bg-white hover:shadow-md transition-shadow"
            >
              {/* City Header */}
              <button
                onClick={() => toggleCity(city.city)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                    <img
                      src={city.image}
                      alt={city.city}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-brand-text">{city.city}</p>
                    <p className="text-xs text-gray-500">{city.areas.length} areas</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={buildExploreUrl(city.city)}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs font-semibold text-[#006B3F] hover:underline px-2 py-1 rounded-md hover:bg-[#006B3F]/10 transition-colors"
                  >
                    View All
                  </a>
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
                        <a
                          key={area}
                          href={buildExploreUrl(city.city, area)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-[#006B3F]/10 text-gray-700 hover:text-[#006B3F] text-xs font-medium rounded-full transition-colors"
                        >
                          {area}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
