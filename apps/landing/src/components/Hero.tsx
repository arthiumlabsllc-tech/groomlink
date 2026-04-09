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
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
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
