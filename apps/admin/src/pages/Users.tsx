import { useState } from 'react';
import { 
  Search, Ban, Eye, Phone, Calendar, Loader2, CheckCircle, LogIn, Users as UsersIcon,
  Plus, X, Mail, MapPin, Shield, AlertTriangle, CreditCard, Clock, Activity,
  UserCheck, UserX, AlertCircle, Trash2
} from 'lucide-react';
import { 
  useUsers, useBlockUser, useUnblockUser, useCreateCustomer, 
  useUserDetails, useUserActivities, useBanUser, useUnbanUser, useDeleteUser
} from '../hooks';
import { formatDate, formatPhoneNumber, formatCurrency } from '../lib/utils';
import api from '../api/client';

interface ImpersonationResponse {
  message: string;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    role: string;
    impersonatedBy: string;
  };
  impersonationLogId: string;
}

interface CreateCustomerFormData {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

const initialFormData: CreateCustomerFormData = {
  email: '',
  firstName: '',
  lastName: '',
  phoneNumber: '+233 ',
};

type DetailTab = 'profile' | 'activity' | 'bookings' | 'payments';

export function Users() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showSuspiciousOnly, setShowSuspiciousOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [impersonating, setImpersonating] = useState<string | null>(null);
  
  // Modal states
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<{ id: string; firstName: string | null; lastName: string | null; email: string | null; role: string } | null>(null);
  const [banReason, setBanReason] = useState('');
  const [formData, setFormData] = useState<CreateCustomerFormData>(initialFormData);
  const [activeTab, setActiveTab] = useState<DetailTab>('profile');

  const { data: usersData, isLoading } = useUsers(page, 20);
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const createCustomer = useCreateCustomer();
  const banUserMutation = useBanUser();
  const unbanUserMutation = useUnbanUser();
  const deleteUserMutation = useDeleteUser();
  const { data: userDetails, isLoading: detailsLoading } = useUserDetails(selectedUserId || '');
  const { data: userActivities, isLoading: activitiesLoading } = useUserActivities(selectedUserId || '');

  const users = usersData?.data || [];
  const totalCount = usersData?.pagination?.total || 0;

  const filteredUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (user.firstName?.toLowerCase().includes(searchLower) ?? false) ||
      (user.lastName?.toLowerCase().includes(searchLower) ?? false) ||
      (user.phoneNumber?.includes(searchTerm) ?? false) ||
      (user.email?.toLowerCase().includes(searchLower) ?? false);
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesSuspicious = !showSuspiciousOnly || user.hasSuspiciousActivity;
    return matchesSearch && matchesRole && matchesSuspicious;
  });

  const handleBlock = async (id: string) => {
    await blockUser.mutateAsync({ id, reason: 'Suspended by admin' });
  };

  const handleUnblock = async (id: string) => {
    await unblockUser.mutateAsync(id);
  };

  const handleImpersonate = async (userId: string) => {
    setImpersonating(userId);
    try {
      const response = await api.post<{ success: boolean; data: ImpersonationResponse }>('/impersonation/start', {
        targetUserId: userId,
        reason: 'Admin support access',
      });

      if (response.data.success) {
        const { tokens, user, impersonationLogId } = response.data.data;
        
        // Determine redirect URL based on role
        const baseUrl = user.role === 'SALON_OWNER' 
          ? 'https://partners.groomlinkgh.com'
          : 'https://groomlinkgh.com';
        
        // Pass token via URL parameter so the target app can store it in its own localStorage
        const redirectUrl = `${baseUrl}?token=${encodeURIComponent(tokens.accessToken)}&impersonation_log_id=${encodeURIComponent(impersonationLogId)}`;
        
        // Open in new tab
        window.open(redirectUrl, '_blank');
      }
    } catch (error) {
      console.error('Impersonation failed:', error);
      alert('Failed to impersonate user. Please try again.');
    } finally {
      setImpersonating(null);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCustomer.mutateAsync({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber || undefined,
      });
      setShowRegisterModal(false);
      setFormData(initialFormData);
    } catch (error) {
      console.error('Failed to create customer:', error);
    }
  };

  const handleBan = async () => {
    if (!selectedUserId || !banReason.trim()) return;
    await banUserMutation.mutateAsync({ id: selectedUserId, reason: banReason });
    setShowBanModal(false);
    setSelectedUserId(null);
    setBanReason('');
  };

  const handleUnban = async (id: string) => {
    await unbanUserMutation.mutateAsync(id);
  };

  const openDetailModal = (id: string) => {
    setSelectedUserId(id);
    setActiveTab('profile');
    setShowDetailModal(true);
  };

  const openBanModal = (id: string) => {
    setSelectedUserId(id);
    setShowBanModal(true);
  };

  const openDeleteModal = (user: { id: string; firstName: string | null; lastName: string | null; email: string | null; role: string }) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteUserMutation.mutateAsync(userToDelete.id);
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      // Extract error message from backend response
      const errorMessage = error?.response?.data?.error?.message || 'Failed to delete user. Please try again.';
      alert(errorMessage);
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    const styles: Record<string, { bg: string; text: string; dot: string }> = {
      CUSTOMER: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
      SALON_OWNER: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
      SUPPORT: { bg: 'bg-[#FCD116]/20', text: 'text-[#B8960F]', dot: 'bg-[#FCD116]' },
      ADMIN: { bg: 'bg-[#CE1126]/10', text: 'text-[#CE1126]', dot: 'bg-[#CE1126]' },
      SUPER_ADMIN: { bg: 'bg-[#CE1126]/20', text: 'text-[#CE1126]', dot: 'bg-[#CE1126]' },
    };
    return styles[role] || { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-500' };
  };

  const getRoleBadge = (role: string) => {
    const style = getRoleBadgeStyle(role);
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
        {role.replace('_', ' ').toLowerCase()}
      </span>
    );
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
          <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage platform users and their access</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#006B3F] text-white rounded-xl hover:bg-[#005a35] transition-colors font-medium shadow-sm"
          >
            <Plus size={18} />
            Register Customer
          </button>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-gray-100">
            <UsersIcon size={18} className="text-gray-400" />
            <span className="text-sm text-gray-500">Total:</span>
            <span className="text-lg font-bold text-gray-800">{totalCount}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 text-sm bg-white border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-0 transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'CUSTOMER', 'SALON_OWNER'] as const).map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                roleFilter === role
                  ? 'bg-[#1a1a2e] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {role === 'all' ? 'All Roles' : role === 'CUSTOMER' ? 'Customers' : 'Salon Owners'}
            </button>
          ))}
          <button
            onClick={() => setShowSuspiciousOnly(!showSuspiciousOnly)}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 flex items-center gap-2 ${
              showSuspiciousOnly
                ? 'bg-[#CE1126] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <AlertTriangle size={16} />
            Suspicious Only
          </button>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredUsers.map((user) => (
          <div key={user.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#006B3F] to-[#006B3F]/70 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-md">
                    {user.firstName ? user.firstName[0].toUpperCase() : 'U'}
                  </div>
                  {user.hasSuspiciousActivity && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#CE1126] rounded-full flex items-center justify-center">
                      <AlertTriangle size={12} className="text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{user.firstName || 'Unknown'} {user.lastName || ''}</p>
                  <p className="text-xs text-gray-500">{user.email || '—'}</p>
                </div>
              </div>
              {getRoleBadge(user.role)}
            </div>
            <div className="space-y-2 text-sm bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-600">
                <Phone size={14} className="text-gray-400" />
                <span>{formatPhoneNumber(user.phoneNumber)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar size={14} className="text-gray-400" />
                <span>Joined {formatDate(user.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 mt-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  user.status === 'ACTIVE' 
                    ? 'bg-[#006B3F]/10 text-[#006B3F]' 
                    : 'bg-[#CE1126]/10 text-[#CE1126]'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'ACTIVE' ? 'bg-[#006B3F]' : 'bg-[#CE1126]'}`}></span>
                  {user.status.toLowerCase()}
                </span>
                <span className="text-sm text-gray-500">{user._count?.bookings || 0} bookings</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 flex-wrap">
              <button 
                onClick={() => openDetailModal(user.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors font-medium text-sm"
              >
                <Eye size={16} />
                View
              </button>
              {(user.role === 'CUSTOMER' || user.role === 'SALON_OWNER') && (
                <button
                  onClick={() => handleImpersonate(user.id)}
                  disabled={impersonating === user.id}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[#B8960F] border-2 border-[#FCD116] hover:bg-[#FCD116]/10 rounded-xl disabled:opacity-50 transition-colors font-medium text-sm"
                  title="Login as this user"
                >
                  {impersonating === user.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <LogIn size={16} />
                  )}
                  Impersonate
                </button>
              )}
              {user.status === 'ACTIVE' ? (
                <button 
                  onClick={() => openBanModal(user.id)}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#CE1126] text-white rounded-xl hover:bg-[#a50e1f] transition-colors font-medium text-sm"
                >
                  <Ban size={16} />
                </button>
              ) : (
                <button 
                  onClick={() => handleUnban(user.id)}
                  disabled={unbanUserMutation.isPending}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#006B3F] text-white rounded-xl hover:bg-[#005a35] disabled:opacity-50 transition-colors font-medium text-sm"
                >
                  <CheckCircle size={16} />
                </button>
              )}
              {user.role !== 'SUPER_ADMIN' && (
                <button 
                  onClick={() => openDeleteModal(user)}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium text-sm"
                  title="Delete user"
                >
                  <Trash2 size={16} />
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
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">User</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Role</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Contact</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Bookings</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Joined</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#006B3F] to-[#006B3F]/70 rounded-full flex items-center justify-center text-white font-medium shadow-sm">
                          {user.firstName ? user.firstName[0].toUpperCase() : 'U'}
                        </div>
                        {user.hasSuspiciousActivity && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#CE1126] rounded-full flex items-center justify-center">
                            <AlertTriangle size={10} className="text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{user.firstName || 'Unknown'} {user.lastName || ''}</p>
                        <p className="text-sm text-gray-500">{user.email || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <Phone size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-600">{formatPhoneNumber(user.phoneNumber)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-gray-800">{user._count?.bookings || 0}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-600">{formatDate(user.createdAt)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      user.status === 'ACTIVE' 
                        ? 'bg-[#006B3F]/10 text-[#006B3F]' 
                        : 'bg-[#CE1126]/10 text-[#CE1126]'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'ACTIVE' ? 'bg-[#006B3F]' : 'bg-[#CE1126]'}`}></span>
                      {user.status.toLowerCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => openDetailModal(user.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                        title="View details"
                      >
                        <Eye size={18} />
                      </button>
                      {(user.role === 'CUSTOMER' || user.role === 'SALON_OWNER') && (
                        <button
                          onClick={() => handleImpersonate(user.id)}
                          disabled={impersonating === user.id}
                          className="p-2 text-[#B8960F] border border-[#FCD116] hover:bg-[#FCD116]/10 rounded-lg disabled:opacity-50 transition-colors"
                          title="Login as this user"
                        >
                          {impersonating === user.id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <LogIn size={18} />
                          )}
                        </button>
                      )}
                      {user.status === 'ACTIVE' ? (
                        <button 
                          onClick={() => openBanModal(user.id)}
                          className="p-2 bg-[#CE1126] text-white rounded-lg hover:bg-[#a50e1f] transition-colors"
                          title="Ban user"
                        >
                          <Ban size={18} />
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleUnban(user.id)}
                          disabled={unbanUserMutation.isPending}
                          className="p-2 bg-[#006B3F] text-white rounded-lg hover:bg-[#005a35] disabled:opacity-50 transition-colors"
                          title="Unban user"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}
                      {user.role !== 'SUPER_ADMIN' && (
                        <button 
                          onClick={() => openDeleteModal(user)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete user"
                        >
                          <Trash2 size={18} />
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

      {/* Empty State */}
      {filteredUsers.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <UsersIcon size={32} className="text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium">No users found</p>
          <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Register Customer Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">Register Customer</h2>
              <button 
                onClick={() => { setShowRegisterModal(false); setFormData(initialFormData); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#006B3F] focus:ring-1 focus:ring-[#006B3F]"
                  placeholder="customer@example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#006B3F] focus:ring-1 focus:ring-[#006B3F]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#006B3F] focus:ring-1 focus:ring-[#006B3F]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="+233 XX XXX XXXX"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#006B3F] focus:ring-1 focus:ring-[#006B3F]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowRegisterModal(false); setFormData(initialFormData); }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCustomer.isPending}
                  className="px-4 py-2 bg-[#006B3F] text-white rounded-lg hover:bg-[#005a35] disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {createCustomer.isPending && <Loader2 className="animate-spin" size={16} />}
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {showDetailModal && selectedUserId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">User Details</h2>
              <button 
                onClick={() => { setShowDetailModal(false); setSelectedUserId(null); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {detailsLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-[#006B3F]" size={32} />
              </div>
            ) : userDetails ? (
              <div className="p-6">
                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b border-gray-100 overflow-x-auto">
                  {[
                    { id: 'profile', label: 'Profile', icon: UsersIcon },
                    { id: 'activity', label: 'Activity', icon: Activity },
                    { id: 'bookings', label: 'Bookings', icon: Calendar },
                    { id: 'payments', label: 'Payments', icon: CreditCard },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as DetailTab)}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'border-[#006B3F] text-[#006B3F]'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <tab.icon size={16} />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    {/* User Header */}
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-20 h-20 bg-gradient-to-br from-[#006B3F] to-[#006B3F]/70 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                          {userDetails.firstName ? userDetails.firstName[0].toUpperCase() : 'U'}
                        </div>
                        {userDetails.hasSuspiciousActivity && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#CE1126] rounded-full flex items-center justify-center">
                            <AlertTriangle size={14} className="text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{userDetails.firstName || 'Unknown'} {userDetails.lastName || ''}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {getRoleBadge(userDetails.role)}
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            userDetails.status === 'ACTIVE' 
                              ? 'bg-[#006B3F]/10 text-[#006B3F]' 
                              : 'bg-[#CE1126]/10 text-[#CE1126]'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${userDetails.status === 'ACTIVE' ? 'bg-[#006B3F]' : 'bg-[#CE1126]'}`}></span>
                            {userDetails.status.toLowerCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* User Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Contact Information</h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <Phone size={18} className="text-gray-400" />
                            <span className="text-gray-600">{formatPhoneNumber(userDetails.phoneNumber)}</span>
                          </div>
                          {userDetails.email && (
                            <div className="flex items-center gap-3">
                              <Mail size={18} className="text-gray-400" />
                              <span className="text-gray-600">{userDetails.email}</span>
                            </div>
                          )}
                          {userDetails.location?.city && (
                            <div className="flex items-center gap-3">
                              <MapPin size={18} className="text-gray-400" />
                              <span className="text-gray-600">
                                {userDetails.location.city}{userDetails.location.region ? `, ${userDetails.location.region}` : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Account Details</h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <Calendar size={18} className="text-gray-400" />
                            <div>
                              <p className="text-xs text-gray-500">Joined</p>
                              <p className="text-gray-600">{formatDate(userDetails.createdAt)}</p>
                            </div>
                          </div>
                          {userDetails.lastLoginAt && (
                            <div className="flex items-center gap-3">
                              <Clock size={18} className="text-gray-400" />
                              <div>
                                <p className="text-xs text-gray-500">Last Login</p>
                                <p className="text-gray-600">{formatDate(userDetails.lastLoginAt)}</p>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-3">
                            <Shield size={18} className="text-gray-400" />
                            <div>
                              <p className="text-xs text-gray-500">Verified</p>
                              <p className={`font-medium ${userDetails.isVerified ? 'text-[#006B3F]' : 'text-[#CE1126]'}`}>
                                {userDetails.isVerified ? 'Yes' : 'No'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Ban Info */}
                    {userDetails.status === 'SUSPENDED' && userDetails.banReason && (
                      <div className="bg-[#CE1126]/10 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="text-[#CE1126] mt-0.5" size={20} />
                          <div>
                            <p className="font-medium text-[#CE1126]">Account Suspended</p>
                            <p className="text-sm text-gray-600 mt-1">
                              <strong>Reason:</strong> {userDetails.banReason}
                            </p>
                            {userDetails.bannedAt && (
                              <p className="text-xs text-gray-500 mt-1">
                                Suspended on {formatDate(userDetails.bannedAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-gray-800">{userDetails._count?.bookings || 0}</p>
                        <p className="text-xs text-gray-500">Total Bookings</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-gray-800">{userDetails._count?.salons || 0}</p>
                        <p className="text-xs text-gray-500">Salons</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 text-center">
                        <p className={`text-2xl font-bold ${userDetails.isVerified ? 'text-[#006B3F]' : 'text-[#CE1126]'}`}>
                          {userDetails.isVerified ? 'Verified' : 'Unverified'}
                        </p>
                        <p className="text-xs text-gray-500">Status</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Activity Tab */}
                {activeTab === 'activity' && (
                  <div>
                    {activitiesLoading ? (
                      <div className="flex items-center justify-center h-32">
                        <Loader2 className="animate-spin text-[#006B3F]" size={24} />
                      </div>
                    ) : userActivities?.data && userActivities.data.length > 0 ? (
                      <div className="space-y-3">
                        {userActivities.data.map((activity) => (
                          <div 
                            key={activity.id} 
                            className={`flex items-center justify-between p-4 rounded-xl ${
                              activity.isSuspicious ? 'bg-[#CE1126]/5 border border-[#CE1126]/20' : 'bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {activity.isSuspicious ? (
                                <AlertTriangle size={18} className="text-[#CE1126]" />
                              ) : (
                                <Activity size={18} className="text-gray-400" />
                              )}
                              <div>
                                <p className={`font-medium ${activity.isSuspicious ? 'text-[#CE1126]' : 'text-gray-800'}`}>
                                  {activity.action}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                  <span>{activity.ipAddress || 'Unknown IP'}</span>
                                  <span>•</span>
                                  <span>{activity.device || 'Unknown device'}</span>
                                </div>
                              </div>
                            </div>
                            <span className="text-xs text-gray-400">{formatDate(activity.createdAt)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <Activity size={32} className="mx-auto mb-2 text-gray-300" />
                        <p>No activity recorded</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Bookings Tab */}
                {activeTab === 'bookings' && (
                  <div>
                    {userDetails.bookings && userDetails.bookings.length > 0 ? (
                      <div className="space-y-3">
                        {userDetails.bookings.map((booking) => (
                          <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div>
                              <p className="font-medium text-gray-800">{booking.salon.businessName}</p>
                              <p className="text-sm text-gray-500">{booking.salon.city}</p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                <Calendar size={12} />
                                <span>{booking.scheduledDate} at {booking.scheduledTime}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-800">{formatCurrency(booking.totalAmount)}</p>
                              <p className={`text-xs ${
                                booking.status === 'BOOKING_COMPLETED' ? 'text-green-600' :
                                booking.status === 'CONFIRMED' ? 'text-blue-600' :
                                booking.status === 'CANCELLED' ? 'text-red-600' :
                                'text-gray-500'
                              }`}>{booking.status.toLowerCase().replace('_', ' ')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <Calendar size={32} className="mx-auto mb-2 text-gray-300" />
                        <p>No bookings found</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Payments Tab */}
                {activeTab === 'payments' && (
                  <div>
                    {userDetails.payments && userDetails.payments.length > 0 ? (
                      <div className="space-y-3">
                        {userDetails.payments.map((payment) => (
                          <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div>
                              {payment.booking && (
                                <p className="font-medium text-gray-800">{payment.booking.salon.businessName}</p>
                              )}
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <CreditCard size={14} />
                                <span>{payment.provider}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-800">{formatCurrency(payment.amount)}</p>
                              <p className={`text-xs ${
                                payment.status === 'PAYMENT_COMPLETED' ? 'text-green-600' :
                                payment.status === 'FAILED' ? 'text-red-600' :
                                'text-gray-500'
                              }`}>{payment.status.toLowerCase().replace('_', ' ')}</p>
                              <p className="text-xs text-gray-400 mt-1">{formatDate(payment.createdAt)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <CreditCard size={32} className="mx-auto mb-2 text-gray-300" />
                        <p>No payments found</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                  {userDetails.status === 'ACTIVE' ? (
                    <button
                      onClick={() => { setShowDetailModal(false); openBanModal(selectedUserId); }}
                      className="flex items-center gap-2 px-4 py-2 bg-[#CE1126] text-white rounded-lg hover:bg-[#a50e1f] transition-colors"
                    >
                      <UserX size={18} />
                      Ban User
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUnban(selectedUserId)}
                      disabled={unbanUserMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-[#006B3F] text-white rounded-lg hover:bg-[#005a35] disabled:opacity-50 transition-colors"
                    >
                      {unbanUserMutation.isPending ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <UserCheck size={18} />
                      )}
                      Unban User
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">Unable to load user details</div>
            )}
          </div>
        </div>
      )}

      {/* Ban User Modal */}
      {showBanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Ban User</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">Please provide a reason for banning this user:</p>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={3}
                placeholder="Enter ban reason..."
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#CE1126] focus:ring-1 focus:ring-[#CE1126]"
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => { setShowBanModal(false); setBanReason(''); }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBan}
                  disabled={!banReason.trim() || banUserMutation.isPending}
                  className="px-4 py-2 bg-[#CE1126] text-white rounded-lg hover:bg-[#a50e1f] disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {banUserMutation.isPending && <Loader2 className="animate-spin" size={16} />}
                  Ban User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Delete User</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="text-red-600" size={24} />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">
                    {userToDelete.firstName || 'Unknown'} {userToDelete.lastName || ''}
                  </p>
                  <p className="text-sm text-gray-500">{userToDelete.email || '—'}</p>
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                Are you sure you want to permanently delete this user? This action cannot be undone.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> All data associated with this user will be permanently deleted, including:
                </p>
                <ul className="text-sm text-red-700 mt-2 ml-4 list-disc">
                  {userToDelete.role === 'SALON_OWNER' && (
                    <li>All salons they own (workers, services, bookings, reviews)</li>
                  )}
                  <li>All bookings (past and upcoming)</li>
                  <li>All payment records</li>
                  <li>All reviews and ratings</li>
                  <li>Favorites and notifications</li>
                  {userToDelete.email && (
                    <li>Their email will be banned from future registration</li>
                  )}
                </ul>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setShowDeleteModal(false); setUserToDelete(null); }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteUserMutation.isPending}
                  className="px-4 py-2 bg-[#CE1126] text-white rounded-lg hover:bg-[#a50e1f] disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {deleteUserMutation.isPending && <Loader2 className="animate-spin" size={16} />}
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
