import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api';
import { Headphones, ArrowRight } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-support-600 to-support-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <Headphones className="w-8 h-8 text-support-600" />
          </div>
          <h1 className="text-2xl font-bold text-white">GroomLink Support</h1>
          <p className="text-support-100 mt-2">Sign in to access the support dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Form */}
          <form onSubmit={handleSubmit}>
                {emailStep === 'email' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="support@groomlinkgh.com"
                        className="input-field"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Enter your registered support email address
                    </p>
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
                        placeholder="Enter 6-digit code"
                        className="input-field text-center text-2xl tracking-widest"
                        maxLength={6}
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 text-center">
                      Code sent to {email}
                    </p>
                    <button
                      type="button"
                      onClick={() => setEmailStep('email')}
                      className="w-full text-sm text-support-600 hover:text-support-700"
                    >
                      Use a different email
                    </button>
                  </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 btn-primary flex items-center justify-center gap-2"
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
        <p className="text-center text-support-100 text-sm mt-6">
          GroomLink Support Portal © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
