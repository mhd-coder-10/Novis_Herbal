import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  Volume2,
  VolumeX,
  Package,
  Truck,
  AlertTriangle,
  AlertCircle,
  Star,
  CheckCircle,
  Clock,
  ExternalLink,
  X
} from 'lucide-react';
import { useNotificationStore } from '../../store/useNotificationStore';
import type { NotificationItem } from '../../types';

interface AdminNotificationDropdownProps {
  onSelectTab: (tabId: string) => void;
}

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

const getAdminIcon = (type: string) => {
  switch (type) {
    case 'NEW_ORDER':
      return <Package className="w-4 h-4 text-emerald-600" />;
    case 'CANCEL_REQUEST_SUBMITTED':
    case 'ORDER_CANCELLED':
      return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    case 'COMPLAINT_SUBMITTED':
      return <AlertCircle className="w-4 h-4 text-rose-600" />;
    case 'LOW_STOCK':
      return <AlertTriangle className="w-4 h-4 text-rose-500" />;
    case 'NEW_REVIEW':
      return <Star className="w-4 h-4 text-gold-500" />;
    case 'ORDER_DISPATCHED':
      return <Truck className="w-4 h-4 text-sky-600" />;
    case 'ORDER_DELIVERED':
      return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    default:
      return <Bell className="w-4 h-4 text-forest-700" />;
  }
};

export const AdminNotificationDropdown: React.FC<AdminNotificationDropdownProps> = ({ onSelectTab }) => {
  const {
    adminNotifications,
    adminUnreadCount,
    isAdminLoading,
    isAdminDropdownOpen,
    toggleAdminDropdown,
    closeAdminDropdown,
    soundEnabled,
    toggleSound,
    markAdminRead,
    markAllAdminRead,
    clearAdminRead,
    fetchAdminNotifications
  } = useNotificationStore();

  const [filter, setFilter] = useState<'all' | 'orders' | 'inventory'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch admin notifications on mount
  useEffect(() => {
    fetchAdminNotifications();
  }, [fetchAdminNotifications]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeAdminDropdown();
      }
    };

    if (isAdminDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAdminDropdownOpen, closeAdminDropdown]);

  // Isolate wheel scrolling so background admin dashboard never scrolls when rolling wheel inside dropdown
  useEffect(() => {
    const panel = dropdownRef.current;
    if (!panel || !isAdminDropdownOpen) return;

    const handleWheel = (e: WheelEvent) => {
      const scrollContainer = panel.querySelector('.admin-notification-scroll-container') as HTMLElement | null;
      if (!scrollContainer) {
        e.preventDefault();
        return;
      }

      const isScrollable = scrollContainer.scrollHeight > scrollContainer.clientHeight;
      if (!isScrollable) {
        e.preventDefault();
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const atTop = scrollTop <= 0 && e.deltaY < 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight && e.deltaY > 0;

      if (atTop || atBottom) {
        e.preventDefault();
      }
    };

    panel.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      panel.removeEventListener('wheel', handleWheel);
    };
  }, [isAdminDropdownOpen]);

  const filtered = adminNotifications.filter((n) => {
    if (filter === 'orders') {
      return (
        n.type.startsWith('ORDER_') ||
        n.type.startsWith('CANCEL_') ||
        n.type.startsWith('COMPLAINT_') ||
        n.type === 'NEW_ORDER'
      );
    }
    if (filter === 'inventory') {
      return n.type === 'LOW_STOCK' || n.type === 'NEW_REVIEW' || n.type.startsWith('PRODUCT_');
    }
    return true;
  });

  const handleItemClick = (item: NotificationItem) => {
    if (!item.isRead) {
      markAdminRead(item._id);
    }
    closeAdminDropdown();

    // Map action to admin tab
    if (
      item.type === 'NEW_ORDER' ||
      item.type.startsWith('ORDER_') ||
      item.type.startsWith('CANCEL_') ||
      item.type.startsWith('COMPLAINT_')
    ) {
      onSelectTab('orders');
    } else if (item.type === 'LOW_STOCK' || item.type.startsWith('PRODUCT_')) {
      onSelectTab('products');
    } else if (item.type === 'NEW_REVIEW') {
      onSelectTab('reviews');
    } else {
      onSelectTab('dashboard');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={toggleAdminDropdown}
        className="relative p-2 sm:p-2.5 rounded-xl bg-white border border-slate-200/90 text-forest-950 hover:bg-forest-900/5 transition shadow-xs flex items-center justify-center cursor-pointer group"
        title="Store Notifications"
        aria-label="Admin Notifications"
      >
        <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-forest-950 group-hover:scale-105 transition-transform" />
        {adminUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-amber-600 text-white font-extrabold text-[9px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-xs animate-pulse">
            {adminUnreadCount > 9 ? '9+' : adminUnreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isAdminDropdownOpen && (
          <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-full sm:mt-2 w-[calc(100vw-16px)] sm:w-96 max-w-sm bg-white rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_rgba(7,38,23,0.2)] border border-slate-200/90 z-50 animate-fadeIn overflow-hidden flex flex-col max-h-[85vh] overscroll-contain">
            {/* Header */}
            <div className="p-3.5 sm:p-4 bg-forest-950 text-white flex items-center justify-between border-b border-forest-900/40">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-gold-500/20 text-gold-400 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-sm sm:text-base font-bold text-white leading-tight">
                    Store Notifications
                  </h3>
                  <p className="text-[10px] text-slate-300">
                    {adminUnreadCount > 0 ? `${adminUnreadCount} unread alert${adminUnreadCount > 1 ? 's' : ''}` : 'All caught up'}
                  </p>
                </div>
              </div>

              {/* Sound Toggle & Close */}
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={toggleSound}
                  className={`p-1.5 rounded-lg text-xs transition ${soundEnabled
                      ? 'bg-gold-500/20 text-gold-400 hover:bg-gold-500/30'
                      : 'bg-white/10 text-slate-400 hover:bg-white/20'
                    }`}
                  title={soundEnabled ? 'Chime sound enabled (click to mute)' : 'Chime sound muted (click to enable)'}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>

                <button
                  onClick={closeAdminDropdown}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Filter Pills + Action Buttons */}
            <div className="px-3 py-2 bg-stone-50 border-b border-stone-200/80 flex items-center justify-between gap-1 text-[11px]">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${filter === 'all'
                      ? 'bg-forest-950 text-white'
                      : 'text-stone-600 hover:bg-stone-200/60'
                    }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('orders')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${filter === 'orders'
                      ? 'bg-forest-950 text-white'
                      : 'text-stone-600 hover:bg-stone-200/60'
                    }`}
                >
                  Orders
                </button>
                <button
                  onClick={() => setFilter('inventory')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${filter === 'inventory'
                      ? 'bg-forest-950 text-white'
                      : 'text-stone-600 hover:bg-stone-200/60'
                    }`}
                >
                  Alerts
                </button>
              </div>

              <div className="flex items-center space-x-1">
                {adminUnreadCount > 0 && (
                  <button
                    onClick={markAllAdminRead}
                    className="px-2 py-1 text-forest-900 hover:bg-forest-900/10 rounded-md font-bold transition text-[10.5px] flex items-center space-x-1"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3 h-3" />
                    <span>Mark read</span>
                  </button>
                )}
                {adminNotifications.some((n) => n.isRead) && (
                  <button
                    onClick={clearAdminRead}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                    title="Clear read notifications"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* List Area */}
              <div className="admin-notification-scroll-container flex-1 overflow-y-auto p-2 sm:p-2.5 space-y-2 no-scrollbar bg-[#FAF8F5] overscroll-contain">
                {isAdminLoading && adminNotifications.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">Loading alerts...</div>
                ) : filtered.length === 0 ? (
                  <div className="py-12 text-center px-4">
                    <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-2 text-stone-400">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <p className="text-xs font-bold text-stone-800">No pending notifications</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">Everything is up-to-date in your store.</p>
                  </div>
                ) : (
                  filtered.map((item) => (
                    <div
                      key={item._id}
                      onClick={() => handleItemClick(item)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer relative group ${item.isRead
                          ? 'bg-white border-stone-200/80 hover:border-forest-900/30'
                          : 'bg-gradient-to-r from-amber-50/80 to-white border-amber-300 shadow-xs hover:shadow-md'
                        }`}
                    >
                      {/* Unread indicator */}
                      {!item.isRead && (
                        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-600 shadow-xs" />
                      )}

                      <div className="flex items-start space-x-2.5 pr-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.isRead ? 'bg-stone-100 text-stone-600' : 'bg-white border border-amber-200'
                            }`}
                        >
                          {getAdminIcon(item.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span
                              className={`text-xs font-bold truncate ${item.isRead ? 'text-stone-800' : 'text-forest-950 font-black'
                                }`}
                            >
                              {item.title}
                            </span>

                            {item.priority === 'URGENT' && (
                              <span className="text-[9px] font-black uppercase bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded shrink-0">
                                Urgent
                              </span>
                            )}
                            {item.priority === 'HIGH' && (
                              <span className="text-[9px] font-bold uppercase bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded shrink-0">
                                Action
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-stone-600 leading-snug line-clamp-2 mb-1.5">
                            {item.message}
                          </p>

                          <div className="flex items-center justify-between text-[9.5px] text-stone-400">
                            <span className="flex items-center space-x-1">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{formatTimeAgo(item.createdAt)}</span>
                            </span>

                            <span className="inline-flex items-center space-x-1 text-forest-900 font-bold group-hover:translate-x-0.5 transition-transform">
                              <span>Open Tab</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer note */}
              <div className="p-2 border-t border-stone-200/80 bg-white text-center">
                <span className="text-[9.5px] text-stone-400 font-medium">
                  Novis Admin Center • Real-Time Store Sync
                </span>
              </div>
            </div>
      )}
          </div>
          );
};

