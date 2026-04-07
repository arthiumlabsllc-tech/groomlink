import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Headphones, Phone, Mail, ArrowRight } from 'lucide-react';

type LoginMethod = 'otp' | 'email';

export default function Login() {
  const navigate = useNavigate();
  const { loginWithOtp, loginWithEmail } = useAuth();
  
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('otp');
  const [phoneNumber, setPhoneNumber] = useState('+233');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'credentials' | 'verify'>('credentials');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestOtp = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // For support login, we use a test phone number configured in the system
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://groomlinkgh.com/api'}/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to send OTP');
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await loginWithOtp(phoneNumber, otp);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await loginWithEmail(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginMethod === 'otp') {
      if (step === 'credentials') {
        handleRequestOtp();
      } else {
        handleVerifyOtp();
      }
    } else {
      handleEmailLogin();
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
          {/* Login method tabs */}
          <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => { setLoginMethod('otp'); setStep('credentials'); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                loginMethod === 'otp' ? 'bg-white text-support-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              <Phone className="w-4 h-4" />
              Phone OTP
            </button>
            <button
              type="button"
              onClick={() => { setLoginMethod('email'); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                loginMethod === 'email' ? 'bg-white text-support-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {loginMethod === 'otp' ? (
              <>
                {step === 'credentials' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+233 XX XXX XXXX"
                        className="input-field"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Enter your registered support phone number
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
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Enter 6-digit code"
                        className="input-field text-center text-2xl tracking-widest"
                        maxLength={6}
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 text-center">
                      Code sent to {phoneNumber}
                    </p>
                    <button
                      type="button"
                      onClick={() => setStep('credentials')}
                      className="w-full text-sm text-support-600 hover:text-support-700"
                    >
                      Use a different number
                    </button>
                  </div>
                )}
              </>
            ) : (
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="input-field"
                    required
                  />
                </div>
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
                  {loginMethod === 'otp' && step === 'credentials' ? 'Send Code' : 'Sign In'}
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
