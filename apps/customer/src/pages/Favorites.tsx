import { useState } from 'react'
import { Heart, MapPin, Star, Calendar } from 'lucide-react'

const favoritesData = [
  {
    id: 1, name: "Elite Cuts Barbershop", rating: 4.8, reviews: 124, distance: "0.5 km",
    address: "Osu, Oxford Street", services: ["Haircut", "Beard Trim", "Shave"],
    openNow: true, lastVisited: "March 25, 2026",
    image: "https://images.unsplash.com/photo-1585747860715-2d3b4c7e3a23?w=400&h=300&fit=crop"
  },
  {
    id: 2, name: "Glamour Beauty Studio", rating: 4.9, reviews: 89, distance: "1.2 km",
    address: "Cantonments, 5th Avenue", services: ["Hair Coloring", "Styling", "Treatment"],
    openNow: true, lastVisited: "Never",
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop"
  }
]

export default function Favorites() {
  const [favoritesList, setFavoritesList] = useState(favoritesData)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Favorites</h1>
        <p className="text-gray-600 mt-1">Your saved salons and barbershops</p>
      </div>

      {favoritesList.length === 0 ? (
        <div className="text-center py-12">
          <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No favorites yet</h3>
          <p className="text-gray-500">Start exploring and save your favorite salons!</p>
          <a href="/explore" className="inline-block mt-4 btn-primary">Explore Salons</a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoritesList.map((salon) => (
            <div key={salon.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative">
                <img src={salon.image} alt={salon.name} className="w-full h-48 object-cover" />
                <button onClick={() => setFavoritesList(favoritesList.filter(item => item.id !== salon.id))} className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors">
                  <Heart className="w-5 h-5 text-red-500 fill-current" />
                </button>
                <span className={'absolute bottom-3 left-3 px-2 py-1 text-xs font-medium rounded ' + (salon.openNow ? 'bg-green-500 text-white' : 'bg-gray-500 text-white')}>
                  {salon.openNow ? 'Open Now' : 'Closed'}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900">{salon.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-medium">{salon.rating}</span>
                  <span className="text-sm text-gray-500">({salon.reviews} reviews)</span>
                </div>
                <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                  <MapPin className="w-4 h-4" /><span>{salon.address}</span><span className="mx-1">•</span><span>{salon.distance}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-3">
                  {salon.services.slice(0, 2).map((service, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{service}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <div className="text-sm text-gray-500"><Calendar className="w-4 h-4 inline mr-1" />Last: {salon.lastVisited}</div>
                  <button className="btn-primary text-sm py-1 px-3">Book Now</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
