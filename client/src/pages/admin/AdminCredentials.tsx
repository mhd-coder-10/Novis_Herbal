import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  UserPlus, 
  KeyRound, 
  RefreshCw, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  Phone, 
  User as UserIcon, 
  CheckCircle2, 
  AlertCircle, 
  Check, 
  X,
  Shield,
  RotateCcw,
  ArrowLeft,
  UserCheck
} from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../store/useToastStore';
import { useAuthStore } from '../../store/useAuthStore';
import { sanitizePhoneNumber, isValidIndianPhone, handlePhoneKeyDown } from '../../utils/phoneValidation';
import { AdminConfirmModal } from '../../components/common/AdminConfirmModal';

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'staff';
  isActive: boolean;
  createdAt: string;
}

export const AdminCredentials: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Full page view states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);

  // Form states - Create
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'admin' as 'admin' | 'staff',
    password: ''
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form states - Edit
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'admin' as 'admin' | 'staff',
    isActive: true,
    password: ''
  });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/credentials');
      if (res.data?.success) {
        setAdmins(res.data.admins || []);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch admin credentials', 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.email || !createForm.password) {
      toast.error('Please fill in all required fields.', 'Validation Error');
      return;
    }

    if (createForm.phone && !isValidIndianPhone(createForm.phone)) {
      toast.error('Please enter a valid 10-digit Indian mobile number.', 'Phone Invalid');
      return;
    }

    setIsCreating(true);
    try {
      const res = await api.post('/admin/credentials', createForm);
      if (res.data?.success) {
        toast.success(res.data.message || 'New admin credential registered!', 'Created');
        setIsCreateModalOpen(false);
        setCreateForm({
          name: '',
          email: '',
          phone: '',
          role: 'admin',
          password: ''
        });
        await fetchAdmins();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create admin credential', 'Error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenEdit = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setEditForm({
      name: admin.name || '',
      email: admin.email || '',
      phone: admin.phone || '',
      role: admin.role || 'admin',
      isActive: admin.isActive !== false,
      password: ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;

    if (!editForm.name || !editForm.email) {
      toast.error('Name and Email are required.', 'Validation Error');
      return;
    }

    if (editForm.phone && !isValidIndianPhone(editForm.phone)) {
      toast.error('Please enter a valid 10-digit Indian mobile number.', 'Phone Invalid');
      return;
    }

    setIsUpdating(true);
    try {
      const payload: any = {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        role: editForm.role,
        isActive: editForm.isActive
      };
      if (editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      const res = await api.put(`/admin/credentials/${selectedAdmin._id}`, payload);
      if (res.data?.success) {
        toast.success(res.data.message || 'Admin credentials updated successfully!', 'Updated');
        setIsEditModalOpen(false);
        setSelectedAdmin(null);
        await fetchAdmins();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update credentials', 'Error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Restore Default Admin Confirmation Modal State
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  const handleRestoreDefaultAdmin = () => {
    setShowRestoreModal(true);
  };

  const handleConfirmRestoreDefaultAdmin = async () => {
    setIsRestoring(true);
    try {
      const res = await api.post('/admin/credentials/restore-default');
      if (res.data?.success) {
        toast.success(res.data.message || 'Default admin (admin@novise.in) restored!', 'Success');
        await fetchAdmins();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to restore default admin', 'Error');
    } finally {
      setIsRestoring(false);
      setShowRestoreModal(false);
    }
  };

  // Delete Admin Modal State
  const [adminToDelete, setAdminToDelete] = useState<AdminUser | null>(null);
  const [isDeletingAdmin, setIsDeletingAdmin] = useState(false);

  const handleDeleteAdmin = (admin: AdminUser) => {
    if (admin._id === currentUser?.id) {
      toast.warning('You cannot delete your own logged-in admin account.', 'Action Blocked');
      return;
    }
    setAdminToDelete(admin);
  };

  const handleConfirmDeleteAdmin = async () => {
    if (!adminToDelete) return;
    setIsDeletingAdmin(true);
    try {
      const res = await api.delete(`/admin/credentials/${adminToDelete._id}`);
      if (res.data?.success) {
        toast.info(res.data.message || 'Admin credential removed.', 'Removed');
        setAdminToDelete(null);
        await fetchAdmins();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove admin credential', 'Error');
    } finally {
      setIsDeletingAdmin(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {!isCreateModalOpen && !isEditModalOpen ? (
        /* ====================================================================
           DIRECTORY VIEW: TABLE & METRICS RIBBON
           ==================================================================== */
        <div className="space-y-6 animate-fadeIn">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-gold-600 font-bold text-xs uppercase tracking-wider mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Security & Access Control</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950">
                Admin Credentials & Team
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Manage Super Administrators, store staff credentials, reset access, or create new authorized accounts.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleRestoreDefaultAdmin}
                disabled={isRestoring}
                className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                title="Restore default factory credentials: admin@novise.in / Admin@Novise2026"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
                <span>{isRestoring ? 'Restoring...' : 'Restore Default Admin'}</span>
              </button>

              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2.5 bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-md shadow-forest-900/10 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add New Admin</span>
              </button>
            </div>
          </div>

          {/* Default Super Admin Reference Banner */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-forest-950 via-forest-900 to-forest-950 rounded-2xl text-white border border-forest-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-gold-500/20 text-gold-400 border border-gold-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-serif font-bold text-sm text-gold-400">Default Master Super Admin</h3>
                  <span className="text-[10px] bg-gold-400 text-forest-950 font-extrabold px-2 py-0.5 rounded-full font-mono uppercase">
                    Active
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Email: <code className="text-gold-300 font-mono font-bold">admin@novise.in</code> • Password: <code className="text-gold-300 font-mono">Admin@Novise2026</code>
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  If anyone ever deletes or loses admin access, clicking <strong>"Restore Default Admin"</strong> recreates this account instantly.
                </p>
              </div>
            </div>
          </div>

          {/* Admin Credentials Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-sm text-slate-800">
                Authorized Accounts ({admins.length})
              </h2>
              <button
                onClick={fetchAdmins}
                disabled={isLoading}
                className="p-1.5 text-slate-400 hover:text-forest-900 transition rounded-lg hover:bg-slate-50 cursor-pointer"
                title="Refresh list"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Admin / Staff Name</th>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4">Mobile</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400">
                        Loading credentials...
                      </td>
                    </tr>
                  ) : admins.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400">
                        No admin accounts found. Click "Restore Default Admin" to seed.
                      </td>
                    </tr>
                  ) : (
                    admins.map((admin) => {
                      const isMaster = admin.email === 'admin@novise.in';
                      return (
                        <tr key={admin._id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-7 h-7 rounded-full bg-forest-900 text-gold-400 font-serif font-bold text-xs flex items-center justify-center">
                                {(admin.name || 'A').charAt(0).toUpperCase()}
                              </div>
                              <span>{admin.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {admin.email}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500">
                            {admin.phone || '—'}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase font-mono ${
                              admin.role === 'admin' 
                                ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            }`}>
                              {admin.role === 'admin' ? 'Super Admin' : 'Staff'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              admin.isActive 
                                ? 'bg-emerald-50 text-emerald-700' 
                                : 'bg-rose-50 text-rose-700'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${admin.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              <span>{admin.isActive ? 'Active' : 'Disabled'}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleOpenEdit(admin)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition flex items-center space-x-1 cursor-pointer"
                                title="Edit details & password"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>

                              {!isMaster && (
                                <button
                                  onClick={() => handleDeleteAdmin(admin)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                  title="Delete credential"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : isCreateModalOpen ? (
        /* ====================================================================
           DEDICATED FULL-PAGE VIEW: ADD ADMIN / STAFF CREDENTIAL
           ==================================================================== */
        <div className="space-y-6 w-full animate-fadeIn pb-12">
          {/* Top Action Nav Bar with 1-Step Back Button */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5 sm:space-x-4">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="inline-flex items-center space-x-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-forest-900 hover:text-gold-400 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer shadow-xs group"
                title="Return to administrator accounts list"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span>Back to Administrator Accounts</span>
              </button>
              <div className="h-6 w-px bg-slate-200 hidden sm:block" />
              <div>
                <div className="flex items-center space-x-2">
                  <div className="w-9 h-9 rounded-xl bg-forest-900/10 text-forest-900 flex items-center justify-center font-serif text-sm font-bold">
                    <UserPlus className="w-4 h-4 text-forest-900" />
                  </div>
                  <h2 className="font-serif text-xl sm:text-2xl font-black text-forest-950">
                    Add Administrator / Staff Credential
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assign role privileges, system access permissions, and authentication credentials for team members.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider bg-amber-50 text-amber-800 border-amber-200">
                + New Account
              </span>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Main Full-Page Form Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
            <form onSubmit={handleCreateSubmit} className="space-y-6">
              {/* Role Explainer Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  onClick={() => setCreateForm({ ...createForm, role: 'admin' })}
                  className={`p-4 rounded-2xl border-2 transition cursor-pointer flex items-start space-x-3.5 ${
                    createForm.role === 'admin' 
                      ? 'border-forest-900 bg-forest-950/5 ring-1 ring-forest-900/20' 
                      : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    createForm.role === 'admin' ? 'bg-forest-900 text-gold-400' : 'bg-slate-200 text-slate-600'
                  }`}>
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-forest-950">Super Administrator</h4>
                      {createForm.role === 'admin' && (
                        <span className="text-[10px] font-bold bg-forest-900 text-gold-400 px-2 py-0.5 rounded-full uppercase">Selected</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Unrestricted access to all modules: Orders, Products, Finance, Analytics, CMS banners, Customer details, and Security settings.
                    </p>
                  </div>
                </div>

                <div 
                  onClick={() => setCreateForm({ ...createForm, role: 'staff' })}
                  className={`p-4 rounded-2xl border-2 transition cursor-pointer flex items-start space-x-3.5 ${
                    createForm.role === 'staff' 
                      ? 'border-forest-900 bg-forest-950/5 ring-1 ring-forest-900/20' 
                      : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    createForm.role === 'staff' ? 'bg-forest-900 text-gold-400' : 'bg-slate-200 text-slate-600'
                  }`}>
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-forest-950">Store Staff Member</h4>
                      {createForm.role === 'staff' && (
                        <span className="text-[10px] font-bold bg-forest-900 text-gold-400 px-2 py-0.5 rounded-full uppercase">Selected</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Operational access for warehouse and order fulfillment teams to update tracking, customer reviews, and order delivery status.
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Input Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                <div>
                  <label className="block text-slate-700 font-bold text-xs uppercase tracking-wider mb-2">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-forest-900/20 focus:border-forest-900 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold text-xs uppercase tracking-wider mb-2">
                    Email Address (Login ID) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="staff@novise.in"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-forest-900/20 focus:border-forest-900 transition font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold text-xs uppercase tracking-wider mb-2">
                    Mobile Number (10 Digits) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      inputMode="numeric"
                      maxLength={10}
                      pattern="[6-9][0-9]{9}"
                      placeholder="9876543210"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: sanitizePhoneNumber(e.target.value) })}
                      onKeyDown={handlePhoneKeyDown}
                      className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-forest-900/20 focus:border-forest-900 transition font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold text-xs uppercase tracking-wider mb-2">
                    Access Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type={showCreatePassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Minimum 6 characters"
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      className="w-full pl-11 pr-11 py-3 border border-slate-200 rounded-2xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-forest-900/20 focus:border-forest-900 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      title={showCreatePassword ? 'Hide password' : 'Show password'}
                    >
                      {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-bold text-slate-700 text-sm transition cursor-pointer"
                >
                  Cancel & Go Back
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold text-sm transition flex items-center justify-center space-x-2 shadow-lg shadow-forest-900/15 disabled:opacity-50 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-gold-400" />
                  <span>{isCreating ? 'Creating Account...' : 'Create Administrator Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : isEditModalOpen && selectedAdmin ? (
        /* ====================================================================
           DEDICATED FULL-PAGE VIEW: EDIT ADMIN PRIVILEGES
           ==================================================================== */
        <div className="space-y-6 w-full animate-fadeIn pb-12">
          {/* Top Action Nav Bar with 1-Step Back Button */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5 sm:space-x-4">
              <button
                type="button"
                onClick={() => { setIsEditModalOpen(false); setSelectedAdmin(null); }}
                className="inline-flex items-center space-x-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-forest-900 hover:text-gold-400 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer shadow-xs group"
                title="Return to administrator accounts list"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span>Back to Administrator Accounts</span>
              </button>
              <div className="h-6 w-px bg-slate-200 hidden sm:block" />
              <div>
                <div className="flex items-center space-x-2">
                  <div className="w-9 h-9 rounded-xl bg-forest-900/10 text-forest-900 flex items-center justify-center font-serif text-sm font-bold">
                    <Edit3 className="w-4 h-4 text-forest-900" />
                  </div>
                  <h2 className="font-serif text-xl sm:text-2xl font-black text-forest-950">
                    Edit Admin Privileges: {selectedAdmin.name}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedAdmin.email} • {selectedAdmin.role === 'admin' ? 'Super Administrator' : 'Staff Member'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${
                editForm.isActive ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {editForm.isActive ? '● Account Active' : '○ Account Disabled'}
              </span>
              <button
                type="button"
                onClick={() => { setIsEditModalOpen(false); setSelectedAdmin(null); }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Main Full-Page Form Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
            <form onSubmit={handleEditSubmit} className="space-y-6">
              {/* Role Toggle Selector */}
              <div>
                <label className="block text-slate-700 font-bold text-xs uppercase tracking-wider mb-2">
                  System Role & Privileges
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div 
                    onClick={() => setEditForm({ ...editForm, role: 'admin' })}
                    className={`p-4 rounded-2xl border-2 transition cursor-pointer flex items-start space-x-3.5 ${
                      editForm.role === 'admin' 
                        ? 'border-forest-900 bg-forest-950/5 ring-1 ring-forest-900/20' 
                        : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      editForm.role === 'admin' ? 'bg-forest-900 text-gold-400' : 'bg-slate-200 text-slate-600'
                    }`}>
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-forest-950">Super Administrator</h4>
                        {editForm.role === 'admin' && (
                          <span className="text-[10px] font-bold bg-forest-900 text-gold-400 px-2 py-0.5 rounded-full uppercase">Selected</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Full access to products, finance ledger, order management, settings, and database audits.
                      </p>
                    </div>
                  </div>

                  <div 
                    onClick={() => setEditForm({ ...editForm, role: 'staff' })}
                    className={`p-4 rounded-2xl border-2 transition cursor-pointer flex items-start space-x-3.5 ${
                      editForm.role === 'staff' 
                        ? 'border-forest-900 bg-forest-950/5 ring-1 ring-forest-900/20' 
                        : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      editForm.role === 'staff' ? 'bg-forest-900 text-gold-400' : 'bg-slate-200 text-slate-600'
                    }`}>
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-forest-950">Store Staff Member</h4>
                        {editForm.role === 'staff' && (
                          <span className="text-[10px] font-bold bg-forest-900 text-gold-400 px-2 py-0.5 rounded-full uppercase">Selected</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Access to fulfill orders, inspect return packages, and moderate customer product reviews.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Input Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-slate-700 font-bold text-xs uppercase tracking-wider mb-2">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-forest-900/20 focus:border-forest-900 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold text-xs uppercase tracking-wider mb-2">
                    Email Address (Login ID) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-forest-900/20 focus:border-forest-900 transition font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold text-xs uppercase tracking-wider mb-2">
                    Mobile Number (10 Digits)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      pattern="[6-9][0-9]{9}"
                      placeholder="9876543210"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: sanitizePhoneNumber(e.target.value) })}
                      onKeyDown={handlePhoneKeyDown}
                      className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-forest-900/20 focus:border-forest-900 transition font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold text-xs uppercase tracking-wider mb-2">
                    Account Status
                  </label>
                  <div 
                    onClick={() => setEditForm({ ...editForm, isActive: !editForm.isActive })}
                    className={`flex items-center space-x-3 p-3 rounded-2xl border cursor-pointer transition ${
                      editForm.isActive ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-rose-50/70 border-rose-200 text-rose-900'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={editForm.isActive}
                      onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                      className="w-5 h-5 rounded text-forest-900 focus:ring-forest-900 cursor-pointer"
                    />
                    <div>
                      <p className="font-bold text-xs">
                        {editForm.isActive ? 'Account Active & Permitted to Sign In' : 'Account Disabled (Access Blocked)'}
                      </p>
                      <p className="text-[11px] opacity-75">
                        {editForm.isActive ? 'User can authenticate with their login credentials.' : 'User will be rejected on the login page.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Password Reset Section */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <div>
                  <h4 className="font-serif font-bold text-sm text-forest-950">Change Access Password</h4>
                  <p className="text-xs text-slate-500">
                    Leave this blank if you do not want to alter the existing account password.
                  </p>
                </div>
                <div className="relative max-w-md">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    minLength={6}
                    placeholder="Enter new password (optional)"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    className="w-full pl-11 pr-11 py-3 border border-slate-200 rounded-2xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-forest-900/20 focus:border-forest-900 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    title={showEditPassword ? 'Hide password' : 'Show password'}
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); setSelectedAdmin(null); }}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-bold text-slate-700 text-sm transition cursor-pointer"
                >
                  Cancel & Go Back
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold text-sm transition flex items-center justify-center space-x-2 shadow-lg shadow-forest-900/15 disabled:opacity-50 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 text-gold-400" />
                  <span>{isUpdating ? 'Saving Changes...' : 'Save Privileges & Updates'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Delete Admin Privileges Modal */}
      <AdminConfirmModal
        isOpen={!!adminToDelete}
        title="Revoke Admin Privileges"
        itemBadge={adminToDelete?.email}
        itemName={adminToDelete?.name}
        message="Are you sure you want to remove admin access for this user? They will no longer be able to log into the management console."
        confirmLabel="Yes, Remove Privileges"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeletingAdmin}
        onClose={() => setAdminToDelete(null)}
        onConfirm={handleConfirmDeleteAdmin}
      />

      {/* Restore Factory Default Admin Modal */}
      <AdminConfirmModal
        isOpen={showRestoreModal}
        title="Restore Factory Super Admin"
        itemBadge="admin@novise.in"
        message="Are you sure you want to restore the factory default Super Admin account (admin@novise.in)? If the account password was changed or missing, it will be reset to default."
        confirmLabel="Restore Super Admin"
        cancelLabel="Cancel"
        variant="warning"
        isLoading={isRestoring}
        onClose={() => setShowRestoreModal(false)}
        onConfirm={handleConfirmRestoreDefaultAdmin}
      />
    </div>
  );
};
