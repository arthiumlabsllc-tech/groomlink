import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from './Icon'
import SearchBox from './SearchBox'
import BottomNav from './BottomNav'
import { HaircutIcon, BarberIcon, NailsIcon, BraidingIcon, MassageIcon, DreadlocksIcon } from './CategoryIcons'

interface Salon {
  id: string
  businessName: string
  coverImage?: string
  logo?: string
  images?: string[]
  rating?: number
  reviewCount?: number
  city?: string
  address?: string
  location?: string
  startingPrice?: number
}

interface Category {
  name: string
  icon: React.ReactNode
  query: string
}

const API_BASE_URL = 'https://groomlinkgh.com/api'

const categories: Category[] = [
  { name: 'Hair', icon: <HaircutIcon className="w-7 h-7" />, query: 'Haircut' },
  { name: 'Barber', icon: <BarberIcon className="w-7 h-7" />, query: 'Beard Trim' },
  { name: 'Nails', icon: <NailsIcon className="w-7 h-7" />, query: 'Nails' },
  { name: 'Braiding', icon: <BraidingIcon className="w-7 h-7" />, query: 'Braiding' },
  { name: 'Massage', icon: <MassageIcon className="w-7 h-7" />, query: 'Massage' },
  { name: 'Dreadlocks', icon: <DreadlocksIcon className="w-7 h-7" />, query: 'Dreadlocks' },
]

function HeroSection() {
  const navigate = useNavigate()

  const handleCategoryClick = (category: string) => {
    navigate(`/explore?category=${encodeURIComponent(category)}`)
  }

  return (
    <div className="bg-gradient-to-b from-[#1a0a0b] via-[#2d1215] to-[#1a1a1a] pt-8 pb-6 px-4">
      {/* Logo */}
      <div className="flex justify-center mb-6">
        <img 
          src="/logo-full-white.png" 
          alt="GroomLink" 
          className="h-10 w-auto"
        />
      </div>

      {/* Tagline */}
      <p className="text-white/90 text-center text-base mb-6 px-4">
        Discover and book beauty & grooming professionals near you
      </p>

      {/* Search Bar */}
      <SearchBox variant="mobile" className="mb-6" />

      {/* Category Circles */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
        {categories.map((category, index) => {
          const ghanaColors = [
            'bg-[#CE1126]/15 border border-[#CE1126]/30 text-[#FCD116]',
            'bg-[#FCD116]/15 border border-[#FCD116]/30 text-[#FCD116]',
            'bg-[#006B3F]/15 border border-[#006B3F]/30 text-[#FCD116]',
          ]
          const circleColor = ghanaColors[index % ghanaColors.length]
          return (
            <button
              key={category.name}
              onClick={() => handleCategoryClick(category.query)}
              className="flex flex-col items-center gap-2 min-w-[72px] flex-shrink-0"
            >
              <div className={`w-[72px] h-[72px] rounded-full flex items-center justify-center hover:scale-105 transition-all ${circleColor}`}>
                {category.icon}
              </div>
              <span className="text-white text-sm font-medium">{category.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function getSalonImageUrl(salon: Salon): string | null {
  if (salon.images && salon.images.length > 0) return salon.images[0]
  if (salon.coverImage) return salon.coverImage
  if (salon.logo) return salon.logo
  return null
}

function SalonCard({ salon }: { salon: Salon }) {
  const formatPrice = (price?: number) => {
    if (!price || price === 0) return 'Contact for price'
    return `From GHS ${price}`
  }

  const imageUrl = getSalonImageUrl(salon)
  const displayLocation = salon.city || salon.address || salon.location

  return (
    <Link
      to={`/salon/${salon.id}`}
      className="flex-shrink-0 w-[280px] snap-start"
    >
      {/* Image Container */}
      <div className="relative h-[200px] rounded-2xl overflow-hidden mb-3">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={salon.businessName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#CE1126]/20 to-[#FCD116]/20">
            <span className="text-4xl font-bold text-[#CE1126]/50">
              {salon.businessName.charAt(0)}
            </span>
          </div>
        )}
        
        {/* Rating Badge */}
        <div className="absolute top-3 right-3 bg-[#CE1126]/90 backdrop-blur-sm rounded-lg px-2 py-1 flex flex-col items-center">
          <div className="flex items-center gap-1">
            <Icon name="star" size={16} className="text-[#FCD116]" filled />
            <span className="text-white font-bold text-sm">
              {salon.rating?.toFixed(1) || 'New'}
            </span>
          </div>
          {salon.reviewCount && salon.reviewCount > 0 && (
            <span className="text-white/70 text-xs">
              {salon.reviewCount} reviews
            </span>
          )}
        </div>
      </div>

      {/* Salon Info */}
      <h3 className="font-semibold text-brand-text text-base line-clamp-1">
        {salon.businessName}
      </h3>
      {displayLocation && (
        <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
          <Icon name="location_on" size={14} className="flex-shrink-0" />
          <span className="line-clamp-1">{displayLocation}</span>
        </div>
      )}
      <p className="text-[#CE1126] font-semibold text-sm mt-1">
        {formatPrice(salon.startingPrice)}
      </p>
    </Link>
  )
}

function SalonListCard({ salon }: { salon: Salon }) {
  const formatPrice = (price?: number) => {
    if (!price || price === 0) return 'Contact for price'
    return `From GHS ${price}`
  }

  const imageUrl = getSalonImageUrl(salon)
  const displayLocation = salon.city || salon.address || salon.location

  return (
    <Link
      to={`/salon/${salon.id}`}
      className="flex gap-4 p-3 bg-white rounded-xl border border-gray-100 shadow-sm"
    >
      {/* Image */}
      <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-200">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={salon.businessName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#CE1126]/20 to-[#FCD116]/20">
            <span className="text-2xl font-bold text-[#CE1126]/50">
              {salon.businessName.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-brand-text text-sm line-clamp-1">
          {salon.businessName}
        </h3>
        
        {/* Rating */}
        <div className="flex items-center gap-2 mt-1">
          <div className="flex items-center gap-1">
            <Icon name="star" size={14} className="text-brand-gold" filled />
            <span className="font-semibold text-sm">
              {salon.rating?.toFixed(1) || 'New'}
            </span>
          </div>
          {salon.reviewCount && salon.reviewCount > 0 && (
            <span className="text-gray-400 text-xs">
              ({salon.reviewCount})
            </span>
          )}
        </div>

        {/* Location */}
        {displayLocation && (
          <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
            <Icon name="location_on" size={12} className="flex-shrink-0" />
            <span className="line-clamp-1">{displayLocation}</span>
          </div>
        )}

        {/* Price */}
        <p className="text-[#CE1126] font-semibold text-sm mt-2">
          {formatPrice(salon.startingPrice)}
        </p>
      </div>
    </Link>
  )
}

function RecommendedSection({ salons, loading }: { salons: Salon[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="py-6">
        <div className="flex items-center gap-2 mb-4 px-4">
          <div className="w-1 h-6 bg-[#CE1126] rounded-full" />
          <h2 className="text-xl font-bold text-brand-text">Recommended</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto px-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-[280px]">
              <div className="h-[200px] rounded-2xl bg-[#CE1126]/10 animate-pulse" />
              <div className="h-4 bg-[#FCD116]/20 rounded mt-3 w-3/4 animate-pulse" />
              <div className="h-3 bg-gray-200 rounded mt-2 w-1/2 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (salons.length === 0) return null

  return (
    <div className="py-6">
      <div className="flex items-center gap-2 mb-4 px-4">
          <div className="w-1 h-6 bg-[#CE1126] rounded-full" />
          <h2 className="text-xl font-bold text-brand-text">Recommended</h2>
        </div>
      <div className="flex gap-4 overflow-x-auto px-4 pb-4 snap-x snap-mandatory scrollbar-hide">
        {salons.map((salon) => (
          <SalonCard key={salon.id} salon={salon} />
        ))}
      </div>
    </div>
  )
}

function PopularNearYouSection({ salons, loading }: { salons: Salon[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="py-6 px-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-[#FCD116] rounded-full" />
          <h2 className="text-xl font-bold text-brand-text">Popular Near You</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4 p-3 bg-white rounded-xl border border-[#006B3F]/10">
              <div className="w-24 h-24 bg-[#006B3F]/10 rounded-xl animate-pulse" />
              <div className="flex-1 space-y-2 py-2">
                <div className="h-4 bg-[#FCD116]/20 rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-1/3 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (salons.length === 0) return null

  return (
    <div className="py-6 px-4">
      <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-[#FCD116] rounded-full" />
          <h2 className="text-xl font-bold text-brand-text">Popular Near You</h2>
        </div>
      <div className="space-y-3">
        {salons.map((salon) => (
          <SalonListCard key={salon.id} salon={salon} />
        ))}
      </div>
    </div>
  )
}

// Section 1: How It Works
function HowItWorksSection() {
  const steps = [
    {
      number: 1,
      icon: 'search',
      title: 'Find Your Salon',
      description: 'Browse top-rated salons and services near you',
    },
    {
      number: 2,
      icon: 'calendar_today',
      title: 'Book Instantly',
      description: 'Choose your stylist, time, and pay securely',
    },
    {
      number: 3,
      icon: 'star',
      title: 'Enjoy & Earn',
      description: 'Get your service done and earn loyalty rewards',
    },
  ]

  return (
    <section className="py-8 px-4 bg-white">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-1 h-6 bg-[#CE1126] rounded-full" />
        <h2 className="text-xl font-bold text-brand-text">How It Works</h2>
      </div>
      <div className="space-y-4">
        {steps.map((step) => (
          <div
            key={step.number}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-start gap-4"
          >
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#CE1126] flex items-center justify-center text-white font-bold text-sm">
                {step.number}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Icon name={step.icon} size={20} className="text-[#CE1126]" />
                <h3 className="font-bold text-brand-text">{step.title}</h3>
              </div>
              <p className="text-gray-600 text-sm">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// Section 2: Why Choose GroomLink
function WhyChooseSection() {
  const benefits = [
    { icon: 'verified_user', title: 'Trusted Professionals', description: 'All salons verified and reviewed' },
    { icon: 'calendar_today', title: 'Instant Booking', description: 'Book 24/7, no calls needed' },
    { icon: 'account_balance_wallet', title: 'Secure Payments', description: 'Pay safely via Mobile Money' },
    { icon: 'workspace_premium', title: 'Loyalty Rewards', description: 'Earn points on every visit' },
    { icon: 'groups', title: 'Real Reviews', description: 'Honest ratings from real customers' },
    { icon: 'language', title: 'Ghana-Wide', description: 'Salons in Accra, Kumasi, Takoradi & more' },
  ]

  return (
    <section className="py-8 px-4 bg-[#F8F9FA]">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-1 h-6 bg-[#006B3F] rounded-full" />
        <h2 className="text-xl font-bold text-brand-text">Why Choose GroomLink</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {benefits.map((benefit) => (
          <div
            key={benefit.title}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
          >
            <div className="w-10 h-10 rounded-lg bg-[#006B3F]/10 flex items-center justify-center mb-3">
              <Icon name={benefit.icon} size={20} className="text-[#006B3F]" />
            </div>
            <h3 className="font-bold text-brand-text text-sm mb-1">{benefit.title}</h3>
            <p className="text-gray-600 text-xs leading-relaxed">{benefit.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// Section 3: For Salon Owners
function ForSalonOwnersSection() {
  const benefits = [
    'Instant payouts to Mobile Money',
    'Free business management dashboard',
    '24/7 customer support',
    'Fill empty slots automatically',
    'Build your online reputation',
  ]

  const stats = [
    { value: '1,500+', label: 'Salons' },
    { value: '10,000+', label: 'Bookings' },
    { value: '4.8★', label: 'Rating' },
  ]

  return (
    <section className="py-10 px-4 bg-gradient-to-br from-[#006B3F] to-[#004d2d]">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          Grow Your Salon Business with GroomLink
        </h2>
        <p className="text-white/80 text-sm">
          Join thousands of salon owners reaching more customers every day
        </p>
      </div>

      {/* Benefits List */}
      <div className="space-y-3 mb-8">
        {benefits.map((benefit, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Icon name="check_circle" size={16} className="text-[#FCD116]" filled />
            </div>
            <span className="text-white text-sm font-medium">{benefit}</span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-xl font-bold text-[#FCD116]">{stat.value}</div>
            <div className="text-white/70 text-xs">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <a
        href="https://partners.groomlinkgh.com"
        className="block w-full bg-white text-[#006B3F] font-bold py-4 px-6 rounded-xl text-center hover:bg-gray-100 transition-colors"
      >
        List Your Salon — It's Free
      </a>
    </section>
  )
}

// Section 4: Testimonials
function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Kwame',
      location: 'Accra',
      rating: 5,
      quote: 'GroomLink has completely changed how I book my haircuts. No more waiting!',
    },
    {
      name: 'Abena',
      location: 'Kumasi',
      rating: 5,
      quote: 'Found an amazing braiding salon through this app. The reviews were spot on!',
    },
    {
      name: 'Kofi',
      location: 'Takoradi',
      rating: 5,
      quote: 'Being able to book my barber appointments in advance is a game changer.',
    },
    {
      name: 'Efua',
      location: 'Cape Coast',
      rating: 5,
      quote: 'The loyalty points feature is fantastic! I have already earned free services.',
    },
  ]

  return (
    <section className="py-8 bg-white">
      <div className="px-4 flex items-center gap-2 mb-6">
        <div className="w-1 h-6 bg-[#FCD116] rounded-full" />
        <h2 className="text-xl font-bold text-brand-text">What Our Users Say</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto px-4 pb-4 snap-x snap-mandatory scrollbar-hide">
        {testimonials.map((testimonial, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-[280px] snap-start bg-[#F8F9FA] rounded-xl p-5"
          >
            {/* Rating */}
            <div className="flex items-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Icon
                  key={i}
                  name="star"
                  size={16}
                  className={i < testimonial.rating ? 'text-[#FCD116]' : 'text-gray-300'}
                  filled={i < testimonial.rating}
                />
              ))}
            </div>
            {/* Quote */}
            <p className="text-gray-700 text-sm mb-4 leading-relaxed">
              "{testimonial.quote}"
            </p>
            {/* Author */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#CE1126] flex items-center justify-center text-white font-semibold text-xs">
                {testimonial.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-semibold text-brand-text text-sm">{testimonial.name}</h4>
                <p className="text-gray-500 text-xs">{testimonial.location}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// Section 5: Download App
function DownloadAppSection() {
  return (
    <section className="py-10 px-4 bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f172a]">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Download the App</h2>
        <p className="text-white/80 text-sm">Book on the go. Download GroomLink today.</p>
      </div>

      {/* App Store Buttons */}
      <div className="space-y-3">
        {/* Apple App Store */}
        <a
          href="https://my.groomlinkgh.com/login"
          className="flex items-center justify-center gap-3 bg-black rounded-xl px-5 py-3 border border-white/20"
        >
          <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
          <div className="flex flex-col leading-tight text-left">
            <span className="text-white/70 text-xs">Download on the</span>
            <span className="text-white font-semibold text-base -mt-0.5">App Store</span>
          </div>
        </a>

        {/* Google Play */}
        <a
          href="https://my.groomlinkgh.com/login"
          className="flex items-center justify-center gap-3 bg-black rounded-xl px-5 py-3 border border-white/20"
        >
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
          </svg>
          <div className="flex flex-col leading-tight text-left">
            <span className="text-white/70 text-xs">Get it on</span>
            <span className="text-white font-semibold text-base -mt-0.5">Google Play</span>
          </div>
        </a>
      </div>

      {/* Phone Icon */}
      <div className="flex justify-center mt-6">
        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
          <Icon name="smartphone" size={32} className="text-[#FCD116]" />
        </div>
      </div>
    </section>
  )
}

// Section 6: Mini Footer
function MiniFooter() {
  const quickLinks = [
    { name: 'For Customers', href: '/explore' },
    { name: 'For Barbershop/Salon', href: 'https://partners.groomlinkgh.com' },
    { name: 'Support', href: 'https://my.groomlinkgh.com/support' },
    { name: 'About', href: '/about' },
  ]

  const socialLinks = [
    { href: '#', label: 'Facebook', svg: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
    { href: '#', label: 'Twitter', svg: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
    { href: '#', label: 'Instagram', svg: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg> },
    { href: '#', label: 'LinkedIn', svg: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
  ]

  return (
    <footer className="bg-[#1a1a1a] px-4 py-8 pb-28">
      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {quickLinks.map((link) => (
          <a
            key={link.name}
            href={link.href}
            className="text-gray-400 text-sm hover:text-white transition-colors"
          >
            {link.name}
          </a>
        ))}
      </div>

      {/* Social Icons */}
      <div className="flex items-center gap-4 mb-6">
        {socialLinks.map((social) => (
          <a
            key={social.label}
            href={social.href}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/20 transition-colors"
            aria-label={social.label}
          >
            {social.svg}
          </a>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-800 pt-6">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img
            src="/logo-full-white.png"
            alt="GroomLink"
            className="h-8 w-auto opacity-80"
          />
        </div>

        {/* Copyright */}
        <p className="text-center text-gray-500 text-xs mb-2">
          © 2025 GroomLink. Made in Ghana 🇬🇭
        </p>
        <p className="text-center text-gray-600 text-xs">
          An{' '}
          <a href="https://arthium.com" className="text-[#CE1126] hover:underline">
            Arthium Labs
          </a>{' '}
          Product
        </p>
      </div>
    </footer>
  )
}

export default function MobileHome() {
  const [recommendedSalons, setRecommendedSalons] = useState<Salon[]>([])
  const [popularSalons, setPopularSalons] = useState<Salon[]>([])
  const [loadingRecommended, setLoadingRecommended] = useState(true)
  const [loadingPopular, setLoadingPopular] = useState(true)

  useEffect(() => {
    const mapSalonData = (raw: any[]): Salon[] =>
      raw.map((s: any) => ({
        id: s.id,
        businessName: s.businessName,
        coverImage: s.coverImage || undefined,
        logo: s.logo || undefined,
        images: s.images || undefined,
        rating: s.rating,
        reviewCount: s.reviewCount,
        city: s.city,
        address: s.address,
        location: s.city || s.address,
        startingPrice: s.services?.length
          ? Math.min(...s.services.map((svc: any) => Number(svc.price)).filter(Boolean))
          : undefined,
      }))

    const fetchRecommended = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/salons?limit=8`)
        if (!response.ok) throw new Error('Failed to fetch')
        const data = await response.json()
        if (data.success && Array.isArray(data.data)) {
          setRecommendedSalons(mapSalonData(data.data.slice(0, 8)))
        }
      } catch (err) {
        console.error('Error fetching recommended salons:', err)
      } finally {
        setLoadingRecommended(false)
      }
    }

    const fetchPopular = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/salons?limit=8&sort=rating`)
        if (!response.ok) throw new Error('Failed to fetch')
        const data = await response.json()
        if (data.success && Array.isArray(data.data)) {
          setPopularSalons(mapSalonData(data.data.slice(0, 6)))
        }
      } catch (err) {
        console.error('Error fetching popular salons:', err)
      } finally {
        setLoadingPopular(false)
      }
    }

    fetchRecommended()
    fetchPopular()
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <HeroSection />

      {/* Recommended Section */}
      <RecommendedSection salons={recommendedSalons} loading={loadingRecommended} />

      {/* Popular Near You Section */}
      <PopularNearYouSection salons={popularSalons} loading={loadingPopular} />

      {/* Section 1: How It Works */}
      <HowItWorksSection />

      {/* Section 2: Why Choose GroomLink */}
      <WhyChooseSection />

      {/* Section 3: For Salon Owners */}
      <ForSalonOwnersSection />

      {/* Section 4: Testimonials */}
      <TestimonialsSection />

      {/* Section 5: Download App */}
      <DownloadAppSection />

      {/* Section 6: Mini Footer */}
      <MiniFooter />

      {/* Bottom Navigation */}
      <BottomNav activeTab="home" />
    </div>
  )
}
