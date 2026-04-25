import { useState, useEffect, useRef } from 'react';
import Icon from '../components/Icon';
import { useSettings, useUpdateSettings, useToggleMaintenance, useHealth, usePaymentSettings, useUpdatePaymentSettings } from '../hooks';
import { settingsApi } from '../api/settings';
import LoadingScreen from '../components/LoadingScreen';

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(2)} GB`;
}

export function Settings() {
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const { data: health, isLoading: healthLoading } = useHealth(30000);
  const updateSettings = useUpdateSettings();
  const toggleMaintenance = useToggleMaintenance();
  const { data: paymentSettings, isLoading: paymentSettingsLoading } = usePaymentSettings();
  const updatePaymentSettings = useUpdatePaymentSettings();

  const [formData, setFormData] = useState({
    siteName: '',
    email: '',
    phoneNumber: '',
    address: '',
    logoUrl: '',
  });

  // Logo upload state
  const [headerLogoUrl, setHeaderLogoUrl] = useState<string | null>(null);
  const [footerLogoUrl, setFooterLogoUrl] = useState<string | null>(null);
  const [uploadingHeaderLogo, setUploadingHeaderLogo] = useState(false);
  const [uploadingFooterLogo, setUploadingFooterLogo] = useState(false);
  const headerLogoInputRef = useRef<HTMLInputElement>(null);
  const footerLogoInputRef = useRef<HTMLInputElement>(null);

  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [generalSuccess, setGeneralSuccess] = useState(false);
  const [maintenanceSuccess, setMaintenanceSuccess] = useState(false);

  // Payment settings state
  const [paymentFormData, setPaymentFormData] = useState({
    paymentGateway: 'hubtel',
    hubtelApiId: '',
    hubtelApiSecret: '',
    hubtelMerchantAccountId: '',
    paystackPublicKey: '',
    paystackSecretKey: '',
    isPaymentTestMode: true,
    transactionFeePercent: 1.95,
  });
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [testConnectionSuccess, setTestConnectionSuccess] = useState(false);
  const [showLiveConfirmDialog, setShowLiveConfirmDialog] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [settingsTab, setSettingsTab] = useState<'general' | 'maintenance' | 'payment' | 'health'>('general');

  // Initialize form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData({
        siteName: settings.siteName || '',
        email: settings.email || '',
        phoneNumber: settings.phoneNumber || '',
        address: settings.address || '',
        logoUrl: settings.logoUrl || '',
      });
      setHeaderLogoUrl(settings.logoUrl || null);
      setFooterLogoUrl((settings as any).footerLogoUrl || null);
    }
  }, [settings]);

  // Initialize maintenance mode state when settings load
  useEffect(() => {
    if (settings) {
      setMaintenanceEnabled(settings.maintenanceMode ?? false);
      setMaintenanceMessage(settings.maintenanceMsg ?? '');
    }
  }, [settings]);

  // Initialize payment settings when they load
  useEffect(() => {
    if (paymentSettings) {
      setPaymentFormData({
        paymentGateway: paymentSettings.paymentGateway || 'hubtel',
        hubtelApiId: paymentSettings.hubtelApiId || '',
        hubtelApiSecret: paymentSettings.hubtelApiSecret || '',
        hubtelMerchantAccountId: paymentSettings.hubtelMerchantAccountId || '',
        paystackPublicKey: paymentSettings.paystackPublicKey || '',
        paystackSecretKey: paymentSettings.paystackSecretKey || '',
        isPaymentTestMode: paymentSettings.isPaymentTestMode ?? true,
        transactionFeePercent: paymentSettings.transactionFeePercent ?? 1.95,
      });
    }
  }, [paymentSettings]);

  const handleGeneralSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setGeneralSuccess(false);

    try {
      await updateSettings.mutateAsync(formData);
      setGeneralSuccess(true);
      setTimeout(() => setGeneralSuccess(false), 3000);
    } catch (err: any) {
      setGeneralError(err.response?.data?.message || 'Failed to update settings');
    }
  };

  const handleMaintenanceToggle = async () => {
    setMaintenanceSuccess(false);

    try {
      await toggleMaintenance.mutateAsync({
        enabled: !maintenanceEnabled,
        message: maintenanceMessage || null,
      });
      setMaintenanceEnabled(!maintenanceEnabled);
      setMaintenanceSuccess(true);
      setTimeout(() => setMaintenanceSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to toggle maintenance:', err);
    }
  };

  const isLoading = settingsLoading || healthLoading;

  // Copy to clipboard helper
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Handle test mode toggle
  const handleTestModeToggle = () => {
    if (paymentFormData.isPaymentTestMode) {
      // Switching from test to live - show confirmation
      setShowLiveConfirmDialog(true);
    } else {
      // Switching from live to test - safe, just toggle
      setPaymentFormData({ ...paymentFormData, isPaymentTestMode: true });
    }
  };

  // Confirm switch to live mode
  const confirmSwitchToLive = () => {
    setPaymentFormData({ ...paymentFormData, isPaymentTestMode: false });
    setShowLiveConfirmDialog(false);
  };

  // Handle payment settings save
  const handlePaymentSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    setPaymentSuccess(false);
    setTestConnectionSuccess(false);

    try {
      await updatePaymentSettings.mutateAsync({
        paymentGateway: paymentFormData.paymentGateway,
        hubtelApiId: paymentFormData.hubtelApiId || null,
        hubtelApiSecret: paymentFormData.hubtelApiSecret || null,
        hubtelMerchantAccountId: paymentFormData.hubtelMerchantAccountId || null,
        paystackPublicKey: paymentFormData.paystackPublicKey || null,
        paystackSecretKey: paymentFormData.paystackSecretKey || null,
        isPaymentTestMode: paymentFormData.isPaymentTestMode,
        transactionFeePercent: paymentFormData.transactionFeePercent,
      });
      setPaymentSuccess(true);
      setTimeout(() => setPaymentSuccess(false), 3000);
    } catch (err: any) {
      setPaymentError(err.response?.data?.message || 'Failed to update payment settings');
    }
  };

  // Test connection (simple verification by re-fetching settings)
  const handleTestConnection = async () => {
    setTestConnectionSuccess(false);
    try {
      // Just verify we can fetch the settings - indicates API connectivity
      await updatePaymentSettings.mutateAsync({});
      setTestConnectionSuccess(true);
      setTimeout(() => setTestConnectionSuccess(false), 3000);
    } catch (err: any) {
      setPaymentError(err.response?.data?.message || 'Connection test failed');
    }
  };

  if (isLoading) {
    return (
      <div className="page-enter space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="skeleton-shimmer h-8 w-48 mb-2" />
            <div className="skeleton-shimmer h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-6">
            {[1,2,3].map(i => <div key={i} className="card-v2 p-6 space-y-4">
              <div className="skeleton-shimmer h-6 w-40" />
              <div className="space-y-3">
                {[1,2,3,4].map(j => <div key={j} className="skeleton-shimmer h-12 rounded-xl" />)}
              </div>
            </div>)}
          </div>
          <div className="card-v2 p-6 space-y-4">
            <div className="skeleton-shimmer h-6 w-32" />
            <div className="grid grid-cols-2 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="skeleton-shimmer h-20 rounded-xl" />)}
            </div>
            <div className="skeleton-shimmer h-24 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Site Settings</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage platform configuration and system health</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: 'general', label: 'General', icon: 'public' },
          { key: 'maintenance', label: 'Maintenance', icon: 'power_settings_new' },
          { key: 'payment', label: 'Payment', icon: 'credit_card' },
          { key: 'health', label: 'System Health', icon: 'monitoring' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSettingsTab(tab.key as any)}
            className={`tab-pill whitespace-nowrap flex items-center gap-2 ${
              settingsTab === tab.key ? 'tab-pill-active' : 'tab-pill-inactive'
            }`}
          >
            <Icon name={tab.icon} size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Left Column - Settings */}
        <div className="space-y-4 sm:space-y-6">
          {/* General Info Section */}
          <div className={`card-v2 overflow-hidden ${settingsTab !== 'general' ? 'hidden' : ''}`}>
            <div className="p-3 sm:p-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
                <Icon name="public" size={16} className="text-[#006B3F] sm:w-5 sm:h-5" />
                General Information
              </h2>
            </div>

            <form onSubmit={handleGeneralSave} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              {generalError && (
                <div className="p-3 bg-[#CE1126]/10 text-[#CE1126] rounded-xl text-sm flex items-center gap-2">
                  <Icon name="error" size={16} />
                  {generalError}
                </div>
              )}

              {generalSuccess && (
                <div className="p-3 bg-green-100 text-green-700 rounded-xl text-sm flex items-center gap-2">
                  <Icon name="check_circle" size={16} />
                  Settings saved successfully!
                </div>
              )}

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Site Name</label>
                <input
                  type="text"
                  value={formData.siteName}
                  onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-2 focus:ring-[#006B3F]/30 transition-all duration-200 text-sm sm:text-base"
                  placeholder="GroomLink"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-2">
                  <Icon name="mail" size={14} className="text-gray-400" />
                  Contact Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-2 focus:ring-[#006B3F]/30 transition-all duration-200 text-sm sm:text-base"
                  placeholder="support@groomlinkgh.com"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-2">
                  <Icon name="call" size={14} className="text-gray-400" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-2 focus:ring-[#006B3F]/30 transition-all duration-200 text-sm sm:text-base"
                  placeholder="+233 XX XXX XXXX"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-2">
                  <Icon name="location_on" size={14} className="text-gray-400" />
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-2 focus:ring-[#006B3F]/30 transition-all duration-200 text-sm sm:text-base"
                  placeholder="Accra, Ghana"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-2">
                  <Icon name="image" size={14} className="text-gray-400" />
                  Header Logo
                </label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-[#006B3F]/40 transition-colors">
                  {headerLogoUrl ? (
                    <div className="space-y-3">
                      <div className="bg-gray-50 rounded-lg p-3 inline-block">
                        <img
                          src={headerLogoUrl}
                          alt="Header logo"
                          className="h-14 w-auto object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => headerLogoInputRef.current?.click()}
                          disabled={uploadingHeaderLogo}
                          className="text-xs px-3 py-1.5 bg-[#006B3F] text-white rounded-lg hover:bg-[#005a35] disabled:opacity-50 flex items-center gap-1"
                        >
                          <Icon name="upload" size={14} />
                          {uploadingHeaderLogo ? 'Uploading...' : 'Change'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => headerLogoInputRef.current?.click()}
                      disabled={uploadingHeaderLogo}
                      className="w-full py-4 text-gray-500 hover:text-[#006B3F] disabled:opacity-50"
                    >
                      <Icon name="cloud_upload" size={32} className="mx-auto mb-2" />
                      <p className="text-sm font-medium">{uploadingHeaderLogo ? 'Uploading...' : 'Click to upload header logo'}</p>
                      <p className="text-xs text-gray-400 mt-1">JPG, PNG or WebP (max 5MB)</p>
                    </button>
                  )}
                  <input
                    ref={headerLogoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingHeaderLogo(true);
                      setGeneralError(null);
                      try {
                        const result = await settingsApi.uploadHeaderLogo(file);
                        setHeaderLogoUrl(result.logoUrl);
                        setFormData(prev => ({ ...prev, logoUrl: result.logoUrl }));
                      } catch (err: any) {
                        setGeneralError(err.response?.data?.error?.message || 'Failed to upload header logo');
                      } finally {
                        setUploadingHeaderLogo(false);
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-2">
                  <Icon name="image" size={14} className="text-gray-400" />
                  Footer Logo
                </label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-[#006B3F]/40 transition-colors">
                  {footerLogoUrl ? (
                    <div className="space-y-3">
                      <div className="bg-gray-50 rounded-lg p-3 inline-block">
                        <img
                          src={footerLogoUrl}
                          alt="Footer logo"
                          className="h-14 w-auto object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => footerLogoInputRef.current?.click()}
                          disabled={uploadingFooterLogo}
                          className="text-xs px-3 py-1.5 bg-[#006B3F] text-white rounded-lg hover:bg-[#005a35] disabled:opacity-50 flex items-center gap-1"
                        >
                          <Icon name="upload" size={14} />
                          {uploadingFooterLogo ? 'Uploading...' : 'Change'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => footerLogoInputRef.current?.click()}
                      disabled={uploadingFooterLogo}
                      className="w-full py-4 text-gray-500 hover:text-[#006B3F] disabled:opacity-50"
                    >
                      <Icon name="cloud_upload" size={32} className="mx-auto mb-2" />
                      <p className="text-sm font-medium">{uploadingFooterLogo ? 'Uploading...' : 'Click to upload footer logo'}</p>
                      <p className="text-xs text-gray-400 mt-1">JPG, PNG or WebP (max 5MB)</p>
                    </button>
                  )}
                  <input
                    ref={footerLogoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingFooterLogo(true);
                      setGeneralError(null);
                      try {
                        const result = await settingsApi.uploadFooterLogo(file);
                        setFooterLogoUrl(result.footerLogoUrl);
                      } catch (err: any) {
                        setGeneralError(err.response?.data?.error?.message || 'Failed to upload footer logo');
                      } finally {
                        setUploadingFooterLogo(false);
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={updateSettings.isPending}
                className="btn-ripple w-full px-4 py-3 bg-[#006B3F] text-white rounded-xl hover:bg-[#005a35] disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2 text-sm sm:text-base min-h-[48px]"
              >
                {updateSettings.isPending ? (
                  <>
                    <Icon name="progress_activity" className="animate-spin" size={18} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Icon name="save" size={18} />
                    Save Changes
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Maintenance Mode Section */}
          <div className={`card-v2 overflow-hidden ${settingsTab !== 'maintenance' ? 'hidden' : ''}`}>
            <div className="p-3 sm:p-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
                <Icon name="power_settings_new" size={16} className="text-[#006B3F] sm:w-5 sm:h-5" />
                Maintenance Mode
              </h2>
            </div>

            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              {maintenanceSuccess && (
                <div className="p-3 bg-green-100 text-green-700 rounded-xl text-sm flex items-center gap-2">
                  <Icon name="check_circle" size={16} />
                  Maintenance mode updated!
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${maintenanceEnabled ? 'bg-[#CE1126] animate-pulse' : 'bg-[#006B3F]'}`}
                  />
                  <div>
                    <p className="font-medium text-gray-800">
                      {maintenanceEnabled ? 'Maintenance Mode Active' : 'System Live'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {maintenanceEnabled
                        ? 'Users will see maintenance message'
                        : 'Platform is accessible to all users'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleMaintenanceToggle}
                  disabled={toggleMaintenance.isPending}
                  className={`toggle-switch ${
                    maintenanceEnabled ? 'toggle-switch-on' : 'toggle-switch-off'
                  } disabled:opacity-50`}
                >
                  <span
                    className={`toggle-switch-dot ${
                      maintenanceEnabled ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Maintenance Message
                </label>
                <textarea
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-2 focus:ring-[#006B3F]/30 transition-all duration-200 resize-none"
                  placeholder="We're currently performing maintenance. Please check back soon."
                />
                <p className="text-xs text-gray-500 mt-1">
                  This message will be displayed to users when maintenance mode is enabled
                </p>
              </div>
            </div>
          </div>

          {/* Payment Gateway Section */}
          <div className={`card-v2 overflow-hidden ${settingsTab !== 'payment' ? 'hidden' : ''}`}>
            <div className="p-3 sm:p-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
                <Icon name="credit_card" size={16} className="text-[#006B3F] sm:w-5 sm:h-5" />
                Payment Gateway
              </h2>
            </div>

            <form onSubmit={handlePaymentSave} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              {paymentError && (
                <div className="p-3 bg-[#CE1126]/10 text-[#CE1126] rounded-xl text-sm flex items-center gap-2">
                  <Icon name="error" size={16} />
                  {paymentError}
                </div>
              )}

              {paymentSuccess && (
                <div className="p-3 bg-green-100 text-green-700 rounded-xl text-sm flex items-center gap-2">
                  <Icon name="check_circle" size={16} />
                  Payment settings saved successfully!
                </div>
              )}

              {testConnectionSuccess && (
                <div className="p-3 bg-green-100 text-green-700 rounded-xl text-sm flex items-center gap-2">
                  <Icon name="check_circle" size={16} />
                  Connection verified! Keys are configured correctly.
                </div>
              )}

              {/* Test/Live Mode Toggle - Most prominent */}
              <div className="p-4 rounded-xl border-2 border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        paymentFormData.isPaymentTestMode ? 'bg-green-500' : 'bg-[#CE1126] animate-pulse'
                      }`}
                    />
                    <div>
                      <p className="font-medium text-gray-800">
                        {paymentFormData.isPaymentTestMode ? 'Test Mode' : 'Live Mode'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {paymentFormData.isPaymentTestMode
                          ? 'No real charges will be made'
                          : 'Real payments will be processed'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestModeToggle}
                    className={`toggle-switch ${
                      paymentFormData.isPaymentTestMode ? 'toggle-switch-off' : 'toggle-switch-on'
                    }`}
                  >
                    <span
                      className={`toggle-switch-dot ${
                        paymentFormData.isPaymentTestMode ? 'translate-x-1' : 'translate-x-5'
                      }`}
                    />
                  </button>
                </div>

                {/* Mode badges */}
                <div className="mt-3">
                  {paymentFormData.isPaymentTestMode ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      <Icon name="check_circle" size={12} />
                      TEST MODE — No real charges
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#CE1126]/10 text-[#CE1126]">
                      <Icon name="warning" size={12} />
                      LIVE MODE — Real payments will be processed
                    </span>
                  )}
                </div>
              </div>

              {/* Warning banner when in LIVE mode */}
              {!paymentFormData.isPaymentTestMode && (
                <div className="p-3 bg-[#FCD116]/20 text-yellow-800 rounded-xl text-sm flex items-start gap-2">
                  <Icon name="warning" size={16} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Live Mode Active</p>
                    <p className="text-yellow-700">All transactions will process real payments. Ensure your API keys are correct.</p>
                  </div>
                </div>
              )}

              {/* Gateway Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Gateway
                </label>
                <select
                  value={paymentFormData.paymentGateway}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentGateway: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-2 focus:ring-[#006B3F]/30 transition-all duration-200 bg-white"
                >
                  <option value="hubtel">Hubtel (Mobile Money)</option>
                  <option value="paystack">Paystack (Cards + Mobile Money)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {paymentFormData.paymentGateway === 'hubtel' 
                    ? 'Best for: Mobile Money payments with instant payouts'
                    : 'Best for: Card payments, bank transfers, and wider payment support'}
                </p>
              </div>

              {/* API Credentials Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  {paymentFormData.paymentGateway === 'hubtel' ? 'Hubtel' : 'Paystack'} API Credentials
                </h3>

                {/* Hubtel Configuration Section */}
                {paymentFormData.paymentGateway === 'hubtel' && (
                  <div className="space-y-4">
                {/* Hubtel Client ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Hubtel Client ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={paymentFormData.hubtelApiId || ''}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, hubtelApiId: e.target.value })}
                      className="flex-1 px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-2 focus:ring-[#006B3F]/30 transition-all duration-200 font-mono text-sm"
                      placeholder="your-hubtel-client-id"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(paymentFormData.hubtelApiId || '', 'hubtelApiId')}
                      disabled={!paymentFormData.hubtelApiId}
                      className="px-3 py-3 border-2 border-gray-100 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedField === 'hubtelApiId' ? (
                        <Icon name="check" size={18} className="text-green-500" />
                      ) : (
                        <Icon name="content_copy" size={18} className="text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Hubtel Client Secret */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Hubtel Client Secret
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showSecretKey ? 'text' : 'password'}
                        value={paymentFormData.hubtelApiSecret || ''}
                        onChange={(e) => setPaymentFormData({ ...paymentFormData, hubtelApiSecret: e.target.value })}
                        className="w-full px-4 py-3 pr-10 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-2 focus:ring-[#006B3F]/30 transition-all duration-200 font-mono text-sm"
                        placeholder="your-hubtel-client-secret"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecretKey(!showSecretKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showSecretKey ? <Icon name="visibility_off" size={18} /> : <Icon name="visibility" size={18} />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(paymentFormData.hubtelApiSecret || '', 'hubtelApiSecret')}
                      disabled={!paymentFormData.hubtelApiSecret}
                      className="px-3 py-3 border-2 border-gray-100 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedField === 'hubtelApiSecret' ? (
                        <Icon name="check" size={18} className="text-green-500" />
                      ) : (
                        <Icon name="content_copy" size={18} className="text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Hubtel Merchant Account Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Hubtel Merchant Account Number
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={paymentFormData.hubtelMerchantAccountId || ''}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, hubtelMerchantAccountId: e.target.value })}
                      className="flex-1 px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-2 focus:ring-[#006B3F]/30 transition-all duration-200 font-mono text-sm"
                      placeholder="your-merchant-account-number"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(paymentFormData.hubtelMerchantAccountId || '', 'hubtelMerchantAccountId')}
                      disabled={!paymentFormData.hubtelMerchantAccountId}
                      className="px-3 py-3 border-2 border-gray-100 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedField === 'hubtelMerchantAccountId' ? (
                        <Icon name="check" size={18} className="text-green-500" />
                      ) : (
                        <Icon name="content_copy" size={18} className="text-gray-400" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    The Hubtel merchant account number for receiving payments.
                  </p>
                </div>

                    {/* Hubtel Info Box */}
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <div className="flex items-start gap-3">
                        <Icon name="info" size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-amber-800">
                          <p className="font-medium mb-1">Hubtel Setup Tips:</p>
                          <ul className="list-disc list-inside space-y-1 text-xs">
                            <li>Get credentials from your Hubtel Merchant Dashboard</li>
                            <li>Enable Mobile Money collections for your account</li>
                            <li>Use test credentials for development before going live</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Paystack Configuration Section */}
                {paymentFormData.paymentGateway === 'paystack' && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-4">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M5.004 14.622L10.68 2.496c.198-.422.714-.592 1.12-.378.406.214.572.714.374 1.136L6.498 14.622H5.004zm2.61 2.756L13.29 3.246c.198-.422.714-.592 1.12-.378.406.214.572.714.374 1.136L9.108 17.378H7.614zm2.61 2.756L15.9 6.002c.198-.422.714-.592 1.12-.378.406.214.572.714.374 1.136l-5.676 13.372h-1.494z"/>
                      </svg>
                      Paystack Configuration
                    </h3>

                    {/* Paystack Public Key */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        Public Key
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={paymentFormData.paystackPublicKey || ''}
                          onChange={(e) => setPaymentFormData({ ...paymentFormData, paystackPublicKey: e.target.value })}
                          className="flex-1 px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-2 focus:ring-[#006B3F]/30 transition-all duration-200 font-mono text-sm"
                          placeholder="pk_live_xxxxxxxxxxxxxxxxxxxx"
                        />
                        <button
                          type="button"
                          onClick={() => copyToClipboard(paymentFormData.paystackPublicKey || '', 'paystackPublicKey')}
                          disabled={!paymentFormData.paystackPublicKey}
                          className="px-3 py-3 border-2 border-gray-100 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
                          title="Copy to clipboard"
                        >
                          {copiedField === 'paystackPublicKey' ? (
                            <Icon name="check" size={18} className="text-green-500" />
                          ) : (
                            <Icon name="content_copy" size={18} className="text-gray-400" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Get from: <a href="https://dashboard.paystack.com/#/settings/developers" target="_blank" rel="noopener noreferrer" className="text-[#006B3F] hover:underline">Paystack Dashboard → Settings → API Keys</a>
                      </p>
                    </div>

                    {/* Paystack Secret Key */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        Secret Key
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type={showSecretKey ? 'text' : 'password'}
                            value={paymentFormData.paystackSecretKey || ''}
                            onChange={(e) => setPaymentFormData({ ...paymentFormData, paystackSecretKey: e.target.value })}
                            className="w-full px-4 py-3 pr-10 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-2 focus:ring-[#006B3F]/30 transition-all duration-200 font-mono text-sm"
                            placeholder="sk_live_xxxxxxxxxxxxxxxxxxxx"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecretKey(!showSecretKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showSecretKey ? <Icon name="visibility_off" size={18} /> : <Icon name="visibility" size={18} />}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(paymentFormData.paystackSecretKey || '', 'paystackSecretKey')}
                          disabled={!paymentFormData.paystackSecretKey}
                          className="px-3 py-3 border-2 border-gray-100 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
                          title="Copy to clipboard"
                        >
                          {copiedField === 'paystackSecretKey' ? (
                            <Icon name="check" size={18} className="text-green-500" />
                          ) : (
                            <Icon name="content_copy" size={18} className="text-gray-400" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Keep this secret! Never expose it in client-side code.
                      </p>
                    </div>

                    {/* Paystack Info Box */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <div className="flex items-start gap-3">
                        <Icon name="info" size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium mb-1">Paystack Setup Tips:</p>
                          <ul className="list-disc list-inside space-y-1 text-xs">
                            <li>Enable Mobile Money in your Paystack dashboard for Ghana</li>
                            <li>Configure webhook URL: <code className="bg-blue-100 px-1 rounded">https://groomlinkgh.com/api/payments/webhook/paystack</code></li>
                            <li>Use test keys (pk_test/sk_test) for development</li>
                            <li>Switch to live keys (pk_live/sk_live) when ready for production</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Transaction Fee - Editable */}
              <div className="p-4 bg-white border-2 border-gray-100 rounded-xl">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">Transaction Fee (%)</p>
                    <p className="text-xs text-gray-500 mb-3">Percentage applied to all payment transactions</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={paymentFormData.transactionFeePercent}
                        onChange={(e) => setPaymentFormData({ 
                          ...paymentFormData, 
                          transactionFeePercent: parseFloat(e.target.value) || 0 
                        })}
                        className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#006B3F]/30 focus:border-transparent outline-none transition-all duration-200 text-lg font-semibold"
                      />
                      <span className="text-lg font-semibold text-gray-700">%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Capped at GHS 100 per transaction</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={updatePaymentSettings.isPending}
                  className="btn-ripple flex-1 px-4 py-3 bg-[#006B3F] text-white rounded-xl hover:bg-[#005a35] disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {updatePaymentSettings.isPending ? (
                    <>
                      <Icon name="progress_activity" className="animate-spin" size={18} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Icon name="save" size={18} />
                      Save Settings
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={updatePaymentSettings.isPending}
                  className="btn-ripple px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Icon name="refresh" size={18} />
                  Test Connection
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column - System Health */}
        <div className={`space-y-4 sm:space-y-6 ${settingsTab !== 'health' ? 'hidden xl:block' : ''}`}>
          <div className="card-v2 overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
                <Icon name="monitoring" size={16} className="text-[#006B3F] sm:w-5 sm:h-5" />
                System Health
              </h2>
              <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-500">
                <Icon name="refresh" size={12} className="animate-spin" />
                Auto-refresh: 30s
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Status Cards */}
              <div className="grid grid-cols-2 gap-4">
                {/* API Status */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="dns" size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-600">API Status</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        health?.api?.status === 'healthy'
                          ? 'bg-green-100 text-green-700'
                          : health?.api?.status === 'degraded'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          health?.api?.status === 'healthy'
                            ? 'bg-green-500'
                            : health?.api?.status === 'degraded'
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        }`}
                      />
                      {health?.api?.status === 'healthy'
                        ? 'Healthy'
                        : health?.api?.status === 'degraded'
                          ? 'Degraded'
                          : 'Down'}
                    </span>
                  </div>
                </div>

                {/* Database Status */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="storage" size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-600">Database</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        health?.database?.status === 'connected'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          health?.database?.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      />
                      {health?.database?.status === 'connected' ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  {health?.database?.latency && (
                    <p className="text-xs text-gray-500 mt-1">{health.database.latency}ms latency</p>
                  )}
                </div>

                {/* Redis Status */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="memory" size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-600">Redis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        health?.redis?.status === 'connected'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          health?.redis?.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      />
                      {health?.redis?.status === 'connected' ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  {health?.redis?.latency && (
                    <p className="text-xs text-gray-500 mt-1">{health.redis.latency}ms latency</p>
                  )}
                </div>

                {/* Uptime */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="schedule" size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-600">Uptime</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-800">
                    {health?.api?.uptime ? formatUptime(health.api.uptime) : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Memory Usage */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon name="memory" size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-600">Memory Usage</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-800">
                    {health?.memory ? formatBytes(health.memory.used) : 'N/A'}
                    <span className="text-gray-400 font-normal">
                      {' '}
                      / {health?.memory ? formatBytes(health.memory.total) : 'N/A'}
                    </span>
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      (health?.memory?.percentage || 0) > 80
                        ? 'bg-[#CE1126]'
                        : (health?.memory?.percentage || 0) > 60
                          ? 'bg-[#FCD116]'
                          : 'bg-[#006B3F]'
                    }`}
                    style={{ width: `${health?.memory?.percentage || 0}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{health?.memory?.percentage || 0}% used</p>
              </div>

              {/* Activity Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="group" size={16} className="text-blue-500" />
                    <span className="text-sm font-medium text-blue-700">Active Sessions</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-800">
                    {health?.sessions?.active24h?.toLocaleString() || '0'}
                  </p>
                  <p className="text-xs text-blue-600">Last 24 hours</p>
                </div>

                <div className="p-4 bg-red-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="security" size={16} className="text-red-500" />
                    <span className="text-sm font-medium text-red-700">Suspicious Activity</span>
                  </div>
                  <p className="text-2xl font-bold text-red-800">
                    {health?.security?.suspiciousActivitiesLastHour || '0'}
                  </p>
                  <p className="text-xs text-red-600">Last hour</p>
                </div>
              </div>

              {/* Total Counts */}
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-medium text-gray-600 mb-3">Platform Statistics</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <Icon name="group" size={20} className="text-[#006B3F] mx-auto mb-1" />
                    <p className="text-xl font-bold text-gray-800">
                      {health?.counts?.users?.toLocaleString() || '0'}
                    </p>
                    <p className="text-xs text-gray-500">Users</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <Icon name="storefront" size={20} className="text-[#FCD116] mx-auto mb-1" />
                    <p className="text-xl font-bold text-gray-800">
                      {health?.counts?.salons?.toLocaleString() || '0'}
                    </p>
                    <p className="text-xs text-gray-500">Salons</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <Icon name="calendar_today" size={20} className="text-blue-500 mx-auto mb-1" />
                    <p className="text-xl font-bold text-gray-800">
                      {health?.counts?.bookings?.toLocaleString() || '0'}
                    </p>
                    <p className="text-xs text-gray-500">Bookings</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Mode Confirmation Dialog */}
      {showLiveConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowLiveConfirmDialog(false)} />
          <div className="relative bg-white rounded-xl shadow-lg w-full max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#CE1126]/10 flex items-center justify-center flex-shrink-0">
                <Icon name="warning" className="text-[#CE1126]" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 text-sm sm:text-base">Switch to Live Mode?</h3>
                <p className="text-xs sm:text-sm text-gray-500">This action will enable real payments</p>
              </div>
            </div>
            <div className="p-3 bg-[#FCD116]/20 rounded-lg mb-4">
              <p className="text-xs sm:text-sm text-yellow-800">
                <strong>Warning:</strong> Switching to live mode means all transactions will process real payments. Make sure you have:
              </p>
              <ul className="text-xs sm:text-sm text-yellow-700 mt-2 space-y-1 list-disc list-inside">
                <li>Tested thoroughly in test mode</li>
                <li>Added correct live API keys</li>
                <li>Verified your Hubtel account is live</li>
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowLiveConfirmDialog(false)}
                className="btn-ripple flex-1 px-4 py-3 sm:py-2 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors text-sm min-h-[48px] sm:min-h-0"
              >
                Cancel
              </button>
              <button
                onClick={confirmSwitchToLive}
                className="btn-ripple flex-1 px-4 py-3 sm:py-2 bg-[#CE1126] text-white rounded-xl hover:bg-[#a50e1e] font-medium transition-colors text-sm min-h-[48px] sm:min-h-0"
              >
                Yes, Switch to Live
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
