import { useState } from 'react'
import { X, Loader2, AlertTriangle } from 'lucide-react'
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
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Delete Service</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <p className="text-center text-gray-600 mb-2">
            Are you sure you want to delete this service?
          </p>
          <p className="text-center text-gray-900 font-semibold mb-1">
            {service.name}
          </p>
          <p className="text-center text-gray-500 text-sm mb-6">
            Category: {service.category} • {service.duration} mins • GHS {service.price}
          </p>

          <p className="text-center text-sm text-gray-500 mb-6">
            This action cannot be undone. The service will be deactivated and won't appear in your listings.
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Service'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
