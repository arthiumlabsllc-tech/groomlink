import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import Layout from '../components/Layout'
import { api, KycSubmission } from '../lib/api'

// Step transition wrapper
function StepContent({ children, isActive }: { children: React.ReactNode; isActive: boolean }) {
  return (
    <div className={`transition-all duration-500 ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 absolute inset-0 pointer-events-none'}`}>
      {children}
    </div>
  )
}

// Shimmer skeleton components
function KycLoadingSkeleton() {
  return (
    <div className="max-w-3xl mx-auto page-enter">
      <div className="card-v2 p-8">
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center">
              <div className="skeleton-shimmer w-10 h-10 rounded-full" />
              {i < 5 && <div className="skeleton-shimmer w-8 sm:w-16 h-0.5 mx-2" />}
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <div className="skeleton-shimmer h-6 w-48 mb-2" />
          <div className="skeleton-shimmer h-4 w-64 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="skeleton-shimmer h-32 rounded-xl" />
            <div className="skeleton-shimmer h-32 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusLoadingSkeleton() {
  return (
    <div className="max-w-3xl mx-auto page-enter">
      <div className="card-v2 p-8">
        <div className="text-center py-8">
          <div className="skeleton-shimmer w-20 h-20 rounded-full mx-auto mb-4" />
          <div className="skeleton-shimmer h-8 w-64 mx-auto mb-2" />
          <div className="skeleton-shimmer h-4 w-80 mx-auto" />
        </div>
        <div className="space-y-4 mt-6">
          <div className="skeleton-shimmer h-20 rounded-xl" />
          <div className="skeleton-shimmer h-20 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

type BusinessType = 'REGISTERED_COMPANY' | 'INDIVIDUAL' | null
type KycStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'

interface FormData {
  businessType: BusinessType
  ownerLegalName: string
  businessRegName: string
  tinNumber: string
  registrationNumber: string
}

interface UploadedFiles {
  governmentIdUrl: string | null
  selfieWithIdUrl: string | null
  storefrontVideoUrl: string | null
  interiorVideoUrl: string | null
  businessCertUrl: string | null
  proofOfAddressUrl: string | null
}

interface UploadingState {
  governmentId: boolean
  selfieWithId: boolean
  storefrontVideo: boolean
  interiorVideo: boolean
  businessCert: boolean
  proofOfAddress: boolean
}

const steps = [
  { number: 1, title: 'Business Type', icon: 'domain' },
  { number: 2, title: 'Personal Details', icon: 'person' },
  { number: 3, title: 'Documents', icon: 'description' },
  { number: 4, title: 'Video Verification', icon: 'videocam' },
  { number: 5, title: 'Review & Submit', icon: 'check_circle' },
]

export default function KYC() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // KYC status from server
  const [kycStatus, setKycStatus] = useState<KycStatus>('NONE')
  const [existingKyc, setExistingKyc] = useState<KycSubmission | null>(null)
  
  // Form data
  const [formData, setFormData] = useState<FormData>({
    businessType: null,
    ownerLegalName: '',
    businessRegName: '',
    tinNumber: '',
    registrationNumber: '',
  })
  
  // Uploaded files URLs
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFiles>({
    governmentIdUrl: null,
    selfieWithIdUrl: null,
    storefrontVideoUrl: null,
    interiorVideoUrl: null,
    businessCertUrl: null,
    proofOfAddressUrl: null,
  })
  
  // Upload states
  const [uploading, setUploading] = useState<UploadingState>({
    governmentId: false,
    selfieWithId: false,
    storefrontVideo: false,
    interiorVideo: false,
    businessCert: false,
    proofOfAddress: false,
  })

  // File input refs
  const fileInputRefs = {
    governmentId: useRef<HTMLInputElement>(null),
    selfieWithId: useRef<HTMLInputElement>(null),
    storefrontVideo: useRef<HTMLInputElement>(null),
    interiorVideo: useRef<HTMLInputElement>(null),
    businessCert: useRef<HTMLInputElement>(null),
    proofOfAddress: useRef<HTMLInputElement>(null),
  }

  // Fetch KYC status on mount
  useEffect(() => {
    const fetchKycStatus = async () => {
      try {
        const response = await api.getKycStatus()
        if (response.success && response.data) {
          setExistingKyc(response.data)
          setKycStatus(response.data.status as KycStatus)
          
          // Pre-fill form with existing data
          setFormData({
            businessType: response.data.businessType as BusinessType,
            ownerLegalName: response.data.ownerLegalName || '',
            businessRegName: response.data.businessRegName || '',
            tinNumber: response.data.tinNumber || '',
            registrationNumber: response.data.registrationNumber || '',
          })
          
          setUploadedFiles({
            governmentIdUrl: response.data.governmentIdUrl || null,
            selfieWithIdUrl: response.data.selfieWithIdUrl || null,
            storefrontVideoUrl: response.data.storefrontVideoUrl || null,
            interiorVideoUrl: response.data.interiorVideoUrl || null,
            businessCertUrl: response.data.businessCertUrl || null,
            proofOfAddressUrl: response.data.proofOfAddressUrl || null,
          })
        }
      } catch (err) {
        console.error('Failed to fetch KYC status:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchKycStatus()
  }, [])

  const handleFileUpload = async (field: keyof typeof fileInputRefs, file: File) => {
    const maxSize = field.includes('Video') ? 50 * 1024 * 1024 : 10 * 1024 * 1024 // 50MB for video, 10MB for images
    
    if (file.size > maxSize) {
      setError(`File size must be less than ${field.includes('Video') ? '50MB' : '10MB'}`)
      return
    }

    setUploading(prev => ({ ...prev, [field]: true }))
    setError(null)

    try {
      const response = await api.uploadKycDocument(field, file)
      if (response.success && response.data) {
        const urlKey = `${field}Url` as keyof UploadedFiles
        setUploadedFiles(prev => ({ ...prev, [urlKey]: response.data.url }))
      } else {
        setError(`Failed to upload ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`)
      }
    } catch (err: any) {
      setError(err?.message || `Failed to upload ${field}`)
    } finally {
      setUploading(prev => ({ ...prev, [field]: false }))
    }
  }

  const handleFileChange = (field: keyof typeof fileInputRefs, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(field, file)
    }
    // Reset input
    e.target.value = ''
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.businessType !== null
      case 2:
        if (!formData.ownerLegalName.trim()) return false
        if (formData.businessType === 'REGISTERED_COMPANY') {
          if (!formData.businessRegName.trim()) return false
        }
        return true
      case 3:
        if (!uploadedFiles.governmentIdUrl || !uploadedFiles.selfieWithIdUrl) return false
        if (formData.businessType === 'REGISTERED_COMPANY' && !uploadedFiles.businessCertUrl) return false
        if (formData.businessType === 'INDIVIDUAL' && !uploadedFiles.proofOfAddressUrl) return false
        return true
      case 4:
        if (!uploadedFiles.storefrontVideoUrl || !uploadedFiles.interiorVideoUrl) return false
        return true
      default:
        return true
    }
  }

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      setError('Please complete all required fields before continuing')
      return
    }
    setError(null)
    setCurrentStep(prev => Math.min(prev + 1, 5))
  }

  const handlePrev = () => {
    setError(null)
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      setError('Please complete all required fields')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await api.submitKyc({
        businessType: formData.businessType!,
        ownerLegalName: formData.ownerLegalName,
        businessRegName: formData.businessType === 'REGISTERED_COMPANY' ? formData.businessRegName : undefined,
        tinNumber: formData.businessType === 'REGISTERED_COMPANY' ? formData.tinNumber : undefined,
        registrationNumber: formData.businessType === 'REGISTERED_COMPANY' ? formData.registrationNumber : undefined,
      })

      if (response.success) {
        setKycStatus('PENDING')
        setExistingKyc(response.data)
      } else {
        setError('Failed to submit KYC. Please try again.')
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to submit KYC')
    } finally {
      setSubmitting(false)
    }
  }

  const isFormComplete = () => {
    return (
      formData.businessType !== null &&
      formData.ownerLegalName.trim() &&
      uploadedFiles.governmentIdUrl &&
      uploadedFiles.selfieWithIdUrl &&
      uploadedFiles.storefrontVideoUrl &&
      uploadedFiles.interiorVideoUrl &&
      (formData.businessType === 'REGISTERED_COMPANY' ? uploadedFiles.businessCertUrl : uploadedFiles.proofOfAddressUrl)
    )
  }

  // Render read-only view for PENDING or APPROVED status
  const renderReadOnlyView = () => (
    <div className="max-w-3xl mx-auto page-enter">
      <div className="card-v2">
        {/* Status Header */}
        <div className={`text-center py-10 ${kycStatus === 'APPROVED' ? 'bg-gradient-to-br from-green-50 to-emerald-50' : 'bg-gradient-to-br from-blue-50 to-indigo-50'} rounded-t-2xl -mx-8 -mt-8 mb-8 px-8 border-b ${kycStatus === 'APPROVED' ? 'border-green-100' : 'border-blue-100'}`}>
          <div className={`w-20 h-20 ${kycStatus === 'APPROVED' ? 'bg-green-100 shadow-green-200' : 'bg-blue-100 shadow-blue-200'} rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg`}>
            {kycStatus === 'APPROVED' ? (
              <Icon name="check_circle" size={40} className="text-green-600" />
            ) : (
              <Icon name="progress_activity" size={40} className="text-blue-600 animate-spin" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {kycStatus === 'APPROVED' ? 'Verification Approved!' : 'Verification Under Review'}
          </h2>
          <p className="text-gray-600 max-w-md mx-auto">
            {kycStatus === 'APPROVED' 
              ? 'Your salon has been verified. You can now receive bookings from customers.'
              : 'We\'re reviewing your submission. This usually takes 1-2 business days.'}
          </p>
        </div>

        {/* Submitted Details */}
        <div className="space-y-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Icon name="business" size={18} className="text-ghana-green" />
              Business Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="card-v2 p-4 bg-gradient-to-br from-gray-50 to-transparent border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Business Type</p>
                <p className="font-semibold text-gray-900">
                  {existingKyc?.businessType === 'REGISTERED_COMPANY' ? 'Registered Company' : 'Individual'}
                </p>
              </div>
              <div className="card-v2 p-4 bg-gradient-to-br from-gray-50 to-transparent border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Owner's Legal Name</p>
                <p className="font-semibold text-gray-900">{existingKyc?.ownerLegalName}</p>
              </div>
              {existingKyc?.businessType === 'REGISTERED_COMPANY' && (
                <>
                  <div className="card-v2 p-4 bg-gradient-to-br from-gray-50 to-transparent border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Business Registered Name</p>
                    <p className="font-semibold text-gray-900">{existingKyc?.businessRegName}</p>
                  </div>
                  {existingKyc?.tinNumber && (
                    <div className="card-v2 p-4 bg-gradient-to-br from-gray-50 to-transparent border border-gray-100">
                      <p className="text-sm text-gray-500 mb-1">TIN Number</p>
                      <p className="font-semibold text-gray-900">{existingKyc?.tinNumber}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Documents */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Icon name="description" size={18} className="text-ghana-gold" />
              Uploaded Documents
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {existingKyc?.governmentIdUrl && (
                <div className="card-v2 p-4 overflow-hidden">
                  <p className="text-sm text-gray-500 mb-3 font-medium">Government ID</p>
                  <img src={existingKyc.governmentIdUrl} alt="Government ID" className="w-full h-32 object-cover rounded-lg" />
                </div>
              )}
              {existingKyc?.selfieWithIdUrl && (
                <div className="card-v2 p-4 overflow-hidden">
                  <p className="text-sm text-gray-500 mb-3 font-medium">Selfie with ID</p>
                  <img src={existingKyc.selfieWithIdUrl} alt="Selfie with ID" className="w-full h-32 object-cover rounded-lg" />
                </div>
              )}
              {existingKyc?.businessCertUrl && (
                <div className="card-v2 p-4 overflow-hidden">
                  <p className="text-sm text-gray-500 mb-3 font-medium">Business Certificate</p>
                  <img src={existingKyc.businessCertUrl} alt="Business Certificate" className="w-full h-32 object-cover rounded-lg" />
                </div>
              )}
              {existingKyc?.proofOfAddressUrl && (
                <div className="card-v2 p-4 overflow-hidden">
                  <p className="text-sm text-gray-500 mb-3 font-medium">Proof of Address</p>
                  <img src={existingKyc.proofOfAddressUrl} alt="Proof of Address" className="w-full h-32 object-cover rounded-lg" />
                </div>
              )}
            </div>
          </div>

          {/* Videos */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Icon name="videocam" size={18} className="text-blue-500" />
              Video Verification
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {existingKyc?.storefrontVideoUrl && (
                <div className="card-v2 p-4 overflow-hidden">
                  <p className="text-sm text-gray-500 mb-3 font-medium">Storefront Video</p>
                  <video src={existingKyc.storefrontVideoUrl} controls className="w-full h-40 rounded-lg" />
                </div>
              )}
              {existingKyc?.interiorVideoUrl && (
                <div className="card-v2 p-4 overflow-hidden">
                  <p className="text-sm text-gray-500 mb-3 font-medium">Interior Video</p>
                  <video src={existingKyc.interiorVideoUrl} controls className="w-full h-40 rounded-lg" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // Render rejected view
  const renderRejectedView = () => (
    <div className="max-w-3xl mx-auto page-enter">
      {/* Rejection Banner */}
      <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-2xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Icon name="error" size={20} className="text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-red-800">Verification Rejected</h3>
            <p className="text-red-700 text-sm mt-1">{existingKyc?.rejectionReason || 'Your submission did not meet our requirements.'}</p>
          </div>
        </div>
      </div>

      {/* Re-submit option */}
      <div className="card-v2 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-900">Re-submit Verification</h3>
            <p className="text-sm text-gray-500">Please address the issues above and submit again.</p>
          </div>
          <button
            onClick={() => setKycStatus('NONE')}
            className="btn-primary btn-ripple flex items-center gap-2 whitespace-nowrap"
          >
            Re-submit
            <Icon name="arrow_forward" size={16} />
          </button>
        </div>
      </div>

      {/* Show previous submission details */}
      {renderReadOnlyView()}
    </div>
  )

  if (loading) {
    return (
      <Layout activeTab="kyc">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Verification Status</h1>
          <p className="text-gray-500">Your KYC verification details</p>
        </div>
        <StatusLoadingSkeleton />
      </Layout>
    )
  }

  // Show read-only view for approved/pending
  if (kycStatus === 'APPROVED' || kycStatus === 'PENDING') {
    return (
      <Layout activeTab="kyc">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Verification Status</h1>
          <p className="text-gray-500">Your KYC verification details</p>
        </div>
        {renderReadOnlyView()}
      </Layout>
    )
  }

  // Show rejected view with re-submit option
  if (kycStatus === 'REJECTED') {
    return (
      <Layout activeTab="kyc">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Verification Status</h1>
          <p className="text-gray-500">Your KYC verification details</p>
        </div>
        {renderRejectedView()}
      </Layout>
    )
  }

  // Multi-step form for new submission
  return (
    <Layout activeTab="kyc">
      <div className="page-enter">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Business Verification</h1>
          <p className="text-gray-500">Complete your KYC to start receiving bookings</p>
        </div>

        <div className="max-w-3xl mx-auto">
          {/* Progress Stepper */}
          <div className="card-v2 mb-6 p-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                        currentStep === step.number
                          ? 'bg-ghana-green text-white shadow-lg shadow-ghana-green/30 scale-110'
                          : currentStep > step.number
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {currentStep > step.number ? (
                        <Icon name="check" size={20} />
                      ) : (
                        <Icon name={step.icon} size={20} />
                      )}
                    </div>
                    <span className={`text-xs mt-2 hidden sm:block transition-colors ${
                      currentStep >= step.number ? 'text-gray-900 font-medium' : 'text-gray-400'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-8 sm:w-16 h-1 mx-2 rounded-full transition-colors duration-500 ${
                      currentStep > step.number ? 'bg-green-400' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

        {/* Error Message */}
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <Icon name="error" size={18} />
              </div>
              <p className="font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="card-v2 relative overflow-hidden min-h-[400px]">
          {/* Step 1: Business Type */}
          <div className={`transition-all duration-500 ${currentStep === 1 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8 absolute inset-0 pointer-events-none'}`}>
            <div className="p-2">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Select Business Type</h2>
              <p className="text-gray-500 mb-6">Choose the option that best describes your business</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setFormData(prev => ({ ...prev, businessType: 'REGISTERED_COMPANY' }))}
                  className={`card-v2 p-5 sm:p-6 text-left transition-all ${
                    formData.businessType === 'REGISTERED_COMPANY'
                      ? 'border-2 border-ghana-green bg-gradient-to-br from-ghana-green/5 to-transparent shadow-lg shadow-ghana-green/10'
                      : 'border-2 border-gray-100 hover:border-gray-200 hover:shadow-md'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                    formData.businessType === 'REGISTERED_COMPANY' ? 'bg-ghana-green/15' : 'bg-ghana-green/10'
                  }`}>
                    <Icon name="domain" size={24} className="text-ghana-green" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Registered Company</h3>
                  <p className="text-sm text-gray-500">Your business is registered with the Registrar General's Department</p>
                  {formData.businessType === 'REGISTERED_COMPANY' && (
                    <div className="mt-3 flex items-center gap-1 text-green-600 text-sm font-medium">
                      <Icon name="check_circle" size={16} />
                      <span>Selected</span>
                    </div>
                  )}
                </button>

                <button
                  onClick={() => setFormData(prev => ({ ...prev, businessType: 'INDIVIDUAL' }))}
                  className={`card-v2 p-5 sm:p-6 text-left transition-all ${
                    formData.businessType === 'INDIVIDUAL'
                      ? 'border-2 border-ghana-gold bg-gradient-to-br from-ghana-gold/5 to-transparent shadow-lg shadow-ghana-gold/10'
                      : 'border-2 border-gray-100 hover:border-gray-200 hover:shadow-md'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                    formData.businessType === 'INDIVIDUAL' ? 'bg-ghana-gold/15' : 'bg-ghana-gold/10'
                  }`}>
                    <Icon name="person" size={24} className="text-ghana-gold" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Individual</h3>
                  <p className="text-sm text-gray-500">You operate as an individual without formal business registration</p>
                  {formData.businessType === 'INDIVIDUAL' && (
                    <div className="mt-3 flex items-center gap-1 text-amber-600 text-sm font-medium">
                      <Icon name="check_circle" size={16} />
                      <span>Selected</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: Personal Details */}
          <div className={`transition-all duration-500 ${currentStep === 2 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8 absolute inset-0 pointer-events-none'}`}>
            <div className="p-2">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Personal Details</h2>
              <p className="text-gray-500 mb-6">Enter your legal information as it appears on your ID</p>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Owner's Full Legal Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Enter your full legal name"
                    value={formData.ownerLegalName}
                    onChange={(e) => setFormData(prev => ({ ...prev, ownerLegalName: e.target.value }))}
                  />
                </div>

                {formData.businessType === 'REGISTERED_COMPANY' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Registered Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="input-field w-full"
                        placeholder="Enter your registered business name"
                        value={formData.businessRegName}
                        onChange={(e) => setFormData(prev => ({ ...prev, businessRegName: e.target.value }))}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          TIN Number
                        </label>
                        <input
                          type="text"
                          className="input-field w-full"
                          placeholder="e.g., GC123456789"
                          value={formData.tinNumber}
                          onChange={(e) => setFormData(prev => ({ ...prev, tinNumber: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Registration/Incorporation Number
                        </label>
                        <input
                          type="text"
                          className="input-field w-full"
                          placeholder="e.g., BN-123456"
                          value={formData.registrationNumber}
                          onChange={(e) => setFormData(prev => ({ ...prev, registrationNumber: e.target.value }))}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Step 3: Document Uploads */}
          <div className={`transition-all duration-500 ${currentStep === 3 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8 absolute inset-0 pointer-events-none'}`}>
            <div className="p-2">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Document Uploads</h2>
              <p className="text-gray-500 mb-6">Upload clear photos of your documents</p>

              <div className="space-y-6">
                {/* Government ID */}
                <div className="card-v2 p-4 border-2 border-dashed border-gray-200 hover:border-ghana-green/50 transition-colors">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Government-Issued ID <span className="text-red-500">*</span>
                  </label>
                  <p className="text-sm text-gray-500 mb-3">Ghana Card, Passport, or Voter's ID</p>
                  <div className="flex items-start gap-4">
                    <input
                      ref={fileInputRefs.governmentId}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={(e) => handleFileChange('governmentId', e)}
                      className="hidden"
                    />
                    <div 
                      className="w-32 h-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-ghana-green hover:bg-ghana-green/5 transition-all group"
                      onClick={() => fileInputRefs.governmentId.current?.click()}
                    >
                      {uploadedFiles.governmentIdUrl ? (
                        <div className="relative w-full h-full">
                          {uploadedFiles.governmentIdUrl.endsWith('.pdf') ? (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                              <Icon name="description" size={32} className="text-gray-400" />
                            </div>
                          ) : (
                            <img src={uploadedFiles.governmentIdUrl} alt="Government ID" className="w-full h-full object-cover" />
                          )}
                          {uploading.governmentId && (
                            <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
                              <div className="w-8 h-8 border-3 border-ghana-green border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                          <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                            <Icon name="check" size={12} className="text-white" />
                          </div>
                          <div className="absolute inset-0 bg-ghana-green/0 group-hover:bg-ghana-green/10 transition-colors" />
                        </div>
                      ) : (
                        <div className="text-center">
                          {uploading.governmentId ? (
                            <div className="w-8 h-8 border-3 border-ghana-green border-t-transparent rounded-full animate-spin mx-auto" />
                          ) : (
                            <Icon name="upload" size={24} className="text-gray-400 mx-auto group-hover:text-ghana-green transition-colors" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <button
                        type="button"
                        onClick={() => fileInputRefs.governmentId.current?.click()}
                        disabled={uploading.governmentId}
                        className="btn-secondary btn-ripple text-sm py-2 px-4"
                      >
                        {uploadedFiles.governmentIdUrl ? 'Change File' : 'Upload File'}
                      </button>
                      {uploadedFiles.governmentIdUrl && (
                        <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                          <Icon name="check_circle" size={12} />
                          File uploaded successfully
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Selfie with ID */}
                <div className="card-v2 p-4 border-2 border-dashed border-gray-200 hover:border-ghana-green/50 transition-colors">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selfie Holding ID <span className="text-red-500">*</span>
                  </label>
                  <p className="text-sm text-gray-500 mb-3">Take a clear selfie holding your ID document</p>
                  <div className="flex items-start gap-4">
                    <input
                      ref={fileInputRefs.selfieWithId}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleFileChange('selfieWithId', e)}
                      className="hidden"
                    />
                    <div 
                      className="w-32 h-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-ghana-green hover:bg-ghana-green/5 transition-all group"
                      onClick={() => fileInputRefs.selfieWithId.current?.click()}
                    >
                      {uploadedFiles.selfieWithIdUrl ? (
                        <div className="relative w-full h-full">
                          <img src={uploadedFiles.selfieWithIdUrl} alt="Selfie with ID" className="w-full h-full object-cover" />
                          {uploading.selfieWithId && (
                            <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
                              <div className="w-8 h-8 border-3 border-ghana-green border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                          <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                            <Icon name="check" size={12} className="text-white" />
                          </div>
                          <div className="absolute inset-0 bg-ghana-green/0 group-hover:bg-ghana-green/10 transition-colors" />
                        </div>
                      ) : (
                        <div className="text-center">
                          {uploading.selfieWithId ? (
                            <div className="w-8 h-8 border-3 border-ghana-green border-t-transparent rounded-full animate-spin mx-auto" />
                          ) : (
                            <Icon name="photo_camera" size={24} className="text-gray-400 mx-auto group-hover:text-ghana-green transition-colors" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <button
                        type="button"
                        onClick={() => fileInputRefs.selfieWithId.current?.click()}
                        disabled={uploading.selfieWithId}
                        className="btn-secondary btn-ripple text-sm py-2 px-4"
                      >
                        {uploadedFiles.selfieWithIdUrl ? 'Change File' : 'Upload Selfie'}
                      </button>
                      {uploadedFiles.selfieWithIdUrl && (
                        <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                          <Icon name="check_circle" size={12} />
                          File uploaded successfully
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Business Certificate (for registered companies) */}
                {formData.businessType === 'REGISTERED_COMPANY' && (
                  <div className="card-v2 p-4 border-2 border-dashed border-gray-200 hover:border-ghana-green/50 transition-colors">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Registration Certificate <span className="text-red-500">*</span>
                    </label>
                    <p className="text-sm text-gray-500 mb-3">Upload your business registration certificate</p>
                    <div className="flex items-start gap-4">
                      <input
                        ref={fileInputRefs.businessCert}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(e) => handleFileChange('businessCert', e)}
                        className="hidden"
                      />
                      <div 
                        className="w-32 h-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-ghana-green hover:bg-ghana-green/5 transition-all group"
                        onClick={() => fileInputRefs.businessCert.current?.click()}
                      >
                        {uploadedFiles.businessCertUrl ? (
                          <div className="relative w-full h-full">
                            {uploadedFiles.businessCertUrl.endsWith('.pdf') ? (
                              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                <Icon name="description" size={32} className="text-gray-400" />
                              </div>
                            ) : (
                              <img src={uploadedFiles.businessCertUrl} alt="Business Certificate" className="w-full h-full object-cover" />
                            )}
                            {uploading.businessCert && (
                              <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
                                <div className="w-8 h-8 border-3 border-ghana-green border-t-transparent rounded-full animate-spin" />
                              </div>
                            )}
                            <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                              <Icon name="check" size={12} className="text-white" />
                            </div>
                            <div className="absolute inset-0 bg-ghana-green/0 group-hover:bg-ghana-green/10 transition-colors" />
                          </div>
                        ) : (
                          <div className="text-center">
                            {uploading.businessCert ? (
                              <div className="w-8 h-8 border-3 border-ghana-green border-t-transparent rounded-full animate-spin mx-auto" />
                            ) : (
                              <Icon name="upload" size={24} className="text-gray-400 mx-auto group-hover:text-ghana-green transition-colors" />
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <button
                          type="button"
                          onClick={() => fileInputRefs.businessCert.current?.click()}
                          disabled={uploading.businessCert}
                          className="btn-secondary btn-ripple text-sm py-2 px-4"
                        >
                          {uploadedFiles.businessCertUrl ? 'Change File' : 'Upload Certificate'}
                        </button>
                        {uploadedFiles.businessCertUrl && (
                          <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                            <Icon name="check_circle" size={12} />
                            File uploaded successfully
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Proof of Address (for individuals) */}
                {formData.businessType === 'INDIVIDUAL' && (
                  <div className="card-v2 p-4 border-2 border-dashed border-gray-200 hover:border-ghana-green/50 transition-colors">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Proof of Address <span className="text-red-500">*</span>
                    </label>
                    <p className="text-sm text-gray-500 mb-3">Utility bill or bank statement (last 3 months)</p>
                    <div className="flex items-start gap-4">
                      <input
                        ref={fileInputRefs.proofOfAddress}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(e) => handleFileChange('proofOfAddress', e)}
                        className="hidden"
                      />
                      <div 
                        className="w-32 h-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-ghana-green hover:bg-ghana-green/5 transition-all group"
                        onClick={() => fileInputRefs.proofOfAddress.current?.click()}
                      >
                        {uploadedFiles.proofOfAddressUrl ? (
                          <div className="relative w-full h-full">
                            {uploadedFiles.proofOfAddressUrl.endsWith('.pdf') ? (
                              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                <Icon name="description" size={32} className="text-gray-400" />
                              </div>
                            ) : (
                              <img src={uploadedFiles.proofOfAddressUrl} alt="Proof of Address" className="w-full h-full object-cover" />
                            )}
                            {uploading.proofOfAddress && (
                              <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
                                <div className="w-8 h-8 border-3 border-ghana-green border-t-transparent rounded-full animate-spin" />
                              </div>
                            )}
                            <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                              <Icon name="check" size={12} className="text-white" />
                            </div>
                            <div className="absolute inset-0 bg-ghana-green/0 group-hover:bg-ghana-green/10 transition-colors" />
                          </div>
                        ) : (
                          <div className="text-center">
                            {uploading.proofOfAddress ? (
                              <div className="w-8 h-8 border-3 border-ghana-green border-t-transparent rounded-full animate-spin mx-auto" />
                            ) : (
                              <Icon name="home" size={24} className="text-gray-400 mx-auto group-hover:text-ghana-green transition-colors" />
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <button
                          type="button"
                          onClick={() => fileInputRefs.proofOfAddress.current?.click()}
                          disabled={uploading.proofOfAddress}
                          className="btn-secondary btn-ripple text-sm py-2 px-4"
                        >
                          {uploadedFiles.proofOfAddressUrl ? 'Change File' : 'Upload Document'}
                        </button>
                        {uploadedFiles.proofOfAddressUrl && (
                          <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                            <Icon name="check_circle" size={12} />
                            File uploaded successfully
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 4: Video Verification */}
          <div className={`transition-all duration-500 ${currentStep === 4 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8 absolute inset-0 pointer-events-none'}`}>
            <div className="p-2">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Video Verification</h2>
              <p className="text-gray-500 mb-6">Record videos showing your salon location (max 50MB each)</p>

              <div className="space-y-6">
                {/* Storefront Video */}
                <div className="card-v2 p-4 border-2 border-dashed border-gray-200 hover:border-blue-400/50 transition-colors">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Storefront Video <span className="text-red-500">*</span>
                  </label>
                  <p className="text-sm text-gray-500 mb-3">Record a clear video showing the front of your salon with the business sign visible</p>
                  <div className="flex items-start gap-4">
                    <input
                      ref={fileInputRefs.storefrontVideo}
                      type="file"
                      accept="video/*"
                      onChange={(e) => handleFileChange('storefrontVideo', e)}
                      className="hidden"
                    />
                    <div 
                      className="w-40 h-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 transition-all group"
                      onClick={() => fileInputRefs.storefrontVideo.current?.click()}
                    >
                      {uploadedFiles.storefrontVideoUrl ? (
                        <div className="relative w-full h-full">
                          <video src={uploadedFiles.storefrontVideoUrl} className="w-full h-full object-cover" />
                          {uploading.storefrontVideo && (
                            <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
                              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                          <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                            <Icon name="check" size={12} className="text-white" />
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                            <Icon name="play_arrow" size={32} className="text-white drop-shadow-lg" />
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          {uploading.storefrontVideo ? (
                            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                          ) : (
                            <Icon name="videocam" size={28} className="text-gray-400 mx-auto group-hover:text-blue-500 transition-colors" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <button
                        type="button"
                        onClick={() => fileInputRefs.storefrontVideo.current?.click()}
                        disabled={uploading.storefrontVideo}
                        className="btn-secondary btn-ripple text-sm py-2 px-4 border-blue-200 text-blue-700 hover:bg-blue-50"
                      >
                        {uploadedFiles.storefrontVideoUrl ? 'Change Video' : 'Upload Video'}
                      </button>
                      {uploadedFiles.storefrontVideoUrl && (
                        <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                          <Icon name="check_circle" size={12} />
                          Video uploaded successfully
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Interior Video */}
                <div className="card-v2 p-4 border-2 border-dashed border-gray-200 hover:border-blue-400/50 transition-colors">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Interior Video <span className="text-red-500">*</span>
                  </label>
                  <p className="text-sm text-gray-500 mb-3">Record a video walkthrough of the inside of your salon</p>
                  <div className="flex items-start gap-4">
                    <input
                      ref={fileInputRefs.interiorVideo}
                      type="file"
                      accept="video/*"
                      onChange={(e) => handleFileChange('interiorVideo', e)}
                      className="hidden"
                    />
                    <div 
                      className="w-40 h-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 transition-all group"
                      onClick={() => fileInputRefs.interiorVideo.current?.click()}
                    >
                      {uploadedFiles.interiorVideoUrl ? (
                        <div className="relative w-full h-full">
                          <video src={uploadedFiles.interiorVideoUrl} className="w-full h-full object-cover" />
                          {uploading.interiorVideo && (
                            <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
                              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                          <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                            <Icon name="check" size={12} className="text-white" />
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                            <Icon name="play_arrow" size={32} className="text-white drop-shadow-lg" />
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          {uploading.interiorVideo ? (
                            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                          ) : (
                            <Icon name="video_camera_back" size={28} className="text-gray-400 mx-auto group-hover:text-blue-500 transition-colors" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <button
                        type="button"
                        onClick={() => fileInputRefs.interiorVideo.current?.click()}
                        disabled={uploading.interiorVideo}
                        className="btn-secondary btn-ripple text-sm py-2 px-4 border-blue-200 text-blue-700 hover:bg-blue-50"
                      >
                        {uploadedFiles.interiorVideoUrl ? 'Change Video' : 'Upload Video'}
                      </button>
                      {uploadedFiles.interiorVideoUrl && (
                        <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                          <Icon name="check_circle" size={12} />
                          Video uploaded successfully
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 5: Review & Submit */}
          <div className={`transition-all duration-500 ${currentStep === 5 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8 absolute inset-0 pointer-events-none'}`}>
            <div className="p-2">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Review & Submit</h2>
              <p className="text-gray-500 mb-6">Please review your information before submitting</p>

              <div className="space-y-6">
                {/* Business Information */}
                <div className="card-v2 p-5 bg-gradient-to-br from-gray-50 to-transparent border border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Icon name="business" size={18} className="text-ghana-green" />
                    Business Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Business Type:</span>
                      <span className="font-semibold text-gray-900">
                        {formData.businessType === 'REGISTERED_COMPANY' ? 'Registered Company' : 'Individual'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Owner's Name:</span>
                      <span className="font-semibold text-gray-900">{formData.ownerLegalName}</span>
                    </div>
                    {formData.businessType === 'REGISTERED_COMPANY' && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Business Name:</span>
                          <span className="font-semibold text-gray-900">{formData.businessRegName}</span>
                        </div>
                        {formData.tinNumber && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">TIN Number:</span>
                            <span className="font-semibold text-gray-900">{formData.tinNumber}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Documents */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Icon name="description" size={18} className="text-ghana-gold" />
                    Uploaded Documents
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {uploadedFiles.governmentIdUrl && (
                      <div className="card-v2 aspect-square overflow-hidden p-0">
                        {uploadedFiles.governmentIdUrl.endsWith('.pdf') ? (
                          <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center">
                            <Icon name="description" size={32} className="text-gray-400 mb-2" />
                            <span className="text-xs text-gray-500">Gov ID</span>
                          </div>
                        ) : (
                          <img src={uploadedFiles.governmentIdUrl} alt="Government ID" className="w-full h-full object-cover" />
                        )}
                      </div>
                    )}
                    {uploadedFiles.selfieWithIdUrl && (
                      <div className="card-v2 aspect-square overflow-hidden p-0">
                        <img src={uploadedFiles.selfieWithIdUrl} alt="Selfie with ID" className="w-full h-full object-cover" />
                      </div>
                    )}
                    {uploadedFiles.businessCertUrl && (
                      <div className="card-v2 aspect-square overflow-hidden p-0">
                        {uploadedFiles.businessCertUrl.endsWith('.pdf') ? (
                          <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center">
                            <Icon name="description" size={32} className="text-gray-400 mb-2" />
                            <span className="text-xs text-gray-500">Certificate</span>
                          </div>
                        ) : (
                          <img src={uploadedFiles.businessCertUrl} alt="Business Certificate" className="w-full h-full object-cover" />
                        )}
                      </div>
                    )}
                    {uploadedFiles.proofOfAddressUrl && (
                      <div className="card-v2 aspect-square overflow-hidden p-0">
                        {uploadedFiles.proofOfAddressUrl.endsWith('.pdf') ? (
                          <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center">
                            <Icon name="description" size={32} className="text-gray-400 mb-2" />
                            <span className="text-xs text-gray-500">Address</span>
                          </div>
                        ) : (
                          <img src={uploadedFiles.proofOfAddressUrl} alt="Proof of Address" className="w-full h-full object-cover" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Videos */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Icon name="videocam" size={18} className="text-blue-500" />
                    Uploaded Videos
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {uploadedFiles.storefrontVideoUrl && (
                      <div className="card-v2 p-3 overflow-hidden">
                        <p className="text-xs text-gray-500 mb-2">Storefront</p>
                        <div className="aspect-video rounded-lg overflow-hidden">
                          <video src={uploadedFiles.storefrontVideoUrl} controls className="w-full h-full object-cover" />
                        </div>
                      </div>
                    )}
                    {uploadedFiles.interiorVideoUrl && (
                      <div className="card-v2 p-3 overflow-hidden">
                        <p className="text-xs text-gray-500 mb-2">Interior</p>
                        <div className="aspect-video rounded-lg overflow-hidden">
                          <video src={uploadedFiles.interiorVideoUrl} controls className="w-full h-full object-cover" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notice */}
                <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon name="verified_user" size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900">Verification Process</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Your submission will be reviewed within 1-2 business days. You'll receive a notification once your verification is complete.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 1}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
                currentStep === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100 hover:shadow-sm'
              }`}
            >
              <Icon name="arrow_back" size={18} />
              Previous
            </button>

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                className="btn-primary btn-ripple flex items-center gap-2"
              >
                Next
                <Icon name="arrow_forward" size={18} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !isFormComplete()}
                className="btn-primary btn-ripple flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Icon name="progress_activity" size={18} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Icon name="check_circle" size={18} />
                    Submit for Verification
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
      </div>
    </Layout>
  )
}
