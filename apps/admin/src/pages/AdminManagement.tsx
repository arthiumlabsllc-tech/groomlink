import { useState } from 'react';
import Icon from '../components/Icon';
import { useAdmins, useCreateAdmin, useUpdateAdminPermissions, useDeleteAdmin } from '../hooks';
import { useAuth } from '../hooks';
import { formatDate } from '../lib/utils';

const AVAILABLE_PAGES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'salons', label: 'Salons' },
  { id: 'users', label: 'Users' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'promotions', label: 'Promotions' },
  { id: 'sponsored-salons', label: 'Sponsored Salons' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'support', label: 'Support' },
  { id: 'support-staff', label: 'Support Staff' },
  { id: 'escrow', label: 'Escrow' },
  { id: 'cancellations', label: 'Cancellations' },
  { id: 'no-shows', label: 'No-Shows' },
  { id: 'security', label: 'Security' },
  { id: 'policies', label: 'Policies' },
  { id: 'settings', label: 'Settings' },
  { id: 'admins', label: 'Admin Management' },
];

// Quick permission presets for common admin roles
const PERMISSION_PRESETS = {
  'full-access': {
    label: 'Full Access',
    description: 'All pages except Admin Management',
    pages: AVAILABLE_PAGES.filter(p => p.id !== 'admins').map(p => p.id),
  },
  'operations': {
    label: 'Operations Manager',
    description: 'Salons, Users, Transactions, Support',
    pages: ['dashboard', 'salons', 'users', 'transactions', 'support'],
  },
  'support-only': {
    label: 'Support Staff',
    description: 'Support, Support Staff, Users (view only)',
    pages: ['dashboard', 'support', 'support-staff', 'users'],
  },
  'financial': {
    label: 'Financial Manager',
    description: 'Transactions, Escrow, Subscriptions, Sponsored Salons',
    pages: ['dashboard', 'transactions', 'escrow', 'subscriptions', 'sponsored-salons', 'cancellations'],
  },
  'security': {
    label: 'Security Team',
    description: 'Security, Cancellations, No-Shows, Users',
    pages: ['dashboard', 'security', 'cancellations', 'no-shows', 'users'],
  },
};

export function AdminManagement() {
  const { user: currentUser } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    pages: [] as string[],
  });

  const { data: adminsData, isLoading } = useAdmins(1, 50);
  const createAdmin = useCreateAdmin();
  const updatePermissions = useUpdateAdminPermissions();
  const deleteAdmin = useDeleteAdmin();

  const admins = adminsData?.data || [];

  // Filter admins based on search
  const filteredAdmins = admins.filter(
    (admin) =>
      admin.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const totalAdmins = admins.length;
  const activeAdmins = admins.filter((a) => a.role === 'ADMIN' || a.role === 'SUPER_ADMIN').length;
  const superAdmins = admins.filter((a) => a.role === 'SUPER_ADMIN').length;

  const handleSelectAllPages = (checked: boolean) => {
    setFormData({
      ...formData,
      pages: checked ? AVAILABLE_PAGES.map((p) => p.id) : [],
    });
  };

  const handleTogglePage = (pageId: string) => {
    setFormData({
      ...formData,
      pages: formData.pages.includes(pageId)
        ? formData.pages.filter((p) => p !== pageId)
        : [...formData.pages, pageId],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await createAdmin.mutateAsync({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        pages: formData.pages,
      });

      setFormData({ email: '', firstName: '', lastName: '', pages: [] });
      setShowCreateModal(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create admin');
    }
  };

  const handleEditPermissions = (admin: any) => {
    setSelectedAdmin(admin);
    setFormData({
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      pages: admin.pages || [],
    });
    setShowEditModal(true);
  };

  const handleUpdatePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedAdmin) return;

    try {
      await updatePermissions.mutateAsync({
        id: selectedAdmin.id,
        pages: formData.pages,
      });

      setShowEditModal(false);
      setSelectedAdmin(null);
      setFormData({ email: '', firstName: '', lastName: '', pages: [] });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update permissions');
    }
  };

  const handleDeleteClick = (admin: any) => {
    setSelectedAdmin(admin);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedAdmin) return;

    try {
      await deleteAdmin.mutateAsync(selectedAdmin.id);
      setShowDeleteModal(false);
      setSelectedAdmin(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete admin');
    }
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedAdmin(null);
    setError(null);
    setFormData({ email: '', firstName: '', lastName: '', pages: [] });
  };

  if (isLoading) {
    return (
      <div className="page-enter space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="card-v2 p-5"><div className="skeleton-shimmer h-16 w-full" /></div>)}
        </div>
        <div className="card-v2 p-6">
          <div className="skeleton-shimmer h-8 w-48 mb-4" />
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton-shimmer h-14 w-full mb-3" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Admin Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage admin users and their permissions</p>
        </div>
        {/* Only SUPER_ADMIN can create new admins */}
        {currentUser?.role === 'SUPER_ADMIN' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-ripple flex items-center gap-2 px-4 py-2.5 bg-[#006B3F] text-white rounded-xl hover:bg-[#005a35] transition-colors font-medium shadow-lg shadow-[#006B3F]/25"
          >
            <Icon name="add" size={18} />
            Add Admin
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-v2 p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#006B3F]/10 rounded-xl">
              <Icon name="group" className="text-[#006B3F]" size={24} />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-800">{totalAdmins}</p>
              <p className="text-sm text-gray-500">Total Admins</p>
            </div>
          </div>
        </div>
        <div className="card-v2 p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#FCD116]/20 rounded-xl">
              <Icon name="how_to_reg" className="text-[#B8960F]" size={24} />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-800">{activeAdmins}</p>
              <p className="text-sm text-gray-500">Active Admins</p>
            </div>
          </div>
        </div>
        <div className="card-v2 p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-xl">
              <Icon name="workspace_premium" className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-800">{superAdmins}</p>
              <p className="text-sm text-gray-500">Super Admins</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search admins by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-[#006B3F] focus:ring-2 focus:ring-[#006B3F]/20 transition-all"
        />
      </div>

      {/* Admin List */}
      <div className="card-v2 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Icon name="verified_user" size={18} className="text-[#006B3F]" />
            Admin Users
          </h2>
        </div>

        {filteredAdmins.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="group" className="text-gray-300" size={32} />
            </div>
            <p className="text-gray-500 font-medium">No admins found</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchQuery ? 'Try adjusting your search' : 'Add your first admin user'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredAdmins.map((admin) => (
                <div key={admin.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#006B3F] to-[#006B3F]/70 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                        {admin.firstName[0]}{admin.lastName[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {admin.firstName} {admin.lastName}
                        </p>
                        <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                          <Icon name="mail" size={12} className="text-gray-400" />
                          {admin.email}
                        </p>
                      </div>
                    </div>
                    {admin.role === 'SUPER_ADMIN' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border-l-2 border-l-purple-500">
                        <Icon name="workspace_premium" size={12} />
                        Super
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border-l-2 border-l-blue-500">
                        <Icon name="verified_user" size={12} />
                        Admin
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 text-sm bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Permissions:</span>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {admin.pages?.slice(0, 3).map((page: string) => (
                          <span
                            key={page}
                            className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full capitalize"
                          >
                            {page}
                          </span>
                        ))}
                        {(admin.pages?.length || 0) > 3 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                            +{admin.pages.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200 mt-2">
                      <span className="text-gray-500">Created:</span>
                      <span className="text-gray-700">{formatDate(admin.createdAt)}</span>
                    </div>
                  </div>
                  {admin.role !== 'SUPER_ADMIN' && currentUser?.role === 'SUPER_ADMIN' && (
                    <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleEditPermissions(admin)}
                        className="btn-ripple flex-1 flex items-center justify-center gap-2 py-2.5 text-[#006B3F] border-2 border-[#006B3F] hover:bg-[#006B3F]/10 rounded-xl transition-colors font-medium text-sm"
                      >
                        <Icon name="edit" size={16} />
                        Edit Permissions
                      </button>
                      <button
                        onClick={() => handleDeleteClick(admin)}
                        className="btn-ripple flex items-center justify-center gap-2 py-2.5 px-4 text-[#CE1126] border-2 border-[#CE1126] hover:bg-[#CE1126]/10 rounded-xl transition-colors font-medium text-sm"
                      >
                        <Icon name="delete" size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Permissions
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#006B3F] to-[#006B3F]/70 rounded-full flex items-center justify-center text-white font-semibold">
                          {admin.firstName[0]}
                          {admin.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            {admin.firstName} {admin.lastName}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Icon name="mail" size={14} className="text-gray-400" />
                        {admin.email}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {admin.role === 'SUPER_ADMIN' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border-l-2 border-l-purple-500">
                          <Icon name="workspace_premium" size={12} />
                          Super Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border-l-2 border-l-blue-500">
                          <Icon name="verified_user" size={12} />
                          Admin
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {admin.pages?.slice(0, 3).map((page: string) => (
                          <span
                            key={page}
                            className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full capitalize"
                          >
                            {page}
                          </span>
                        ))}
                        {(admin.pages?.length || 0) > 3 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                            +{admin.pages.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {formatDate(admin.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* Only show edit/delete buttons if:
                            1. The target is not a SUPER_ADMIN, AND
                            2. The current user is SUPER_ADMIN (only SUPER_ADMIN can modify other admins) */}
                        {admin.role !== 'SUPER_ADMIN' && currentUser?.role === 'SUPER_ADMIN' && (
                          <>
                            <button
                              onClick={() => handleEditPermissions(admin)}
                              className="p-2 text-gray-400 hover:text-[#006B3F] hover:bg-[#006B3F]/10 rounded-lg transition-colors"
                              title="Edit Permissions"
                            >
                              <Icon name="edit" size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(admin)}
                              className="p-2 text-gray-400 hover:text-[#CE1126] hover:bg-[#CE1126]/10 rounded-lg transition-colors"
                              title="Delete Admin"
                            >
                              <Icon name="delete" size={16} />
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
        </>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-elevated animate-slide-up max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Create New Admin</h2>
                  <p className="text-sm text-gray-500 mt-1">Add a new admin user with page permissions</p>
                </div>
                <button onClick={closeModals} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Icon name="close" size={20} className="text-gray-400" />
                </button>
              </div>
            </div>

            {error && (
              <div className="mx-6 mt-4 p-3 bg-[#CE1126]/10 text-[#CE1126] rounded-xl text-sm flex items-center gap-2">
                <Icon name="error" size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                  <div className="relative">
                    <Icon name="person" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-0 transition-colors"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-0 transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <div className="relative">
                  <Icon name="mail" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-0 transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">Page Permissions</label>
                  <button
                    type="button"
                    onClick={() => handleSelectAllPages(formData.pages.length !== AVAILABLE_PAGES.length)}
                    className="text-xs text-[#006B3F] hover:text-[#005a35] font-medium"
                  >
                    {formData.pages.length === AVAILABLE_PAGES.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                
                {/* Quick Permission Presets */}
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Quick Presets:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(PERMISSION_PRESETS).map(([key, preset]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData({ ...formData, pages: preset.pages })}
                        className={`px-3 py-1.5 text-xs rounded-lg border-2 transition-all ${
                          JSON.stringify(formData.pages) === JSON.stringify(preset.pages)
                            ? 'border-[#006B3F] bg-[#006B3F] text-white'
                            : 'border-gray-200 text-gray-600 hover:border-[#006B3F] hover:text-[#006B3F]'
                        }`}
                        title={preset.description}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_PAGES.map((page) => (
                    <label
                      key={page.id}
                      className="flex items-center gap-2 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => handleTogglePage(page.id)}
                        className="text-[#006B3F]"
                      >
                        {formData.pages.includes(page.id) ? (
                          <Icon name="check_box" size={18} />
                        ) : (
                          <Icon name="check_box_outline_blank" size={18} className="text-gray-400" />
                        )}
                      </button>
                      <span className="text-sm text-gray-700">{page.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModals}
                  className="btn-ripple flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAdmin.isPending}
                  className="btn-ripple flex-1 px-4 py-3 bg-[#006B3F] text-white rounded-xl hover:bg-[#005a35] disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {createAdmin.isPending ? (
                    <>
                      <Icon name="progress_activity" className="animate-spin" size={18} />
                      Creating...
                    </>
                  ) : (
                    'Create Admin'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Permissions Modal */}
      {showEditModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-elevated animate-slide-up max-w-lg w-full">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Edit Permissions</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Update page access for {selectedAdmin.firstName} {selectedAdmin.lastName}
                  </p>
                </div>
                <button onClick={closeModals} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Icon name="close" size={20} className="text-gray-400" />
                </button>
              </div>
            </div>

            {error && (
              <div className="mx-6 mt-4 p-3 bg-[#CE1126]/10 text-[#CE1126] rounded-xl text-sm flex items-center gap-2">
                <Icon name="error" size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleUpdatePermissions} className="p-6 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">Page Permissions</label>
                  <button
                    type="button"
                    onClick={() => handleSelectAllPages(formData.pages.length !== AVAILABLE_PAGES.length)}
                    className="text-xs text-[#006B3F] hover:text-[#005a35] font-medium"
                  >
                    {formData.pages.length === AVAILABLE_PAGES.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                
                {/* Quick Permission Presets */}
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Quick Presets:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(PERMISSION_PRESETS).map(([key, preset]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData({ ...formData, pages: preset.pages })}
                        className={`px-3 py-1.5 text-xs rounded-lg border-2 transition-all ${
                          JSON.stringify(formData.pages) === JSON.stringify(preset.pages)
                            ? 'border-[#006B3F] bg-[#006B3F] text-white'
                            : 'border-gray-200 text-gray-600 hover:border-[#006B3F] hover:text-[#006B3F]'
                        }`}
                        title={preset.description}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_PAGES.map((page) => (
                    <label
                      key={page.id}
                      className="flex items-center gap-2 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => handleTogglePage(page.id)}
                        className="text-[#006B3F]"
                      >
                        {formData.pages.includes(page.id) ? (
                          <Icon name="check_box" size={18} />
                        ) : (
                          <Icon name="check_box_outline_blank" size={18} className="text-gray-400" />
                        )}
                      </button>
                      <span className="text-sm text-gray-700">{page.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModals}
                  className="btn-ripple flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatePermissions.isPending}
                  className="btn-ripple flex-1 px-4 py-3 bg-[#006B3F] text-white rounded-xl hover:bg-[#005a35] disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {updatePermissions.isPending ? (
                    <>
                      <Icon name="progress_activity" className="animate-spin" size={18} />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-elevated animate-slide-up max-w-md w-full">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-[#CE1126]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="delete" className="text-[#CE1126]" size={32} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Delete Admin</h2>
              <p className="text-sm text-gray-500 mt-2">
                Are you sure you want to delete{' '}
                <strong>
                  {selectedAdmin.firstName} {selectedAdmin.lastName}
                </strong>
                ? This action cannot be undone.
              </p>

              {error && (
                <div className="mt-4 p-3 bg-[#CE1126]/10 text-[#CE1126] rounded-xl text-sm flex items-center gap-2">
                  <Icon name="error" size={16} />
                  {error}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={closeModals}
                  className="btn-ripple flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleteAdmin.isPending}
                  className="btn-ripple flex-1 px-4 py-3 bg-[#CE1126] text-white rounded-xl hover:bg-[#b81022] disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {deleteAdmin.isPending ? (
                    <>
                      <Icon name="progress_activity" className="animate-spin" size={18} />
                      Deleting...
                    </>
                  ) : (
                    'Delete Admin'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
