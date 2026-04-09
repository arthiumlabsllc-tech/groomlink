import { useState } from 'react';
import { UserPlus, Users, Phone, Mail, Loader2, AlertCircle, CheckCircle, X, Headphones } from 'lucide-react';
import { useSupportStaff, useCreateSupportStaff } from '../hooks';
import { formatDate } from '../lib/utils';

export function SupportStaff() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
  });
  const [error, setError] = useState<string | null>(null);

  const { data: staffData, isLoading } = useSupportStaff(1, 50);
  const createStaff = useCreateSupportStaff();

  const staff = staffData?.data || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await createStaff.mutateAsync({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber || null,
        email: formData.email,
      });
      
      // Reset form and close modal
      setFormData({ firstName: '', lastName: '', phoneNumber: '', email: '' });
      setShowCreateModal(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create support staff');
    }
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setError(null);
    setFormData({ firstName: '', lastName: '', phoneNumber: '', email: '' });
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
          <h1 className="text-2xl font-bold text-gray-800">Support Staff</h1>
          <p className="text-sm text-gray-500 mt-1">Manage support team members who can assist customers</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#006B3F] text-white rounded-xl hover:bg-[#005a35] transition-colors font-medium shadow-lg shadow-[#006B3F]/25"
        >
          <UserPlus size={18} />
          Add Staff
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#FCD116]/20 rounded-xl">
              <Users className="text-[#B8960F]" size={24} />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-800">{staff.length}</p>
              <p className="text-sm text-gray-500">Total Staff</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#006B3F]/10 rounded-xl">
              <CheckCircle className="text-[#006B3F]" size={24} />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-800">
                {staff.filter(s => s.status === 'ACTIVE').length}
              </p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Phone className="text-blue-500" size={24} />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-800">
                {staff.filter(s => s.phoneNumber).length}
              </p>
              <p className="text-sm text-gray-500">With Phone</p>
            </div>
          </div>
        </div>
      </div>

      {/* Staff List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Headphones size={18} className="text-[#006B3F]" />
            Support Team Members
          </h2>
        </div>
        
        {staff.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="text-gray-300" size={32} />
            </div>
            <p className="text-gray-500 font-medium">No support staff added yet</p>
            <p className="text-sm text-gray-400 mt-1">Add team members to handle customer support</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-[#006B3F] hover:text-[#005a35] font-medium"
            >
              Add your first support staff member
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {staff.map((member) => (
              <div key={member.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#FCD116] to-[#FCD116]/70 rounded-full flex items-center justify-center shadow-md">
                      <span className="text-[#1a1a2e] font-bold text-lg">
                        {member.firstName[0]}{member.lastName[0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {member.firstName} {member.lastName}
                      </h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        {member.phoneNumber && (
                          <span className="flex items-center gap-1.5">
                            <Phone size={14} className="text-gray-400" />
                            {member.phoneNumber}
                          </span>
                        )}
                        {member.email && (
                          <span className="flex items-center gap-1.5">
                            <Mail size={14} className="text-gray-400" />
                            {member.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                      member.status === 'ACTIVE' 
                        ? 'bg-[#006B3F]/10 text-[#006B3F]' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${member.status === 'ACTIVE' ? 'bg-[#006B3F]' : 'bg-gray-400'}`}></span>
                      {member.status}
                    </span>
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                      Added {formatDate(member.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Add Support Staff</h2>
                  <p className="text-sm text-gray-500 mt-1">Create a new support team member</p>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
            </div>
            
            {error && (
              <div className="mx-6 mt-4 p-3 bg-[#CE1126]/10 text-[#CE1126] rounded-xl text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-0 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-0 transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="support@groomlinkgh.com"
                  className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-0 transition-colors"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">This will be used for email OTP login</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="+233 XX XXX XXXX"
                  className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-0 transition-colors"
                />
              </div>

              <div className="bg-[#FCD116]/10 border border-[#FCD116]/20 rounded-xl p-4">
                <p className="text-sm text-[#B8960F]">
                  <strong>Note:</strong> The staff member will use email OTP to log in to the support dashboard
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createStaff.isPending}
                  className="flex-1 px-4 py-3 bg-[#006B3F] text-white rounded-xl hover:bg-[#005a35] disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {createStaff.isPending ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Creating...
                    </>
                  ) : (
                    'Create Staff'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
