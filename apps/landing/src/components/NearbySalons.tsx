import { useEffect, useRef, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'
import { useDarkMode } from '../hooks/useDarkMode'
import { useGeolocation, getDistanceKm, formatDistance } from '../hooks/useGeolocation'

interface Salon {
  id: string
  businessName: string
  coverImage?: string
  images?: string[]
  logo?: string
  rating?: number
  reviewCount?: number
  city?: string
  address?: string
  location?: string
  startingPrice?: number
  latitude?: number | null
  longitude?: number | null
  providerCategory?: string
  distance?: number
}

import { API_BASE_URL } from '../config'


function mapSalonData(raw: any[], userLat?: number, userLng?: number): Salon[] {
  return raw.map((s: any) => {
    const salon: Salon = {
      id: s.id,
      businessName: s.businessName,
      coverImage: s.coverImage || undefined,
      images: s.images || undefined,
      logo: s.logo || undefined,
      rating: s.rating,
      reviewCount: s.reviewCount,
      city: s.city,
      address: s.address,
      location: s.city || s.address,
      latitude: s.latitude,
      longitude: s.longitude,
      providerCategory: s.providerCategory,
      startingPrice: s.services?.length
        ? Math.min(...s.services.map((svc: any) => Number(svc.price)).filter(Boolean))
        : undefined,
    }
    if (userLat != null && userLng != null && s.latitude != null && s.longitude != null) {
      salon.distance = getDistanceKm(userLat, userLng, s.latitude, s.longitude)
    }
    return salon
  })
}

export default function NearbySalons() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [salons, setSalons] = useState<Salon[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [homeServiceOnly, setHomeServiceOnly] = useState(false)
  const isDark = useDarkMode()
  const { state, data: geoData, error: geoError, request } = useGeolocation()

  // Intersection observer for animation
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
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  // Fetch salons when location is granted
  useEffect(() => {
    if (state !== 'granted' || !geoData) return

    const fetchNearby = async () => {
      try {
        setLoading(true)
        setError(null)
        const params = new URLSearchParams({
          lat: geoData.latitude.toString(),
          lng: geoData.longitude.toString(),
          radius: '10',
          limit: '12',
        })
        const response = await fetch(`${API_BASE_URL}/salons/nearby?${params.toString()}`)
        if (!response.ok) throw new Error('Failed to fetch nearby salons')
        const result = await response.json()
        const raw = result.data || result.salons || []
        const mapped = mapSalonData(raw, geoData.latitude, geoData.longitude)
        // Sort by distance
        mapped.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
        setSalons(mapped)
      } catch (err) {
        setError('Unable to load nearby salons')
        console.error('Error fetching nearby salons:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchNearby()
  }, [state, geoData])

  // Fallback: fetch featured salons if location denied/error/unsupported
  useEffect(() => {
    if (state === 'idle' || state === 'requesting' || state === 'granted') return

    const fetchFeatured = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`${API_BASE_URL}/salons?limit=6`)
        if (!response.ok) throw new Error('Failed to fetch salons')
        const data = await response.json()
        const raw = data.data || []
        setSalons(mapSalonData(raw))
      } catch (err) {
        setError('Unable to load salons')
        console.error('Error fetching salons:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchFeatured()
  }, [state])

  const filteredSalons = useMemo(() => {
    if (!homeServiceOnly) return salons
    return salons.filter((s) => s.providerCategory === 'FREELANCER')
  }, [salons, homeServiceOnly])

  const formatPrice = (price?: number) => {
    if (!price || price === 0) return 'Contact for price'
    return `From GHS ${price}`
  }

  const sectionTitle =
    state === 'granted' && geoData ? 'Salons Near You' : 'Featured Salons & Barbershops'

  const sectionSubtitle =
    state === 'granted' && geoData
      ? 'Discover top-rated salons and barbershops in your area'
      : 'Discover top-rated salons and barbershops across Ghana'

  return (
    <section ref={sectionRef} className="py-20 bg-white">
      <div className="section-container">
        {/* Section Header */}
        <div
          className={`text-center mb-12 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-brand-text mb-4">{sectionTitle}</h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">{sectionSubtitle}</p>
        </div>

        {/* Location Permission Prompt */}
        {state === 'idle' && (
          <div
            className={`max-w-2xl mx-auto mb-12 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <div className="bg-gradient-to-br from-brand-secondary/10 to-brand-primary/10 border border-brand-secondary/20 rounded-2xl p-6 md:p-8 text-center">
              <div className="w-16 h-16 bg-brand-secondary/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="location_on" size={32} className="text-brand-secondary" filled />
              </div>
              <h3 className="text-xl font-bold text-brand-text mb-2">Find Salons Near You</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Allow location access to see salons, barbershops, and home service professionals
                around you.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={request}
                  className="inline-flex items-center gap-2 bg-brand-secondary text-white font-bold px-6 py-3 rounded-xl hover:bg-brand-secondary/90 transition-all shadow-lg hover:shadow-xl"
                >
                  <Icon name="my_location" size={20} />
                  Use My Location
                </button>
                <Link
                  to="/explore"
                  className="inline-flex items-center gap-2 text-brand-secondary font-semibold px-6 py-3 rounded-xl hover:bg-brand-secondary/10 transition-all"
                >
                  Browse All Salons
                  <Icon name="arrow_forward" size={18} />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Requesting State */}
        {state === 'requesting' && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-12 h-12 border-4 border-brand-secondary/20 border-t-brand-secondary rounded-full animate-spin mb-4" />
            <p className="text-gray-500">Getting your location...</p>
          </div>
        )}

        {/* Denied / Error Banner */}
        {(state === 'denied' || state === 'error' || state === 'unsupported') && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <Icon name="location_off" size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-800 text-sm font-medium">
                  {geoError || 'Location unavailable'}
                </p>
                <p className="text-amber-700 text-sm mt-1">
                  Showing featured salons across Ghana instead.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Home Service Toggle (only when location granted) */}
        {state === 'granted' && salons.length > 0 && (
          <div
            className={`flex items-center justify-center gap-3 mb-8 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <button
              onClick={() => setHomeServiceOnly(false)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                !homeServiceOnly
                  ? 'bg-brand-secondary text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Salons
            </button>
            <button
              onClick={() => setHomeServiceOnly(true)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all inline-flex items-center gap-1.5 ${
                homeServiceOnly
                  ? 'bg-brand-secondary text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon name="home" size={16} />
              Home Service Only
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <img
              src={isDark ? '/logo-white.png' : '/logo-black.png'}
              alt="Loading..."
              className="w-10 h-10 animate-pulse-logo mb-4"
            />
            <p className="text-gray-500">
              {state === 'granted' ? 'Finding nearby salons...' : 'Loading salons...'}
            </p>
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
        {!loading && !error && filteredSalons.length === 0 && state !== 'idle' && (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-2">
              {homeServiceOnly
                ? 'No home service professionals found nearby.'
                : 'No salons found nearby.'}
            </p>
            <p className="text-gray-400 text-sm mb-4">
              {homeServiceOnly
                ? 'Try switching to "All Salons" or browse the full directory.'
                : 'Try browsing all salons across Ghana.'}
            </p>
            <Link
              to="/explore"
              className="text-brand-primary hover:underline font-medium"
            >
              Explore all salons
            </Link>
          </div>
        )}

        {/* Salons Grid */}
        {!loading && !error && filteredSalons.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSalons.slice(0, 6).map((salon, index) => (
              <Link
                key={salon.id}
                to={`/salon/${salon.id}`}
                className={`card card-hover overflow-hidden group transition-all duration-700 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}
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

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-2">
                    {salon.distance != null && (
                      <span className="bg-brand-secondary/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Icon name="near_me" size={12} filled />
                        {formatDistance(salon.distance)}
                      </span>
                    )}
                    {salon.providerCategory === 'FREELANCER' && (
                      <span className="bg-brand-primary/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Icon name="home" size={12} filled />
                        Home Service
                      </span>
                    )}
                  </div>

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
                      <span className="text-gray-400 text-sm">({salon.reviewCount} reviews)</span>
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
        {!loading && !error && filteredSalons.length > 0 && (
          <div
            className={`text-center mt-12 transition-all duration-700 delay-500 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <Link to="/explore" className="btn-secondary inline-block">
              {state === 'granted' ? 'Explore More Nearby Salons' : 'View All Salons & Barbershops'}
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
