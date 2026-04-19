import { useState } from 'react'
import Icon from './Icon'
import { api } from '../lib/api'
import { useSalon } from '../store/SalonContext'

interface AddStaffModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddStaffModal({ isOpen, onClose, onSuccess }: AddStaffModalProps) {
  const { salonId } = useSalon()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    specialties: '',
    bio: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!salonId) {
      setError('Salon ID not found. Please try again.')
      return
    }

    if (!formData.fullName.trim()) {
      setError('Full name is required')
      return
    }

    if (!formData.phoneNumber.trim()) {
      setError('Phone number is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const specialtiesArray = formData.specialties
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)

      const payload = {
        fullName: formData.fullName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        email: formData.email.trim() || undefined,
        specialties: specialtiesArray.length > 0 ? specialtiesArray : undefined,
        bio: formData.bio.trim() || undefined,
      }

      const response = await api.createWorker(salonId, payload)
      
      if (response.success) {
        setFormData({
          fullName: '',
          phoneNumber: '',
          email: '',
          specialties: '',
          bio: '',
        })
        onSuccess()
        onClose()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add staff member'
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
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-elevated w-full max-w-md h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-y-auto animate-slide-up sm:animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-ghana-green/10 rounded-lg flex items-center justify-center">
              <Icon name="person_add" size={20} className="text-ghana-green" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Add Staff Member</h2>
          </div>
          <button
            onClick={onClose}
            className="btn-ripple p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
              <Icon name="error" size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter full name"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ghana-green/30 focus:border-ghana-green transition-all duration-200 bg-gray-50/50 focus:bg-white"
              required
            />
          </div>

          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1.5">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="e.g., +233 20 123 4567"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ghana-green/30 focus:border-ghana-green transition-all duration-200 bg-gray-50/50 focus:bg-white"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="email@example.com"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ghana-green/30 focus:border-ghana-green transition-all duration-200 bg-gray-50/50 focus:bg-white"
            />
          </div>

          <div>
            <label htmlFor="specialties" className="block text-sm font-medium text-gray-700 mb-1.5">
              Specialties <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <input
              type="text"
              id="specialties"
              name="specialties"
              value={formData.specialties}
              onChange={handleChange}
              placeholder="e.g., Haircuts, Braiding, Coloring (comma-separated)"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ghana-green/30 focus:border-ghana-green transition-all duration-200 bg-gray-50/50 focus:bg-white"
            />
            <p className="text-xs text-gray-400 mt-1.5">Separate multiple specialties with commas</p>
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1.5">
              Bio <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="A brief description of the staff member..."
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ghana-green/30 focus:border-ghana-green transition-all duration-200 bg-gray-50/50 focus:bg-white resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-ripple flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-ripple flex-1 px-4 py-2.5 bg-ghana-green text-white rounded-xl hover:bg-ghana-green/90 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              {loading ? (
                <>
                  <Icon name="progress_activity" size={16} className="animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Staff Member'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
