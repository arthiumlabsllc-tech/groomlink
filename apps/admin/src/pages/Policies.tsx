import { useState } from 'react';
import { Save, X, Loader2, Settings, AlertCircle } from 'lucide-react';
import { usePolicies, useUpdatePolicy } from '../hooks';
import { formatDate } from '../lib/utils';
import type { PlatformPolicy } from '../api/admin';

// Policy name to human-readable format mapping
const policyLabels: Record<string, string> = {
  platform_fee_percentage: 'Platform Fee Percentage',
  free_cancellation_hours: 'Free Cancellation Hours',
  full_refund_hours: 'Full Refund Hours',
  partial_refund_75_hours: '75% Refund Hours',
  partial_refund_50_hours: '50% Refund Hours',
  cancellation_processing_fee: 'Cancellation Processing Fee',
  no_show_restriction_threshold: 'No-Show Restriction Threshold',
  no_show_restriction_days: 'No-Show Restriction Days',
  provider_cancellation_penalty_amount: 'Provider Cancellation Penalty',
};

// Policy descriptions for extra context
const policyDescriptions: Record<string, string> = {
  platform_fee_percentage: 'Percentage fee taken from each transaction',
  free_cancellation_hours: 'Hours before appointment for free cancellation',
  full_refund_hours: 'Hours before appointment for 100% refund',
  partial_refund_75_hours: 'Hours before appointment for 75% refund',
  partial_refund_50_hours: 'Hours before appointment for 50% refund',
  cancellation_processing_fee: 'Fee charged for processing cancellations (GHS)',
  no_show_restriction_threshold: 'Number of no-shows before restriction',
  no_show_restriction_days: 'Days the restriction lasts',
  provider_cancellation_penalty_amount: 'Penalty amount for provider cancellations (GHS)',
};

export function Policies() {
  const { data: policies, isLoading, error } = usePolicies();
  const updatePolicy = useUpdatePolicy();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  const startEditing = (policy: PlatformPolicy) => {
    setEditingId(policy.id);
    setEditValue(policy.policyValue);
    setSaveError(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue('');
    setSaveError(null);
  };

  const savePolicy = async (policyId: string) => {
    if (!editValue.trim()) {
      setSaveError('Value cannot be empty');
      return;
    }

    try {
      await updatePolicy.mutateAsync({ id: policyId, policyValue: editValue });
      setEditingId(null);
      setEditValue('');
      setSaveError(null);
    } catch (error: any) {
      setSaveError(error?.response?.data?.error?.message || 'Failed to update policy');
    }
  };

  const getPolicyLabel = (policyName: string): string => {
    return policyLabels[policyName] || policyName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const getPolicyDescription = (policyName: string): string => {
    return policyDescriptions[policyName] || '';
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <AlertCircle size={48} className="text-[#CE1126]" />
        <p className="text-lg font-medium text-gray-600">Failed to load policies</p>
        <p className="text-sm text-gray-500">Please try again later</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Policy Management</h1>
          <p className="text-sm text-gray-500 mt-1">Configure platform-wide policies and settings</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <Settings size={18} className="text-gray-400" />
          <span className="text-sm text-gray-500">Total:</span>
          <span className="text-lg font-bold text-gray-800">{policies?.length || 0}</span>
        </div>
      </div>

      {/* Error Banner */}
      {saveError && (
        <div className="bg-[#CE1126]/10 border border-[#CE1126]/20 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-[#CE1126]" />
          <span className="text-[#CE1126] font-medium">{saveError}</span>
          <button onClick={() => setSaveError(null)} className="ml-auto">
            <X size={18} className="text-[#CE1126]" />
          </button>
        </div>
      )}

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {policies?.map((policy) => (
          <div key={policy.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#006B3F]/10 to-[#FCD116]/10 rounded-xl flex items-center justify-center">
                  <Settings size={20} className="text-[#006B3F]" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{getPolicyLabel(policy.policyName)}</p>
                  <p className="text-xs text-gray-500">{getPolicyDescription(policy.policyName)}</p>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Current Value:</span>
                {editingId === policy.id ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-24 px-2 py-1 text-right border border-gray-300 rounded-lg focus:border-[#006B3F] focus:ring-1 focus:ring-[#006B3F]"
                    autoFocus
                  />
                ) : (
                  <span className="font-bold text-[#006B3F]">{policy.policyValue}</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last Updated:</span>
                <span className="text-gray-700">{formatDate(policy.updatedAt)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
              {editingId === policy.id ? (
                <>
                  <button
                    onClick={() => savePolicy(policy.id)}
                    disabled={updatePolicy.isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#006B3F] text-white rounded-xl hover:bg-[#005a35] disabled:opacity-50 transition-colors font-medium text-sm"
                  >
                    {updatePolicy.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium text-sm"
                  >
                    <X size={16} />
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => startEditing(policy)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[#006B3F] border-2 border-[#006B3F] hover:bg-[#006B3F]/10 rounded-xl transition-colors font-medium text-sm"
                >
                  <Settings size={16} />
                  Edit
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Policy Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Description</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Current Value</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Last Updated</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {policies?.map((policy) => (
                <tr key={policy.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-800">{getPolicyLabel(policy.policyName)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">{policy.description || getPolicyDescription(policy.policyName)}</span>
                  </td>
                  <td className="px-6 py-4">
                    {editingId === policy.id ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:border-[#006B3F] focus:ring-1 focus:ring-[#006B3F]"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') savePolicy(policy.id);
                          if (e.key === 'Escape') cancelEditing();
                        }}
                      />
                    ) : (
                      <span className="font-bold text-[#006B3F] text-lg">{policy.policyValue}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">{formatDate(policy.updatedAt)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {editingId === policy.id ? (
                        <>
                          <button
                            onClick={() => savePolicy(policy.id)}
                            disabled={updatePolicy.isPending}
                            className="p-2 bg-[#006B3F] text-white rounded-lg hover:bg-[#005a35] disabled:opacity-50 transition-colors"
                            title="Save"
                          >
                            {updatePolicy.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Cancel"
                          >
                            <X size={18} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => startEditing(policy)}
                          className="p-2 text-[#006B3F] hover:bg-[#006B3F]/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Settings size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
