import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  MapPin,
  ShoppingBag,
  ExternalLink,
  Trash2,
  Ban,
  UserCheck,
  ChevronRight,
  X,
  Phone,
  Mail,
  Calendar,
  IndianRupee,
  RefreshCw,
  Eye,
  ArrowLeft,
  Bell
} from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../store/useToastStore';
import { AdminPagination } from '../../components/common/AdminPagination';
import { AdminConfirmModal } from '../../components/common/AdminConfirmModal';
import { AdminSendNotificationModal } from '../../components/admin/AdminSendNotificationModal';

interface CustomerAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
}

interface CustomerItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  isVerified: boolean;
  isActive: boolean;
  addresses?: CustomerAddress[];
  ordersCount: number;
  totalSpent: number;
  lastOrderDate?: string;
  joinedAt: string;
}

interface CustomerStats {
  totalCustomers: number;
  verifiedCount: number;
  unverifiedCount: number;
  activeCount: number;
  blockedCount: number;
}

export interface AdminCustomersProps {
  initialCustomerId?: string | null;
  onSelectCustomer?: (customerId: string | null) => void;
  onNavigateToOrder?: (orderId: string) => void;
}

const formatOrderStatusName = (status: string) => {
  switch (status) {
    case 'PLACED': return 'Placed';
    case 'CONFIRMED': return 'Confirmed';
    case 'PACKED': return 'Packed';
    case 'SHIPMENT_BOOKED': return 'Shipment Booked';
    case 'IN_TRANSIT': return 'In Transit';
    case 'OUT_FOR_DELIVERY': return 'Out for Delivery';
    case 'DELIVERED': return 'Delivered';
    case 'CANCELLED': return 'Cancelled';
    case 'RETURNED':
    case 'RTO': return 'Returned';
    case 'DELIVERY_FAILED': return 'Delivery Failed';
    default: return status || 'Placed';
  }
};

const getOrderStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'PLACED': return 'bg-amber-100 text-amber-900 border-amber-300';
    case 'CONFIRMED': return 'bg-blue-100 text-blue-900 border-blue-300';
    case 'PACKED': return 'bg-indigo-100 text-indigo-900 border-indigo-300';
    case 'SHIPMENT_BOOKED': return 'bg-purple-100 text-purple-900 border-purple-300';
    case 'IN_TRANSIT': return 'bg-cyan-100 text-cyan-900 border-cyan-300';
    case 'OUT_FOR_DELIVERY': return 'bg-teal-100 text-teal-900 border-teal-300';
    case 'DELIVERED': return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    case 'CANCELLED': return 'bg-rose-100 text-rose-900 border-rose-300';
    case 'RETURNED':
    case 'RTO':
    case 'DELIVERY_FAILED': return 'bg-orange-100 text-orange-900 border-orange-300';
    default: return 'bg-slate-100 text-slate-800 border-slate-300';
  }
};

export const AdminCustomers: React.FC<AdminCustomersProps> = ({
  initialCustomerId,
  onSelectCustomer,
  onNavigateToOrder
}) => {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [stats, setStats] = useState<CustomerStats>({
    totalCustomers: 0,
    verifiedCount: 0,
    unverifiedCount: 0,
    activeCount: 0,
    blockedCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, verifiedFilter]);

  const paginatedCustomers = React.useMemo(() => {
    return customers.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [customers, currentPage, pageSize]);

  // Selected Customer Modal / Drawer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetails, setCustomerDetails] = useState<any | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [notificationCustomer, setNotificationCustomer] = useState<{ _id?: string; email?: string; name?: string } | null>(null);

  // Fetch Customers
  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (verifiedFilter !== 'all') params.append('verified', verifiedFilter);

      const res = await api.get(`/admin/customers?${params.toString()}`);
      if (res.data?.success) {
        setCustomers(res.data.customers || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err: any) {
      console.error('Failed to load customers:', err);
      toast.error(err.response?.data?.message || 'Failed to load customer directory', 'Admin Customers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [statusFilter, verifiedFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };

  // View Customer Details
  const handleOpenCustomer = async (customerId: string) => {
    setSelectedCustomerId(customerId);
    if (onSelectCustomer && initialCustomerId !== customerId) {
      onSelectCustomer(customerId);
    }
    setIsLoadingDetails(true);
    try {
      const res = await api.get(`/admin/customers/${customerId}`);
      if (res.data?.success) {
        setCustomerDetails(res.data);
      }
    } catch (err: any) {
      toast.error('Failed to load customer profile', 'Customer Error');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCloseCustomer = () => {
    setSelectedCustomerId(null);
    setCustomerDetails(null);
    if (onSelectCustomer) {
      onSelectCustomer(null);
    }
  };

  useEffect(() => {
    if (initialCustomerId) {
      handleOpenCustomer(initialCustomerId);
    } else {
      setSelectedCustomerId(null);
      setCustomerDetails(null);
    }
  }, [initialCustomerId]);

  // Toggle Active / Blocked Status Confirmation State
  const [statusConfirm, setStatusConfirm] = useState<{
    customer: CustomerItem;
    newStatus: boolean;
  } | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const handleToggleStatus = (customer: CustomerItem) => {
    setStatusConfirm({
      customer,
      newStatus: !customer.isActive
    });
  };

  const handleConfirmToggleStatus = async () => {
    if (!statusConfirm) return;
    const { customer, newStatus } = statusConfirm;
    setIsUpdatingStatus(true);
    try {
      const res = await api.put(`/admin/customers/${customer.id}/status`, { isActive: newStatus });
      if (res.data?.success) {
        setCustomers(prev =>
          prev.map(c => (c.id === customer.id ? { ...c, isActive: newStatus } : c))
        );
        if (customerDetails?.customer?.id === customer.id) {
          setCustomerDetails({
            ...customerDetails,
            customer: { ...customerDetails.customer, isActive: newStatus }
          });
        }
        toast.success(`Customer is now ${newStatus ? 'Active' : 'Blocked'}.`, 'Account Status');
        setStatusConfirm(null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update customer status', 'Error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Delete Customer Modal State
  const [customerToDelete, setCustomerToDelete] = useState<CustomerItem | null>(null);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);

  const handleDeleteCustomer = (customer: CustomerItem) => {
    setCustomerToDelete(customer);
  };

  const handleConfirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setIsDeletingCustomer(true);
    try {
      const res = await api.delete(`/admin/customers/${customerToDelete.id}`);
      if (res.data?.success) {
        setCustomers(prev => prev.filter(c => c.id !== customerToDelete.id));
        if (selectedCustomerId === customerToDelete.id) {
          setSelectedCustomerId(null);
          setCustomerDetails(null);
        }
        toast.info(`Customer ${customerToDelete.email} deleted successfully.`, 'Customer Removed');
        setCustomerToDelete(null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete customer', 'Error');
    } finally {
      setIsDeletingCustomer(false);
    }
  };

  return (
    <div className="space-y-6">

      {!selectedCustomerId ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Banner / Metrics Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Customers</p>
                <h3 className="text-2xl font-black text-forest-950 mt-1">{stats.totalCustomers}</h3>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center mt-1">
                  Registered Accounts
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-forest-900/10 text-forest-900 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Verified</p>
                <h3 className="text-2xl font-black text-emerald-700 mt-1">{stats.verifiedCount}</h3>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {stats.unverifiedCount} Pending OTP
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Customers</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.activeCount}</h3>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Able to place orders
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Blocked Accounts</p>
                <h3 className="text-2xl font-black text-rose-600 mt-1">{stats.blockedCount}</h3>
                <span className="text-[10px] text-rose-500 font-semibold mt-1 block">
                  Restricted from store
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center space-x-2">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by customer name, email, or mobile..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-forest-900 focus:bg-white transition"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-forest-900 hover:bg-forest-950 text-gold-400 font-bold text-xs rounded-xl transition shadow-sm"
              >
                Search
              </button>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setTimeout(() => fetchCustomers(), 0);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>

            <div className="flex items-center space-x-3 self-end md:self-auto flex-wrap gap-y-2">
              <div className="flex items-center space-x-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-bold text-slate-500">Filters:</span>
              </div>

              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="blocked">Blocked Only</option>
              </select>

              <select
                value={verifiedFilter}
                onChange={(e: any) => setVerifiedFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="all">All Verification</option>
                <option value="verified">Verified Email</option>
                <option value="unverified">Unverified OTP</option>
              </select>

              <button
                onClick={fetchCustomers}
                className="p-2 text-slate-500 hover:text-forest-900 hover:bg-slate-100 rounded-xl transition"
                title="Refresh Directory"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Customers Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-16 text-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-forest-900 mx-auto" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Customer Directory...</p>
              </div>
            ) : customers.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <Users className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="text-base font-bold text-forest-950">No Customers Found</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No registered customer matches your current search criteria or filter.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider text-xs">
                        <th className="py-3.5 px-4 sm:px-6">Customer</th>
                        <th className="py-3.5 px-4">Contact</th>
                        <th className="py-3.5 px-4">Verification</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Orders</th>
                        <th className="py-3.5 px-4">Total Spent</th>
                        <th className="py-3.5 px-4">Delivery Address</th>
                        <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {paginatedCustomers.map((customer) => {
                        const savedAddr = customer.addresses && customer.addresses.length > 0 ? customer.addresses[0] : null;

                        return (
                          <tr key={customer.id} className="hover:bg-slate-50/70 transition">
                            {/* Name & Avatar */}
                            <td className="py-4 px-4 sm:px-6">
                              <div className="flex items-center space-x-3">
                                {customer.avatar ? (
                                  <img
                                    src={customer.avatar}
                                    alt={customer.name}
                                    className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm shrink-0 aspect-square"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-forest-900 text-gold-400 font-extrabold flex items-center justify-center text-sm shadow-sm shrink-0 aspect-square">
                                    {customer.name?.charAt(0)?.toUpperCase() || 'U'}
                                  </div>
                                )}
                                <div>
                                  <span className="font-bold text-forest-950 text-sm block">
                                    {customer.name}
                                  </span>
                                  <span className="text-[10.5px] text-slate-400 flex items-center space-x-1 mt-0.5">
                                    <Calendar className="w-3 h-3" />
                                    <span>Joined {new Date(customer.joinedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Contact */}
                            <td className="py-4 px-4">
                              <div className="space-y-1">
                                <p className="text-slate-700 flex items-center space-x-1 font-semibold">
                                  <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate max-w-[180px]">{customer.email}</span>
                                </p>
                                <p className="text-slate-500 flex items-center space-x-1 font-mono text-[11px]">
                                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>+91 {customer.phone || 'N/A'}</span>
                                </p>
                              </div>
                            </td>

                            {/* Email Verification */}
                            <td className="py-4 px-4">
                              {customer.isVerified ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-full text-[10px] font-bold">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Verified</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200/80 rounded-full text-[10px] font-bold">
                                  <XCircle className="w-3 h-3 text-amber-600" />
                                  <span>Unverified</span>
                                </span>
                              )}
                            </td>

                            {/* Account Status */}
                            <td className="py-4 px-4">
                              {customer.isActive ? (
                                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 text-slate-800 rounded-full text-[10.5px] font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  <span>Active</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200/80 rounded-full text-[10.5px] font-bold">
                                  <Ban className="w-3 h-3 text-rose-500" />
                                  <span>Blocked</span>
                                </span>
                              )}
                            </td>

                            {/* Orders Count - Just the number */}
                            <td className="py-4 px-4">
                              <button
                                type="button"
                                onClick={() => handleOpenCustomer(customer.id)}
                                className="inline-flex items-center justify-center min-w-[28px] h-7 px-2.5 bg-slate-100 hover:bg-forest-950 hover:text-gold-400 text-forest-950 font-bold text-xs rounded-lg transition cursor-pointer"
                                title={`View ${customer.ordersCount} order(s)`}
                              >
                                {customer.ordersCount}
                              </button>
                            </td>

                            {/* Total Spent */}
                            <td className="py-4 px-4">
                              <span className="font-extrabold text-forest-950 text-sm">
                                ₹{customer.totalSpent.toLocaleString('en-IN')}
                              </span>
                            </td>

                            {/* Address Preview */}
                            <td className="py-4 px-4 max-w-[200px]">
                              {savedAddr ? (
                                <div className="text-[11px] text-slate-600 truncate flex items-center space-x-1" title={`${savedAddr.addressLine1}, ${savedAddr.city}, ${savedAddr.state} - ${savedAddr.pincode}`}>
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{savedAddr.city}, {savedAddr.state} ({savedAddr.pincode})</span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">No saved address</span>
                              )}
                            </td>

                            {/* Actions - No notification icon per customer row */}
                            <td className="py-4 px-4 sm:px-6 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenCustomer(customer.id)}
                                  className="p-1.5 text-slate-500 hover:text-forest-950 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                  title="View Customer Profile & Orders"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(customer)}
                                  className={`p-1.5 rounded-lg transition cursor-pointer ${customer.isActive
                                    ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                    : 'text-emerald-600 hover:bg-emerald-50'
                                    }`}
                                  title={customer.isActive ? 'Block Customer' : 'Unblock Customer'}
                                >
                                  {customer.isActive ? <Ban className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomer(customer)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                  title="Delete Customer Account"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Customers Pagination */}
                {customers.length > 0 && (
                  <AdminPagination
                    currentPage={currentPage}
                    totalItems={customers.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                    itemLabel="customers"
                  />
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        /* DEDICATED FULL-PAGE CUSTOMER PROFILE & ORDER HISTORY VIEW */
        <div className="space-y-6 w-full animate-fadeIn pb-12">
          {/* Top Action Nav Bar with Back Button */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">

              {/* Left Section: Back Button on left, and Customer Identity */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-3 sm:gap-0 min-w-0 flex-1">
                {/* Back Button (and on Mobile: Action row with Send Alert) */}
                <div className="flex items-center justify-between sm:justify-start sm:space-x-3 shrink-0">
                  <button
                    type="button"
                    onClick={handleCloseCustomer}
                    className="inline-flex items-center space-x-1.5 px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-forest-900 hover:text-gold-400 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer shadow-xs group shrink-0"
                    title="Back to Customers list"
                  >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    <span>Back</span>
                  </button>

                  {/* Mobile-only Notification Action (Top Right on Mobile) */}
                  <div className="sm:hidden">
                    {customerDetails?.customer && (
                      <button
                        type="button"
                        onClick={() => setNotificationCustomer({
                          _id: customerDetails.customer.id || selectedCustomerId,
                          email: customerDetails.customer.email,
                          name: customerDetails.customer.name
                        })}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-forest-950 text-gold-400 hover:bg-forest-900 font-bold text-xs transition cursor-pointer shadow-xs"
                        title="Send Notification"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>Send Alert</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Vertical Divider on Desktop */}
                <div className="h-8 w-px bg-slate-200 hidden sm:block shrink-0" />

                {/* Customer Identity: Avatar (Profile Picture or Initials) + Full Name + Email + ID */}
                <div className="flex items-start sm:items-center space-x-3 sm:space-x-3.5 min-w-0 pt-2 sm:pt-0 border-t border-slate-100 sm:border-t-0">
                  {/* Customer Avatar */}
                  {customerDetails?.customer?.avatar ? (
                    <img
                      src={customerDetails.customer.avatar}
                      alt={customerDetails.customer.name || 'Customer'}
                      className="w-11 h-11 rounded-2xl object-cover border border-slate-200/90 shadow-xs shrink-0 aspect-square mt-0.5 sm:mt-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-2xl bg-forest-900/10 text-forest-900 flex items-center justify-center font-serif text-base sm:text-lg font-black shrink-0 aspect-square border border-forest-900/10 mt-0.5 sm:mt-0">
                      {customerDetails?.customer?.name?.charAt(0)?.toUpperCase() || 'C'}
                    </div>
                  )}

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <h2 className="font-serif text-base sm:text-xl font-black text-forest-950 leading-tight">
                      {customerDetails?.customer?.name || 'Customer Details'}
                    </h2>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 text-xs text-slate-500">
                      <span className="text-slate-600 font-medium break-all">
                        {customerDetails?.customer?.email}
                      </span>
                      <span className="hidden sm:inline text-slate-300">•</span>
                      <span className="font-mono text-[11px] text-slate-400 break-all">
                        ID: {selectedCustomerId}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop-only Notification Action */}
              <div className="hidden sm:flex items-center space-x-2 shrink-0">
                {customerDetails?.customer && (
                  <button
                    type="button"
                    onClick={() => setNotificationCustomer({
                      _id: customerDetails.customer.id || selectedCustomerId,
                      email: customerDetails.customer.email,
                      name: customerDetails.customer.name
                    })}
                    className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-forest-950 text-gold-400 hover:bg-forest-900 font-bold text-xs transition cursor-pointer shadow-xs"
                    title="Send In-App Notification"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>Send Alert</span>
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* Main Full-Page Customer Details Card */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-6 lg:p-8 shadow-xs space-y-5 sm:space-y-6">
            {isLoadingDetails ? (
              <div className="py-12 text-center space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-forest-900 mx-auto" />
                <p className="text-xs font-bold text-slate-500">Loading customer history...</p>
              </div>
            ) : customerDetails ? (
              <>
                {/* Quick Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Verification</span>
                    <span className={`font-bold mt-1 inline-flex items-center space-x-1 ${customerDetails.customer.isVerified ? 'text-emerald-700' : 'text-amber-700'
                      }`}>
                      {customerDetails.customer.isVerified ? '✓ Verified' : '⚠ Unverified'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Mobile Phone</span>
                    <span className="font-bold text-slate-800 mt-1 block font-mono">
                      +91 {customerDetails.customer.phone || 'N/A'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Orders</span>
                    <span className="font-black text-forest-950 mt-1 block text-sm">
                      {customerDetails.customer.ordersCount}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Lifetime Spent</span>
                    <span className="font-black text-emerald-700 mt-1 block text-sm">
                      ₹{customerDetails.customer.totalSpent.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Saved Delivery Address */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-forest-950 mb-2 flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-forest-800" />
                    <span>Saved Delivery Address</span>
                  </h4>

                  {customerDetails.customer.addresses && customerDetails.customer.addresses.length > 0 ? (
                    <div className="p-3.5 sm:p-4 bg-[#FAF8F5] border border-slate-200 rounded-2xl text-xs space-y-1.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-bold text-forest-950">
                        <span className="text-xs sm:text-sm">{customerDetails.customer.addresses[0].fullName}</span>
                        <span className="text-slate-600 font-mono text-xs font-semibold">+91 {customerDetails.customer.addresses[0].phone}</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{customerDetails.customer.addresses[0].addressLine1}</p>
                      {customerDetails.customer.addresses[0].addressLine2 && (
                        <p className="text-slate-600 leading-relaxed">{customerDetails.customer.addresses[0].addressLine2}</p>
                      )}
                      <p className="font-semibold text-forest-900 pt-0.5">
                        {customerDetails.customer.addresses[0].city}, {customerDetails.customer.addresses[0].state} - {customerDetails.customer.addresses[0].pincode}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-500 italic text-center">
                      Customer has not saved a delivery address in their profile yet.
                    </div>
                  )}
                </div>

                {/* Order History */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-forest-950 flex items-center space-x-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-forest-800" />
                      <span>Order History ({customerDetails.orders?.length || 0})</span>
                    </h4>
                    {customerDetails.orders && customerDetails.orders.length > 0 && (
                      <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">Click order to view full details</span>
                    )}
                  </div>

                  {customerDetails.orders && customerDetails.orders.length > 0 ? (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-xs">
                      {customerDetails.orders.map((order: any) => (
                        <div
                          key={order._id}
                          onClick={() => {
                            handleCloseCustomer();
                            if (onNavigateToOrder) {
                              onNavigateToOrder(order.orderId || order._id);
                            }
                          }}
                          className="p-3 sm:p-4 bg-white hover:bg-forest-50/70 transition cursor-pointer group select-none"
                          title={`Click to view full details & logistics for ${order.orderId}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                <span className="font-bold text-forest-950 font-mono group-hover:text-forest-700 transition text-xs sm:text-sm">
                                  {order.orderId}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getOrderStatusBadgeClass(order.orderStatus)}`}>
                                  {formatOrderStatusName(order.orderStatus)}
                                </span>
                              </div>
                              <p className="text-[10px] sm:text-xs text-slate-400">
                                {new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })} • {order.items?.length || 0} item(s)
                              </p>
                            </div>

                            <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
                              <div className="text-right">
                                <span className="font-bold text-xs sm:text-sm text-forest-950 block font-mono">
                                  ₹{order.pricing?.totalAmount || 0}
                                </span>
                                <span className={`text-[10px] font-bold ${order.paymentInfo?.method === 'COD' ? 'text-amber-700' : 'text-emerald-700'}`}>
                                  {order.paymentInfo?.method} ({order.paymentInfo?.status})
                                </span>
                              </div>
                              <div className="p-1 sm:p-1.5 rounded-lg bg-slate-100 text-slate-400 group-hover:bg-forest-900 group-hover:text-gold-400 transition shadow-2xs">
                                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-500 text-center">
                      No orders placed by this customer yet.
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Centered Luxury Status Toggle Confirmation Modal */}
      <AdminConfirmModal
        isOpen={!!statusConfirm}
        title={statusConfirm?.newStatus ? 'Activate Customer Account' : 'Block Customer Account'}
        itemBadge={statusConfirm?.customer.email}
        itemName={statusConfirm?.customer.name}
        message={`Are you sure you want to ${statusConfirm?.newStatus ? 'activate' : 'block'} this customer account? ${statusConfirm?.newStatus ? 'The customer will regain access to login and place orders.' : 'The customer will be immediately blocked from logging in or placing new orders.'}`}
        confirmLabel={statusConfirm?.newStatus ? 'Yes, Activate Account' : 'Yes, Block Account'}
        cancelLabel="Cancel"
        variant={statusConfirm?.newStatus ? 'info' : 'warning'}
        isLoading={isUpdatingStatus}
        onClose={() => setStatusConfirm(null)}
        onConfirm={handleConfirmToggleStatus}
      />

      {/* Centered Luxury Delete Confirmation Modal */}
      <AdminConfirmModal
        isOpen={!!customerToDelete}
        title="Delete Customer Account"
        itemBadge={customerToDelete?.email}
        itemName={customerToDelete?.name}
        message="Are you sure you want to permanently delete this customer account? This will remove all their saved addresses, history, and access. This action cannot be undone."
        confirmLabel="Yes, Delete Customer"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeletingCustomer}
        onClose={() => setCustomerToDelete(null)}
        onConfirm={handleConfirmDeleteCustomer}
      />

      {/* Admin Send Notification Modal */}
      <AdminSendNotificationModal
        isOpen={!!notificationCustomer}
        onClose={() => setNotificationCustomer(null)}
        initialCustomer={notificationCustomer}
        onSuccess={fetchCustomers}
      />

    </div>
  );
};

