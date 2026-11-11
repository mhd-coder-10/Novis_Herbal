import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '../types';
import api from '../services/api';
import { toast } from './useToastStore';

interface WishlistState {
  items: Product[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        const { items } = get();
        if (!items.some((p) => p._id === product._id)) {
          set({ items: [...items, product] });
          toast.success(`${product.name} saved to your wishlist`, 'Wishlist');
          // Async sync with backend if token exists
          if (localStorage.getItem('novise_token')) {
            api.post('/auth/wishlist/toggle', { productId: product._id }).catch(() => {});
          }
        }
      },

      removeItem: (productId) => {
        const item = get().items.find((p) => p._id === productId);
        set((state) => ({
          items: state.items.filter((p) => p._id !== productId)
        }));
        if (item) {
          toast.info(`${item.name} removed from your wishlist`, 'Wishlist');
        }
        if (localStorage.getItem('novise_token')) {
          api.post('/auth/wishlist/toggle', { productId }).catch(() => {});
        }
      },

      toggleWishlist: (product) => {
        const { items } = get();
        const exists = items.some((p) => p._id === product._id);
        if (exists) {
          set({ items: items.filter((p) => p._id !== product._id) });
          toast.info(`${product.name} removed from your wishlist`, 'Wishlist');
        } else {
          set({ items: [...items, product] });
          toast.success(`${product.name} saved to your wishlist!`, 'Wishlist');
        }
        if (localStorage.getItem('novise_token')) {
          api.post('/auth/wishlist/toggle', { productId: product._id }).catch(() => {});
        }
      },

      isInWishlist: (productId) => {
        return get().items.some((p) => p._id === productId);
      },

      clearWishlist: () => {
        set({ items: [] });
        toast.info('Your wishlist has been cleared', 'Wishlist');
      }
    }),
    {
      name: 'novise-wishlist-storage'
    }
  )
);
