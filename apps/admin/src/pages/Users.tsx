import { useState } from 'react';
import { Search, Ban, Eye, Phone, Calendar, Loader2, CheckCircle, LogIn, ExternalLink } from 'lucide-react';
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'CUSTOMER': return 'bg-blue-100 text-blue-700';
      case 'SALON_OWNER': return 'bg-purple-100 text-purple-700';
      case 'SUPPORT': return 'bg-orange-100 text-orange-700';
      case 'ADMIN': return 'bg-red-100 text-red-700';
      case 'SUPER_ADMIN': return 'bg-red-200 text-red-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-[#CE1126]" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">User Management</h1>
        <div className="flex gap-2 md:gap-4">
          <div className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white rounded-lg shadow-sm">
            <span className="text-xs md:text-sm text-gray-500">Total:</span>
            <span className="text-sm md:text-lg font-semibold">{totalCount}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 md:gap-4 bg-white p-3 md:p-4 rounded-xl shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE1126] focus:border-transparent"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE1126] focus:border-transparent"
        >
          <option value="all">All Roles</option>
          <option value="CUSTOMER">Customers</option>
          <option value="SALON_OWNER">Salon Owners</option>
        </select>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredUsers.map((user) => (
          <div key={user.id} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#006B3F] rounded-full flex items-center justify-center text-white font-medium">
                  {user.firstName.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-800">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-gray-500">{user.email || '-'}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs capitalize ${getRoleBadgeColor(user.role)}`}>
                {user.role.replace('_', ' ')}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Phone size={14} className="text-gray-400" />
                <span>{formatPhoneNumber(user.phoneNumber)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar size={14} className="text-gray-400" />
                <span>Joined {formatDate(user.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded text-xs capitalize ${getStatusColor(user.status)}`}>
                  {user.status.toLowerCase()}
                </span>
                <span className="text-sm text-gray-500">{user._count?.bookings || 0} bookings</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
              <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                <Eye size={18} />
              </button>
              {(user.role === 'CUSTOMER' || user.role === 'SALON_OWNER') && (
                <button
                  onClick={() => handleImpersonate(user.id)}
                  disabled={impersonating === user.id}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
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
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                >
                  <Ban size={18} />
                </button>
              ) : (
                <button 
                  onClick={() => handleUnblock(user.id)}
                  disabled={unblockUser.isPending}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                >
                  <CheckCircle size={18} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">User</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Role</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Contact</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Bookings</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Joined</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#006B3F] rounded-full flex items-center justify-center text-white font-medium">
                        {user.firstName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{user.firstName} {user.lastName}</p>
                        <p className="text-sm text-gray-500">{user.email || '-'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs capitalize ${getRoleBadgeColor(user.role)}`}>
                      {user.role.replace('_', ' ').toLowerCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-600">{formatPhoneNumber(user.phoneNumber)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium">{user._count?.bookings || 0}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-600">{formatDate(user.createdAt)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm capitalize ${getStatusColor(user.status)}`}>
                      {user.status.toLowerCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="View details">
                        <Eye size={18} />
                      </button>
                      {(user.role === 'CUSTOMER' || user.role === 'SALON_OWNER') && (
                        <button
                          onClick={() => handleImpersonate(user.id)}
                          disabled={impersonating === user.id}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
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
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                          title="Block user"
                        >
                          <Ban size={18} />
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleUnblock(user.id)}
                          disabled={unblockUser.isPending}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
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
