import { useState } from 'react'
import { Calendar, Clock, MapPin, ChevronRight, X, Star } from 'lucide-react'

type Tab = 'upcoming' | 'past' | 'cancelled'

const bookings = {
  upcoming: [
    {
      id: 1, salon: "Elite Cuts Barbershop", service: "Haircut + Beard Trim", date: "April 8, 2026",
      time: "2:00 PM", stylist: "John Mensah", price: "GH₵ 80", status: "confirmed",
      image: "https://images.unsplash.com/photo-1585747860715-2d3b4c7e3a23?w=100&h=100&fit=crop", address: "Osu, Oxford Street"
    },
    {
      id: 2, salon: "Glamour Beauty Studio", service: "Hair Coloring", date: "April 9, 2026",
      time: "10:00 AM", stylist: "Akosua Adu", price: "GH₵ 250", status: "pending",
      image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=100&h=100&fit=crop", address: "Cantonments, 5th Avenue"
    }
  ],
  past: [
    {
      id: 3, salon: "Royal Touch Salon", service: "Braids", date: "April 1, 2026",
      time: "11:00 AM", stylist: "Ama Serwaa", price: "GH₵ 150", status: "completed",
      image: "https://images.unsplash.com/photo-1522337360788-8b13ee0af107?w=100&h=100&fit=crop", address: "East Legon, Boundary Road", reviewed: true
    }
  ],
  cancelled: []
}

export default function Bookings() {
  const [activeTab, setActiveTab] = useState<Tab>('upcoming')
  const [selectedBooking, setSelectedBooking] = useState<typeof bookings.upcoming[0] | null>(null)

  const tabs = [
    { key: 'upcoming' as Tab, label: 'Upcoming', count: bookings.upcoming.length },
    { key: 'past' as Tab, label: 'Past', count: bookings.past.length },
    { key: 'cancelled' as Tab, label: 'Cancelled', count: bookings.cancelled.length },
  ]

  const currentBookings = bookings[activeTab]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
        <p className="text-gray-600 mt-1">Manage your appointments</p>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={'pb-3 px-1 border-b-2 font-medium text-sm transition-colors ' + (activeTab === tab.key ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
            {tab.label}
            <span className={'ml-2 px-2 py-0.5 rounded-full text-xs ' + (activeTab === tab.key ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600')}>{tab.count}</span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {currentBookings.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No {activeTab} bookings</p>
          </div>
        ) : (
          currentBookings.map((booking) => (
            <div key={booking.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedBooking(booking)}>
              <div className="flex items-start gap-4">
                <img src={booking.image} alt={booking.salon} className="w-16 h-16 rounded-lg object-cover" />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{booking.salon}</h3>
                      <p className="text-sm text-gray-600">{booking.service}</p>
                    </div>
                    <span className={'px-2 py-1 text-xs font-medium rounded capitalize ' + (booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700')}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /><span>{booking.date}</span></div>
                    <div className="flex items-center gap-1"><Clock className="w-4 h-4" /><span>{booking.time}</span></div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="font-semibold text-gray-900">{booking.price}</span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Booking Details</h2>
                <button onClick={() => setSelectedBooking(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <img src={selectedBooking.image} alt={selectedBooking.salon} className="w-full h-40 object-cover rounded-lg mb-4" />
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedBooking.salon}</h3>
                  <div className="flex items-center gap-1 mt-1 text-sm text-gray-500"><MapPin className="w-4 h-4" /><span>{selectedBooking.address}</span></div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between"><span className="text-gray-600">Service</span><span className="font-medium">{selectedBooking.service}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Stylist</span><span className="font-medium">{selectedBooking.stylist}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Date</span><span className="font-medium">{selectedBooking.date}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Time</span><span className="font-medium">{selectedBooking.time}</span></div>
                  <div className="flex justify-between pt-2 border-t border-gray-200"><span className="text-gray-600">Total</span><span className="font-bold text-lg">{selectedBooking.price}</span></div>
                </div>
                {activeTab === 'upcoming' && (
                  <div className="flex gap-3">
                    <button className="flex-1 btn-secondary">Reschedule</button>
                    <button className="flex-1 btn-primary bg-red-500 hover:bg-red-600">Cancel</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
