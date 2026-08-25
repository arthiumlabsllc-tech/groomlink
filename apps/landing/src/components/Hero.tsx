import { Link } from 'react-router-dom'
import SearchBox from './SearchBox'
import Icon from './Icon'
import LocationPicker from './LocationPicker'

export default function Hero() {
  return (
    <section className="relative z-20 min-h-[90vh] md:min-h-[700px] flex items-center pt-20">
      {/* Background — overflow-hidden lives HERE (not on the <section>) so the
          LocationPicker dropdown can extend below the hero's bottom edge and
          paint in front of the HowItWorks section. The z-20 on the section
          ensures the hero's stacking context wins over later siblings. */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Self-hosted Video Background - Desktop Only (lg+) */}
        <div className="hidden lg:block absolute inset-0 w-full h-full overflow-hidden">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full object-cover"
          >
            <source src="https://api.groomlinkgh.com/api/uploads/assets/hero-video.mp4" type="video/mp4" />
          </video>
        </div>

        {/* Mobile/Tablet gradient background (no video) */}
        <div className="lg:hidden absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f172a]">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-brand-primary/30 to-transparent"></div>
            <div className="absolute top-1/3 left-0 w-full h-1/3 bg-gradient-to-b from-brand-gold/20 to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-brand-secondary/30 to-transparent"></div>
          </div>
        </div>

        {/* Dark Overlay on top of video for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/70 lg:from-black/60 lg:to-black/70" />

        {/* Decorative elements */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-brand-secondary/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 section-container py-16 lg:py-24">
        <div className="max-w-3xl">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6 animate-fade-in">
            <Icon name="star" size={16} className="text-brand-gold" filled />
            <span className="text-white/90 text-sm font-medium">
              Trusted by 1,500+ Ghanaian salons
            </span>
            <span className="text-white/50">•</span>
            <span className="text-white/90 text-sm font-medium flex items-center gap-1">
              <Icon name="star" size={12} className="text-brand-gold" filled />
              4.8 from 5,000+ reviews
            </span>
          </div>
          
          {/* Headline - clearer value prop */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white font-display leading-tight mb-6 animate-fade-in-up">
            Find Trusted Barbers, Hairstylists & Beauty Pros{' '}
            <span className="text-brand-gold">Near You.</span>
          </h1>
          
          {/* Subheadline - explains both sides */}
          <p className="text-lg sm:text-xl text-white/80 mb-8 max-w-xl animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Ghana's #1 platform to discover, compare, and book barbers, salons, makeup artists, and beauty professionals - or list your business and grow your clientele.
          </p>

          {/* Location Picker - sits above the search bar.
              z-30 wrapper ensures the location dropdown panel renders in FRONT
              of the SearchBox (which sits in its own backdrop-blur stacking
              context below at z-20). Without this, the location panel opens
              downward and gets visually clipped behind the glassmorphic search
              input on desktop. */}
          <div className="relative z-30 animate-fade-in-up mb-3" style={{ animationDelay: '0.13s' }}>
            <LocationPicker variant="hero" autoPrompt />
          </div>

          {/* Search Box */}
          <div className="relative z-20 animate-fade-in-up mb-8" style={{ animationDelay: '0.15s' }}>
            <SearchBox variant="desktop" />
          </div>

          {/* Specific CTA Buttons - clearer actions */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <Link 
              to="/explore" 
              className="btn-primary text-center text-base px-6 py-3.5 min-h-12 w-full sm:w-auto inline-flex items-center justify-center gap-2"
            >
              <Icon name="search" size={20} />
              Find a Professional
            </Link>
            <a 
              href="https://partners.groomlinkgh.com" 
              className="bg-white/10 backdrop-blur-sm border border-white/30 text-white text-center text-base px-6 py-3.5 min-h-12 w-full sm:w-auto rounded-xl hover:bg-white/20 transition-all inline-flex items-center justify-center gap-2 font-medium"
            >
              <Icon name="storefront" size={20} />
              List Your Business
            </a>
            <a 
              href="/download" 
              className="btn-outline-white text-center text-base px-6 py-3.5 min-h-12 w-full sm:w-auto inline-flex items-center justify-center gap-2"
            >
              <Icon name="phone_android" size={20} />
              Get the App
            </a>
          </div>

          {/* Freelancer / Skilled Barber CTA */}
          <div className="mb-12 animate-fade-in-up" style={{ animationDelay: '0.22s' }}>
            <a
              href="https://partners.groomlinkgh.com"
              className="inline-flex items-center gap-2 bg-brand-gold/20 border border-brand-gold/40 text-white px-5 py-2.5 rounded-full hover:bg-brand-gold/30 transition-all text-sm font-medium"
            >
              <span>✂️</span> Stylist? Get booked. Create your profile.
            </a>
          </div>

          {/* Quick action pills */}
          <div className="flex flex-wrap gap-2 mb-10 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
            <span className="text-white/60 text-sm mr-2 self-center">Popular:</span>
            {['Book a Fade', 'Find a Stylist', 'Makeup Artists', 'Nail Techs', 'Braiders', 'Spa & Massage'].map((tag) => (
              <Link
                key={tag}
                to="/explore"
                className="bg-white/10 hover:bg-white/20 text-white/90 text-sm px-4 py-1.5 rounded-full transition-all border border-white/10 hover:border-white/30"
              >
                {tag}
              </Link>
            ))}
          </div>

          {/* App Store Badges */}
          <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            {/* Apple App Store Badge */}
            <div className="flex flex-col items-center sm:items-start">
              <a href="/download" className="flex items-center gap-3 bg-black rounded-xl px-5 py-3 opacity-75 hover:opacity-100 transition-opacity">
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div className="flex flex-col leading-tight">
                  <span className="text-white/70 text-xs">Download on the</span>
                  <span className="text-white font-semibold text-base -mt-0.5">App Store</span>
                </div>
              </a>
            </div>

            {/* Google Play Store Badge */}
            <div className="flex flex-col items-center sm:items-start">
              <a href="/download" className="flex items-center gap-3 bg-black rounded-xl px-5 py-3 opacity-75 hover:opacity-100 transition-opacity">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                </svg>
                <div className="flex flex-col leading-tight">
                  <span className="text-white/70 text-xs">Get it on</span>
                  <span className="text-white font-semibold text-base -mt-0.5">Google Play</span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0 80L48 74.7C96 69 192 59 288 53.3C384 48 480 48 576 53.3C672 59 768 69 864 69.3C960 69 1056 59 1152 53.3C1248 48 1344 48 1392 48L1440 48V80H1392C1344 80 1248 80 1152 80C1056 80 960 80 864 80C768 80 672 80 576 80C480 80 384 80 288 80C192 80 96 80 48 80H0Z" fill="#F8F9FA"/>
        </svg>
      </div>
    </section>
  )
}
