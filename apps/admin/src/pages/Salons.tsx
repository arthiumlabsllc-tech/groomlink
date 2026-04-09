import { useState } from 'react';
import { Search, CheckCircle, XCircle, Eye, MapPin, Phone, Loader2, AlertCircle, Store } from 'lucide-react';
import { useSalons, useApproveSalon, useRejectSalon, usePendingSalons } from '../hooks';
import { formatDate, formatPhoneNumber } from '../lib/utils';

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
    const styles: Record<string, { bg: string; text: string; dot: string }> = {
      APPROVED: { bg: 'bg-[#006B3F]/10', text: 'text-[#006B3F]', dot: 'bg-[#006B3F]' },
      PENDING: { bg: 'bg-[#FCD116]/20', text: 'text-[#B8960F]', dot: 'bg-[#FCD116]' },
      REJECTED: { bg: 'bg-[#CE1126]/10', text: 'text-[#CE1126]', dot: 'bg-[#CE1126]' },
    };
    const style = styles[status] || styles.PENDING;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
        {status.toLowerCase()}
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
          <h1 className="text-2xl font-bold text-gray-800">Salon Management</h1>
          <p className="text-sm text-gray-500 mt-1">Review and manage salon registrations</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-gray-100">
            <Store size={18} className="text-gray-400" />
            <span className="text-sm text-gray-500">Total:</span>
            <span className="text-lg font-bold text-gray-800">{totalCount}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-[#FCD116]/10 rounded-xl shadow-sm border border-[#FCD116]/20">
            <span className="w-2 h-2 rounded-full bg-[#FCD116]"></span>
            <span className="text-sm text-[#B8960F]">Pending:</span>
            <span className="text-lg font-bold text-[#B8960F]">{pendingCount}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search salons or owners..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 text-sm bg-white border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-0 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                statusFilter === status
                  ? status === 'PENDING' ? 'bg-[#FCD116] text-[#1a1a2e]' :
                    status === 'APPROVED' ? 'bg-[#006B3F] text-white' :
                    status === 'REJECTED' ? 'bg-[#CE1126] text-white' :
                    'bg-[#1a1a2e] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredSalons.map((salon) => (
          <div key={salon.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#006B3F]/10 to-[#FCD116]/10 rounded-xl flex items-center justify-center">
                  <Store size={24} className="text-[#006B3F]" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{salon.businessName}</p>
                  <p className="text-xs text-gray-500">{formatDate(salon.createdAt)}</p>
                </div>
              </div>
              {getStatusBadge(salon.status)}
            </div>
            <div className="space-y-2 text-sm bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-600">
                <span className="font-medium w-16 text-gray-500">Owner:</span>
                <span className="font-medium text-gray-800">{salon.owner.firstName} {salon.owner.lastName}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Phone size={14} className="text-gray-400" />
                <span>{formatPhoneNumber(salon.phoneNumber)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin size={14} className="text-gray-400" />
                <span>{salon.city}, {salon.region}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors font-medium">
                <Eye size={18} />
                View
              </button>
              {salon.status === 'PENDING' && (
                <>
                  <button 
                    onClick={() => handleApprove(salon.id)}
                    disabled={approveSalon.isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#006B3F] text-white rounded-xl hover:bg-[#005a35] disabled:opacity-50 transition-colors font-medium"
                  >
                    <CheckCircle size={18} />
                    Approve
                  </button>
                  <button 
                    onClick={() => handleReject(salon.id)}
                    disabled={rejectSalon.isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#CE1126] text-white rounded-xl hover:bg-[#a50e1f] disabled:opacity-50 transition-colors font-medium"
                  >
                    <XCircle size={18} />
                    Reject
                  </button>
                </>
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
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Salon</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Owner</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Location</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Rating</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSalons.map((salon) => (
                <tr key={salon.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#006B3F]/10 to-[#FCD116]/10 rounded-lg flex items-center justify-center">
                        <Store size={18} className="text-[#006B3F]" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{salon.businessName}</p>
                        <p className="text-sm text-gray-500">{formatDate(salon.createdAt)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{salon.owner.firstName} {salon.owner.lastName}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Phone size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-500">{formatPhoneNumber(salon.phoneNumber)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-600">{salon.city}, {salon.region}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(salon.status)}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-400">—</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Eye size={18} />
                      </button>
                      {salon.status === 'PENDING' && (
                        <>
                          <button 
                            onClick={() => handleApprove(salon.id)}
                            disabled={approveSalon.isPending}
                            className="p-2 bg-[#006B3F] text-white rounded-lg hover:bg-[#005a35] disabled:opacity-50 transition-colors"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button 
                            onClick={() => handleReject(salon.id)}
                            disabled={rejectSalon.isPending}
                            className="p-2 bg-[#CE1126] text-white rounded-lg hover:bg-[#a50e1f] disabled:opacity-50 transition-colors"
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

      {/* Empty State */}
      {filteredSalons.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium">No salons found</p>
          <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filter</p>
        </div>
      )}
    </div>
  );
}
