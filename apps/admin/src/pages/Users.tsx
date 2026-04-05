import { useState } from 'react';
import { Search, Ban, Eye, Phone, Calendar, Loader2, CheckCircle } from 'lucide-react';
import { useUsers, useBlockUser, useUnblockUser } from '../hooks';
import { formatDate, formatPhoneNumber, getStatusColor } from '../lib/utils';

export function Users() {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const { data: usersData, isLoading } = useUsers(page, 20);
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();

  const users = usersData?.data || [];
  const totalCount = usersData?.pagination?.total || 0;

  const filteredUsers = users.filter((user) =>
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phoneNumber.includes(searchTerm) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleBlock = async (id: string) => {
    await blockUser.mutateAsync({ id, reason: 'Suspended by admin' });
  };

  const handleUnblock = async (id: string) => {
    await unblockUser.mutateAsync(id);
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
        <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm">
            <span className="text-sm text-gray-500">Total Users:</span>
            <span className="text-lg font-semibold">{totalCount}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 bg-white p-4 rounded-xl shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE1126] focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">User</th>
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
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Eye size={18} />
                    </button>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
