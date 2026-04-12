import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Scissors, 
  ArrowLeft, 
  User, 
  Store, 
  Mail,
  UserCircle, 
  MapPin, 
  ShieldCheck, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Phone
} from 'lucide-react'

const API_BASE_URL = 'https://groomlinkgh.com/api'

type UserType = 'customer' | 'salon-owner' | null
type Step = 1 | 2 | 3

interface FormData {
  email: string
  phoneNumber: string
  firstName: string
  lastName: string
  salonName: string
  salonLocation: string
}

interface Toast {
  message: string
  type: 'success' | 'error'
}

export default function Register() {
  const navigate = useNavigate()
  
  // Redirect to customer login (which includes registration) on mount
  useEffect(() => {
    window.location.href = 'https://my.groomlinkgh.com/login'
  }, [])
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-ghana-green/5 via-white to-ghana-gold/10 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-ghana-green border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-600 mt-4">Redirecting to customer registration...</p>
      </div>
    </div>
  )
  
  // Rest of the component is kept for backward compatibility but unreachable
  const [step, setStep] = useState<Step>(1)
  const [userType, setUserType] = useState<UserType>(null)
  const [formData, setFormData] = useState<FormData>({
    email: '',
    phoneNumber: '',
    firstName: '',
    lastName: '',
    salonName: '',
    salonLocation: ''
  })
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<Toast | null>(null)
  const [timer, setTimer] = useState(600) // 10 minutes in seconds
  const [timerActive, setTimerActive] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    if (timerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timerActive, timer])

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timeout = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timeout)
    }
  }, [toast])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleUserTypeSelect = (type: UserType) => {
    setUserType(type)
    setErrors({})
  }

  const handleStep1Next = () => {
    if (!userType) {
      setErrors({ userType: 'Please select an account type' })
      return
    }
    setStep(2)
    setErrors({})
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const validatePhoneNumber = (phone: string): boolean => {
    // Accept Ghana phone numbers: +233XXXXXXXXX or 0XXXXXXXXX
    const phoneRegex = /^(\+233|0)[0-9]{9}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
  }

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!validateEmail(formData.email)) {
      newErrors.email = 'Enter a valid email address'
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required'
    } else if (!validatePhoneNumber(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Enter a valid Ghana phone number (e.g., +233XXXXXXXXX or 0XXXXXXXXX)'
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }

    if (userType === 'salon-owner') {
      if (!formData.salonName.trim()) {
        newErrors.salonName = 'Salon name is required'
      }
      if (!formData.salonLocation.trim()) {
        newErrors.salonLocation = 'Salon location is required'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSendOtp = async () => {
    if (!validateStep2()) return

    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/auth/otp/email/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email.toLowerCase().trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP')
      }

      setStep(3)
      setTimer(600)
      setTimerActive(true)
      setToast({ message: 'OTP sent to your email!', type: 'success' })
    } catch (error) {
      setToast({ 
        message: error instanceof Error ? error.message : 'Failed to send OTP', 
        type: 'error' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const newOtp = pastedData.split('')
    setOtp([...newOtp, ...Array(6 - newOtp.length).fill('')])
  }

  const handleResendOtp = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/auth/otp/email/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email.toLowerCase().trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to resend OTP')
      }

      setTimer(600)
      setTimerActive(true)
      setOtp(['', '', '', '', '', ''])
      setToast({ message: 'OTP resent successfully!', type: 'success' })
    } catch (error) {
      setToast({ 
        message: error instanceof Error ? error.message : 'Failed to resend OTP', 
        type: 'error' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    const otpCode = otp.join('')
    if (otpCode.length !== 6) {
      setErrors({ otp: 'Please enter the complete 6-digit code' })
      return
    }

    setIsLoading(true)
    try {
      const verifyResponse = await fetch(`${API_BASE_URL}/auth/otp/email/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formData.email.toLowerCase().trim(), 
          code: otpCode 
        })
      })

      const verifyData = await verifyResponse.json()

      if (!verifyResponse.ok) {
        throw new Error(verifyData.message || 'OTP verification failed')
      }

      // If new user, register them
      if (verifyData.isNewUser) {
        // Format phone number to +233 format for the API
        let formattedPhone = formData.phoneNumber.replace(/\s/g, '')
        if (formattedPhone.startsWith('0')) {
          formattedPhone = '+233' + formattedPhone.slice(1)
        }

        const registerResponse = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email.toLowerCase().trim(),
            phoneNumber: formattedPhone,
            firstName: formData.firstName,
            lastName: formData.lastName,
            role: userType === 'salon-owner' ? 'SALON_OWNER' : 'CUSTOMER'
          })
        })

        const registerData = await registerResponse.json()

        if (!registerResponse.ok) {
          throw new Error(registerData.message || 'Registration failed')
        }

        // Store tokens if provided
        if (registerData.tokens) {
          localStorage.setItem('accessToken', registerData.tokens.accessToken)
          localStorage.setItem('refreshToken', registerData.tokens.refreshToken)
        }
      } else {
        // Existing user - store tokens
        if (verifyData.tokens) {
          localStorage.setItem('accessToken', verifyData.tokens.accessToken)
          localStorage.setItem('refreshToken', verifyData.tokens.refreshToken)
        }
      }

      setIsRegistered(true)
      setToast({ message: 'Registration successful!', type: 'success' })
    } catch (error) {
      setToast({ 
        message: error instanceof Error ? error.message : 'Verification failed', 
        type: 'error' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGetStarted = () => {
    if (userType === 'salon-owner') {
      window.location.href = 'https://partners.groomlinkgh.com'
    } else {
      // Get token from localStorage for customer redirect
      const accessToken = localStorage.getItem('accessToken')
      if (accessToken) {
        window.location.href = `https://my.groomlinkgh.com?token=${accessToken}`
      } else {
        window.location.href = 'https://my.groomlinkgh.com'
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ghana-green/5 via-white to-ghana-gold/10">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-ghana-green via-ghana-gold to-ghana-red rounded-lg flex items-center justify-center">
                <Scissors className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 font-display">GroomLink</span>
            </Link>
            <Link 
              to="/" 
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {toast.message}
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="max-w-lg mx-auto">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    step >= s 
                      ? 'bg-ghana-green text-white shadow-md' 
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {step > s ? <CheckCircle className="w-5 h-5" /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-12 md:w-20 h-1 mx-2 rounded transition-colors ${
                    step > s ? 'bg-ghana-green' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: User Type Selection */}
          {step === 1 && (
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-2 font-display">
                Create Your Account
              </h1>
              <p className="text-gray-600 text-center mb-8">
                Choose how you want to use GroomLink
              </p>

              {errors.userType && (
                <p className="text-red-500 text-sm text-center mb-4">{errors.userType}</p>
              )}

              <div className="space-y-4">
                {/* Customer Card */}
                <button
                  onClick={() => handleUserTypeSelect('customer')}
                  className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
                    userType === 'customer'
                      ? 'border-ghana-green bg-ghana-green/5 shadow-lg'
                      : 'border-gray-200 hover:border-ghana-green/50 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      userType === 'customer' ? 'bg-ghana-green text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <User className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 font-display">I'm a Customer</h3>
                      <p className="text-gray-600 text-sm mt-1">
                        Book appointments with top salons and barbershops in Ghana. Discover new styles, read reviews, and schedule your next visit.
                      </p>
                    </div>
                    {userType === 'customer' && (
                      <CheckCircle className="w-6 h-6 text-ghana-green flex-shrink-0" />
                    )}
                  </div>
                </button>

                {/* Salon Owner Card */}
                <button
                  onClick={() => handleUserTypeSelect('salon-owner')}
                  className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
                    userType === 'salon-owner'
                      ? 'border-ghana-gold bg-ghana-gold/10 shadow-lg'
                      : 'border-gray-200 hover:border-ghana-gold hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      userType === 'salon-owner' ? 'bg-ghana-gold text-gray-900' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Store className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 font-display">I'm a Salon Owner</h3>
                      <p className="text-gray-600 text-sm mt-1">
                        Manage your salon business with our powerful dashboard. Handle bookings, staff, inventory, and grow your customer base.
                      </p>
                    </div>
                    {userType === 'salon-owner' && (
                      <CheckCircle className="w-6 h-6 text-ghana-gold flex-shrink-0" />
                    )}
                  </div>
                </button>
              </div>

              <button
                onClick={handleStep1Next}
                className="w-full mt-8 bg-ghana-green hover:bg-ghana-green/90 text-white font-semibold py-3 rounded-xl transition-all shadow-md text-center"
              >
                Continue
              </button>

              <p className="text-center text-gray-600 mt-6">
                Already have an account?{' '}
                <Link to="/login" className="text-ghana-green hover:text-ghana-green/80 font-medium transition-colors">
                  Sign In
                </Link>
              </p>
            </div>
          )}

          {/* Step 2: Phone + Details */}
          {step === 2 && (
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-2 font-display">
                {userType === 'salon-owner' ? 'Salon Details' : 'Your Details'}
              </h1>
              <p className="text-gray-600 text-center mb-8">
                Enter your information to get started
              </p>

              <div className="space-y-5">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="you@example.com"
                      className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      placeholder="+233 XX XXX XXXX"
                      className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
                        errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.phoneNumber ? (
                    <p className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>
                  ) : (
                    <p className="text-gray-500 text-xs mt-1">So we can reach you if needed</p>
                  )}
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <div className="relative">
                      <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="John"
                        className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
                          errors.firstName ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    </div>
                    {errors.firstName && (
                      <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Doe"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
                        errors.lastName ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.lastName && (
                      <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                {/* Salon Owner Additional Fields */}
                {userType === 'salon-owner' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Salon Name
                      </label>
                      <div className="relative">
                        <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          name="salonName"
                          value={formData.salonName}
                          onChange={handleInputChange}
                          placeholder="Your Salon Name"
                          className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
                            errors.salonName ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {errors.salonName && (
                        <p className="text-red-500 text-sm mt-1">{errors.salonName}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Location
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          name="salonLocation"
                          value={formData.salonLocation}
                          onChange={handleInputChange}
                          placeholder="e.g., Osu, Accra"
                          className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
                            errors.salonLocation ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {errors.salonLocation && (
                        <p className="text-red-500 text-sm mt-1">{errors.salonLocation}</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={handleSendOtp}
                disabled={isLoading}
                className="w-full mt-8 bg-ghana-green hover:bg-ghana-green/90 text-white font-semibold py-3 rounded-xl transition-all shadow-md text-center flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    Send OTP
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 3: OTP Verification */}
          {step === 3 && !isRegistered && (
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-ghana-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-ghana-green" />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 font-display">
                  Verify Your Email
                </h1>
                <p className="text-gray-600">
                  We've sent a 6-digit code to<br />
                  <span className="font-medium text-gray-900">{formData.email}</span>
                </p>
              </div>

              {/* OTP Inputs */}
              <div className="flex justify-center gap-2 md:gap-3 mb-6">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { otpRefs.current[index] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={handleOtpPaste}
                    className="w-12 h-14 md:w-14 md:h-16 text-center text-2xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                  />
                ))}
              </div>

              {errors.otp && (
                <p className="text-red-500 text-sm text-center mb-4">{errors.otp}</p>
              )}

              {/* Timer */}
              <div className="text-center mb-6">
                {timerActive && timer > 0 ? (
                  <p className="text-gray-600">
                    Code expires in <span className="font-medium text-ghana-green">{formatTime(timer)}</span>
                  </p>
                ) : (
                  <button
                    onClick={handleResendOtp}
                    disabled={isLoading}
                    className="text-ghana-green hover:text-ghana-green/80 font-medium transition-colors"
                  >
                    Resend OTP
                  </button>
                )}
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={isLoading || otp.join('').length !== 6}
                className="w-full bg-ghana-green hover:bg-ghana-green/90 text-white font-semibold py-3 rounded-xl transition-all shadow-md text-center flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Continue'
                )}
              </button>
            </div>
          )}

          {/* Success State */}
          {step === 3 && isRegistered && (
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100 text-center">
              <div className="w-20 h-20 bg-ghana-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-ghana-green" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 font-display">
                Welcome to GroomLink!
              </h1>
              <p className="text-gray-600 mb-8">
                {userType === 'salon-owner'
                  ? 'Your salon account has been created. Start managing your business today!'
                  : 'Your account has been created. Start discovering amazing salons!'}
              </p>
              <button
                onClick={handleGetStarted}
                className="w-full bg-ghana-green hover:bg-ghana-green/90 text-white font-semibold py-3 rounded-xl transition-all shadow-md text-center"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#1a1a2e] text-white py-8 mt-auto">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © {new Date().getFullYear()} GroomLink. All rights reserved. Made with ❤️ in Ghana.
          </p>
        </div>
      </footer>
    </div>
  )
}
