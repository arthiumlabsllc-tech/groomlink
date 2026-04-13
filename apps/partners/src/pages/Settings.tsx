import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, Store, Clock, Phone, Mail, MapPin, Globe, Instagram, Facebook, ArrowRight, CheckCircle, Scissors, Users, Calendar, Image, Upload, X, Camera, Loader2 } from 'lucide-react'
import Layout from '../components/Layout'
import { api, Salon } from '../lib/api'
import { useSalon } from '../store/SalonContext'

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

interface BusinessHour {
  day: string
  open: string
  close: string
  isOpen: boolean
}

// Default business hours when salon has no operating hours data
const defaultBusinessHours: BusinessHour[] = daysOfWeek.map(day => ({ day, open: '09:00', close: '18:00', isOpen: day !== 'Sunday' }))

// Parse operating hours from salon data
const parseOperatingHours = (operatingHours: Record<string, string> | null | undefined): BusinessHour[] => {
  if (!operatingHours) return defaultBusinessHours
  
  return daysOfWeek.map(day => {
    const hours = operatingHours[day.toLowerCase()]
    if (!hours || hours.toLowerCase() === 'closed') {
      return { day, open: '09:00', close: '18:00', isOpen: false }
    }
    // Parse format like "09:00 - 18:00" or "09:00-18:00"
    const match = hours.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/)
    if (match) {
      return { day, open: match[1], close: match[2], isOpen: true }
    }
    return { day, open: '09:00', close: '18:00', isOpen: true }
  })
}

// Convert business hours back to API format
const formatOperatingHours = (businessHours: BusinessHour[]): Record<string, string> => {
  const result: Record<string, string> = {}
  businessHours.forEach(hour => {
    if (hour.isOpen) {
      result[hour.day.toLowerCase()] = `${hour.open} - ${hour.close}`
    } else {
      result[hour.day.toLowerCase()] = 'closed'
    }
  })
  return result
}

// Get working days array from business hours
const getWorkingDays = (businessHours: BusinessHour[]): string[] => {
  return businessHours.filter(h => h.isOpen).map(h => h.day.toUpperCase())
}

// Get opening/closing time from business hours (use first open day's times)
const getOpeningTime = (businessHours: BusinessHour[]): string => {
  const openDay = businessHours.find(h => h.isOpen)
  return openDay?.open || '09:00'
}

const getClosingTime = (businessHours: BusinessHour[]): string => {
  const openDay = businessHours.find(h => h.isOpen)
  return openDay?.close || '18:00'
}

export default function Settings() {
  const navigate = useNavigate()
  const { salon: contextSalon, refetch, hasSalon, user } = useSalon()
  const [salon, setSalon] = useState<Salon | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isNewPartner, setIsNewPartner] = useState(false)

  const [formData, setFormData] = useState({
    businessName: '',
    description: '',
    type: 'BARBERSHOP',
    address: '',
    city: '',
    region: '',
    phoneNumber: '',
    email: '',
    instagram: '',
    facebook: '',
    businessHours: defaultBusinessHours
  })

  // Image upload state
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [galleryFiles, setGalleryFiles] = useState<File[]>([])
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([])
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [deletingImage, setDeletingImage] = useState<string | null>(null)

  const logoInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchSalon = async () => {
      try {
        // Check if we already know from context that there's no salon
        if (hasSalon === false) {
          console.log('Settings: No salon detected, showing creation form')
          setIsNewPartner(true)
          setLoading(false)
          // Pre-fill email from user context if available (new partner flow)
          if (user?.email) {
            setFormData(prev => ({ ...prev, email: user.email }))
          }
          return
        }

        const response = await api.getMySalon()
        if (response.success && response.data) {
          const salonData = response.data
          setSalon(salonData)
          setIsNewPartner(false)
          // Parse operating hours from salon data if available
          const parsedHours = parseOperatingHours(salonData.operatingHours)
          setFormData(prev => ({
            ...prev,
            businessName: salonData.businessName || '',
            description: salonData.description || '',
            type: salonData.type || 'BARBERSHOP',
            address: salonData.address || '',
            city: salonData.city || '',
            region: salonData.region || '',
            phoneNumber: salonData.phoneNumber || '',
            email: salonData.email || '',
            businessHours: parsedHours
          }))
        } else {
          // No salon found - this is a new partner
          setIsNewPartner(true)
          // Pre-fill email from user context if available
          if (user?.email) {
            setFormData(prev => ({ ...prev, email: user.email }))
          }
        }
      } catch (error) {
        console.error('Failed to fetch salon:', error)
        // If error indicates no salon, treat as new partner
        setIsNewPartner(true)
        // Pre-fill email from user context if available
        if (user?.email) {
          setFormData(prev => ({ ...prev, email: user.email }))
        }
      } finally {
        setLoading(false)
      }
    }
    fetchSalon()
  }, [hasSalon, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields for new partners
    if (isNewPartner) {
      if (!formData.businessName.trim()) {
        setError('Business name is required')
        return
      }
      if (!formData.address.trim()) {
        setError('Address is required')
        return
      }
      if (!formData.city.trim()) {
        setError('City is required')
        return
      }
      if (!formData.region.trim()) {
        setError('Region is required')
        return
      }
      if (!formData.phoneNumber.trim()) {
        setError('Phone number is required')
        return
      }
    }
    
    setSaving(true)
    setSaved(false)
    setError(null)
    
    try {
      if (isNewPartner) {
        // Create new salon for new partner
        const createData = {
          businessName: formData.businessName,
          description: formData.description,
          type: formData.type,
          address: formData.address,
          city: formData.city,
          region: formData.region,
          phoneNumber: formData.phoneNumber,
          email: formData.email || undefined,
          // Default coordinates - in a real app, you'd geocode the address
          latitude: 5.6037, // Default to Accra
          longitude: -0.1870,
          openingTime: getOpeningTime(formData.businessHours),
          closingTime: getClosingTime(formData.businessHours),
          workingDays: getWorkingDays(formData.businessHours)
        }
        
        const response = await api.createSalon(createData)
        
        if (response.success) {
          setSaved(true)
          setIsNewPartner(false)
          setSalon(response.data)
          // Refetch salon data to update context
          await refetch()
          // Redirect to dashboard after successful creation
          setTimeout(() => {
            navigate('/')
          }, 1500)
        } else {
          setError('Failed to create salon. Please try again.')
        }
      } else {
        // Update existing salon
        if (!salon?.id) {
          setError('No salon ID found. Please try again.')
          return
        }
        
        const updateData = {
          businessName: formData.businessName,
          description: formData.description,
          address: formData.address,
          city: formData.city,
          region: formData.region,
          phoneNumber: formData.phoneNumber,
          email: formData.email,
          operatingHours: formatOperatingHours(formData.businessHours)
        }
        
        const response = await api.updateSalon(salon.id, updateData)
        
        if (response.success) {
          setSaved(true)
          await refetch()
          setTimeout(() => setSaved(false), 3000)
        } else {
          setError('Failed to save settings. Please try again.')
        }
      }
    } catch (err: any) {
      console.error('Failed to save settings:', err)
      setError(err?.message || 'Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const updateBusinessHour = (index: number, field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      businessHours: prev.businessHours.map((hour, i) =>
        i === index ? { ...hour, [field]: value } : hour
      )
    }))
  }
  
  // Image upload handlers
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setError(null)
  }
  
  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
    setError(null)
  }
  
  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
      
    const currentImages = salon?.images?.length || 0
    const newPreviews = galleryPreviews.length
    const totalAfterUpload = currentImages + newPreviews + files.length
      
    if (totalAfterUpload > 10) {
      setError(`Maximum 10 gallery images allowed. You currently have ${currentImages} images.`)
      return
    }
      
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Each file must be less than 10MB')
        return
      }
    }
      
    setGalleryFiles(prev => [...prev, ...files])
    const previews = files.map(f => URL.createObjectURL(f))
    setGalleryPreviews(prev => [...prev, ...previews])
    setError(null)
  }
  
  const handleUploadLogo = async () => {
    if (!salon?.id || !logoFile) return
    setUploadingLogo(true)
    setError(null)
    try {
      const response = await api.uploadSalonLogo(salon.id, logoFile)
      if (response.success) {
        setLogoFile(null)
        setLogoPreview(null)
        await refetch()
      } else {
        setError('Failed to upload logo')
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to upload logo')
    } finally {
      setUploadingLogo(false)
    }
  }
  
  const handleUploadCover = async () => {
    if (!salon?.id || !coverFile) return
    setUploadingCover(true)
    setError(null)
    try {
      const response = await api.uploadSalonCover(salon.id, coverFile)
      if (response.success) {
        setCoverFile(null)
        setCoverPreview(null)
        await refetch()
      } else {
        setError('Failed to upload cover image')
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to upload cover image')
    } finally {
      setUploadingCover(false)
    }
  }
  
  const handleUploadGallery = async () => {
    if (!salon?.id || galleryFiles.length === 0) return
    setUploadingGallery(true)
    setError(null)
    try {
      const response = await api.uploadSalonGallery(salon.id, galleryFiles)
      if (response.success) {
        setGalleryFiles([])
        setGalleryPreviews([])
        await refetch()
      } else {
        setError('Failed to upload gallery images')
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to upload gallery images')
    } finally {
      setUploadingGallery(false)
    }
  }
  
  const handleDeleteGalleryImage = async (imageUrl: string) => {
    if (!salon?.id) return
    setDeletingImage(imageUrl)
    setError(null)
    try {
      const response = await api.deleteGalleryImage(salon.id, imageUrl)
      if (response.success) {
        await refetch()
      } else {
        setError('Failed to delete image')
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to delete image')
    } finally {
      setDeletingImage(null)
    }
  }
  
  const removePendingGalleryImage = (index: number) => {
    URL.revokeObjectURL(galleryPreviews[index])
    setGalleryPreviews(prev => prev.filter((_, i) => i !== index))
    setGalleryFiles(prev => prev.filter((_, i) => i !== index))
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
      {isNewPartner ? (
        // New Partner Setup View
        <div className="max-w-3xl mx-auto">
          {/* Welcome Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-ghana-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Store className="w-10 h-10 text-ghana-green" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to GroomLink Partners!</h1>
            <p className="text-gray-600 max-w-md mx-auto">
              Let's set up your salon profile so you can start accepting bookings and managing your business.
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-ghana-green text-white rounded-full flex items-center justify-center text-sm font-medium">1</div>
              <span className="text-sm font-medium text-gray-900">Create Salon</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-200"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium">2</div>
              <span className="text-sm text-gray-500">Add Services</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-200"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium">3</div>
              <span className="text-sm text-gray-500">Add Staff</span>
            </div>
          </div>

          {/* Setup Form */}
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-ghana-green/10 rounded-lg flex items-center justify-center">
                <Store className="w-5 h-5 text-ghana-green" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Create Your Salon</h2>
                <p className="text-sm text-gray-500">Fill in your business details below</p>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Business Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., Kofi's Barbershop"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  required
                />
              </div>

              {/* Salon Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salon Type <span className="text-red-500">*</span>
                </label>
                <select
                  className="input-field"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="BARBERSHOP">Barbershop</option>
                  <option value="HAIR_SALON">Hair Salon</option>
                  <option value="BEAUTY_SALON">Beauty Salon</option>
                  <option value="NAIL_SALON">Nail Salon</option>
                  <option value="SPA">Spa</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="input-field min-h-[100px] resize-none"
                  placeholder="Tell customers about your salon..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    className="input-field pl-10"
                    placeholder="Street address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* City & Region */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g., Accra"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Region <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g., Greater Accra"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    className="input-field pl-10"
                    placeholder="+233 XX XXX XXXX"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Email */}
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

              {/* Business Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Business Hours</label>
                <div className="space-y-2">
                  {formData.businessHours.map((hour, index) => (
                    <div key={hour.day} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="w-24">
                        <span className="font-medium text-gray-700 text-sm">{hour.day}</span>
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
                          <span className="text-gray-500 text-sm">to</span>
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

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-base"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating Salon...
                    </>
                  ) : saved ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Salon Created! Redirecting...
                    </>
                  ) : (
                    <>
                      Create Salon & Continue
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Tips */}
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="card p-4">
              <div className="w-10 h-10 bg-ghana-gold/10 rounded-lg flex items-center justify-center mb-3">
                <Store className="w-5 h-5 text-ghana-gold" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Step 1: Create Salon</h3>
              <p className="text-sm text-gray-600">Add your business name, location, and contact details.</p>
            </div>
            <div className="card p-4">
              <div className="w-10 h-10 bg-ghana-green/10 rounded-lg flex items-center justify-center mb-3">
                <Scissors className="w-5 h-5 text-ghana-green" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Step 2: Add Services</h3>
              <p className="text-sm text-gray-600">Define your services, prices, and duration.</p>
            </div>
            <div className="card p-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Step 3: Add Staff</h3>
              <p className="text-sm text-gray-600">Add your team members and their specialties.</p>
            </div>
          </div>
        </div>
      ) : (
        // Existing Partner Settings View
        <>
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
              <p className="text-xs text-gray-500 mt-1">
                Location coordinates will be automatically determined from your address
              </p>
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

        {/* Images Section */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Image className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Salon Images</h2>
              <p className="text-sm text-gray-500">Upload your logo, cover photo, and gallery images</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div 
                    className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-ghana-green transition-colors"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {logoPreview || salon?.logo ? (
                      <img 
                        src={logoPreview || salon?.logo || ''} 
                        alt="Logo" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  {uploadingLogo && (
                    <div className="absolute inset-0 bg-white/80 rounded-full flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-ghana-green" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleLogoSelect}
                    className="hidden"
                  />
                  <p className="text-sm text-gray-600 mb-2">
                    A square image works best. This will appear as your salon icon.
                  </p>
                  <p className="text-xs text-gray-400 mb-3">Max 10MB. JPG, PNG, or WebP.</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Choose File
                    </button>
                    {logoFile && (
                      <button
                        type="button"
                        onClick={handleUploadLogo}
                        disabled={uploadingLogo}
                        className="px-4 py-2 text-sm bg-ghana-green text-white rounded-lg hover:bg-ghana-green/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {uploadingLogo ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Upload Logo
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Cover Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image</label>
              <div className="space-y-3">
                <div 
                  className="relative h-40 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-ghana-green transition-colors"
                  onClick={() => coverInputRef.current?.click()}
                >
                  {coverPreview || salon?.coverImage ? (
                    <img 
                      src={coverPreview || salon?.coverImage || ''} 
                      alt="Cover" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <Image className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Click to upload cover image</p>
                    </div>
                  )}
                  {uploadingCover && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-ghana-green" />
                    </div>
                  )}
                </div>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleCoverSelect}
                  className="hidden"
                />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      A wide image works best for your salon header.
                    </p>
                    <p className="text-xs text-gray-400">Max 10MB. JPG, PNG, or WebP.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Choose File
                    </button>
                    {coverFile && (
                      <button
                        type="button"
                        onClick={handleUploadCover}
                        disabled={uploadingCover}
                        className="px-4 py-2 text-sm bg-ghana-green text-white rounded-lg hover:bg-ghana-green/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {uploadingCover ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Upload Cover
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Gallery Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gallery <span className="text-gray-400 font-normal">({salon?.images?.length || 0}/10 images)</span>
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Show off your salon! Upload up to 10 photos of your space and work.
              </p>
              
              {/* Existing Gallery Images */}
              {(salon?.images && salon.images.length > 0) && (
                <div className="grid grid-cols-5 gap-3 mb-3">
                  {salon.images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group">
                      <img src={img} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                      {deletingImage === img ? (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-ghana-green" />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDeleteGalleryImage(img)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Pending Gallery Images */}
              {galleryPreviews.length > 0 && (
                <div className="grid grid-cols-5 gap-3 mb-3">
                  {galleryPreviews.map((preview, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group border-2 border-ghana-green">
                      <img src={preview} alt={`Pending ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-ghana-green/10" />
                      <button
                        type="button"
                        onClick={() => removePendingGalleryImage(idx)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                ref={galleryInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleGallerySelect}
                className="hidden"
              />
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Add Photos
                </button>
                {galleryFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={handleUploadGallery}
                    disabled={uploadingGallery}
                    className="px-4 py-2 text-sm bg-ghana-green text-white rounded-lg hover:bg-ghana-green/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {uploadingGallery ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading {galleryFiles.length} image{galleryFiles.length > 1 ? 's' : ''}...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Upload {galleryFiles.length} Image{galleryFiles.length > 1 ? 's' : ''}
                      </>
                    )}
                  </button>
                )}
              </div>
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
      </>
      )}
    </Layout>
  )
}
