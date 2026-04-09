import { Star, Quote } from 'lucide-react'

const testimonials = [
  {
    name: 'Akosua Mensah',
    role: 'Regular Customer',
    location: 'Accra',
    content: 'GroomLink has transformed how I book my hair appointments. No more waiting at the salon! I can book my favorite stylist in seconds.',
    rating: 5,
    avatar: 'A',
  },
  {
    name: 'Yaw Asante',
    role: 'Barbershop Owner',
    location: 'Kumasi',
    content: 'Since joining GroomLink, my bookings have increased by 40%. The dashboard makes it so easy to manage my shop.',
    rating: 5,
    avatar: 'Y',
  },
  {
    name: 'Esi Dankwa',
    role: 'Salon Owner',
    location: 'Takoradi',
    content: 'The analytics feature helps me understand my peak hours. I\'ve optimized my staffing and increased revenue significantly.',
    rating: 5,
    avatar: 'E',
  },
  {
    name: 'Kwame Boateng',
    role: 'Regular Customer',
    location: 'Cape Coast',
    content: 'Love the Mobile Money payment option! So convenient. And the reminder notifications mean I never miss an appointment.',
    rating: 5,
    avatar: 'K',
  },
]

export default function Testimonials() {
  return (
    <section className="py-20 bg-gradient-to-br from-ghana-green via-[#005a34] to-[#004d2d]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-ghana-gold font-semibold text-sm uppercase tracking-wider">Testimonials</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2 font-display">
            Loved by Ghanaians
          </h2>
          <p className="text-white/70 mt-4 max-w-2xl mx-auto">
            Join thousands of satisfied customers and salon owners who trust GroomLink.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:-translate-y-1"
            >
              <Quote className="w-8 h-8 text-ghana-gold mb-4 opacity-60" />
              
              <p className="text-white/90 text-sm leading-relaxed mb-4">
                "{testimonial.content}"
              </p>
              
              {/* Star Rating */}
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-ghana-gold fill-ghana-gold" />
                ))}
              </div>
              
              {/* Customer Info */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-ghana-gold rounded-full flex items-center justify-center text-gray-900 font-bold text-sm">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="text-white font-semibold text-sm font-display">{testimonial.name}</div>
                  <div className="text-white/60 text-xs">{testimonial.role} • {testimonial.location}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
