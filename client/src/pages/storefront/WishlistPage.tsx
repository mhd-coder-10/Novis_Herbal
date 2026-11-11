import React from 'react';
import { Heart, Trash2, ArrowRight, Sparkles, ShoppingBag } from 'lucide-react';
import { useWishlistStore } from '../../store/useWishlistStore';
import { ProductCard } from '../../components/common/ProductCard';

interface WishlistPageProps {
  onNavigate: (page: string, param?: string) => void;
}

export const WishlistPage: React.FC<WishlistPageProps> = ({ onNavigate }) => {
  const { items, clearWishlist } = useWishlistStore();

  return (
    <div className="py-6 sm:py-14">
      <div className="w-full px-3.5 sm:px-6 lg:px-10 space-y-6 sm:space-y-10">
        
        {/* Header matching ShopPage & Storefront aesthetic */}
        <div className="text-center max-w-3xl mx-auto space-y-2 sm:space-y-3">
          <div className="inline-flex items-center space-x-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 px-3.5 py-1 rounded-full shadow-sm">
            <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
            <span>Saved Formulations ({items.length})</span>
          </div>

          <h1 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-extrabold text-forest-950">
            My Botanical Wishlist
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
            Your personalized selection of ancient Ayurvedic hair and scalp restore elixirs, saved for your beauty ritual.
          </p>
        </div>

        {/* Toolbar / Actions Bar */}
        {items.length > 0 && (
          <div className="flex items-center justify-between py-3 px-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm text-xs">
            <span className="font-bold text-slate-700">
              Showing {items.length} {items.length === 1 ? 'Product' : 'Products'}
            </span>

            <button
              onClick={clearWishlist}
              className="text-slate-400 hover:text-rose-600 transition flex items-center space-x-1.5 font-semibold text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Wishlist</span>
            </button>
          </div>
        )}

        {/* Empty State */}
        {items.length === 0 ? (
          <div className="py-16 sm:py-24 text-center bg-white rounded-3xl border border-slate-200/80 p-8 space-y-4 max-w-lg mx-auto shadow-sm">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
              <Heart className="w-8 h-8" />
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900">
              Your Wishlist is Empty
            </h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Explore our 100% natural cold-pressed hair oils and herbal shampoos. Tap the heart icon on any product to save it here!
            </p>
            <div className="pt-2">
              <button
                onClick={() => onNavigate('shop')}
                className="px-6 py-3.5 bg-forest-900 text-gold-400 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-forest-800 transition shadow-md shadow-forest-900/10 inline-flex items-center space-x-2"
              >
                <span>Discover All Products</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Products Grid matching ShopPage */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {items.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                onNavigate={(slug) => onNavigate('product', slug)}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
