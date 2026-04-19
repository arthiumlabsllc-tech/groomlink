import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Icon from '../components/Icon'

const API_BASE_URL = 'https://groomlinkgh.com/api'

// Types
interface Service {
  id: string
  name: string
  description: string | null
  category: string
  duration: number
  price: string
  discountPrice?: string | null
  promoLabel?: string | null
  isActive: boolean
}

interface Review {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  customer: {
    firstName: string
    lastName: string
    avatar: string | null
    city: string | null
  }
  service?: {
    name: string
  } | null
  worker?: {
    fullName: string
  } | null
}

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
  coverImage: string | null
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
  services?: Service[]
  reviews?: Review[]
}

interface ApiResponse {
  success: boolean
  data: Salon
}

interface ReviewsResponse {
  success: boolean
  data: Review[]
  total: number
}

const formatCategoryLabel = (type: string): string => {
  const labels: Record<string, string> = {
    BARBERSHOP: 'Barbershop',
    HAIR_SALON: 'Hair Salon',
    NAIL_SALON: 'Nail Salon',
    PEDICURE_SALON: 'Pedicure Salon',
    SPA: 'Spa',
    BEAUTY_SALON: 'Beauty Salon',
  }
  return labels[type] || type
}

const formatDayName = (day: string): string => {
  const days: Record<string, string> = {
    MONDAY: 'Mon',
    TUESDAY: 'Tue',
    WEDNESDAY: 'Wed',
    THURSDAY: 'Thu',
    FRIDAY: 'Fri',
    SATURDAY: 'Sat',
    SUNDAY: 'Sun',
  }
  return days[day.toUpperCase()] || day
}

const getSalonCoverImage = (salon: Salon): string => {
  if (salon.coverImage) {
    return salon.coverImage
  }
  if (salon.images && salon.images.length > 0) {
    return salon.images[0]
  }
  if (salon.logo) {
    return salon.logo
  }
  // Default images by salon type
  const defaultImages: Record<string, string> = {
    BARBERSHOP: 'https://images.unsplash.com/photo-1585747860715-2d3b4c7e3a23?w=800&h=400&fit=crop',
    HAIR_SALON: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=400&fit=crop',
    NAIL_SALON: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&h=400&fit=crop',
    SPA: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&h=400&fit=crop',
  }
  return defaultImages[salon.type] || 'https://images.unsplash.com/photo-1522337360788-8b13ee0af107?w=800&h=400&fit=crop'
}

const formatPrice = (price: string): string => {
  const numPrice = parseFloat(price)
  if (isNaN(numPrice)) return price
  return `GHS ${numPrice.toFixed(2)}`
}

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

export default function SalonDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [salon, setSalon] = useState<Salon | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)

  useEffect(() => {
    if (!id) {
      setError('Salon ID is required')
      setLoading(false)
      return
    }

    const fetchSalon = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`${API_BASE_URL}/salons/${id}`)
        const data: ApiResponse = await response.json()
        
        if (data.success) {
          setSalon(data.data)
        } else {
          setError('Failed to load salon details')
        }
      } catch (err) {
        setError('Failed to load salon details. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchSalon()
  }, [id])

  // Fetch reviews separately
  useEffect(() => {
    if (!id) return

    const fetchReviews = async () => {
      setReviewsLoading(true)
      try {
        const response = await fetch(`${API_BASE_URL}/salons/${id}/reviews?limit=5`)
        const data: ReviewsResponse = await response.json()
        
        if (data.success) {
          setReviews(data.data || [])
        }
      } catch (err) {
        console.error('Failed to fetch reviews:', err)
      } finally {
        setReviewsLoading(false)
      }
    }

    fetchReviews()
  }, [id])

  const handleBack = () => {
    navigate('/')
  }

  const handleBookNow = () => {
    // Redirect to customer app - it will handle auth
    window.location.href = `https://my.groomlinkgh.com/salon/${id}`
  }

  const handleBookService = (serviceId: string) => {
    // Redirect to customer app booking page with service pre-selected
    window.location.href = `https://my.groomlinkgh.com/salon/${id}/book?service=${serviceId}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Icon name="progress_activity" size={48} className="text-[#006B3F] animate-spin mb-4" />
        <p className="text-gray-600">Loading salon details...</p>
      </div>
    )
  }

  if (error || !salon) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
            >
              <Icon name="arrow_back" size={20} />
              <span className="font-medium">Back</span>
            </button>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Icon name="error" size={64} className="text-red-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {error === 'Salon not found' ? 'Salon Not Found' : 'Error Loading Salon'}
            </h2>
            <p className="text-gray-600 max-w-md mb-6">
              {error || 'Unable to load salon details. Please try again later.'}
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleBack}
                className="px-6 py-2 bg-[#006B3F] text-white rounded-lg hover:bg-[#006B3F]/90 transition-colors"
              >
                Go Home
              </button>
              {error !== 'Salon not found' && (
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const services = salon.services || []
  const displayLocation = salon.city || salon.address

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
          >
            <Icon name="arrow_back" size={20} />
            <span className="font-medium hidden sm:inline">Back</span>
          </button>
          <h1 className="font-semibold text-gray-900 truncate max-w-[200px] sm:max-w-md">
            {salon.businessName}
          </h1>
          <div className="w-16" /> {/* Spacer for balance */}
        </div>
      </header>

      <main className="max-w-4xl mx-auto">
        {/* Hero Image */}
        <div className="relative h-56 sm:h-72 lg:h-80 w-full overflow-hidden">
          <img
            src={getSalonCoverImage(salon)}
            alt={salon.businessName || 'Salon'}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = 'https://images.unsplash.com/photo-1522337360788-8b13ee0af107?w=800&h=400&fit=crop'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <span className="inline-block px-3 py-1 bg-[#FCD116] text-[#006B3F] text-xs font-bold rounded-full mb-2">
              {formatCategoryLabel(salon.type)}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold">{salon.businessName || 'Unnamed Salon'}</h1>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* Rating & Quick Info */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                {/* Rating */}
                <div className="flex items-center gap-1">
                  <Icon name="star" size={20} className="text-[#FCD116]" filled />
                  <span className="text-lg font-bold text-gray-900">{salon.rating?.toFixed(1) || 'New'}</span>
                  <span className="text-gray-500 text-sm">({salon.reviewCount || 0} reviews)</span>
                </div>
              </div>
              
              {/* Quick Contact */}
              {salon.phoneNumber && (
                <a
                  href={`tel:${salon.phoneNumber}`}
                  className="flex items-center gap-2 text-[#006B3F] hover:text-[#006B3F]/80 font-medium"
                >
                  <Icon name="call" size={16} />
                  <span className="text-sm">Call Now</span>
                </a>
              )}
            </div>

            {/* Location */}
            {displayLocation && (
              <div className="flex items-start gap-2 mt-3 text-gray-600">
                <Icon name="location_on" size={16} className="flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p>{salon.address}</p>
                  {(salon.city || salon.region) && (
                    <p className="text-gray-500">
                      {salon.city}{salon.city && salon.region ? ', ' : ''}{salon.region}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Operating Hours */}
            {(salon.openingTime || salon.closingTime) && (
              <div className="flex items-center gap-2 mt-3 text-gray-600">
                <Icon name="schedule" size={16} className="flex-shrink-0" />
                <span className="text-sm">
                  {salon.openingTime || '--:--'} - {salon.closingTime || '--:--'}
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          {salon.description && (
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h2 className="text-lg font-bold text-gray-900 mb-2">About</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{salon.description}</p>
            </div>
          )}

          {/* Gallery */}
          {salon.images && salon.images.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Gallery</h2>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {salon.images.slice(0, 6).map((img, idx) => (
                  <div key={idx} className="relative w-28 h-28 flex-shrink-0 rounded-lg overflow-hidden">
                    <img
                      src={img}
                      alt={`${salon.businessName} - ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Amenities */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Amenities</h2>
            <div className="flex flex-wrap gap-2">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${salon.hasWifi ? 'bg-[#006B3F]/10 text-[#006B3F]' : 'bg-gray-100 text-gray-400'}`}>
                <Icon name="wifi" size={16} />
                <span className="font-medium">WiFi</span>
                {salon.hasWifi && <Icon name="check_circle" size={16} filled />}
              </div>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${salon.hasParking ? 'bg-[#006B3F]/10 text-[#006B3F]' : 'bg-gray-100 text-gray-400'}`}>
                <Icon name="local_parking" size={16} />
                <span className="font-medium">Parking</span>
                {salon.hasParking && <Icon name="check_circle" size={16} filled />}
              </div>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${salon.hasAC ? 'bg-[#006B3F]/10 text-[#006B3F]' : 'bg-gray-100 text-gray-400'}`}>
                <Icon name="ac_unit" size={16} />
                <span className="font-medium">Air Conditioning</span>
                {salon.hasAC && <Icon name="check_circle" size={16} filled />}
              </div>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${salon.acceptsWalkIns ? 'bg-[#006B3F]/10 text-[#006B3F]' : 'bg-gray-100 text-gray-400'}`}>
                <Icon name="directions_walk" size={16} />
                <span className="font-medium">Walk-ins Welcome</span>
                {salon.acceptsWalkIns && <Icon name="check_circle" size={16} filled />}
              </div>
            </div>
          </div>

          {/* Working Days */}
          {salon.workingDays && salon.workingDays.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Working Days</h2>
              <div className="flex flex-wrap gap-2">
                {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((day) => {
                  const isOpen = salon.workingDays?.some(
                    (wd) => wd.toUpperCase() === day
                  )
                  return (
                    <span
                      key={day}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                        isOpen
                          ? 'bg-[#006B3F]/10 text-[#006B3F]'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {formatDayName(day)}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* Services Section */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Services</h2>
              <p className="text-sm text-gray-500 mt-1">Select a service to book</p>
            </div>
            
            {services.length === 0 ? (
              <div className="p-8 text-center">
                <Icon name="store" size={48} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No services listed yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="p-4 flex items-start justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{service.name}</h3>
                        {service.promoLabel && (
                          <span className="px-2 py-0.5 bg-[#FCD116]/20 text-[#CE1126] text-xs font-bold rounded-full">
                            {service.promoLabel}
                          </span>
                        )}
                      </div>
                      {service.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{service.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Icon name="schedule" size={16} />
                          {formatDuration(service.duration)}
                        </span>
                        {service.category && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            {service.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      {service.discountPrice && parseFloat(service.discountPrice) > 0 ? (
                        <div>
                          <p className="text-sm text-gray-400 line-through">{formatPrice(service.price)}</p>
                          <p className="font-bold text-[#006B3F]">{formatPrice(service.discountPrice)}</p>
                        </div>
                      ) : (
                        <p className="font-bold text-[#006B3F]">{formatPrice(service.price)}</p>
                      )}
                      <button
                        onClick={() => handleBookService(service.id)}
                        className="mt-2 px-3 py-1.5 bg-[#CE1126] text-white text-sm font-medium rounded-lg hover:bg-[#CE1126]/90 transition-colors"
                      >
                        Book
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reviews Section */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Reviews</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {salon.reviewCount || 0} customer reviews
                </p>
              </div>
              {salon.rating > 0 && (
                <div className="flex items-center gap-1 bg-[#FCD116]/10 px-3 py-1.5 rounded-full">
                  <Icon name="star" size={16} className="text-[#FCD116]" filled />
                  <span className="font-bold text-[#006B3F]">{salon.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
            
            {reviewsLoading ? (
              <div className="p-8 text-center">
                <Icon name="progress_activity" size={32} className="text-[#006B3F] animate-spin mx-auto" />
              </div>
            ) : reviews.length === 0 ? (
              <div className="p-8 text-center">
                <Icon name="star" size={48} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No reviews yet</p>
                <p className="text-sm text-gray-400 mt-1">Be the first to review this salon!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {reviews.map((review) => (
                  <div key={review.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-[#006B3F]/10 flex items-center justify-center flex-shrink-0">
                          {review.customer.avatar ? (
                            <img
                              src={review.customer.avatar}
                              alt={`${review.customer.firstName} ${review.customer.lastName}`}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-bold text-[#006B3F]">
                              {review.customer.firstName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">
                            {review.customer.firstName} {review.customer.lastName}
                          </p>
                          {review.customer.city && (
                            <p className="text-xs text-gray-500">{review.customer.city}, Ghana</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-[#FCD116]/10 px-2 py-1 rounded-full">
                        <Icon name="star" size={12} className="text-[#FCD116]" filled />
                        <span className="text-sm font-bold text-[#006B3F]">{review.rating}</span>
                      </div>
                    </div>
                    
                    {review.comment && (
                      <p className="text-gray-600 text-sm mt-2">{review.comment}</p>
                    )}
                    
                    {(review.service || review.worker) && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                        <Icon name="store" size={12} />
                        <span>
                          {review.service?.name || 'Service'}
                          {review.worker && ` with ${review.worker.fullName}`}
                        </span>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(review.createdAt).toLocaleDateString('en-GH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Sticky Book Now Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 safe-area-bottom z-40">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={handleBookNow}
            className="w-full py-3.5 bg-[#CE1126] text-white font-bold text-lg rounded-xl hover:bg-[#CE1126]/90 transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <Icon name="calendar_today" size={20} />
            Book Now
          </button>
          <p className="text-center text-xs text-gray-500 mt-2">
            You'll be redirected to our booking platform
          </p>
        </div>
      </div>
    </div>
  )
}
