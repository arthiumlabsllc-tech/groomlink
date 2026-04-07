import { ArrowRight, Play } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function CTA() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 rounded-3xl overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-ghana-gold rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-ghana-red rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative grid lg:grid-cols-2 gap-12 items-center p-8 md:p-12 lg:p-16">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white font-display leading-tight">
                Ready to Transform Your{' '}
                <span className="text-ghana-gold">Beauty Experience</span>?
              </h2>
              <p className="text-white/80 mt-4 text-lg">
                Join thousands of Ghanaians who are already enjoying hassle-free salon bookings. 
                Download our app or book online today.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Link 
                  to="/register" 
                  className="btn-gold flex items-center justify-center gap-2"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a 
                  href="#how-it-works" 
                  className="flex items-center justify-center gap-2 text-white font-semibold hover:text-ghana-gold transition-colors"
                >
                  <Play className="w-5 h-5" />
                  Watch Demo
                </a>
              </div>

              {/* App Store Badges */}
              <div className="flex items-center gap-4 mt-8">
                <div className="text-white/60 text-sm">Available on:</div>
                <div className="flex gap-2">
                  <div className="bg-white/10 rounded-lg px-4 py-2 text-white text-sm font-medium backdrop-blur-sm">
                    App Store
                  </div>
                  <div className="bg-white/10 rounded-lg px-4 py-2 text-white text-sm font-medium backdrop-blur-sm">
                    Google Play
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                <div className="text-4xl font-bold text-white">10K+</div>
                <div className="text-white/70 mt-1">Active Users</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                <div className="text-4xl font-bold text-white">500+</div>
                <div className="text-white/70 mt-1">Salons</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                <div className="text-4xl font-bold text-white">25K+</div>
                <div className="text-white/70 mt-1">Bookings</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
                <div className="text-4xl font-bold text-white">4.9</div>
                <div className="text-white/70 mt-1">Avg Rating</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
