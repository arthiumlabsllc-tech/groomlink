import { useState, useEffect } from 'react';
import {
  Star,
  Plus,
  Search,
  X,
  Loader2,
  AlertCircle,
  Store,
  Clock,
  Calendar,
  CreditCard,
  Trash2,
  Package,
  Check,
  ChevronDown,
} from 'lucide-react';
import {
  useSponsoredSalons,
  useSponsorshipPackages,
  useSalonSearch,
  useCreateSponsoredSalon,
  useRemoveSponsoredSalon,
} from '../hooks/useSponsoredSalons';
import {
  formatDuration,
  formatSponsorType,
  getSponsorTypeColor,
  calculateCustomPrice,
  convertToHours,
  type SponsorType,
  type DurationUnit,
  type SponsorshipPackage,
  type SalonSearchResult,
} from '../api/sponsoredSalons';
import { formatCurrency, formatDate } from '../lib/utils';

const SPONSOR_TYPES: { value: SponsorType; label: string }[] = [
  { value: 'paid', label: 'Paid' },
  { value: 'featured', label: 'Featured' },
  { value: 'promoted', label: 'Promoted' },
];

const DURATION_UNITS: { value: DurationUnit; label: string }[] = [
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' },
];

export function SponsoredSalons() {
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedSponsorshipId, setSelectedSponsorshipId] = useState<string | null>(null);

  const { data: sponsorshipsData, isLoading } = useSponsoredSalons(page, 20);
  const removeSponsorship = useRemoveSponsoredSalon();

  const sponsorships = sponsorshipsData?.data || [];
  const totalPages = sponsorshipsData?.pagination?.totalPages || 1;

  const handleRemove = async () => {
    if (!selectedSponsorshipId) return;
    await removeSponsorship.mutateAsync(selectedSponsorshipId);
    setShowRemoveModal(false);
    setSelectedSponsorshipId(null);
  };

  const openRemoveModal = (id: string) => {
    setSelectedSponsorshipId(id);
    setShowRemoveModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sponsored Salons</h1>
          <p className="text-gray-500 mt-1">Manage sponsored salon listings and promotions</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center px-4 py-2 bg-[#006B3F] text-white rounded-lg hover:bg-[#005a35] transition-colors font-medium"
        >
          <Plus size={20} className="mr-2" />
          Add Sponsored Salon
        </button>
      </div>

      {/* Active Sponsorships List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Active Sponsorships</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#006B3F]" />
          </div>
        ) : sponsorships.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Star className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No Active Sponsorships</h3>
            <p className="text-gray-500 max-w-sm">
              There are no active sponsored salons. Click the button above to add one.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Salon
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sponsorships.map((sponsorship) => (
                    <tr key={sponsorship.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                            {sponsorship.salon.logoUrl ? (
                              <img
                                src={sponsorship.salon.logoUrl}
                                alt={sponsorship.salon.businessName}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <Store className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {sponsorship.salon.businessName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {sponsorship.salon.city}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSponsorTypeColor(
                            sponsorship.sponsorType
                          )}`}
                        >
                          {formatSponsorType(sponsorship.sponsorType)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-gray-900">
                          <Clock className="w-4 h-4 mr-1.5 text-gray-400" />
                          {formatDuration(sponsorship.durationHours)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1.5 text-gray-400" />
                            {formatDate(sponsorship.startTime).split(',')[0]}
                          </div>
                          <div className="text-gray-500 text-xs mt-0.5">
                            to {formatDate(sponsorship.endTime).split(',')[0]}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-gray-900">
                          <CreditCard className="w-4 h-4 mr-1.5 text-gray-400" />
                          {sponsorship.amountPaid
                            ? formatCurrency(sponsorship.amountPaid)
                            : 'Free'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            sponsorship.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {sponsorship.isActive ? 'Active' : 'Expired'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openRemoveModal(sponsorship.id)}
                          className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove sponsorship"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {sponsorships.map((sponsorship) => (
                <div key={sponsorship.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                        {sponsorship.salon.logoUrl ? (
                          <img
                            src={sponsorship.salon.logoUrl}
                            alt={sponsorship.salon.businessName}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <Store className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {sponsorship.salon.businessName}
                        </div>
                        <div className="text-xs text-gray-500">{sponsorship.salon.city}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => openRemoveModal(sponsorship.id)}
                      className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getSponsorTypeColor(
                        sponsorship.sponsorType
                      )}`}
                    >
                      {formatSponsorType(sponsorship.sponsorType)}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        sponsorship.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {sponsorship.isActive ? 'Active' : 'Expired'}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Clock className="w-4 h-4 mr-1.5 text-gray-400" />
                      {formatDuration(sponsorship.durationHours)}
                    </div>
                    <div className="flex items-center text-gray-600">
                      <CreditCard className="w-4 h-4 mr-1.5 text-gray-400" />
                      {sponsorship.amountPaid
                        ? formatCurrency(sponsorship.amountPaid)
                        : 'Free'}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {formatDate(sponsorship.startTime).split(',')[0]} -{' '}
                    {formatDate(sponsorship.endTime).split(',')[0]}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Sponsored Salon Modal */}
      {showAddModal && (
        <AddSponsoredSalonModal onClose={() => setShowAddModal(false)} />
      )}

      {/* Remove Confirmation Modal */}
      {showRemoveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Remove Sponsorship
            </h3>
            <p className="text-gray-500 text-center mb-6">
              Are you sure you want to remove this sponsorship? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRemoveModal(false);
                  setSelectedSponsorshipId(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleRemove}
                disabled={removeSponsorship.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
              >
                {removeSponsorship.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  'Remove'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add Sponsored Salon Modal Component
interface AddSponsoredSalonModalProps {
  onClose: () => void;
}

function AddSponsoredSalonModal({ onClose }: AddSponsoredSalonModalProps) {
  const [step, setStep] = useState<'salon' | 'package'>('salon');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSalon, setSelectedSalon] = useState<SalonSearchResult | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<SponsorshipPackage | null>(null);
  const [sponsorType, setSponsorType] = useState<SponsorType>('paid');
  const [useCustomDuration, setUseCustomDuration] = useState(false);
  const [customDurationValue, setCustomDurationValue] = useState(7);
  const [customDurationUnit, setCustomDurationUnit] = useState<DurationUnit>('days');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const { data: packages = [] } = useSponsorshipPackages();
  const { data: searchResults = [], isLoading: searchLoading } = useSalonSearch(searchQuery);
  const createSponsorship = useCreateSponsoredSalon();

  // Filter active packages
  const activePackages = packages.filter((p) => p.isActive);

  // Calculate custom price
  const customPrice = calculateCustomPrice(customDurationValue, customDurationUnit);
  const customHours = convertToHours(customDurationValue, customDurationUnit);

  // Handle salon search input
  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    setShowSearchResults(value.length >= 2);
    if (selectedSalon) {
      setSelectedSalon(null);
    }
  };

  // Handle salon selection
  const handleSelectSalon = (salon: SalonSearchResult) => {
    setSelectedSalon(salon);
    setSearchQuery(salon.businessName);
    setShowSearchResults(false);
  };

  // Handle package selection
  const handleSelectPackage = (pkg: SponsorshipPackage) => {
    setSelectedPackage(pkg);
    setUseCustomDuration(false);
  };

  // Handle custom duration selection
  const handleSelectCustomDuration = () => {
    setSelectedPackage(null);
    setUseCustomDuration(true);
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedSalon) return;

    const durationHours = selectedPackage
      ? convertToHours(selectedPackage.durationValue, selectedPackage.durationType)
      : customHours;

    const amountPaid = selectedPackage
      ? selectedPackage.priceGhs
      : customPrice;

    await createSponsorship.mutateAsync({
      salonId: selectedSalon.id,
      sponsorType,
      durationHours,
      amountPaid,
      usePackage: !!selectedPackage,
      packageId: selectedPackage?.id,
    });

    onClose();
  };

  // Check if form is valid
  const isValid = selectedSalon && (selectedPackage || useCustomDuration);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Add Sponsored Salon</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step Indicator */}
          <div className="flex items-center mb-6">
            <div
              className={`flex items-center ${step === 'salon' ? 'text-[#006B3F]' : 'text-gray-500'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === 'salon'
                    ? 'bg-[#006B3F] text-white'
                    : selectedSalon
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {selectedSalon ? <Check size={16} /> : '1'}
              </div>
              <span className="ml-2 text-sm font-medium">Select Salon</span>
            </div>
            <div className="flex-1 h-px bg-gray-200 mx-4" />
            <div
              className={`flex items-center ${step === 'package' ? 'text-[#006B3F]' : 'text-gray-500'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === 'package' ? 'bg-[#006B3F] text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                2
              </div>
              <span className="ml-2 text-sm font-medium">Choose Package</span>
            </div>
          </div>

          {/* Step 1: Salon Selection */}
          {step === 'salon' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Salon
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    placeholder="Search by salon name..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B3F] focus:border-[#006B3F] outline-none"
                  />
                  {searchLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-gray-400" />
                  )}
                </div>

                {/* Search Results Dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute z-10 w-full max-w-lg mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {searchResults.map((salon) => (
                      <button
                        key={salon.id}
                        onClick={() => handleSelectSalon(salon)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center border-b border-gray-100 last:border-0"
                      >
                        <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                          {salon.logoUrl ? (
                            <img
                              src={salon.logoUrl}
                              alt={salon.businessName}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <Store className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {salon.businessName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {salon.address}, {salon.city}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {showSearchResults && searchQuery.length >= 2 && searchResults.length === 0 && !searchLoading && (
                  <div className="mt-2 text-sm text-gray-500">No salons found</div>
                )}
              </div>

              {/* Selected Salon Display */}
              {selectedSalon && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      {selectedSalon.logoUrl ? (
                        <img
                          src={selectedSalon.logoUrl}
                          alt={selectedSalon.businessName}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <Store className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {selectedSalon.businessName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {selectedSalon.address}, {selectedSalon.city}
                      </div>
                    </div>
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              )}

              {/* Sponsor Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sponsor Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {SPONSOR_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setSponsorType(type.value)}
                      className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        sponsorType === type.value
                          ? 'border-[#006B3F] bg-[#006B3F]/5 text-[#006B3F]'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Package Selection */}
          {step === 'package' && (
            <div className="space-y-6">
              {/* Predefined Packages */}
              {activePackages.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <Package className="w-4 h-4 inline mr-1.5" />
                    Sponsorship Packages
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activePackages.map((pkg) => (
                      <button
                        key={pkg.id}
                        onClick={() => handleSelectPackage(pkg)}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          selectedPackage?.id === pkg.id
                            ? 'border-[#006B3F] bg-[#006B3F]/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{pkg.packageName}</div>
                            <div className="text-sm text-gray-500 mt-1">
                              {pkg.durationValue} {pkg.durationType}
                            </div>
                          </div>
                          <div className="text-lg font-semibold text-[#006B3F]">
                            GH₵{pkg.priceGhs}
                          </div>
                        </div>
                        {selectedPackage?.id === pkg.id && (
                          <div className="mt-2 flex items-center text-sm text-[#006B3F]">
                            <Check className="w-4 h-4 mr-1" />
                            Selected
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <Clock className="w-4 h-4 inline mr-1.5" />
                  Or Custom Duration
                </label>
                <button
                  onClick={handleSelectCustomDuration}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    useCustomDuration
                      ? 'border-[#006B3F] bg-[#006B3F]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={1}
                        value={customDurationValue}
                        onChange={(e) => setCustomDurationValue(parseInt(e.target.value) || 1)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-[#006B3F] focus:border-[#006B3F] outline-none"
                      />
                      <div className="relative">
                        <select
                          value={customDurationUnit}
                          onChange={(e) => setCustomDurationUnit(e.target.value as DurationUnit)}
                          onClick={(e) => e.stopPropagation()}
                          className="appearance-none px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006B3F] focus:border-[#006B3F] outline-none bg-white"
                        >
                          {DURATION_UNITS.map((unit) => (
                            <option key={unit.value} value={unit.value}>
                              {unit.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-[#006B3F]">
                      GH₵{customPrice}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Base rate: GH₵2/hour • {formatDuration(customHours)}
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          {step === 'package' ? (
            <button
              onClick={() => setStep('salon')}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              Back
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
          )}

          {step === 'salon' ? (
            <button
              onClick={() => setStep('package')}
              disabled={!selectedSalon}
              className="px-6 py-2 bg-[#006B3F] text-white rounded-lg hover:bg-[#005a35] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!isValid || createSponsorship.isPending}
              className="px-6 py-2 bg-[#006B3F] text-white rounded-lg hover:bg-[#005a35] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createSponsorship.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Confirm & Add'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
