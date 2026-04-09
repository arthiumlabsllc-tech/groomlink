import { useState, useEffect } from 'react';
import { Store, MapPin, Phone, User, LogIn, Search, Eye, Star, X, ChevronLeft } from 'lucide-react';
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
  rating?: number;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
}

const statusFilters = [
  { value: '', label: 'All Status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

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

  // Mobile detail view
  if (showDetailModal && selectedSalon) {
    return (
      <div className="space-y-6">
        {/* Mobile Back Button */}
        <button 
          onClick={() => setShowDetailModal(false)}
          className="md:hidden flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to salons
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-transparent">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200">
                <Store className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 font-heading">{selectedSalon.businessName}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{selectedSalon.city}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-500">Status</span>
              <span className={cn('px-3 py-1.5 rounded-full text-xs font-semibold', getStatusColor(selectedSalon.status))}>
                {selectedSalon.status}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-500">Rating</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    className={`w-4 h-4 ${star <= (selectedSalon.rating || 4) ? 'text-ghana-yellow fill-ghana-yellow' : 'text-gray-300'}`} 
                  />
                ))}
                <span className="ml-1 text-sm text-gray-600">({selectedSalon.rating || 4.0})</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-500">Address</span>
              <span className="text-gray-900 text-right max-w-[60%]">{selectedSalon.address}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-500">Phone</span>
              <span className="text-gray-900">{formatPhoneNumber(selectedSalon.phone)}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-500">Owner</span>
              <span className="text-gray-900">{selectedSalon.owner.firstName} {selectedSalon.owner.lastName}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-500">Owner Phone</span>
              <span className="text-gray-900">{formatPhoneNumber(selectedSalon.owner.phoneNumber)}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-gray-500">Registered</span>
              <span className="text-gray-900">{formatDate(selectedSalon.createdAt)}</span>
            </div>
          </div>

          <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3">
            <button 
              onClick={() => setShowDetailModal(false)} 
              className="flex-1 py-3 px-4 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
            >
              Close
            </button>
            <button
              onClick={() => handleImpersonate(selectedSalon)}
              disabled={isImpersonating}
              className="flex-1 py-3 px-4 bg-ghana-yellow text-ghana-dark rounded-xl font-semibold hover:bg-yellow-400 active:bg-yellow-500 transition-all disabled:opacity-50 shadow-md shadow-yellow-200"
            >
              {isImpersonating ? 'Impersonating...' : 'Impersonate Owner'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-heading">Salons</h1>
        <p className="text-gray-500 mt-1">View and manage registered salons.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by salon or owner name..."
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ghana-green focus:border-ghana-green transition-all"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {statusFilters.map((status) => (
              <button
                key={status.value}
                onClick={() => setSelectedStatus(status.value)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  selectedStatus === status.value
                    ? "bg-ghana-green text-white shadow-md shadow-ghana-green/20"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Salons Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ghana-green"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSalons.map((salon) => (
            <div
              key={salon.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-lg transition-all duration-200 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center group-hover:from-purple-500 group-hover:to-purple-600 transition-all duration-200">
                    <Store className="w-6 h-6 text-purple-600 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{salon.businessName}</h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <p className="text-sm text-gray-500">{salon.city}</p>
                    </div>
                  </div>
                </div>
                <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', getStatusColor(salon.status))}>
                  {salon.status}
                </span>
              </div>
              
              <div className="space-y-2.5 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-400" />
                  </div>
                  <span className="font-medium">{salon.owner.firstName} {salon.owner.lastName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
                    <Phone className="w-4 h-4 text-gray-400" />
                  </div>
                  <span>{formatPhoneNumber(salon.phone)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
                    <Star className="w-4 h-4 text-ghana-yellow fill-ghana-yellow" />
                  </div>
                  <span className="text-ghana-yellow font-medium">{salon.rating || '4.0'}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    setSelectedSalon(salon);
                    setShowDetailModal(true);
                  }}
                  className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>
                <button
                  onClick={() => handleImpersonate(salon)}
                  disabled={isImpersonating}
                  className="flex-1 py-2.5 px-4 bg-ghana-yellow text-ghana-dark rounded-lg font-semibold hover:bg-yellow-400 active:bg-yellow-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Impersonate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="py-2 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="py-2 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Next
          </button>
        </div>
      )}

      {/* Desktop Detail Modal */}
      {showDetailModal && selectedSalon && (
        <div className="hidden md:flex fixed inset-0 bg-black/60 backdrop-blur-sm items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Store className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 font-heading">{selectedSalon.businessName}</h3>
                  <p className="text-sm text-gray-500">{selectedSalon.city}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDetailModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Status</span>
                <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', getStatusColor(selectedSalon.status))}>
                  {selectedSalon.status}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Address</span>
                <span className="text-gray-900 text-right max-w-[60%]">{selectedSalon.address}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Phone</span>
                <span className="text-gray-900">{formatPhoneNumber(selectedSalon.phone)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Owner</span>
                <span className="text-gray-900">{selectedSalon.owner.firstName} {selectedSalon.owner.lastName}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Owner Phone</span>
                <span className="text-gray-900">{formatPhoneNumber(selectedSalon.owner.phoneNumber)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Registered</span>
                <span className="text-gray-900">{formatDate(selectedSalon.createdAt)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowDetailModal(false)} 
                className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  handleImpersonate(selectedSalon);
                }}
                disabled={isImpersonating}
                className="flex-1 py-2.5 px-4 bg-ghana-yellow text-ghana-dark rounded-xl font-semibold hover:bg-yellow-400 active:bg-yellow-500 transition-all disabled:opacity-50"
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
