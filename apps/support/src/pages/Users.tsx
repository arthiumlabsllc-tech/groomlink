import { useState } from 'react';
import Icon from '../components/Icon';
import { useImpersonation } from '../hooks/useImpersonation';
import { api } from '../api';
import { formatPhoneNumber, getStatusColor, cn } from '../lib';

interface UserResult {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  role: string;
  status: string;
  createdAt: string;
  salons?: { id: string; businessName: string }[];
}

const roleFilters = [
  { value: '', label: 'All', icon: 'group' },
  { value: 'CUSTOMER', label: 'Customers', icon: 'person' },
  { value: 'SALON_OWNER', label: 'Salon Owners', icon: 'store' },
];

const getRoleBadge = (role: string) => {
  switch (role) {
    case 'CUSTOMER':
      return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'SALON_OWNER':
      return 'bg-purple-50 text-purple-700 border border-purple-200';
    case 'SUPPORT':
      return 'bg-ghana-green/10 text-ghana-green border border-ghana-green/20';
    default:
      return 'bg-gray-50 text-gray-700 border border-gray-200';
  }
};

export default function Users() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [impersonationReason, setImpersonationReason] = useState('');
  const [showImpersonateModal, setShowImpersonateModal] = useState(false);
  
  const { startImpersonation, isLoading: isImpersonating } = useImpersonation();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setHasSearched(true);
    try {
      const result = await api.searchUsers(searchQuery, selectedRole || undefined);
      setResults(result.users);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleImpersonate = async () => {
    if (!selectedUser) return;
    
    const success = await startImpersonation(selectedUser.id, impersonationReason);
    if (success) {
      setShowImpersonateModal(false);
      setSelectedUser(null);
      setImpersonationReason('');
    }
  };

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-heading">User Search</h1>
        <p className="text-gray-500 mt-1">Search for users and impersonate them to provide support.</p>
      </div>

      {/* Search Card */}
      <div className="card-v2 p-6">
        {/* Prominent Search Bar */}
        <div className="relative mb-4">
          <Icon name="search" size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by name, phone, or email..."
            className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-ghana-green focus:border-ghana-green text-lg transition-all"
          />
        </div>
        
        {/* Role Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500 mr-2">Filter by role:</span>
          {roleFilters.map((role) => {
            const isActive = selectedRole === role.value;
            return (
              <button
                key={role.value}
                onClick={() => setSelectedRole(role.value)}
                className={cn(
                  "tab-pill",
                  isActive ? "tab-pill-active" : "tab-pill-inactive"
                )}
              >
                <Icon name={role.icon} size={16} />
                {role.label}
              </button>
            );
          })}
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="ml-auto bg-ghana-green text-white px-6 py-2.5 rounded-xl font-medium hover:bg-support-700 active:bg-support-800 transition-all duration-200 disabled:opacity-50 flex items-center gap-2 shadow-md shadow-ghana-green/20 btn-ripple"
          >
            {isSearching ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Icon name="search" size={20} />
            )}
            Search
          </button>
        </div>
      </div>

      {/* Results */}
      {hasSearched && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 font-heading">
              {results.length} user{results.length !== 1 ? 's' : ''} found
            </h2>
          </div>
          
          {isSearching ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card-v2 p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full skeleton-shimmer flex-shrink-0"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-1/2 rounded skeleton-shimmer"></div>
                      <div className="h-4 w-2/3 rounded skeleton-shimmer"></div>
                      <div className="h-4 w-1/3 rounded skeleton-shimmer"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((user) => (
                <div 
                  key={user.id} 
                  className="card-v2 p-5 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 font-bold text-lg">
                          {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-lg">
                          {user.firstName} {user.lastName}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-gray-500">
                            {formatPhoneNumber(user.phoneNumber)}
                          </span>
                        </div>
                        {user.email && (
                          <p className="text-sm text-gray-400 mt-0.5">{user.email}</p>
                        )}
                        {user.salons && user.salons.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <Icon name="store" size={16} className="text-ghana-green" />
                            <span className="text-sm text-gray-600">
                              {user.salons.map(s => s.businessName).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={cn('px-3 py-1 rounded-full text-xs font-medium', getRoleBadge(user.role))}>
                        {user.role}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', getStatusColor(user.status))}>
                      {user.status}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowImpersonateModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-ghana-yellow text-ghana-dark rounded-lg font-medium hover:bg-yellow-400 active:bg-yellow-500 transition-all duration-200 btn-ripple"
                      title="Impersonate user"
                    >
                      <Icon name="login" size={16} />
                      Impersonate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="search" size={32} className="text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg">No users found matching your search criteria.</p>
            </div>
          )}
        </div>
      )}

      {/* Impersonation Modal */}
      {showImpersonateModal && selectedUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-elevated max-w-md w-full p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 font-heading">Impersonate User</h3>
              <button 
                onClick={() => {
                  setShowImpersonateModal(false);
                  setSelectedUser(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            
            {/* Yellow Warning Banner */}
            <div className="bg-ghana-yellow/15 border border-ghana-yellow/30 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-ghana-yellow to-yellow-400 rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon name="person" size={20} className="text-ghana-dark" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{formatPhoneNumber(selectedUser.phoneNumber)}</p>
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Impersonation
              </label>
              <textarea
                value={impersonationReason}
                onChange={(e) => setImpersonationReason(e.target.value)}
                placeholder="e.g., Customer reported booking issue..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ghana-green focus:border-ghana-green resize-none transition-all"
                rows={3}
              />
            </div>
            
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4 mb-6">
              <strong className="block mb-1">⚠️ Warning</strong>
              You will be logged in as this user. All actions will be logged for audit purposes.
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowImpersonateModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 active:bg-gray-300 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleImpersonate}
                disabled={isImpersonating || !impersonationReason.trim()}
                className="flex-1 py-2.5 px-4 bg-ghana-yellow text-ghana-dark rounded-xl font-semibold hover:bg-yellow-400 active:bg-yellow-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-yellow-200"
              >
                {isImpersonating ? 'Impersonating...' : 'Impersonate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
