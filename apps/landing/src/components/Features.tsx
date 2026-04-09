import { Calendar, ShieldCheck, Star, CreditCard, MapPin, Bell } from 'lucide-react'

const features = [
  {
    icon: Calendar,
    title: 'Easy Booking',
    description: 'Book appointments 24/7 with real-time availability. Choose your preferred stylist and time slot in seconds.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified Salons',
    description: 'All salons and barbershops are vetted for quality. View certifications, portfolios, and hygiene ratings.',
  },
  {
    icon: Star,
    title: 'Real Reviews',
    description: 'Read authentic reviews from real customers. Make informed decisions based on genuine experiences.',
  },
  {
    icon: CreditCard,
    title: 'Mobile Payments',
    description: 'Pay with MTN MoMo, Vodafone Cash, AirtelTigo, or card. Secure payments with instant confirmation.',
  },
  {
    icon: MapPin,
    title: 'Location Search',
    description: 'Find salons near you with GPS-enabled search. Ghana Post GPS integration for accurate directions.',
  },
  {
    icon: Bell,
    title: 'Smart Notifications',
    description: 'Never miss an appointment with SMS and push reminders. Get notified 24 hours and 1 hour before.',
  },
]

export default function Features() {
  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-ghana-green font-semibold text-sm uppercase tracking-wider">Features</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-2 font-display">
            Everything You Need
          </h2>
          <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
            GroomLink connects you with the best salons and barbershops in Ghana with features designed for your convenience.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="w-14 h-14 bg-ghana-green/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-ghana-green transition-colors duration-300">
                <feature.icon className="w-7 h-7 text-ghana-green group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3 font-display">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
