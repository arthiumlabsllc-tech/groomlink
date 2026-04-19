import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { api } from '../lib/api'

type Step = 'email' | 'otp' | 'register'

export default function Login() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('email')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }

    setIsLoading(true)
    try {
      await api.requestEmailOTP(email)
      setIsTransitioning(true)
      setTimeout(() => {
        setStep('otp')
        setIsTransitioning(false)
      }, 200)
      setCountdown(60)
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6)
      const newOtp = [...otp]
      digits.split('').forEach((digit, i) => {
        if (i < 6) newOtp[i] = digit
      })
      setOtp(newOtp)
      // Focus the last filled input or the next empty one
      const lastFilledIndex = Math.min(digits.length - 1, 5)
      otpInputRefs.current[lastFilledIndex]?.focus()
      return
    }

    const digit = value.replace(/\D/g, '')
    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)

    // Auto-focus next input
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    const code = otp.join('')
    if (code.length !== 6) {
      setError('Please enter the 6-digit OTP')
      return
    }

    setIsLoading(true)
    try {
      // Pass SALON_OWNER role for partners app login
      const response = await api.verifyEmailOTP(email, code, 'SALON_OWNER')
      if (response.success) {
        // Check if this is a new user who needs to complete registration
        if (response.data.isNewUser) {
          setIsTransitioning(true)
          setTimeout(() => {
            setStep('register')
            setIsTransitioning(false)
          }, 200)
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
      setIsLoading(false)
    }
  }

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your first and last name')
      return
    }

    setIsLoading(true)
    try {
      const response = await api.completeRegistration({
        email,
        firstName,
        lastName,
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
      setIsLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (countdown > 0) return
    
    setIsLoading(true)
    setError('')
    try {
      await api.requestEmailOTP(email)
      setCountdown(60)
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangeEmail = () => {
    setIsTransitioning(true)
    setTimeout(() => {
      setStep('email')
      setOtp(['', '', '', '', '', ''])
      setIsTransitioning(false)
    }, 200)
  }

  const handleBackToOtp = () => {
    setIsTransitioning(true)
    setTimeout(() => {
      setStep('otp')
      setFirstName('')
      setLastName('')
      setIsTransitioning(false)
    }, 200)
  }

  const getStepNumber = () => {
    if (step === 'email') return 1
    if (step === 'otp') return 2
    return 3
  }

  const stepNumber = getStepNumber()

  return (
    <div className="min-h-screen flex">
      {/* Desktop Left Panel - Brand Side */}
      <div className="hidden lg:flex lg:w-[60%] bg-gradient-to-br from-gray-900 via-[#0d1f15] to-gray-900 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Abstract shapes with Ghana colors */}
          <div className="absolute top-20 left-10 w-64 h-64 bg-[#CE1126]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-[#FCD116]/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-[#006B3F]/10 rounded-full blur-3xl" />
          
          {/* Geometric shapes */}
          <div className="absolute top-32 right-20 w-32 h-32 border border-[#CE1126]/20 rounded-full" />
          <div className="absolute bottom-40 left-20 w-24 h-24 border border-[#006B3F]/20 rotate-45" />
          <div className="absolute top-1/3 right-1/4 w-16 h-16 bg-[#FCD116]/10 rounded-lg rotate-12" />
          
          {/* Subtle grid pattern */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '60px 60px'
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div>
            <img 
              src="/logo-full-white.png" 
              alt="GroomLink Partners" 
              className="h-12 w-auto"
            />
          </div>

          {/* Tagline */}
          <div className="max-w-md">
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Manage Your Salon Like a Pro
            </h1>
            <p className="text-gray-400 text-lg">
              Streamline bookings, manage staff, and grow your business with Ghana's leading salon management platform.
            </p>
          </div>

          {/* Trust Stats */}
          <div className="flex items-center gap-6 text-white/80 text-sm">
            <div className="flex items-center gap-2">
              <Icon name="store" size={18} className="text-[#CE1126]" />
              <span>1,500+ Salons</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-white/30" />
            <div className="flex items-center gap-2">
              <Icon name="calendar_check" size={18} className="text-[#FCD116]" />
              <span>50,000+ Bookings</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-white/30" />
            <div className="flex items-center gap-2">
              <Icon name="trending_up" size={18} className="text-[#006B3F]" />
              <span>30% Revenue Growth</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form Side */}
      <div className="w-full lg:w-[40%] bg-white lg:bg-gray-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative">
        {/* Mobile Background */}
        <div className="absolute inset-0 lg:hidden bg-gradient-to-br from-[#CE1126]/5 via-white to-[#006B3F]/10" />
        
        {/* Mobile Logo */}
        <div className="lg:hidden absolute top-8 left-0 right-0 flex justify-center z-10">
          <img 
            src="/logo-full-black.png" 
            alt="GroomLink Partners" 
            className="h-10 w-auto"
          />
        </div>

        {/* Form Card */}
        <div className="w-full max-w-sm relative z-10 animate-fade-in">
          <div className="bg-white lg:rounded-2xl lg:shadow-lg p-6 sm:p-8 rounded-2xl shadow-elevated">
            {/* Step Dots */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${stepNumber >= 1 ? 'bg-[#006B3F] scale-110' : 'bg-gray-300'}`} />
              <div className={`w-6 h-0.5 rounded ${stepNumber >= 2 ? 'bg-[#006B3F]' : 'bg-gray-200'}`} />
              <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${stepNumber >= 2 ? 'bg-[#006B3F] scale-110' : 'bg-gray-300'}`} />
              <div className={`w-6 h-0.5 rounded ${stepNumber >= 3 ? 'bg-[#006B3F]' : 'bg-gray-200'}`} />
              <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${stepNumber >= 3 ? 'bg-[#006B3F] scale-110' : 'bg-gray-300'}`} />
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 animate-fade-in flex items-center gap-2">
                <Icon name="error" size={18} />
                {error}
              </div>
            )}

            {/* Form Content with Transition */}
            <div className={`transition-all duration-200 ${isTransitioning ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}>
              {/* Step 1: Email */}
              {step === 'email' && (
                <form onSubmit={handleEmailSubmit}>
                  <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">Welcome back</h2>
                  <p className="text-gray-500 mb-6">Enter your email to continue</p>
                  
                  <div className="space-y-5">
                    <div>
                      <div className="relative">
                        <Icon name="mail" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-[#1A1A1A] placeholder-gray-400 focus:border-[#006B3F] focus:ring-2 focus:ring-[#006B3F]/20 outline-none transition-all"
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn-ripple w-full py-3.5 px-4 bg-[#006B3F] hover:bg-[#005a35] text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          Continue
                          <Icon name="arrow_forward" size={18} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 2: OTP */}
              {step === 'otp' && (
                <form onSubmit={handleOtpSubmit}>
                  <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">Check your email</h2>
                  <p className="text-gray-500 mb-6">
                    We sent a 6-digit code to <span className="font-medium text-[#1A1A1A]">{email}</span>
                  </p>

                  <div className="space-y-6">
                    {/* Modern OTP Input */}
                    <div className="flex gap-2 justify-center">
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => { otpInputRefs.current[index] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          className="w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold bg-gray-50 border border-gray-200 rounded-xl text-[#1A1A1A] focus:border-[#006B3F] focus:ring-2 focus:ring-[#006B3F]/20 outline-none transition-all focus:scale-105"
                          disabled={isLoading}
                        />
                      ))}
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn-ripple w-full py-3.5 px-4 bg-[#006B3F] hover:bg-[#005a35] text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          Verify
                          <Icon name="check_circle" size={18} />
                        </>
                      )}
                    </button>

                    {/* Resend & Change Email */}
                    <div className="text-center space-y-3">
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={countdown > 0 || isLoading}
                        className="text-sm text-[#006B3F] hover:text-[#005a35] font-medium disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                        {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
                      </button>
                      
                      <div>
                        <button
                          type="button"
                          onClick={handleChangeEmail}
                          className="text-sm text-gray-500 hover:text-[#1A1A1A] font-medium transition-colors flex items-center justify-center gap-1 mx-auto"
                        >
                          <Icon name="arrow_back" size={14} />
                          Change email
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              )}

              {/* Step 3: Registration */}
              {step === 'register' && (
                <form onSubmit={handleCompleteRegistration}>
                  <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">Complete your profile</h2>
                  <p className="text-gray-500 mb-6">Welcome! Please provide your name to get started.</p>

                  <div className="space-y-5">
                    <div>
                      <div className="relative">
                        <Icon name="person" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="First Name"
                          className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-[#1A1A1A] placeholder-gray-400 focus:border-[#006B3F] focus:ring-2 focus:ring-[#006B3F]/20 outline-none transition-all"
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="relative">
                        <Icon name="person" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Last Name"
                          className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-[#1A1A1A] placeholder-gray-400 focus:border-[#006B3F] focus:ring-2 focus:ring-[#006B3F]/20 outline-none transition-all"
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn-ripple w-full py-3.5 px-4 bg-[#006B3F] hover:bg-[#005a35] text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          Complete Registration
                          <Icon name="arrow_forward" size={18} />
                        </>
                      )}
                    </button>

                    <div>
                      <button
                        type="button"
                        onClick={handleBackToOtp}
                        className="text-sm text-gray-500 hover:text-[#1A1A1A] font-medium transition-colors flex items-center justify-center gap-1 mx-auto"
                      >
                        <Icon name="arrow_back" size={14} />
                        Back to OTP
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Footer Links */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-center text-gray-400 text-xs">
                By continuing, you agree to our{' '}
                <a href="#" className="text-gray-500 hover:text-[#1A1A1A] transition-colors">Terms</a>
                {' '}and{' '}
                <a href="#" className="text-gray-500 hover:text-[#1A1A1A] transition-colors">Privacy</a>
              </p>
            </div>
          </div>

          {/* New salon owner hint - Desktop only */}
          <p className="hidden lg:block text-center text-sm text-gray-500 mt-6">
            New salon owner?{' '}
            <span className="text-[#006B3F] font-medium">Enter your email to get started</span>
          </p>

          {/* Back to main site */}
          <p className="text-center mt-6 text-gray-500 text-sm lg:text-gray-400">
            <a href="https://groomlinkgh.com" className="hover:text-[#006B3F] lg:text-ghana-gold lg:hover:text-ghana-gold/80 font-medium transition-colors flex items-center justify-center gap-1">
              <Icon name="arrow_back" size={14} />
              Back to GroomLink
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
