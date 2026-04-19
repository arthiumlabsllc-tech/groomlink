import { useState, useEffect } from 'react'
import Icon from '../components/Icon'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { api, Service } from '../lib/api'
import { useSalon } from '../store/SalonContext'
import ServiceModal from '../components/ServiceModal'
import DeleteServiceModal from '../components/DeleteServiceModal'

const categories = ['All', 'Haircut', 'Braiding', 'Styling', 'Coloring', 'Treatment', 'Beard']

function ServiceSkeleton() {
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="card-v2 p-4 sm:p-6">
          <div className="flex items-start justify-between mb-4 gap-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 skeleton-shimmer rounded-xl"></div>
            <div className="w-20 h-6 skeleton-shimmer rounded-full"></div>
          </div>
          <div className="w-3/4 h-5 skeleton-shimmer rounded mb-2"></div>
          <div className="w-full h-4 skeleton-shimmer rounded mb-1"></div>
          <div className="w-2/3 h-4 skeleton-shimmer rounded mb-4"></div>
          <div className="flex gap-4 mb-4">
            <div className="w-20 h-4 skeleton-shimmer rounded"></div>
            <div className="w-16 h-4 skeleton-shimmer rounded"></div>
          </div>
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <div className="w-24 h-7 skeleton-shimmer rounded"></div>
            <div className="flex gap-2">
              <div className="w-8 h-8 skeleton-shimmer rounded-lg"></div>
              <div className="w-8 h-8 skeleton-shimmer rounded-lg"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Services() {
  const { salonId, loading: salonLoading, hasSalon } = useSalon()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [deletingService, setDeletingService] = useState<Service | null>(null)

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

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    if (isNaN(numPrice)) return '0.00'
    return numPrice.toFixed(2)
  }

  const getDiscountPercent = (price: string | number, discount: string | number) => {
    const p = typeof price === 'string' ? parseFloat(price) : price
    const d = typeof discount === 'string' ? parseFloat(discount) : discount
    if (isNaN(p) || isNaN(d) || p <= 0) return 0
    return Math.round(((p - d) / p) * 100)
  }

  return (
    <Layout activeTab="services">
      <div className="page-enter">
      {/* No Salon Setup Warning */}
      {hasSalon === false && !loading && (
        <div className="card-v2 text-center py-12 mb-6">
          <div className="w-20 h-20 bg-ghana-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="store" size={40} className="text-ghana-gold" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Set up your salon first</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            You need to create your salon profile before you can add services.
          </p>
          <Link 
            to="/settings" 
            className="btn-primary btn-ripple inline-flex items-center gap-2"
          >
            Create Salon Profile
            <Icon name="arrow_forward" size={20} />
          </Link>
        </div>
      )}

      {/* Normal Services UI - only show if hasSalon is true */}
      {(hasSalon === true || hasSalon === null) && (
        <>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-500 text-sm sm:text-base">Manage your service offerings</p>
        </div>
        <button 
          onClick={() => {
            setEditingService(null)
            setShowAddModal(true)
          }}
          className="btn-primary btn-ripple flex items-center justify-center gap-2 w-full sm:w-auto min-h-[44px]"
        >
          <Icon name="add" size={20} />
          Add Service
        </button>
      </div>

      {/* Category Filter - Scrollable on mobile */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`tab-pill whitespace-nowrap flex-shrink-0 min-h-[44px] ${
              activeCategory === category
                ? 'tab-pill-active'
                : 'tab-pill-inactive'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {loading ? (
        <ServiceSkeleton />
      ) : filteredServices.length > 0 ? (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => (
            <div key={service.id} className="card-v2 p-4 sm:p-6 group">
              <div className="flex items-start justify-between mb-4 gap-2">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-ghana-green/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-ghana-green/15 transition-colors">
                  <Icon name="content_cut" size={24} className="text-ghana-green" />
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getCategoryColor(service.category)}`}>
                  {service.category || 'General'}
                </span>
              </div>

              <h3 className="font-semibold text-gray-900 text-lg mb-2">{service.name}</h3>
              {service.description && (
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{service.description}</p>
              )}

              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Icon name="schedule" size={16} className="text-gray-400" />
                  <span>{service.duration} mins</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <span className={`w-2 h-2 rounded-full ${service.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                  <span className={service.isActive ? 'text-green-600' : 'text-gray-500'}>
                    {service.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Price Display with Discount */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Price</span>
                  {service.discountPrice && parseFloat(service.discountPrice) > 0 ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-gray-400 line-through">GH₵ {formatPrice(service.price)}</span>
                      <span className="text-2xl font-bold text-ghana-green">GH₵ {formatPrice(service.discountPrice)}</span>
                      <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs font-bold rounded-full flex items-center gap-1">
                        -{getDiscountPercent(service.price, service.discountPrice)}%
                      </span>
                      {service.promoLabel && (
                        <span className="px-2 py-0.5 bg-ghana-gold/20 text-amber-700 text-xs font-medium rounded-full flex items-center gap-1">
                          <Icon name="percent" size={14} />
                          {service.promoLabel}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-2xl font-bold text-ghana-green">GH₵ {formatPrice(service.price)}</div>
                  )}
                </div>
                
                {/* Edit/Delete Buttons */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingService(service)}
                    className="btn-ripple p-2 text-gray-400 hover:text-ghana-green hover:bg-ghana-green/10 rounded-lg transition-colors"
                    title="Edit service"
                  >
                    <Icon name="edit" size={20} />
                  </button>
                  <button
                    onClick={() => setDeletingService(service)}
                    className="btn-ripple p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete service"
                  >
                    <Icon name="delete" size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-v2 text-center py-16">
          <div className="w-20 h-20 bg-ghana-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="content_cut" size={40} className="text-ghana-gold" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No services listed</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            Add your first service to start accepting bookings from customers.
          </p>
          <button 
            onClick={() => {
              setEditingService(null)
              setShowAddModal(true)
            }}
            className="btn-primary btn-ripple flex items-center justify-center gap-2 mx-auto"
          >
            <Icon name="add" size={20} />
            Add Your First Service
          </button>
        </div>
      )}
        </>
      )}

      {/* Service Modal (Add/Edit) */}
      <ServiceModal 
        isOpen={showAddModal || editingService !== null}
        onClose={() => {
          setShowAddModal(false)
          setEditingService(null)
        }}
        onSuccess={fetchServices}
        service={editingService}
      />

      {/* Delete Confirmation Modal */}
      <DeleteServiceModal 
        isOpen={deletingService !== null}
        onClose={() => setDeletingService(null)}
        onSuccess={fetchServices}
        service={deletingService}
      />
      </div>
    </Layout>
  )
}
