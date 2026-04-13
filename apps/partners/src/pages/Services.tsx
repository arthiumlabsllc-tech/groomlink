import { useState, useEffect } from 'react'
import { Scissors, Plus, Clock, Tag, Store, ArrowRightCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { api, Service } from '../lib/api'
import { useSalon } from '../store/SalonContext'
import AddServiceModal from '../components/AddServiceModal'

const categories = ['All', 'Haircut', 'Braiding', 'Styling', 'Coloring', 'Treatment', 'Beard']

export default function Services() {
  const { salonId, loading: salonLoading, hasSalon } = useSalon()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')
  const [showAddModal, setShowAddModal] = useState(false)

  const fetchServices = async () => {
    if (!salonId) return
    try {
      setLoading(true)
      const response = await api.getServices(salonId)
      if (response.success && response.data) {
        setServices(Array.isArray(response.data) ? response.data : [])
      } else {
        setServices([])
      }
    } catch (error) {
      console.error('Failed to fetch services:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchServices()
  }, [salonId])

  const filteredServices = activeCategory === 'All' 
    ? (services || []) 
    : (services || []).filter(s => s.category?.toLowerCase() === activeCategory.toLowerCase())

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'haircut': 'bg-blue-100 text-blue-700',
      'braiding': 'bg-purple-100 text-purple-700',
      'styling': 'bg-pink-100 text-pink-700',
      'coloring': 'bg-ghana-gold/20 text-amber-700',
      'treatment': 'bg-green-100 text-green-700',
      'beard': 'bg-gray-100 text-gray-700',
    }
    return colors[category?.toLowerCase()] || 'bg-gray-100 text-gray-700'
  }

  return (
    <Layout activeTab="services">
      {/* No Salon Setup Warning */}
      {hasSalon === false && !loading && (
        <div className="card text-center py-12 mb-6">
          <div className="w-20 h-20 bg-ghana-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Store className="w-10 h-10 text-ghana-gold" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Set up your salon first</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            You need to create your salon profile before you can add services.
          </p>
          <Link 
            to="/settings" 
            className="btn-primary inline-flex items-center gap-2"
          >
            Create Salon Profile
            <ArrowRightCircle className="w-5 h-5" />
          </Link>
        </div>
      )}

      {/* Normal Services UI - only show if hasSalon is true */}
      {(hasSalon === true || hasSalon === null) && (
        <>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-500">Manage your service offerings</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Service
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-4 py-2 rounded-full font-medium text-sm transition-all ${
              activeCategory === category
                ? 'bg-ghana-green text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-ghana-green border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading services...</p>
        </div>
      ) : filteredServices.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => (
            <div key={service.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-ghana-green/10 rounded-xl flex items-center justify-center">
                  <Scissors className="w-6 h-6 text-ghana-green" />
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(service.category)}`}>
                  {service.category || 'General'}
                </span>
              </div>

              <h3 className="font-semibold text-gray-900 text-lg mb-2">{service.name}</h3>
              {service.description && (
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{service.description}</p>
              )}

              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{service.duration} mins</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <Tag className="w-4 h-4 text-gray-400" />
                  <span className={service.isActive ? 'text-green-600' : 'text-gray-500'}>
                    {service.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-500">Price</span>
                <span className="text-2xl font-bold text-ghana-green">GH₵ {service.price}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-16">
          <div className="w-20 h-20 bg-ghana-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Scissors className="w-10 h-10 text-ghana-gold" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No services listed</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            Add your first service to start accepting bookings from customers.
          </p>
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center justify-center gap-2 mx-auto"
          >
            <Plus className="w-5 h-5" />
            Add Your First Service
          </button>
        </div>
      )}
        </>
      )}

      <AddServiceModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchServices}
      />
    </Layout>
  )
}
