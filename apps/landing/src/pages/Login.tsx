import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Scissors,
  ArrowLeft,
  User,
  Store,
  Mail,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

const API_BASE_URL = 'https://api.groomlinkgh.com'

type UserType = 'customer' | 'salon-owner' | null
type Step = 1 | 2

interface Toast {
  message: string
  type: 'success' | 'error'
}

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState<Step>(1)
  const [userType, setUserType] = useState<UserType>(null)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<Toast | null>(null)
  const [timer, setTimer] = useState(600)
  const [timerActive, setTimerActive] = useState(false)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  
  // Get redirect URL from query params
  const redirectUrl = searchParams.get('redirect')

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

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    if (errors.email) setErrors({ ...errors, email: '' })
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value[0]
    }

    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const newOtp = [...otp]
    pastedData.split('').forEach((char, index) => {
      if (index < 6) newOtp[index] = char
    })
    setOtp(newOtp)
    if (pastedData.length > 0) {
      otpRefs.current[Math.min(pastedData.length, 5)]?.focus()
    }
  }

  const sendOtp = async () => {
    if (!userType) {
      setErrors({ userType: 'Please select your account type' })
      return
    }

    if (!validateEmail(email)) {
      setErrors({ email: 'Please enter a valid email address' })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/auth/otp/email/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() })
      })

      const data = await response.json()

      if (response.ok) {
        setStep(2)
        setTimer(600)
        setTimerActive(true)
        setToast({
          message: 'OTP sent to your email!',
          type: 'success'
        })
      } else {
        setToast({ message: data.message || 'Failed to send OTP', type: 'error' })
      }
    } catch (error) {
      setToast({ message: 'Network error. Please try again.', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const verifyOtp = async () => {
    const otpString = otp.join('')
    if (otpString.length !== 6) {
      setErrors({ otp: 'Please enter the complete 6-digit OTP' })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/auth/otp/email/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim(), code: otpString })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Store tokens - handle both response formats
        const tokens = data.data?.tokens || data.tokens
        const user = data.data?.user || data.user

        if (tokens) {
          localStorage.setItem('accessToken', tokens.accessToken)
          localStorage.setItem('refreshToken', tokens.refreshToken)
        }
        if (user) {
          localStorage.setItem('user', JSON.stringify(user))
        }

        setToast({ message: 'Login successful!', type: 'success' })
        setTimerActive(false)

        // Redirect based on user type and redirect param
        setTimeout(() => {
          if (userType === 'customer' && redirectUrl) {
            // Redirect to specified URL with token
            const tokens = data.data?.tokens || data.tokens
            if (tokens?.accessToken) {
              window.location.href = `${redirectUrl}?token=${tokens.accessToken}`
            } else {
              window.location.href = redirectUrl
            }
          } else if (userType === 'customer') {
            window.location.href = 'https://groomlinkgh.com'
          } else {
            window.location.href = 'https://partners.groomlinkgh.com'
          }
        }, 1500)
      } else {
        setToast({ message: data.message || 'Invalid OTP', type: 'error' })
      }
    } catch (error) {
      setToast({ message: 'Network error. Please try again.', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const resendOtp = async () => {
    setTimer(600)
    setOtp(['', '', '', '', '', ''])
    await sendOtp()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ghana-green/5 via-white to-ghana-gold/10">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-ghana-green via-ghana-gold to-ghana-red rounded-lg flex items-center justify-center">
                <Scissors className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 font-display">GroomLink</span>
            </Link>
            <Link
              to="/register"
              className="text-ghana-green hover:text-ghana-green/80 font-medium transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-12">
        {/* Back Button */}
        {step > 1 && (
          <button
            onClick={() => {
              setStep(1)
              setOtp(['', '', '', '', '', ''])
              setTimerActive(false)
              setErrors({})
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
        )}

        {/* Step 1: User Type & Contact */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2 font-display">Welcome Back</h1>
              <p className="text-gray-600">Sign in to your account</p>
            </div>

            {/* User Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                I am a...
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleUserTypeSelect('customer')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    userType === 'customer'
                      ? 'border-ghana-green bg-ghana-green/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <User className={`w-8 h-8 mx-auto mb-2 ${
                    userType === 'customer' ? 'text-ghana-green' : 'text-gray-400'
                  }`} />
                  <span className={`font-medium ${
                    userType === 'customer' ? 'text-ghana-green' : 'text-gray-700'
                  }`}>Customer</span>
                  <p className="text-xs text-gray-500 mt-1">Book appointments</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleUserTypeSelect('salon-owner')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    userType === 'salon-owner'
                      ? 'border-ghana-gold bg-ghana-gold/10'
                      : 'border-gray-200 hover:border-ghana-gold'
                  }`}
                >
                  <Store className={`w-8 h-8 mx-auto mb-2 ${
                    userType === 'salon-owner' ? 'text-ghana-gold' : 'text-gray-400'
                  }`} />
                  <span className={`font-medium ${
                    userType === 'salon-owner' ? 'text-gray-900' : 'text-gray-700'
                  }`}>Salon Owner</span>
                  <p className="text-xs text-gray-500 mt-1">Manage your salon</p>
                </button>
              </div>
              {errors.userType && (
                <p className="text-red-500 text-sm mt-2">{errors.userType}</p>
              )}
            </div>

            {/* Email Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="you@example.com"
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  } focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none`}
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Enter the email address registered with your account
              </p>
            </div>

            {/* Login Button */}
            <button
              onClick={sendOtp}
              disabled={isLoading}
              className="w-full bg-ghana-green hover:bg-ghana-green/90 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Sending OTP...</span>
                </>
              ) : (
                <span>Send Login Code</span>
              )}
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">New to GroomLink?</span>
              </div>
            </div>

            <Link
              to="/register"
              className="block text-center text-ghana-green hover:text-ghana-green/80 font-medium transition-colors"
            >
              Create an account
            </Link>
          </div>
        )}

        {/* Step 2: OTP Verification */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-ghana-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-ghana-green" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2 font-display">
                Verify Your Email
              </h1>
              <p className="text-gray-600">
                We sent a 6-digit code to<br />
                <span className="font-medium">{email}</span>
              </p>
            </div>

            {/* OTP Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                Enter verification code
              </label>
              <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
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
                    className={`w-12 h-14 text-center text-xl font-semibold rounded-lg border ${
                      errors.otp ? 'border-red-500' : 'border-gray-300'
                    } focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none`}
                  />
                ))}
              </div>
              {errors.otp && (
                <p className="text-red-500 text-sm mt-2 text-center">{errors.otp}</p>
              )}
            </div>

            {/* Timer */}
            <div className="text-center mb-6">
              {timerActive ? (
                <p className="text-gray-500">
                  Code expires in <span className="font-medium text-ghana-green">{formatTime(timer)}</span>
                </p>
              ) : (
                <button
                  onClick={resendOtp}
                  disabled={isLoading}
                  className="text-ghana-green hover:text-ghana-green/80 font-medium transition-colors"
                >
                  Resend Code
                </button>
              )}
            </div>

            {/* Verify Button */}
            <button
              onClick={verifyOtp}
              disabled={isLoading || otp.join('').length !== 6}
              className="w-full bg-ghana-green hover:bg-ghana-green/90 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>

            {/* Help Text */}
            <p className="text-center text-sm text-gray-500 mt-6">
              Didn't receive the code?{' '}
              <button
                onClick={resendOtp}
                disabled={isLoading || timerActive}
                className="text-ghana-green hover:text-ghana-green/80 font-medium disabled:opacity-50 transition-colors"
              >
                Resend
              </button>
            </p>
          </div>
        )}

        {/* App Download Section */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">Get the full experience on mobile</p>
          <div className="flex justify-center gap-4">
            <a
              href="https://groomlinkgh.com"
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.67-2.27.36-2.92-.7-.65-1.06-.33-2.42.7-3.08.98-.67 2.27-.36 2.92.7.65 1.06.33 2.42-.7 3.08zm-10.1 0c-1.03-.67-1.35-2.02-.7-3.08.65-1.06 1.94-1.37 2.92-.7 1.03.67 1.35 2.02.7 3.08-.65 1.06-1.94 1.37-2.92.7zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
              </svg>
              <div className="text-left">
                <div className="text-xs opacity-75">Coming soon</div>
                <div className="text-sm font-medium">Google Play</div>
              </div>
            </a>
            <a
              href="https://groomlinkgh.com"
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <div className="text-left">
                <div className="text-xs opacity-75">Coming soon</div>
                <div className="text-sm font-medium">App Store</div>
              </div>
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
