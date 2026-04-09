import { Search, CheckCircle, Calendar, Sparkles } from 'lucide-react'

const steps = [
  {
    icon: Search,
    step: 1,
    title: 'Search',
    description: 'Browse salons and barbershops near you. Filter by services, ratings, and location.',
  },
  {
    icon: CheckCircle,
    step: 2,
    title: 'Choose',
    description: 'Compare options, read reviews, and select your preferred salon or stylist.',
  },
  {
    icon: Calendar,
    step: 3,
    title: 'Book',
    description: 'Pick your date and time. Confirm your appointment in seconds.',
  },
  {
    icon: Sparkles,
    step: 4,
    title: 'Enjoy',
    description: 'Show up, get serviced, and leave a review. It\'s that simple!',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-ghana-green font-semibold text-sm uppercase tracking-wider">How It Works</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-2 font-display">
            Book in 4 Simple Steps
          </h2>
          <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
            Getting your next salon or barbershop appointment has never been easier.
          </p>
        </div>

        <div className="relative">
          {/* Desktop Connection Line */}
          <div className="hidden lg:block absolute top-10 left-0 right-0 h-0.5 bg-gradient-to-r from-ghana-green via-ghana-gold to-ghana-green"></div>
          
          {/* Mobile Connection Line */}
          <div className="lg:hidden absolute top-10 left-1/2 w-0.5 h-[calc(100%-40px)] bg-gradient-to-b from-ghana-green via-ghana-gold to-ghana-green -translate-x-1/2"></div>
          
          {/* Desktop Grid */}
          <div className="hidden lg:grid grid-cols-4 gap-8">
            {steps.map((item, index) => (
              <div key={index} className="relative text-center">
                {/* Step Number */}
                <div className="relative z-10 inline-flex items-center justify-center w-20 h-20 bg-ghana-green rounded-full mb-6 mx-auto shadow-lg">
                  <span className="text-2xl font-bold text-white font-display">{item.step}</span>
                </div>
                
                {/* Content Card */}
                <div className="bg-gray-50 rounded-2xl p-6 hover:bg-gray-100 transition-colors">
                  <div className="w-12 h-12 bg-ghana-gold/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-6 h-6 text-ghana-green" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 font-display">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Vertical Stack */}
          <div className="lg:hidden space-y-8">
            {steps.map((item, index) => (
              <div key={index} className="relative flex items-start gap-6">
                {/* Step Number */}
                <div className="relative z-10 flex-shrink-0 w-20 h-20 bg-ghana-green rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-2xl font-bold text-white font-display">{item.step}</span>
                </div>
                
                {/* Content Card */}
                <div className="flex-1 bg-gray-50 rounded-2xl p-6">
                  <div className="w-12 h-12 bg-ghana-gold/20 rounded-xl flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-ghana-green" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 font-display">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
