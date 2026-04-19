import { useState } from 'react'
import Icon from './Icon'
import { api, Service } from '../lib/api'
import { useSalon } from '../store/SalonContext'

interface DeleteServiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  service: Service | null
}

export default function DeleteServiceModal({ isOpen, onClose, onSuccess, service }: DeleteServiceModalProps) {
  const { salonId } = useSalon()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!salonId || !service) {
      setError('Service not found. Please try again.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await api.deleteService(salonId, service.id)
      onSuccess()
      onClose()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete service'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !service) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-elevated w-full max-w-sm animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
              <Icon name="warning" size={20} className="text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Delete Service</h2>
          </div>
          <button
            onClick={onClose}
            className="btn-ripple p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-center justify-center w-14 h-14 mx-auto mb-4 bg-red-50 rounded-full ring-4 ring-red-50">
            <Icon name="delete" size={28} className="text-red-500" />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
              <Icon name="error" size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <p className="text-center text-gray-600 mb-2">
            Are you sure you want to delete this service?
          </p>
          <div className="bg-gray-50 rounded-xl p-3 mb-4">
            <p className="text-center text-gray-900 font-semibold mb-1">
              {service.name}
            </p>
            <p className="text-center text-gray-500 text-sm">
              {service.category} • {service.duration} mins • GHS {service.price}
            </p>
          </div>

          <p className="text-center text-sm text-gray-400 mb-6">
            This action cannot be undone. The service will be deactivated and won't appear in your listings.
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-ripple flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="btn-ripple flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              {loading ? (
                <>
                  <Icon name="progress_activity" size={16} className="animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Icon name="delete" size={16} />
                  Delete Service
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
