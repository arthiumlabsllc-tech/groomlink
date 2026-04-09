import { useState } from 'react';
import { Plus, Trash2, Copy, Gift, Loader2, Send, Check, AlertCircle } from 'lucide-react';
import { useCoupons, useCreateCoupon, useDeleteCoupon } from '../hooks';
import { formatDate } from '../lib/utils';
import type { CreateCouponData } from '../api';

export function Promotions() {
  const [showModal, setShowModal] = useState(false);
  const [showPushModal, setShowPushModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateCouponData>({
    code: '',
    discountType: 'percentage',
    discountValue: 0,
    usageLimit: 100,
  });

  const { data: couponsData, isLoading } = useCoupons(1, 50);
  const createCoupon = useCreateCoupon();
  const deleteCoupon = useDeleteCoupon();

  const coupons = couponsData?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCoupon.mutateAsync(formData);
    setShowModal(false);
    setFormData({ code: '', discountType: 'percentage', discountValue: 0, usageLimit: 100 });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this coupon?')) {
      await deleteCoupon.mutateAsync(id);
    }
  };

  const copyToClipboard = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const isExpired = (validUntil?: string) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
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
          <h1 className="text-2xl font-bold text-gray-800">Promotion Management</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage discount coupons</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowPushModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-[#006B3F] text-[#006B3F] rounded-xl hover:bg-[#006B3F]/5 transition-colors font-medium"
          >
            <Send size={18} />
            Push Notification
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#006B3F] text-white rounded-xl hover:bg-[#005a35] transition-colors font-medium shadow-lg shadow-[#006B3F]/25"
          >
            <Plus size={18} />
            Create Coupon
          </button>
        </div>
      </div>

      {/* Coupons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map((coupon) => {
          const expired = isExpired(coupon.validUntil);
          return (
            <div 
              key={coupon.id} 
              className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all duration-200 hover:shadow-md ${
                expired ? 'border-gray-200 opacity-60' : 'border-gray-100'
              }`}
            >
              {/* Card Header */}
              <div className={`p-4 ${expired ? 'bg-gray-50' : 'bg-gradient-to-br from-[#FCD116]/20 to-[#FCD116]/5'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      expired ? 'bg-gray-200' : 'bg-[#FCD116]'
                    }`}>
                      <Gift className={expired ? 'text-gray-500' : 'text-[#1a1a2e]'} size={24} />
                    </div>
                    <div>
                      <p className="font-mono text-lg font-bold text-gray-800">{coupon.code}</p>
                      <p className="text-sm font-semibold text-[#006B3F]">
                        {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `GHS ${coupon.discountValue} OFF`}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    expired 
                      ? 'bg-gray-100 text-gray-500' 
                      : coupon.isActive 
                        ? 'bg-[#006B3F]/10 text-[#006B3F]' 
                        : 'bg-[#CE1126]/10 text-[#CE1126]'
                  }`}>
                    {expired ? 'Expired' : coupon.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Type</span>
                  <span className="font-medium text-gray-700 capitalize">{coupon.discountType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Usage</span>
                  <span className="font-medium text-gray-700">{coupon.usageCount} / {coupon.usageLimit || '∞'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Valid Until</span>
                  <span className="font-medium text-gray-700">{formatDate(coupon.validUntil)}</span>
                </div>
              </div>

              {/* Card Actions */}
              <div className="px-4 pb-4 flex gap-2">
                <button 
                  onClick={() => copyToClipboard(coupon.code)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors font-medium text-sm"
                >
                  {copiedCode === coupon.code ? (
                    <>
                      <Check size={16} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copy Code
                    </>
                  )}
                </button>
                <button 
                  onClick={() => handleDelete(coupon.id)}
                  disabled={deleteCoupon.isPending}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#CE1126]/10 text-[#CE1126] rounded-xl hover:bg-[#CE1126]/20 disabled:opacity-50 transition-colors font-medium text-sm"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {coupons.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
          <div className="w-16 h-16 bg-[#FCD116]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Gift size={32} className="text-[#B8960F]" />
          </div>
          <p className="text-gray-500 font-medium">No coupons yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first coupon to start promoting</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 px-4 py-2 bg-[#006B3F] text-white rounded-xl hover:bg-[#005a35] transition-colors font-medium text-sm"
          >
            Create Coupon
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">Create New Coupon</h2>
              <p className="text-sm text-gray-500 mt-1">Generate a discount code for your customers</p>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Coupon Code</label>
                <input 
                  type="text" 
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-0 transition-colors font-mono text-lg" 
                  placeholder="e.g., SUMMER20" 
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Discount Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, discountType: 'percentage' })}
                    className={`py-3 px-4 rounded-xl font-medium transition-all ${
                      formData.discountType === 'percentage'
                        ? 'bg-[#006B3F] text-white'
                        : 'bg-gray-50 text-gray-600 border-2 border-gray-100'
                    }`}
                  >
                    Percentage
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, discountType: 'fixed' })}
                    className={`py-3 px-4 rounded-xl font-medium transition-all ${
                      formData.discountType === 'fixed'
                        ? 'bg-[#006B3F] text-white'
                        : 'bg-gray-50 text-gray-600 border-2 border-gray-100'
                    }`}
                  >
                    Fixed Amount
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount Value {formData.discountType === 'percentage' ? '(%)' : '(GHS)'}
                </label>
                <input 
                  type="number" 
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-0 transition-colors" 
                  placeholder={formData.discountType === 'percentage' ? '20' : '50'}
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Usage Limit</label>
                <input 
                  type="number" 
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: Number(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-0 transition-colors" 
                  placeholder="100" 
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valid Until</label>
                <input 
                  type="date" 
                  value={formData.validUntil?.split('T')[0] || ''}
                  onChange={(e) => setFormData({ ...formData, validUntil: new Date(e.target.value).toISOString() })}
                  className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-0 transition-colors" 
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCoupon.isPending}
                  className="flex-1 px-4 py-3 bg-[#006B3F] text-white rounded-xl hover:bg-[#005a35] disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {createCoupon.isPending ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Coupon'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Push Notification Modal */}
      {showPushModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">Push Notification</h2>
              <p className="text-sm text-gray-500 mt-1">Send a promotional notification to users</p>
            </div>
            <div className="p-6">
              <div className="bg-[#FCD116]/10 border border-[#FCD116]/20 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle size={20} className="text-[#B8960F] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#B8960F]">
                  This feature is coming soon. You'll be able to send push notifications about new promotions to your users.
                </p>
              </div>
              <button
                onClick={() => setShowPushModal(false)}
                className="w-full mt-4 px-4 py-3 bg-gray-100 rounded-xl text-gray-700 hover:bg-gray-200 font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
