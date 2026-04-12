import { Star, MapPin, Clock, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-ghana-green via-[#005a34] to-[#004d2d]">
        {/* Subtle Ghana flag gradient overlay */}
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-ghana-red to-transparent"></div>
          <div className="absolute top-1/3 left-0 w-full h-1/3 bg-gradient-to-b from-ghana-gold/50 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-ghana-green to-transparent"></div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-ghana-gold/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-ghana-gold/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl"></div>
      </div>

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Star className="w-4 h-4 text-ghana-gold mr-2 fill-ghana-gold" />
              <span className="text-white/90 text-sm font-medium">Ghana's #1 Salon & Barbershop Platform</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white font-display leading-tight mb-6">
              Connect with the Best{' '}
              <span className="text-ghana-gold">Salons & Barbershops</span>{' '}
              in Ghana
            </h1>
            
            <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto lg:mx-0">
              GroomLink makes it easy to discover, book, and pay for haircuts, braids, styling, and more at verified salons near you.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
              <Link 
                to="/register" 
                className="bg-ghana-green hover:bg-ghana-green/90 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl text-center"
              >
                Find a Salon
              </Link>
              <Link 
                to="/register" 
                className="border-2 border-ghana-gold text-ghana-gold hover:bg-ghana-gold hover:text-gray-900 font-semibold px-8 py-4 rounded-xl transition-all text-center"
              >
                List Your Business
              </Link>
            </div>

            {/* App Store Badges */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
              {/* Apple App Store Badge */}
              <div className="relative inline-flex cursor-not-allowed group">
                <div className="flex items-center gap-3 bg-black rounded-xl px-5 py-3 opacity-75 hover:opacity-90 transition-opacity">
                  {/* Apple Logo */}
                  <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <div className="flex flex-col leading-tight">
                    <span className="text-white/70 text-xs">Download on the</span>
                    <span className="text-white font-semibold text-base -mt-0.5">App Store</span>
                  </div>
                </div>
                {/* Coming Soon Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-ghana-gold/95 text-gray-900 text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    Coming Soon
                  </div>
                </div>
              </div>

              {/* Google Play Store Badge */}
              <div className="relative inline-flex cursor-not-allowed group">
                <div className="flex items-center gap-3 bg-black rounded-xl px-5 py-3 opacity-75 hover:opacity-90 transition-opacity">
                  {/* Google Play Logo */}
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                  </svg>
                  <div className="flex flex-col leading-tight">
                    <span className="text-white/70 text-xs">Get it on</span>
                    <span className="text-white font-semibold text-base -mt-0.5">Google Play</span>
                  </div>
                </div>
                {/* Coming Soon Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-ghana-gold/95 text-gray-900 text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    Coming Soon
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/20">
              <div>
                <div className="text-3xl sm:text-4xl font-bold text-white font-display">500+</div>
                <div className="text-white/70 text-sm">Salons</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-bold text-white font-display">10,000+</div>
                <div className="text-white/70 text-sm">Bookings</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-bold text-white font-display flex items-center justify-center lg:justify-start gap-1">
                  4.8
                  <Star className="w-6 h-6 text-ghana-gold fill-ghana-gold" />
                </div>
                <div className="text-white/70 text-sm">Rating</div>
              </div>
            </div>
          </div>

          {/* Right Content - Feature Cards */}
          <div className="hidden lg:grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 transform hover:scale-[1.02] transition-all duration-300 hover:bg-white/15">
                <div className="w-12 h-12 bg-ghana-gold/20 rounded-xl flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6 text-ghana-gold" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2 font-display">Find Nearby</h3>
                <p className="text-white/70 text-sm">Discover salons near you with GPS-enabled search</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 transform hover:scale-[1.02] transition-all duration-300 hover:bg-white/15">
                <div className="w-12 h-12 bg-ghana-gold/20 rounded-xl flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-ghana-gold" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2 font-display">Verified Salons</h3>
                <p className="text-white/70 text-sm">All service providers are vetted and certified</p>
              </div>
            </div>
            <div className="space-y-4 mt-8">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 transform hover:scale-[1.02] transition-all duration-300 hover:bg-white/15">
                <div className="w-12 h-12 bg-ghana-gold/20 rounded-xl flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-ghana-gold" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2 font-display">Real-time Booking</h3>
                <p className="text-white/70 text-sm">Book instantly with live availability</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 transform hover:scale-[1.02] transition-all duration-300 hover:bg-white/15">
                <div className="w-12 h-12 bg-ghana-gold/20 rounded-xl flex items-center justify-center mb-4">
                  <Star className="w-6 h-6 text-ghana-gold" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2 font-display">Reviews & Ratings</h3>
                <p className="text-white/70 text-sm">Read authentic reviews from real customers</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wave Bottom */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 120L48 110C96 100 192 80 288 70C384 60 480 60 576 65C672 70 768 80 864 85C960 90 1056 90 1152 85C1248 80 1344 70 1392 65L1440 60V120H1392C1344 120 1248 120 1152 120C1056 120 960 120 864 120C768 120 672 120 576 120C480 120 384 120 288 120C192 120 96 120 48 120H0Z" fill="white"/>
        </svg>
      </div>
    </section>
  )
}
