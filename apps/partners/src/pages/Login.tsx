import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scissors, Eye, EyeOff, Phone, Mail, Lock, ArrowLeft, Loader2 } from 'lucide-react'
import { api } from '../lib/api'

type LoginMethod = 'phone' | 'email'
type Step = 'input' | 'otp'

export default function Login() {
  const navigate = useNavigate()
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('phone')
  const [step, setStep] = useState<Step>('input')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    phoneNumber: '',
    email: '',
    password: '',
    otp: '',
  })

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.requestOtp(formData.phoneNumber)
      setStep('otp')
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.verifyOtp(formData.phoneNumber, formData.otp)
      if (response.success) {
        navigate('/')
      }
    } catch (err: any) {
      setError(err.message || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.loginWithEmail(formData.email, formData.password)
      if (response.success) {
        navigate('/')
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (loginMethod === 'phone' && step === 'input') {
      handleRequestOtp(e)
    } else if (loginMethod === 'phone' && step === 'otp') {
      handleVerifyOtp(e)
    } else {
      handleEmailLogin(e)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-partner-500 to-partner-700 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-ghana-gold/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-ghana-red/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <Scissors className="w-8 h-8 text-partner-500" />
          </div>
          <h1 className="text-2xl font-bold text-white font-display">GroomLink Partners</h1>
          <p className="text-white/70 mt-1">Manage your salon business</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          {/* Login Method Tabs */}
          <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => { setLoginMethod('phone'); setStep('input'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                loginMethod === 'phone'
                  ? 'bg-white text-partner-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Phone className="w-4 h-4" />
              Phone
            </button>
            <button
              type="button"
              onClick={() => { setLoginMethod('email'); setStep('input'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                loginMethod === 'email'
                  ? 'bg-white text-partner-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone Login Flow */}
            {loginMethod === 'phone' && step === 'input' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      className="input-field pl-10"
                      placeholder="+233 24 123 4567"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
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

            {/* OTP Verification Step */}
            {loginMethod === 'phone' && step === 'otp' && (
              <>
                <button
                  type="button"
                  onClick={() => { setStep('input'); setError(''); }}
                  className="flex items-center text-sm text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </button>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP Code</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      className="input-field pl-10 text-center tracking-widest"
                      placeholder="123456"
                      maxLength={6}
                      value={formData.otp}
                      onChange={(e) => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '') })}
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Code sent to {formData.phoneNumber}
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
                  onClick={handleRequestOtp}
                  disabled={loading}
                  className="w-full text-sm text-partner-600 hover:text-partner-500"
                >
                  Resend OTP
                </button>
              </>
            )}

            {/* Email Login */}
            {loginMethod === 'email' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input-field pl-10 pr-10"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded border-gray-300 text-partner-500 focus:ring-partner-500" />
                    <span className="ml-2 text-sm text-gray-600">Remember me</span>
                  </label>
                  <a href="#" className="text-sm text-partner-600 hover:text-partner-500">Forgot password?</a>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Sign In'
                  )}
                </button>
              </>
            )}
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-center text-gray-500">
              By continuing, you agree to GroomLink's{' '}
              <a href="#" className="text-partner-600">Terms of Service</a> and{' '}
              <a href="#" className="text-partner-600">Privacy Policy</a>
            </p>
          </div>
        </div>

        {/* Back to main site */}
        <p className="text-center mt-6 text-white/70 text-sm">
          <a href="https://groomlinkgh.com" className="text-white hover:underline">
            ← Back to GroomLink
          </a>
        </p>
      </div>
    </div>
  )
}
