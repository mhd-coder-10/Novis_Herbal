import { create } from 'zustand';
import api from '../services/api';
import type { NotificationItem } from '../types';
import { emitLiveEvent } from '../services/realtimeSync';
import { useAuthStore } from './useAuthStore';

// Local storage keys for cross-session & guest persistence
const STORAGE_DISMISSED_KEY = 'novise_dismissed_notifications';
const STORAGE_CLEARED_AT_KEY = 'novise_all_notifications_cleared_at';
const STORAGE_GUEST_READS_KEY = 'novise_guest_notification_reads';
export const STORAGE_ALL_READ_AT_KEY = 'novise_device_all_read_at';

export const getDeviceAllReadAt = (): number => {
  if (typeof window === 'undefined') return 0;
  try {
    return Number(localStorage.getItem(STORAGE_ALL_READ_AT_KEY) || 0);
  } catch {
    return 0;
  }
};

export const setDeviceAllReadAt = (ts: number = Date.now()) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_ALL_READ_AT_KEY, String(ts));
  } catch { }
};

const getScopedKey = (baseKey: string): string => {
  const user = useAuthStore.getState().user;
  const email = user?.email?.toLowerCase().trim();
  return email ? `${baseKey}_${email}` : `${baseKey}_guest`;
};

export const getDismissedIds = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const set = new Set<string>();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_DISMISSED_KEY)) {
        try {
          const raw = localStorage.getItem(key);
          const list: string[] = raw ? JSON.parse(raw) : [];
          list.forEach((id) => set.add(String(id).trim()));
        } catch { }
      }
    }
    return Array.from(set);
  } catch {
    return [];
  }
};

export const addDismissedId = (id: string) => {
  if (typeof window === 'undefined' || !id) return;
  try {
    const cleanId = String(id).trim();
    // 1. Add to global device storage
    const globalRaw = localStorage.getItem(STORAGE_DISMISSED_KEY);
    const globalList: string[] = globalRaw ? JSON.parse(globalRaw) : [];
    if (!globalList.includes(cleanId)) {
      globalList.push(cleanId);
      localStorage.setItem(STORAGE_DISMISSED_KEY, JSON.stringify(globalList));
    }
    // 2. Add to user scoped storage
    const scopedKey = getScopedKey(STORAGE_DISMISSED_KEY);
    const scopedRaw = localStorage.getItem(scopedKey);
    const scopedList: string[] = scopedRaw ? JSON.parse(scopedRaw) : [];
    if (!scopedList.includes(cleanId)) {
      scopedList.push(cleanId);
      localStorage.setItem(scopedKey, JSON.stringify(scopedList));
    }
    // 3. Also mark as read in device map so it can never appear unread
    setGuestRead(cleanId, new Date().toISOString());
  } catch { }
};

export const getClearedAtTimestamp = (): number => {
  if (typeof window === 'undefined') return 0;
  try {
    let maxTs = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_CLEARED_AT_KEY)) {
        const val = Number(localStorage.getItem(key) || 0);
        if (val > maxTs) maxTs = val;
      }
    }
    return maxTs;
  } catch {
    return 0;
  }
};

export const setClearedAtTimestamp = (ts: number) => {
  if (typeof window === 'undefined') return;
  try {
    // Save to both global device storage and scoped storage
    localStorage.setItem(STORAGE_CLEARED_AT_KEY, String(ts));
    localStorage.setItem(getScopedKey(STORAGE_CLEARED_AT_KEY), String(ts));
  } catch { }
};

export const getGuestReadMap = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  try {
    const combined: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_GUEST_READS_KEY)) {
        try {
          const raw = localStorage.getItem(key);
          const map: Record<string, string> = raw ? JSON.parse(raw) : {};
          Object.assign(combined, map);
        } catch { }
      }
    }
    return combined;
  } catch {
    return {};
  }
};

export const setGuestRead = (id: string, readAtIso: string) => {
  if (typeof window === 'undefined' || !id) return;
  try {
    const map = getGuestReadMap();
    const cleanId = String(id).trim();
    map[cleanId] = readAtIso;
    localStorage.setItem(STORAGE_GUEST_READS_KEY, JSON.stringify(map));
  } catch { }
};

export const setMultipleGuestReads = (ids: (string | undefined)[], readAtIso: string) => {
  if (typeof window === 'undefined' || !ids || ids.length === 0) return;
  try {
    const map = getGuestReadMap();
    let changed = false;
    ids.forEach((id) => {
      if (id) {
        const cleanId = String(id).trim();
        map[cleanId] = readAtIso;
        changed = true;
      }
    });
    if (changed) {
      localStorage.setItem(STORAGE_GUEST_READS_KEY, JSON.stringify(map));
    }
  } catch { }
};

/**
 * 24-Hour Auto-Removal & Timing Rules:
 * 1. Dismissed or cleared notifications on this device/account are excluded (persists across logout/login).
 * 2. Broadcast announcements created before a registered customer joined are strictly filtered out.
 * 3. If notification is unread, it NEVER expires!
 * 4. If notification is read, it automatically expires and is removed exactly 24 hours after readAt.
 */
export const isNotificationActive = (n: NotificationItem): boolean => {
  const id = String(n._id || (n as any).id || '').trim();

  // 1. Check if explicitly dismissed on this browser/device
  const dismissedIds = getDismissedIds();
  if (dismissedIds.includes(id) || (n._id && dismissedIds.includes(n._id))) {
    return false;
  }

  // 2. Check if all notifications were cleared before this notification was created
  const clearedAt = getClearedAtTimestamp();
  if (clearedAt > 0 && n.createdAt) {
    const notifTime = new Date(n.createdAt).getTime();
    if (notifTime <= clearedAt) {
      return false;
    }
  }

  // 3. For logged-in customer: broadcast announcements created before customer registered are dropped
  if (n.recipientType === 'BROADCAST') {
    const user = useAuthStore.getState().user;
    if (user?.createdAt && n.createdAt) {
      const userJoined = new Date(user.createdAt).getTime() - 5000;
      const notifTime = new Date(n.createdAt).getTime();
      if (notifTime < userJoined) {
        return false;
      }
    }
  }

  // 4. 24-Hour read auto-removal check
  const deviceAllReadAt = getDeviceAllReadAt();
  const guestReads = getGuestReadMap();
  const localReadAt = guestReads[id] || (n._id && guestReads[n._id]);
  const notifTime = n.createdAt ? new Date(n.createdAt).getTime() : 0;
  const isReadByDeviceCutoff = deviceAllReadAt > 0 && notifTime > 0 && notifTime <= deviceAllReadAt;

  const effectiveReadAt = n.readAt || localReadAt || (isReadByDeviceCutoff ? new Date(deviceAllReadAt).toISOString() : null);
  const isEffectivelyRead = n.isRead || Boolean(localReadAt) || isReadByDeviceCutoff;

  if (!isEffectivelyRead || !effectiveReadAt) return true;
  const readTime = new Date(effectiveReadAt).getTime();
  if (isNaN(readTime)) return true;
  const diffMs = Date.now() - readTime;
  return diffMs < 24 * 60 * 60 * 1000;
};

interface NotificationState {
  // Customer State
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  isDrawerOpen: boolean;
  isGuestPromptOpen: boolean;

  // Admin State
  adminNotifications: NotificationItem[];
  adminUnreadCount: number;
  isAdminLoading: boolean;
  isAdminDropdownOpen: boolean;
  soundEnabled: boolean;

  // Actions - Customer
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  openGuestPrompt: () => void;
  closeGuestPrompt: () => void;
  fetchUserNotifications: (email?: string) => Promise<void>;
  markUserRead: (id: string) => Promise<void>;
  markAllUserRead: () => Promise<void>;
  removeUserNotification: (id: string) => Promise<void>;
  clearAllUserNotifications: () => Promise<void>;
  handleIncomingNotification: (notification: NotificationItem) => void;

  // Actions - Admin
  openAdminDropdown: () => void;
  closeAdminDropdown: () => void;
  toggleAdminDropdown: () => void;
  toggleSound: () => void;
  fetchAdminNotifications: () => Promise<void>;
  markAdminRead: (id: string) => Promise<void>;
  markAllAdminRead: () => Promise<void>;
  clearAdminRead: () => Promise<void>;
  handleIncomingAdminNotification: (notification: NotificationItem) => void;

  // Real-Time Global Sync & Auto-Expiry Actions
  handleNotificationDeleted: (id: string) => void;
  purgeExpiredNotifications: () => void;
}

// Gentle pleasant luxury audio chime using native Web Audio API (0 external dependencies)
const playChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Gentle high bell note (880Hz -> 1320Hz harmonic)
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    // Silent fail if autoplay blocked
  }
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  // Customer State
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isDrawerOpen: false,
  isGuestPromptOpen: false,

  // Admin State
  adminNotifications: [],
  adminUnreadCount: 0,
  isAdminLoading: false,
  isAdminDropdownOpen: false,
  soundEnabled: typeof window !== 'undefined' ? localStorage.getItem('novise_notification_sound') !== 'false' : true,

  // Customer Actions
  openDrawer: () => {
    const isAuth = useAuthStore.getState().isAuthenticated;
    if (isAuth) {
      set({ isDrawerOpen: true, isGuestPromptOpen: false });
    } else {
      set({ isDrawerOpen: false, isGuestPromptOpen: true });
    }
  },
  closeDrawer: () => set({ isDrawerOpen: false, isGuestPromptOpen: false }),
  toggleDrawer: () => {
    const isAuth = useAuthStore.getState().isAuthenticated;
    if (isAuth) {
      set((state) => ({ isDrawerOpen: !state.isDrawerOpen, isGuestPromptOpen: false }));
    } else {
      set((state) => ({ isDrawerOpen: false, isGuestPromptOpen: !state.isGuestPromptOpen }));
    }
  },
  openGuestPrompt: () => set({ isDrawerOpen: false, isGuestPromptOpen: true }),
  closeGuestPrompt: () => set({ isGuestPromptOpen: false }),

  fetchUserNotifications: async (email?: string) => {
    try {
      set({ isLoading: true });
      const authUser = useAuthStore.getState().user;
      const effectiveEmail = email || authUser?.email;

      // Guest users (no email, not authenticated) should NOT fetch notifications
      // They only see the bell icon + login prompt, never the notification list
      if (!effectiveEmail && !authUser) {
        set({ notifications: [], unreadCount: 0, isLoading: false });
        return;
      }

      const params = effectiveEmail ? { email: effectiveEmail } : {};
      const res = await api.get('/notifications/user', { params });
      if (res.data?.success) {
        const rawList: NotificationItem[] = res.data.notifications || [];

        // Save any already-read notifications from server to device read map
        const readIds = rawList
          .filter((item) => item.isRead)
          .map((item) => String(item._id || (item as any).id || '').trim())
          .filter(Boolean);
        if (readIds.length > 0) {
          setMultipleGuestReads(readIds, new Date().toISOString());
        }

        const deviceAllReadAt = getDeviceAllReadAt();
        const guestReads = getGuestReadMap();

        // Merge guest read states if any
        const mappedList = rawList.map((item) => {
          const id = String(item._id || (item as any).id || '').trim();
          const localReadAt = guestReads[id] || (item._id && guestReads[item._id]);
            const notifTime = item.createdAt ? new Date(item.createdAt).getTime() : 0;
            const isReadByDeviceCutoff = deviceAllReadAt > 0 && notifTime > 0 && notifTime <= deviceAllReadAt;

            if (!item.isRead && (localReadAt || isReadByDeviceCutoff)) {
              return {
                ...item,
                isRead: true,
                    readAt: localReadAt || (isReadByDeviceCutoff ? new Date(deviceAllReadAt).toISOString() : item.readAt || new Date().toISOString())
              };
            }
            return item;
          });

        // Filter out read notifications older than 24h & locally/globally dismissed items
        const activeList = mappedList.filter(isNotificationActive);
        set({
          notifications: activeList,
          unreadCount: activeList.filter((n) => !n.isRead).length,
          isLoading: false
        });
      }
    } catch (err) {
      set({ isLoading: false });
    }
  },

  markUserRead: async (id: string) => {
    const nowIso = new Date().toISOString();
    setGuestRead(id, nowIso);

    // Optimistic UI update: mark as read and start 24h countdown
    set((state) => {
      const cleanId = String(id).trim();
      const updated = state.notifications.map((n) => {
        const nId = String(n._id || (n as any).id || '').trim();
        return nId === cleanId ? { ...n, isRead: true, readAt: nowIso } : n;
      });
      const newUnread = updated.filter((n) => !n.isRead).length;
      return { notifications: updated, unreadCount: newUnread };
    });

    try {
      await api.patch(`/notifications/user/${id}/read`);
    } catch (err) {
      // ignore
    }
  },

  markAllUserRead: async () => {
    const nowIso = new Date().toISOString();
    const allIds = get().notifications.map((n) => String(n._id || (n as any).id || '').trim()).filter(Boolean);
    setMultipleGuestReads(allIds, nowIso);
    setDeviceAllReadAt(Date.now());

    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        isRead: true,
        readAt: n.readAt || nowIso
      })),
      unreadCount: 0
    }));

    try {
      await api.post('/notifications/user/read-all');
    } catch (err) {
      // ignore
    }
  },

  removeUserNotification: async (id: string) => {
    // Record dismissal locally so it never resurfaces on this browser
    addDismissedId(id);

    // Instant optimistic dismissal on customer screen
    set((state) => {
      const updated = state.notifications.filter((n) => n._id !== id);
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.isRead).length
      };
    });

    try {
      const email = useAuthStore.getState().user?.email;
      await api.delete(`/notifications/user/${id}`, {
        params: email ? { email } : {}
      });
      // Cross-tab sync: notify other open tabs for this user
      emitLiveEvent('NOTIFICATION_DELETED', { id });
    } catch (err) {
      // ignore
    }
  },

  clearAllUserNotifications: async () => {
    // Record cleared state in localStorage so cleared items never resurrect on logout/login
    const current = get().notifications;
    const nowIso = new Date().toISOString();
    const allIds = current.map((n) => String(n._id || (n as any).id || '').trim()).filter(Boolean);
    allIds.forEach((id) => addDismissedId(id));
    setMultipleGuestReads(allIds, nowIso);
    setClearedAtTimestamp(Date.now());
    setDeviceAllReadAt(Date.now());

    set({ notifications: [], unreadCount: 0 });

    try {
      const email = useAuthStore.getState().user?.email;
      await api.delete('/notifications/user/clear-all', {
        params: email ? { email } : {}
      });
      emitLiveEvent('NOTIFICATION_DELETED', { clearAll: true });
    } catch (err) {
      // ignore
    }
  },

  handleIncomingNotification: (incoming: NotificationItem) => {
    set((state) => {
      // Avoid duplicate
      if (state.notifications.some((n) => n._id === incoming._id)) {
        return state;
      }
      if (!isNotificationActive(incoming)) {
        return state;
      }
      const updated = [incoming, ...state.notifications].filter(isNotificationActive);
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.isRead).length
      };
    });

    if (get().soundEnabled) {
      playChime();
    }
  },

  // Admin Actions
  openAdminDropdown: () => set({ isAdminDropdownOpen: true }),
  closeAdminDropdown: () => set({ isAdminDropdownOpen: false }),
  toggleAdminDropdown: () => set((state) => ({ isAdminDropdownOpen: !state.isAdminDropdownOpen })),

  toggleSound: () => {
    const next = !get().soundEnabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('novise_notification_sound', String(next));
    }
    set({ soundEnabled: next });
  },

  fetchAdminNotifications: async () => {
    try {
      set({ isAdminLoading: true });
      const res = await api.get('/notifications/admin');
      if (res.data?.success) {
        set({
          adminNotifications: res.data.notifications || [],
          adminUnreadCount: res.data.unreadCount || 0,
          isAdminLoading: false
        });
      }
    } catch (err) {
      set({ isAdminLoading: false });
    }
  },

  markAdminRead: async (id: string) => {
    set((state) => {
      const updated = state.adminNotifications.map((n) =>
        n._id === id ? { ...n, isRead: true } : n
      );
      return {
        adminNotifications: updated,
        adminUnreadCount: updated.filter((n) => !n.isRead).length
      };
    });

    try {
      await api.patch(`/notifications/admin/${id}/read`);
    } catch (err) {
      // ignore
    }
  },

  markAllAdminRead: async () => {
    set((state) => ({
      adminNotifications: state.adminNotifications.map((n) => ({ ...n, isRead: true })),
      adminUnreadCount: 0
    }));

    try {
      await api.post('/notifications/admin/read-all');
    } catch (err) {
      // ignore
    }
  },

  clearAdminRead: async () => {
    set((state) => ({
      adminNotifications: state.adminNotifications.filter((n) => !n.isRead),
      adminUnreadCount: 0
    }));

    try {
      await api.delete('/notifications/admin/clear-all');
    } catch (err) {
      // ignore
    }
  },

  handleIncomingAdminNotification: (incoming: NotificationItem) => {
    set((state) => {
      if (state.adminNotifications.some((n) => n._id === incoming._id)) {
        return state;
      }
      const updated = [incoming, ...state.adminNotifications];
      return {
        adminNotifications: updated,
        adminUnreadCount: updated.filter((n) => !n.isRead).length
      };
    });

    if (get().soundEnabled) {
      playChime();
    }
  },

  // Cross-device / Realtime deletion handler
  handleNotificationDeleted: (id: string) => {
    addDismissedId(id);
    set((state) => {
      const updatedCust = state.notifications.filter((n) => n._id !== id);
      const updatedAdmin = state.adminNotifications.filter((n) => n._id !== id);
      return {
        notifications: updatedCust,
        unreadCount: updatedCust.filter((n) => !n.isRead).length,
        adminNotifications: updatedAdmin,
        adminUnreadCount: updatedAdmin.filter((n) => !n.isRead).length
      };
    });
  },

  // Auto-purges read notifications older than 24h from customer view
  purgeExpiredNotifications: () => {
    set((state) => {
      const activeCust = state.notifications.filter(isNotificationActive);
      return {
        notifications: activeCust,
        unreadCount: activeCust.filter((n) => !n.isRead).length
      };
    });
  }
}));
