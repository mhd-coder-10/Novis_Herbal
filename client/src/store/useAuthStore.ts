import { create } from 'zustand';
import api from '../services/api';
import { User } from '../types';
import { toast } from './useToastStore';

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
    localStorage.removeItem('novise_token');
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
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
