import { useState } from 'react';
import Icon from '../components/Icon';
import { useNoShows, useResolveNoShow } from '../hooks';
import { formatDate } from '../lib/utils';
import type { NoShowRecord } from '../api/admin';

export function NoShows() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [disputedFilter, setDisputedFilter] = useState<string>('');
  const { data: noShowsData, isLoading, error } = useNoShows(page, 20);
  const resolveNoShow = useResolveNoShow();

  // Resolve modal state
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedNoShow, setSelectedNoShow] = useState<NoShowRecord | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [upheld, setUpheld] = useState(true);

  const noShows = noShowsData?.data || [];
  const pagination = noShowsData?.pagination;

  // Filter no-shows
  const filteredNoShows = noShows.filter((noShow) => {
    const matchesDisputed = !disputedFilter || 
      (disputedFilter === 'DISPUTED' && noShow.disputed) ||
      (disputedFilter === 'NOT_DISPUTED' && !noShow.disputed) ||
      (disputedFilter === 'UNRESOLVED' && noShow.disputed && !noShow.resolution);
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      (noShow.booking?.salon?.businessName?.toLowerCase().includes(searchLower) ?? false) ||
      `${noShow.booking?.customer?.firstName || ''} ${noShow.booking?.customer?.lastName || ''}`.toLowerCase().trim().includes(searchLower) ||
      noShow.id.toLowerCase().includes(searchLower);
    return matchesDisputed && matchesSearch;
  });

  const openResolveModal = (noShow: NoShowRecord) => {
    setSelectedNoShow(noShow);
    setResolutionText('');
    setUpheld(true);
    setShowResolveModal(true);
  };

  const handleResolve = async () => {
    if (!selectedNoShow || !resolutionText.trim()) return;
    
    try {
      await resolveNoShow.mutateAsync({
        id: selectedNoShow.id,
        resolution: resolutionText,
        upheld,
      });
      setShowResolveModal(false);
      setSelectedNoShow(null);
      setResolutionText('');
    } catch (error) {
      console.error('Failed to resolve no-show:', error);
    }
  };

  const getDisputedBadge = (noShow: NoShowRecord) => {
    if (!noShow.disputed) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-50 text-gray-600">
          Not Disputed
        </span>
      );
    }

    if (noShow.resolution) {
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
          noShow.upheld 
            ? 'bg-[#006B3F]/10 text-[#006B3F]' 
            : 'bg-[#CE1126]/10 text-[#CE1126]'
        }`}>
          {noShow.upheld ? <Icon name="check_circle" size={14} /> : <Icon name="warning" size={14} />}
          Resolved ({noShow.upheld ? 'Upheld' : 'Overturned'})
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-[#FCD116]/20 text-[#B8960F]">
        <Icon name="warning" size={14} />
        Disputed - Pending Resolution
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="page-enter space-y-6">
        <div className="card-v2 p-6">
          <div className="skeleton-shimmer h-8 w-48 mb-4" />
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton-shimmer h-14 w-full mb-3" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Icon name="error" size={48} className="text-[#CE1126]" />
        <p className="text-lg font-medium text-gray-600">Failed to load no-shows data</p>
        <p className="text-sm text-gray-500">Please try again later</p>
      </div>
    );
  }

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">No-Show Records</h1>
          <p className="text-sm text-gray-500 mt-1">Track no-shows and resolve disputes</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 card-v2">
          <Icon name="person_remove" size={18} className="text-gray-400" />
          <span className="text-sm text-gray-500">Total:</span>
          <span className="text-lg font-bold text-gray-800">{pagination?.total || 0}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by salon, customer, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 text-sm bg-white border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-0 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {[
            { value: '', label: 'All' },
            { value: 'DISPUTED', label: 'Disputed' },
            { value: 'UNRESOLVED', label: 'Pending Resolution' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setDisputedFilter(option.value)}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                disputedFilter === option.value
                  ? 'bg-[#1a1a2e] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredNoShows.map((noShow) => (
          <NoShowCard 
            key={noShow.id} 
            noShow={noShow} 
            getDisputedBadge={getDisputedBadge}
            onResolve={() => openResolveModal(noShow)}
          />
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block card-v2 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Booking ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Salon</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Customer</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Marked By</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Marked At</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Disputed</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Resolution</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredNoShows.map((noShow) => (
                <tr key={noShow.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-medium text-gray-800">{noShow.booking?.id?.slice(0, 8) || '—'}...</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-800">{noShow.booking?.salon?.businessName || 'Unknown Salon'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {noShow.booking?.customer?.firstName || 'Unknown'} {noShow.booking?.customer?.lastName || ''}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {noShow.markedBy?.firstName || 'Unknown'} {noShow.markedBy?.lastName || ''}
                      {noShow.markedBy?.role && <span className="text-xs text-gray-400 ml-1">({noShow.markedBy.role})</span>}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">{formatDate(noShow.markedAt)}</span>
                  </td>
                  <td className="px-6 py-4">{getDisputedBadge(noShow)}</td>
                  <td className="px-6 py-4">
                    {noShow.resolution ? (
                      <div className="max-w-xs">
                        <p className="text-sm text-gray-600 truncate">{noShow.resolution}</p>
                        {noShow.resolvedAt && (
                          <p className="text-xs text-gray-400 mt-1">{formatDate(noShow.resolvedAt)}</p>
                        )}
                      </div>
                    ) : noShow.disputeReason ? (
                      <div className="max-w-xs">
                        <p className="text-sm text-[#B8960F] truncate" title={noShow.disputeReason}>
                          <Icon name="chat" size={14} className="inline mr-1" />
                          {noShow.disputeReason}
                        </p>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {noShow.disputed && !noShow.resolution && (
                      <button
                        onClick={() => openResolveModal(noShow)}
                        className="btn-ripple px-3 py-1.5 text-sm font-medium text-[#006B3F] border border-[#006B3F] rounded-xl hover:bg-[#006B3F]/10 transition-colors"
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {filteredNoShows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 card-v2">
          <Icon name="person_remove" size={48} className="text-gray-300 mb-4" />
          <p className="text-lg font-medium text-gray-600">No no-shows found</p>
          <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filter criteria</p>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between card-v2 px-4 py-3">
          <p className="text-sm text-gray-600">
            Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, pagination.total)} of {pagination.total} records
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Icon name="chevron_left" size={20} />
            </button>
            <span className="text-sm font-medium text-gray-700">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === pagination.totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Icon name="chevron_right" size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && selectedNoShow && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-elevated animate-slide-up w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Resolve No-Show Dispute</h2>
              <button
                onClick={() => setShowResolveModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Booking Info */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Booking ID:</span>
                  <span className="font-mono font-medium">{selectedNoShow.booking?.id?.slice(0, 12) || '—'}...</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Salon:</span>
                  <span className="font-medium">{selectedNoShow.booking?.salon?.businessName || 'Unknown Salon'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Customer:</span>
                  <span className="font-medium">
                    {selectedNoShow.booking?.customer?.firstName || 'Unknown'} {selectedNoShow.booking?.customer?.lastName || ''}
                  </span>
                </div>
              </div>

              {/* Dispute Reason */}
              {selectedNoShow.disputeReason && (
                <div className="bg-[#FCD116]/10 border border-[#FCD116]/20 rounded-xl p-4">
                  <p className="text-sm font-medium text-[#B8960F] mb-1">Dispute Reason:</p>
                  <p className="text-sm text-gray-700">{selectedNoShow.disputeReason}</p>
                </div>
              )}

              {/* Resolution Form */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Notes</label>
                <textarea
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  placeholder="Enter your resolution notes..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#006B3F] focus:ring-1 focus:ring-[#006B3F] resize-none"
                  rows={4}
                />
              </div>

              {/* Upheld Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-800">Uphold No-Show</p>
                  <p className="text-sm text-gray-500">If upheld, the no-show remains on the customer's record</p>
                </div>
                <button
                  type="button"
                  onClick={() => setUpheld(!upheld)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                    upheld ? 'bg-[#006B3F]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      upheld ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowResolveModal(false)}
                  className="btn-ripple px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolve}
                  disabled={!resolutionText.trim() || resolveNoShow.isPending}
                  className="btn-ripple px-4 py-2 bg-[#006B3F] text-white rounded-xl hover:bg-[#005a35] disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {resolveNoShow.isPending && <Icon name="progress_activity" size={16} className="animate-spin" />}
                  {upheld ? 'Uphold No-Show' : 'Overturn No-Show'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Mobile Card Component
function NoShowCard({ 
  noShow, 
  getDisputedBadge,
  onResolve
}: { 
  noShow: NoShowRecord; 
  getDisputedBadge: (noShow: NoShowRecord) => JSX.Element;
  onResolve: () => void;
}) {
  return (
    <div className="card-v2 p-4 border-l-4 border-l-red-500">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#CE1126]/10 to-[#CE1126]/20 rounded-xl flex items-center justify-center">
            <Icon name="person_remove" size={20} className="text-[#CE1126]" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">{noShow.booking?.salon?.businessName || 'Unknown Salon'}</p>
            <p className="text-xs text-gray-500">Booking: {noShow.booking?.id?.slice(0, 8) || '—'}...</p>
          </div>
        </div>
      </div>
      <div className="space-y-2 text-sm bg-gray-50 rounded-lg p-3">
        <div className="flex justify-between">
          <span className="text-gray-500">Customer:</span>
          <span className="font-medium text-gray-800">
            {noShow.booking?.customer?.firstName || 'Unknown'} {noShow.booking?.customer?.lastName || ''}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Marked By:</span>
          <span className="text-gray-700">
            {noShow.markedBy?.firstName || 'Unknown'} {noShow.markedBy?.lastName || ''}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Marked At:</span>
          <span className="text-gray-700">{formatDate(noShow.markedAt)}</span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
          <span className="text-gray-500">Status:</span>
          {getDisputedBadge(noShow)}
        </div>
        {noShow.disputeReason && !noShow.resolution && (
          <div className="mt-2 p-2 bg-[#FCD116]/10 rounded-lg">
            <p className="text-xs text-[#B8960F] font-medium">Dispute Reason:</p>
            <p className="text-sm text-gray-700 mt-1">{noShow.disputeReason}</p>
          </div>
        )}
        {noShow.resolution && (
          <div className="mt-2 p-2 bg-gray-100 rounded-lg">
            <p className="text-xs text-gray-500 font-medium">Resolution:</p>
            <p className="text-sm text-gray-700 mt-1">{noShow.resolution}</p>
          </div>
        )}
      </div>
      {noShow.disputed && !noShow.resolution && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <button
            onClick={onResolve}
            className="btn-ripple w-full py-2.5 text-sm font-medium text-[#006B3F] border-2 border-[#006B3F] rounded-xl hover:bg-[#006B3F]/10 transition-colors"
          >
            Resolve Dispute
          </button>
        </div>
      )}
    </div>
  );
}
