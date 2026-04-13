import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scissors, Mail, Lock, ArrowLeft, Loader2, User } from 'lucide-react'
import { api } from '../lib/api'

type Step = 'input' | 'otp' | 'register'

export default function Login() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('input')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    firstName: '',
    lastName: '',
  })

  const handleRequestEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.requestEmailOTP(formData.email)
      setStep('otp')
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Pass SALON_OWNER role for partners app login
      const response = await api.verifyEmailOTP(formData.email, formData.otp, 'SALON_OWNER')
      if (response.success) {
        // Check if this is a new user who needs to complete registration
        if (response.data.isNewUser) {
          // New user - show registration form to collect firstName and lastName
          setStep('register')
        } else {
          // Existing user - token is already stored by api.verifyEmailOTP
          // Dispatch auth:login event to notify SalonContext and other listeners
          window.dispatchEvent(new CustomEvent('auth:login'))
          navigate('/')
        }
      }
    } catch (err: any) {
      setError(err.message || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.completeRegistration({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: 'SALON_OWNER'
      })
      
      if (response.success) {
        // Token is already stored by api.completeRegistration
        // Dispatch auth:login event to notify SalonContext and other listeners
        window.dispatchEvent(new CustomEvent('auth:login'))
        navigate('/')
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (step === 'input') {
      handleRequestEmailOtp(e)
    } else if (step === 'otp') {
      handleVerifyEmailOtp(e)
    } else if (step === 'register') {
      handleCompleteRegistration(e)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ghana-green via-ghana-green/90 to-[#1a1a2e] flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-ghana-gold/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-ghana-red/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-ghana-green/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-xl mb-4 border-4 border-ghana-gold/30">
            <Scissors className="w-10 h-10 text-ghana-green" />
          </div>
          <h1 className="text-3xl font-bold text-white font-display">GroomLink Partners</h1>
          <p className="text-white/70 mt-2">Manage your salon business with ease</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-ghana-red/10 text-ghana-red text-sm rounded-lg border border-ghana-red/20">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Login Flow - Step 1: Input */}
            {step === 'input' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      className="input-field pl-10"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Send OTP'
                  )}
                </button>
              </>
            )}

            {/* Email Login Flow - Step 2: OTP Verification */}
            {step === 'otp' && (
              <>
                <button
                  type="button"
                  onClick={() => { setStep('input'); setError(''); setFormData({ ...formData, otp: '' }); }}
                  className="flex items-center text-sm text-gray-500 hover:text-ghana-green transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to email
                </button>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP Code</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      className="input-field pl-10 text-center tracking-widest text-lg"
                      placeholder="123456"
                      maxLength={6}
                      value={formData.otp}
                      onChange={(e) => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '') })}
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Code sent to <span className="font-medium text-gray-700">{formData.email}</span>
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Verify & Sign In'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleRequestEmailOtp}
                  disabled={loading}
                  className="w-full text-sm text-ghana-green hover:text-ghana-green/80 font-medium"
                >
                  Resend OTP
                </button>
              </>
            )}

            {/* Email Login Flow - Step 3: Complete Registration for New Users */}
            {step === 'register' && (
              <>
                <div className="text-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">Complete Your Registration</h2>
                  <p className="text-sm text-gray-500">Welcome! Please provide your name to get started.</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setStep('otp'); setError(''); setFormData({ ...formData, firstName: '', lastName: '' }); }}
                  className="flex items-center text-sm text-gray-500 hover:text-ghana-green transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to OTP
                </button>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      className="input-field pl-10"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                      minLength={2}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      className="input-field pl-10"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                      minLength={2}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Complete Registration'
                  )}
                </button>
              </>
            )}
          </form>

          {/* New salon owner info */}
          <p className="text-center text-sm text-gray-600 mt-4">
            New salon owner?{' '}
            <span className="text-ghana-green font-medium">Enter your email to get started</span>
            <span className="block text-xs text-gray-500 mt-1">We'll help you set up your business</span>
          </p>

          <div className="mt-6 pt-6 border-t border-gray-200">
            {/* App Store Badges */}
            <div className="mb-4">
              <p className="text-center text-sm font-medium text-gray-700 mb-3">Get the App</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {/* Apple App Store Badge */}
                <div className="flex flex-col items-center cursor-not-allowed">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-black rounded-lg opacity-50">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    <div className="text-left">
                      <div className="text-[10px] text-gray-300 leading-none">Download on the</div>
                      <div className="text-sm font-semibold text-white leading-tight">App Store</div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 mt-1">Coming Soon</span>
                </div>

                {/* Google Play Store Badge */}
                <div className="flex flex-col items-center cursor-not-allowed">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-black rounded-lg opacity-50">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 20.5v-17c0-.59.34-1.11.84-1.35l10.95 9.35-10.95 9.35c-.5-.24-.84-.76-.84-1.35zm13.8-8.5l-3.2-2.73 3.2-2.73 3.59 3.07c.4.34.61.84.61 1.39s-.21 1.05-.61 1.39L16.8 12zM5.46 2.5l9.14 7.81 3.2-2.73L5.46 2.5zm9.14 11.19L5.46 21.5l12.34-5.08-3.2-2.73z"/>
                    </svg>
                    <div className="text-left">
                      <div className="text-[10px] text-gray-300 leading-none">Get it on</div>
                      <div className="text-sm font-semibold text-white leading-tight">Google Play</div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 mt-1">Coming Soon</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-center text-gray-500">
              By continuing, you agree to GroomLink's{' '}
              <a href="#" className="text-ghana-green hover:underline">Terms of Service</a> and{' '}
              <a href="#" className="text-ghana-green hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>

        {/* Back to main site */}
        <p className="text-center mt-6 text-white/70 text-sm">
          <a href="https://groomlinkgh.com" className="text-ghana-gold hover:underline font-medium">
            ← Back to GroomLink
          </a>
        </p>
      </div>
    </div>
  )
}
