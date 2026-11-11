import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem } from '../types';
import { toast } from './useToastStore';
import { appConfig } from '../config/appConfig';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotal: (paymentMethod?: 'ONLINE' | 'COD') => number;
  getShippingFee: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      addItem: (newItem) => {
        const { items } = get();
        const existing = items.find((i) => i.productId === newItem.productId);
        const addQty = newItem.quantity || 1;

        if (existing) {
          set({
            items: items.map((i) =>
              i.productId === newItem.productId
                ? { ...i, quantity: i.quantity + addQty }
                : i
            ),
            isOpen: true,
          });
        } else {
          set({
            items: [...items, { ...newItem, quantity: addQty }],
            isOpen: true,
          });
        }
        toast.success(`${newItem.name} added to your bag`, 'Added to Bag');
      },

      removeItem: (productId) => {
        const item = get().items.find((i) => i.productId === productId);
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }));
        if (item) {
          toast.info(`${item.name} removed from your bag`, 'Bag Updated');
        }
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i
          ),
        }));
      },

      clearCart: () => {
        set({ items: [] });
        toast.info('Your shopping bag has been cleared', 'Bag Cleared');
      },

      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      getShippingFee: () => {
        const subtotal = get().getSubtotal();
        if (subtotal === 0) return 0;
        const threshold = appConfig.freeShippingThreshold;
        const fee = appConfig.standardShippingFee;
        return subtotal >= threshold ? 0 : fee;
      },

      getTotal: (paymentMethod?: 'ONLINE' | 'COD') => {
        const subtotal = get().getSubtotal();
        if (subtotal === 0) return 0;
        const shipping = get().getShippingFee();
        const codFee = (paymentMethod === 'COD') ? appConfig.codFee : 0;
        return subtotal + shipping + codFee;
      },
    }),
    {
      name: 'novise_cart_storage',
    }
  )
);
