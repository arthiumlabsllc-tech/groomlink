import { useState, useEffect } from 'react';
import { UserPlus, Mail, User as UserIcon, Phone, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { api, User } from '../api';
import { formatPhoneNumber, formatDate, cn } from '../lib';

interface FormData {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

interface FormErrors {
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export default function Customers() {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdCustomer, setCreatedCustomer] = useState<User | null>(null);
  const [recentCustomers, setRecentCustomers] = useState<User[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);

  useEffect(() => {
    fetchRecentCustomers();
  }, []);

  const fetchRecentCustomers = async () => {
    try {
      const response = await api.getRecentCustomers(1, 10);
      setRecentCustomers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch recent customers:', error);
    } finally {
      setIsLoadingRecent(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // First name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    // Last name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    // Phone number validation (optional but must be valid Ghana format if provided)
    if (formData.phoneNumber.trim()) {
      const phone = formData.phoneNumber.trim();
      // Accept +233 or 0 followed by 9 digits
      const ghanaPhoneRegex = /^(\+233|0)\d{9}$/;
      if (!ghanaPhoneRegex.test(phone.replace(/\s/g, ''))) {
        newErrors.phoneNumber = 'Please enter a valid Ghana phone number (+233 or 0 followed by 9 digits)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setCreatedCustomer(null);

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Format phone number to +233 format if provided
      let phoneNumber = formData.phoneNumber.trim();
      if (phoneNumber && phoneNumber.startsWith('0')) {
        phoneNumber = '+233' + phoneNumber.substring(1);
      }

      const response = await api.createCustomer({
        email: formData.email.trim().toLowerCase(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phoneNumber: phoneNumber || undefined,
      });

      setCreatedCustomer(response.data);
      setFormData({ email: '', firstName: '', lastName: '', phoneNumber: '' });
      
      // Refresh recent customers list
      fetchRecentCustomers();
    } catch (error: any) {
      setSubmitError(error.message || 'Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    // Clear submit error on any input change
    if (submitError) {
      setSubmitError(null);
    }
    // Clear created customer on new input
    if (createdCustomer) {
      setCreatedCustomer(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-heading">Customer Registration</h1>
        <p className="text-gray-500 mt-1">Register new customers on behalf of users who need assistance.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registration Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-ghana-green/10 rounded-xl flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-ghana-green" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 font-heading">Register New Customer</h2>
              <p className="text-sm text-gray-500">Fill in the details below</p>
            </div>
          </div>

          {/* Success Message */}
          {createdCustomer && (
            <div className="mb-6 bg-ghana-green/10 border border-ghana-green/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-ghana-green flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-ghana-green">Customer Created Successfully!</p>
                  <div className="mt-2 text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium">Name:</span> {createdCustomer.firstName} {createdCustomer.lastName}</p>
                    <p><span className="font-medium">Email:</span> {createdCustomer.email}</p>
                    {createdCustomer.phoneNumber && (
                      <p><span className="font-medium">Phone:</span> {formatPhoneNumber(createdCustomer.phoneNumber)}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {submitError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="customer@example.com"
                  className={cn(
                    "w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-ghana-green focus:border-ghana-green transition-all",
                    errors.email ? "border-red-300 bg-red-50" : "border-gray-300"
                  )}
                />
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  First Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="John"
                    className={cn(
                      "w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-ghana-green focus:border-ghana-green transition-all",
                      errors.firstName ? "border-red-300 bg-red-50" : "border-gray-300"
                    )}
                  />
                </div>
                {errors.firstName && <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder="Doe"
                  className={cn(
                    "w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-ghana-green focus:border-ghana-green transition-all",
                    errors.lastName ? "border-red-300 bg-red-50" : "border-gray-300"
                  )}
                />
                {errors.lastName && <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>}
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone Number <span className="text-gray-400 text-xs">(optional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  placeholder="+233 XX XXX XXXX or 0XX XXX XXXX"
                  className={cn(
                    "w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-ghana-green focus:border-ghana-green transition-all",
                    errors.phoneNumber ? "border-red-300 bg-red-50" : "border-gray-300"
                  )}
                />
              </div>
              {errors.phoneNumber && <p className="mt-1 text-sm text-red-500">{errors.phoneNumber}</p>}
              <p className="mt-1 text-xs text-gray-400">Ghana format: +233 or 0 followed by 9 digits</p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-ghana-green text-white py-3 px-4 rounded-xl font-semibold hover:bg-support-700 active:bg-support-800 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-ghana-green/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Customer...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Register Customer
                </>
              )}
            </button>
          </form>
        </div>

        {/* Recent Customers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="font-semibold text-gray-900 font-heading">Recently Created Customers</h2>
            <p className="text-sm text-gray-500">Latest customers in the system</p>
          </div>
          
          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
            {isLoadingRecent ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-ghana-green"></div>
              </div>
            ) : recentCustomers.length > 0 ? (
              recentCustomers.map((customer) => (
                <div key={customer.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {customer.firstName?.charAt(0)}{customer.lastName?.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {customer.firstName} {customer.lastName}
                      </p>
                      <p className="text-sm text-gray-500 truncate">{customer.email}</p>
                    </div>
                    <div className="text-right">
                      {customer.phoneNumber && (
                        <p className="text-sm text-gray-500">{formatPhoneNumber(customer.phoneNumber)}</p>
                      )}
                      <p className="text-xs text-gray-400">{formatDate(customer.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <UserIcon className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500">No customers found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
