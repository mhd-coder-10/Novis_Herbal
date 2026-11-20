import { create } from 'zustand';
import api from '../services/api';
import { User } from '../types';
import { toast } from './useToastStore';
import { useNotificationStore, setMultipleGuestReads, setDeviceAllReadAt } from './useNotificationStore';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: User, token: string, silent?: boolean) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('novise_token'),
  isAuthenticated: !!localStorage.getItem('novise_token'),
  isLoading: true,

  login: (userData, token, silent = false) => {
    localStorage.setItem('novise_token', token);
    set({ user: userData, token, isAuthenticated: true, isLoading: false });
    useNotificationStore.getState().closeDrawer();
    useNotificationStore.getState().fetchUserNotifications(userData.email);
    if (!silent) {
      toast.success(`Welcome back, ${userData.name || 'valued customer'}!`, 'Signed In');
    }
  },

  updateUser: (userData) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...userData } : null
    }));
  },

  logout: () => {
    try {
      const notifState = useNotificationStore.getState();
      const currentNotifs = notifState.notifications;

      // Save ALL current notification IDs as read so they don't show unread for guest
      const allIds = currentNotifs
        .map((n) => String(n._id || (n as any).id || '').trim())
        .filter(Boolean);
        if (allIds.length > 0) {
          setMultipleGuestReads(allIds, new Date().toISOString());
        }

        // ALWAYS stamp deviceAllReadAt so that all notifications up to logout time
        // are treated as "read" for guest view → badge shows 0
        setDeviceAllReadAt(Date.now());
      } catch { }

      localStorage.removeItem('novise_token');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });

      // Clear notifications list and reset count to 0 immediately
      // Don't fetch guest notifications - guest should have empty list + 0 badge
      useNotificationStore.getState().closeDrawer();
      useNotificationStore.setState({ notifications: [], unreadCount: 0 });
      toast.info('You have been signed out.', 'Signed Out');
    },

    loadUser: async () => {
      const token = localStorage.getItem('novise_token');
      if (!token) {
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        return;
      }
      try {
        const res = await api.get('/auth/me');
        if (res.data?.success) {
          set({ user: res.data.user, token, isAuthenticated: true, isLoading: false });
        } else {
          localStorage.removeItem('novise_token');
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      } catch {
        localStorage.removeItem('novise_token');
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      }
    },
}));
