import { Search, Calendar, CreditCard, Bell, Users, TrendingUp } from 'lucide-react'

const features = [
  {
    icon: Search,
    title: 'Smart Discovery',
    description: 'Find the perfect salon with advanced filters for location, services, ratings, and price range. Ghana Post GPS integration for accurate directions.',
  },
  {
    icon: Calendar,
    title: 'Instant Booking',
    description: 'Book appointments 24/7 with real-time availability. No more waiting on hold or playing phone tag.',
  },
  {
    icon: CreditCard,
    title: 'Mobile Money Ready',
    description: 'Pay with MTN MoMo, Vodafone Cash, or AirtelTigo. Secure payments with instant confirmation.',
  },
  {
    icon: Bell,
    title: 'Smart Reminders',
    description: 'Never miss an appointment with SMS and push notifications. Get reminded 24 hours and 1 hour before.',
  },
  {
    icon: Users,
    title: 'For Salons',
    description: 'Powerful dashboard for salon owners. Manage bookings, staff, services, and track your business growth.',
  },
  {
    icon: TrendingUp,
    title: 'Business Analytics',
    description: 'Insights and reports to help salon owners understand trends, peak hours, and customer preferences.',
  },
]

export default function Features() {
  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-primary-500 font-semibold text-sm uppercase tracking-wider">Features</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-2 font-display">
            Everything You Need
          </h2>
          <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
            From booking to payments, we've built GroomLink to make beauty services accessible and convenient for everyone in Ghana.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow duration-300 group"
            >
              <div className="w-14 h-14 bg-primary-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary-500 transition-colors duration-300">
                <feature.icon className="w-7 h-7 text-primary-500 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
