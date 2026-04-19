import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'

interface Salon {
  id: string
  businessName: string
  coverImage?: string
  images?: string[]
  logo?: string
  rating?: number
  reviewCount?: number
  location?: string
  startingPrice?: number
}

const API_BASE_URL = 'https://groomlinkgh.com/api'

export default function FeaturedSalons() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [salons, setSalons] = useState<Salon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const fetchSalons = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${API_BASE_URL}/salons?limit=6`)
        if (!response.ok) {
          throw new Error('Failed to fetch salons')
        }
        const data = await response.json()
        if (data.success && Array.isArray(data.data)) {
          setSalons(data.data)
        } else {
          setSalons([])
        }
      } catch (err) {
        setError('Unable to load salons at this time')
        console.error('Error fetching salons:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSalons()
  }, [])

  const formatPrice = (price?: number) => {
    if (!price || price === 0) return 'Contact for price'
    return `From GHS ${price}`
  }

  return (
    <section ref={sectionRef} className="py-20 bg-white">
      <div className="section-container">
        {/* Section Header */}
        <div className={`text-center mb-12 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <h2 className="text-3xl sm:text-4xl font-bold text-brand-text mb-4">
            Featured Salons & Barbershops
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Discover top-rated salons and barbershops near you
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <img
              src="/logo-black.png"
              alt="Loading..."
              className="w-10 h-10 animate-pulse-logo mb-4"
            />
            <p className="text-gray-500">Loading salons...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-brand-primary hover:underline font-medium"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && salons.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">No salons available at the moment.</p>
            <Link
              to="/explore"
              className="text-brand-primary hover:underline font-medium"
            >
              Explore all salons
            </Link>
          </div>
        )}

        {/* Salons Grid */}
        {!loading && !error && salons.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {salons.map((salon, index) => (
              <Link
                key={salon.id}
                to={`/salon/${salon.id}`}
                className={`card card-hover overflow-hidden group transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                {/* Cover Photo */}
                <div className="relative h-48 overflow-hidden bg-gray-200">
                  {salon.coverImage ? (
                    <img
                      src={salon.coverImage}
                      alt={salon.businessName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : salon.images && salon.images.length > 0 ? (
                    <img
                      src={salon.images[0]}
                      alt={salon.businessName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : salon.logo ? (
                    <img
                      src={salon.logo}
                      alt={salon.businessName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-primary/10 to-brand-secondary/10">
                      <span className="text-4xl font-bold text-brand-primary/30">
                        {salon.businessName.charAt(0)}
                      </span>
                    </div>
                  )}
                  {/* Price Badge */}
                  <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold text-brand-text shadow-sm">
                    {formatPrice(salon.startingPrice)}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="font-bold text-brand-text mb-2 group-hover:text-brand-primary transition-colors line-clamp-1">
                    {salon.businessName}
                  </h3>
                  
                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-1">
                      <Icon name="star" size={16} className="text-brand-gold" filled />
                      <span className="font-semibold text-sm">
                        {salon.rating?.toFixed(1) || 'New'}
                      </span>
                    </div>
                    {salon.reviewCount && salon.reviewCount > 0 && (
                      <span className="text-gray-400 text-sm">
                        ({salon.reviewCount} reviews)
                      </span>
                    )}
                  </div>

                  {/* Location */}
                  {salon.location && (
                    <div className="flex items-center gap-1 text-gray-500 text-sm">
                      <Icon name="location_on" size={16} className="flex-shrink-0" />
                      <span className="line-clamp-1">{salon.location}</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* View All Button */}
        {!loading && !error && salons.length > 0 && (
          <div className={`text-center mt-12 transition-all duration-700 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <Link
              to="/explore"
              className="btn-secondary inline-block"
            >
              View All Salons & Barbershops
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
