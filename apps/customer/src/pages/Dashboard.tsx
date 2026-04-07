import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  Star,
  ChevronRight,
  MapPin
} from 'lucide-react'

// Mock data
const upcomingBookings = [
  {
    id: 1,
    salon: "Elite Cuts Barbershop",
    service: "Haircut + Beard Trim",
    date: "Today, 2:00 PM",
    stylist: "John Mensah",
    image: "https://images.unsplash.com/photo-1585747860715-2d3b4c7e3a23?w=100&h=100&fit=crop"
  },
  {
    id: 2,
    salon: "Glamour Beauty Studio",
    service: "Hair Coloring",
    date: "Tomorrow, 10:00 AM",
    stylist: "Akosua Adu",
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=100&h=100&fit=crop"
  }
]

const nearbySalons = [
  {
    id: 1,
    name: "Elite Cuts Barbershop",
    rating: 4.8,
    reviews: 124,
    distance: "0.5 km",
    services: ["Haircut", "Beard Trim", "Shave"],
    image: "https://images.unsplash.com/photo-1585747860715-2d3b4c7e3a23?w=300&h=200&fit=crop"
  },
  {
    id: 2,
    name: "Glamour Beauty Studio",
    rating: 4.9,
    reviews: 89,
    distance: "1.2 km",
    services: ["Hair Coloring", "Styling", "Treatment"],
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&h=200&fit=crop"
  },
  {
    id: 3,
    name: "Royal Touch Salon",
    rating: 4.7,
    reviews: 156,
    distance: "1.8 km",
    services: ["Braids", "Weaves", "Natural Hair"],
    image: "https://images.unsplash.com/photo-1522337360788-8b13ee0af107?w=300&h=200&fit=crop"
  }
]

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back! 👋</h1>
        <p className="text-gray-600 mt-1">Ready to book your next appointment?</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Upcoming Bookings</p>
              <p className="text-2xl font-bold text-gray-900">2</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Visits</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Money Saved</p>
              <p className="text-2xl font-bold text-gray-900">GH₵ 150</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Bookings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Appointments</h2>
          <a href="/bookings" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            View all
          </a>
        </div>
        <div className="space-y-4">
          {upcomingBookings.map((booking) => (
            <div key={booking.id} className="card flex items-center gap-4">
              <img
                src={booking.image}
                alt={booking.salon}
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{booking.salon}</h3>
                <p className="text-sm text-gray-600">{booking.service}</p>
                <p className="text-sm text-primary-600 font-medium">{booking.date}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          ))}
        </div>
      </div>

      {/* Nearby Salons */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Nearby Salons</h2>
          <a href="/explore" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            Explore all
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {nearbySalons.map((salon) => (
            <div key={salon.id} className="card hover:shadow-md transition-shadow cursor-pointer">
              <img
                src={salon.image}
                alt={salon.name}
                className="w-full h-32 object-cover rounded-lg mb-4"
              />
              <h3 className="font-semibold text-gray-900">{salon.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-sm font-medium">{salon.rating}</span>
                <span className="text-sm text-gray-500">({salon.reviews} reviews)</span>
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                <MapPin className="w-4 h-4" />
                <span>{salon.distance}</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-3">
                {salon.services.slice(0, 2).map((service, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    {service}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
