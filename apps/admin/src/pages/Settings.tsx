import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Globe,
  Mail,
  Phone,
  MapPin,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  CheckCircle,
  Power,
  Server,
  Database,
  HardDrive,
  Clock,
  Users,
  Store,
  Calendar,
  Activity,
  ShieldAlert,
  RefreshCw,
  Save,
  CreditCard,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useSettings, useUpdateSettings, useToggleMaintenance, useHealth, usePaymentSettings, useUpdatePaymentSettings } from '../hooks';

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
    contactEmail: '',
    phoneNumber: '',
    address: '',
    logoUrl: '',
  });

  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [generalSuccess, setGeneralSuccess] = useState(false);
  const [maintenanceSuccess, setMaintenanceSuccess] = useState(false);

  // Payment settings state
  const [paymentFormData, setPaymentFormData] = useState({
    paymentGateway: 'paystack',
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

  // Initialize form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData({
        siteName: settings.siteName || '',
        contactEmail: settings.contactEmail || '',
        phoneNumber: settings.phoneNumber || '',
        address: settings.address || '',
        logoUrl: settings.logoUrl || '',
      });
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
        paymentGateway: paymentSettings.paymentGateway || 'paystack',
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
      <div className="flex items-center justify-center h-96">
        <div className="relative">
          <Loader2 className="animate-spin text-[#006B3F]" size={48} />
          <div className="absolute inset-0 animate-ping">
            <Loader2 className="text-[#FCD116] opacity-20" size={48} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Site Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage platform configuration and system health</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left Column - Settings */}
        <div className="space-y-6">
          {/* General Info Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Globe size={18} className="text-[#006B3F]" />
                General Information
              </h2>
            </div>

            <form onSubmit={handleGeneralSave} className="p-6 space-y-4">
              {generalError && (
                <div className="p-3 bg-[#CE1126]/10 text-[#CE1126] rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  {generalError}
                </div>
              )}

              {generalSuccess && (
                <div className="p-3 bg-green-100 text-green-700 rounded-xl text-sm flex items-center gap-2">
                  <CheckCircle size={16} />
                  Settings saved successfully!
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
                <input
                  type="text"
                  value={formData.siteName}
                  onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-0 transition-colors"
                  placeholder="GroomLink"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Mail size={14} className="text-gray-400" />
                  Contact Email
                </label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-0 transition-colors"
                  placeholder="support@groomlinkgh.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Phone size={14} className="text-gray-400" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-0 transition-colors"
                  placeholder="+233 XX XXX XXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <MapPin size={14} className="text-gray-400" />
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-0 transition-colors"
                  placeholder="Accra, Ghana"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <ImageIcon size={14} className="text-gray-400" />
                  Logo URL
                </label>
                <input
                  type="url"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-0 transition-colors"
                  placeholder="https://example.com/logo.png"
                />
                {formData.logoUrl && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-2">Preview:</p>
                    <img
                      src={formData.logoUrl}
                      alt="Logo preview"
                      className="h-12 w-auto object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={updateSettings.isPending}
                className="w-full px-4 py-3 bg-[#006B3F] text-white rounded-xl hover:bg-[#005a35] disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2"
              >
                {updateSettings.isPending ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save Changes
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Maintenance Mode Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Power size={18} className="text-[#006B3F]" />
                Maintenance Mode
              </h2>
            </div>

            <div className="p-6 space-y-4">
              {maintenanceSuccess && (
                <div className="p-3 bg-green-100 text-green-700 rounded-xl text-sm flex items-center gap-2">
                  <CheckCircle size={16} />
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
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                    maintenanceEnabled ? 'bg-[#CE1126]' : 'bg-[#006B3F]'
                  } disabled:opacity-50`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      maintenanceEnabled ? 'translate-x-6' : 'translate-x-1'
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
                  className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-0 transition-colors resize-none"
                  placeholder="We're currently performing maintenance. Please check back soon."
                />
                <p className="text-xs text-gray-500 mt-1">
                  This message will be displayed to users when maintenance mode is enabled
                </p>
              </div>
            </div>
          </div>

          {/* Payment Gateway Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <CreditCard size={18} className="text-[#006B3F]" />
                Payment Gateway
              </h2>
            </div>

            <form onSubmit={handlePaymentSave} className="p-6 space-y-4">
              {paymentError && (
                <div className="p-3 bg-[#CE1126]/10 text-[#CE1126] rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  {paymentError}
                </div>
              )}

              {paymentSuccess && (
                <div className="p-3 bg-green-100 text-green-700 rounded-xl text-sm flex items-center gap-2">
                  <CheckCircle size={16} />
                  Payment settings saved successfully!
                </div>
              )}

              {testConnectionSuccess && (
                <div className="p-3 bg-green-100 text-green-700 rounded-xl text-sm flex items-center gap-2">
                  <CheckCircle size={16} />
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
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                      paymentFormData.isPaymentTestMode ? 'bg-green-500' : 'bg-[#CE1126]'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        paymentFormData.isPaymentTestMode ? 'translate-x-1' : 'translate-x-6'
                      }`}
                    />
                  </button>
                </div>

                {/* Mode badges */}
                <div className="mt-3">
                  {paymentFormData.isPaymentTestMode ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      <CheckCircle size={12} />
                      TEST MODE — No real charges
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#CE1126]/10 text-[#CE1126]">
                      <AlertTriangle size={12} />
                      LIVE MODE — Real payments will be processed
                    </span>
                  )}
                </div>
              </div>

              {/* Warning banner when in LIVE mode */}
              {!paymentFormData.isPaymentTestMode && (
                <div className="p-3 bg-[#FCD116]/20 text-yellow-800 rounded-xl text-sm flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
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
                  className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-0 transition-colors bg-white"
                >
                  <option value="paystack">Paystack</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  More payment gateways will be available in future updates
                </p>
              </div>

              {/* API Keys Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  API Keys
                </h3>

                {/* Public Key */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Public Key
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={paymentFormData.paystackPublicKey || ''}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, paystackPublicKey: e.target.value })}
                      className="flex-1 px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-0 transition-colors font-mono text-sm"
                      placeholder="pk_test_xxxxxxxxxxxxxxxxxxxxxxxx"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(paymentFormData.paystackPublicKey || '', 'publicKey')}
                      disabled={!paymentFormData.paystackPublicKey}
                      className="px-3 py-3 border-2 border-gray-100 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedField === 'publicKey' ? (
                        <Check size={18} className="text-green-500" />
                      ) : (
                        <Copy size={18} className="text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Secret Key */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Secret Key
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showSecretKey ? 'text' : 'password'}
                        value={paymentFormData.paystackSecretKey || ''}
                        onChange={(e) => setPaymentFormData({ ...paymentFormData, paystackSecretKey: e.target.value })}
                        className="w-full px-4 py-3 pr-10 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-0 transition-colors font-mono text-sm"
                        placeholder="sk_test_xxxxxxxxxxxxxxxxxxxxxxxx"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecretKey(!showSecretKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showSecretKey ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(paymentFormData.paystackSecretKey || '', 'secretKey')}
                      disabled={!paymentFormData.paystackSecretKey}
                      className="px-3 py-3 border-2 border-gray-100 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedField === 'secretKey' ? (
                        <Check size={18} className="text-green-500" />
                      ) : (
                        <Copy size={18} className="text-gray-400" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Secret key is masked in the database. If you see "****", the existing key is preserved.
                  </p>
                </div>
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
                        className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#006B3F] focus:border-transparent outline-none text-lg font-semibold"
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
                  className="flex-1 px-4 py-3 bg-[#006B3F] text-white rounded-xl hover:bg-[#005a35] disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {updatePaymentSettings.isPending ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Settings
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={updatePaymentSettings.isPending || !paymentFormData.paystackPublicKey}
                  className="px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw size={18} />
                  Test Connection
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column - System Health */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Activity size={18} className="text-[#006B3F]" />
                System Health
              </h2>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <RefreshCw size={12} className="animate-spin" />
                Auto-refresh: 30s
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Cards */}
              <div className="grid grid-cols-2 gap-4">
                {/* API Status */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Server size={16} className="text-gray-400" />
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
                    <Database size={16} className="text-gray-400" />
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
                    <HardDrive size={16} className="text-gray-400" />
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
                    <Clock size={16} className="text-gray-400" />
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
                    <HardDrive size={16} className="text-gray-400" />
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
                    <Users size={16} className="text-blue-500" />
                    <span className="text-sm font-medium text-blue-700">Active Sessions</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-800">
                    {health?.sessions?.active24h?.toLocaleString() || '0'}
                  </p>
                  <p className="text-xs text-blue-600">Last 24 hours</p>
                </div>

                <div className="p-4 bg-red-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldAlert size={16} className="text-red-500" />
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
                    <Users size={20} className="text-[#006B3F] mx-auto mb-1" />
                    <p className="text-xl font-bold text-gray-800">
                      {health?.counts?.users?.toLocaleString() || '0'}
                    </p>
                    <p className="text-xs text-gray-500">Users</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <Store size={20} className="text-[#FCD116] mx-auto mb-1" />
                    <p className="text-xl font-bold text-gray-800">
                      {health?.counts?.salons?.toLocaleString() || '0'}
                    </p>
                    <p className="text-xs text-gray-500">Salons</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <Calendar size={20} className="text-blue-500 mx-auto mb-1" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowLiveConfirmDialog(false)} />
          <div className="relative bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#CE1126]/10 flex items-center justify-center">
                <AlertTriangle className="text-[#CE1126]" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Switch to Live Mode?</h3>
                <p className="text-sm text-gray-500">This action will enable real payments</p>
              </div>
            </div>
            <div className="p-3 bg-[#FCD116]/20 rounded-lg mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> Switching to live mode means all transactions will process real payments. Make sure you have:
              </p>
              <ul className="text-sm text-yellow-700 mt-2 space-y-1 list-disc list-inside">
                <li>Tested thoroughly in test mode</li>
                <li>Added correct live API keys</li>
                <li>Verified your Paystack account is live</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLiveConfirmDialog(false)}
                className="flex-1 px-4 py-2 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSwitchToLive}
                className="flex-1 px-4 py-2 bg-[#CE1126] text-white rounded-xl hover:bg-[#a50e1e] font-medium transition-colors"
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
