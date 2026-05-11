import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'

const customerTestimonials = [
  {
    id: 1,
    name: 'Kwame Asante',
    location: 'Accra',
    rating: 5,
    quote: 'GroomLink has completely changed how I book my haircuts. No more waiting in line for hours!',
    initials: 'KA',
  },
  {
    id: 2,
    name: 'Abena Owusu',
    location: 'Kumasi',
    rating: 5,
    quote: 'Found an amazing braiding salon through this app. The reviews were spot on!',
    initials: 'AO',
  },
  {
    id: 3,
    name: 'Kofi Mensah',
    location: 'Takoradi',
    rating: 5,
    quote: 'As a busy professional, being able to book my barber appointments in advance is a game changer.',
    initials: 'KM',
  },
  {
    id: 4,
    name: 'Efua Boateng',
    location: 'Cape Coast',
    rating: 5,
    quote: 'The loyalty points feature is fantastic! I have already earned two free manicures.',
    initials: 'EB',
  },
  {
    id: 5,
    name: 'Yaw Darko',
    location: 'Tamale',
    rating: 4,
    quote: 'Great selection of salons in my area. The app is easy to use and very reliable.',
    initials: 'YD',
  },
]

const ownerTestimonials = [
  {
    id: 6,
    name: 'Nana Afia',
    location: 'Accra - Nana\'s Beauty Lounge',
    rating: 5,
    quote: 'Since joining GroomLink, my bookings have increased by 40%. The dashboard makes it so easy to manage my schedule.',
    initials: 'NA',
  },
  {
    id: 7,
    name: 'Kwesi Boateng',
    location: 'Kumasi - Fresh Cuts Barbershop',
    rating: 5,
    quote: 'I love getting paid directly to my MTN Mobile Money. No more chasing clients for payment. Game changer!',
    initials: 'KB',
  },
  {
    id: 8,
    name: 'Ama Serwaa',
    location: 'Takoradi - Serwaa Braids',
    rating: 5,
    quote: 'As a freelancer, GroomLink helped me find clients I never would have reached. My calendar is now fully booked!',
    initials: 'AS',
  },
  {
    id: 9,
    name: 'Yaw Osei',
    location: 'Cape Coast - Royal Grooming',
    rating: 5,
    quote: 'The verification process gave my business credibility. Customers trust us more because we are on GroomLink.',
    initials: 'YO',
  },
]

export default function Testimonials() {
  const sectionRef = useRef<HTMLElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [activeTab, setActiveTab] = useState<'customer' | 'owner'>('customer')
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const testimonials = activeTab === 'customer' ? customerTestimonials : ownerTestimonials

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  useEffect(() => {
    const scrollEl = scrollRef.current
    if (scrollEl) {
      scrollEl.addEventListener('scroll', checkScroll)
      checkScroll()
      return () => scrollEl.removeEventListener('scroll', checkScroll)
    }
  }, [])

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  return (
    <section ref={sectionRef} className="py-20 bg-white overflow-hidden">
      <div className="section-container">
        {/* Section Header */}
        <div className={`flex flex-col md:flex-row md:items-end md:justify-between mb-12 gap-6 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-brand-text mb-4">
              {activeTab === 'customer' ? 'What Our Customers Say' : 'What Salon Owners Say'}
            </h2>
            <p className="text-gray-600 text-lg">
              {activeTab === 'customer' ? 'Join 10,000+ happy customers who trust GroomLink' : 'Join 1,500+ professionals growing with GroomLink'}
            </p>
          </div>
          
          {/* Navigation Arrows - Desktop */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className={`p-2 rounded-full border-2 transition-all ${
                canScrollLeft
                  ? 'border-gray-300 hover:border-brand-primary hover:text-brand-primary'
                  : 'border-gray-200 text-gray-300 cursor-not-allowed'
              }`}
              aria-label="Previous testimonial"
            >
              <Icon name="chevron_left" size={20} />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className={`p-2 rounded-full border-2 transition-all ${
                canScrollRight
                  ? 'border-gray-300 hover:border-brand-primary hover:text-brand-primary'
                  : 'border-gray-200 text-gray-300 cursor-not-allowed'
              }`}
              aria-label="Next testimonial"
            >
              <Icon name="chevron_right" size={20} />
            </button>
          </div>
        </div>

        <div className={`flex justify-center mb-10 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="bg-brand-surface rounded-2xl p-1.5 shadow-sm border border-gray-200 inline-flex">
            <button
              onClick={() => setActiveTab('customer')}
              className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                activeTab === 'customer'
                  ? 'bg-brand-primary text-white shadow-md'
                  : 'text-gray-600 hover:text-brand-text'
              }`}
            >
              <Icon name="person" size={18} />
              Customer Stories
            </button>
            <button
              onClick={() => setActiveTab('owner')}
              className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                activeTab === 'owner'
                  ? 'bg-brand-secondary text-white shadow-md'
                  : 'text-gray-600 hover:text-brand-text'
              }`}
            >
              <Icon name="storefront" size={18} />
              Salon Owner Stories
            </button>
          </div>
        </div>

        {/* Testimonials Carousel */}
        <div
          ref={scrollRef}
          className={`flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {testimonials.map((testimonial: typeof testimonials[0], index: number) => (
            <div
              key={testimonial.id}
              className="flex-shrink-0 w-[300px] sm:w-[350px] snap-start"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="card p-6 h-full">
                {/* Rating */}
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Icon
                      key={i}
                      name="star"
                      size={16}
                      className={i < testimonial.rating ? 'text-brand-gold' : 'text-gray-300'}
                      filled={i < testimonial.rating}
                    />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-gray-700 mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {testimonial.initials}
                  </div>
                  <div>
                    <h4 className="font-semibold text-brand-text text-sm">
                      {testimonial.name}
                    </h4>
                    <p className="text-gray-500 text-sm">
                      {testimonial.location}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Scroll Indicator */}
        <div className="flex md:hidden justify-center gap-2 mt-6">
          {testimonials.map((_item: typeof testimonials[0], index: number) => (
            <div
              key={index}
              className="w-2 h-2 rounded-full bg-gray-300"
            />
          ))}
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  )
}
