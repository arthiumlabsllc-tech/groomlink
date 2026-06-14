import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useDarkMode } from '../hooks/useDarkMode';
import Icon from '../components/Icon';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  avatar: string | null;
  role: string;
}

interface AgentSettings {
  emailNotifications: boolean;
  soundNotifications: boolean;
  desktopNotifications: boolean;
  status: 'ONLINE' | 'AWAY' | 'OFFLINE';
  awayMessage: string | null;
  autoAssign: boolean;
}

export default function Settings() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<AgentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isDark, toggleDark } = useDarkMode();

  // Persist settings to localStorage so notification utils can read them
  useEffect(() => {
    if (settings) {
      localStorage.setItem('support_settings', JSON.stringify({
        soundNotifications: settings.soundNotifications,
        desktopNotifications: settings.desktopNotifications,
      }));
    }
  }, [settings?.soundNotifications, settings?.desktopNotifications]);

  // Editable fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [awayMessage, setAwayMessage] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await api.getAgentProfile();
      if (res.success) {
        setUser(res.data.user);
        setSettings(res.data.settings);
        setFirstName(res.data.user.firstName);
        setLastName(res.data.user.lastName);
        setAwayMessage(res.data.settings?.awayMessage || '');
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      showMessage('error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showMessage('error', 'File size must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      showMessage('error', 'Please upload an image file');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://groomlinkgh.com/api'}/uploads/avatar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const json = await res.json();
      if (json.success) {
        setUser(prev => prev ? { ...prev, avatar: json.data.avatar } : null);
        showMessage('success', 'Avatar updated successfully');
        await loadProfile();
      } else {
        showMessage('error', json.error?.message || 'Upload failed');
        console.error('Upload error:', json);
      }
    } catch (error) {
      console.error('Avatar upload failed:', error);
      showMessage('error', 'Failed to upload avatar');
    } finally {
      setSaving(false);
    }
  };

  const handleProfileUpdate = async () => {
    setSaving(true);
    try {
      const res = await api.updateAgentProfile({ firstName, lastName });
      if (res.success) {
        setUser(res.data.user);
        showMessage('success', 'Profile updated successfully');
      }
    } catch (error) {
      showMessage('error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDesktopNotificationsToggle = async (enabled: boolean) => {
    if (!settings) return;
    if (enabled && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        showMessage('error', 'Browser notification permission denied. Please enable in browser settings.');
        return;
      }
      showMessage('success', 'Desktop notifications enabled');
    }
    setSettings({ ...settings, desktopNotifications: enabled });
  };

  const handleSettingsUpdate = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await api.updateAgentSettings({
        emailNotifications: settings.emailNotifications,
        soundNotifications: settings.soundNotifications,
        desktopNotifications: settings.desktopNotifications,
        autoAssign: settings.autoAssign,
      });
      showMessage('success', 'Settings updated successfully');
    } catch (error) {
      showMessage('error', 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await api.updateAgentStatus({
        status: settings.status,
        awayMessage: settings.status === 'AWAY' ? awayMessage : null,
      });
      showMessage('success', 'Status updated successfully');
    } catch (error) {
      showMessage('error', 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ghana-green"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your profile and preferences</p>
      </div>

      {/* Message Toast */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Profile Section */}
      <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile</h2>
        
        <div className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-6">
            <div className="relative">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.firstName}
                  className="w-24 h-24 rounded-full object-cover border-2 border-ghana-green"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-ghana-green to-support-700 rounded-full flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">
                    {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
                className="px-4 py-2 bg-ghana-green text-white rounded-lg hover:bg-ghana-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Uploading...' : 'Upload Avatar'}
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">JPG, PNG or GIF. Max 5MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ghana-green focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ghana-green focus:border-transparent"
              />
            </div>
          </div>

          {/* Email & Role (Read-only) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Email</label>
              <input
                type="text"
                value={user?.email || 'Not set'}
                disabled
                className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Role</label>
              <input
                type="text"
                value={user?.role?.replace('_', ' ')}
                disabled
                className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
            </div>
          </div>

          <button
            onClick={handleProfileUpdate}
            disabled={saving}
            className="px-6 py-2.5 bg-ghana-green text-white rounded-lg hover:bg-ghana-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appearance</h2>
        <label className="flex items-center justify-between cursor-pointer">
          <div className="flex items-center gap-3">
            <Icon name={isDark ? 'dark_mode' : 'light_mode'} size={20} className="text-gray-500 dark:text-gray-400" />
            <div>
              <p className="text-gray-900 dark:text-white font-medium">Dark Mode</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Switch between light and dark theme</p>
            </div>
          </div>
          <button
            onClick={toggleDark}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${isDark ? 'bg-ghana-green' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200 shadow-sm ${isDark ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </label>
      </div>

      {/* Notification Preferences */}
      {settings && (
        <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notification Preferences</h2>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-gray-900 dark:text-white font-medium">Email Notifications</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Receive email alerts for new tickets</p>
              </div>
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-ghana-green focus:ring-ghana-green"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-gray-900 dark:text-white font-medium">Sound Alerts</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Play sound for new messages and tickets</p>
              </div>
              <input
                type="checkbox"
                checked={settings.soundNotifications}
                onChange={(e) => setSettings({ ...settings, soundNotifications: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-ghana-green focus:ring-ghana-green"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-gray-900 dark:text-white font-medium">Desktop Notifications</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Show browser notifications</p>
              </div>
              <input
                type="checkbox"
                checked={settings.desktopNotifications}
                onChange={(e) => handleDesktopNotificationsToggle(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-ghana-green focus:ring-ghana-green"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-gray-900 dark:text-white font-medium">Auto-Assign</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Automatically assign new chats to me</p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoAssign}
                onChange={(e) => setSettings({ ...settings, autoAssign: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-ghana-green focus:ring-ghana-green"
              />
            </label>

            <button
              onClick={handleSettingsUpdate}
              disabled={saving}
              className="px-6 py-2.5 bg-ghana-green text-white rounded-lg hover:bg-ghana-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      )}

      {/* Availability Settings */}
      {settings && (
        <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Availability</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Status</label>
              <select
                value={settings.status}
                onChange={(e) => setSettings({ ...settings, status: e.target.value as any })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ghana-green focus:border-transparent"
              >
                <option value="ONLINE">Online</option>
                <option value="AWAY">Away</option>
                <option value="OFFLINE">Offline</option>
              </select>
            </div>

            {settings.status === 'AWAY' && (
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Away Message</label>
                <textarea
                  value={awayMessage}
                  onChange={(e) => setAwayMessage(e.target.value)}
                  placeholder="Tell visitors when you'll be back..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ghana-green focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{awayMessage.length}/500</p>
              </div>
            )}

            <button
              onClick={handleStatusUpdate}
              disabled={saving}
              className="px-6 py-2.5 bg-ghana-green text-white rounded-lg hover:bg-ghana-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
