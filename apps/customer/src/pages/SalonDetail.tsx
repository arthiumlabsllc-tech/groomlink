import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Star,
  Clock,
  Calendar,
  User,
  DollarSign,
  Loader2,
  AlertCircle,
  Store,
  Check,
  Wifi,
  Car,
  Wind,
  Footprints,
  Heart,
  Users,
  X,
  LogOut,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import apiClient, { queueApi, QueueStatus, MyQueuePosition, Service } from '../lib/api'

// Types
interface ServiceLocal {
  id: string
  name: string
  description: string | null
  category: string
  duration: number
  price: string
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

interface Review {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  customer: {
    firstName: string
    lastName: string
    avatar: string | null
  }
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

const getSalonCoverImage = (salon: Salon): string => {
  // Prefer cover image if available
  if (salon.coverImage) {
    return salon.coverImage
  }
  // Fall back to first gallery image
  if (salon.images && salon.images.length > 0) {
    return salon.images[0]
  }
  // Fall back to logo
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

  const handleBack = () => {
    navigate('/explore')
  }

  const handleBookNow = () => {
    navigate(`/salon/${id}/book`)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-ghana-green animate-spin mb-4" />
        <p className="text-gray-600">Loading salon details...</p>
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
          <ArrowLeft className="w-5 h-5" />
          Back to Explore
        </button>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
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
  const reviews = salon.reviews || []

  return (
    <div className="max-w-4xl mx-auto pb-8">
      {/* Back Button */}
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 px-4 sm:px-0"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Explore
      </button>

      {/* Hero Image */}
      <div className="relative h-64 sm:h-80 w-full overflow-hidden rounded-xl mb-6">
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
          <span className="inline-block px-3 py-1 bg-ghana-gold text-ghana-green text-sm font-medium rounded-full mb-2">
            {formatCategoryLabel(salon.type)}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold">{salon.businessName || 'Unnamed Salon'}</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-0 space-y-6">
        {/* Rating & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Star className="w-5 h-5 text-ghana-gold fill-current" />
              <span className="text-lg font-semibold">{salon.rating?.toFixed(1) || '0.0'}</span>
              <span className="text-gray-500">({salon.reviewCount || 0} reviews)</span>
            </div>
            <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
              <Heart className="w-6 h-6" />
            </button>
          </div>
          <button
            onClick={handleBookNow}
            className="px-6 py-3 bg-ghana-green text-white font-medium rounded-lg hover:bg-ghana-green/90 transition-colors flex items-center gap-2"
          >
            <Calendar className="w-5 h-5" />
            Book Now
          </button>
        </div>

        {/* Description */}
        {salon.description && (
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">About</h2>
            <p className="text-gray-600 leading-relaxed">{salon.description}</p>
          </div>
        )}

        {/* Contact & Location Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="space-y-3">
              {salon.phoneNumber && (
                <a
                  href={`tel:${salon.phoneNumber}`}
                  className="flex items-center gap-3 text-gray-600 hover:text-ghana-green transition-colors"
                >
                  <Phone className="w-5 h-5 text-ghana-green" />
                  <span>{salon.phoneNumber}</span>
                </a>
              )}
              {salon.email && (
                <a
                  href={`mailto:${salon.email}`}
                  className="flex items-center gap-3 text-gray-600 hover:text-ghana-green transition-colors"
                >
                  <Mail className="w-5 h-5 text-ghana-green" />
                  <span>{salon.email}</span>
                </a>
              )}
              <div className="flex items-start gap-3 text-gray-600">
                <MapPin className="w-5 h-5 text-ghana-green flex-shrink-0 mt-0.5" />
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

          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Operating Hours</h2>
            <div className="space-y-3">
              {(salon.openingTime || salon.closingTime) && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Clock className="w-5 h-5 text-ghana-green" />
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
                        className={`px-2 py-1 text-xs font-medium rounded ${
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
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Amenities</h2>
          <div className="flex flex-wrap gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${salon.hasWifi ? 'bg-ghana-green/10 text-ghana-green' : 'bg-gray-100 text-gray-400'}`}>
              <Wifi className="w-4 h-4" />
              <span className="text-sm font-medium">WiFi</span>
              {salon.hasWifi && <Check className="w-4 h-4" />}
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${salon.hasParking ? 'bg-ghana-green/10 text-ghana-green' : 'bg-gray-100 text-gray-400'}`}>
              <Car className="w-4 h-4" />
              <span className="text-sm font-medium">Parking</span>
              {salon.hasParking && <Check className="w-4 h-4" />}
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${salon.hasAC ? 'bg-ghana-green/10 text-ghana-green' : 'bg-gray-100 text-gray-400'}`}>
              <Wind className="w-4 h-4" />
              <span className="text-sm font-medium">Air Conditioning</span>
              {salon.hasAC && <Check className="w-4 h-4" />}
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${salon.acceptsWalkIns ? 'bg-ghana-green/10 text-ghana-green' : 'bg-gray-100 text-gray-400'}`}>
              <Footprints className="w-4 h-4" />
              <span className="text-sm font-medium">Walk-ins Welcome</span>
              {salon.acceptsWalkIns && <Check className="w-4 h-4" />}
            </div>
          </div>
        </div>

        {/* Gallery Section */}
        {salon.images && salon.images.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Gallery</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {salon.images.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group">
                  <img
                    src={img}
                    alt={`${salon.businessName} - ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
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
          <div className="bg-white rounded-xl border border-gray-100 p-6">
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
                <Loader2 className="w-8 h-8 text-ghana-green animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Queue Status */}
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-ghana-green/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-ghana-green" />
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
                      <Clock className="w-6 h-6 text-ghana-green" />
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
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <LogOut className="w-4 h-4" />
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
                    <Users className="w-5 h-5" />
                    Join Walk-in Queue
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Join Queue Modal */}
        {showJoinModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Join Walk-in Queue</h3>
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
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
                      <Loader2 className="w-4 h-4 animate-spin" />
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
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab('services')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'services'
                  ? 'text-ghana-green border-b-2 border-ghana-green'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Services ({services.length})
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'staff'
                  ? 'text-ghana-green border-b-2 border-ghana-green'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Staff ({workers.length})
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'reviews'
                  ? 'text-ghana-green border-b-2 border-ghana-green'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Reviews ({reviews.length})
            </button>
          </div>

          <div className="p-6">
            {/* Services Tab */}
            {activeTab === 'services' && (
              <div>
                {services.length === 0 ? (
                  <div className="text-center py-8">
                    <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No services listed yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {services.map((service) => (
                      <div
                        key={service.id}
                        className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{service.name}</h3>
                          {service.description && (
                            <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatDuration(service.duration)}
                            </span>
                            {service.category && (
                              <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">
                                {service.category}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-ghana-green">{formatPrice(service.price)}</p>
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
                    <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No staff members listed yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {workers.map((worker) => (
                      <div
                        key={worker.id}
                        className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="w-12 h-12 rounded-full bg-ghana-green/10 flex items-center justify-center flex-shrink-0">
                          {worker.avatar ? (
                            <img
                              src={worker.avatar}
                              alt={worker.fullName}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-6 h-6 text-ghana-green" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">{worker.fullName}</h3>
                          {worker.bio && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{worker.bio}</p>
                          )}
                          {worker.specialties && worker.specialties.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {worker.specialties.slice(0, 3).map((specialty, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-ghana-gold/20 text-ghana-green text-xs rounded"
                                >
                                  {specialty}
                                </span>
                              ))}
                              {worker.specialties.length > 3 && (
                                <span className="text-xs text-gray-400">
                                  +{worker.specialties.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-1 mt-2">
                            <Star className="w-4 h-4 text-ghana-gold fill-current" />
                            <span className="text-sm font-medium">{worker.rating?.toFixed(1) || '0.0'}</span>
                            <span className="text-sm text-gray-500">({worker.reviewCount || 0})</span>
                          </div>
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
                {reviews.length === 0 ? (
                  <div className="text-center py-8">
                    <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No reviews yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-ghana-green/10 flex items-center justify-center">
                              {review.customer.avatar ? (
                                <img
                                  src={review.customer.avatar}
                                  alt={`${review.customer.firstName} ${review.customer.lastName}`}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <User className="w-5 h-5 text-ghana-green" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {review.customer.firstName} {review.customer.lastName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(review.createdAt).toLocaleDateString('en-GH', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-ghana-gold fill-current" />
                            <span className="font-medium">{review.rating}</span>
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-gray-600 mt-2">{review.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
