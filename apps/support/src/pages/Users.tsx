import { useState } from 'react';
import { Search, User, Store, LogIn } from 'lucide-react';
import { useImpersonation } from '../hooks/useImpersonation';
import { api } from '../api';
import { formatPhoneNumber, getStatusColor, getRoleColor, cn } from '../lib';

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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Search</h1>
        <p className="text-gray-500 mt-1">Search for users and impersonate them to provide support.</p>
      </div>

      {/* Search Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by name, phone, or email..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-support-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-4">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-support-500 focus:border-transparent"
            >
              <option value="">All Roles</option>
              <option value="CUSTOMER">Customers</option>
              <option value="SALON_OWNER">Salon Owners</option>
            </select>
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="btn-primary flex items-center gap-2"
            >
              {isSearching ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {hasSearched && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">
              {results.length} user{results.length !== 1 ? 's' : ''} found
            </h2>
          </div>
          
          {results.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {results.map((user) => (
                <div key={user.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-gray-500">
                            {formatPhoneNumber(user.phoneNumber)}
                          </span>
                          {user.email && (
                            <span className="text-sm text-gray-400">• {user.email}</span>
                          )}
                        </div>
                        {user.salons && user.salons.length > 0 && (
                          <div className="flex items-center gap-2 mt-1">
                            <Store className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {user.salons.map(s => s.businessName).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end gap-2">
                        <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getRoleColor(user.role))}>
                          {user.role}
                        </span>
                        <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(user.status))}>
                          {user.status}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowImpersonateModal(true);
                          }}
                          className="p-2 text-support-600 hover:bg-support-50 rounded-lg"
                          title="Impersonate user"
                        >
                          <LogIn className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              No users found matching your search criteria.
            </div>
          )}
        </div>
      )}

      {/* Impersonation Modal */}
      {showImpersonateModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Impersonate User</h3>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{selectedUser.phoneNumber}</p>
                </div>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Impersonation
              </label>
              <textarea
                value={impersonationReason}
                onChange={(e) => setImpersonationReason(e.target.value)}
                placeholder="e.g., Customer reported booking issue..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-support-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>
            <div className="bg-yellow-50 text-yellow-700 text-sm rounded-lg p-3 mb-4">
              <strong>Warning:</strong> You will be logged in as this user. All actions will be logged for audit purposes.
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowImpersonateModal(false);
                  setSelectedUser(null);
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleImpersonate}
                disabled={isImpersonating}
                className="btn-primary flex-1"
              >
                {isImpersonating ? 'Impersonating...' : 'Start Impersonation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
