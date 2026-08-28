import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from './Icon';
import { authApi } from '../api';

const STATUS_KEY = ['admin_auth', '2fa-status'];

type SetupStage = 'idle' | 'scan' | 'backup-codes';

export default function TwoFactorSetup() {
  const queryClient = useQueryClient();

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: STATUS_KEY,
    queryFn: authApi.getTwoFactorStatus,
    staleTime: 60 * 1000,
  });

  const [stage, setStage] = useState<SetupStage>('idle');
  const [setupData, setSetupData] = useState<{ secret: string; qrCode: string } | null>(null);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [disableCode, setDisableCode] = useState('');

  const setupMutation = useMutation({
    mutationFn: authApi.setupTwoFactor,
    onSuccess: (data) => {
      setSetupData({ secret: data.secret, qrCode: data.qrCode });
      setStage('scan');
      setError('');
    },
    onError: (err: any) => setError(err?.response?.data?.message || 'Failed to start 2FA setup.'),
  });

  const enableMutation = useMutation({
    mutationFn: (confirmCode: string) => authApi.enableTwoFactor(confirmCode),
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes);
      setStage('backup-codes');
      setCode('');
      setError('');
      queryClient.invalidateQueries({ queryKey: STATUS_KEY });
    },
    onError: (err: any) => setError(err?.response?.data?.message || 'Invalid code. Please try again.'),
  });

  const disableMutation = useMutation({
    mutationFn: (confirmCode: string) => authApi.disableTwoFactor(confirmCode),
    onSuccess: () => {
      setShowDisableForm(false);
      setDisableCode('');
      setError('');
      queryClient.invalidateQueries({ queryKey: STATUS_KEY });
    },
    onError: (err: any) => setError(err?.response?.data?.message || 'Invalid code. Please try again.'),
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  const handleStartSetup = () => {
    setCode('');
    setError('');
    setupMutation.mutate();
  };

  const handleConfirmEnable = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleaned = code.replace(/\s/g, '');
    if (cleaned.length !== 6) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    enableMutation.mutate(cleaned);
  };

  const handleDisable = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleaned = disableCode.replace(/\s/g, '');
    if (cleaned.length < 6) {
      setError('Enter your current authenticator or backup code.');
      return;
    }
    disableMutation.mutate(cleaned);
  };

  const busy = setupMutation.isPending || enableMutation.isPending || disableMutation.isPending;

  return (
    <div className="card-v2 overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-gray-100 bg-gray-50/50">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
          <Icon name="verified_user" size={16} className="text-[#006B3F] sm:w-5 sm:h-5" />
          Two-Factor Authentication
        </h2>
        <p className="text-xs text-gray-500 mt-1">Protect your admin account with an authenticator app</p>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {statusLoading ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <div className="w-4 h-4 border-2 border-[#006B3F] border-t-transparent rounded-full animate-spin" />
            Loading 2FA status...
          </div>
        ) : status?.enabled ? (
          <>
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
              <Icon name="check_circle" size={22} className="text-green-600" />
              <div>
                <p className="text-sm font-semibold text-green-800">2FA is enabled</p>
                <p className="text-xs text-green-700 mt-0.5">
                  {status.backupCodesRemaining} backup code{status.backupCodesRemaining === 1 ? '' : 's'} remaining
                </p>
              </div>
            </div>

            {status.backupCodesRemaining <= 3 && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <Icon name="warning" size={16} className="mt-0.5 flex-shrink-0" />
                <span>You are running low on backup codes. Disable and re-enable 2FA to generate a fresh set.</span>
              </div>
            )}

            {!showDisableForm ? (
              <button
                type="button"
                onClick={() => { setShowDisableForm(true); setError(''); }}
                className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                Disable 2FA
              </button>
            ) : (
              <form onSubmit={handleDisable} className="space-y-3 border-t border-gray-100 pt-4">
                <p className="text-sm text-gray-600">
                  Enter your current authenticator code or a backup code to disable 2FA.
                </p>
                <input
                  type="text"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm font-mono bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-[#006B3F] transition-all"
                  placeholder="6-digit or backup code"
                  disabled={busy}
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {disableMutation.isPending ? 'Disabling...' : 'Confirm Disable'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowDisableForm(false); setDisableCode(''); setError(''); }}
                    className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </>
        ) : stage === 'scan' && setupData ? (
          <form onSubmit={handleConfirmEnable} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
              <img
                src={setupData.qrCode}
                alt="2FA QR code"
                className="w-40 h-40 border border-gray-200 rounded-xl bg-white p-2"
              />
              <div className="flex-1 space-y-2 text-sm">
                <p className="text-gray-700">
                  <span className="font-semibold">1.</span> Scan this QR code with Google Authenticator,
                  Authy, or any TOTP authenticator app.
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">2.</span> Or enter this secret manually:
                </p>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <code className="text-xs font-mono break-all flex-1">{setupData.secret}</code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(setupData.secret)}
                    className="text-gray-500 hover:text-[#006B3F] transition-colors flex-shrink-0"
                    aria-label="Copy secret"
                  >
                    <Icon name={copied ? 'check' : 'content_copy'} size={16} />
                  </button>
                </div>
                <p className="text-gray-700">
                  <span className="font-semibold">3.</span> Enter the 6-digit code shown in the app to confirm.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-40 px-4 py-2.5 text-center text-lg font-mono tracking-widest bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-[#006B3F] transition-all"
                placeholder="000000"
                autoFocus
                disabled={busy}
              />
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2.5 text-sm font-semibold text-white bg-[#006B3F] rounded-xl hover:bg-[#005a35] disabled:opacity-50 transition-colors"
              >
                {enableMutation.isPending ? 'Verifying...' : 'Verify & Enable'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => { setStage('idle'); setSetupData(null); setCode(''); setError(''); }}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel setup
            </button>
          </form>
        ) : stage === 'backup-codes' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
              <Icon name="check_circle" size={22} className="text-green-600" />
              <div>
                <p className="text-sm font-semibold text-green-800">2FA is now enabled</p>
                <p className="text-xs text-green-700 mt-0.5">Save your backup codes — they are shown only once.</p>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((bc) => (
                  <code key={bc} className="text-sm font-mono text-gray-700 bg-white border border-gray-200 rounded px-3 py-1.5 text-center">
                    {bc}
                  </code>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => copyToClipboard(backupCodes.join('\n'))}
                className="px-4 py-2 text-sm font-medium text-[#006B3F] border border-[#006B3F]/30 rounded-lg hover:bg-[#006B3F]/5 transition-colors flex items-center gap-2"
              >
                <Icon name={copied ? 'check' : 'content_copy'} size={16} />
                {copied ? 'Copied' : 'Copy all codes'}
              </button>
              <button
                type="button"
                onClick={() => { setStage('idle'); setBackupCodes([]); }}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#006B3F] rounded-lg hover:bg-[#005a35] transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <Icon name="warning" size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">2FA is not enabled</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Admin accounts are high-value targets. Enable two-factor authentication to require a
                  time-based code from your authenticator app at every sign-in.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartSetup}
              disabled={busy}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-[#006B3F] rounded-xl hover:bg-[#005a35] disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <Icon name="qr_code_2" size={18} />
              {setupMutation.isPending ? 'Preparing...' : 'Enable Two-Factor Authentication'}
            </button>
          </>
        )}

        {error && (
          <div className="bg-[#CE1126]/10 border border-[#CE1126]/20 text-[#CE1126] px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <Icon name="error" size={16} className="flex-shrink-0" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
