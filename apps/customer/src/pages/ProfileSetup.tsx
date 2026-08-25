import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Icon from '../components/Icon';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/auth';
import apiClient from '../lib/api';

export default function ProfileSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setToken, fetchProfile: _fetchProfile } = useAuthStore();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');

  // Get email from location state, localStorage, or user object
  // Priority: location.state?.email → localStorage → user?.email → empty (editable)
  useEffect(() => {
    const stateEmail = location.state?.email;
    const storedEmail = localStorage.getItem('customer_setup_email');
    const userEmail = user?.email;
    
    if (stateEmail) {
      setEmail(stateEmail);
      localStorage.setItem('customer_setup_email', stateEmail);
    } else if (storedEmail) {
      setEmail(storedEmail);
    } else if (userEmail) {
      setEmail(userEmail);
    }
    // If no email available, leave empty and let user type it manually
  }, [location.state, user?.email]);

  // If user already has a complete profile, redirect to dashboard
  useEffect(() => {
    if (user?.firstName && user?.phoneNumber) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const validatePhoneNumber = (phone: string): boolean => {
    // Remove spaces and dashes
    const cleaned = phone.replace(/[\s-]/g, '');
    // Check for valid Ghana phone format: 0XX XXX XXXX or +233 XX XXX XXXX
    const ghanaPattern = /^(0\d{9}|\+233\d{9})$/;
    return ghanaPattern.test(cleaned);
  };

  const formatPhoneNumber = (phone: string): string => {
    // Remove spaces and dashes
    const cleaned = phone.replace(/[\s-]/g, '');
    // If starts with 0, convert to +233
    if (cleaned.startsWith('0')) {
      return '+233' + cleaned.substring(1);
    }
    // If doesn't have +, add it
    if (!cleaned.startsWith('+')) {
      return '+233' + cleaned;
    }
    return cleaned;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!firstName.trim()) {
      toast.error('First name is required');
      return;
    }
    if (!lastName.trim()) {
      toast.error('Last name is required');
      return;
    }
    if (!phoneNumber.trim()) {
      toast.error('Phone number is required');
      return;
    }
    if (!validatePhoneNumber(phoneNumber)) {
      toast.error('Please enter a valid Ghana phone number (e.g., 0241234567)');
      return;
    }

    setIsLoading(true);
    
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const tempToken = localStorage.getItem('customer_temp_token');
      
      const response = await apiClient.post('/auth/complete-registration', {
        email: email,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: formattedPhone,
        role: 'CUSTOMER',
      }, {
        headers: tempToken ? { Authorization: `Bearer ${tempToken}` } : {},
      });

      const result = response.data.data || response.data;
      
      // Handle both old format (result.token) and new format (result.tokens.accessToken)
      const accessToken = result.token || result.tokens?.accessToken;
      
      if (accessToken) {
        // Clear temp token and setup email
        localStorage.removeItem('customer_temp_token');
        localStorage.removeItem('customer_setup_email');
        
        // Store the real token and user data
        setToken(accessToken);
        
        toast.success('Profile complete! Welcome to GroomLink!');
        navigate('/dashboard');
      } else {
        throw new Error('No access token received');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to complete registration');
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = () => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || '?';
  };

  return (
    <div className="auth-page-bg min-h-screen bg-gradient-to-br from-[#006B3F]/5 via-white to-[#FCD116]/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#006B3F] to-[#005530] shadow-lg mb-4">
            <img src="/logo-white.png" alt="GroomLink" className="w-9 h-9 object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome to GroomLink!</h1>
          <p className="text-gray-600 mt-1">Complete your profile to get started</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Progress indicator */}
          <div className="h-1 bg-gray-100">
            <div className="h-full bg-gradient-to-r from-[#006B3F] to-[#006B3F]/80 w-full" />
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit}>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Complete Your Profile</h2>
              <p className="text-gray-600 mb-6">Tell us a bit about yourself</p>

              {/* Avatar Placeholder */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#006B3F] to-[#005530] flex items-center justify-center shadow-lg">
                    <span className="text-3xl font-bold text-white">{getInitials()}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <div className="relative">
                    <Icon name="mail" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      readOnly={!!email}
                      placeholder="Enter your email"
                      className={`w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl outline-none transition-all ${
                        email
                          ? 'bg-gray-50 text-gray-600 cursor-not-allowed'
                          : 'bg-white focus:ring-2 focus:ring-[#006B3F] focus:border-transparent'
                      }`}
                      disabled={isLoading}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-1">
                    {email ? 'Email from your login' : 'Enter the email address for your account'}
                  </p>
                </div>

                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <div className="relative">
                    <Icon name="person" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Enter your first name"
                      className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#006B3F] focus:border-transparent outline-none transition-all"
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <div className="relative">
                    <Icon name="person" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Icon name="call" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="0241234567"
                      className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#006B3F] focus:border-transparent outline-none transition-all"
                      disabled={isLoading}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-1">
                    Enter your Ghana phone number (e.g., 0241234567). We'll format it as +233...
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !email || !firstName || !lastName || !phoneNumber}
                  className="w-full py-3 px-4 bg-[#006B3F] hover:bg-[#005530] text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Get Started
                      <Icon name="check_circle" size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
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
