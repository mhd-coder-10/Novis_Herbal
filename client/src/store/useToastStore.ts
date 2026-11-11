import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (newToast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const duration = newToast.duration ?? 4000;

    const item: ToastItem = {
      id,
      ...newToast,
      duration
    };

    set((state) => ({
      // Keep up to 4 active toasts, most recent first
      toasts: [item, ...state.toasts].slice(0, 4)
    }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id)
        }));
      }, duration);
    }

    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }));
  },

  clearToasts: () => set({ toasts: [] })
}));

/**
 * Global helper function to trigger toasts from anywhere (stores, services, components)
 * without requiring the React hook context.
 */
export const toast = {
  success: (message: string, title?: string, duration = 4000) => {
    useToastStore.getState().addToast({
      type: 'success',
      title: title || 'Success',
      message,
      duration
    });
  },

  error: (message: string, title?: string, duration = 5000) => {
    useToastStore.getState().addToast({
      type: 'error',
      title: title || 'Error',
      message,
      duration
    });
  },

  info: (message: string, title?: string, duration = 3500) => {
    useToastStore.getState().addToast({
      type: 'info',
      title: title || 'Notice',
      message,
      duration
    });
  },

  warning: (message: string, title?: string, duration = 4500) => {
    useToastStore.getState().addToast({
      type: 'warning',
      title: title || 'Attention',
      message,
      duration
    });
  }
};
