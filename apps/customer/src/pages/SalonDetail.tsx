import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import apiClient, { queueApi, QueueStatus, MyQueuePosition, favoritesApi, salonApi, Review, waitlistApi, WaitlistEntry } from '../lib/api'

// Types
interface ServiceLocal {
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

interface Worker {
  id: string
  fullName: string
  phoneNumber: string | null
  email: string | null
  bio: string | null
  specialties: string[]
  rating: number
  reviewCount: number
  isActive: boolean
  avatar: string | null
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
  services?: ServiceLocal[]
  workers?: Worker[]
  reviews?: Review[]
  ownerId: string
  createdAt: string
  updatedAt: string
}

interface ApiResponse {
  success: boolean
  data: Salon
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

// Default GroomLink assets
const DEFAULT_LOGO_ICON = 'https://groomlinkgh.com/api/uploads/assets/logo-icon.png'
const DEFAULT_LOGO_WHITE = 'https://groomlinkgh.com/api/uploads/assets/email-logo.png'

const getSalonCoverImage = (salon: Salon): string | null => {
  // Prefer cover image if available
  if (salon.coverImage) {
    return salon.coverImage
  }
  // Fall back to first gallery image
  if (salon.images && salon.images.length > 0) {
    return salon.images[0]
  }
  // Return null to trigger the branded fallback UI
  return null
}

const getSalonLogo = (salon: Salon): string => {
  // Use salon logo if available
  if (salon.logo) {
    return salon.logo
  }
  // Default to GL logo icon
  return DEFAULT_LOGO_ICON
}

const formatPrice = (price: string): string => {
  const numPrice = parseFloat(price)
  if (isNaN(numPrice)) return price
  return `GH₵${numPrice.toFixed(2)}`
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
  const [activeTab, setActiveTab] = useState<'services' | 'staff' | 'reviews'>('services')

  // Queue state
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null)
  const [myPosition, setMyPosition] = useState<MyQueuePosition | null>(null)
  const [queueLoading, setQueueLoading] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [selectedServiceId, setSelectedServiceId] = useState<string>('')
  const [queueNotes, setQueueNotes] = useState('')
  const [joiningQueue, setJoiningQueue] = useState(false)
  const [leavingQueue, setLeavingQueue] = useState(false)

  // Favorite state
  const [isFavorited, setIsFavorited] = useState(false)
  const [favoriteId, setFavoriteId] = useState<string | null>(null)
  const [favoriteLoading, setFavoriteLoading] = useState(false)

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsTotal, setReviewsTotal] = useState(0)
  const [reviewsLoading, setReviewsLoading] = useState(false)

  // Waitlist state
  const [, setMyWaitlistEntries] = useState<WaitlistEntry[]>([])
  const [, setWaitlistLoading] = useState(false)

  // Sticky book button visibility
  const [showStickyBook, setShowStickyBook] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const heroBottom = heroRef.current.getBoundingClientRect().bottom
        setShowStickyBook(heroBottom < 0)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
        const response = await apiClient.get<ApiResponse>(`/salons/${id}`)
        if (response.data.success) {
          setSalon(response.data.data)
        } else {
          setError('Failed to load salon details')
        }
      } catch (err) {
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosError = err as { response?: { status?: number; data?: { error?: { message?: string } } } }
          if (axiosError.response?.status === 404) {
            setError('Salon not found')
          } else {
            setError(axiosError.response?.data?.error?.message || 'Failed to load salon details')
          }
        } else {
          setError(err instanceof Error ? err.message : 'An error occurred')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchSalon()
  }, [id])

  // Fetch queue status and my position
  useEffect(() => {
    if (!id) return

    const fetchQueueData = async () => {
      setQueueLoading(true)
      try {
        const [status, position] = await Promise.all([
          queueApi.getSalonQueue(id),
          queueApi.getMyPosition(id).catch(() => null)
        ])
        setQueueStatus(status)
        setMyPosition(position)
      } catch (err) {
        console.error('Failed to fetch queue data:', err)
      } finally {
        setQueueLoading(false)
      }
    }

    fetchQueueData()

    // Poll every 30 seconds
    const interval = setInterval(fetchQueueData, 30000)
    return () => clearInterval(interval)
  }, [id])

  // Check favorite status, fetch reviews and waitlist on load
  useEffect(() => {
    if (!id) return

    const checkFavoriteAndFetchReviews = async () => {
      // Check favorite status
      try {
        const result = await favoritesApi.checkIsFavorite(id)
        setIsFavorited(result.isFavorited)
        setFavoriteId(result.favoriteId || null)
      } catch (err) {
        // User might not be logged in, ignore error
        console.log('Could not check favorite status')
      }

      // Fetch reviews
      setReviewsLoading(true)
      try {
        const response = await salonApi.getSalonReviews(id)
        setReviews(response?.reviews || [])
        setReviewsTotal(response?.total || 0)
      } catch (err) {
        console.error('Failed to fetch reviews:', err)
        setReviews([])
        setReviewsTotal(0)
      } finally {
        setReviewsLoading(false)
      }

      // Fetch my waitlist entries for this salon
      setWaitlistLoading(true)
      try {
        const entries = await waitlistApi.getMyWaitlist()
        // Filter entries for current salon
        const salonEntries = entries.filter(entry => entry.salonId === id)
        setMyWaitlistEntries(salonEntries)
      } catch (err) {
        // User might not be logged in, ignore error
        console.log('Could not fetch waitlist entries')
        setMyWaitlistEntries([])
      } finally {
        setWaitlistLoading(false)
      }
    }

    checkFavoriteAndFetchReviews()
  }, [id])

  const toggleFavorite = async () => {
    if (!id || favoriteLoading) return

    setFavoriteLoading(true)
    try {
      if (isFavorited && favoriteId) {
        // Remove from favorites
        await favoritesApi.removeFavorite(favoriteId)
        setIsFavorited(false)
        setFavoriteId(null)
      } else {
        // Add to favorites
        const favorite = await favoritesApi.addFavorite(id)
        setIsFavorited(true)
        setFavoriteId(favorite.id)
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        alert('Please log in to save favorites')
      } else {
        alert('Failed to update favorite. Please try again.')
      }
    } finally {
      setFavoriteLoading(false)
    }
  }

  const handleJoinQueue = async () => {
    if (!id) return
    setJoiningQueue(true)
    try {
      await queueApi.joinQueue({
        salonId: id,
        serviceId: selectedServiceId || undefined,
        notes: queueNotes || undefined
      })
      // Refresh queue data
      const [status, position] = await Promise.all([
        queueApi.getSalonQueue(id),
        queueApi.getMyPosition(id)
      ])
      setQueueStatus(status)
      setMyPosition(position)
      setShowJoinModal(false)
      setSelectedServiceId('')
      setQueueNotes('')
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to join queue')
    } finally {
      setJoiningQueue(false)
    }
  }

  const handleLeaveQueue = async () => {
    if (!myPosition?.queueId) return
    setLeavingQueue(true)
    try {
      await queueApi.leaveQueue(myPosition.queueId)
      setMyPosition(null)
      // Refresh queue status
      if (id) {
        const status = await queueApi.getSalonQueue(id)
        setQueueStatus(status)
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to leave queue')
    } finally {
      setLeavingQueue(false)
    }
  }

  // Waitlist handlers are reserved for future UI
  // Re-implement when waitlist UI is added
  /*
  const handleJoinWaitlist = async (date: string, timeSlot: string, staffId?: string) => {
    if (!id) return
    try {
      const entry = await waitlistApi.joinWaitlist({
        salonId: id,
        staffId,
        date,
        timeSlot
      })
      setMyWaitlistEntries(prev => [...prev, entry])
    } catch (err: any) {
      if (err.response?.status === 401) {
        alert('Please log in to join the waitlist')
      } else {
        alert(err.response?.data?.error?.message || 'Failed to join waitlist')
      }
    }
  }

  const handleLeaveWaitlist = async (waitlistId: string) => {
    try {
      await waitlistApi.leaveWaitlist(waitlistId)
      setMyWaitlistEntries(prev => prev.filter(entry => entry.id !== waitlistId))
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to leave waitlist')
    }
  }

  const isOnWaitlist = (date: string, timeSlot: string, staffId?: string): WaitlistEntry | undefined => {
    return myWaitlistEntries.find(entry =>
      entry.date === date &&
      entry.timeSlot === timeSlot &&
      (staffId ? entry.staffId === staffId : !entry.staffId)
    )
  }
  */

  const handleBack = () => {
    navigate('/explore')
  }

  const handleBookNow = () => {
    navigate(`/salon/${id}/book`)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
        <div className="skeleton-shimmer h-64 md:h-80 w-full rounded-2xl" />
        <div className="skeleton-shimmer h-12 w-3/4 rounded-xl" />
        <div className="skeleton-shimmer h-8 w-1/2 rounded-lg" />
        <div className="skeleton-shimmer h-24 w-full rounded-xl" />
        <div className="skeleton-shimmer h-48 w-full rounded-xl" />
        <div className="flex gap-4">
          <div className="skeleton-shimmer h-32 flex-1 rounded-xl" />
          <div className="skeleton-shimmer h-32 flex-1 rounded-xl" />
        </div>
      </div>
    )
  }

  if (error || !salon) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <Icon name="arrow_back" size={20} />
          Back to Explore
        </button>
        <div className="flex flex-col items-center justify-center py-16 text-center">
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
              className="px-6 py-2 bg-ghana-green text-white rounded-lg hover:bg-ghana-green/90 transition-colors"
            >
              Back to Explore
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
    )
  }

  const services = salon.services || []
  const workers = salon.workers || []
  // reviews are now fetched separately and stored in state

  // Compute open/closed status
  const isOpenNow = (() => {
    const now = new Date()
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
    const today = dayNames[now.getDay()]
    if (!salon.workingDays?.some(d => d.toUpperCase() === today)) return false
    if (!salon.openingTime || !salon.closingTime) return true
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    const [oh, om] = salon.openingTime.split(':').map(Number)
    const [ch, cm] = salon.closingTime.split(':').map(Number)
    return nowMinutes >= oh * 60 + om && nowMinutes <= ch * 60 + cm
  })()

  return (
    <div className="max-w-4xl mx-auto pb-24 md:pb-8">
      {/* Back Button */}
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 px-4 sm:px-0"
      >
        <Icon name="arrow_back" size={20} />
        Back to Explore
      </button>

      {/* Hero Image with Parallax */}
      <div ref={heroRef} className="relative h-64 md:h-80 w-full overflow-hidden rounded-2xl animate-fade-in">
        {getSalonCoverImage(salon) ? (
          <>
            <div
              className="absolute inset-0 bg-fixed bg-cover bg-center scale-110"
              style={{ backgroundImage: `url(${getSalonCoverImage(salon)})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          </>
        ) : (
          <>
            {/* Branded fallback: green gradient with white logo */}
            <div 
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #006B3F, #004D2C)' }}
            >
              <img 
                src={DEFAULT_LOGO_WHITE} 
                alt="GroomLink" 
                className="w-32 h-32 md:w-40 md:h-40 object-contain opacity-90"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </>
        )}
        {/* Salon Name Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white">
          <span className="inline-block px-3 py-1 bg-ghana-gold text-ghana-green text-xs font-semibold rounded-full mb-2">
            {formatCategoryLabel(salon.type)}
          </span>
          <h1 className="text-2xl md:text-3xl font-bold mb-1.5">{salon.businessName || 'Unnamed Salon'}</h1>
          <div className="flex items-center gap-4 text-sm text-white/90">
            <span className="flex items-center gap-1">
              <Icon name="star" size={16} filled className="text-ghana-gold" />
              {salon.rating?.toFixed(1) || '0.0'} ({salon.reviewCount || 0} reviews)
            </span>
            <span className="flex items-center gap-1">
              <Icon name="location_on" size={14} />
              {salon.city || salon.address}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Info Bar */}
      <div className="sticky top-0 z-30 glass shadow-card -mt-5 mx-4 sm:mx-6 rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-5 text-sm">
          <span className="flex items-center gap-1.5">
            <Icon name="star" size={16} filled className="text-ghana-gold" />
            <span className="font-semibold">{salon.rating?.toFixed(1) || '0.0'}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isOpenNow ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className={isOpenNow ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>{isOpenNow ? 'Open' : 'Closed'}</span>
          </span>
          <span className="hidden sm:flex items-center gap-1.5 text-gray-500">
            <Icon name="schedule" size={14} />
            {salon.openingTime || '--:--'} - {salon.closingTime || '--:--'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleFavorite}
            disabled={favoriteLoading}
            className={`p-2 rounded-full transition-colors ${
              isFavorited
                ? 'text-red-500 hover:bg-red-50'
                : 'text-gray-400 hover:text-red-500 hover:bg-gray-50'
            }`}
          >
            <Icon name="favorite" size={22} filled={isFavorited} className={isFavorited ? 'text-red-500' : ''} />
          </button>
          <button
            onClick={handleBookNow}
            className="px-5 py-2 bg-[#CE1126] text-white font-medium rounded-xl hover:bg-[#CE1126]/90 transition-colors flex items-center gap-2 shadow-card"
          >
            <Icon name="calendar_today" size={18} />
            Book Now
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-0 space-y-6 animate-fade-in-up">
        {/* 24/7 Booking Banner */}
        <div className="bg-ghana-gold/10 border border-ghana-gold/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-ghana-gold/20 flex items-center justify-center flex-shrink-0">
            <Icon name="schedule" size={20} className="text-ghana-green" />
          </div>
          <div>
            <p className="text-sm font-medium text-ghana-green">Book anytime, 24/7 — even when salons are closed</p>
            <p className="text-xs text-gray-600">Your appointment will be confirmed when the salon opens</p>
          </div>
        </div>

        {/* Description */}
        {salon.description && (
          <div className="card-v2 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">About</h2>
            <p className="text-gray-600 leading-relaxed">{salon.description}</p>
          </div>
        )}

        {/* Contact & Location Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card-v2 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="space-y-3">
              {salon.phoneNumber && (
                <a
                  href={`tel:${salon.phoneNumber}`}
                  className="flex items-center gap-3 text-gray-600 hover:text-ghana-green transition-colors"
                >
                  <Icon name="call" size={20} className="text-ghana-green" />
                  <span>{salon.phoneNumber}</span>
                </a>
              )}
              {salon.email && (
                <a
                  href={`mailto:${salon.email}`}
                  className="flex items-center gap-3 text-gray-600 hover:text-ghana-green transition-colors"
                >
                  <Icon name="mail" size={20} className="text-ghana-green" />
                  <span>{salon.email}</span>
                </a>
              )}
              <div className="flex items-start gap-3 text-gray-600">
                <Icon name="location_on" size={20} className="text-ghana-green flex-shrink-0 mt-0.5" />
                <div>
                  <p>{salon.address || 'Address not available'}</p>
                  {(salon.city || salon.region) && (
                    <p className="text-gray-500">
                      {salon.city}{salon.city && salon.region ? ', ' : ''}{salon.region}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card-v2 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Operating Hours</h2>
            <div className="space-y-3">
              {(salon.openingTime || salon.closingTime) && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Icon name="schedule" size={20} className="text-ghana-green" />
                  <span>
                    {salon.openingTime || '--:--'} - {salon.closingTime || '--:--'}
                  </span>
                </div>
              )}
              {salon.workingDays && salon.workingDays.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((day) => {
                    const isOpen = salon.workingDays?.some(
                      (wd) => wd.toUpperCase() === day
                    )
                    return (
                      <span
                        key={day}
                        className={`px-2 py-1 text-xs font-medium rounded-lg ${
                          isOpen
                            ? 'bg-ghana-green/10 text-ghana-green'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {formatDayName(day)}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Amenities */}
        <div className="card-v2 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Amenities</h2>
          <div className="flex flex-wrap gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${salon.hasWifi ? 'bg-ghana-green/10 text-ghana-green' : 'bg-gray-100 text-gray-400'}`}>
              <Icon name="wifi" size={16} />
              <span className="text-sm font-medium">WiFi</span>
              {salon.hasWifi && <Icon name="check" size={16} />}
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${salon.hasParking ? 'bg-ghana-green/10 text-ghana-green' : 'bg-gray-100 text-gray-400'}`}>
              <Icon name="directions_car" size={16} />
              <span className="text-sm font-medium">Parking</span>
              {salon.hasParking && <Icon name="check" size={16} />}
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${salon.hasAC ? 'bg-ghana-green/10 text-ghana-green' : 'bg-gray-100 text-gray-400'}`}>
              <Icon name="ac_unit" size={16} />
              <span className="text-sm font-medium">Air Conditioning</span>
              {salon.hasAC && <Icon name="check" size={16} />}
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${salon.acceptsWalkIns ? 'bg-ghana-green/10 text-ghana-green' : 'bg-gray-100 text-gray-400'}`}>
              <Icon name="footprint" size={16} />
              <span className="text-sm font-medium">Walk-ins Welcome</span>
              {salon.acceptsWalkIns && <Icon name="check" size={16} />}
            </div>
          </div>
        </div>

        {/* Gallery Section */}
        {salon.images && salon.images.length > 0 && (
          <div className="card-v2 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Gallery</h2>
            <div className="scroll-smooth-x flex gap-3 pb-2">
              {salon.images.map((img, idx) => (
                <div key={idx} className="img-zoom flex-shrink-0 w-48 h-48 rounded-2xl snap-start">
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

        {/* Live Queue Section */}
        {salon.acceptsWalkIns && (
          <div className="card-v2 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Live Queue</h2>
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ghana-green opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-ghana-green"></span>
                </span>
                <span className="text-sm text-gray-500">Live</span>
              </div>
            </div>

            {queueLoading && !queueStatus ? (
              <div className="flex items-center justify-center py-8">
                <Icon name="progress_activity" size={32} className="text-ghana-green animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Queue Status */}
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-ghana-green/10 flex items-center justify-center">
                      <Icon name="group" size={24} className="text-ghana-green" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {queueStatus?.totalWaiting || 0}
                      </p>
                      <p className="text-sm text-gray-500">people waiting</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-ghana-gold/20 flex items-center justify-center">
                      <Icon name="schedule" size={24} className="text-ghana-green" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        ~{queueStatus?.averageWait || 0}
                      </p>
                      <p className="text-sm text-gray-500">min wait</p>
                    </div>
                  </div>
                </div>

                {/* My Position or Join Button */}
                {myPosition ? (
                  <div className="bg-gradient-to-r from-ghana-green/10 to-ghana-gold/10 rounded-xl p-4 border border-ghana-green/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Your Position</p>
                        <p className="text-3xl font-bold text-ghana-green">
                          #{myPosition.position}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Est. wait: ~{myPosition.estimatedWait} minutes
                        </p>
                      </div>
                      <button
                        onClick={handleLeaveQueue}
                        disabled={leavingQueue}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        {leavingQueue ? (
                          <Icon name="progress_activity" size={16} className="animate-spin" />
                        ) : (
                          <Icon name="logout" size={16} />
                        )}
                        Leave Queue
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="w-full py-3 bg-ghana-green text-white font-medium rounded-lg hover:bg-ghana-green/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <Icon name="group" size={20} />
                    Join Walk-in Queue
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Join Queue Modal */}
        {showJoinModal && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Join Walk-in Queue</h3>
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                  <Icon name="close" size={20} />
                </button>
              </div>

              <p className="text-gray-600 mb-4">
                Join the queue and we'll notify you when it's your turn. You can wait nearby!
              </p>

              {/* Service Selection */}
              {salon.services && salon.services.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Service (Optional)
                  </label>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ghana-green focus:border-transparent"
                  >
                    <option value="">Any service</option>
                    {salon.services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} - GH₵{parseFloat(service.price).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={queueNotes}
                  onChange={(e) => setQueueNotes(e.target.value)}
                  placeholder="Any special requests..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ghana-green focus:border-transparent resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleJoinQueue}
                  disabled={joiningQueue}
                  className="flex-1 py-2 bg-ghana-green text-white rounded-lg hover:bg-ghana-green/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {joiningQueue ? (
                    <>
                      <Icon name="progress_activity" size={16} className="animate-spin" />
                      Joining...
                    </>
                  ) : (
                    'Join Queue'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="card-v2 overflow-hidden">
          <div className="flex gap-2 p-2 bg-gray-50/80">
            <button
              onClick={() => setActiveTab('services')}
              className={`tab-pill flex-1 ${activeTab === 'services' ? 'tab-pill-active' : 'tab-pill-inactive'}`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Icon name="content_cut" size={16} />
                Services ({services.length})
              </span>
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`tab-pill flex-1 ${activeTab === 'staff' ? 'tab-pill-active' : 'tab-pill-inactive'}`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Icon name="person" size={16} />
                Staff ({workers.length})
              </span>
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`tab-pill flex-1 ${activeTab === 'reviews' ? 'tab-pill-active' : 'tab-pill-inactive'}`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Icon name="star" size={16} />
                Reviews ({reviews.length})
              </span>
            </button>
          </div>

          <div className="p-6">
            {/* Services Tab */}
            {activeTab === 'services' && (
              <div>
                {services.length === 0 ? (
                  <div className="text-center py-8">
                    <Icon name="store" size={48} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No services listed yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {services.map((service) => (
                      <div
                        key={service.id}
                        className="card-v2 p-4 flex items-start justify-between"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900">{service.name}</h3>
                            {service.promoLabel && (
                              <span className="px-2 py-0.5 bg-ghana-gold/20 text-amber-700 text-xs font-medium rounded-full">
                                {service.promoLabel}
                              </span>
                            )}
                          </div>
                          {service.description && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{service.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Icon name="schedule" size={14} />
                              {formatDuration(service.duration)}
                            </span>
                            {service.category && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-lg text-xs">
                                {service.category}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right pl-4 flex-shrink-0">
                          {service.discountPrice && parseFloat(service.discountPrice) > 0 ? (
                            <div>
                              <p className="text-sm text-gray-400 line-through">{formatPrice(service.price)}</p>
                              <p className="font-bold text-[#CE1126]">{formatPrice(service.discountPrice)}</p>
                            </div>
                          ) : (
                            <p className="font-bold text-[#CE1126]">{formatPrice(service.price)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Staff Tab */}
            {activeTab === 'staff' && (
              <div>
                {workers.length === 0 ? (
                  <div className="text-center py-8">
                    <Icon name="person" size={48} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No staff members listed yet</p>
                  </div>
                ) : (
                  <div className="scroll-smooth-x flex gap-6 pb-2 -mx-2 px-2">
                    {workers.map((worker) => (
                      <div
                        key={worker.id}
                        className="flex-shrink-0 w-36 flex flex-col items-center text-center snap-start"
                      >
                        <div className="w-20 h-20 rounded-full bg-ghana-green/10 flex items-center justify-center mb-3 overflow-hidden">
                          {worker.avatar ? (
                            <img
                              src={worker.avatar}
                              alt={worker.fullName}
                              className="w-20 h-20 rounded-full object-cover"
                            />
                          ) : (
                            <Icon name="person" size={32} className="text-ghana-green" />
                          )}
                        </div>
                        <h3 className="font-medium text-gray-900 text-sm truncate w-full">{worker.fullName}</h3>
                        {worker.specialties && worker.specialties.length > 0 && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate w-full">
                            {worker.specialties.slice(0, 2).join(', ')}
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-1.5">
                          <Icon name="star" size={14} filled className="text-ghana-gold" />
                          <span className="text-xs font-medium">{worker.rating?.toFixed(1) || '0.0'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <div>
                {reviewsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Icon name="progress_activity" size={32} className="text-ghana-green animate-spin" />
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-8">
                    <Icon name="star" size={48} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No reviews yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div
                        key={review.id}
                        className="card-v2 p-5"
                      >
                        {/* Header: Avatar, Name, Rating */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {/* Avatar with first letter */}
                            <div className="w-10 h-10 rounded-full bg-ghana-green/10 flex items-center justify-center flex-shrink-0">
                              {review.customer.avatar ? (
                                <img
                                  src={review.customer.avatar}
                                  alt={`${review.customer.firstName} ${review.customer.lastName}`}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-sm font-semibold text-ghana-green">
                                  {review.customer.firstName.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">
                                {review.customer.firstName} {review.customer.lastName}
                              </p>
                              {/* City badge */}
                              {review.customer.city && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <Icon name="location_on" size={10} className="text-gray-400" />
                                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                    {review.customer.city}, Ghana
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Star rating badge */}
                          <div className="flex items-center gap-1 bg-ghana-gold/10 px-2.5 py-1 rounded-full">
                            <Icon name="star" size={14} filled className="text-ghana-gold" />
                            <span className="font-bold text-sm text-ghana-green">{review.rating}</span>
                          </div>
                        </div>

                        {/* Review text */}
                        {review.comment && (
                          <p className="text-gray-700 text-sm leading-relaxed mb-3">{review.comment}</p>
                        )}

                        {/* Service info */}
                        {(review.service || review.worker) && (
                          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                            <Icon name="store" size={14} className="text-ghana-green" />
                            <span>
                              {review.service?.name || 'Service'}
                              {review.worker && (
                                <span className="text-gray-600"> with <span className="font-medium">{review.worker.fullName}</span></span>
                              )}
                            </span>
                          </div>
                        )}

                        {/* Date */}
                        <p className="text-xs text-gray-400 mt-3">
                          {new Date(review.createdAt).toLocaleDateString('en-GH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    ))}
                    {reviewsTotal > reviews.length && (
                      <p className="text-center text-sm text-gray-500">
                        Showing {reviews.length} of {reviewsTotal} reviews
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Book Button - Mobile */}
      {showStickyBook && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-white via-white to-transparent md:hidden animate-slide-up">
          <button
            onClick={handleBookNow}
            className="w-full py-3.5 bg-[#CE1126] text-white font-semibold rounded-xl shadow-elevated flex items-center justify-center gap-2 hover:bg-[#CE1126]/90 transition-colors"
          >
            <Icon name="calendar_today" size={20} />
            Book Now
          </button>
        </div>
      )}
    </div>
  )
}
