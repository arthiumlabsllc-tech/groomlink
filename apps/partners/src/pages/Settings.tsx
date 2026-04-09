import { useState, useEffect } from 'react'
import { Save, Store, Clock, Phone, Mail, MapPin, Globe, Instagram, Facebook } from 'lucide-react'
import Layout from '../components/Layout'
import { api, Salon } from '../lib/api'

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function Settings() {
  const [salon, setSalon] = useState<Salon | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [formData, setFormData] = useState({
    businessName: '',
    description: '',
    address: '',
    city: '',
    region: '',
    phoneNumber: '',
    email: '',
    instagram: '',
    facebook: '',
    businessHours: daysOfWeek.map(day => ({ day, open: '09:00', close: '18:00', isOpen: true }))
  })

  useEffect(() => {
    const fetchSalon = async () => {
      try {
        const response = await api.getMySalon()
        if (response.success) {
          setSalon(response.data)
          setFormData(prev => ({
            ...prev,
            businessName: response.data.businessName || '',
            description: response.data.description || '',
            address: response.data.address || '',
            city: response.data.city || '',
            region: response.data.region || '',
            phoneNumber: response.data.phoneNumber || '',
            email: response.data.email || '',
          }))
        }
      } catch (error) {
        console.error('Failed to fetch salon:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchSalon()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    
    // Simulate save delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const updateBusinessHour = (index: number, field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      businessHours: prev.businessHours.map((hour, i) => 
        i === index ? { ...hour, [field]: value } : hour
      )
    }))
  }

  if (loading) {
    return (
      <Layout activeTab="settings">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-ghana-green border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading settings...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout activeTab="settings">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Salon profile and preferences</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Salon Profile Section */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-ghana-green/10 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-ghana-green" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Salon Profile</h2>
              <p className="text-sm text-gray-500">Basic information about your salon</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Salon Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g., Kofi's Barbershop"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="input-field min-h-[100px] resize-none"
                placeholder="Tell customers about your salon..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  className="input-field pl-10"
                  placeholder="Street address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g., Accra"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g., Greater Accra"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Business Hours Section */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-ghana-gold/10 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Business Hours</h2>
              <p className="text-sm text-gray-500">Set your opening and closing times</p>
            </div>
          </div>

          <div className="space-y-3">
            {formData.businessHours.map((hour, index) => (
              <div key={hour.day} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="w-28">
                  <span className="font-medium text-gray-700">{hour.day}</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hour.isOpen}
                    onChange={(e) => updateBusinessHour(index, 'isOpen', e.target.checked)}
                    className="w-4 h-4 text-ghana-green rounded border-gray-300 focus:ring-ghana-green"
                  />
                  <span className="text-sm text-gray-600">Open</span>
                </label>
                {hour.isOpen && (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={hour.open}
                      onChange={(e) => updateBusinessHour(index, 'open', e.target.value)}
                      className="input-field py-1.5 px-2 text-sm w-28"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="time"
                      value={hour.close}
                      onChange={(e) => updateBusinessHour(index, 'close', e.target.value)}
                      className="input-field py-1.5 px-2 text-sm w-28"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Information Section */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Phone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Contact Information</h2>
              <p className="text-sm text-gray-500">How customers can reach you</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  className="input-field pl-10"
                  placeholder="+233 XX XXX XXXX"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  className="input-field pl-10"
                  placeholder="salon@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
              <div className="relative">
                <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  className="input-field pl-10"
                  placeholder="@your.salon"
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
              <div className="relative">
                <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  className="input-field pl-10"
                  placeholder="facebook.com/yoursalon"
                  value={formData.facebook}
                  onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-4">
          {saved && (
            <span className="text-green-600 font-medium">Settings saved successfully!</span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </Layout>
  )
}
