import { create } from 'zustand';
import api from '../services/api';
import type { Product } from '../types';

interface ProductState {
  products: Product[];
  isLoading: boolean;
  comboDiscount: number;
  comboProduct: Product | null;
  fetchProducts: () => Promise<void>;
  getProductDiscount: (slugOrId: string) => number;
}

const calculateDiscount = (product?: Product | null): number => {
  if (!product) return 57; // safe fallback
  if (typeof product.discountPercent === 'number' && product.discountPercent > 0) {
    return product.discountPercent;
  }
  if (product.mrp && product.sellingPrice && product.mrp > product.sellingPrice) {
    return Math.round(((product.mrp - product.sellingPrice) / product.mrp) * 100);
  }
  return 57;
};

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  isLoading: true,
  comboDiscount: 57,
  comboProduct: null,

  fetchProducts: async () => {
    try {
      const res = await api.get('/products');
      if (res.data?.success && Array.isArray(res.data.products)) {
        const productList: Product[] = res.data.products;
        
        // Find combo product
        const foundCombo =
          productList.find((p) => p.isCombo) ||
          productList.find((p) => p.slug === 'novise-hair-oil-shampoo-combo') ||
          productList.find((p) => p.slug?.toLowerCase().includes('combo')) ||
          productList.find((p) => p.name?.toLowerCase().includes('combo')) ||
          null;

        const discount = calculateDiscount(foundCombo);

        set({
          products: productList,
          comboProduct: foundCombo,
          comboDiscount: discount,
          isLoading: false
        });
      }
    } catch (err) {
      console.warn('Failed to load global products:', err);
      set({ isLoading: false });
    }
  },

  getProductDiscount: (slugOrId: string) => {
    const list = get().products;
    const p = list.find((item) => item._id === slugOrId || item.slug === slugOrId);
    if (!p) return 0;
    return calculateDiscount(p);
  }
}));

// Automatic live synchronization when any product is updated in Admin panel
if (typeof window !== 'undefined') {
  window.addEventListener('novise:product-updated', () => {
    useProductStore.getState().fetchProducts();
  });
}
