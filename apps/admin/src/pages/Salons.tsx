import { useState } from 'react';
import { Search, Filter, CheckCircle, XCircle, Eye, MapPin, Phone, Loader2, AlertCircle } from 'lucide-react';
import { useSalons, useApproveSalon, useRejectSalon, usePendingSalons } from '../hooks';
import { formatDate, formatPhoneNumber, getStatusColor } from '../lib/utils';

export function Salons() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('all');
  const [page, setPage] = useState(1);

  const { data: salonsData, isLoading } = useSalons(page, 20, statusFilter === 'all' ? undefined : statusFilter);
  const { data: pendingData } = usePendingSalons(1, 10);
  const approveSalon = useApproveSalon();
  const rejectSalon = useRejectSalon();

  const salons = salonsData?.data || [];
  const pendingCount = pendingData?.pagination?.total || 0;
  const totalCount = salonsData?.pagination?.total || 0;

  const filteredSalons = salons.filter((salon) => {
    const matchesSearch = 
      salon.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      salon.owner.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      salon.owner.lastName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleApprove = async (id: string) => {
    await approveSalon.mutateAsync(id);
  };

  const handleReject = async (id: string) => {
    await rejectSalon.mutateAsync({ id, reason: 'Rejected by admin' });
  };

  const getStatusBadge = (status: string) => {
    const colorClass = getStatusColor(status);
    return (
      <span className={`px-3 py-1 rounded-full text-sm capitalize ${colorClass}`}>
        {status.toLowerCase()}
      </span>
    );
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Salon Management</h1>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm">
            <span className="text-sm text-gray-500">Total:</span>
            <span className="text-lg font-semibold">{totalCount}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 rounded-lg shadow-sm">
            <span className="text-sm text-yellow-600">Pending:</span>
            <span className="text-lg font-semibold text-yellow-600">
              {pendingCount}
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 bg-white p-4 rounded-xl shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search salons or owners..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE1126] focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'PENDING' | 'APPROVED' | 'REJECTED')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE1126] focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Salons Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Salon</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Owner</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Location</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Status</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Rating</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredSalons.map((salon) => (
              <tr key={salon.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-gray-800">{salon.businessName}</p>
                    <p className="text-sm text-gray-500">{formatDate(salon.createdAt)}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm text-gray-800">{salon.owner.firstName} {salon.owner.lastName}</p>
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-600">{formatPhoneNumber(salon.phoneNumber)}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-600">{salon.city}, {salon.region}</span>
                  </div>
                </td>
                <td className="px-6 py-4">{getStatusBadge(salon.status)}</td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-500">-</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Eye size={18} />
                    </button>
                    {salon.status === 'PENDING' && (
                      <>
                        <button 
                          onClick={() => handleApprove(salon.id)}
                          disabled={approveSalon.isPending}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button 
                          onClick={() => handleReject(salon.id)}
                          disabled={rejectSalon.isPending}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                        >
                          <XCircle size={18} />
                        </button>
                      </>
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
