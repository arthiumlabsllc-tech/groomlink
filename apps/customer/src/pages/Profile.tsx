import { useState, useEffect } from 'react'
import Icon from '../components/Icon'
import PlatformFeedback from '../components/PlatformFeedback'
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showSuccessCheck, setShowSuccessCheck] = useState(false)
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
      setShowSuccessCheck(false)
      
      await apiClient.put('/users/profile', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber
      })
      
      await fetchProfile()
      setIsEditing(false)
      setSuccessMessage('Profile updated successfully!')
      setShowSuccessCheck(true)
      setTimeout(() => {
        setSuccessMessage(null)
        setShowSuccessCheck(false)
      }, 3000)
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB')
      return
    }

    try {
      setUploadingAvatar(true)
      setError(null)
      setSuccessMessage(null)

      const formData = new FormData()
      formData.append('avatar', file)

      await apiClient.post('/uploads/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      await fetchProfile()
      setSuccessMessage('Profile picture updated successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to upload image. Please try again.')
      console.error('Error uploading avatar:', err)
    } finally {
      setUploadingAvatar(false)
    }
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
      icon: 'redeem', 
      label: 'Rewards', 
      description: 'View your points and rewards',
      href: '#',
      onClick: () => {
        // TODO: Navigate to rewards page when implemented
        alert('Rewards program coming soon!')
      }
    },
    { 
      icon: 'help', 
      label: 'Help & Support', 
      description: 'Get help or contact us',
      href: 'mailto:support@groomlinkgh.com'
    },
    { 
      icon: 'verified_user', 
      label: 'Terms & Privacy', 
      description: 'View our terms and privacy policy',
      href: 'https://groomlinkgh.com/terms'
    },
  ]

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="h-[120px] bg-gradient-to-r from-[#CE1126] to-[#006B3F] animate-pulse"></div>
        <div className="flex items-center justify-center py-20">
          <Icon name="progress_activity" size={32} className="text-[#CE1126] animate-spin" />
          <span className="ml-3 text-gray-600">Loading profile...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto pb-8">
      {/* Profile Header with Gradient Banner */}
      <div className="relative">
        {/* Gradient Banner */}
        <div className="h-[120px] bg-gradient-to-r from-[#CE1126] to-[#006B3F]"></div>
        
        {/* Avatar - overlapping the banner */}
        <div className="flex flex-col items-center -mt-12 px-4">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full border-4 border-white shadow-elevated overflow-hidden bg-gradient-to-br from-[#006B3C] to-[#004d2a]">
              {user?.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <Icon name="person" size={48} className="text-white w-full h-full flex items-center justify-center" />
              )}
            </div>
            
            {/* Edit avatar overlay on hover */}
            <label className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-4 border-white">
              <Icon name="photo_camera" size={24} className="text-white" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
              />
            </label>
            
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center border-4 border-white">
                <Icon name="progress_activity" size={24} className="text-white animate-spin" />
              </div>
            )}
          </div>
          
          {/* User Name and Email */}
          <h1 className="text-2xl font-bold text-gray-900 mt-3">{getDisplayName()}</h1>
          <p className="text-gray-500 text-sm">{user?.email || 'No email provided'}</p>
        </div>
      </div>

      {/* Toast notifications */}
      <div className="px-4 mt-6 space-y-3">
        {successMessage && (
          <div className="glass rounded-xl p-4 flex items-center gap-3 animate-fade-in">
            <div className={`flex-shrink-0 ${showSuccessCheck ? 'animate-bounce' : ''}`}>
              <Icon name="check_circle" size={24} className="text-green-600" />
            </div>
            <p className="text-green-800 font-medium flex-1">{successMessage}</p>
            <button onClick={() => setSuccessMessage(null)} className="flex-shrink-0">
              <Icon name="close" size={16} className="text-green-600 hover:text-green-800" />
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
            <Icon name="error" size={20} className="text-red-600 flex-shrink-0" />
            <p className="text-red-800 font-medium flex-1">{error}</p>
            <button onClick={() => setError(null)} className="flex-shrink-0">
              <Icon name="close" size={16} className="text-red-600 hover:text-red-800" />
            </button>
          </div>
        )}
      </div>

      {/* Personal Information Card */}
      <div className="px-4 mt-6">
        <div className="card-v2 p-6 mb-4 animate-fade-in-up">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)} 
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Edit profile"
              >
                <Icon name="edit" size={18} className="text-gray-500" />
              </button>
            )}
          </div>
          
          {!isEditing ? (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon name="person" size={18} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Full Name</p>
                  <p className="font-medium text-gray-900">{user?.firstName || user?.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon name="call" size={18} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Phone Number</p>
                  <p className="font-medium text-gray-900">{user?.phoneNumber || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon name="calendar_today" size={18} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Member Since</p>
                  <p className="font-medium text-gray-900">{getMemberSince()}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in-up">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#CE1126] focus:ring-2 focus:ring-[#CE1126]/20 transition-all"
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#CE1126] focus:ring-2 focus:ring-[#CE1126]/20 transition-all"
                    placeholder="Enter last name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#CE1126] focus:ring-2 focus:ring-[#CE1126]/20 transition-all"
                  placeholder="+233 XX XXX XXXX"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-[#CE1126] text-white rounded-xl hover:bg-[#b50f21] transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-medium shadow-card"
                >
                  {saving ? (
                    <>
                      <Icon name="progress_activity" size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Icon name="check" size={16} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notification Preferences Card */}
        <div className="card-v2 p-6 mb-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-[#CE1126]/10 rounded-xl flex items-center justify-center">
              <Icon name="notifications" size={20} className="text-[#CE1126]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
              <p className="text-sm text-gray-500">Manage how you receive updates</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-gray-900">Email Notifications</p>
                <p className="text-sm text-gray-500">Receive booking confirmations and updates</p>
              </div>
              <button 
                onClick={() => toggleNotification('emailNotifications')}
                className={`toggle-switch ${notificationPrefs.emailNotifications ? 'toggle-switch-active' : ''}`}
                aria-label="Toggle email notifications"
              >
                <span className="toggle-switch-knob"></span>
              </button>
            </div>
            
            <div className="h-px bg-gray-100"></div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-gray-900">SMS Notifications</p>
                <p className="text-sm text-gray-500">Get text messages for important updates</p>
              </div>
              <button 
                onClick={() => toggleNotification('smsNotifications')}
                className={`toggle-switch ${notificationPrefs.smsNotifications ? 'toggle-switch-active' : ''}`}
                aria-label="Toggle SMS notifications"
              >
                <span className="toggle-switch-knob"></span>
              </button>
            </div>
            
            <div className="h-px bg-gray-100"></div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-gray-900">Booking Reminders</p>
                <p className="text-sm text-gray-500">Reminders before your appointments</p>
              </div>
              <button 
                onClick={() => toggleNotification('bookingReminders')}
                className={`toggle-switch ${notificationPrefs.bookingReminders ? 'toggle-switch-active' : ''}`}
                aria-label="Toggle booking reminders"
              >
                <span className="toggle-switch-knob"></span>
              </button>
            </div>
            
            <div className="h-px bg-gray-100"></div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-gray-900">Promotional Emails</p>
                <p className="text-sm text-gray-500">Special offers and new salon announcements</p>
              </div>
              <button 
                onClick={() => toggleNotification('promotionalEmails')}
                className={`toggle-switch ${notificationPrefs.promotionalEmails ? 'toggle-switch-active' : ''}`}
                aria-label="Toggle promotional emails"
              >
                <span className="toggle-switch-knob"></span>
              </button>
            </div>
          </div>
        </div>

        {/* Platform Feedback */}
        <PlatformFeedback />

        {/* Account Actions Card */}
        <div className="card-v2 p-6 mb-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <h3 className="text-lg font-semibold text-gray-900 mb-5">Account Actions</h3>
          
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 p-3.5 border-2 border-gray-200 rounded-xl text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all font-medium"
          >
            <Icon name="logout" size={20} />
            Log Out
          </button>
          
          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <button className="text-red-500 text-sm hover:text-red-600 transition-colors">
              Delete Account
            </button>
          </div>
        </div>

        {/* Menu Items */}
        <div className="card-v2 overflow-hidden mb-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          {menuItems.map((item, index) => (
            <a 
              key={item.label} 
              href={item.href}
              onClick={item.onClick}
              className={'w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors ' + (index !== menuItems.length - 1 ? 'border-b border-gray-100' : '')}
            >
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon name={item.icon} size={20} className="text-gray-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900">{item.label}</p>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
              <Icon name="chevron_right" size={20} className="text-gray-400 flex-shrink-0" />
            </a>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 pt-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <p className="font-medium">GroomLink Ghana</p>
          <p className="mt-1">Connecting you to the best salons in Accra</p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <a href="https://groomlinkgh.com/privacy" className="hover:text-[#CE1126] transition-colors">Privacy Policy</a>
            <span>•</span>
            <a href="https://groomlinkgh.com/terms" className="hover:text-[#CE1126] transition-colors">Terms of Service</a>
          </div>
          <p className="mt-3 text-xs">© 2026 GroomLink. Made with ❤️ in Ghana</p>
        </div>
      </div>
    </div>
  )
}
