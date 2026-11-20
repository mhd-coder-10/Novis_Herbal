import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  Package,
  Truck,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  ShoppingBag,
  Clock,
  ExternalLink,
  X,
  Trash2,
  ArrowRight
} from 'lucide-react';
import { useNotificationStore, isNotificationActive } from '../../store/useNotificationStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { NotificationItem } from '../../types';

interface PublicNotificationDropdownProps {
  onNavigate: (page: string, param?: string) => void;
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

const getCustomerIcon = (type: string) => {
  switch (type) {
    case 'STOCK_UPDATE':
    case 'BACK_IN_STOCK':
      return <ShoppingBag className="w-4 h-4 text-emerald-600" />;
    case 'PRODUCT_LAUNCH':
    case 'NEW_PRODUCT':
      return <Sparkles className="w-4 h-4 text-gold-500" />;
    case 'ORDER_DISPATCHED':
      return <Truck className="w-4 h-4 text-amber-600" />;
    case 'ORDER_DELIVERED':
      return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    case 'ORDER_CONFIRMED':
    case 'ORDER_PLACED':
      return <Package className="w-4 h-4 text-forest-800" />;
    case 'ORDER_CANCELLED':
    case 'CANCEL_REQUEST_APPROVED':
    case 'CANCEL_REQUEST_REJECTED':
      return <AlertCircle className="w-4 h-4 text-rose-600" />;
    case 'COMPLAINT_UPDATE':
    case 'COMPLAINT_SUBMITTED':
      return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    default:
      return <Bell className="w-4 h-4 text-forest-700" />;
  }
};

export const PublicNotificationDropdown: React.FC<PublicNotificationDropdownProps> = ({ onNavigate }) => {
  const { isAuthenticated } = useAuthStore();
  const {
    notifications,
    unreadCount,
    isLoading,
    isDrawerOpen,
    isGuestPromptOpen,
    toggleDrawer,
    closeDrawer,
    closeGuestPrompt,
    markUserRead,
    markAllUserRead,
    removeUserNotification,
    clearAllUserNotifications
  } = useNotificationStore();

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeDrawer();
      }
    };

    if (isDrawerOpen || isGuestPromptOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDrawerOpen, isGuestPromptOpen, closeDrawer]);

  // Isolate wheel scrolling so background page never scrolls when rolling wheel inside dropdown
  useEffect(() => {
    const panel = dropdownRef.current;
    if (!panel || !isDrawerOpen || !isAuthenticated) return;

    const handleWheel = (e: WheelEvent) => {
      const scrollContainer = panel.querySelector('.notification-scroll-container') as HTMLElement | null;
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
  }, [isDrawerOpen]);

  const activeNotifications = notifications.filter(isNotificationActive);

  const handleItemClick = (item: NotificationItem) => {
    if (!item.isRead) {
      markUserRead(item._id);
    }
    closeDrawer();

    if (item.actionUrl) {
      if (item.actionUrl.startsWith('/shop')) {
        onNavigate('shop');
      } else if (item.actionUrl.startsWith('/my-orders')) {
        onNavigate('my-orders');
      } else if (item.actionUrl.startsWith('/product/')) {
        const param = item.actionUrl.replace('/product/', '');
        onNavigate('product-detail', param);
      } else if (item.actionUrl.startsWith('/')) {
        onNavigate(item.actionUrl.replace('/', ''));
      }
      return;
    }

    if (
      item.type.startsWith('ORDER_') ||
      item.type.startsWith('CANCEL_') ||
      item.type.startsWith('COMPLAINT_')
    ) {
      onNavigate('my-orders');
    } else if (item.type === 'STOCK_UPDATE' || item.type === 'BACK_IN_STOCK' || item.type === 'PRODUCT_LAUNCH') {
      if (item.data?.slug) {
        onNavigate('product-detail', String(item.data.slug));
      } else {
        onNavigate('shop');
      }
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button in Navbar (Desktop & Mobile) */}
      <button
        onClick={toggleDrawer}
        className="p-2 transition rounded-full hover:bg-black/5 relative shrink-0 text-forest-950 hover:text-amber-600 cursor-pointer"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell className="w-5 h-5 transition-transform group-hover:scale-105" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-amber-600 text-white font-extrabold text-[9px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Guest Login / Signup Prompt Popover */}
      {!isAuthenticated && isGuestPromptOpen && (
        <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-full sm:mt-2 w-[calc(100vw-16px)] sm:w-88 max-w-sm bg-white rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_rgba(7,38,23,0.22)] border border-stone-200/90 z-50 animate-fadeIn overflow-hidden flex flex-col p-5">
          {/* Close Button */}
          <button
            onClick={closeGuestPrompt}
            className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
            aria-label="Close notification prompt"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Luxury Botanical Graphic */}
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-gold-400/20 to-emerald-500/10 border border-amber-300/40 flex items-center justify-center text-amber-600 mx-auto mb-3 shadow-xs">
            <Bell className="w-6.5 h-6.5 text-amber-600 animate-bounce" />
          </div>

          {/* Exact Required Message */}
          <h3 className="font-serif text-base sm:text-lg font-bold text-forest-950 text-center leading-snug px-1">
            Please login to access your notifications.
          </h3>

          <p className="text-xs text-stone-500 text-center mt-2 leading-relaxed px-1">
            Log in or create an account to view your order updates, delivery status, and exclusive announcements.
          </p>

          {unreadCount > 0 && (
            <div className="mt-3.5 py-1.5 px-3 bg-amber-50/90 border border-amber-200/80 rounded-xl flex items-center justify-center space-x-2 text-[11px] font-bold text-amber-900">
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
              <span>You have {unreadCount} new update{unreadCount > 1 ? 's' : ''} waiting</span>
            </div>
          )}

          {/* Action CTA: Sign In / Sign Up */}
          <div className="w-full mt-4 bg-gradient-to-r from-forest-950 via-forest-900 to-forest-950 rounded-xl p-1 shadow-md border border-forest-800/80 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                closeDrawer();
                onNavigate('login');
              }}
              className="flex-1 py-2 px-3 text-center text-white hover:text-gold-300 font-black text-xs uppercase tracking-wider rounded-lg hover:bg-white/10 active:bg-white/15 transition-all flex items-center justify-center cursor-pointer"
              title="Sign In / Login"
            >
              <span>Sign In</span>
            </button>

            <span className="text-white/40 font-bold text-xs select-none px-1">/</span>

            <button
              type="button"
              onClick={() => {
                closeDrawer();
                onNavigate('login', 'register');
              }}
              className="flex-1 py-2 px-3 text-center text-white hover:text-gold-300 font-black text-xs uppercase tracking-wider rounded-lg hover:bg-white/10 active:bg-white/15 transition-all flex items-center justify-center space-x-1 cursor-pointer"
              title="Sign Up / Register"
            >
              <span>Sign Up</span>
              <ArrowRight className="w-3.5 h-3.5 text-gold-400" />
            </button>
          </div>

          {/* Subtle Luxury Footer */}
          <div className="mt-4 pt-3 border-t border-stone-100 text-center">
            <span className="text-[10px] text-stone-400 font-medium">
              Novis Herbal • Real-Time Botanical Notifications
            </span>
          </div>
        </div>
      )}

      {/* Floating Popover Dropdown Panel (Only for Authenticated Users) */}
      {isAuthenticated && isDrawerOpen && (
        <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-full sm:mt-2 w-[calc(100vw-16px)] sm:w-96 max-w-sm bg-white rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_rgba(7,38,23,0.22)] border border-stone-200/90 z-50 animate-fadeIn overflow-hidden flex flex-col max-h-[85vh] overscroll-contain">
          {/* Luxury Forest Green Header */}
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
                  {unreadCount > 0 ? `${unreadCount} unread update${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={closeDrawer}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              aria-label="Close notifications"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action Bar */}
          <div className="px-3.5 py-2 bg-stone-50 border-b border-stone-200/80 flex items-center justify-between gap-1 text-[11px]">
            <span className="font-bold text-stone-700 text-[11px]">
              All Notifications ({activeNotifications.length})
            </span>

            <div className="flex items-center space-x-1.5 shrink-0">
              {unreadCount > 0 && (
                <button
                  onClick={markAllUserRead}
                  className="px-2 py-1 text-forest-900 hover:bg-forest-900/10 rounded-md font-bold transition text-[10.5px] flex items-center space-x-1 cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3 h-3" />
                  <span>Mark read</span>
                </button>
              )}

              {activeNotifications.length > 0 && (
                <button
                  onClick={clearAllUserNotifications}
                  className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded-md font-bold transition text-[10.5px] flex items-center space-x-1 cursor-pointer"
                  title="Clear all notifications"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear all</span>
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Notifications List */}
          <div className="notification-scroll-container flex-1 overflow-y-auto p-2 sm:p-2.5 space-y-2 no-scrollbar bg-[#FAF8F5] overscroll-contain">
            {isLoading && notifications.length === 0 ? (
              <div className="py-12 text-center text-xs text-stone-500">Checking notifications...</div>
            ) : activeNotifications.length === 0 ? (
              <div className="py-12 text-center px-4">
                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-2 text-stone-400">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-xs font-bold text-stone-800">No notifications right now</p>
                <p className="text-[11px] text-stone-500 mt-0.5 max-w-xs mx-auto">
                  When you place orders, track shipments, or when new stock arrives, you'll see alerts here in real-time.
                </p>
              </div>
            ) : (
              activeNotifications.map((item) => (
                <div
                  key={item._id}
                  onClick={() => handleItemClick(item)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer relative group ${item.isRead
                    ? 'bg-white border-stone-200/80 hover:border-forest-900/30'
                    : 'bg-gradient-to-r from-amber-50/80 to-white border-amber-300 shadow-xs hover:shadow-md'
                    }`}
                >
                  {/* Unread indicator dot */}
                  {!item.isRead && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-600 shadow-xs" />
                  )}

                  <div className="flex items-start space-x-2.5 pr-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.isRead ? 'bg-stone-100 text-stone-600' : 'bg-white border border-amber-200'
                        }`}
                    >
                      {getCustomerIcon(item.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span
                          className={`text-xs font-bold truncate ${item.isRead ? 'text-stone-800' : 'text-forest-950 font-black'
                            }`}
                        >
                          {item.title}
                        </span>
                      </div>

                      <p className="text-[11px] text-stone-600 leading-snug line-clamp-2 mb-1.5">
                        {item.message}
                      </p>

                      <div className="flex items-center justify-between text-[9.5px] text-stone-400">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{formatTimeAgo(item.createdAt)}</span>
                        </span>

                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeUserNotification(item._id);
                            }}
                            className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                            title="Remove notification"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <span className="inline-flex items-center space-x-1 text-forest-900 font-bold group-hover:translate-x-0.5 transition-transform">
                            <span>View</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Luxury Footer */}
          <div className="p-2 border-t border-stone-200/80 bg-white text-center">
            <span className="text-[9.5px] text-stone-400 font-medium">
              Novis Herbal • Real-Time Botanical Notifications
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
