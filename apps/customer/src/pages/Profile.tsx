import { useState, useEffect } from 'react'
import { User, Mail, Phone, Camera, Bell, Shield, HelpCircle, LogOut, ChevronRight, Edit2, Loader2, Check, X, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react'
import { useAuthStore } from '../store/auth'
import apiClient from '../lib/api'

interface NotificationPrefs {
  emailNotifications: boolean
  smsNotifications: boolean
  promotionalEmails: boolean
  bookingReminders: boolean
}

export default function Profile() {
  const { user, logout, fetchProfile } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: ''
  })

  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>({
    emailNotifications: true,
    smsNotifications: true,
    promotionalEmails: false,
    bookingReminders: true
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      await fetchProfile()
    } catch (err) {
      setError('Failed to load profile. Please try again.')
      console.error('Error loading profile:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneNumber: user.phoneNumber || ''
      })
    }
  }, [user])

  const handleSaveProfile = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccessMessage(null)
      
      await apiClient.put('/users/profile', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber
      })
      
      await fetchProfile()
      setIsEditing(false)
      setSuccessMessage('Profile updated successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError('Failed to update profile. Please try again.')
      console.error('Error updating profile:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneNumber: user.phoneNumber || ''
      })
    }
    setError(null)
  }

  const toggleNotification = (key: keyof NotificationPrefs) => {
    setNotificationPrefs(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const getDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    if (user?.firstName) return user.firstName
    if (user?.email) return user.email.split('@')[0]
    return 'Guest User'
  }

  const getMemberSince = () => {
    // Member since date - fallback to 'Recently joined' if not available
    // The API may return this field; if not, we show a generic message
    const userAny = user as any
    if (userAny?.createdAt) {
      const date = new Date(userAny.createdAt)
      return date.toLocaleDateString('en-GH', { month: 'long', year: 'numeric' })
    }
    return 'Recently joined'
  }

  const menuItems = [
    { 
      icon: HelpCircle, 
      label: 'Help & Support', 
      description: 'Get help or contact us',
      href: 'mailto:support@groomlinkgh.com'
    },
    { 
      icon: Shield, 
      label: 'Terms & Privacy', 
      description: 'View our terms and privacy policy',
      href: 'https://groomlinkgh.com/terms'
    },
  ]

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-1">Manage your account settings</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <span className="ml-3 text-gray-600">Loading profile...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Ghana-themed header with kente-inspired accent */}
      <div className="relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FFD700] via-[#006B3C] via-[#CE1126] to-[#000000]"></div>
        <div className="pt-4">
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-1">Manage your account settings</p>
        </div>
      </div>

      {/* Toast notifications */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <Check className="w-5 h-5 text-green-600" />
          <p className="text-green-800 font-medium">{successMessage}</p>
          <button onClick={() => setSuccessMessage(null)} className="ml-auto">
            <X className="w-4 h-4 text-green-600 hover:text-green-800" />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-800 font-medium">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4 text-red-600 hover:text-red-800" />
          </button>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-[#006B3C] to-[#004d2a] rounded-full flex items-center justify-center overflow-hidden">
              {user?.profileImage ? (
                <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-white" />
              )}
            </div>
            <button className="absolute bottom-0 right-0 p-2 bg-[#FFD700] text-gray-900 rounded-full hover:bg-[#e6c200] transition-colors shadow-md">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 w-full">
            {!isEditing ? (
              <>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-900">{getDisplayName()}</h2>
                  <button 
                    onClick={() => setIsEditing(true)} 
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Edit profile"
                  >
                    <Edit2 className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-3 text-gray-600">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Mail className="w-4 h-4" />
                    </div>
                    <span>{user?.email || 'No email provided'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Phone className="w-4 h-4" />
                    </div>
                    <span>{user?.phoneNumber || 'No phone number provided'}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-3 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-[#006B3C] rounded-full"></span>
                  Member since {getMemberSince()}
                </p>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Edit Profile</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleCancelEdit}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      disabled={saving}
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006B3C] focus:border-transparent"
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006B3C] focus:border-transparent"
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006B3C] focus:border-transparent"
                    placeholder="+233 XX XXX XXXX"
                  />
                </div>
                <button 
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full md:w-auto px-6 py-2 bg-[#006B3C] text-white rounded-lg hover:bg-[#005a33] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FFD700] bg-opacity-20 rounded-lg flex items-center justify-center">
              <Bell className="w-5 h-5 text-[#b8860b]" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Notification Preferences</h3>
              <p className="text-sm text-gray-500">Manage how you receive updates</p>
            </div>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-gray-900">Email Notifications</p>
              <p className="text-sm text-gray-500">Receive booking confirmations and updates</p>
            </div>
            <button 
              onClick={() => toggleNotification('emailNotifications')}
              className="text-[#006B3C] hover:opacity-80 transition-opacity"
            >
              {notificationPrefs.emailNotifications ? (
                <ToggleRight className="w-10 h-6" />
              ) : (
                <ToggleLeft className="w-10 h-6 text-gray-400" />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-gray-900">SMS Notifications</p>
              <p className="text-sm text-gray-500">Get text messages for important updates</p>
            </div>
            <button 
              onClick={() => toggleNotification('smsNotifications')}
              className="text-[#006B3C] hover:opacity-80 transition-opacity"
            >
              {notificationPrefs.smsNotifications ? (
                <ToggleRight className="w-10 h-6" />
              ) : (
                <ToggleLeft className="w-10 h-6 text-gray-400" />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-gray-900">Booking Reminders</p>
              <p className="text-sm text-gray-500">Reminders before your appointments</p>
            </div>
            <button 
              onClick={() => toggleNotification('bookingReminders')}
              className="text-[#006B3C] hover:opacity-80 transition-opacity"
            >
              {notificationPrefs.bookingReminders ? (
                <ToggleRight className="w-10 h-6" />
              ) : (
                <ToggleLeft className="w-10 h-6 text-gray-400" />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-gray-900">Promotional Emails</p>
              <p className="text-sm text-gray-500">Special offers and new salon announcements</p>
            </div>
            <button 
              onClick={() => toggleNotification('promotionalEmails')}
              className="text-[#006B3C] hover:opacity-80 transition-opacity"
            >
              {notificationPrefs.promotionalEmails ? (
                <ToggleRight className="w-10 h-6" />
              ) : (
                <ToggleLeft className="w-10 h-6 text-gray-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {menuItems.map((item, index) => (
          <a 
            key={item.label} 
            href={item.href}
            className={'w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors ' + (index !== menuItems.length - 1 ? 'border-b border-gray-100' : '')}
          >
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <item.icon className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900">{item.label}</p>
              <p className="text-sm text-gray-500">{item.description}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </a>
        ))}
      </div>

      {/* Logout Button */}
      <button 
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 p-4 bg-white rounded-xl shadow-sm border border-gray-100 text-red-600 hover:bg-red-50 transition-colors font-medium"
      >
        <LogOut className="w-5 h-5" />
        Sign Out
      </button>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 pb-6">
        <p className="font-medium">GroomLink Ghana</p>
        <p className="mt-1">Connecting you to the best salons in Accra</p>
        <div className="flex items-center justify-center gap-4 mt-3">
          <a href="https://groomlinkgh.com/privacy" className="hover:text-[#006B3C] transition-colors">Privacy Policy</a>
          <span>•</span>
          <a href="https://groomlinkgh.com/terms" className="hover:text-[#006B3C] transition-colors">Terms of Service</a>
        </div>
        <p className="mt-3 text-xs">© 2026 GroomLink. Made with ❤️ in Ghana</p>
      </div>
    </div>
  )
}
