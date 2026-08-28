import { useState, useEffect, useRef } from 'react';
import Icon from '../components/Icon';
import { useAuth } from '../hooks';
import { useDarkMode } from '../hooks/useDarkMode';

export function Login() {
  const isDark = useDarkMode();
  const [step, setStep] = useState<'credentials' | 'twofactor'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const { adminLogin, verifyAdmin2FA } = useAuth();

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await adminLogin.mutateAsync({ email, password });
      if (response.success && 'requiresTwoFactor' in response.data) {
        setTwoFactorToken(response.data.twoFactorToken);
        setIsTransitioning(true);
        setTimeout(() => {
          setStep('twofactor');
          setIsTransitioning(false);
          otpInputRefs.current[0]?.focus();
        }, 200);
      }
      // Direct login (2FA not configured) is handled in the mutation onSuccess
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 'Invalid email or password. Please try again.';
      setError(errorMessage);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const code = useBackupCode ? backupCode : otp.join('');

    if (useBackupCode) {
      if (code.replace(/[\s-]/g, '').length !== 8) {
        setError('Backup codes are 8 characters (e.g. 1234-5678)');
        return;
      }
    } else if (code.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    try {
      await verifyAdmin2FA.mutateAsync({ twoFactorToken, code });
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 'Invalid code. Please try again.';
      setError(errorMessage);
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

  const handleBackToCredentials = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setStep('credentials');
      setOtp(['', '', '', '', '', '']);
      setBackupCode('');
      setUseBackupCode(false);
      setTwoFactorToken('');
      setIsTransitioning(false);
    }, 200);
  };

  const isLoading = adminLogin.isPending || verifyAdmin2FA.isPending;
  const stepNumber = step === 'credentials' ? 1 : 2;

  return (
    <div className="min-h-screen flex page-enter">
      {/* Desktop Left Panel - Brand Side (60%) */}
      <div className="hidden lg:flex lg:w-[60%] bg-gradient-to-br from-[#1a1a2e] via-[#1a1a2e] to-[#006B3F] relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Abstract shapes */}
          <div className="absolute top-20 left-10 w-64 h-64 bg-[#006B3F]/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-[#FCD116]/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          
          {/* Geometric shapes */}
          <div className="absolute top-1/4 right-1/4 w-32 h-32 border border-white/10 rounded-full" />
          <div className="absolute bottom-1/3 left-1/4 w-24 h-24 border border-[#FCD116]/20 rotate-45" />
          <div className="absolute top-1/3 left-1/2 w-16 h-16 bg-[#006B3F]/30 rounded-lg rotate-12" />
          
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
              alt="GroomLink Admin" 
              className="h-12 w-auto"
            />
          </div>

          {/* Tagline */}
          <div className="max-w-md">
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              GroomLink Admin
            </h1>
            <p className="text-gray-300 text-lg">
              Platform Management Dashboard
            </p>
            <p className="text-gray-400 mt-4">
              Manage salons, bookings, users, and monitor platform performance from a single powerful interface.
            </p>
          </div>

          {/* Trust Stats */}
          <div className="flex items-center gap-6 text-white/80 text-sm">
            <div className="flex items-center gap-2">
              <Icon name="monitoring" size={18} className="text-[#FCD116]" />
              <span>Real-time Monitoring</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-white/30" />
            <div className="flex items-center gap-2">
              <Icon name="verified_user" size={18} className="text-[#006B3F]" />
              <span>Secure Access</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-white/30" />
            <div className="flex items-center gap-2">
              <Icon name="admin_panel_settings" size={18} className="text-[#FCD116]" />
              <span>Admin Only</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form Side (40% desktop, full mobile) */}
      <div className="w-full lg:w-[40%] bg-white lg:bg-gray-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative">
        {/* Mobile Mesh Gradient Background */}
        <div className="absolute inset-0 lg:hidden bg-gradient-to-br from-[#1a1a2e]/5 via-white to-[#006B3F]/10" />
        <div className="absolute inset-0 lg:hidden opacity-30">
          <div className="absolute top-0 left-0 w-72 h-72 bg-[#006B3F]/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#FCD116]/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>
        
        {/* Mobile Logo */}
        <div className="lg:hidden absolute top-8 left-0 right-0 flex flex-col items-center z-10">
          <img 
            src={isDark ? "/logo-full-white.png" : "/logo-full-black.png"} 
            alt="GroomLink Admin" 
            className="h-10 w-auto"
          />
          <p className="text-xs text-gray-500 mt-1">Platform Management Dashboard</p>
        </div>

        {/* Form Card */}
        <div className="w-full max-w-sm relative z-10">
          <div className="bg-white lg:rounded-2xl lg:shadow-lg p-6 sm:p-8 rounded-2xl shadow-elevated">
            {/* Step Dots */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${stepNumber >= 1 ? 'bg-[#006B3F] scale-110' : 'bg-gray-300'}`} />
              <div className={`w-8 h-0.5 rounded ${stepNumber >= 2 ? 'bg-[#006B3F]' : 'bg-gray-200'}`} />
              <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${stepNumber >= 2 ? 'bg-[#006B3F] scale-110' : 'bg-gray-300'}`} />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-[#CE1126]/10 border border-[#CE1126]/20 text-[#CE1126] px-4 py-3 rounded-xl text-sm mb-6 flex items-center gap-2 animate-shake">
                <Icon name="error" size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Form Content with Transition */}
            <div className={`transition-all duration-200 ${isTransitioning ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}>
              {/* Credentials Step */}
              {step === 'credentials' && (
                <form onSubmit={handleCredentials} className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">Admin Sign In</h2>
                    <p className="text-gray-500">Enter your credentials to continue</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <Icon name="mail" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 text-base bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-[#006B3F] transition-all placeholder-gray-400"
                        placeholder="name@company.com"
                        autoComplete="username"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Icon name="lock" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-11 pr-12 py-3.5 text-base bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-[#006B3F] transition-all placeholder-gray-400"
                        placeholder="••••••••••"
                        autoComplete="current-password"
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full btn-ripple bg-gradient-to-r from-[#006B3F] to-[#006B3F]/90 text-white py-3.5 rounded-xl font-semibold hover:from-[#005a35] hover:to-[#005a35] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base shadow-lg shadow-[#006B3F]/25 flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    {adminLogin.isPending ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign In
                        <Icon name="arrow_forward" size={18} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* 2FA Step */}
              {step === 'twofactor' && (
                <form onSubmit={handleVerify2FA} className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">Two-Factor Authentication</h2>
                    <p className="text-gray-500">
                      {useBackupCode
                        ? 'Enter one of your backup codes'
                        : 'Enter the 6-digit code from your authenticator app'}
                    </p>
                  </div>

                  {!useBackupCode ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Authenticator Code
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
                            className="w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold bg-gray-50 border-2 border-gray-200 rounded-xl text-[#1A1A1A] focus:border-[#006B3F] focus:ring-0 outline-none transition-all focus:scale-105 disabled:opacity-50"
                            disabled={isLoading}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-3 text-center">
                        Open your authenticator app to get the current code
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Backup Code
                      </label>
                      <input
                        type="text"
                        value={backupCode}
                        onChange={(e) => setBackupCode(e.target.value)}
                        className="w-full px-4 py-3.5 text-base text-center font-mono tracking-widest bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-[#006B3F] transition-all placeholder-gray-400 uppercase"
                        placeholder="1234-5678"
                        autoFocus
                        disabled={isLoading}
                      />
                      <p className="text-xs text-gray-500 mt-3 text-center">
                        Each backup code can only be used once
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full btn-ripple bg-gradient-to-r from-[#006B3F] to-[#006B3F]/90 text-white py-3.5 rounded-xl font-semibold hover:from-[#005a35] hover:to-[#005a35] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base shadow-lg shadow-[#006B3F]/25 flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    {verifyAdmin2FA.isPending ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify & Sign In
                        <Icon name="check_circle" size={18} />
                      </>
                    )}
                  </button>

                  {/* Backup code toggle & back */}
                  <div className="text-center space-y-3">
                    <button
                      type="button"
                      onClick={() => setUseBackupCode((v) => !v)}
                      disabled={isLoading}
                      className="text-sm text-[#006B3F] hover:text-[#005a35] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {useBackupCode ? 'Use authenticator code instead' : 'Use a backup code instead'}
                    </button>

                    <div>
                      <button
                        type="button"
                        onClick={handleBackToCredentials}
                        className="text-sm text-gray-500 hover:text-[#1A1A1A] font-medium transition-colors flex items-center justify-center gap-1 mx-auto"
                      >
                        <Icon name="arrow_back" size={14} />
                        Back to sign in
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <Icon name="verified_user" size={14} className="text-[#006B3F]" />
                <span>Secure admin access only</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
