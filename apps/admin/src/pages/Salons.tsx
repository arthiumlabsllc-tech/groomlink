import { useState } from 'react';
import { 
  Search, CheckCircle, XCircle, Eye, MapPin, Phone, Loader2, AlertCircle, Store,
  Plus, X, Clock, Calendar, Star, Users, Scissors, CreditCard, Ban, RotateCcw,
  Mail, Navigation, Shield, FileText, Video, Image, Building2, User, ExternalLink
} from 'lucide-react';
import { 
  useSalons, useApproveSalon, useRejectSalon, usePendingSalons, 
  useSuspendSalon, useReactivateSalon, useCreateSalon, useSalonDetails,
  useKycSubmissions, useKycSubmissionDetail, useApproveKyc, useRejectKyc, usePendingKycCount
} from '../hooks';
import { formatDate, formatPhoneNumber, formatCurrency } from '../lib/utils';
import { SalonType, SalonStatus, KycStatus, BusinessType, KycSubmission } from '../api/salons';

const GHANA_REGIONS = [
  'Greater Accra', 'Ashanti', 'Central', 'Eastern', 'Western', 
  'Northern', 'Upper East', 'Upper West', 'Volta', 'Brong-Ahafo',
  'Western North', 'Oti', 'Bono East', 'Ahafo', 'Savannah', 'North East'
];

const SALON_TYPES: { value: SalonType; label: string }[] = [
  { value: 'BARBERSHOP', label: 'Barbershop' },
  { value: 'HAIR_SALON', label: 'Hair Salon' },
  { value: 'BEAUTY_SALON', label: 'Beauty Salon' },
  { value: 'NAIL_SALON', label: 'Nail Salon' },
  { value: 'PEDICURE_SALON', label: 'Pedicure Salon' },
  { value: 'SPA', label: 'Spa' },
];

const WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface CreateSalonFormData {
  businessName: string;
  type: SalonType;
  phoneNumber: string;
  email: string;
  address: string;
  city: string;
  region: string;
  openingTime: string;
  closingTime: string;
  workingDays: string[];
  description: string;
  ownerEmail: string;
  latitude: string;
  longitude: string;
}

const initialFormData: CreateSalonFormData = {
  businessName: '',
  type: 'BARBERSHOP',
  phoneNumber: '+233 ',
  email: '',
  address: '',
  city: '',
  region: 'Greater Accra',
  openingTime: '09:00',
  closingTime: '18:00',
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  description: '',
  ownerEmail: '',
  latitude: '',
  longitude: '',
};

export function Salons() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SalonStatus>('all');
  const [page, setPage] = useState(1);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [selectedSalonId, setSelectedSalonId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [formData, setFormData] = useState<CreateSalonFormData>(initialFormData);

  // KYC states
  const [activeTab, setActiveTab] = useState<'salons' | 'kyc'>('salons');
  const [kycStatusFilter, setKycStatusFilter] = useState<'all' | KycStatus>('all');
  const [kycPage, setKycPage] = useState(1);
  const [showKycDetailModal, setShowKycDetailModal] = useState(false);
  const [showKycRejectModal, setShowKycRejectModal] = useState(false);
  const [selectedKycId, setSelectedKycId] = useState<string | null>(null);
  const [kycRejectReason, setKycRejectReason] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const { data: salonsData, isLoading } = useSalons(page, 20, statusFilter === 'all' ? undefined : statusFilter);
  const { data: pendingData } = usePendingSalons(1, 10);
  const approveSalon = useApproveSalon();
  const rejectSalon = useRejectSalon();
  const suspendSalon = useSuspendSalon();
  const reactivateSalon = useReactivateSalon();
  const createSalon = useCreateSalon();
  const { data: salonDetails, isLoading: detailsLoading } = useSalonDetails(selectedSalonId || '');

  // KYC hooks
  const { data: kycData, isLoading: kycLoading } = useKycSubmissions(
    kycStatusFilter === 'all' ? undefined : kycStatusFilter,
    kycPage,
    20
  );
  const { data: pendingKycCount = 0 } = usePendingKycCount();
  const { data: kycDetails, isLoading: kycDetailsLoading } = useKycSubmissionDetail(selectedKycId || '');
  const approveKyc = useApproveKyc();
  const rejectKyc = useRejectKyc();

  const salons = salonsData?.data || [];
  const pendingCount = pendingData?.pagination?.total || 0;
  const totalCount = salonsData?.pagination?.total || 0;

  const filteredSalons = salons.filter((salon) => {
    const searchLower = searchTerm.toLowerCase();
    const firstName = salon.owner.firstName;
    const lastName = salon.owner.lastName;
    const matchesSearch = 
      salon.businessName.toLowerCase().includes(searchLower) ||
      (firstName ? firstName.toLowerCase().includes(searchLower) : false) ||
      (lastName ? lastName.toLowerCase().includes(searchLower) : false);
    return matchesSearch;
  });

  const handleApprove = async (id: string) => {
    await approveSalon.mutateAsync(id);
  };

  const handleReject = async (id: string) => {
    await rejectSalon.mutateAsync({ id, reason: 'Rejected by admin' });
  };

  const handleSuspend = async () => {
    if (!selectedSalonId || !suspendReason.trim()) return;
    await suspendSalon.mutateAsync({ id: selectedSalonId, reason: suspendReason });
    setShowSuspendModal(false);
    setSelectedSalonId(null);
    setSuspendReason('');
  };

  const handleReactivate = async (id: string) => {
    await reactivateSalon.mutateAsync(id);
  };

  const handleCreateSalon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSalon.mutateAsync({
        businessName: formData.businessName,
        type: formData.type,
        phoneNumber: formData.phoneNumber,
        email: formData.email || undefined,
        address: formData.address,
        city: formData.city,
        region: formData.region,
        openingTime: formData.openingTime,
        closingTime: formData.closingTime,
        workingDays: formData.workingDays,
        description: formData.description || undefined,
        ownerEmail: formData.ownerEmail || undefined,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      });
      setShowAddModal(false);
      setFormData(initialFormData);
    } catch (error) {
      console.error('Failed to create salon:', error);
    }
  };

  const handleWorkingDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day]
    }));
  };

  const openDetailModal = (id: string) => {
    setSelectedSalonId(id);
    setShowDetailModal(true);
  };

  const openSuspendModal = (id: string) => {
    setSelectedSalonId(id);
    setShowSuspendModal(true);
  };

  // KYC handlers
  const openKycDetailModal = (id: string) => {
    setSelectedKycId(id);
    setShowKycDetailModal(true);
  };

  const handleApproveKyc = async (id: string) => {
    await approveKyc.mutateAsync(id);
  };

  const handleRejectKyc = async () => {
    if (!selectedKycId || !kycRejectReason.trim()) return;
    await rejectKyc.mutateAsync({ id: selectedKycId, reason: kycRejectReason });
    setShowKycRejectModal(false);
    setSelectedKycId(null);
    setKycRejectReason('');
  };

  const openKycRejectModal = (id: string) => {
    setSelectedKycId(id);
    setKycRejectReason('');
    setShowKycRejectModal(true);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; dot: string }> = {
      APPROVED: { bg: 'bg-[#006B3F]/10', text: 'text-[#006B3F]', dot: 'bg-[#006B3F]' },
      PENDING: { bg: 'bg-[#FCD116]/20', text: 'text-[#B8960F]', dot: 'bg-[#FCD116]' },
      REJECTED: { bg: 'bg-[#CE1126]/10', text: 'text-[#CE1126]', dot: 'bg-[#CE1126]' },
      SUSPENDED: { bg: 'bg-gray-200', text: 'text-gray-600', dot: 'bg-gray-500' },
    };
    const style = styles[status] || styles.PENDING;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
        {status.toLowerCase()}
      </span>
    );
  };

  const getKycStatusBadge = (status: KycStatus) => {
    const styles: Record<KycStatus, { bg: string; text: string; icon: React.ReactNode }> = {
      APPROVED: { bg: 'bg-[#006B3F]/10', text: 'text-[#006B3F]', icon: <CheckCircle size={14} /> },
      PENDING: { bg: 'bg-[#FCD116]/20', text: 'text-[#B8960F]', icon: <Clock size={14} /> },
      REJECTED: { bg: 'bg-[#CE1126]/10', text: 'text-[#CE1126]', icon: <XCircle size={14} /> },
    };
    const style = styles[status];
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
        {style.icon}
        {status.toLowerCase()}
      </span>
    );
  };

  const getBusinessTypeBadge = (type: BusinessType) => {
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
        type === 'REGISTERED_COMPANY' 
          ? 'bg-blue-100 text-blue-700' 
          : 'bg-purple-100 text-purple-700'
      }`}>
        {type === 'REGISTERED_COMPANY' ? <Building2 size={14} /> : <User size={14} />}
        {type === 'REGISTERED_COMPANY' ? 'Company' : 'Individual'}
      </span>
    );
  };

  if (isLoading && activeTab === 'salons') {
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

  const kycSubmissions = kycData?.data || [];
  const kycTotalCount = kycData?.pagination?.total || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Salon Management</h1>
          <p className="text-sm text-gray-500 mt-1">Review and manage salon registrations</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {activeTab === 'salons' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#006B3F] text-white rounded-xl hover:bg-[#005a35] transition-colors font-medium shadow-sm"
            >
              <Plus size={18} />
              Add Salon
            </button>
          )}
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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('salons')}
          className={`px-6 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'salons'
              ? 'text-[#006B3F]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Store size={18} />
            Salons
          </span>
          {activeTab === 'salons' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#006B3F]"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('kyc')}
          className={`px-6 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'kyc'
              ? 'text-[#006B3F]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Shield size={18} />
            KYC Verification
            {pendingKycCount > 0 && (
              <span className="bg-[#CE1126] text-white text-xs px-2 py-0.5 rounded-full">
                {pendingKycCount}
              </span>
            )}
          </span>
          {activeTab === 'kyc' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#006B3F]"></span>
          )}
        </button>
      </div>

      {activeTab === 'salons' ? (
        <>
          {/* Salon Filters */}
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
            <div className="flex gap-2 flex-wrap">
              {(['all', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                    statusFilter === status
                      ? status === 'PENDING' ? 'bg-[#FCD116] text-[#1a1a2e]' :
                        status === 'APPROVED' ? 'bg-[#006B3F] text-white' :
                        status === 'REJECTED' ? 'bg-[#CE1126] text-white' :
                        status === 'SUSPENDED' ? 'bg-gray-500 text-white' :
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
                <span className="font-medium text-gray-800">{salon.owner.firstName || 'Unknown'} {salon.owner.lastName || ''}</span>
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
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 flex-wrap">
              <button 
                onClick={() => openDetailModal(salon.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors font-medium"
              >
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
              {salon.status === 'APPROVED' && (
                <button 
                  onClick={() => openSuspendModal(salon.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors font-medium"
                >
                  <Ban size={18} />
                  Suspend
                </button>
              )}
              {salon.status === 'SUSPENDED' && (
                <button 
                  onClick={() => handleReactivate(salon.id)}
                  disabled={reactivateSalon.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#006B3F] text-white rounded-xl hover:bg-[#005a35] disabled:opacity-50 transition-colors font-medium"
                >
                  <RotateCcw size={18} />
                  Reactivate
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
                      <p className="text-sm font-medium text-gray-800">{salon.owner.firstName || 'Unknown'} {salon.owner.lastName || ''}</p>
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
                      <button 
                        onClick={() => openDetailModal(salon.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
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
                      {salon.status === 'APPROVED' && (
                        <button 
                          onClick={() => openSuspendModal(salon.id)}
                          className="p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                          title="Suspend salon"
                        >
                          <Ban size={18} />
                        </button>
                      )}
                      {salon.status === 'SUSPENDED' && (
                        <button 
                          onClick={() => handleReactivate(salon.id)}
                          disabled={reactivateSalon.isPending}
                          className="p-2 bg-[#006B3F] text-white rounded-lg hover:bg-[#005a35] disabled:opacity-50 transition-colors"
                          title="Reactivate salon"
                        >
                          <RotateCcw size={18} />
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

      {/* Add Salon Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Add New Salon</h2>
              <button 
                onClick={() => { setShowAddModal(false); setFormData(initialFormData); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateSalon} className="p-6 space-y-6">
              {/* Business Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Business Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#006B3F] focus:ring-1 focus:ring-[#006B3F]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as SalonType })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#006B3F] focus:ring-1 focus:ring-[#006B3F]"
                    >
                      {SALON_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#006B3F] focus:ring-1 focus:ring-[#006B3F]"
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      placeholder="+233 XX XXX XXXX"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#006B3F] focus:ring-1 focus:ring-[#006B3F]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#006B3F] focus:ring-1 focus:ring-[#006B3F]"
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Location</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#006B3F] focus:ring-1 focus:ring-[#006B3F]"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#006B3F] focus:ring-1 focus:ring-[#006B3F]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Region *</label>
                    <select
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#006B3F] focus:ring-1 focus:ring-[#006B3F]"
                    >
                      {GHANA_REGIONS.map(region => (
                        <option key={region} value={region}>{region}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                    <input
                      type="text"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="e.g. 5.6037"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#006B3F] focus:ring-1 focus:ring-[#006B3F]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                    <input
                      type="text"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="e.g. -0.1870"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#006B3F] focus:ring-1 focus:ring-[#006B3F]"
                    />
                  </div>
                </div>
              </div>

              {/* Operating Hours */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Operating Hours</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Opening Time *</label>
                    <input
                      type="time"
                      required
                      value={formData.openingTime}
                      onChange={(e) => setFormData({ ...formData, openingTime: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#006B3F] focus:ring-1 focus:ring-[#006B3F]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Closing Time *</label>
                    <input
                      type="time"
                      required
                      value={formData.closingTime}
                      onChange={(e) => setFormData({ ...formData, closingTime: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#006B3F] focus:ring-1 focus:ring-[#006B3F]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Working Days *</label>
                  <div className="flex flex-wrap gap-2">
                    {WORKING_DAYS.map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleWorkingDayToggle(day)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          formData.workingDays.includes(day)
                            ? 'bg-[#006B3F] text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Owner */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Owner (Optional)</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Owner Email (to link existing user)</label>
                  <input
                    type="email"
                    value={formData.ownerEmail}
                    onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#006B3F] focus:ring-1 focus:ring-[#006B3F]"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setFormData(initialFormData); }}
                  className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSalon.isPending}
                  className="px-6 py-2 bg-[#006B3F] text-white rounded-lg hover:bg-[#005a35] disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {createSalon.isPending && <Loader2 className="animate-spin" size={18} />}
                  Create Salon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Salon Detail Modal */}
      {showDetailModal && selectedSalonId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Salon Details</h2>
              <button 
                onClick={() => { setShowDetailModal(false); setSelectedSalonId(null); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {detailsLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-[#006B3F]" size={32} />
              </div>
            ) : salonDetails ? (
              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 bg-gradient-to-br from-[#006B3F]/10 to-[#FCD116]/10 rounded-xl flex items-center justify-center">
                        <Store size={32} className="text-[#006B3F]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">{salonDetails.businessName}</h3>
                        <p className="text-sm text-gray-500">{salonDetails.type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(salonDetails.status)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-gray-500 mb-1">
                        <Calendar size={16} />
                        <span className="text-xs">Created</span>
                      </div>
                      <p className="font-semibold text-gray-800">{formatDate(salonDetails.createdAt)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-gray-500 mb-1">
                        <Star size={16} />
                        <span className="text-xs">Rating</span>
                      </div>
                      <p className="font-semibold text-gray-800">
                        {salonDetails.reviewsSummary?.averageRating?.toFixed(1) || '—'} 
                        <span className="text-gray-400 text-sm"> ({salonDetails.reviewsSummary?.totalReviews || 0})</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact & Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Contact</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone size={16} className="text-gray-400" />
                        <span>{formatPhoneNumber(salonDetails.phoneNumber)}</span>
                      </div>
                      {salonDetails.email && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail size={16} className="text-gray-400" />
                          <span>{salonDetails.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Location</h4>
                    <div className="flex items-start gap-2 text-gray-600">
                      <MapPin size={16} className="text-gray-400 mt-0.5" />
                      <div>
                        <p>{salonDetails.address}</p>
                        <p>{salonDetails.city}, {salonDetails.region}</p>
                      </div>
                    </div>
                    {salonDetails.latitude && salonDetails.longitude && (
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <Navigation size={14} />
                        <span>{salonDetails.latitude.toFixed(4)}, {salonDetails.longitude.toFixed(4)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Operating Hours */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Operating Hours</h4>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-gray-400" />
                      <span className="text-gray-600">{salonDetails.openingTime} - {salonDetails.closingTime}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {salonDetails.workingDays.map(day => (
                        <span key={day} className="px-2 py-0.5 bg-[#006B3F]/10 text-[#006B3F] text-xs rounded-full">
                          {day.slice(0, 3)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Owner Info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Owner</h4>
                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#006B3F] to-[#006B3F]/70 rounded-full flex items-center justify-center text-white font-semibold">
                      {salonDetails.owner.firstName && salonDetails.owner.firstName.length > 0 ? salonDetails.owner.firstName[0].toUpperCase() : 'U'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{salonDetails.owner.firstName || 'Unknown'} {salonDetails.owner.lastName || ''}</p>
                      <p className="text-sm text-gray-500">{formatPhoneNumber(salonDetails.owner.phoneNumber)}</p>
                      {salonDetails.owner.email && (
                        <p className="text-sm text-gray-500">{salonDetails.owner.email}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#006B3F]/5 rounded-xl p-4 text-center">
                    <Users size={20} className="mx-auto text-[#006B3F] mb-2" />
                    <p className="text-2xl font-bold text-gray-800">{salonDetails.workers?.length || 0}</p>
                    <p className="text-xs text-gray-500">Workers</p>
                  </div>
                  <div className="bg-[#FCD116]/10 rounded-xl p-4 text-center">
                    <Scissors size={20} className="mx-auto text-[#B8960F] mb-2" />
                    <p className="text-2xl font-bold text-gray-800">{salonDetails.services?.length || 0}</p>
                    <p className="text-xs text-gray-500">Services</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <Calendar size={20} className="mx-auto text-blue-500 mb-2" />
                    <p className="text-2xl font-bold text-gray-800">{salonDetails._count?.bookings || 0}</p>
                    <p className="text-xs text-gray-500">Bookings</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <CreditCard size={20} className="mx-auto text-green-500 mb-2" />
                    <p className="text-2xl font-bold text-gray-800">{formatCurrency(salonDetails.totalRevenue || 0)}</p>
                    <p className="text-xs text-gray-500">Revenue</p>
                  </div>
                </div>

                {/* Services */}
                {salonDetails.services && salonDetails.services.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Services</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {salonDetails.services.slice(0, 6).map(service => (
                        <div key={service.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                          <div>
                            <p className="font-medium text-gray-800">{service.name}</p>
                            <p className="text-xs text-gray-500">{service.duration} min</p>
                          </div>
                          <p className="font-semibold text-[#006B3F]">{formatCurrency(service.price)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Bookings */}
                {salonDetails.recentBookings && salonDetails.recentBookings.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Recent Bookings</h4>
                    <div className="space-y-2">
                      {salonDetails.recentBookings.slice(0, 5).map(booking => (
                        <div key={booking.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                          <div>
                            <p className="font-medium text-gray-800">{booking.customer.firstName || 'Unknown'} {booking.customer.lastName || ''}</p>
                            <p className="text-xs text-gray-500">{booking.scheduledDate} at {booking.scheduledTime}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-800">{formatCurrency(booking.totalAmount)}</p>
                            <p className={`text-xs ${
                              booking.status === 'BOOKING_COMPLETED' ? 'text-green-600' :
                              booking.status === 'CONFIRMED' ? 'text-blue-600' :
                              booking.status === 'CANCELLED' ? 'text-red-600' :
                              'text-gray-500'
                            }`}>{booking.status.toLowerCase().replace('_', ' ')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">Unable to load salon details</div>
            )}
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Suspend Salon</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">Please provide a reason for suspending this salon:</p>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
                placeholder="Enter suspension reason..."
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#CE1126] focus:ring-1 focus:ring-[#CE1126]"
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => { setShowSuspendModal(false); setSuspendReason(''); }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSuspend}
                  disabled={!suspendReason.trim() || suspendSalon.isPending}
                  className="px-4 py-2 bg-[#CE1126] text-white rounded-lg hover:bg-[#a50e1f] disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {suspendSalon.isPending && <Loader2 className="animate-spin" size={16} />}
                  Suspend
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      ) : (
        <>
          {/* KYC Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search KYC submissions..."
                className="w-full pl-11 pr-4 py-3 text-sm bg-white border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-0 transition-colors"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setKycStatusFilter(status)}
                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                    kycStatusFilter === status
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

          {/* KYC Loading State */}
          {kycLoading && (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-[#006B3F]" size={32} />
            </div>
          )}

          {/* KYC Mobile Card View */}
          {!kycLoading && (
            <div className="md:hidden space-y-4">
              {kycSubmissions.map((kyc: KycSubmission) => (
                <div key={kyc.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#006B3F]/10 to-[#FCD116]/10 rounded-xl flex items-center justify-center">
                        <Shield size={24} className="text-[#006B3F]" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{kyc.salon.businessName}</p>
                        <p className="text-xs text-gray-500">{formatDate(kyc.submittedAt)}</p>
                      </div>
                    </div>
                    {getKycStatusBadge(kyc.status)}
                  </div>
                  <div className="space-y-2 text-sm bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="font-medium w-20 text-gray-500">Owner:</span>
                      <span className="font-medium text-gray-800">{kyc.owner?.firstName || 'Unknown'} {kyc.owner?.lastName || ''}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="font-medium w-20 text-gray-500">Business:</span>
                      {getBusinessTypeBadge(kyc.businessType)}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone size={14} className="text-gray-400" />
                      <span>{formatPhoneNumber(kyc.owner?.phoneNumber)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 flex-wrap">
                    <button 
                      onClick={() => openKycDetailModal(kyc.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors font-medium"
                    >
                      <Eye size={18} />
                      Review
                    </button>
                    {kyc.status === 'PENDING' && (
                      <>
                        <button 
                          onClick={() => handleApproveKyc(kyc.id)}
                          disabled={approveKyc.isPending}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#006B3F] text-white rounded-xl hover:bg-[#005a35] disabled:opacity-50 transition-colors font-medium"
                        >
                          <CheckCircle size={18} />
                          Approve
                        </button>
                        <button 
                          onClick={() => openKycRejectModal(kyc.id)}
                          disabled={rejectKyc.isPending}
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
          )}

          {/* KYC Desktop Table View */}
          {!kycLoading && (
            <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Salon</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Owner</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Business Type</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Submitted</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {kycSubmissions.map((kyc: KycSubmission) => (
                      <tr key={kyc.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#006B3F]/10 to-[#FCD116]/10 rounded-lg flex items-center justify-center">
                              <Shield size={18} className="text-[#006B3F]" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{kyc.salon.businessName}</p>
                              <p className="text-sm text-gray-500">ID: {kyc.id.slice(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{kyc.owner?.firstName || 'Unknown'} {kyc.owner?.lastName || ''}</p>
                            <p className="text-sm text-gray-500">{kyc.ownerLegalName}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getBusinessTypeBadge(kyc.businessType)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">{formatDate(kyc.submittedAt)}</span>
                        </td>
                        <td className="px-6 py-4">
                          {getKycStatusBadge(kyc.status)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => openKycDetailModal(kyc.id)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Review KYC"
                            >
                              <Eye size={18} />
                            </button>
                            {kyc.status === 'PENDING' && (
                              <>
                                <button 
                                  onClick={() => handleApproveKyc(kyc.id)}
                                  disabled={approveKyc.isPending}
                                  className="p-2 bg-[#006B3F] text-white rounded-lg hover:bg-[#005a35] disabled:opacity-50 transition-colors"
                                  title="Approve KYC"
                                >
                                  <CheckCircle size={18} />
                                </button>
                                <button 
                                  onClick={() => openKycRejectModal(kyc.id)}
                                  disabled={rejectKyc.isPending}
                                  className="p-2 bg-[#CE1126] text-white rounded-lg hover:bg-[#a50e1f] disabled:opacity-50 transition-colors"
                                  title="Reject KYC"
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
          )}

          {/* KYC Empty State */}
          {!kycLoading && kycSubmissions.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield size={32} className="text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">No KYC submissions found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your filter</p>
            </div>
          )}
        </>
      )}

      {/* KYC Detail Modal */}
      {showKycDetailModal && selectedKycId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-800">KYC Review</h2>
                {kycDetails && getKycStatusBadge(kycDetails.status)}
              </div>
              <button 
                onClick={() => { setShowKycDetailModal(false); setSelectedKycId(null); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {kycDetailsLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-[#006B3F]" size={32} />
              </div>
            ) : kycDetails ? (
              <div className="p-6 space-y-6">
                {/* Header Info */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-[#006B3F] to-[#006B3F]/70 rounded-xl flex items-center justify-center text-white">
                      <Store size={28} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{kycDetails.salon.businessName}</h3>
                      <p className="text-sm text-gray-500">Salon ID: {kycDetails.salonId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getBusinessTypeBadge(kycDetails.businessType)}
                  </div>
                </div>

                {/* Personal Details */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                    <User size={16} />
                    Personal Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">Owner Legal Name</p>
                      <p className="font-medium text-gray-800">{kycDetails.ownerLegalName}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">Owner Account</p>
                      <p className="font-medium text-gray-800">{kycDetails.owner?.firstName || 'Unknown'} {kycDetails.owner?.lastName || ''}</p>
                      <p className="text-sm text-gray-500">{kycDetails.owner?.email}</p>
                    </div>
                    {kycDetails.businessType === 'REGISTERED_COMPANY' && (
                      <>
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-xs text-gray-500 mb-1">Business Registered Name</p>
                          <p className="font-medium text-gray-800">{kycDetails.businessRegisteredName || '—'}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-xs text-gray-500 mb-1">TIN Number</p>
                          <p className="font-medium text-gray-800">{kycDetails.tinNumber || '—'}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-xs text-gray-500 mb-1">Registration Number</p>
                          <p className="font-medium text-gray-800">{kycDetails.registrationNumber || '—'}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Documents */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                    <FileText size={16} />
                    Documents
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Government ID */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-700">Government ID</p>
                      </div>
                      <div className="p-4">
                        {kycDetails.governmentIdUrl.match(/\.(pdf)$/i) ? (
                          <a 
                            href={kycDetails.governmentIdUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-blue-600 hover:underline"
                          >
                            <ExternalLink size={16} />
                            View PDF Document
                          </a>
                        ) : (
                          <img 
                            src={kycDetails.governmentIdUrl} 
                            alt="Government ID"
                            className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setSelectedImage(kycDetails.governmentIdUrl)}
                          />
                        )}
                      </div>
                    </div>

                    {/* Selfie with ID */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-700">Selfie with ID</p>
                      </div>
                      <div className="p-4">
                        <img 
                          src={kycDetails.selfieWithIdUrl} 
                          alt="Selfie with ID"
                          className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setSelectedImage(kycDetails.selfieWithIdUrl)}
                        />
                      </div>
                    </div>

                    {/* Business Certificate (Company only) */}
                    {kycDetails.businessType === 'REGISTERED_COMPANY' && kycDetails.businessCertUrl && (
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                          <p className="text-sm font-medium text-gray-700">Business Certificate</p>
                        </div>
                        <div className="p-4">
                          {kycDetails.businessCertUrl.match(/\.(pdf)$/i) ? (
                            <a 
                              href={kycDetails.businessCertUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-600 hover:underline"
                            >
                              <ExternalLink size={16} />
                              View PDF Document
                            </a>
                          ) : (
                            <img 
                              src={kycDetails.businessCertUrl} 
                              alt="Business Certificate"
                              className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setSelectedImage(kycDetails.businessCertUrl)}
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Proof of Address (Individual only) */}
                    {kycDetails.businessType === 'INDIVIDUAL' && kycDetails.proofOfAddressUrl && (
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                          <p className="text-sm font-medium text-gray-700">Proof of Address</p>
                        </div>
                        <div className="p-4">
                          {kycDetails.proofOfAddressUrl.match(/\.(pdf)$/i) ? (
                            <a 
                              href={kycDetails.proofOfAddressUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-600 hover:underline"
                            >
                              <ExternalLink size={16} />
                              View PDF Document
                            </a>
                          ) : (
                            <img 
                              src={kycDetails.proofOfAddressUrl} 
                              alt="Proof of Address"
                              className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setSelectedImage(kycDetails.proofOfAddressUrl)}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Video Verification */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                    <Video size={16} />
                    Video Verification
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Storefront Video */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-700">Storefront Video</p>
                      </div>
                      <div className="p-4">
                        <video 
                          src={kycDetails.storefrontVideoUrl}
                          controls
                          className="w-full rounded-lg"
                          style={{ maxHeight: '200px' }}
                        />
                      </div>
                    </div>

                    {/* Interior Video */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-700">Interior Video</p>
                      </div>
                      <div className="p-4">
                        <video 
                          src={kycDetails.interiorVideoUrl}
                          controls
                          className="w-full rounded-lg"
                          style={{ maxHeight: '200px' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Info */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Submission Status</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Submitted At</p>
                      <p className="font-medium text-gray-800">{formatDate(kycDetails.submittedAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Reviewed At</p>
                      <p className="font-medium text-gray-800">{kycDetails.reviewedAt ? formatDate(kycDetails.reviewedAt) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Current Status</p>
                      <p className="font-medium text-gray-800">{getKycStatusBadge(kycDetails.status)}</p>
                    </div>
                  </div>
                  {kycDetails.rejectionReason && (
                    <div className="mt-4 p-3 bg-[#CE1126]/10 rounded-lg">
                      <p className="text-xs text-[#CE1126] font-medium mb-1">Previous Rejection Reason:</p>
                      <p className="text-sm text-gray-700">{kycDetails.rejectionReason}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {kycDetails.status === 'PENDING' && (
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleApproveKyc(kycDetails.id)}
                      disabled={approveKyc.isPending}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#006B3F] text-white rounded-xl hover:bg-[#005a35] disabled:opacity-50 transition-colors font-medium"
                    >
                      {approveKyc.isPending && <Loader2 className="animate-spin" size={18} />}
                      <CheckCircle size={18} />
                      Approve KYC
                    </button>
                    <button
                      onClick={() => openKycRejectModal(kycDetails.id)}
                      disabled={rejectKyc.isPending}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#CE1126] text-white rounded-xl hover:bg-[#a50e1f] disabled:opacity-50 transition-colors font-medium"
                    >
                      <XCircle size={18} />
                      Reject KYC
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">Unable to load KYC details</div>
            )}
          </div>
        </div>
      )}

      {/* KYC Reject Modal */}
      {showKycRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Reject KYC Submission</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">Please provide a reason for rejecting this KYC submission:</p>
              <textarea
                value={kycRejectReason}
                onChange={(e) => setKycRejectReason(e.target.value)}
                rows={4}
                placeholder="Enter rejection reason..."
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#CE1126] focus:ring-1 focus:ring-[#CE1126]"
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => { setShowKycRejectModal(false); setKycRejectReason(''); }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectKyc}
                  disabled={!kycRejectReason.trim() || rejectKyc.isPending}
                  className="px-4 py-2 bg-[#CE1126] text-white rounded-lg hover:bg-[#a50e1f] disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {rejectKyc.isPending && <Loader2 className="animate-spin" size={16} />}
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-gray-300 transition-colors"
            >
              <X size={24} />
            </button>
            <img 
              src={selectedImage} 
              alt="Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
