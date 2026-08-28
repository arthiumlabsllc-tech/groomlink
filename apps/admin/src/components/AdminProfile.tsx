import { useState, useRef, useEffect } from 'react';
import Icon from './Icon';
import { useAuth } from '../hooks';

export default function AdminProfile() {
  const { user, updateProfile, uploadAvatar } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Avatar state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState('');
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Populate form when user data loads
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image must be under 5MB');
      return;
    }

    setAvatarError('');
    setAvatarFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setAvatarError('');
    setAvatarSuccess(false);

    try {
      await uploadAvatar.mutateAsync({ file: avatarFile });
      setAvatarSuccess(true);
      setAvatarFile(null);
      setAvatarPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setAvatarSuccess(false), 3000);
    } catch (err: any) {
      setAvatarError(err?.response?.data?.message || 'Failed to upload avatar');
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!firstName.trim() || firstName.trim().length < 2) {
      setError('First name must be at least 2 characters');
      return;
    }
    if (!lastName.trim() || lastName.trim().length < 2) {
      setError('Last name must be at least 2 characters');
      return;
    }

    try {
      await updateProfile.mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update profile');
    }
  };

  const profileBusy = updateProfile.isPending;
  const avatarBusy = uploadAvatar.isPending;

  // Get initials for avatar fallback
  const initials = `${(user?.firstName || '?')[0]}${(user?.lastName || '?')[0]}`.toUpperCase();
  const currentAvatar = user?.avatar || null;

  return (
    <div className="card-v2 overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-gray-100 bg-gray-50/50">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
          <Icon name="person" size={16} className="text-[#006B3F] sm:w-5 sm:h-5" />
          Admin Profile
        </h2>
        <p className="text-xs text-gray-500 mt-1">Update your name, email, and profile picture</p>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* ── Avatar Section ── */}
        <div className="flex flex-col sm:flex-row items-center gap-5">
          {/* Avatar display */}
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-[#006B3F] to-[#FCD116] flex items-center justify-center ring-4 ring-gray-100">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : currentAvatar ? (
                <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-white">{initials}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center cursor-pointer"
              title="Change avatar"
            >
              <Icon name="camera_alt" size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>

          {/* Avatar controls */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-sm font-medium text-[#006B3F] bg-[#006B3F]/10 rounded-xl hover:bg-[#006B3F]/20 transition-colors"
            >
              Choose New Photo
            </button>

            {avatarPreview && (
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={handleAvatarUpload}
                  disabled={avatarBusy}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#006B3F] rounded-xl hover:bg-[#005a35] disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {avatarBusy ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Icon name="cloud_upload" size={16} />
                      Upload
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAvatarPreview(null);
                    setAvatarFile(null);
                    setAvatarError('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {avatarError && (
              <p className="text-xs text-[#CE1126] flex items-center gap-1 justify-center sm:justify-start">
                <Icon name="error" size={14} /> {avatarError}
              </p>
            )}
            {avatarSuccess && (
              <p className="text-xs text-green-600 flex items-center gap-1 justify-center sm:justify-start">
                <Icon name="check_circle" size={14} /> Avatar updated!
              </p>
            )}
            <p className="text-xs text-gray-400">JPG, PNG or GIF. Max 5MB.</p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* ── Profile Form ── */}
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
              <div className="relative">
                <Icon name="person" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 text-sm bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-[#006B3F] transition-all placeholder-gray-400"
                  placeholder="Enter first name"
                  required
                  minLength={2}
                  disabled={profileBusy}
                />
              </div>
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
              <div className="relative">
                <Icon name="person" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 text-sm bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-[#006B3F] transition-all placeholder-gray-400"
                  placeholder="Enter last name"
                  required
                  minLength={2}
                  disabled={profileBusy}
                />
              </div>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
            <div className="relative">
              <Icon name="mail" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 text-sm bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-[#006B3F] transition-all placeholder-gray-400"
                placeholder="admin@example.com"
                disabled={profileBusy}
              />
            </div>
          </div>

          {/* Role badge (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#006B3F]/10 text-[#006B3F] rounded-lg text-sm font-medium">
              <Icon name="shield" size={14} />
              {(user?.role || '').replace('_', ' ')}
            </div>
          </div>

          {/* Error / Success */}
          {error && (
            <div className="bg-[#CE1126]/10 border border-[#CE1126]/20 text-[#CE1126] px-4 py-3 rounded-xl text-sm flex items-center gap-2">
              <Icon name="error" size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
              <Icon name="check_circle" size={16} className="flex-shrink-0" />
              Profile updated successfully!
            </div>
          )}

          {/* Save Button */}
          <button
            type="submit"
            disabled={profileBusy}
            className="w-full px-4 py-3 text-sm font-semibold text-white bg-[#006B3F] rounded-xl hover:bg-[#005a35] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {profileBusy ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Icon name="save" size={16} />
                Save Changes
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
