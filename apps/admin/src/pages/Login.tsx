import { useState } from 'react';
import { Scissors, Phone, Lock, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks';

export function Login() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  
  const { requestOTP, verifyOTP } = useAuth();

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await requestOTP.mutateAsync(phoneNumber);
      setStep('otp');
    } catch (err) {
      setError('Failed to send OTP. Please check your phone number.');
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await verifyOTP.mutateAsync({ phoneNumber, otp });
    } catch (err) {
      setError('Invalid OTP. Please try again.');
    }
  };

  const isLoading = requestOTP.isPending || verifyOTP.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] to-[#006B3F] p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-[#CE1126] rounded-full mb-3 md:mb-4">
            <Scissors className="text-white" size={28} />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-[#1a1a2e]">GroomLink Admin</h1>
          <p className="text-sm md:text-base text-gray-500 mt-2">
            {step === 'phone' ? 'Enter your phone number to sign in' : 'Enter the OTP sent to your phone'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-4 md:mb-6">
            {error}
          </div>
        )}

        {/* Phone Step */}
        {step === 'phone' && (
          <form onSubmit={handleRequestOTP} className="space-y-4 md:space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 md:py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE1126] focus:border-transparent"
                  placeholder="+233 XX XXX XXXX"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#CE1126] text-white py-2.5 md:py-3 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {requestOTP.isPending ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        )}

        {/* OTP Step */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-4 md:space-y-6">
            <button
              type="button"
              onClick={() => setStep('phone')}
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
                  className="w-full pl-9 pr-4 py-2.5 md:py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE1126] focus:border-transparent text-center tracking-widest"
                  placeholder="123456"
                  maxLength={6}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#CE1126] text-white py-2.5 md:py-3 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {verifyOTP.isPending ? 'Verifying...' : 'Verify & Sign In'}
            </button>

            <button
              type="button"
              onClick={handleRequestOTP}
              disabled={requestOTP.isPending}
              className="w-full text-sm text-[#006B3F] hover:underline"
            >
              Resend OTP
            </button>
          </form>
        )}

        <div className="mt-4 md:mt-6 text-center text-xs md:text-sm text-gray-500">
          <p>Admin access only</p>
        </div>
      </div>
    </div>
  );
}
