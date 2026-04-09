import { useState } from 'react';
import { Search, Ban, Eye, Phone, Calendar, Loader2, CheckCircle, LogIn, Users as UsersIcon } from 'lucide-react';
import { useUsers, useBlockUser, useUnblockUser } from '../hooks';
import { formatDate, formatPhoneNumber, getStatusColor } from '../lib/utils';
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

export function Users() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  const { data: usersData, isLoading } = useUsers(page, 20);
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();

  const users = usersData?.data || [];
  const totalCount = usersData?.pagination?.total || 0;

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phoneNumber.includes(searchTerm) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
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
        
        // Store impersonation info
        localStorage.setItem('auth_token', tokens.accessToken);
        localStorage.setItem('impersonation_log_id', impersonationLogId);
        localStorage.setItem('impersonating_user', JSON.stringify(user));

        // Determine redirect URL based on role
        const redirectUrl = user.role === 'SALON_OWNER' 
          ? 'https://partners.groomlinkgh.com'
          : 'https://groomlinkgh.com';
        
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
        <div className="flex gap-2">
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
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredUsers.map((user) => (
          <div key={user.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#006B3F] to-[#006B3F]/70 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-md">
                  {user.firstName.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{user.firstName} {user.lastName}</p>
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
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors font-medium text-sm">
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
                  onClick={() => handleBlock(user.id)}
                  disabled={blockUser.isPending}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#CE1126] text-white rounded-xl hover:bg-[#a50e1f] disabled:opacity-50 transition-colors font-medium text-sm"
                >
                  <Ban size={16} />
                </button>
              ) : (
                <button 
                  onClick={() => handleUnblock(user.id)}
                  disabled={unblockUser.isPending}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#006B3F] text-white rounded-xl hover:bg-[#005a35] disabled:opacity-50 transition-colors font-medium text-sm"
                >
                  <CheckCircle size={16} />
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
                      <div className="w-10 h-10 bg-gradient-to-br from-[#006B3F] to-[#006B3F]/70 rounded-full flex items-center justify-center text-white font-medium shadow-sm">
                        {user.firstName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{user.firstName} {user.lastName}</p>
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
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View details">
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
                          onClick={() => handleBlock(user.id)}
                          disabled={blockUser.isPending}
                          className="p-2 bg-[#CE1126] text-white rounded-lg hover:bg-[#a50e1f] disabled:opacity-50 transition-colors"
                          title="Block user"
                        >
                          <Ban size={18} />
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleUnblock(user.id)}
                          disabled={unblockUser.isPending}
                          className="p-2 bg-[#006B3F] text-white rounded-lg hover:bg-[#005a35] disabled:opacity-50 transition-colors"
                          title="Unblock user"
                        >
                          <CheckCircle size={18} />
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
