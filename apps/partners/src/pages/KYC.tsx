import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, User, FileText, Video, CheckCircle, ArrowRight, ArrowLeft,
  Upload, Loader2, AlertCircle, Shield, Check, X, Play, FileImage
} from 'lucide-react'
import Layout from '../components/Layout'
import { api, KycSubmission } from '../lib/api'

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
  { number: 1, title: 'Business Type', icon: Building2 },
  { number: 2, title: 'Personal Details', icon: User },
  { number: 3, title: 'Documents', icon: FileText },
  { number: 4, title: 'Video Verification', icon: Video },
  { number: 5, title: 'Review & Submit', icon: CheckCircle },
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
    <div className="max-w-3xl mx-auto">
      <div className="card">
        {/* Status Header */}
        <div className={`text-center py-8 ${kycStatus === 'APPROVED' ? 'bg-green-50' : 'bg-blue-50'} rounded-t-lg -mx-6 -mt-6 mb-6 px-6`}>
          <div className={`w-20 h-20 ${kycStatus === 'APPROVED' ? 'bg-green-100' : 'bg-blue-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
            {kycStatus === 'APPROVED' ? (
              <CheckCircle className="w-10 h-10 text-green-600" />
            ) : (
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
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
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Business Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Business Type</p>
                <p className="font-medium text-gray-900">
                  {existingKyc?.businessType === 'REGISTERED_COMPANY' ? 'Registered Company' : 'Individual'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Owner's Legal Name</p>
                <p className="font-medium text-gray-900">{existingKyc?.ownerLegalName}</p>
              </div>
              {existingKyc?.businessType === 'REGISTERED_COMPANY' && (
                <>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Business Registered Name</p>
                    <p className="font-medium text-gray-900">{existingKyc?.businessRegName}</p>
                  </div>
                  {existingKyc?.tinNumber && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">TIN Number</p>
                      <p className="font-medium text-gray-900">{existingKyc?.tinNumber}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Documents */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Uploaded Documents</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {existingKyc?.governmentIdUrl && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">Government ID</p>
                  <img src={existingKyc.governmentIdUrl} alt="Government ID" className="w-full h-32 object-cover rounded" />
                </div>
              )}
              {existingKyc?.selfieWithIdUrl && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">Selfie with ID</p>
                  <img src={existingKyc.selfieWithIdUrl} alt="Selfie with ID" className="w-full h-32 object-cover rounded" />
                </div>
              )}
              {existingKyc?.businessCertUrl && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">Business Certificate</p>
                  <img src={existingKyc.businessCertUrl} alt="Business Certificate" className="w-full h-32 object-cover rounded" />
                </div>
              )}
              {existingKyc?.proofOfAddressUrl && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">Proof of Address</p>
                  <img src={existingKyc.proofOfAddressUrl} alt="Proof of Address" className="w-full h-32 object-cover rounded" />
                </div>
              )}
            </div>
          </div>

          {/* Videos */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Video Verification</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {existingKyc?.storefrontVideoUrl && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">Storefront Video</p>
                  <video src={existingKyc.storefrontVideoUrl} controls className="w-full h-40 rounded" />
                </div>
              )}
              {existingKyc?.interiorVideoUrl && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">Interior Video</p>
                  <video src={existingKyc.interiorVideoUrl} controls className="w-full h-40 rounded" />
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
    <div className="max-w-3xl mx-auto">
      {/* Rejection Banner */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800">Verification Rejected</h3>
            <p className="text-red-700 text-sm mt-1">{existingKyc?.rejectionReason || 'Your submission did not meet our requirements.'}</p>
          </div>
        </div>
      </div>

      {/* Re-submit option */}
      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Re-submit Verification</h3>
            <p className="text-sm text-gray-500">Please address the issues above and submit again.</p>
          </div>
          <button
            onClick={() => setKycStatus('NONE')}
            className="btn-primary flex items-center gap-2"
          >
            Re-submit
            <ArrowRight className="w-4 h-4" />
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
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-ghana-green border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading verification status...</p>
        </div>
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Business Verification</h1>
        <p className="text-gray-500">Complete your KYC to start receiving bookings</p>
      </div>

      <div className="max-w-3xl mx-auto">
        {/* Progress Stepper */}
        <div className="card mb-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      currentStep === step.number
                        ? 'bg-ghana-green text-white'
                        : currentStep > step.number
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {currentStep > step.number ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={`text-xs mt-1 hidden sm:block ${
                    currentStep >= step.number ? 'text-gray-900 font-medium' : 'text-gray-400'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 sm:w-16 h-0.5 mx-2 ${
                    currentStep > step.number ? 'bg-green-300' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="card">
          {/* Step 1: Business Type */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Select Business Type</h2>
              <p className="text-gray-500 mb-6">Choose the option that best describes your business</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <button
                  onClick={() => setFormData(prev => ({ ...prev, businessType: 'REGISTERED_COMPANY' }))}
                  className={`p-4 sm:p-6 rounded-lg border-2 text-left transition-all ${
                    formData.businessType === 'REGISTERED_COMPANY'
                      ? 'border-ghana-green bg-ghana-green/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-ghana-green/10 flex items-center justify-center mb-3 sm:mb-4">
                    <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-ghana-green" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Registered Company</h3>
                  <p className="text-sm text-gray-500">Your business is registered with the Registrar General's Department</p>
                </button>

                <button
                  onClick={() => setFormData(prev => ({ ...prev, businessType: 'INDIVIDUAL' }))}
                  className={`p-4 sm:p-6 rounded-lg border-2 text-left transition-all ${
                    formData.businessType === 'INDIVIDUAL'
                      ? 'border-ghana-green bg-ghana-green/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-ghana-gold/10 flex items-center justify-center mb-3 sm:mb-4">
                    <User className="w-5 h-5 sm:w-6 sm:h-6 text-ghana-gold" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Individual</h3>
                  <p className="text-sm text-gray-500">You operate as an individual without formal business registration</p>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Personal Details */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Personal Details</h2>
              <p className="text-gray-500 mb-6">Enter your legal information as it appears on your ID</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
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
          )}

          {/* Step 3: Document Uploads */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Document Uploads</h2>
              <p className="text-gray-500 mb-6">Upload clear photos of your documents</p>

              <div className="space-y-6">
                {/* Government ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      className="w-32 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-ghana-green transition-colors"
                      onClick={() => fileInputRefs.governmentId.current?.click()}
                    >
                      {uploadedFiles.governmentIdUrl ? (
                        <div className="relative w-full h-full">
                          {uploadedFiles.governmentIdUrl.endsWith('.pdf') ? (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                              <FileImage className="w-8 h-8 text-gray-400" />
                            </div>
                          ) : (
                            <img src={uploadedFiles.governmentIdUrl} alt="Government ID" className="w-full h-full object-cover" />
                          )}
                          {uploading.governmentId && (
                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                              <Loader2 className="w-6 h-6 animate-spin text-ghana-green" />
                            </div>
                          )}
                          <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          {uploading.governmentId ? (
                            <Loader2 className="w-6 h-6 animate-spin text-ghana-green mx-auto" />
                          ) : (
                            <Upload className="w-6 h-6 text-gray-400 mx-auto" />
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRefs.governmentId.current?.click()}
                      disabled={uploading.governmentId}
                      className="btn-secondary text-sm py-2"
                    >
                      {uploadedFiles.governmentIdUrl ? 'Change File' : 'Upload'}
                    </button>
                  </div>
                </div>

                {/* Selfie with ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      className="w-32 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-ghana-green transition-colors"
                      onClick={() => fileInputRefs.selfieWithId.current?.click()}
                    >
                      {uploadedFiles.selfieWithIdUrl ? (
                        <div className="relative w-full h-full">
                          <img src={uploadedFiles.selfieWithIdUrl} alt="Selfie with ID" className="w-full h-full object-cover" />
                          {uploading.selfieWithId && (
                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                              <Loader2 className="w-6 h-6 animate-spin text-ghana-green" />
                            </div>
                          )}
                          <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          {uploading.selfieWithId ? (
                            <Loader2 className="w-6 h-6 animate-spin text-ghana-green mx-auto" />
                          ) : (
                            <Upload className="w-6 h-6 text-gray-400 mx-auto" />
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRefs.selfieWithId.current?.click()}
                      disabled={uploading.selfieWithId}
                      className="btn-secondary text-sm py-2"
                    >
                      {uploadedFiles.selfieWithIdUrl ? 'Change File' : 'Upload'}
                    </button>
                  </div>
                </div>

                {/* Business Certificate (for registered companies) */}
                {formData.businessType === 'REGISTERED_COMPANY' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        className="w-32 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-ghana-green transition-colors"
                        onClick={() => fileInputRefs.businessCert.current?.click()}
                      >
                        {uploadedFiles.businessCertUrl ? (
                          <div className="relative w-full h-full">
                            {uploadedFiles.businessCertUrl.endsWith('.pdf') ? (
                              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                <FileImage className="w-8 h-8 text-gray-400" />
                              </div>
                            ) : (
                              <img src={uploadedFiles.businessCertUrl} alt="Business Certificate" className="w-full h-full object-cover" />
                            )}
                            {uploading.businessCert && (
                              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-ghana-green" />
                              </div>
                            )}
                            <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="text-center">
                            {uploading.businessCert ? (
                              <Loader2 className="w-6 h-6 animate-spin text-ghana-green mx-auto" />
                            ) : (
                              <Upload className="w-6 h-6 text-gray-400 mx-auto" />
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRefs.businessCert.current?.click()}
                        disabled={uploading.businessCert}
                        className="btn-secondary text-sm py-2"
                      >
                        {uploadedFiles.businessCertUrl ? 'Change File' : 'Upload'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Proof of Address (for individuals) */}
                {formData.businessType === 'INDIVIDUAL' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        className="w-32 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-ghana-green transition-colors"
                        onClick={() => fileInputRefs.proofOfAddress.current?.click()}
                      >
                        {uploadedFiles.proofOfAddressUrl ? (
                          <div className="relative w-full h-full">
                            {uploadedFiles.proofOfAddressUrl.endsWith('.pdf') ? (
                              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                <FileImage className="w-8 h-8 text-gray-400" />
                              </div>
                            ) : (
                              <img src={uploadedFiles.proofOfAddressUrl} alt="Proof of Address" className="w-full h-full object-cover" />
                            )}
                            {uploading.proofOfAddress && (
                              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-ghana-green" />
                              </div>
                            )}
                            <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="text-center">
                            {uploading.proofOfAddress ? (
                              <Loader2 className="w-6 h-6 animate-spin text-ghana-green mx-auto" />
                            ) : (
                              <Upload className="w-6 h-6 text-gray-400 mx-auto" />
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRefs.proofOfAddress.current?.click()}
                        disabled={uploading.proofOfAddress}
                        className="btn-secondary text-sm py-2"
                      >
                        {uploadedFiles.proofOfAddressUrl ? 'Change File' : 'Upload'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Video Verification */}
          {currentStep === 4 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Video Verification</h2>
              <p className="text-gray-500 mb-6">Record videos showing your salon location (max 50MB each)</p>

              <div className="space-y-6">
                {/* Storefront Video */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      className="w-40 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-ghana-green transition-colors"
                      onClick={() => fileInputRefs.storefrontVideo.current?.click()}
                    >
                      {uploadedFiles.storefrontVideoUrl ? (
                        <div className="relative w-full h-full">
                          <video src={uploadedFiles.storefrontVideoUrl} className="w-full h-full object-cover" />
                          {uploading.storefrontVideo && (
                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                              <Loader2 className="w-6 h-6 animate-spin text-ghana-green" />
                            </div>
                          )}
                          <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Play className="w-8 h-8 text-white drop-shadow-lg" />
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          {uploading.storefrontVideo ? (
                            <Loader2 className="w-6 h-6 animate-spin text-ghana-green mx-auto" />
                          ) : (
                            <Video className="w-6 h-6 text-gray-400 mx-auto" />
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRefs.storefrontVideo.current?.click()}
                      disabled={uploading.storefrontVideo}
                      className="btn-secondary text-sm py-2"
                    >
                      {uploadedFiles.storefrontVideoUrl ? 'Change Video' : 'Upload Video'}
                    </button>
                  </div>
                </div>

                {/* Interior Video */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      className="w-40 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-ghana-green transition-colors"
                      onClick={() => fileInputRefs.interiorVideo.current?.click()}
                    >
                      {uploadedFiles.interiorVideoUrl ? (
                        <div className="relative w-full h-full">
                          <video src={uploadedFiles.interiorVideoUrl} className="w-full h-full object-cover" />
                          {uploading.interiorVideo && (
                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                              <Loader2 className="w-6 h-6 animate-spin text-ghana-green" />
                            </div>
                          )}
                          <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Play className="w-8 h-8 text-white drop-shadow-lg" />
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          {uploading.interiorVideo ? (
                            <Loader2 className="w-6 h-6 animate-spin text-ghana-green mx-auto" />
                          ) : (
                            <Video className="w-6 h-6 text-gray-400 mx-auto" />
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRefs.interiorVideo.current?.click()}
                      disabled={uploading.interiorVideo}
                      className="btn-secondary text-sm py-2"
                    >
                      {uploadedFiles.interiorVideoUrl ? 'Change Video' : 'Upload Video'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review & Submit */}
          {currentStep === 5 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Review & Submit</h2>
              <p className="text-gray-500 mb-6">Please review your information before submitting</p>

              <div className="space-y-6">
                {/* Business Information */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Business Information</h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Business Type:</span>
                      <span className="ml-2 font-medium">
                        {formData.businessType === 'REGISTERED_COMPANY' ? 'Registered Company' : 'Individual'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Owner's Name:</span>
                      <span className="ml-2 font-medium">{formData.ownerLegalName}</span>
                    </div>
                    {formData.businessType === 'REGISTERED_COMPANY' && (
                      <>
                        <div>
                          <span className="text-gray-500">Business Name:</span>
                          <span className="ml-2 font-medium">{formData.businessRegName}</span>
                        </div>
                        {formData.tinNumber && (
                          <div>
                            <span className="text-gray-500">TIN Number:</span>
                            <span className="ml-2 font-medium">{formData.tinNumber}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Documents */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Uploaded Documents</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {uploadedFiles.governmentIdUrl && (
                      <div className="aspect-square rounded-lg overflow-hidden">
                        {uploadedFiles.governmentIdUrl.endsWith('.pdf') ? (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <FileImage className="w-8 h-8 text-gray-400" />
                          </div>
                        ) : (
                          <img src={uploadedFiles.governmentIdUrl} alt="Government ID" className="w-full h-full object-cover" />
                        )}
                      </div>
                    )}
                    {uploadedFiles.selfieWithIdUrl && (
                      <div className="aspect-square rounded-lg overflow-hidden">
                        <img src={uploadedFiles.selfieWithIdUrl} alt="Selfie with ID" className="w-full h-full object-cover" />
                      </div>
                    )}
                    {uploadedFiles.businessCertUrl && (
                      <div className="aspect-square rounded-lg overflow-hidden">
                        {uploadedFiles.businessCertUrl.endsWith('.pdf') ? (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <FileImage className="w-8 h-8 text-gray-400" />
                          </div>
                        ) : (
                          <img src={uploadedFiles.businessCertUrl} alt="Business Certificate" className="w-full h-full object-cover" />
                        )}
                      </div>
                    )}
                    {uploadedFiles.proofOfAddressUrl && (
                      <div className="aspect-square rounded-lg overflow-hidden">
                        {uploadedFiles.proofOfAddressUrl.endsWith('.pdf') ? (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <FileImage className="w-8 h-8 text-gray-400" />
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
                  <h3 className="font-medium text-gray-900 mb-3">Uploaded Videos</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {uploadedFiles.storefrontVideoUrl && (
                      <div className="aspect-video rounded-lg overflow-hidden">
                        <video src={uploadedFiles.storefrontVideoUrl} controls className="w-full h-full object-cover" />
                      </div>
                    )}
                    {uploadedFiles.interiorVideoUrl && (
                      <div className="aspect-video rounded-lg overflow-hidden">
                        <video src={uploadedFiles.interiorVideoUrl} controls className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Notice */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Verification Process</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Your submission will be reviewed within 1-2 business days. You'll receive a notification once your verification is complete.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 1}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentStep === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </button>

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                className="btn-primary flex items-center gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !isFormComplete()}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Submit for Verification
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
