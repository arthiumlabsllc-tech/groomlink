import { useState } from 'react';
import Icon from './Icon';
import { useAuth } from '../hooks';

export default function PasswordChange() {
  const { changePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!currentPassword) {
      setError('Current password is required');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 'Failed to change password. Please try again.';
      setError(errorMessage);
    }
  };

  const busy = changePassword.isPending;

  return (
    <div className="card-v2 overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-gray-100 bg-gray-50/50">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
          <Icon name="lock" size={16} className="text-[#006B3F] sm:w-5 sm:h-5" />
          Change Password
        </h2>
        <p className="text-xs text-gray-500 mt-1">Update your admin account password</p>
      </div>

      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
        {/* Current Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Password
          </label>
          <div className="relative">
            <Icon name="lock" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full pl-11 pr-12 py-3 text-sm bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-[#006B3F] transition-all placeholder-gray-400"
              placeholder="Enter current password"
              required
              disabled={busy}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
              aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
            >
              <Icon name={showCurrentPassword ? 'visibility_off' : 'visibility'} size={18} />
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Password
          </label>
          <div className="relative">
            <Icon name="lock" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full pl-11 pr-12 py-3 text-sm bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-[#006B3F] transition-all placeholder-gray-400"
              placeholder="Enter new password (min 8 characters)"
              required
              minLength={8}
              disabled={busy}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
              aria-label={showNewPassword ? 'Hide password' : 'Show password'}
            >
              <Icon name={showNewPassword ? 'visibility_off' : 'visibility'} size={18} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters long</p>
        </div>

        {/* Confirm New Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirm New Password
          </label>
          <div className="relative">
            <Icon name="lock" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-11 pr-12 py-3 text-sm bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-[#006B3F] transition-all placeholder-gray-400"
              placeholder="Confirm new password"
              required
              disabled={busy}
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-[#CE1126]/10 border border-[#CE1126]/20 text-[#CE1126] px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <Icon name="error" size={16} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <Icon name="check_circle" size={16} className="flex-shrink-0" />
            Password changed successfully!
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={busy}
          className="w-full px-4 py-3 text-sm font-semibold text-white bg-[#006B3F] rounded-xl hover:bg-[#005a35] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {busy ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Changing Password...
            </>
          ) : (
            <>
              <Icon name="lock" size={16} />
              Change Password
            </>
          )}
        </button>
      </form>
    </div>
  );
}
