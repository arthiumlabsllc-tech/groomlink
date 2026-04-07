import { Star, MapPin, Clock, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700">
        {/* Ghana-inspired pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-1/4 bg-ghana-red"></div>
          <div className="absolute top-1/4 left-0 w-full h-1/4 bg-ghana-gold"></div>
          <div className="absolute top-2/4 left-0 w-full h-1/4 bg-ghana-green"></div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-ghana-gold/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-ghana-red/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Star className="w-4 h-4 text-ghana-gold mr-2" />
              <span className="text-white/90 text-sm font-medium">Ghana's #1 Beauty Platform</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white font-display leading-tight mb-6">
              Book Your Next{' '}
              <span className="text-ghana-gold">Beauty</span>{' '}
              Experience
            </h1>
            
            <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto lg:mx-0">
              Discover and book appointments with top-rated salons, barbershops, and beauty professionals across Ghana. Quality grooming, just a tap away.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link to="/register" className="btn-gold text-lg">
                Book Appointment
              </Link>
              <a href="#how-it-works" className="btn-secondary text-lg">
                Learn More
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-white/20">
              <div>
                <div className="text-3xl font-bold text-white">500+</div>
                <div className="text-white/70 text-sm">Partner Salons</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">50K+</div>
                <div className="text-white/70 text-sm">Happy Customers</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">4.9</div>
                <div className="text-white/70 text-sm">Average Rating</div>
              </div>
            </div>
          </div>

          {/* Right Content - Feature Cards */}
          <div className="hidden lg:grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 transform hover:scale-105 transition-transform">
                <MapPin className="w-10 h-10 text-ghana-gold mb-4" />
                <h3 className="text-white font-semibold text-lg mb-2">Find Nearby</h3>
                <p className="text-white/70 text-sm">Discover salons near you with GPS-enabled search</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 transform hover:scale-105 transition-transform">
                <Shield className="w-10 h-10 text-ghana-gold mb-4" />
                <h3 className="text-white font-semibold text-lg mb-2">Verified Professionals</h3>
                <p className="text-white/70 text-sm">All service providers are vetted and certified</p>
              </div>
            </div>
            <div className="space-y-4 mt-8">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 transform hover:scale-105 transition-transform">
                <Clock className="w-10 h-10 text-ghana-gold mb-4" />
                <h3 className="text-white font-semibold text-lg mb-2">Real-time Booking</h3>
                <p className="text-white/70 text-sm">Book instantly with live availability</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 transform hover:scale-105 transition-transform">
                <Star className="w-10 h-10 text-ghana-gold mb-4" />
                <h3 className="text-white font-semibold text-lg mb-2">Reviews & Ratings</h3>
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
