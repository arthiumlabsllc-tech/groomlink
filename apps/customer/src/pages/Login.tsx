import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/auth';

type Step = 'email' | 'otp';

export default function Login() {
  const navigate = useNavigate();
  const { requestOTP, verifyOTP, isAuthenticated } = useAuthStore();
  
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
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
      await requestOTP(email);
      toast.success('OTP sent to your email!');
      setIsTransitioning(true);
      setTimeout(() => {
        setStep('otp');
        setIsTransitioning(false);
      }, 200);
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
      // Focus the last filled input or the next empty one
      const lastFilledIndex = Math.min(digits.length - 1, 5);
      otpInputRefs.current[lastFilledIndex]?.focus();
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
        toast.success('Please complete your profile');
        // Store email for profile setup and redirect
        localStorage.setItem('customer_setup_email', email);
        navigate('/profile/setup', { state: { email } });
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

  const handleChangeEmail = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setStep('email');
      setOtp(['', '', '', '', '', '']);
      setIsTransitioning(false);
    }, 200);
  };

  const stepNumber = step === 'email' ? 1 : 2;

  return (
    <div className="min-h-screen flex">
      {/* Desktop Left Panel - Brand Side */}
      <div className="hidden md:flex md:w-[60%] bg-gradient-to-br from-gray-900 via-[#1a0a0b] to-gray-900 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Abstract shapes with Ghana colors */}
          <div className="absolute top-20 left-10 w-64 h-64 bg-[#CE1126]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-[#FCD116]/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-[#006B3F]/10 rounded-full blur-3xl" />
          
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
              alt="GroomLink" 
              className="h-12 w-auto"
            />
          </div>

          {/* Tagline */}
          <div className="max-w-md">
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Book Top Barbers & Salons in Ghana
            </h1>
            <p className="text-gray-400 text-lg">
              Discover and book the best grooming services near you. From haircuts to spa treatments, find your perfect style.
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
              <span>10,000+ Bookings</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-white/30" />
            <div className="flex items-center gap-2">
              <Icon name="star" size={18} className="text-[#FCD116]" />
              <span>4.8★ Rating</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form Side */}
      <div className="w-full md:w-[40%] bg-white md:bg-gray-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative">
        {/* Mobile Background */}
        <div className="absolute inset-0 md:hidden bg-gradient-to-br from-[#CE1126]/5 via-white to-[#FCD116]/10" />
        
        {/* Mobile Logo */}
        <div className="md:hidden absolute top-8 left-0 right-0 flex justify-center z-10">
          <img 
            src="/logo-full-black.png" 
            alt="GroomLink" 
            className="h-10 w-auto"
          />
        </div>

        {/* Form Card */}
        <div className="w-full max-w-sm relative z-10 animate-fade-in">
          <div className="bg-white md:rounded-2xl md:shadow-lg p-6 sm:p-8 rounded-2xl shadow-elevated">
            {/* Step Dots */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${stepNumber >= 1 ? 'bg-[#CE1126] scale-110' : 'bg-gray-300'}`} />
              <div className={`w-8 h-0.5 rounded ${stepNumber >= 2 ? 'bg-[#CE1126]' : 'bg-gray-200'}`} />
              <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${stepNumber >= 2 ? 'bg-[#CE1126] scale-110' : 'bg-gray-300'}`} />
            </div>

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
                          className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-[#1A1A1A] placeholder-gray-400 focus:border-[#CE1126] focus:ring-2 focus:ring-[#CE1126]/20 outline-none transition-all"
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 px-4 bg-[#CE1126] hover:bg-[#b81022] text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
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
                          className="w-12 h-14 text-center text-xl font-bold bg-gray-50 border border-gray-200 rounded-xl text-[#1A1A1A] focus:border-[#CE1126] focus:ring-2 focus:ring-[#CE1126]/20 outline-none transition-all focus:scale-105"
                          disabled={isLoading}
                        />
                      ))}
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 px-4 bg-[#CE1126] hover:bg-[#b81022] text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
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
                        className="text-sm text-[#CE1126] hover:text-[#b81022] font-medium disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
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

          {/* New user hint - Desktop only */}
          <p className="hidden md:block text-center text-sm text-gray-500 mt-6">
            New to GroomLink?{' '}
            <span className="text-[#CE1126] font-medium">Enter your email to get started</span>
          </p>
        </div>
      </div>
    </div>
  );
}
