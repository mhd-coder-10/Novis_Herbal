import React from 'react';
import { Home, ShoppingBag, Heart, Package, ShoppingCart } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { useWishlistStore } from '../../store/useWishlistStore';

interface MobileBottomNavProps {
  currentPage: string;
  onNavigate: (page: string, param?: string) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ currentPage, onNavigate }) => {
  const { items } = useCartStore();
  const { items: wishlistItems } = useWishlistStore();
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

  // If user is on product detail page or checkout, hide the main bottom nav so sticky purchase bar gets 100% focus
  if (currentPage === 'product' || currentPage === 'checkout' || currentPage.startsWith('admin-')) {
    return null;
  }

  const tabs = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      action: () => onNavigate('home'),
      isActive: currentPage === 'home'
    },
    {
      id: 'shop',
      label: 'Shop',
      icon: ShoppingBag,
      action: () => onNavigate('shop'),
      isActive: currentPage === 'shop'
    },
    {
      id: 'wishlist',
      label: 'Wishlist',
      icon: Heart,
      badgeCount: wishlistItems.length,
      action: () => onNavigate('wishlist'),
      isActive: currentPage === 'wishlist'
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: Package,
      action: () => onNavigate('my-orders'),
      isActive: currentPage === 'my-orders'
    },
    {
      id: 'cart',
      label: 'Bag',
      icon: ShoppingCart,
      action: () => onNavigate('cart'),
      badgeCount: totalQuantity,
      isActive: currentPage === 'cart'
    }
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.07)] lg:hidden"
    >
      <div className="grid grid-cols-5 items-center h-14 max-w-md mx-auto px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={tab.action}
              className={`relative flex flex-col items-center justify-center py-1 transition-all ${tab.isActive
                  ? 'text-forest-900 font-extrabold'
                  : 'text-slate-500 font-medium hover:text-forest-900'
                }`}
            >
              {/* Counter Badge */}
              {typeof tab.badgeCount === 'number' && tab.badgeCount > 0 && (
                <span className={`absolute -top-1 right-2 sm:right-4 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md ${tab.id === 'wishlist' ? 'bg-rose-500 text-white' : 'bg-forest-900 text-gold-400 animate-bounce'
                  }`}>
                  {tab.badgeCount}
                </span>
              )}

              <Icon
                className={`w-5 h-5 transition-transform ${tab.isActive
                    ? 'scale-110 text-forest-900'
                    : tab.id === 'wishlist' && wishlistItems.length > 0
                      ? 'fill-rose-500 text-rose-500'
                      : 'text-slate-500'
                  }`}
              />
              <span className="text-[10px] mt-0.5 tracking-tight leading-none">
                {tab.label}
              </span>

              {/* Active Indicator dot */}
              {tab.isActive && (
                <span className="w-1 h-1 bg-forest-900 rounded-full mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
