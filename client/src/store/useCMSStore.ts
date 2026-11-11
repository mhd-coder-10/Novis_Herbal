import { create } from 'zustand';
import api from '../services/api';
import { CMSData } from '../types';

interface CMSState {
  cms: CMSData | null;
  isLoading: boolean;
  fetchCMS: () => Promise<void>;
  updateCMSState: (newCMS: CMSData) => void;
}

export const useCMSStore = create<CMSState>((set) => ({
  cms: null,
  isLoading: true,

  fetchCMS: async () => {
    try {
      const res = await api.get('/cms');
      if (res.data?.success) {
        set({ cms: res.data.cms, isLoading: false });
      }
    } catch (err) {
      console.warn('Using local fallback CMS');
      set({ isLoading: false });
    }
  },

  updateCMSState: (newCMS) => {
    set({ cms: newCMS });
  },
}));
