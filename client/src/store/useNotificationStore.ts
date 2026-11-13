import { create } from 'zustand';
import api from '../services/api';
import type { NotificationItem } from '../types';

interface NotificationState {
  // Customer State
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  isDrawerOpen: boolean;

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
  fetchUserNotifications: (email?: string) => Promise<void>;
  markUserRead: (id: string) => Promise<void>;
  markAllUserRead: () => Promise<void>;
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
    // Gentle high bell note (880Hz -> 1760Hz harmonic)
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

  // Admin State
  adminNotifications: [],
  adminUnreadCount: 0,
  isAdminLoading: false,
  isAdminDropdownOpen: false,
  soundEnabled: localStorage.getItem('novise_notification_sound') !== 'false',

  // Customer Actions
  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),
  toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),

  fetchUserNotifications: async (email?: string) => {
    try {
      set({ isLoading: true });
      const params = email ? { email } : {};
      const res = await api.get('/notifications/user', { params });
      if (res.data?.success) {
        set({
          notifications: res.data.notifications || [],
          unreadCount: res.data.unreadCount || 0,
          isLoading: false
        });
      }
    } catch (err) {
      set({ isLoading: false });
    }
  },

  markUserRead: async (id: string) => {
    // Optimistic UI update
    set((state) => {
      const updated = state.notifications.map((n) =>
        n._id === id ? { ...n, isRead: true } : n
      );
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
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0
    }));

    try {
      await api.post('/notifications/user/read-all');
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
      const updated = [incoming, ...state.notifications];
      return {
        notifications: updated,
        unreadCount: state.unreadCount + (incoming.isRead ? 0 : 1)
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
    localStorage.setItem('novise_notification_sound', String(next));
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
    // Optimistic UI update
    set((state) => {
      const updated = state.adminNotifications.map((n) =>
        n._id === id ? { ...n, isRead: true } : n
      );
      const newUnread = updated.filter((n) => !n.isRead).length;
      return { adminNotifications: updated, adminUnreadCount: newUnread };
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
      adminNotifications: state.adminNotifications.filter((n) => !n.isRead)
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
      return {
        adminNotifications: [incoming, ...state.adminNotifications],
        adminUnreadCount: state.adminUnreadCount + (incoming.isRead ? 0 : 1)
      };
    });

    if (get().soundEnabled) {
      playChime();
    }
  }
}));

