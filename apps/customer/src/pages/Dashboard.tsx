import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Icon from '../components/Icon'
import apiClient, { salonApi } from '../lib/api'
import { bookingApi } from '../lib/api'
import { useAuthStore } from '../store/auth'
import SalonCard from '../components/SalonCard'
import LiveBookingCounter from '../components/LiveBookingCounter'
import CityDiscovery from '../components/CityDiscovery'
import { useGeolocation } from '../hooks/useGeolocation'

// Types
interface Salon {
  id: string
  businessName: string
  type: string
  rating: number
  reviewCount: number
  city: string
  logo: string | null
  images: string[]
  isSponsored?: boolean
  providerCategory?: string
  priceFrom?: number
  nextAvailable?: string
  distance?: number
}

interface SalonsResponse {
  success: boolean
  data: Salon[]
  meta?: {
    total: number
  }
}

// Categories data- distinct soft pastel backgrounds with Material Symbols
const CATEGORIES = [
  { name: 'Haircut', icon: 'content_cut', bg: 'bg-blue-50', iconColor: 'text-blue-500', ring: 'ring-blue-100' },
  { name: 'Beard Trim', icon: 'auto_fix_high', bg: 'bg-amber-50', iconColor: 'text-amber-500', ring: 'ring-amber-100' },
  { name: 'Pedicure', icon: 'footprint', bg: 'bg-pink-50', iconColor: 'text-pink-500', ring: 'ring-pink-100' },
  { name: 'Braiding', icon: 'brush', bg: 'bg-purple-50', iconColor: 'text-purple-500', ring: 'ring-purple-100' },
  { name: 'Dreadlocks', icon: 'favorite', bg: 'bg-emerald-50', iconColor: 'text-emerald-500', ring: 'ring-emerald-100' },
  { name: 'Makeup', icon: 'face_retouching_natural', bg: 'bg-rose-50', iconColor: 'text-rose-500', ring: 'ring-rose-100' },
  { name: 'Massage', icon: 'spa', bg: 'bg-teal-50', iconColor: 'text-teal-500', ring: 'ring-teal-100' },
  { name: 'Nails', icon: 'palette', bg: 'bg-indigo-50', iconColor: 'text-indigo-500', ring: 'ring-indigo-100' },
]

// API functions
async function fetchRecommendedSalons(): Promise<Salon[]> {
  const response = await apiClient.get<SalonsResponse>('/salons/recommended')
  return response.data.data || []
}

async function fetchPopularSalons(): Promise<Salon[]> {
  const response = await apiClient.get<SalonsResponse>('/salons?limit=10&status=APPROVED&sort=rating')
  return response.data.data || []
}

async function fetchNewSalons(): Promise<Salon[]> {
  const response = await apiClient.get<SalonsResponse>('/discover/new-salons')
  return response.data.data || []
}

// Time-of-day greeting helper
function getGreeting(): { text: string; emoji: string } {
  const hour = new Date().getHours()
  if (hour < 12) return { text: 'Good morning', emoji: '👋' }
  if (hour < 17) return { text: 'Good afternoon', emoji: '👋' }
  return { text: 'Good evening', emoji: '👋' }
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

// ─── Continue Booking Section ───────────────────────────────────────
function ContinueBookingSection() {
  const navigate = useNavigate()
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['dashboard-upcoming-bookings'],
    queryFn: () => bookingApi.getMyBookings(),
    staleTime: 60_000,
  })

  // Find the next upcoming or pending booking
  const upcoming = bookings?.find(
    (b) => b.status === 'CONFIRMED' || b.status === 'PENDING' || b.status === 'IN_PROGRESS'
  )

  if (isLoading) {
    return (
      <div className="skeleton-shimmer h-20 rounded-2xl" />
    )
  }

  if (!upcoming) return null

  const bookingDate = new Date(upcoming.date)
  const dateStr = bookingDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <button
      onClick={() => navigate('/bookings')}
      className="w-full card-v2 p-4 flex items-center gap-4 text-left animate-fade-in-up"
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon name="calendar_clock" size={24} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{upcoming.salon?.businessName}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {dateStr} · {upcoming.startTime}
          {upcoming.service ? ` · ${upcoming.service.name}` : ''}
        </p>
      </div>
      <span className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary text-white shadow-sm">
        Continue
        <Icon name="arrow_forward" size={14} />
      </span>
    </button>
  )
}

// ─── Hero Section Component ────────────────────────────────────────
function HeroSection() {
  const navigate = useNavigate()

  return (
    <div className="relative bg-gradient-to-br from-[#CE1126] via-[#a80e1f] to-[#7a0a17] rounded-2xl p-6 text-white overflow-hidden">
      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '20px 20px',
        }}
      />
      {/* Decorative blobs */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full blur-xl" />

      <div className="relative z-10">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1.5">
          Find Your Perfect Cut
        </h1>
        <p className="text-white/80 text-sm sm:text-base mb-5 leading-relaxed">
          Discover barbershops and salons across Ghana
        </p>

        <button
          onClick={() => navigate('/explore')}
          className="inline-flex items-center gap-2 bg-white text-[#a80e1f] px-5 py-2.5 rounded-xl font-semibold text-sm shadow-elevated hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          <Icon name="location_on" size={18} />
          <span>Set your location</span>
        </button>
      </div>
    </div>
  )
}

// ─── Category Grid Component ───────────────────────────────────────
function CategoryGrid() {
  const navigate = useNavigate()

  const handleCategoryClick = (category: string) => {
    navigate(`/explore?service=${encodeURIComponent(category)}`)
  }

  return (
    <div className="space-y-3">
      <h2 className="text-gradient text-lg font-bold">What's on your radar?</h2>
      <div className="grid grid-cols-4 gap-3">
        {CATEGORIES.map((category) => (
          <button
            key={category.name}
            onClick={() => handleCategoryClick(category.name)}
            className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-gray-100/80 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300 group"
          >
            <div
              className={`w-12 h-12 rounded-2xl ${category.bg} ring-1 ${category.ring} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
            >
              <Icon name={category.icon} size={22} className={category.iconColor} />
            </div>
            <span className="text-[11px] font-medium text-gray-600 text-center leading-tight">
              {category.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Section Header Component ──────────────────────────────────────
function SectionHeader({
  title,
  actionText = 'See all',
  onAction,
}: {
  title: string
  actionText?: string
  onAction?: () => void
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {onAction && (
        <button
          onClick={onAction}
          className="text-sm font-medium text-primary hover:text-primary-dark flex items-center gap-0.5 group"
        >
          {actionText}
          <Icon name="arrow_forward" size={16} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}
    </div>
  )
}

// ─── Horizontal Scroll Container ───────────────────────────────────
// Mobile/tablet: horizontal flex with edge-to-edge scroll.
// Desktop (lg:+): switches to a 4-column responsive grid so the salon
// rails fill the wider viewport instead of remaining a narrow scroll.
// The arbitrary child selectors override the min-w-[260px] / flex-shrink-0
// applied to children (kept for the mobile horizontal-scroll case).
function HorizontalScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 scroll-smooth-x pb-2 -mx-4 px-4 lg:grid lg:grid-cols-3 xl:grid-cols-4 lg:gap-5 lg:mx-0 lg:px-0 lg:overflow-visible [&>*]:lg:min-w-0">
      {children}
    </div>
  )
}

// ─── Loading Skeleton for Salon Cards ──────────────────────────────
function SalonCardSkeleton() {
  return (
    <div className="min-w-[260px] flex-shrink-0 snap-start card-v2 overflow-hidden">
      <div className="h-36 skeleton-shimmer rounded-none" />
      <div className="p-3 space-y-2">
        <div className="h-4 skeleton-shimmer w-3/4" />
        <div className="h-3 skeleton-shimmer w-1/2" />
        <div className="h-3 skeleton-shimmer w-2/3" />
      </div>
    </div>
  )
}

function HorizontalCardSkeleton() {
  return (
    <div className="flex gap-3 card-v2 p-3">
      <div className="w-24 h-24 skeleton-shimmer rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-4 skeleton-shimmer w-3/4" />
        <div className="h-3 skeleton-shimmer w-1/2" />
        <div className="h-3 skeleton-shimmer w-2/3" />
      </div>
    </div>
  )
}

// ─── New Salons Section ────────────────────────────────────────────
function NewSalonsSection() {
  const navigate = useNavigate()
  const { data: salons, isLoading } = useQuery({
    queryKey: ['new-salons'],
    queryFn: fetchNewSalons,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        <SectionHeader title="Discover new salons" onAction={() => navigate('/explore')} />
        <HorizontalScroll>
          {[1, 2, 3].map((i) => (
            <SalonCardSkeleton key={i} />
          ))}
        </HorizontalScroll>
      </div>
    )
  }

  if (!salons || salons.length === 0) return null

  return (
    <div className="space-y-3">
      <SectionHeader title="Discover new salons" onAction={() => navigate('/explore')} />
      <HorizontalScroll>
        {salons.map((salon) => (
          <div key={salon.id} className="min-w-[260px] flex-shrink-0 snap-start card-v2 overflow-hidden img-zoom">
            <SalonCard {...salon} variant="vertical" />
          </div>
        ))}
      </HorizontalScroll>
    </div>
  )
}

// ─── Recommended Salons Section ────────────────────────────────────
function RecommendedSection() {
  const navigate = useNavigate()
  const { data: salons, isLoading } = useQuery({
    queryKey: ['recommended-salons'],
    queryFn: fetchRecommendedSalons,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        <SectionHeader title="Recommended for you" onAction={() => navigate('/explore')} />
        <HorizontalScroll>
          {[1, 2, 3].map((i) => (
            <SalonCardSkeleton key={i} />
          ))}
        </HorizontalScroll>
      </div>
    )
  }

  if (!salons || salons.length === 0) return null

  return (
    <div className="space-y-3">
      <SectionHeader title="Recommended for you" onAction={() => navigate('/explore')} />
      <HorizontalScroll>
        {salons.map((salon) => (
          <div key={salon.id} className="min-w-[260px] flex-shrink-0 snap-start card-v2 overflow-hidden img-zoom">
            <SalonCard {...salon} variant="vertical" />
          </div>
        ))}
      </HorizontalScroll>
    </div>
  )
}

// ─── Nearby Salons Section ─────────────────────────────────────────
function NearbySalonsSection() {
  const navigate = useNavigate()
  const { state, data: geoData, request } = useGeolocation()
  const [homeServiceOnly, setHomeServiceOnly] = useState(false)

  const { data: salons, isLoading } = useQuery({
    queryKey: ['nearby-salons', geoData?.latitude, geoData?.longitude, homeServiceOnly],
    queryFn: async () => {
      if (!geoData) return []
      const res = await salonApi.getNearbySalons(geoData.latitude, geoData.longitude, 10, 1, 12)
      const list = res.data || []
      // Compute priceFrom from services if available
      return list.map((s: any) => ({
        id: s.id,
        businessName: s.businessName,
        type: s.type,
        rating: s.rating,
        reviewCount: s.reviewCount,
        city: s.city,
        logo: s.logo,
        images: s.images || [],
        isSponsored: s.isSponsored,
        providerCategory: s.providerCategory,
        distance: s.distance,
        priceFrom: s.services?.length
          ? Math.min(...s.services.map((svc: any) => Number(svc.price)).filter(Boolean))
          : undefined,
      })) as Salon[]
    },
    enabled: state === 'granted' && geoData != null,
    staleTime: 5 * 60 * 1000,
  })

  const filteredSalons = useMemo(() => {
    if (!salons) return []
    if (!homeServiceOnly) return salons
    return salons.filter((s) => s.providerCategory === 'FREELANCER')
  }, [salons, homeServiceOnly])

  // Location prompt state
  if (state === 'idle') {
    return (
      <div className="space-y-3">
        <SectionHeader title="Salons near you" />
        <div className="bg-gradient-to-br from-green-50 to-red-50 border border-green-200 rounded-2xl p-5 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Icon name="location_on" size={28} className="text-green-600" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">Find Salons Near You</h3>
          <p className="text-sm text-gray-500 mb-4">
            Allow location access to discover salons and home service professionals around you.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <button
              onClick={request}
              className="inline-flex items-center gap-2 bg-green-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-green-700 transition-colors shadow-sm"
            >
              <Icon name="my_location" size={18} />
              Use My Location
            </button>
            <button
              onClick={() => navigate('/explore')}
              className="inline-flex items-center gap-2 text-green-700 font-medium px-5 py-2.5 rounded-xl hover:bg-green-50 transition-colors"
            >
              Browse All Salons
              <Icon name="arrow_forward" size={16} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Requesting state
  if (state === 'requesting') {
    return (
      <div className="space-y-3">
        <SectionHeader title="Salons near you" />
        <div className="flex flex-col items-center justify-center py-10">
          <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-3" />
          <p className="text-sm text-gray-500">Getting your location...</p>
        </div>
      </div>
    )
  }

  // Denied / error / unsupported- fall back to popular
  if (state === 'denied' || state === 'error' || state === 'unsupported') {
    return <PopularNearYouSection />
  }

  // Loading nearby salons
  if (isLoading) {
    return (
      <div className="space-y-3">
        <SectionHeader title="Salons near you" onAction={() => navigate('/explore')} />
        <HorizontalScroll>
          {[1, 2, 3].map((i) => (
            <SalonCardSkeleton key={i} />
          ))}
        </HorizontalScroll>
      </div>
    )
  }

  // Empty state
  if (!filteredSalons || filteredSalons.length === 0) {
    return (
      <div className="space-y-3">
        <SectionHeader title="Salons near you" />
        <div className="text-center py-8 bg-white rounded-2xl border border-gray-100">
          <Icon name="location_off" size={40} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            {homeServiceOnly
              ? 'No home service professionals found nearby.'
              : 'No salons found nearby.'}
          </p>
          <button
            onClick={() => navigate('/explore')}
            className="mt-3 text-sm font-medium text-green-600 hover:underline"
          >
            Explore all salons
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Salons near you</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHomeServiceOnly(false)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              !homeServiceOnly
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setHomeServiceOnly(true)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors inline-flex items-center gap-1 ${
              homeServiceOnly
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Icon name="home" size={12} />
            Home Service
          </button>
        </div>
      </div>
      <HorizontalScroll>
        {filteredSalons.map((salon) => (
          <div key={salon.id} className="min-w-[260px] flex-shrink-0 snap-start card-v2 overflow-hidden img-zoom">
            <SalonCard {...salon} variant="vertical" />
          </div>
        ))}
      </HorizontalScroll>
    </div>
  )
}

// ─── Popular Near You Section ──────────────────────────────────────
function PopularNearYouSection() {
  const navigate = useNavigate()
  const { data: salons, isLoading } = useQuery({
    queryKey: ['popular-salons'],
    queryFn: fetchPopularSalons,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        <SectionHeader title="Popular near you" onAction={() => navigate('/explore')} />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <HorizontalCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (!salons || salons.length === 0) return null

  return (
    <div className="space-y-3">
      <SectionHeader title="Popular near you" onAction={() => navigate('/explore')} />
      <div className="space-y-3">
        {salons.slice(0, 5).map((salon) => (
          <SalonCard key={salon.id} {...salon} variant="horizontal" />
        ))}
      </div>
    </div>
  )
}

// ─── Search Bar Component ──────────────────────────────────────────
function SearchBar() {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate('/explore')}
      className="flex items-center gap-3 bg-white rounded-2xl px-5 py-3.5 shadow-card hover:shadow-card-hover cursor-pointer transition-all duration-300 group"
    >
      <Icon name="search" size={20} className="text-gray-400 group-hover:text-primary group-hover:scale-110 transition-all duration-300" />
      <span className="text-gray-400 text-sm">Search salons, services...</span>
    </div>
  )
}

// ─── Main Dashboard Component ──────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuthStore()
  const firstName = user?.firstName
  const { text: greetingText, emoji: greetingEmoji } = getGreeting()

  // Fade-in on scroll via IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add('visible')
      }),
      { threshold: 0.1 }
    )
    document.querySelectorAll('.fade-section').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="space-y-6 pb-4 animate-fade-in">
      {/* Personalized Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {firstName ? `${greetingText}, ${firstName} ${greetingEmoji}` : `Welcome! ${greetingEmoji}`}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{formatDate()}</p>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shadow-card">
          <Icon name="content_cut" size={22} className="text-primary" />
        </div>
      </div>

      {/* Search Bar */}
      <SearchBar />

      {/* Continue Booking (if any) */}
      <ContinueBookingSection />

      {/* Hero Section */}
      <div className="fade-section">
        <HeroSection />
      </div>

      {/* Nearby Salons */}
      <div className="fade-section">
        <NearbySalonsSection />
      </div>

      {/* City Discovery Chips */}
      <div className="fade-section">
        <CityDiscovery variant="accordion" />
      </div>

      {/* Category Grid */}
      <div className="fade-section">
        <CategoryGrid />
      </div>

      {/* Live Booking Counter */}
      <div className="fade-section">
        <LiveBookingCounter />
      </div>

      {/* Recommended Salons */}
      <div className="fade-section">
        <RecommendedSection />
      </div>

      {/* Popular Near You */}
      <div className="fade-section">
        <PopularNearYouSection />
      </div>

      {/* New Salons Discovery */}
      <div className="fade-section">
        <NewSalonsSection />
      </div>
    </div>
  )
}
