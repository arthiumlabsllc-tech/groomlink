import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api';
import { Headphones, ArrowRight, Shield } from 'lucide-react';

type EmailStep = 'email' | 'verify';

export default function Login() {
  const navigate = useNavigate();
  const { loginWithEmailOTP } = useAuth();
  
  const [email, setEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailStep, setEmailStep] = useState<EmailStep>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setIsLoading(true);
    setError(null);
    try {
      await loginWithEmailOTP(email, emailOtp);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP');
    } finally {
      setIsLoading(false);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-ghana-green via-support-700 to-ghana-dark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-72 h-72 bg-ghana-yellow rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-ghana-red rounded-full blur-3xl"></div>
      </div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl shadow-2xl mb-4 border border-white/20">
            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <Headphones className="w-8 h-8 text-ghana-green" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white font-heading">GroomLink Support</h1>
          <p className="text-white/70 mt-2">Sign in to access the support dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${emailStep === 'email' ? 'bg-ghana-green text-white' : 'bg-ghana-green text-white'}`}>
              1
            </div>
            <div className={`w-12 h-1 rounded-full transition-colors ${emailStep === 'verify' ? 'bg-ghana-green' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${emailStep === 'verify' ? 'bg-ghana-green text-white' : 'bg-gray-200 text-gray-500'}`}>
              2
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {emailStep === 'email' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="support@groomlinkgh.com"
                    className="input-field focus:ring-ghana-green focus:border-ghana-green"
                    required
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                  <Shield className="w-4 h-4 text-ghana-green" />
                  <span>Enter your registered support email address</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="input-field text-center text-2xl tracking-[0.5em] font-mono focus:ring-ghana-green focus:border-ghana-green"
                    maxLength={6}
                    required
                  />
                </div>
                <p className="text-sm text-gray-500 text-center">
                  Code sent to <span className="font-medium text-gray-700">{email}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setEmailStep('email')}
                  className="w-full text-sm text-ghana-green hover:text-support-700 font-medium transition-colors"
                >
                  Use a different email
                </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 text-ghana-red rounded-lg text-sm border border-red-100">
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 bg-ghana-green text-white py-3 px-4 rounded-xl font-semibold hover:bg-support-700 active:bg-support-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-ghana-green/25"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {emailStep === 'email' ? 'Send Code' : 'Sign In'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-white/60 text-sm mt-6">
          GroomLink Support Portal © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
