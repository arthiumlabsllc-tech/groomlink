import { useState, useEffect } from 'react';
import { Store, MapPin, Phone, User, LogIn, Search, Eye } from 'lucide-react';
import { api } from '../api';
import { useImpersonation } from '../hooks/useImpersonation';
import { formatPhoneNumber, formatDate, getStatusColor, cn } from '../lib';

interface Salon {
  id: string;
  businessName: string;
  address: string;
  city: string;
  phone: string;
  status: string;
  createdAt: string;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
}

export default function Salons() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  const { startImpersonation, isLoading: isImpersonating } = useImpersonation();

  const fetchSalons = async () => {
    setIsLoading(true);
    try {
      const response = await api.getSalons(page, 20, selectedStatus || undefined);
      setSalons(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch salons:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSalons();
  }, [page, selectedStatus]);

  const handleImpersonate = async (salon: Salon) => {
    await startImpersonation(salon.owner.id, `Supporting salon: ${salon.businessName}`);
  };

  const filteredSalons = searchQuery
    ? salons.filter(s => 
        s.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.owner.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.owner.lastName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : salons;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Salons</h1>
        <p className="text-gray-500 mt-1">View and manage registered salons.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by salon or owner name..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-support-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-support-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {/* Salons Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-support-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSalons.map((salon) => (
            <div
              key={salon.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Store className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{salon.businessName}</h3>
                    <p className="text-sm text-gray-500">{salon.city}</p>
                  </div>
                </div>
                <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(salon.status))}>
                  {salon.status}
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{salon.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{formatPhoneNumber(salon.phone)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span>{salon.owner.firstName} {salon.owner.lastName}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedSalon(salon);
                    setShowDetailModal(true);
                  }}
                  className="flex-1 btn-secondary text-sm py-2"
                >
                  <Eye className="w-4 h-4 mr-1 inline" />
                  View
                </button>
                <button
                  onClick={() => handleImpersonate(salon)}
                  disabled={isImpersonating}
                  className="flex-1 btn-primary text-sm py-2"
                >
                  <LogIn className="w-4 h-4 mr-1 inline" />
                  Impersonate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedSalon && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Store className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{selectedSalon.businessName}</h3>
                <p className="text-sm text-gray-500">{selectedSalon.city}</p>
              </div>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Status</span>
                <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(selectedSalon.status))}>
                  {selectedSalon.status}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Address</span>
                <span className="text-gray-900">{selectedSalon.address}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Phone</span>
                <span className="text-gray-900">{formatPhoneNumber(selectedSalon.phone)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Owner</span>
                <span className="text-gray-900">{selectedSalon.owner.firstName} {selectedSalon.owner.lastName}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Owner Phone</span>
                <span className="text-gray-900">{formatPhoneNumber(selectedSalon.owner.phoneNumber)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Registered</span>
                <span className="text-gray-900">{formatDate(selectedSalon.createdAt)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowDetailModal(false)} className="btn-secondary flex-1">
                Close
              </button>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  handleImpersonate(selectedSalon);
                }}
                disabled={isImpersonating}
                className="btn-primary flex-1"
              >
                Impersonate Owner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
