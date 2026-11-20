import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, ShoppingBag, ArrowRight, ShieldCheck, Heart } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import api, { getFullImageUrl } from '../../services/api';
import type { Product } from '../../types';

interface ComboOfferProps {
  onNavigate: (slug: string) => void;
  comboProduct?: Product;
}

export const ComboOfferSection: React.FC<ComboOfferProps> = ({ onNavigate, comboProduct: propProduct }) => {
  const { addItem } = useCartStore();
  const [product, setProduct] = useState<Product | null>(propProduct || null);

  useEffect(() => {
    if (propProduct) {
      setProduct(propProduct);
    } else {
      const loadProduct = () => {
        api.get('/products').then((res) => {
          if (res.data?.success && res.data.products?.length > 0) {
            const match = res.data.products.find((p: Product) => p.isCombo || p.slug.includes('combo') || p.sku.includes('CMB'));
            if (match) setProduct(match);
          }
        }).catch(console.error);
      };
      loadProduct();

      window.addEventListener('novise:product-updated', loadProduct);
      return () => {
        window.removeEventListener('novise:product-updated', loadProduct);
      };
    }
  }, [propProduct]);

  const mrp = product?.mrp ?? 1399;
  const price = product?.sellingPrice ?? 599;
  const discount = product?.discountPercent || (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);
  const savings = Math.max(0, mrp - price);
  const image = (product?.images && product.images.length > 0) ? getFullImageUrl(product.images[0]) : 'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361823/NOVISE_HERBAL/products/novise_combo_1.jpg';

  const handleAddCombo = () => {
    addItem({
      productId: product?._id || 'novise-hair-oil-shampoo-combo',
      name: product?.name || 'Novise Complete Hair Regrowth & Anti-Dandruff Combo Pack',
      price: price,
      mrp: mrp,
      sku: product?.sku || 'NOV-CMB-001',
      image: image,
      volumeText: product?.volumeText || '200 ML (Oil) + 250 ML (Shampoo)'
    });
  };

  return (
    <section className="py-10 sm:py-20 bg-forest-950 text-white relative overflow-hidden">

      {/* Background glow effects */}
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none -translate-y-1/2" />
      <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-gold-500/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full px-3.5 sm:px-6 lg:px-10 relative z-10">
        <div className="bg-gradient-to-br from-forest-900/90 via-forest-900 to-forest-950 border border-gold-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-8 lg:p-12 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 lg:gap-14 items-center">

            {/* Top on Mobile, Right on Desktop: Product Image Visual */}
            <div className="lg:col-span-5 order-1 lg:order-2 relative flex items-center justify-center">
              <div className="relative w-full max-w-[320px] sm:max-w-md aspect-[4/3.8] rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-gold-500/50 shadow-2xl bg-forest-900 group">
                <img
                  src="https://res.cloudinary.com/ipb9jst1/image/upload/v1793361823/NOVISE_HERBAL/products/novise_combo_1.jpg"
                  alt="Novise Complete Combo"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition duration-700"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/products/combo.jpg';
                  }}
                />
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-forest-950/95 text-gold-400 font-extrabold text-[11px] sm:text-xs px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full border border-gold-500/30 shadow-lg">
                  #1 Best Seller Bundle
                </div>
              </div>
            </div>

            {/* Left Content on Desktop, Second on Mobile */}
            <div className="lg:col-span-7 order-2 lg:order-1 space-y-4 sm:space-y-6">

              <div className="inline-flex items-center space-x-1.5 sm:space-x-2 bg-gold-500 text-forest-950 px-3.5 py-1 rounded-full text-[11px] sm:text-xs font-extrabold uppercase tracking-wider shadow">
                <Sparkles className="w-3.5 h-3.5 text-forest-950" />
                <span>SUPER SAVER BUNDLE {savings > 0 ? `• FLAT ₹${savings} OFF` : ''}</span>
              </div>

              <h2 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-extrabold leading-tight text-white">
                The Synergetic 2-Step <br className="hidden sm:inline" />
                <span className="text-gold-400">Hair & Scalp Revival Routine</span>
              </h2>

              <p className="text-xs sm:text-base text-slate-300 leading-relaxed font-normal">
                Experience complete hair and scalp wellness with our complementary 2-step ritual. Novise Herbal Hair Oil provides deep overnight root nourishment and hydration, while Novise Clarifying Shampoo gently washes away flakes, excess sebum, and impurities in the morning.
              </p>

              {/* Routine Value Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-1">
                <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center space-x-2 text-xs font-bold text-gold-400">
                    <span className="w-5 h-5 rounded-full bg-gold-500/20 text-gold-400 flex items-center justify-center text-[10px]">1</span>
                    <span>Step 1: Night Scalp Oil (200 ML)</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Individual Price ₹399. 20 cold-pressed oils nourish roots and help reduce hair fall due to breakage.
                  </p>
                </div>

                <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center space-x-2 text-xs font-bold text-gold-400">
                    <span className="w-5 h-5 rounded-full bg-gold-500/20 text-gold-400 flex items-center justify-center text-[10px]">2</span>
                    <span>Step 2: Morning Wash (250 ML)</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Individual Price ₹350. Zinc Pyrithione & Tea Tree gently clarify scalp and soothe flaking.
                  </p>
                </div>
              </div>

              {/* Price comparison card */}
              <div className="p-3.5 sm:p-5 rounded-2xl bg-forest-950/80 border border-gold-500/40 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
                <div>
                  <div className="flex items-baseline space-x-2.5 sm:space-x-3">
                    <span className="text-2xl sm:text-4xl font-extrabold text-white">₹{price}</span>
                    {mrp > price && (
                      <span className="text-sm sm:text-base text-slate-400 line-through">MRP ₹{mrp}</span>
                    )}
                    {discount > 0 && (
                      <span className="text-[10px] sm:text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-extrabold">
                        {discount}% OFF (Save ₹{savings})
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-gold-300 mt-1">
                    Buying items separately costs ₹749. Combo saves you an extra ₹150!
                  </p>
                </div>

                <div className="text-right hidden sm:block">
                  <span className="text-xs font-bold text-emerald-400 block">✓ Shipping Available in All India</span>
                  <span className="text-[10px] text-slate-400 block">✓ Gift Box Included</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3.5 pt-1 sm:pt-2">
                <button
                  onClick={handleAddCombo}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-gold-500 hover:bg-gold-600 text-forest-950 font-extrabold text-xs sm:text-sm tracking-wider uppercase rounded-xl shadow-glow-gold transition flex items-center justify-center space-x-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>ADD COMBO TO BAG (₹599)</span>
                </button>
                <button
                  onClick={() => onNavigate('novise-hair-oil-shampoo-combo')}
                  className="w-full sm:w-auto px-5 sm:px-6 py-3 sm:py-4 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/20 rounded-xl transition flex items-center justify-center space-x-2"
                >
                  <span>Explore Kit Details</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>
        </div>
      </div>
    </section>
  );
};
