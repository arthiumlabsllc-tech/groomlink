import { useState } from 'react';
import Icon from '../components/Icon';
import LoadingScreen from '../components/LoadingScreen';
import {
  useSubscriptionPlans,
  useUpdatePlan,
  useCreatePlan,
} from '../hooks';
import { formatCurrency } from '../lib/utils';
import type { SubscriptionPlan, CreatePlanData } from '../api/subscription';

interface PlanFormData {
  name: string;
  slug: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  platformFeePercent: string;
  maxStaff: string;
  maxLocations: string;
  features: string;
}

const initialFormData: PlanFormData = {
  name: '',
  slug: '',
  description: '',
  monthlyPrice: '',
  yearlyPrice: '',
  platformFeePercent: '',
  maxStaff: '',
  maxLocations: '',
  features: '',
};

export function SubscriptionPlans() {
  const { data: plans, isLoading } = useSubscriptionPlans();
  const updatePlan = useUpdatePlan();
  const createPlan = useCreatePlan();

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(initialFormData);
  const [error, setError] = useState<string | null>(null);

  const openCreateModal = () => {
    setIsEditing(false);
    setSelectedPlan(null);
    setFormData(initialFormData);
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (plan: SubscriptionPlan) => {
    setIsEditing(true);
    setSelectedPlan(plan);
    setFormData({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      monthlyPrice: plan.monthlyPrice.toString(),
      yearlyPrice: plan.yearlyPrice.toString(),
      platformFeePercent: plan.platformFeePercent.toString(),
      maxStaff: plan.maxStaff.toString(),
      maxLocations: plan.maxLocations.toString(),
      features: plan.features.join('\n'),
    });
    setError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPlan(null);
    setFormData(initialFormData);
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const features = formData.features
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => f.length > 0);

      if (isEditing && selectedPlan) {
        await updatePlan.mutateAsync({
          planId: selectedPlan.id,
          data: {
            name: formData.name,
            description: formData.description || undefined,
            monthlyPrice: parseFloat(formData.monthlyPrice),
            yearlyPrice: parseFloat(formData.yearlyPrice),
            platformFeePercent: parseFloat(formData.platformFeePercent),
            maxStaff: parseInt(formData.maxStaff, 10),
            maxLocations: parseInt(formData.maxLocations, 10),
            features,
          },
        });
      } else {
        const data: CreatePlanData = {
          name: formData.name,
          slug: formData.slug,
          description: formData.description || undefined,
          monthlyPrice: parseFloat(formData.monthlyPrice),
          yearlyPrice: parseFloat(formData.yearlyPrice),
          platformFeePercent: parseFloat(formData.platformFeePercent),
          maxStaff: parseInt(formData.maxStaff, 10),
          maxLocations: parseInt(formData.maxLocations, 10),
          features,
        };
        await createPlan.mutateAsync(data);
      }
      closeModal();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save plan. Please try again.');
    }
  };

  const handleToggleActive = async (plan: SubscriptionPlan) => {
    try {
      await updatePlan.mutateAsync({
        planId: plan.id,
        data: { isActive: !plan.isActive },
      });
    } catch (err) {
      console.error('Failed to toggle plan status:', err);
    }
  };

  const getPlanBadgeColor = (slug: string) => {
    const colors: Record<string, string> = {
      free: 'bg-gray-100 text-gray-700',
      pro: 'bg-green-100 text-green-700',
      premium: 'bg-yellow-100 text-yellow-700',
    };
    return colors[slug.toLowerCase()] || 'bg-blue-100 text-blue-700';
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Subscription Plans</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Manage pricing, features, and availability
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn-ripple flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[#006B3F] text-white hover:bg-[#005a35] transition-colors"
        >
          <Icon name="add" size={18} />
          Create Plan
        </button>
      </div>

      {/* Plans Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden card-v2">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Monthly
                </th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Yearly
                </th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Fee %
                </th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Limits
                </th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {plans?.map((plan) => (
                <tr
                  key={plan.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${getPlanBadgeColor(
                          plan.slug
                        )}`}
                      >
                        <Icon
                          name={
                            plan.slug === 'premium'
                              ? 'diamond'
                              : plan.slug === 'pro'
                              ? 'workspace_premium'
                              : 'star'
                          }
                          size={20}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{plan.name}</p>
                        <p className="text-xs text-gray-500">
                          {plan.features.slice(0, 2).join(', ')}
                          {plan.features.length > 2 && '...'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{plan.slug}</code>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm font-medium text-gray-800">
                      {formatCurrency(plan.monthlyPrice)}
                    </span>
                    <span className="text-xs text-gray-500">/mo</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm font-medium text-gray-800">
                      {formatCurrency(plan.yearlyPrice)}
                    </span>
                    <span className="text-xs text-gray-500">/yr</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-gray-700">{plan.platformFeePercent}%</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-xs text-gray-600">
                      <p>{plan.maxStaff} staff</p>
                      <p>{plan.maxLocations} locations</p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <button
                      onClick={() => handleToggleActive(plan)}
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        plan.isActive
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {plan.isActive ? (
                        <>
                          <Icon name="check_circle" size={12} className="mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <Icon name="cancel" size={12} className="mr-1" />
                          Inactive
                        </>
                      )}
                    </button>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button
                      onClick={() => openEditModal(plan)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#006B3F] hover:bg-[#006B3F]/10 rounded-lg transition-colors"
                    >
                      <Icon name="edit" size={16} />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {plans?.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Icon name="category" className="mx-auto mb-3 text-gray-300" size={40} />
            <p className="text-sm">No subscription plans found</p>
          </div>
        )}
      </div>

      {/* Plan Details Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans?.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white rounded-xl shadow-sm p-5 card-v2 border-t-4 ${
              plan.slug === 'premium'
                ? 'border-t-[#FCD116]'
                : plan.slug === 'pro'
                ? 'border-t-[#006B3F]'
                : 'border-t-gray-400'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{plan.name}</h3>
                <code className="text-xs text-gray-500">{plan.slug}</code>
              </div>
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  plan.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {plan.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Monthly</span>
                <span className="text-lg font-bold text-gray-800">
                  {formatCurrency(plan.monthlyPrice)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Yearly</span>
                <span className="text-lg font-bold text-gray-800">
                  {formatCurrency(plan.yearlyPrice)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Platform Fee</span>
                <span className="text-sm font-medium text-gray-800">
                  {plan.platformFeePercent}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Max Staff</span>
                <span className="text-sm font-medium text-gray-800">{plan.maxStaff}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Max Locations</span>
                <span className="text-sm font-medium text-gray-800">{plan.maxLocations}</span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Features
              </p>
              <ul className="space-y-1">
                {plan.features.slice(0, 4).map((feature, idx) => (
                  <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                    <Icon name="check" size={14} className="text-green-500" />
                    {feature}
                  </li>
                ))}
                {plan.features.length > 4 && (
                  <li className="text-xs text-gray-400">
                    +{plan.features.length - 4} more features
                  </li>
                )}
              </ul>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
              <button
                onClick={() => openEditModal(plan)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-[#006B3F] bg-[#006B3F]/10 hover:bg-[#006B3F]/20 rounded-lg transition-colors"
              >
                <Icon name="edit" size={16} />
                Edit
              </button>
              <button
                onClick={() => handleToggleActive(plan)}
                className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  plan.isActive
                    ? 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                    : 'text-green-600 bg-green-50 hover:bg-green-100'
                }`}
              >
                <Icon name={plan.isActive ? 'cancel' : 'check_circle'} size={16} />
                {plan.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">
                {isEditing ? 'Edit Plan' : 'Create New Plan'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B3F] focus:border-transparent outline-none transition-all"
                    placeholder="e.g., Pro Plan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slug *
                  </label>
                  <input
                    type="text"
                    name="slug"
                    value={formData.slug}
                    onChange={handleInputChange}
                    required
                    disabled={isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B3F] focus:border-transparent outline-none transition-all disabled:bg-gray-100"
                    placeholder="e.g., pro"
                  />
                  {!isEditing && (
                    <p className="text-xs text-gray-500 mt-1">
                      Unique identifier, cannot be changed later
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B3F] focus:border-transparent outline-none transition-all"
                  placeholder="Brief description of the plan"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Price (GHS) *
                  </label>
                  <input
                    type="number"
                    name="monthlyPrice"
                    value={formData.monthlyPrice}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B3F] focus:border-transparent outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Yearly Price (GHS) *
                  </label>
                  <input
                    type="number"
                    name="yearlyPrice"
                    value={formData.yearlyPrice}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B3F] focus:border-transparent outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Platform Fee % *
                  </label>
                  <input
                    type="number"
                    name="platformFeePercent"
                    value={formData.platformFeePercent}
                    onChange={handleInputChange}
                    required
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B3F] focus:border-transparent outline-none transition-all"
                    placeholder="5.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Staff *
                  </label>
                  <input
                    type="number"
                    name="maxStaff"
                    value={formData.maxStaff}
                    onChange={handleInputChange}
                    required
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B3F] focus:border-transparent outline-none transition-all"
                    placeholder="5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Locations *
                  </label>
                  <input
                    type="number"
                    name="maxLocations"
                    value={formData.maxLocations}
                    onChange={handleInputChange}
                    required
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B3F] focus:border-transparent outline-none transition-all"
                    placeholder="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Features (one per line)
                </label>
                <textarea
                  name="features"
                  value={formData.features}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B3F] focus:border-transparent outline-none transition-all resize-none"
                  placeholder="Unlimited bookings&#10;Priority support&#10;Advanced analytics"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter each feature on a new line
                </p>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatePlan.isPending || createPlan.isPending}
                  className="px-4 py-2 text-sm font-medium bg-[#006B3F] text-white hover:bg-[#005a35] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {(updatePlan.isPending || createPlan.isPending) && (
                    <Icon name="progress_activity" className="animate-spin" size={16} />
                  )}
                  {isEditing ? 'Save Changes' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
