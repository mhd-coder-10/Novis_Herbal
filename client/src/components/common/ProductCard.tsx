import React from 'react';
import { Star, ShoppingBag, Sparkles, Check, Heart } from 'lucide-react';
import type { Product } from '../../types';
import { useCartStore } from '../../store/useCartStore';
import { useWishlistStore } from '../../store/useWishlistStore';
import { getFullImageUrl, getFallbackProductImage } from '../../services/api';

interface ProductCardProps {
  product: Product;
  onNavigate: (slug: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onNavigate }) => {
  const { addItem } = useCartStore();
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const [added, setAdded] = React.useState(false);

  const inWishlist = isInWishlist(product._id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({
      productId: product._id,
      name: product.name,
      price: product.sellingPrice,
      mrp: product.mrp,
      sku: product.sku,
      image: product.images?.[0] || '',
      volumeText: product.volumeText,
      weightGrams: product.weightGrams
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const discount = product.discountPercent || Math.round(((product.mrp - product.sellingPrice) / product.mrp) * 100);

  return (
    <div 
      onClick={() => onNavigate(product.slug)}
      className="luxury-card rounded-3xl overflow-hidden flex flex-col cursor-pointer group"
    >
      {/* Product Image Frame */}
      <div className="relative aspect-[4/3.8] overflow-hidden bg-[#FAF8F5]">
        <img
          src={getFullImageUrl(product.images?.[0], product.slug || product.name)}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-700 ease-out"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            const fallback = getFallbackProductImage(product.slug || product.name);
            if (target.src !== fallback && !target.src.endsWith(fallback)) {
              target.src = fallback;
            }
          }}
        />

        {/* Top Badges */}
        <div className="absolute top-3.5 left-3.5 flex flex-col gap-1.5 items-start">
          {product.isCombo && product.mrp > product.sellingPrice && (
            <span className="bg-amber-600 text-white text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full shadow-md flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-gold-200" />
              <span>Save Flat ₹{product.mrp - product.sellingPrice}</span>
            </span>
          )}
          {discount > 0 && (
            <span className="bg-forest-950 text-gold-400 text-[11px] font-extrabold px-3 py-0.5 rounded-full shadow-md tracking-wider">
              {discount}% OFF
            </span>
          )}
        </div>

        {/* Wishlist Heart Toggle Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product);
          }}
          className={`absolute top-3.5 right-3.5 w-8 h-8 rounded-full flex items-center justify-center transition shadow-md backdrop-blur-md z-10 ${
            inWishlist 
              ? 'bg-white text-rose-500 shadow-rose-500/20' 
              : 'bg-white/90 text-slate-400 hover:text-rose-500 hover:bg-white'
          }`}
          aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
          title={inWishlist ? "Saved in Wishlist" : "Add to Wishlist"}
        >
          <Heart className={`w-4 h-4 transition-transform active:scale-125 ${inWishlist ? 'fill-rose-500 text-rose-500' : ''}`} />
        </button>

        {/* Volume tag */}
        {product.volumeText && (
          <div className="absolute bottom-3.5 right-3.5 bg-white/95 backdrop-blur-sm text-slate-800 text-[11px] font-bold px-2.5 py-1 rounded-xl shadow-sm border border-slate-200/80">
            {product.volumeText}
          </div>
        )}
      </div>

      {/* Product Content Details */}
      <div className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5 sm:space-y-2">
          
          {/* Star Rating & Reviews */}
          <div className="flex items-center space-x-1.5">
            <div className="flex items-center text-amber-500">
              <Star className="w-3.5 h-3.5 fill-current" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-900">{product.averageRating || 4.9}</span>
            <span className="text-[10px] sm:text-xs text-slate-400 font-medium">({product.numReviews || 180}+ reviews)</span>
          </div>

          {/* Title */}
          <h3 className="font-serif text-sm sm:text-lg font-bold text-forest-950 group-hover:text-forest-800 line-clamp-2 leading-snug">
            {product.name}
          </h3>

          {/* Short Description */}
          {product.shortDescription && (
            <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-2 leading-relaxed font-normal">
              {product.shortDescription}
            </p>
          )}
        </div>

        {/* Pricing & Add to Cart */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            <div className="flex items-baseline space-x-1.5 sm:space-x-2">
              <span className="text-lg sm:text-2xl font-extrabold text-forest-950">₹{product.sellingPrice}</span>
              {product.mrp > product.sellingPrice && (
                <span className="text-[11px] sm:text-xs text-slate-400 line-through">₹{product.mrp}</span>
              )}
            </div>
            <p className="text-[10px] text-emerald-700 font-bold">
              Save ₹{product.mrp - product.sellingPrice}
            </p>
          </div>

          <button
            onClick={handleAddToCart}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition font-extrabold text-[11px] sm:text-xs tracking-wider uppercase flex items-center space-x-1 sm:space-x-1.5 shadow-sm shrink-0 ${
              added 
                ? 'bg-emerald-600 text-white' 
                : 'bg-forest-950 text-gold-400 hover:bg-forest-900'
            }`}
            title="Add to Bag"
          >
            {added ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Added</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Add</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
