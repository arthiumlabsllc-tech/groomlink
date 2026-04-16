import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { api, Service } from '../lib/api'
import { useSalon } from '../store/SalonContext'

interface ServiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  service?: Service | null // If provided, we're editing
}

const serviceCategories = [
  'Haircut',
  'Braiding', 
  'Styling',
  'Coloring',
  'Treatment',
  'Beard',
]

export default function ServiceModal({ isOpen, onClose, onSuccess, service }: ServiceModalProps) {
  const { salonId } = useSalon()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    duration: '',
    price: '',
    discountPrice: '',
    promoLabel: '',
    description: '',
  })

  const isEditMode = !!service

  // Populate form when editing
  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        category: service.category,
        duration: service.duration.toString(),
        price: service.price,
        discountPrice: service.discountPrice || '',
        promoLabel: service.promoLabel || '',
        description: service.description || '',
      })
    } else {
      // Reset form for add mode
      setFormData({
        name: '',
        category: '',
        duration: '',
        price: '',
        discountPrice: '',
        promoLabel: '',
        description: '',
      })
    }
    setError(null)
  }, [service, isOpen])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!salonId) {
      setError('Salon ID not found. Please try again.')
      return
    }

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setError('Service name must be at least 2 characters')
      return
    }

    if (!formData.category) {
      setError('Please select a category')
      return
    }

    const durationNum = parseInt(formData.duration, 10)
    if (isNaN(durationNum) || durationNum < 5) {
      setError('Duration must be at least 5 minutes')
      return
    }

    const priceNum = parseFloat(formData.price)
    if (isNaN(priceNum) || priceNum < 0) {
      setError('Please enter a valid price')
      return
    }

    // Validate discount price if provided
    let discountPriceNum: number | null = null
    if (formData.discountPrice.trim()) {
      discountPriceNum = parseFloat(formData.discountPrice)
      if (isNaN(discountPriceNum) || discountPriceNum < 0) {
        setError('Please enter a valid discount price')
        return
      }
      if (discountPriceNum >= priceNum) {
        setError('Discount price must be less than the regular price')
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        duration: durationNum,
        price: priceNum,
        discountPrice: discountPriceNum,
        promoLabel: formData.promoLabel.trim() || null,
        description: formData.description.trim() || undefined,
      }

      if (isEditMode && service) {
        await api.updateService(salonId, service.id, payload)
      } else {
        await api.createService(salonId, payload)
      }
      
      onSuccess()
      onClose()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${isEditMode ? 'update' : 'add'} service`
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-none sm:rounded-2xl shadow-xl w-full max-w-md h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditMode ? 'Edit Service' : 'Add Service'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Service Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Classic Haircut"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-ghana-green transition-colors"
              required
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-ghana-green transition-colors bg-white"
              required
            >
              <option value="">Select a category</option>
              {serviceCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                Duration (mins) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="duration"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                placeholder="30"
                min="5"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-ghana-green transition-colors"
                required
              />
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                Price (GHS) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="50.00"
                min="0"
                step="0.01"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-ghana-green transition-colors"
                required
              />
            </div>
          </div>

          {/* Discount Section */}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-3">Discount / Promo (Optional)</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="discountPrice" className="block text-sm text-gray-600 mb-1">
                  Discount Price (GHS)
                </label>
                <input
                  type="number"
                  id="discountPrice"
                  name="discountPrice"
                  value={formData.discountPrice}
                  onChange={handleChange}
                  placeholder="40.00"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-ghana-green transition-colors"
                />
              </div>

              <div>
                <label htmlFor="promoLabel" className="block text-sm text-gray-600 mb-1">
                  Promo Label
                </label>
                <input
                  type="text"
                  id="promoLabel"
                  name="promoLabel"
                  value={formData.promoLabel}
                  onChange={handleChange}
                  placeholder="e.g., 20% OFF"
                  maxLength={50}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-ghana-green transition-colors"
                />
              </div>
            </div>
            {formData.discountPrice && formData.price && (
              <p className="text-xs text-gray-500 mt-2">
                {parseFloat(formData.discountPrice) < parseFloat(formData.price) 
                  ? `Customers save GHS ${(parseFloat(formData.price) - parseFloat(formData.discountPrice)).toFixed(2)}`
                  : 'Discount must be less than regular price'}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the service..."
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-ghana-green transition-colors resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-ghana-green text-white rounded-lg hover:bg-ghana-green/90 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isEditMode ? 'Saving...' : 'Adding...'}
                </>
              ) : (
                isEditMode ? 'Save Changes' : 'Add Service'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
