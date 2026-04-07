import { useState } from 'react'
import { 
  Search, 
  MapPin, 
  Star, 
  Filter,
  Grid,
  List
} from 'lucide-react'

// Mock data
const salons = [
  {
    id: 1,
    name: "Elite Cuts Barbershop",
    rating: 4.8,
    reviews: 124,
    distance: "0.5 km",
    address: "Osu, Oxford Street",
    services: ["Haircut", "Beard Trim", "Shave", "Hair Treatment"],
    priceRange: "GH₵₵",
    openNow: true,
    image: "https://images.unsplash.com/photo-1585747860715-2d3b4c7e3a23?w=400&h=300&fit=crop"
  },
  {
    id: 2,
    name: "Glamour Beauty Studio",
    rating: 4.9,
    reviews: 89,
    distance: "1.2 km",
    address: "Cantonments, 5th Avenue",
    services: ["Hair Coloring", "Styling", "Treatment", "Blowout"],
    priceRange: "GH₵₵₵",
    openNow: true,
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop"
  },
  {
    id: 3,
    name: "Royal Touch Salon",
    rating: 4.7,
    reviews: 156,
    distance: "1.8 km",
    address: "East Legon, Boundary Road",
    services: ["Braids", "Weaves", "Natural Hair", "Haircuts"],
    priceRange: "GH₵₵",
    openNow: false,
    image: "https://images.unsplash.com/photo-1522337360788-8b13ee0af107?w=400&h=300&fit=crop"
  },
  {
    id: 4,
    name: "Dapper Gents",
    rating: 4.6,
    reviews: 98,
    distance: "2.1 km",
    address: "Airport Residential, 3rd Link",
    services: ["Haircut", "Beard", "Hot Towel Shave"],
    priceRange: "GH₵₵",
    openNow: true,
    image: "https://images.unsplash.com/photo-1503951914875-452162b0203d?w=400&h=300&fit=crop"
  },
  {
    id: 5,
    name: "Nubian Queen Braids",
    rating: 4.9,
    reviews: 203,
    distance: "2.5 km",
    address: "Labone, Nii Amon Kotey Street",
    services: ["Braids", "Twists", "Locs", "Cornrows"],
    priceRange: "GH₵₵",
    openNow: true,
    image: "https://images.unsplash.com/photo-1522337094846-eb1d1a0f3d36?w=400&h=300&fit=crop"
  },
  {
    id: 6,
    name: "Sharp Edges",
    rating: 4.5,
    reviews: 67,
    distance: "3.0 km",
    address: "Dzorwulu, Nii Kwao Street",
    services: ["Fades", "Line Up", "Beard Trim"],
    priceRange: "GH₵",
    openNow: true,
    image: "https://images.unsplash.com/photo-1621605819733-3a1e4f66c5a2?w=400&h=300&fit=crop"
  }
]

const categories = ["All", "Barbershop", "Hair Salon", "Nail Studio", "Spa", "Makeup"]

export default function Explore() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Explore Salons</h1>
        <p className="text-gray-600 mt-1">Discover the best salons near you</p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search salons, services, or locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('grid')} className={'p-2 ' + (viewMode === 'grid' ? 'bg-primary-50 text-primary-600' : 'text-gray-500 hover:bg-gray-50')}>
              <Grid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('list')} className={'p-2 ' + (viewMode === 'list' ? 'bg-primary-50 text-primary-600' : 'text-gray-500 hover:bg-gray-50')}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={'px-4 py-2 rounded-full whitespace-nowrap ' + (selectedCategory === category ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50')}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Salons Grid/List */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
        {salons.map((salon) => (
          <div key={salon.id} className={'bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer ' + (viewMode === 'list' ? 'flex' : '')}>
            <img src={salon.image} alt={salon.name} className={viewMode === 'grid' ? 'w-full h-48 object-cover' : 'w-48 h-full object-cover'} />
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{salon.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-medium">{salon.rating}</span>
                    <span className="text-sm text-gray-500">({salon.reviews})</span>
                    <span className="text-sm text-gray-400">• {salon.priceRange}</span>
                  </div>
                </div>
                <span className={'px-2 py-1 text-xs font-medium rounded ' + (salon.openNow ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>
                  {salon.openNow ? 'Open' : 'Closed'}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                <MapPin className="w-4 h-4" />
                <span>{salon.address}</span>
                <span className="mx-1">•</span>
                <span>{salon.distance}</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-3">
                {salon.services.slice(0, 3).map((service, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{service}</span>
                ))}
                {salon.services.length > 3 && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">+{salon.services.length - 3} more</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
