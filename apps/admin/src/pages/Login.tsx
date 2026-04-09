import { useState } from 'react';
import { Scissors, Mail, Lock, ArrowLeft, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks';

export function Login() {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  
  const { requestEmailOTP, verifyEmailOTP } = useAuth();

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await requestEmailOTP.mutateAsync(email);
      setStep('otp');
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 'Failed to send OTP. Please check your email address.';
      setError(errorMessage);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await verifyEmailOTP.mutateAsync({ email, code: otp });
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 'Invalid or expired OTP. Please try again.';
      setError(errorMessage);
    }
  };

  const isLoading = requestEmailOTP.isPending || verifyEmailOTP.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#1a1a2e] to-[#006B3F] p-4 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-[#006B3F]/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#FCD116]/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      <div className="absolute top-1/4 right-1/4 w-48 h-48 bg-[#CE1126]/10 rounded-full blur-2xl"></div>
      
      <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-[#006B3F] to-[#006B3F]/80 rounded-2xl mb-4 shadow-lg relative">
            <Scissors className="text-white" size={32} />
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#FCD116] rounded-full flex items-center justify-center">
              <Sparkles size={12} className="text-[#1a1a2e]" />
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1a1a2e]">GroomLink</h1>
          <p className="text-sm md:text-base text-gray-500 mt-1 font-medium">
            Admin Dashboard
          </p>
          <p className="text-xs md:text-sm text-gray-400 mt-3">
            {step === 'email' ? 'Enter your admin email to sign in' : `Enter the OTP sent to ${email}`}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-[#CE1126]/10 border border-[#CE1126]/20 text-[#CE1126] px-4 py-3 rounded-xl text-sm mb-4 md:mb-6 flex items-center gap-2">
            <Shield size={16} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Email Step */}
        {step === 'email' && (
          <form onSubmit={handleRequestOTP} className="space-y-4 md:space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-[#006B3F] transition-colors bg-gray-50 focus:bg-white"
                  placeholder="admin@groomlinkgh.com"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#006B3F] to-[#006B3F]/90 text-white py-3 rounded-xl font-semibold hover:from-[#005a35] hover:to-[#005a35] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base shadow-lg shadow-[#006B3F]/25 flex items-center justify-center gap-2"
            >
              {requestEmailOTP.isPending ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending OTP...
                </>
              ) : (
                <>
                  Send OTP
                  <span className="text-[#FCD116]">→</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* OTP Step */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-4 md:space-y-5">
            <button
              type="button"
              onClick={() => setStep('email')}
              className="flex items-center text-sm text-gray-500 hover:text-[#006B3F] transition-colors"
            >
              <ArrowLeft size={16} className="mr-1" />
              Back
            </button>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OTP Code
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full pl-11 pr-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-[#006B3F] transition-colors bg-gray-50 focus:bg-white text-center tracking-[0.5em] font-mono text-lg"
                  placeholder="······"
                  maxLength={6}
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Check your email for the 6-digit verification code
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#006B3F] to-[#006B3F]/90 text-white py-3 rounded-xl font-semibold hover:from-[#005a35] hover:to-[#005a35] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base shadow-lg shadow-[#006B3F]/25 flex items-center justify-center gap-2"
            >
              {verifyEmailOTP.isPending ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </>
              ) : (
                'Verify & Sign In'
              )}
            </button>

            <button
              type="button"
              onClick={handleRequestOTP}
              disabled={requestEmailOTP.isPending}
              className="w-full text-sm text-[#006B3F] hover:text-[#005a35] font-medium transition-colors py-2"
            >
              Resend OTP
            </button>
          </form>
        )}

        <div className="mt-6 md:mt-8 pt-4 border-t border-gray-100 text-center">
          <div className="flex items-center justify-center gap-2 text-xs md:text-sm text-gray-400">
            <Shield size={14} className="text-[#006B3F]" />
            <span>Secure admin access only</span>
          </div>
        </div>
      </div>
    </div>
  );
}
