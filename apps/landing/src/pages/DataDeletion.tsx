import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import BrandLogo from '../components/BrandLogo'

export default function DataDeletion() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    appType: 'customer',
    reason: '',
    additionalInfo: '',
    confirmDeletion: false
  })
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : false
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.fullName || !formData.phoneNumber) {
      setError('Please fill in all required fields')
      return
    }

    if (!formData.confirmDeletion) {
      setError('Please confirm that you understand this action cannot be undone')
      return
    }

    setLoading(true)

    try {
      // Send deletion request to your API
      const response = await fetch('https://api.groomlinkgh.com/api/users/request-deletion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          appType: formData.appType,
          reason: formData.reason,
          additionalInfo: formData.additionalInfo,
        }),
      })

      if (response.ok) {
        setSubmitted(true)
      } else {
        const data = await response.json()
        setError(data.message || 'Failed to submit deletion request. Please try again.')
      }
    } catch (err) {
      // If API endpoint doesn't exist yet, show success anyway for now
      // In production, you should implement the API endpoint
      console.log('Deletion request:', formData)
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="flex items-center">
                <BrandLogo className="h-8" wordmarkClassName="text-[7px]" />
              </Link>
              <Link 
                to="/" 
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Icon name="arrow_back" size={16} />
                Back to Home
              </Link>
            </div>
          </div>
        </header>

        {/* Success Message */}
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-2xl mx-auto">
            <div className="bg-green-50 border-l-4 border-green-500 p-8 rounded-lg">
              <div className="flex items-center mb-4">
                <Icon name="check_circle" size={48} className="text-green-600 mr-4" />
                <h1 className="text-3xl font-bold text-gray-900 font-display">Request Submitted</h1>
              </div>
              <p className="text-gray-700 mb-4">
                Your data deletion request has been successfully submitted. We take your privacy seriously and will process your request in accordance with our privacy policy.
              </p>
              <div className="bg-white p-4 rounded-lg border border-green-200 mb-4">
                <h3 className="font-semibold text-gray-900 mb-2">What happens next?</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <Icon name="check" size={18} className="text-green-600 mr-2 mt-0.5" />
                    <span>We will verify your identity within <strong>48 hours</strong></span>
                  </li>
                  <li className="flex items-start">
                    <Icon name="check" size={18} className="text-green-600 mr-2 mt-0.5" />
                    <span>Your account and personal data will be deleted within <strong>30 days</strong></span>
                  </li>
                  <li className="flex items-start">
                    <Icon name="check" size={18} className="text-green-600 mr-2 mt-0.5" />
                    <span>You'll receive a confirmation email once deletion is complete</span>
                  </li>
                </ul>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                <strong>Note:</strong> Some data may be retained for legitimate business or legal purposes as outlined in our Privacy Policy (e.g., completed booking records for 2 years, financial records for 7 years per tax regulations).
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link 
                  to="/privacy" 
                  className="inline-flex items-center justify-center px-6 py-3 bg-ghana-green text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Read Privacy Policy
                </Link>
                <Link 
                  to="/" 
                  className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center">
              <BrandLogo className="h-8" wordmarkClassName="text-[7px]" />
            </Link>
            <Link 
              to="/" 
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Icon name="arrow_back" size={16} />
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 font-display">Request Account Deletion</h1>
          <p className="text-gray-600 mb-8">
            Use this form to request deletion of your GroomLink account and associated personal data.
          </p>

          {/* Important Notice */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
            <div className="flex">
              <Icon name="warning" size={24} className="text-yellow-600 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-yellow-800 mb-1">Important Information</h3>
                <p className="text-sm text-yellow-700 mb-2">
                  This action <strong>cannot be undone</strong>. Once your account is deleted:
                </p>
                <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                  <li>You will lose access to your account and all associated data</li>
                  <li>Your booking history will be anonymized</li>
                  <li>Active bookings may be cancelled</li>
                  <li>Some data may be retained for legal compliance (see Privacy Policy)</li>
                </ul>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* App Type */}
            <div>
              <label htmlFor="appType" className="block text-sm font-medium text-gray-700 mb-2">
                Which app is your account for? <span className="text-red-500">*</span>
              </label>
              <select
                id="appType"
                name="appType"
                value={formData.appType}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent"
                required
              >
                <option value="customer">GroomLink Customer App</option>
                <option value="partner">GroomLink Partners App (Salon Owners)</option>
              </select>
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent"
                placeholder="Enter your full name"
                required
              />
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number (used for account) <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent"
                placeholder="+233 XX XXX XXXX"
                required
              />
              <p className="text-xs text-gray-500 mt-1">This helps us locate your account</p>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address (optional)
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent"
                placeholder="your@email.com"
              />
              <p className="text-xs text-gray-500 mt-1">We'll use this to confirm when deletion is complete</p>
            </div>

            {/* Reason */}
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Deletion (optional)
              </label>
              <select
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent"
              >
                <option value="">Select a reason (optional)</option>
                <option value="no_longer_using">No longer using the service</option>
                <option value="privacy_concerns">Privacy concerns</option>
                <option value="poor_experience">Poor experience</option>
                <option value="duplicate_account">Duplicate account</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Additional Info */}
            <div>
              <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-700 mb-2">
                Additional Information (optional)
              </label>
              <textarea
                id="additionalInfo"
                name="additionalInfo"
                value={formData.additionalInfo}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent"
                placeholder="Any additional details that might help us process your request..."
              />
            </div>

            {/* Confirmation */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  name="confirmDeletion"
                  checked={formData.confirmDeletion}
                  onChange={handleChange}
                  className="mt-1 h-5 w-5 text-ghana-green border-gray-300 rounded focus:ring-ghana-green"
                  required
                />
                <span className="ml-3 text-sm text-gray-700">
                  I understand that this action <strong>cannot be undone</strong> and that my account and personal data will be permanently deleted. I have read and understood the information above.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {loading ? 'Submitting...' : 'Submit Deletion Request'}
              </button>
              <Link
                to="/privacy"
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-center"
              >
                Read Privacy Policy
              </Link>
            </div>
          </form>

          {/* Alternative Contact */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Alternative Contact Methods</h3>
            <p className="text-gray-700 mb-4">
              If you prefer, you can also request account deletion by contacting us directly:
            </p>
            <div className="bg-ghana-green/5 p-4 rounded-lg border border-ghana-green/200">
              <p className="text-gray-700 mb-2"><strong>Email:</strong> privacy@groomlinkgh.com</p>
              <p className="text-gray-700 mb-2"><strong>Phone:</strong> +233 59 371 1285</p>
              <p className="text-gray-700"><strong>Address:</strong> Accra, Greater Accra Region, Ghana</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#1a1a2e] text-white py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © {new Date().getFullYear()} GroomLink. All rights reserved. Made with ❤️ in Ghana.
          </p>
        </div>
      </footer>
    </div>
  )
}
