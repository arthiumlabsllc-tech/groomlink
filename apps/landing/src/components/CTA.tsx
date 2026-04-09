import { ArrowRight, User, Store } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function CTA() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative bg-gradient-to-br from-ghana-green via-[#005a34] to-[#004d2d] rounded-3xl overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-ghana-gold rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative p-8 md:p-12 lg:p-16">
            {/* Header */}
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white font-display leading-tight">
                Ready to Get Started?
              </h2>
              <p className="text-white/80 mt-4 text-lg max-w-2xl mx-auto">
                Join thousands of Ghanaians discovering the best salons and barbershops. Book your next appointment today!
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link 
                to="/register" 
                className="bg-ghana-gold hover:bg-yellow-400 text-gray-900 font-semibold px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <User className="w-5 h-5" />
                I'm a Customer
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                to="/register" 
                className="bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 hover:border-white/50 font-semibold px-8 py-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Store className="w-5 h-5" />
                I'm a Salon Owner
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/10">
                <div className="text-3xl md:text-4xl font-bold text-white font-display">500+</div>
                <div className="text-white/70 mt-1 text-sm">Salons</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/10">
                <div className="text-3xl md:text-4xl font-bold text-white font-display">10K+</div>
                <div className="text-white/70 mt-1 text-sm">Users</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/10">
                <div className="text-3xl md:text-4xl font-bold text-white font-display">25K+</div>
                <div className="text-white/70 mt-1 text-sm">Bookings</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/10">
                <div className="text-3xl md:text-4xl font-bold text-white font-display">4.8</div>
                <div className="text-white/70 mt-1 text-sm">Rating</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
