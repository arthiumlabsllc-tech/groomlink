import { useState } from 'react';
import { Plus, Edit2, Trash2, Copy, Gift, Loader2, Send } from 'lucide-react';
import { useCoupons, useCreateCoupon, useDeleteCoupon } from '../hooks';
import { formatDate, getStatusColor } from '../lib/utils';
import type { CreateCouponData } from '../api';

export function Promotions() {
  const [showModal, setShowModal] = useState(false);
  const [showPushModal, setShowPushModal] = useState(false);
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

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    alert('Coupon code copied!');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-[#CE1126]" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Promotion Management</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowPushModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#006B3F] text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Send size={20} />
            Push Notification
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#CE1126] text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus size={20} />
            Create Coupon
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {coupons.map((coupon) => (
          <div key={coupon.id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#FCD116] rounded-lg flex items-center justify-center">
                  <Gift className="text-[#1a1a2e]" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-800">{coupon.code}</h3>
                  <p className="text-sm text-gray-500">
                    {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `GHS ${coupon.discountValue}`} OFF
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm capitalize ${getStatusColor(coupon.isActive ? 'ACTIVE' : 'INACTIVE')}`}>
                {coupon.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Type:</span>
                <span className="text-gray-700 capitalize">{coupon.discountType}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Usage:</span>
                <span className="text-gray-700">{coupon.usageCount} / {coupon.usageLimit || '∞'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Valid Until:</span>
                <span className="text-gray-700">{formatDate(coupon.validUntil)}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
              <button 
                onClick={() => copyToClipboard(coupon.code)}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                <Copy size={16} />
                Copy
              </button>
              <button 
                onClick={() => handleDelete(coupon.id)}
                disabled={deleteCoupon.isPending}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Create New Coupon</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code</label>
                <input 
                  type="text" 
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg" 
                  placeholder="e.g., SUMMER20" 
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                <select 
                  value={formData.discountType}
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'percentage' | 'fixed' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value</label>
                <input 
                  type="number" 
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg" 
                  placeholder="20" 
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit</label>
                <input 
                  type="number" 
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg" 
                  placeholder="100" 
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                <input 
                  type="date" 
                  value={formData.validUntil?.split('T')[0] || ''}
                  onChange={(e) => setFormData({ ...formData, validUntil: new Date(e.target.value).toISOString() })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg" 
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCoupon.isPending}
                  className="flex-1 px-4 py-2 bg-[#CE1126] text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {createCoupon.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
