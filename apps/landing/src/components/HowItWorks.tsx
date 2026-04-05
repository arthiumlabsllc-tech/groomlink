import { Search, CalendarCheck, CreditCard, Star } from 'lucide-react'

const steps = [
  {
    icon: Search,
    step: '01',
    title: 'Discover Salons',
    description: 'Browse hundreds of verified salons and barbershops near you. Filter by services, ratings, and price.',
  },
  {
    icon: CalendarCheck,
    step: '02',
    title: 'Book Appointment',
    description: 'Choose your preferred time slot, select your stylist, and book instantly. It takes less than 30 seconds.',
  },
  {
    icon: CreditCard,
    step: '03',
    title: 'Pay Securely',
    description: 'Pay with Mobile Money or card. Your payment is protected until your service is complete.',
  },
  {
    icon: Star,
    step: '04',
    title: 'Rate & Review',
    description: 'Share your experience to help others find great services. Earn rewards for reviews.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-primary-500 font-semibold text-sm uppercase tracking-wider">How It Works</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-2 font-display">
            Book in 4 Simple Steps
          </h2>
          <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
            Getting your next beauty appointment has never been easier. Here's how GroomLink works.
          </p>
        </div>

        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2"></div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((item, index) => (
              <div key={index} className="relative text-center">
                {/* Step Number */}
                <div className="relative z-10 inline-flex items-center justify-center w-20 h-20 bg-white border-4 border-primary-500 rounded-full mb-6 mx-auto">
                  <span className="text-2xl font-bold text-primary-500">{item.step}</span>
                </div>
                
                {/* Content */}
                <div className="bg-gray-50 rounded-2xl p-6">
                  <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
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
