import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, Store, Clock, Phone, Mail, MapPin, Globe, Instagram, Facebook, ArrowRight, CheckCircle, Scissors, Users, Calendar, Image, Upload, X, Camera, Loader2, Wifi, Car, Wind, Footprints, Timer, Armchair, Bell, QrCode, Shield, MessageSquare, Wallet, Building2, Smartphone, CreditCard, User, ArrowLeft, Info } from 'lucide-react'
import Layout from '../components/Layout'
import { api, Salon, CompletionSettings, PayoutAccount, SetupPayoutAccountPayload } from '../lib/api'
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
  const [setupStep, setSetupStep] = useState<'category' | 'details'>('category')

  const [formData, setFormData] = useState({
    businessName: '',
    description: '',
    type: 'BARBERSHOP',
    providerCategory: 'BUSINESS',
    address: '',
    city: '',
    region: '',
    phoneNumber: '',
    email: '',
    instagram: '',
    facebook: '',
    businessHours: defaultBusinessHours,
    hasParking: false,
    hasWifi: false,
    hasAC: false,
    acceptsWalkIns: false,
    maxConcurrentClients: 1,
    totalChairs: 1,
    bufferTimeMinutes: 0,
    operatingModel: 'APPOINTMENTS_ONLY' as 'APPOINTMENTS_ONLY' | 'WALK_INS_ALLOWED',
    serviceAreas: '' as string, // Comma-separated for freelancers
    ghanaPostGPS: '', // Optional GhanaPost GPS code
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

  // Completion settings state
  const [completionSettings, setCompletionSettings] = useState<CompletionSettings>({
    autoCompletionHours: 2,
    requiresCustomerConfirmation: false,
    completionReminderEnabled: true,
    qrCheckinEnabled: true,
  })
  const [loadingCompletionSettings, setLoadingCompletionSettings] = useState(false)
  const [savingCompletionSettings, setSavingCompletionSettings] = useState(false)
  const [completionSettingsSaved, setCompletionSettingsSaved] = useState(false)

  // Payout settings state
  const [payoutAccount, setPayoutAccount] = useState<PayoutAccount | null>(null)
  const [payoutType, setPayoutType] = useState<'bank' | 'mobile_money'>('bank')
  const [bankCode, setBankCode] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankAccountName, setBankAccountName] = useState('')
  const [momoProvider, setMomoProvider] = useState<'mtn' | 'vodafone' | 'airteltigo'>('mtn')
  const [momoNumber, setMomoNumber] = useState('')
  const [loadingPayout, setLoadingPayout] = useState(false)
  const [savingPayout, setSavingPayout] = useState(false)
  const [payoutSaved, setPayoutSaved] = useState(false)
  const [payoutError, setPayoutError] = useState<string | null>(null)

  // Supported banks and momo providers
  const supportedBanks = [
    { code: 'GCB', name: 'Ghana Commercial Bank' },
    { code: 'ECO', name: 'Ecobank' },
    { code: 'STB', name: 'Stanbic Bank' },
    { code: 'FID', name: 'Fidelity Bank' },
    { code: 'CAL', name: 'CalBank' },
    { code: 'ACC', name: 'Access Bank' },
    { code: 'ABS', name: 'Absa Bank' },
    { code: 'UBA', name: 'UBA Ghana' },
    { code: 'ZEN', name: 'Zenith Bank' },
    { code: 'FBL', name: 'First Atlantic Bank' },
    { code: 'ADB', name: 'Agricultural Development Bank' },
    { code: 'CBG', name: 'Consolidated Bank Ghana' },
    { code: 'GTB', name: 'Guaranty Trust Bank' },
    { code: 'FBN', name: 'First Bank of Nigeria' },
  ]

  const supportedMomoProviders = [
    { code: 'mtn', name: 'MTN Mobile Money' },
    { code: 'vodafone', name: 'Vodafone Cash' },
    { code: 'airteltigo', name: 'AirtelTigo Money' },
  ]

  const logoInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // Initial fetch on mount
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
            providerCategory: (salonData as any).providerCategory || 'BUSINESS',
            address: salonData.address || '',
            city: salonData.city || '',
            region: salonData.region || '',
            phoneNumber: salonData.phoneNumber || '',
            email: salonData.email || '',
            businessHours: parsedHours,
            hasParking: salonData.hasParking || false,
            hasWifi: salonData.hasWifi || false,
            hasAC: salonData.hasAC || false,
            acceptsWalkIns: salonData.acceptsWalkIns || false,
            maxConcurrentClients: salonData.maxConcurrentClients || 1,
            totalChairs: salonData.totalChairs || 1,
            bufferTimeMinutes: salonData.bufferTimeMinutes || 0,
            operatingModel: salonData.operatingModel || 'APPOINTMENTS_ONLY',
            ghanaPostGPS: (salonData as any).ghanaPostGPS || '',
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

  // Sync local salon state with context salon when it changes (e.g., after image uploads)
  useEffect(() => {
    if (contextSalon && !isNewPartner) {
      setSalon(contextSalon)
    }
  }, [contextSalon, isNewPartner])

  // Load completion settings when salon is loaded
  useEffect(() => {
    const fetchCompletionSettings = async () => {
      if (!salon?.id || isNewPartner) return
      
      setLoadingCompletionSettings(true)
      try {
        const response = await api.getCompletionSettings(salon.id)
        if (response.success && response.data) {
          setCompletionSettings(response.data)
        }
      } catch (error) {
        console.error('Failed to fetch completion settings:', error)
      } finally {
        setLoadingCompletionSettings(false)
      }
    }
    
    fetchCompletionSettings()
  }, [salon?.id, isNewPartner])

  // Load payout account when salon is loaded
  useEffect(() => {
    const fetchPayoutAccount = async () => {
      if (!salon?.id || isNewPartner) return
      
      setLoadingPayout(true)
      try {
        const response = await api.getPayoutAccount(salon.id)
        if (response.success && response.data) {
          const account = response.data
          setPayoutAccount(account)
          
          // Pre-fill form if account exists
          if (account.payoutType) {
            setPayoutType(account.payoutType as 'bank' | 'mobile_money')
            if (account.payoutType === 'bank') {
              setBankCode(account.bankCode || '')
              setBankAccountName(account.bankAccountName || '')
              // Don't pre-fill account number for security (it's masked)
            } else if (account.payoutType === 'mobile_money') {
              setMomoProvider((account.momoProvider as 'mtn' | 'vodafone' | 'airteltigo') || 'mtn')
              // Don't pre-fill phone number for security (it's masked)
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch payout account:', error)
      } finally {
        setLoadingPayout(false)
      }
    }
    
    fetchPayoutAccount()
  }, [salon?.id, isNewPartner])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const isFreelancer = formData.providerCategory === 'FREELANCER'

    // Validate required fields for new partners
    if (isNewPartner) {
      if (!formData.businessName.trim()) {
        setError(isFreelancer ? 'Professional name is required' : 'Business name is required')
        return
      }
      // Address required for business owners only
      if (!isFreelancer && !formData.address.trim()) {
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
      // Service areas required for freelancers
      if (isFreelancer && !formData.serviceAreas.trim()) {
        setError('Please enter at least one service area (neighborhoods you cover)')
        return
      }
    }
    
    setSaving(true)
    setSaved(false)
    setError(null)
    
    try {
      if (isNewPartner) {
        // Parse service areas from comma-separated text
        const serviceAreas = isFreelancer
          ? formData.serviceAreas.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
          : undefined

        // Create new salon for new partner
        const createData: Parameters<typeof api.createSalon>[0] = {
          businessName: formData.businessName,
          description: formData.description,
          type: formData.type,
          providerCategory: formData.providerCategory,
          city: formData.city,
          region: formData.region,
          phoneNumber: formData.phoneNumber,
          email: formData.email || undefined,
          serviceAreas,
          ghanaPostGPS: formData.ghanaPostGPS.trim() || undefined,
        }

        // Business-specific fields
        if (!isFreelancer) {
          createData.address = formData.address
          createData.latitude = 5.6037 // Default to Accra
          createData.longitude = -0.1870
          createData.openingTime = getOpeningTime(formData.businessHours)
          createData.closingTime = getClosingTime(formData.businessHours)
          createData.workingDays = getWorkingDays(formData.businessHours)
          createData.hasParking = formData.hasParking
          createData.hasWifi = formData.hasWifi
          createData.hasAC = formData.hasAC
          createData.acceptsWalkIns = formData.acceptsWalkIns
          createData.maxConcurrentClients = formData.maxConcurrentClients
          createData.totalChairs = formData.totalChairs
          createData.bufferTimeMinutes = formData.bufferTimeMinutes
          createData.operatingModel = formData.operatingModel
        } else {
          // Freelancer: pass working days, defaults handled by backend
          createData.workingDays = getWorkingDays(formData.businessHours)
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
          ghanaPostGPS: formData.ghanaPostGPS.trim() || undefined,
          openingTime: getOpeningTime(formData.businessHours),
          closingTime: getClosingTime(formData.businessHours),
          workingDays: getWorkingDays(formData.businessHours),
          operatingHours: formatOperatingHours(formData.businessHours),
          hasParking: formData.hasParking,
          hasWifi: formData.hasWifi,
          hasAC: formData.hasAC,
          acceptsWalkIns: formData.acceptsWalkIns,
          maxConcurrentClients: formData.maxConcurrentClients,
          totalChairs: formData.totalChairs,
          bufferTimeMinutes: formData.bufferTimeMinutes,
          operatingModel: formData.operatingModel
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

  // Handle completion settings save
  const handleSaveCompletionSettings = async () => {
    if (!salon?.id) return
    
    setSavingCompletionSettings(true)
    setCompletionSettingsSaved(false)
    setError(null)
    
    try {
      const response = await api.updateCompletionSettings(salon.id, completionSettings)
      if (response.success) {
        setCompletionSettingsSaved(true)
        setTimeout(() => setCompletionSettingsSaved(false), 3000)
      } else {
        setError('Failed to save completion settings')
      }
    } catch (err: any) {
      console.error('Failed to save completion settings:', err)
      setError(err?.message || 'Failed to save completion settings')
    } finally {
      setSavingCompletionSettings(false)
    }
  }

  // Handle payout settings save
  const handleSavePayout = async () => {
    if (!salon?.id) return
    
    setSavingPayout(true)
    setPayoutSaved(false)
    setPayoutError(null)
    
    // Validate inputs
    if (payoutType === 'bank') {
      if (!bankCode || !bankAccountNumber || !bankAccountName) {
        setPayoutError('Please fill in all bank account details')
        setSavingPayout(false)
        return
      }
    } else {
      if (!momoNumber) {
        setPayoutError('Please enter your mobile money number')
        setSavingPayout(false)
        return
      }
    }
    
    try {
      const payload: SetupPayoutAccountPayload = {
        payoutType,
        ...(payoutType === 'bank' ? {
          bankCode,
          bankAccountNumber,
          bankAccountName,
        } : {
          momoProvider,
          momoNumber,
        }),
      }
      
      const response = await api.setupPayoutAccount(salon.id, payload)
      if (response.success) {
        setPayoutAccount(response.data.payoutAccount)
        setPayoutSaved(true)
        setTimeout(() => setPayoutSaved(false), 3000)
        // Clear sensitive fields after successful save
        setBankAccountNumber('')
        setMomoNumber('')
      } else {
        setPayoutError('Failed to save payout settings')
      }
    } catch (err: any) {
      console.error('Failed to save payout settings:', err)
      setPayoutError(err?.message || 'Failed to save payout settings')
    } finally {
      setSavingPayout(false)
    }
  }

  if (loading) {
    return (
      <Layout activeTab="settings">
        <div className="space-y-6 py-8 max-w-3xl mx-auto px-4">
          <div className="skeleton-shimmer h-8 w-48"></div>
          <div className="skeleton-shimmer h-64 w-full"></div>
          <div className="skeleton-shimmer h-48 w-full"></div>
          <div className="skeleton-shimmer h-48 w-full"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout activeTab="settings">
      {isNewPartner ? (
        // New Partner Setup View
        <div className="max-w-3xl mx-auto page-enter">
          {/* Welcome Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-ghana-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
              {setupStep === 'category' ? (
                <Store className="w-10 h-10 text-ghana-green" />
              ) : (
                <Store className="w-10 h-10 text-ghana-green" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {setupStep === 'category' ? 'How do you work?' : (
                formData.providerCategory === 'FREELANCER' ? 'Set Up Your Profile' : 'Set Up Your Salon'
              )}
            </h1>
            <p className="text-gray-600 max-w-md mx-auto">
              {setupStep === 'category'
                ? 'Choose the option that best describes your business model'
                : (formData.providerCategory === 'FREELANCER'
                    ? 'Tell us about yourself so customers can find and book you.'
                    : "Let's set up your salon profile so you can start accepting bookings."
                  )
              }
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8 overflow-x-auto pb-2">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                setupStep === 'category' ? 'bg-ghana-green text-white ring-2 ring-ghana-gold' : 'bg-ghana-green text-white'
              }`}>{setupStep === 'details' ? <CheckCircle className="w-4 h-4" /> : '1'}</div>
              <span className={`text-sm font-medium whitespace-nowrap ${setupStep === 'category' ? 'text-ghana-green' : 'text-gray-900'}`}>Type</span>
            </div>
            <div className={`w-8 sm:w-12 h-0.5 flex-shrink-0 ${setupStep === 'details' ? 'bg-ghana-green' : 'bg-gray-200'}`}></div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                setupStep === 'details' ? 'bg-ghana-green text-white ring-2 ring-ghana-gold' : 'bg-gray-200 text-gray-500'
              }`}>2</div>
              <span className={`text-sm whitespace-nowrap ${setupStep === 'details' ? 'text-ghana-green font-medium' : 'text-gray-500'}`}>Setup</span>
            </div>
            <div className="w-8 sm:w-12 h-0.5 bg-gray-200 flex-shrink-0"></div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium">3</div>
              <span className="text-sm text-gray-500 whitespace-nowrap">Services</span>
            </div>
            <div className="w-8 sm:w-12 h-0.5 bg-gray-200 flex-shrink-0"></div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium">4</div>
              <span className="text-sm text-gray-500 whitespace-nowrap">Staff</span>
            </div>
          </div>

          {/* Step 1: Category Selection */}
          {setupStep === 'category' && (
            <div className="space-y-4">
              {/* Business Card */}
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, providerCategory: 'BUSINESS' })
                  setSetupStep('details')
                }}
                className={`w-full p-6 rounded-2xl border-2 text-left transition-all hover:shadow-md ${
                  formData.providerCategory === 'BUSINESS'
                    ? 'border-ghana-green bg-ghana-green/5'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    formData.providerCategory === 'BUSINESS' ? 'bg-ghana-green/10' : 'bg-gray-100'
                  }`}>
                    <span className="text-2xl">🏪</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Business Owner</h3>
                    <p className="text-sm text-gray-500 mb-3">Salon, Barbershop or Beauty Studio</p>
                    <p className="text-sm text-gray-600 mb-3">
                      I have a registered business with a physical shop where customers come for services.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                        <CheckCircle className="w-3.5 h-3.5 text-ghana-green" /> Physical shop location
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                        <CheckCircle className="w-3.5 h-3.5 text-ghana-green" /> Multiple staff members
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                        <CheckCircle className="w-3.5 h-3.5 text-ghana-green" /> Walk-in & appointments
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                </div>
              </button>

              {/* Freelancer Card */}
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, providerCategory: 'FREELANCER' })
                  setSetupStep('details')
                }}
                className={`w-full p-6 rounded-2xl border-2 text-left transition-all hover:shadow-md ${
                  formData.providerCategory === 'FREELANCER'
                    ? 'border-ghana-green bg-ghana-green/5'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    formData.providerCategory === 'FREELANCER' ? 'bg-ghana-green/10' : 'bg-gray-100'
                  }`}>
                    <span className="text-2xl">✂️</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Freelancer</h3>
                    <p className="text-sm text-gray-500 mb-3">Independent Barber or Hairdresser</p>
                    <p className="text-sm text-gray-600 mb-3">
                      I work independently and can provide services at my location or travel to clients.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                        <CheckCircle className="w-3.5 h-3.5 text-ghana-green" /> Home service available
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                        <CheckCircle className="w-3.5 h-3.5 text-ghana-green" /> Flexible location
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                        <CheckCircle className="w-3.5 h-3.5 text-ghana-green" /> Personal brand
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                </div>
              </button>

              <p className="text-center text-sm text-gray-400 mt-4">You can change this later in settings</p>
            </div>
          )}

          {/* Step 2: Details Form */}
          {setupStep === 'details' && (
            <>
          {/* Setup Form */}
          <div className="card-v2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-ghana-green/10 rounded-lg flex items-center justify-center">
                {formData.providerCategory === 'FREELANCER' ? (
                  <User className="w-5 h-5 text-ghana-green" />
                ) : (
                  <Store className="w-5 h-5 text-ghana-green" />
                )}
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-gray-900">
                  {formData.providerCategory === 'FREELANCER' ? 'Create Your Profile' : 'Create Your Salon'}
                </h2>
                <p className="text-sm text-gray-500">
                  {formData.providerCategory === 'FREELANCER' ? 'Fill in your details below' : 'Fill in your business details below'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSetupStep('category')}
                className="text-sm text-ghana-green hover:text-ghana-green/80 font-medium flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Change type
              </button>
            </div>

            {/* Category Badge */}
            <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 bg-ghana-green/10 text-ghana-green rounded-full text-sm font-medium">
              <span>{formData.providerCategory === 'FREELANCER' ? '✂️' : '🏪'}</span>
              {formData.providerCategory === 'FREELANCER' ? 'Freelancer' : 'Business Owner'}
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Business Name / Professional Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.providerCategory === 'FREELANCER' ? 'Professional Name' : 'Business Name'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder={formData.providerCategory === 'FREELANCER' ? 'e.g., Kwame the Barber' : "e.g., Kofi's Barbershop"}
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  required
                />
              </div>
            
              {/* Salon Type / Service Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.providerCategory === 'FREELANCER' ? 'Service Type' : 'Salon Type'} <span className="text-red-500">*</span>
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
                  placeholder={formData.providerCategory === 'FREELANCER' ? 'Tell customers about your skills, experience, and services...' : 'Tell customers about your salon...'}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            
              {/* Service Areas - Freelancers only */}
              {formData.providerCategory === 'FREELANCER' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Areas You Serve <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <textarea
                      className="input-field pl-10 min-h-[80px] resize-none"
                      placeholder="e.g., East Legon, Cantonments, Airport Residential"
                      value={formData.serviceAreas}
                      onChange={(e) => setFormData({ ...formData, serviceAreas: e.target.value })}
                      required
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Enter neighborhoods separated by commas where you can provide home service</p>
                </div>
              )}
            
              {/* Address - Business owners only */}
              {formData.providerCategory !== 'FREELANCER' && (
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
              )}

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

              {/* GhanaPost GPS Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GhanaPost GPS Code
                  <span className="ml-2 text-xs font-normal text-gray-400">(Optional)</span>
                </label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  <input
                    type="text"
                    className="input-field pl-10 uppercase"
                    placeholder="e.g., GA-184-9524"
                    value={formData.ghanaPostGPS}
                    onChange={(e) => setFormData({ ...formData, ghanaPostGPS: e.target.value.toUpperCase() })}
                    maxLength={20}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">Your GhanaPost digital address code. Open the GhanaPostGPS app to find yours.</p>
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

              {/* Business Hours / Availability */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {formData.providerCategory === 'FREELANCER' ? 'Availability' : 'Business Hours'}
                </label>

                {/* Freelancer info note */}
                {formData.providerCategory === 'FREELANCER' && (
                  <div className="mb-4 p-3 bg-ghana-green/5 border border-ghana-green/20 rounded-lg flex items-start gap-2">
                    <Info className="w-5 h-5 text-ghana-green flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-600">You work by appointment only. Customers will book you for specific times on your available days.</p>
                  </div>
                )}

                <div className="space-y-2">
                  {formData.businessHours.map((hour, index) => (
                    <div key={hour.day} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="w-full sm:w-24">
                        <span className="font-medium text-gray-700 text-sm">{hour.day}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hour.isOpen}
                            onChange={(e) => updateBusinessHour(index, 'isOpen', e.target.checked)}
                            className="w-4 h-4 text-ghana-green rounded border-gray-300 focus:ring-ghana-green"
                          />
                          <span className="text-sm text-gray-600">{formData.providerCategory === 'FREELANCER' ? 'Available' : 'Open'}</span>
                        </label>
                        {/* Time inputs - Business owners only */}
                        {formData.providerCategory !== 'FREELANCER' && hour.isOpen && (
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={hour.open}
                              onChange={(e) => updateBusinessHour(index, 'open', e.target.value)}
                              className="input-field py-1.5 px-2 text-sm w-24 sm:w-28"
                            />
                            <span className="text-gray-500 text-sm">to</span>
                            <input
                              type="time"
                              value={hour.close}
                              onChange={(e) => updateBusinessHour(index, 'close', e.target.value)}
                              className="input-field py-1.5 px-2 text-sm w-24 sm:w-28"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full btn-primary btn-ripple flex items-center justify-center gap-2 py-3 text-base"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {formData.providerCategory === 'FREELANCER' ? 'Creating Profile...' : 'Creating Salon...'}
                    </>
                  ) : saved ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      {formData.providerCategory === 'FREELANCER' ? 'Profile Created! Redirecting...' : 'Salon Created! Redirecting...'}
                    </>
                  ) : (
                    <>
                      {formData.providerCategory === 'FREELANCER' ? 'Create Profile & Continue' : 'Create Salon & Continue'}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Tips */}
          <div className="mt-6 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="card-v2 p-4">
              <div className="w-10 h-10 bg-ghana-gold/10 rounded-lg flex items-center justify-center mb-3">
                <Store className="w-5 h-5 text-ghana-gold" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Step 1: Set Up Profile</h3>
              <p className="text-sm text-gray-600">Add your business name, location, and contact details.</p>
            </div>
            <div className="card-v2 p-4">
              <div className="w-10 h-10 bg-ghana-green/10 rounded-lg flex items-center justify-center mb-3">
                <Scissors className="w-5 h-5 text-ghana-green" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Step 2: Add Services</h3>
              <p className="text-sm text-gray-600">Define your services, prices, and duration.</p>
            </div>
            <div className="card-v2 p-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Step 3: Add Staff</h3>
              <p className="text-sm text-gray-600">Add your team members and their specialties.</p>
            </div>
          </div>
          </>
          )}
        </div>
      ) : (
        // Existing Partner Settings View
        <>
          <div className="mb-6 page-enter">
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-500">Salon profile and preferences</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
        {/* Salon Profile Section */}
        <div className="card-v2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-ghana-green/10 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-ghana-green" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Salon Profile</h2>
              <p className="text-sm text-gray-500">Basic information about your salon</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Salon Name</label>
              <input
                type="text"
                className="input-field w-full"
                placeholder="e.g., Kofi's Barbershop"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="input-field min-h-[100px] resize-none w-full"
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
                  className="input-field pl-10 w-full"
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
                className="input-field w-full"
                placeholder="e.g., Accra"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
              <input
                type="text"
                className="input-field w-full"
                placeholder="e.g., Greater Accra"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Images Section */}
        <div className="card-v2">
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
                    className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-ghana-green transition-colors group"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {logoPreview || salon?.logo ? (
                      <>
                        <img 
                          src={logoPreview || salon?.logo || ''} 
                          alt="Logo" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                          <Camera className="w-6 h-6 text-white" />
                        </div>
                      </>
                    ) : (
                      <>
                        <img 
                          src="https://groomlinkgh.com/api/uploads/assets/logo-icon.png" 
                          alt="Default Logo" 
                          className="w-16 h-16 object-contain opacity-50"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                          <Camera className="w-6 h-6 text-white" />
                        </div>
                      </>
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
                      className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors btn-ripple"
                    >
                      Choose File
                    </button>
                    {logoFile && (
                      <button
                        type="button"
                        onClick={handleUploadLogo}
                        disabled={uploadingLogo}
                        className="px-4 py-2 text-sm bg-ghana-green text-white rounded-lg hover:bg-ghana-green/90 transition-colors disabled:opacity-50 flex items-center gap-2 btn-ripple"
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
                  className="relative h-40 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-ghana-green transition-colors group"
                  onClick={() => coverInputRef.current?.click()}
                >
                  {coverPreview || salon?.coverImage ? (
                    <>
                      <img 
                        src={coverPreview || salon?.coverImage || ''} 
                        alt="Cover" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="w-8 h-8 text-white" />
                      </div>
                    </>
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
                      className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors btn-ripple"
                    >
                      Choose File
                    </button>
                    {coverFile && (
                      <button
                        type="button"
                        onClick={handleUploadCover}
                        disabled={uploadingCover}
                        className="px-4 py-2 text-sm bg-ghana-green text-white rounded-lg hover:bg-ghana-green/90 transition-colors disabled:opacity-50 flex items-center gap-2 btn-ripple"
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
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3 mb-3">
                  {salon.images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group">
                      <img src={img} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3 mb-3">
                  {galleryPreviews.map((preview, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border-2 border-ghana-green">
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
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 btn-ripple"
                >
                  <Camera className="w-4 h-4" />
                  Add Photos
                </button>
                {galleryFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={handleUploadGallery}
                    disabled={uploadingGallery}
                    className="px-4 py-2 text-sm bg-ghana-green text-white rounded-lg hover:bg-ghana-green/90 transition-colors disabled:opacity-50 flex items-center gap-2 btn-ripple"
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
        <div className="card-v2">
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
              <div key={hour.day} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="w-full sm:w-28">
                  <span className="font-medium text-gray-700">{hour.day}</span>
                </div>
                <div className="flex items-center gap-4">
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
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={hour.open}
                        onChange={(e) => updateBusinessHour(index, 'open', e.target.value)}
                        className="input-field py-1.5 px-2 text-sm w-24 sm:w-28"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="time"
                        value={hour.close}
                        onChange={(e) => updateBusinessHour(index, 'close', e.target.value)}
                        className="input-field py-1.5 px-2 text-sm w-24 sm:w-28"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Facilities & Amenities Section */}
        <div className="card-v2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Facilities & Amenities</h2>
              <p className="text-sm text-gray-500">Let customers know what your salon offers</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setFormData({ ...formData, hasWifi: !formData.hasWifi })}>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Wifi className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-gray-900">Free WiFi</span>
                <p className="text-sm text-gray-500">Customers can connect to WiFi</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, hasWifi: !formData.hasWifi }) }}
                className={`toggle-switch ${formData.hasWifi ? 'toggle-switch-on' : 'toggle-switch-off'} flex-shrink-0`}
              >
                <span className={`toggle-switch-dot ${formData.hasWifi ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setFormData({ ...formData, hasParking: !formData.hasParking })}>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Car className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-gray-900">Parking Available</span>
                <p className="text-sm text-gray-500">On-site parking for customers</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, hasParking: !formData.hasParking }) }}
                className={`toggle-switch ${formData.hasParking ? 'toggle-switch-on' : 'toggle-switch-off'} flex-shrink-0`}
              >
                <span className={`toggle-switch-dot ${formData.hasParking ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setFormData({ ...formData, hasAC: !formData.hasAC })}>
              <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Wind className="w-5 h-5 text-cyan-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-gray-900">Air Conditioning</span>
                <p className="text-sm text-gray-500">Climate controlled environment</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, hasAC: !formData.hasAC }) }}
                className={`toggle-switch ${formData.hasAC ? 'toggle-switch-on' : 'toggle-switch-off'} flex-shrink-0`}
              >
                <span className={`toggle-switch-dot ${formData.hasAC ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setFormData({ ...formData, acceptsWalkIns: !formData.acceptsWalkIns })}>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Footprints className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-gray-900">Walk-ins Welcome</span>
                <p className="text-sm text-gray-500">Accept customers without booking</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, acceptsWalkIns: !formData.acceptsWalkIns }) }}
                className={`toggle-switch ${formData.acceptsWalkIns ? 'toggle-switch-on' : 'toggle-switch-off'} flex-shrink-0`}
              >
                <span className={`toggle-switch-dot ${formData.acceptsWalkIns ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Salon Capacity Section */}
        <div className="card-v2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Salon Capacity</h2>
              <p className="text-sm text-gray-500">Configure your salon's capacity and scheduling preferences</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Max Concurrent Clients */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How many customers can your salon serve at the same time?
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {[1, 2, 4, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setFormData({ ...formData, maxConcurrentClients: num })}
                    className={`px-3 sm:px-4 py-2 rounded-lg border-2 font-medium transition-all min-h-[44px] ${
                      formData.maxConcurrentClients === num
                        ? 'border-ghana-green bg-ghana-green/10 text-ghana-green'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {num}
                  </button>
                ))}
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">or</span>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={formData.maxConcurrentClients}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setFormData({ ...formData, maxConcurrentClients: Math.min(50, Math.max(1, val)) });
                    }}
                    className="input-field w-20 text-center"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500">
                This controls how many bookings can overlap for the same time slot
              </p>
            </div>

            {/* Total Chairs/Stations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total chairs or service stations
              </label>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Armchair className="w-5 h-5 text-gray-600" />
                </div>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={formData.totalChairs}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setFormData({ ...formData, totalChairs: Math.min(50, Math.max(1, val)) });
                  }}
                  className="input-field w-24"
                />
                <span className="text-gray-500">chairs/stations</span>
              </div>
            </div>

            {/* Buffer Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buffer time between appointments (minutes)
              </label>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Timer className="w-5 h-5 text-gray-600" />
                </div>
                <input
                  type="number"
                  min={0}
                  max={60}
                  step={5}
                  value={formData.bufferTimeMinutes}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setFormData({ ...formData, bufferTimeMinutes: Math.min(60, Math.max(0, val)) });
                  }}
                  className="input-field w-24"
                />
                <span className="text-gray-500">minutes</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Time to sanitize between customers
              </p>
            </div>

            {/* Operating Model */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Operating Model
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <label
                  className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.operatingModel === 'APPOINTMENTS_ONLY'
                      ? 'border-ghana-green bg-ghana-green/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-10 h-10 bg-ghana-green/10 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-ghana-green" />
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">Appointments Only</span>
                    <p className="text-sm text-gray-500">Customers must book in advance</p>
                  </div>
                  <input
                    type="radio"
                    name="operatingModel"
                    value="APPOINTMENTS_ONLY"
                    checked={formData.operatingModel === 'APPOINTMENTS_ONLY'}
                    onChange={(e) => setFormData({ ...formData, operatingModel: e.target.value as 'APPOINTMENTS_ONLY' | 'WALK_INS_ALLOWED' })}
                    className="w-5 h-5 text-ghana-green"
                  />
                </label>

                <label
                  className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.operatingModel === 'WALK_INS_ALLOWED'
                      ? 'border-ghana-green bg-ghana-green/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Footprints className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">Walk-ins Allowed</span>
                    <p className="text-sm text-gray-500">Accept both bookings and walk-ins</p>
                  </div>
                  <input
                    type="radio"
                    name="operatingModel"
                    value="WALK_INS_ALLOWED"
                    checked={formData.operatingModel === 'WALK_INS_ALLOWED'}
                    onChange={(e) => setFormData({ ...formData, operatingModel: e.target.value as 'APPOINTMENTS_ONLY' | 'WALK_INS_ALLOWED' })}
                    className="w-5 h-5 text-ghana-green"
                  />
                </label>
              </div>
              {formData.operatingModel === 'WALK_INS_ALLOWED' && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <span className="font-medium">Note:</span> 20% of capacity will be reserved for walk-in customers
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Service Completion Settings Section */}
        <div className="card-v2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Service Completion</h2>
              <p className="text-sm text-gray-500">Configure how services are marked as complete</p>
            </div>
            {loadingCompletionSettings && (
              <div className="ml-auto">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Auto-Completion Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto-Completion Hours
              </label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCompletionSettings(prev => ({ 
                      ...prev, 
                      autoCompletionHours: Math.max(1, prev.autoCompletionHours - 1) 
                    }))}
                    className="w-10 h-10 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-600 min-h-[44px] min-w-[44px]"
                    disabled={completionSettings.autoCompletionHours <= 1}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={completionSettings.autoCompletionHours}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 2
                      setCompletionSettings(prev => ({ 
                        ...prev, 
                        autoCompletionHours: Math.min(6, Math.max(1, val)) 
                      }))
                    }}
                    className="input-field w-20 text-center"
                  />
                  <button
                    type="button"
                    onClick={() => setCompletionSettings(prev => ({ 
                      ...prev, 
                      autoCompletionHours: Math.min(6, prev.autoCompletionHours + 1) 
                    }))}
                    className="w-10 h-10 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-600 min-h-[44px] min-w-[44px]"
                    disabled={completionSettings.autoCompletionHours >= 6}
                  >
                    +
                  </button>
                </div>
                <span className="text-gray-500">hours</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Hours after appointment to auto-complete if not manually done
              </p>
            </div>

            {/* Customer Confirmation Toggle */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setCompletionSettings(prev => ({ ...prev, requiresCustomerConfirmation: !prev.requiresCustomerConfirmation }))}>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <span className="font-medium text-gray-900">Customer Confirmation</span>
                <p className="text-sm text-gray-500">Require customer to confirm service completion before payment release</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setCompletionSettings(prev => ({ ...prev, requiresCustomerConfirmation: !prev.requiresCustomerConfirmation })) }}
                className={`toggle-switch ${completionSettings.requiresCustomerConfirmation ? 'toggle-switch-on' : 'toggle-switch-off'}`}
              >
                <span className={`toggle-switch-dot ${completionSettings.requiresCustomerConfirmation ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Completion Reminders Toggle */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setCompletionSettings(prev => ({ ...prev, completionReminderEnabled: !prev.completionReminderEnabled }))}>
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <span className="font-medium text-gray-900">Completion Reminders</span>
                <p className="text-sm text-gray-500">Send SMS reminders to mark service complete</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setCompletionSettings(prev => ({ ...prev, completionReminderEnabled: !prev.completionReminderEnabled })) }}
                className={`toggle-switch ${completionSettings.completionReminderEnabled ? 'toggle-switch-on' : 'toggle-switch-off'}`}
              >
                <span className={`toggle-switch-dot ${completionSettings.completionReminderEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* QR Check-in Toggle */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setCompletionSettings(prev => ({ ...prev, qrCheckinEnabled: !prev.qrCheckinEnabled }))}>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <QrCode className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <span className="font-medium text-gray-900">QR Check-in</span>
                <p className="text-sm text-gray-500">Allow customers to check in with QR code</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setCompletionSettings(prev => ({ ...prev, qrCheckinEnabled: !prev.qrCheckinEnabled })) }}
                className={`toggle-switch ${completionSettings.qrCheckinEnabled ? 'toggle-switch-on' : 'toggle-switch-off'}`}
              >
                <span className={`toggle-switch-dot ${completionSettings.qrCheckinEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Save Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-3 sm:gap-4 pt-4 border-t border-gray-100">
              {completionSettingsSaved && (
                <span className="text-green-600 font-medium flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Settings saved!
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveCompletionSettings}
                disabled={savingCompletionSettings || loadingCompletionSettings}
                className="btn-primary btn-ripple flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                {savingCompletionSettings ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Completion Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Payout Settings Section */}
        <div className="card-v2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-900">Payout Settings</h2>
              <p className="text-sm text-gray-500">Configure how you receive your earnings</p>
            </div>
            {loadingPayout && (
              <div className="ml-auto">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            )}
            {payoutAccount?.isVerified && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                Verified
              </div>
            )}
          </div>

          {payoutError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{payoutError}</p>
            </div>
          )}

          {/* Current Payout Account Info */}
          {payoutAccount?.isVerified && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-800">Current Payout Account</span>
              </div>
              <p className="text-sm text-green-700">
                {payoutAccount.payoutType === 'bank' ? (
                  <>
                    Bank Account: {payoutAccount.bankAccountName}<br />
                    Bank: {supportedBanks.find(b => b.code === payoutAccount.bankCode)?.name || payoutAccount.bankCode}<br />
                    Account: {payoutAccount.bankAccountNumber}
                  </>
                ) : (
                  <>
                    Mobile Money: {supportedMomoProviders.find(p => p.code === payoutAccount.momoProvider)?.name || payoutAccount.momoProvider}<br />
                    Number: {payoutAccount.momoNumber}
                  </>
                )}
              </p>
            </div>
          )}

          <div className="space-y-6">
            {/* Payout Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                How would you like to receive payments?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <label
                  className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    payoutType === 'bank'
                      ? 'border-ghana-green bg-ghana-green/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">Bank Account</span>
                    <p className="text-sm text-gray-500">Receive payouts to your bank</p>
                  </div>
                  <input
                    type="radio"
                    name="payoutType"
                    value="bank"
                    checked={payoutType === 'bank'}
                    onChange={(e) => setPayoutType(e.target.value as 'bank')}
                    className="w-5 h-5 text-ghana-green"
                  />
                </label>

                <label
                  className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    payoutType === 'mobile_money'
                      ? 'border-ghana-green bg-ghana-green/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">Mobile Money</span>
                    <p className="text-sm text-gray-500">Receive payouts via MoMo</p>
                  </div>
                  <input
                    type="radio"
                    name="payoutType"
                    value="mobile_money"
                    checked={payoutType === 'mobile_money'}
                    onChange={(e) => setPayoutType(e.target.value as 'mobile_money')}
                    className="w-5 h-5 text-ghana-green"
                  />
                </label>
              </div>
            </div>

            {/* Bank Account Form */}
            {payoutType === 'bank' && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Name
                  </label>
                  <select
                    value={bankCode}
                    onChange={(e) => setBankCode(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select your bank</option>
                    {supportedBanks.map((bank) => (
                      <option key={bank.code} value={bank.code}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter your account number"
                    className="input-field"
                    maxLength={20}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value)}
                    placeholder="Name as it appears on the account"
                    className="input-field"
                  />
                </div>
              </div>
            )}

            {/* Mobile Money Form */}
            {payoutType === 'mobile_money' && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile Money Provider
                  </label>
                  <select
                    value={momoProvider}
                    onChange={(e) => setMomoProvider(e.target.value as 'mtn' | 'vodafone' | 'airteltigo')}
                    className="input-field"
                  >
                    {supportedMomoProviders.map((provider) => (
                      <option key={provider.code} value={provider.code}>
                        {provider.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile Money Number
                  </label>
                  <input
                    type="tel"
                    value={momoNumber}
                    onChange={(e) => setMomoNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g., 024XXXXXXX"
                    className="input-field"
                    maxLength={10}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the number without country code (e.g., 024XXXXXXX)
                  </p>
                </div>
              </div>
            )}

            {/* Info Note */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <span className="font-medium">Note:</span> Your payout account will be verified with our payment provider. 
                Once verified, you'll receive your earnings automatically when services are completed.
              </p>
            </div>

            {/* Save Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-3 sm:gap-4 pt-4 border-t border-gray-100">
              {payoutSaved && (
                <span className="text-green-600 font-medium flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Payout account saved!
                </span>
              )}
              <button
                type="button"
                onClick={handleSavePayout}
                disabled={savingPayout || loadingPayout}
                className="btn-primary btn-ripple flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                {savingPayout ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying & Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {payoutAccount?.isVerified ? 'Update Payout Account' : 'Save Payout Account'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Contact Information Section */}
        <div className="card-v2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Phone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Contact Information</h2>
              <p className="text-sm text-gray-500">How customers can reach you</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  className="input-field pl-10 w-full"
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
                  className="input-field pl-10 w-full"
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
                  className="input-field pl-10 w-full"
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
                  className="input-field pl-10 w-full"
                  placeholder="facebook.com/yoursalon"
                  value={formData.facebook}
                  onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-3 sm:gap-4">
          {saved && (
            <span className="text-green-600 font-medium">Settings saved successfully!</span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="btn-primary btn-ripple flex items-center justify-center gap-2 w-full sm:w-auto"
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
