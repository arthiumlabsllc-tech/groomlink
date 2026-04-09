import { useState } from 'react';
import { Scissors, Mail, Lock, ArrowLeft, Shield } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] to-[#006B3F] p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-[#006B3F] to-[#FCD116] rounded-full mb-3 md:mb-4">
            <Scissors className="text-white" size={28} />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-[#1a1a2e]">GroomLink Admin</h1>
          <p className="text-sm md:text-base text-gray-500 mt-2">
            {step === 'email' ? 'Enter your admin email to sign in' : `Enter the OTP sent to ${email}`}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-4 md:mb-6">
            {error}
          </div>
        )}

        {/* Email Step */}
        {step === 'email' && (
          <form onSubmit={handleRequestOTP} className="space-y-4 md:space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 md:py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B3F] focus:border-transparent"
                  placeholder="admin@groomlinkgh.com"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#006B3F] text-white py-2.5 md:py-3 rounded-lg font-medium hover:bg-[#005a35] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {requestEmailOTP.isPending ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        )}

        {/* OTP Step */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-4 md:space-y-6">
            <button
              type="button"
              onClick={() => setStep('email')}
              className="flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft size={16} className="mr-1" />
              Back
            </button>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OTP Code
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 md:py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B3F] focus:border-transparent text-center tracking-widest"
                  placeholder="123456"
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
              className="w-full bg-[#006B3F] text-white py-2.5 md:py-3 rounded-lg font-medium hover:bg-[#005a35] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {verifyEmailOTP.isPending ? 'Verifying...' : 'Verify & Sign In'}
            </button>

            <button
              type="button"
              onClick={handleRequestOTP}
              disabled={requestEmailOTP.isPending}
              className="w-full text-sm text-[#006B3F] hover:underline"
            >
              Resend OTP
            </button>
          </form>
        )}

        <div className="mt-4 md:mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-xs md:text-sm text-gray-500">
            <Shield size={14} />
            <span>Secure admin access only</span>
          </div>
        </div>
      </div>
    </div>
  );
}
