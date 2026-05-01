import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api';
import Icon from '../components/Icon';
import { useDarkMode } from '../hooks/useDarkMode';

type EmailStep = 'email' | 'verify';

export default function Login() {
  const navigate = useNavigate();
  const { loginWithEmailOTP } = useAuth();
  const isDark = useDarkMode();
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [emailStep, setEmailStep] = useState<EmailStep>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleRequestEmailOTP = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await api.requestEmailOTP(email);
      setEmailStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmailOTP = async () => {
    const code = otp.join('');
    setIsLoading(true);
    setError(null);
    try {
      await loginWithEmailOTP(email, code);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailStep === 'email') {
      handleRequestEmailOTP();
    } else {
      handleVerifyEmailOTP();
    }
  };

  const stepNumber = emailStep === 'email' ? 1 : 2;

  return (
    <div className="min-h-screen flex page-enter">
      {/* Desktop Left Panel - Brand Side (60%) */}
      <div className="hidden lg:flex lg:w-[60%] bg-gradient-to-br from-ghana-dark via-[#1a0a0b] to-gray-900 relative overflow-hidden">
        {/* Decorative Elements with Ghana colors */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-64 h-64 bg-[#CE1126]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-[#FCD116]/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-[#006B3F]/10 rounded-full blur-3xl" />
          {/* Decorative shapes */}
          <div className="absolute top-1/4 right-1/4 w-32 h-32 border border-[#FCD116]/10 rounded-2xl rotate-12" />
          <div className="absolute bottom-1/3 left-1/4 w-24 h-24 border border-[#CE1126]/10 rounded-full" />
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
              alt="GroomLink Support"
              className="h-12 w-auto"
            />
          </div>

          {/* Tagline */}
          <div className="max-w-md">
            <h1 className="text-4xl font-bold text-white leading-tight mb-4 font-heading">
              GroomLink Support
            </h1>
            <p className="text-gray-400 text-lg">
              Help Customers & Salons Succeed
            </p>
          </div>

          {/* Trust Stats */}
          <div className="flex items-center gap-6 text-white/80 text-sm">
            <div className="flex items-center gap-2">
              <Icon name="support_agent" size={18} className="text-[#CE1126]" />
              <span>24/7 Support</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-white/30" />
            <div className="flex items-center gap-2">
              <Icon name="confirmation_number" size={18} className="text-[#FCD116]" />
              <span>Ticket Management</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-white/30" />
            <div className="flex items-center gap-2">
              <Icon name="verified" size={18} className="text-[#006B3F]" />
              <span>Trusted Platform</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form Side (40%) */}
      <div className="w-full lg:w-[40%] bg-white lg:bg-gray-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative">
        {/* Mobile Background - Mesh gradient */}
        <div className="absolute inset-0 lg:hidden bg-gradient-to-br from-[#CE1126]/5 via-white to-[#FCD116]/10" />

        {/* Mobile Logo */}
        <div className="lg:hidden absolute top-8 left-0 right-0 flex justify-center z-10">
          <img
            src={isDark ? "/logo-full-white.png" : "/logo-full-black.png"}
            alt="GroomLink Support"
            className="h-10 w-auto"
          />
        </div>

        {/* Form Card */}
        <div className="w-full max-w-sm relative z-10">
          <div className="bg-white lg:rounded-2xl lg:shadow-lg p-6 sm:p-8 rounded-2xl shadow-elevated">
            {/* Step Dots */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${stepNumber >= 1 ? 'bg-ghana-green scale-110' : 'bg-gray-300'}`} />
              <div className={`w-8 h-0.5 rounded transition-all duration-300 ${stepNumber >= 2 ? 'bg-ghana-green' : 'bg-gray-200'}`} />
              <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${stepNumber >= 2 ? 'bg-ghana-green scale-110' : 'bg-gray-300'}`} />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {emailStep === 'email' ? (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2 font-heading">Welcome back</h2>
                    <p className="text-gray-500 mb-6">Enter your support email to continue</p>
                  </div>
                  <div>
                    <div className="relative">
                      <Icon name="mail" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="support@groomlinkgh.com"
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-[#1A1A1A] placeholder-gray-400 focus:border-ghana-green focus:ring-2 focus:ring-ghana-green/20 outline-none transition-all"
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 p-3 rounded-xl">
                    <Icon name="verified_user" size={16} className="text-ghana-green flex-shrink-0" />
                    <span>Enter your registered support email address</span>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-ripple w-full py-3.5 px-4 bg-ghana-green hover:bg-support-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-lg shadow-ghana-green/25"
                  >
                    {isLoading ? (
                      <div className="skeleton-shimmer w-full h-5 rounded" />
                    ) : (
                      <>
                        Send Code
                        <Icon name="arrow_forward" size={18} />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2 font-heading">Check your email</h2>
                    <p className="text-gray-500 mb-6">
                      We sent a 6-digit code to <span className="font-medium text-[#1A1A1A]">{email}</span>
                    </p>
                  </div>

                  {/* Modern 6-box OTP Input */}
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
                        className="w-12 h-14 text-center text-xl font-bold bg-gray-50 border border-gray-200 rounded-xl text-[#1A1A1A] focus:border-ghana-green focus:ring-2 focus:ring-ghana-green/20 outline-none transition-all focus:scale-105"
                        disabled={isLoading}
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-ripple w-full py-3.5 px-4 bg-ghana-green hover:bg-support-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-lg shadow-ghana-green/25"
                  >
                    {isLoading ? (
                      <div className="skeleton-shimmer w-full h-5 rounded" />
                    ) : (
                      <>
                        Sign In
                        <Icon name="check_circle" size={18} />
                      </>
                    )}
                  </button>

                  <div className="text-center space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEmailStep('email');
                        setOtp(['', '', '', '', '', '']);
                      }}
                      className="text-sm text-gray-500 hover:text-[#1A1A1A] font-medium transition-colors flex items-center justify-center gap-1 mx-auto"
                    >
                      <Icon name="arrow_back" size={14} />
                      Use a different email
                    </button>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 text-ghana-red rounded-xl text-sm border border-red-100">
                  {error}
                </div>
              )}
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-gray-400 text-xs mt-6">
            GroomLink Support Portal © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
