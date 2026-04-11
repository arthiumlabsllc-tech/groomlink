import { useState } from 'react';
import {
  Shield,
  Users,
  UserCheck,
  Crown,
  Plus,
  Loader2,
  AlertCircle,
  X,
  Check,
  Edit2,
  Trash2,
  Search,
  Mail,
  User,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useAdmins, useCreateAdmin, useUpdateAdminPermissions, useDeleteAdmin } from '../hooks';
import { useAuth } from '../hooks';
import { formatDate } from '../lib/utils';

const AVAILABLE_PAGES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'salons', label: 'Salons' },
  { id: 'users', label: 'Users' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'promotions', label: 'Promotions' },
  { id: 'support', label: 'Support' },
  { id: 'support-staff', label: 'Support Staff' },
  { id: 'settings', label: 'Settings' },
];

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
          <h1 className="text-2xl font-bold text-gray-800">Admin Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage admin users and their permissions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#006B3F] text-white rounded-xl hover:bg-[#005a35] transition-colors font-medium shadow-lg shadow-[#006B3F]/25"
        >
          <Plus size={18} />
          Add Admin
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#006B3F]/10 rounded-xl">
              <Users className="text-[#006B3F]" size={24} />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-800">{totalAdmins}</p>
              <p className="text-sm text-gray-500">Total Admins</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#FCD116]/20 rounded-xl">
              <UserCheck className="text-[#B8960F]" size={24} />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-800">{activeAdmins}</p>
              <p className="text-sm text-gray-500">Active Admins</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-xl">
              <Crown className="text-purple-600" size={24} />
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
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search admins by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-[#006B3F] focus:ring-2 focus:ring-[#006B3F]/20 transition-all"
        />
      </div>

      {/* Admin List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Shield size={18} className="text-[#006B3F]" />
            Admin Users
          </h2>
        </div>

        {filteredAdmins.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="text-gray-300" size={32} />
            </div>
            <p className="text-gray-500 font-medium">No admins found</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchQuery ? 'Try adjusting your search' : 'Add your first admin user'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                        <Mail size={14} className="text-gray-400" />
                        {admin.email}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {admin.role === 'SUPER_ADMIN' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          <Crown size={12} />
                          Super Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          <Shield size={12} />
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
                        {admin.role !== 'SUPER_ADMIN' && (
                          <>
                            <button
                              onClick={() => handleEditPermissions(admin)}
                              className="p-2 text-gray-400 hover:text-[#006B3F] hover:bg-[#006B3F]/10 rounded-lg transition-colors"
                              title="Edit Permissions"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(admin)}
                              className="p-2 text-gray-400 hover:text-[#CE1126] hover:bg-[#CE1126]/10 rounded-lg transition-colors"
                              title="Delete Admin"
                            >
                              <Trash2 size={16} />
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
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Create New Admin</h2>
                  <p className="text-sm text-gray-500 mt-1">Add a new admin user with page permissions</p>
                </div>
                <button onClick={closeModals} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
            </div>

            {error && (
              <div className="mx-6 mt-4 p-3 bg-[#CE1126]/10 text-[#CE1126] rounded-xl text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
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
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
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
                          <CheckSquare size={18} />
                        ) : (
                          <Square size={18} className="text-gray-400" />
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
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAdmin.isPending}
                  className="flex-1 px-4 py-3 bg-[#006B3F] text-white rounded-xl hover:bg-[#005a35] disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {createAdmin.isPending ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Edit Permissions</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Update page access for {selectedAdmin.firstName} {selectedAdmin.lastName}
                  </p>
                </div>
                <button onClick={closeModals} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
            </div>

            {error && (
              <div className="mx-6 mt-4 p-3 bg-[#CE1126]/10 text-[#CE1126] rounded-xl text-sm flex items-center gap-2">
                <AlertCircle size={16} />
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
                          <CheckSquare size={18} />
                        ) : (
                          <Square size={18} className="text-gray-400" />
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
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatePermissions.isPending}
                  className="flex-1 px-4 py-3 bg-[#006B3F] text-white rounded-xl hover:bg-[#005a35] disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {updatePermissions.isPending ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-[#CE1126]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="text-[#CE1126]" size={32} />
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
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={closeModals}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleteAdmin.isPending}
                  className="flex-1 px-4 py-3 bg-[#CE1126] text-white rounded-xl hover:bg-[#b81022] disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {deleteAdmin.isPending ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
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
