import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  Send,
  Users,
  User,
  Search,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  Clock,
  CheckCircle,
  AlertTriangle,
  Mail,
  Eye,
  X,
  Package,
  Sparkles,
  Inbox
} from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../store/useToastStore';
import { AdminPagination } from '../../components/common/AdminPagination';
import { AdminConfirmModal } from '../../components/common/AdminConfirmModal';
import { AdminSendNotificationModal } from '../../components/admin/AdminSendNotificationModal';

interface SentNotificationItem {
  _id: string;
  recipientType: 'BROADCAST' | 'USER';
  title: string;
  message: string;
  type: string;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  actionUrl?: string;
  userEmail?: string;
  user?: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
  };
  isRead?: boolean;
  readAt?: string;
  createdAt: string;
  sentByAdmin?: boolean;
}

const formatDateTime = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return dateStr;
  }
};

const formatTimeAgo = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
};

const getTypeBadge = (type: string) => {
  const t = (type || '').toUpperCase();
  if (t.includes('ORDER')) {
    return {
      label: t.replace(/_/g, ' '),
      className: 'bg-emerald-100 text-emerald-800 border-emerald-200'
    };
  }
  if (t.includes('CLAIM')) {
    return {
      label: t.replace(/_/g, ' '),
      className: 'bg-amber-100 text-amber-800 border-amber-200'
    };
  }
  if (t.includes('CANCEL')) {
    return {
      label: t.replace(/_/g, ' '),
      className: 'bg-rose-100 text-rose-800 border-rose-200'
    };
  }
  if (t.includes('REVIEW')) {
    return {
      label: t.replace(/_/g, ' '),
      className: 'bg-purple-100 text-purple-800 border-purple-200'
    };
  }
  if (t.includes('WELCOME')) {
    return {
      label: 'WELCOME',
      className: 'bg-gold-100 text-gold-900 border-gold-300'
    };
  }
  return {
    label: t ? t.replace(/_/g, ' ') : 'SYSTEM',
    className: 'bg-slate-100 text-slate-700 border-slate-200'
  };
};

export const AdminNotifications: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'announcement' | 'direct' | 'user'>('announcement');
  const [notifications, setNotifications] = useState<SentNotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Stats
  const [totalAnnouncements, setTotalAnnouncements] = useState(0);
  const [totalDirect, setTotalDirect] = useState(0);
  const [totalUserNotifications, setTotalUserNotifications] = useState(0);

  // Modals
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<SentNotificationItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewingItem, setViewingItem] = useState<SentNotificationItem | null>(null);

  // Bulk Clear All User Notifications Modal
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  // Reset to page 1 on search or tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  const fetchSentNotifications = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/notifications/admin/sent-history', {
        params: {
          tab: activeTab,
          page: currentPage,
          limit: pageSize,
          search: searchQuery.trim()
        }
      });

      if (res.data?.success) {
        setNotifications(res.data.notifications || []);
        setTotalItems(res.data.total || 0);
        setTotalAnnouncements(res.data.totalAnnouncements || 0);
        setTotalDirect(res.data.totalDirect || 0);
        setTotalUserNotifications(res.data.totalUserNotifications || 0);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch notifications', 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSentNotifications();
  }, [activeTab, currentPage, pageSize, searchQuery]);

  // Listen for realtime live deletion across all tabs/windows
  useEffect(() => {
    const handleLiveDeletion = (e: any) => {
      const deletedId = e.detail?.id;
      if (deletedId) {
        setNotifications((prev) => prev.filter((n) => n._id !== deletedId));
        setTotalItems((prev) => Math.max(0, prev - 1));
      }
      if (e.detail?.clearAllUserSide) {
        if (activeTab === 'user') {
          setNotifications([]);
          setTotalItems(0);
        }
        setTotalUserNotifications(0);
      }
    };
    window.addEventListener('novise:notification-deleted', handleLiveDeletion);
    return () => window.removeEventListener('novise:notification-deleted', handleLiveDeletion);
  }, [activeTab]);

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    const deletedId = itemToDelete._id;
    try {
      setIsDeleting(true);
      const res = await api.delete(`/notifications/admin/sent/${deletedId}`);
      if (res.data?.success) {
        toast.info('Notification record removed successfully', 'Deleted');
        setItemToDelete(null);
        // Instant optimistic update
        setNotifications((prev) => prev.filter((n) => n._id !== deletedId));
        setTotalItems((prev) => Math.max(0, prev - 1));
        if (activeTab === 'user') {
          setTotalUserNotifications((prev) => Math.max(0, prev - 1));
        } else if (activeTab === 'announcement') {
          setTotalAnnouncements((prev) => Math.max(0, prev - 1));
        } else if (activeTab === 'direct') {
          setTotalDirect((prev) => Math.max(0, prev - 1));
        }
        fetchSentNotifications();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete notification', 'Delete Error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearAllUserNotifications = async () => {
    try {
      setIsClearingAll(true);
      const res = await api.delete('/notifications/admin/sent/user-notifications/clear-all');
      if (res.data?.success) {
        toast.success(
          `All ${res.data.deletedCount || ''} customer & system notifications cleared successfully!`,
          'Notifications Cleared'
        );
        setIsClearAllModalOpen(false);
        setNotifications([]);
        setTotalItems(0);
        setTotalUserNotifications(0);
        fetchSentNotifications();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to clear user notifications', 'Clear Error');
    } finally {
      setIsClearingAll(false);
    }
  };

  return (
    <div className="space-y-6 w-full animate-fadeIn pb-12">
      {/* Top Banner Card */}
      <div className="bg-white p-5 sm:p-7 md:p-8 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-forest-900 text-gold-400 flex items-center justify-center shadow-xs shrink-0 aspect-square mt-0.5 sm:mt-0">
            <Bell className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-xl sm:text-2xl font-black text-forest-950 leading-tight">
              Sent Notifications & Broadcasts
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Manage and track store announcements, customer direct alerts, and incoming storefront activity.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={fetchSentNotifications}
            disabled={isLoading}
            className="p-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl transition shadow-xs cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsSendModalOpen(true)}
            className="px-4 py-2.5 bg-forest-950 hover:bg-forest-900 text-gold-400 font-bold text-xs rounded-xl transition shadow-md flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Send New Notification</span>
          </button>
        </div>
      </div>

      {/* Metrics Row (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Broadcasts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-forest-900/10 text-forest-950 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Store Announcements</p>
            <h3 className="text-2xl font-black text-forest-950 mt-0.5">{totalAnnouncements}</h3>
            <span className="text-[10px] text-emerald-600 font-bold">Broadcasted to all customers</span>
          </div>
        </div>

        {/* Card 2: Direct Messages */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Direct Admin Messages</p>
            <h3 className="text-2xl font-black text-forest-950 mt-0.5">{totalDirect}</h3>
            <span className="text-[10px] text-amber-700 font-bold">Individual customer alerts</span>
          </div>
        </div>

        {/* Card 3: User & System Activity */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-700 flex items-center justify-center shrink-0">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">User & System Feed</p>
            <h3 className="text-2xl font-black text-forest-950 mt-0.5">{totalUserNotifications}</h3>
            <span className="text-[10px] text-blue-700 font-bold">Orders, claims & activity</span>
          </div>
        </div>

        {/* Card 4: Real-Time & Retention */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Real-Time Delivery</p>
            <h3 className="text-2xl font-black text-emerald-700 mt-0.5">Instant</h3>
            <span className="text-[10px] text-slate-500 font-bold">0ms SSE cross-device sync</span>
          </div>
        </div>
      </div>

      {/* Main Card with Tabs & Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* 3 Tabs as requested */}
          <div className="flex items-center space-x-2 bg-slate-100/80 p-1 rounded-2xl self-start flex-wrap gap-y-1">
            <button
              onClick={() => setActiveTab('announcement')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center space-x-2 cursor-pointer ${activeTab === 'announcement'
                ? 'bg-forest-950 text-gold-400 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Users className="w-4 h-4" />
              <span>Announcements (Broadcasts)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeTab === 'announcement' ? 'bg-gold-400/20 text-gold-300' : 'bg-slate-200 text-slate-600'
                }`}>
                {totalAnnouncements}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('direct')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center space-x-2 cursor-pointer ${activeTab === 'direct'
                ? 'bg-forest-950 text-gold-400 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Mail className="w-4 h-4" />
              <span>Direct Customer Messages</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeTab === 'direct' ? 'bg-gold-400/20 text-gold-300' : 'bg-slate-200 text-slate-600'
                }`}>
                {totalDirect}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('user')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center space-x-2 cursor-pointer ${activeTab === 'user'
                ? 'bg-forest-950 text-gold-400 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Inbox className="w-4 h-4" />
              <span>User & System Notifications</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeTab === 'user' ? 'bg-gold-400/20 text-gold-300' : 'bg-slate-200 text-slate-600'
                }`}>
                {totalUserNotifications}
              </span>
            </button>
          </div>

          {/* Action Row: Clear All (for User Tab) + Search Bar */}
          <div className="flex items-center space-x-3 w-full lg:w-auto">
            {activeTab === 'user' && totalItems > 0 && (
              <button
                type="button"
                onClick={() => setIsClearAllModalOpen(true)}
                className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition flex items-center space-x-1.5 cursor-pointer shrink-0"
                title="Permanently remove all user & system activity notifications"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Activity</span>
              </button>
            )}

            {/* Search Bar */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={
                  activeTab === 'announcement'
                    ? "Search announcements..."
                    : activeTab === 'direct'
                      ? "Search customer email or title..."
                      : "Search user activity notifications..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-forest-900"
              />
            </div>
          </div>
        </div>

        {/* Table / List View */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-20 text-center">
              <RefreshCw className="w-7 h-7 text-forest-900 animate-spin mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading notification records...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-20 text-center px-4">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Bell className="w-6 h-6 text-slate-400" />
              </div>
              <h4 className="font-serif text-base font-bold text-slate-800">
                {activeTab === 'announcement'
                  ? 'No broadcast announcements found'
                  : activeTab === 'direct'
                    ? 'No direct customer messages found'
                    : 'No customer activity notifications found'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {activeTab === 'announcement'
                  ? 'Click "Send New Notification" above to broadcast an announcement or offer live to all storefront visitors.'
                  : activeTab === 'direct'
                    ? 'Click "Send New Notification" above to send a direct message to any individual customer email.'
                    : 'Customer activity (such as new orders, damage claims, cancellation requests, and reviews) will automatically arrive here in real time.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[10.5px] uppercase font-bold text-slate-500 tracking-wider">
                <tr>
                  <th className="py-3 px-4 sm:px-6">Title & Message</th>
                  {(activeTab === 'direct' || activeTab === 'user') && <th className="py-3 px-4">Customer</th>}
                  {activeTab === 'user' && <th className="py-3 px-4">Type</th>}
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Date & Time</th>
                  {activeTab === 'direct' && <th className="py-3 px-4">Status</th>}
                  <th className="py-3 px-4">Action Link</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {notifications.map((item) => {
                  const typeBadge = getTypeBadge(item.type);
                  return (
                    <tr key={item._id} className="hover:bg-slate-50/60 transition">
                      {/* Title & Message Preview */}
                      <td className="py-3.5 px-4 sm:px-6 max-w-xs sm:max-w-md">
                        <div className="flex items-start space-x-2.5">
                          <div className="w-7 h-7 rounded-lg bg-forest-900/10 text-forest-900 flex items-center justify-center shrink-0 mt-0.5">
                            {activeTab === 'announcement' ? (
                              <Users className="w-3.5 h-3.5" />
                            ) : activeTab === 'direct' ? (
                              <Mail className="w-3.5 h-3.5" />
                            ) : (
                              <Package className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-900 truncate">{item.title}</p>
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{item.message}</p>
                          </div>
                        </div>
                      </td>

                      {/* Customer Info (Direct or User Tab) */}
                      {(activeTab === 'direct' || activeTab === 'user') && (
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {item.user ? (
                            <div>
                              <span className="font-bold text-slate-800 text-xs block">{item.user.name || 'Customer'}</span>
                              <span className="font-mono text-[10.5px] text-slate-400">{item.user.email}</span>
                            </div>
                          ) : (
                            <span className="font-mono text-xs text-forest-950 font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                              {item.userEmail || 'Storefront Visitor'}
                            </span>
                          )}
                        </td>
                      )}

                      {/* Event / Notification Type Badge (User Tab) */}
                      {
                        activeTab === 'user' && (
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 border text-[10px] font-bold rounded-full uppercase ${typeBadge.className}`}>
                              {typeBadge.label}
                            </span>
                          </td>
                        )
                      }

                      {/* Priority Badge */}
                      <td className="py-3.5 px-4">
                        {item.priority === 'URGENT' ? (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-extrabold text-[10px] rounded-full uppercase">
                            Urgent
                          </span>
                        ) : item.priority === 'HIGH' ? (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-full uppercase">
                            Important
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold text-[10px] rounded-full uppercase">
                            Normal
                          </span>
                        )}
                      </td>

                      {/* Sent Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-slate-800 font-medium">{formatDateTime(item.createdAt)}</div>
                        <span className="text-[10px] text-slate-400">{formatTimeAgo(item.createdAt)}</span>
                      </td>

                      {/* Status (For Direct Tab) */}
                      {activeTab === 'direct' && (
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {item.isRead ? (
                            <span className="inline-flex items-center space-x-1 text-emerald-700 font-bold text-[11px]">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Read</span>
                            </span>
                          ) : (
                            <span className="text-amber-700 font-bold text-[11px]">Delivered</span>
                          )}
                        </td>
                      )}

                      {/* Action Deep Link */}
                      <td className="py-3.5 px-4">
                        {item.actionUrl ? (
                          <a
                            href={item.actionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-forest-900 hover:text-gold-700 font-mono text-[11px] font-bold flex items-center space-x-1 hover:underline"
                          >
                            <span className="truncate max-w-[120px]">{item.actionUrl}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-slate-300 italic text-[11px]">None</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingItem(item)}
                            className="p-1.5 text-slate-400 hover:text-forest-950 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="View Full Notification Message (Quick Box)"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setItemToDelete(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Delete notification record"
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
          )}
        </div>

        {/* Pagination Footer */}
        {totalItems > 0 && (
          <div className="p-4 border-t border-slate-100">
            <AdminPagination
              currentPage={currentPage}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="notifications"
            />
          </div>
        )}
      </div>

      {/* Admin Send Notification Modal */}
      < AdminSendNotificationModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        onSuccess={fetchSentNotifications}
      />

      {/* View Message Details Modal ("Short Box") */}
      {viewingItem && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity"
            onClick={() => setViewingItem(null)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 sm:p-7 space-y-4 z-10 my-auto animate-scaleIn">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-2xl bg-forest-950 text-gold-400 flex items-center justify-center shrink-0">
                    {viewingItem.recipientType === 'BROADCAST' ? (
                      <Users className="w-5 h-5" />
                    ) : viewingItem.sentByAdmin ? (
                      <Mail className="w-5 h-5" />
                    ) : (
                      <Package className="w-5 h-5" />
                    )}
                  </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-serif text-base font-bold text-forest-950 truncate">{viewingItem.title}</h3>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                        <span>{formatDateTime(viewingItem.createdAt)}</span>
                        <span>•</span>
                        <span>{formatTimeAgo(viewingItem.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewingItem(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-800 cursor-pointer shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* Type and Priority Bar */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type:</span>
                      <span className={`px-2 py-0.5 border text-[10px] font-bold rounded-full uppercase ${getTypeBadge(viewingItem.type).className}`}>
                        {getTypeBadge(viewingItem.type).label}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Priority:</span>
                      {viewingItem.priority === 'URGENT' ? (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-extrabold text-[10px] rounded-full uppercase">
                          Urgent
                        </span>
                      ) : viewingItem.priority === 'HIGH' ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-full uppercase">
                          Important
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-700 font-semibold text-[10px] rounded-full uppercase">
                          Normal
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Target / Customer info */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {viewingItem.recipientType === 'BROADCAST' ? 'Target Audience' : 'Customer Account'}
                    </span>
                      <span className="font-bold text-slate-800 block break-words">
                        {viewingItem.recipientType === 'BROADCAST' ? (
                          '🌐 All Storefront Customers & Visitors (Store-Wide)'
                        ) : viewingItem.user ? (
                          `👤 ${viewingItem.user.name || 'Customer'} (${viewingItem.user.email})`
                        ) : (
                          `👤 ${viewingItem.userEmail || 'Customer'}`
                        )}
                      </span>
                  </div>

                  {/* Message Details */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Notification Message Details
                    </span>
                    <p className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-800 leading-relaxed whitespace-pre-wrap font-sans text-xs">
                      {viewingItem.message}
                    </p>
                  </div>

                  {/* Action Link if available */}
                  {viewingItem.actionUrl && (
                    <div className="p-3 rounded-xl bg-forest-900/5 border border-forest-900/15 flex items-center justify-between">
                      <div className="min-w-0 flex-1 mr-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Deep Link Target</span>
                        <span className="font-mono text-xs text-forest-950 font-bold truncate block">{viewingItem.actionUrl}</span>
                      </div>
                      <a
                        href={viewingItem.actionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-forest-900 hover:bg-forest-800 text-gold-400 font-bold rounded-lg text-xs flex items-center space-x-1 shrink-0"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      const item = viewingItem;
                      setViewingItem(null);
                      setItemToDelete(item);
                    }}
                    className="px-3 py-2 text-rose-600 hover:bg-rose-50 font-bold rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Notification</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewingItem(null)}
                    className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>,
            document.body
      )}

            {/* Delete Single Item Confirmation Modal */}
            <AdminConfirmModal
              isOpen={!!itemToDelete}
              title="Delete Notification Record"
              itemBadge={
                itemToDelete?.recipientType === 'BROADCAST'
                  ? 'Broadcast'
                  : itemToDelete?.userEmail || itemToDelete?.user?.email || 'Notification'
              }
              itemName={itemToDelete?.title}
              message="Are you sure you want to permanently delete this notification record? It will be removed immediately from both the hub and active customer notification feeds."
              confirmLabel="Yes, Delete Record"
              cancelLabel="Cancel"
              variant="danger"
              isLoading={isDeleting}
              onClose={() => setItemToDelete(null)}
              onConfirm={handleDeleteConfirm}
            />

            {/* Clear All User & System Notifications Confirmation Modal */}
            <AdminConfirmModal
              isOpen={isClearAllModalOpen}
              title="Clear All User & System Notifications"
              itemBadge={`Total: ${totalUserNotifications}`}
              itemName="All Customer Activity Notifications"
              message="Are you sure you want to permanently delete ALL customer and system notifications (orders, claims, cancellations, reviews)? Admin-sent announcements and direct messages will NOT be deleted."
              confirmLabel="Yes, Clear All Activity"
              cancelLabel="Cancel"
              variant="danger"
              isLoading={isClearingAll}
              onClose={() => setIsClearAllModalOpen(false)}
              onConfirm={handleClearAllUserNotifications}
            />
          </div>
          );
};
