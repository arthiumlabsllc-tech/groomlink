import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowRight, User, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/auth';

type Step = 'email' | 'otp' | 'register';

export default function Login() {
  const navigate = useNavigate();
  const { requestOTP, verifyOTP, completeRegistration, isAuthenticated } = useAuthStore();
  
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      const result = await requestOTP(email);
      toast.success('OTP sent to your email!');
      setStep('otp');
      setCountdown(60);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6);
      const newOtp = [...otp];
      digits.split('').forEach((digit, i) => {
        if (i < 6) newOtp[i] = digit;
      });
      setOtp(newOtp);
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-focus next input
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      const result = await verifyOTP(email, code);
      if (result.isNewUser) {
        toast.success('Please complete your registration');
        setStep('register');
      } else {
        toast.success('Login successful!');
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    
    setIsLoading(true);
    try {
      await requestOTP(email);
      toast.success('OTP resent to your email!');
      setCountdown(60);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await completeRegistration({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        role: 'CUSTOMER',
      });
      toast.success('Registration complete!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#006B3F]/5 via-white to-[#FCD116]/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#006B3F] to-[#005530] shadow-lg mb-4">
            <span className="text-2xl font-bold text-white">G</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">GroomLink</h1>
          <p className="text-gray-600 mt-1">Ghana's Premier Salon Booking Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Progress indicator */}
          <div className="h-1 bg-gray-100">
            <div 
              className="h-full bg-gradient-to-r from-[#006B3F] to-[#006B3F]/80 transition-all duration-500"
              style={{ width: step === 'email' ? '33%' : step === 'otp' ? '66%' : '100%' }}
            />
          </div>

          <div className="p-8">
            {/* Step 1: Email */}
            {step === 'email' && (
              <form onSubmit={handleEmailSubmit}>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome Back</h2>
                <p className="text-gray-600 mb-6">Enter your email to receive a login code</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#006B3F] focus:border-transparent outline-none transition-all"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-[#006B3F] hover:bg-[#005530] text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        Send OTP
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: OTP */}
            {step === 'otp' && (
              <form onSubmit={handleOtpSubmit}>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Verify Your Email</h2>
                <p className="text-gray-600 mb-6">
                  We sent a 6-digit code to <span className="font-medium text-gray-900">{email}</span>
                </p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Enter OTP Code
                    </label>
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
                          className="w-12 h-14 text-center text-xl font-semibold border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#006B3F] focus:border-transparent outline-none transition-all"
                          disabled={isLoading}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-[#006B3F] hover:bg-[#005530] text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        Verify
                        <CheckCircle className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={countdown > 0 || isLoading}
                      className="text-[#006B3F] hover:text-[#005530] font-medium disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Step 3: Registration */}
            {step === 'register' && (
              <form onSubmit={handleRegisterSubmit}>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Complete Your Profile</h2>
                <p className="text-gray-600 mb-6">Welcome! Let's finish setting up your account</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Enter your first name"
                        className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#006B3F] focus:border-transparent outline-none transition-all"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Enter your last name"
                        className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#006B3F] focus:border-transparent outline-none transition-all"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-[#006B3F] hover:bg-[#005530] text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        Complete Registration
                        <CheckCircle className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* New user info */}
        <p className="text-center text-sm text-gray-600 mt-6">
          New to GroomLink?{' '}
          <span className="text-[#006B3F] font-medium">Enter your email to get started</span>
        </p>

        {/* App Store Badges */}
        <div className="mt-6 pt-6 border-t border-gray-200">
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

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          By continuing, you agree to our{' '}
          <a href="#" className="text-[#006B3F] hover:underline">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="text-[#006B3F] hover:underline">Privacy Policy</a>
        </p>

        {/* Ghana flag accent */}
        <div className="flex justify-center mt-4 gap-1">
          <div className="w-8 h-2 rounded-full bg-[#CE1126]" />
          <div className="w-8 h-2 rounded-full bg-[#FCD116]" />
          <div className="w-8 h-2 rounded-full bg-[#006B3F]" />
        </div>
      </div>
    </div>
  );
}
