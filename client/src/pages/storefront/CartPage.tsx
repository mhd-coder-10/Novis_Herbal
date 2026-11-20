import React from 'react';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Sparkles,
  Truck,
  ShieldCheck,
  Lock,
  ArrowLeft,
  Package
} from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { getFullImageUrl, getFallbackProductImage } from '../../services/api';
import { appConfig } from '../../config/appConfig';

interface CartPageProps {
  onNavigate: (page: string, param?: string) => void;
}

export const CartPage: React.FC<CartPageProps> = ({ onNavigate }) => {
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    getSubtotal,
    getTaxAmount,
    getTotal,
    getShippingFee,
    addItem
  } = useCartStore();

  const subtotal = getSubtotal();
  const shippingFee = getShippingFee();
  const taxAmount = getTaxAmount ? getTaxAmount() : 0;
  const total = getTotal();
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

  // Total MRP savings calculation
  const totalMrp = items.reduce((sum, i) => sum + (i.mrp * i.quantity), 0);
  const totalSavings = Math.max(0, totalMrp - total);

  // Check if combo is already in cart
  const hasComboInCart = items.some(
    i => i.sku.includes('CMB') || i.name.toLowerCase().includes('combo')
  );

  const handleAddComboQuick = () => {
    addItem({
      productId: 'novise-hair-oil-shampoo-combo',
      name: 'Novis Herbal Hair Care Routine Combo Pack',
      price: 599,
      mrp: 1399,
      sku: 'NOV-CMB-001',
      image: 'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361823/NOVISE_HERBAL/products/novise_combo_1.jpg',
      volumeText: '200 ML (Oil) + 250 ML (Shampoo)'
    });
  };

  // Free shipping progress calculation
  const freeThreshold = appConfig.freeShippingThreshold || 0;
  const progressPercent = freeThreshold > 0
    ? Math.min(100, Math.round((subtotal / freeThreshold) * 100))
    : 100;
  const amountNeededForFree = Math.max(0, freeThreshold - subtotal);

  return (
    <div className="py-6 sm:py-14">
      <div className="w-full px-3.5 sm:px-6 lg:px-10 space-y-6 sm:space-y-10">

        {/* Page Header (Consistent with WishlistPage & Storefront theme) */}
        <div className="text-center max-w-3xl mx-auto space-y-2 sm:space-y-3">
          <div className="inline-flex items-center space-x-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-forest-900 bg-forest-900/10 px-3.5 py-1 rounded-full border border-forest-900/15 shadow-xs">
            <ShoppingBag className="w-3.5 h-3.5 text-forest-900" />
            <span>Your Botanical Bag ({totalQuantity} {totalQuantity === 1 ? 'Item' : 'Items'})</span>
          </div>

          <h1 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-extrabold text-forest-950">
            Shopping Bag
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
            Review your chosen authentic Ayurvedic elixirs before proceeding to fast, secure checkout.
          </p>
        </div>

        {/* ============================================================== */}
        {/* EMPTY STATE (Clean, minimal & identical to WishlistPage)       */}
        {/* ============================================================== */}
        {items.length === 0 ? (
          <div className="py-16 sm:py-24 text-center bg-white rounded-3xl border border-slate-200/80 p-8 space-y-4 max-w-lg mx-auto shadow-sm">
            <div className="w-16 h-16 rounded-full bg-forest-900/10 text-forest-900 flex items-center justify-center mx-auto shadow-inner">
              <ShoppingBag className="w-8 h-8 text-forest-900" />
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-forest-950">
              Your Bag is Empty
            </h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Explore our 100% natural cold-pressed hair oils and herbal shampoos. Add your favorite formulations here!
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigate('shop')}
                className="px-6 py-3.5 bg-forest-900 hover:bg-forest-800 text-gold-400 font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-md shadow-forest-900/10 inline-flex items-center space-x-2 cursor-pointer"
              >
                <span>Discover All Products</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
        /* ============================================================== */
        /* POPULATED CART (2-Column Responsive Layout)                    */
        /* ============================================================== */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">

          {/* Left Column: Cart Items List (8 Columns) */}
          <div className="lg:col-span-8 space-y-4">

            {/* Free Shipping Progress Indicator */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center space-x-1.5 text-forest-950">
                  <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {amountNeededForFree === 0
                      ? '🎉 FREE Express Delivery Unlocked!'
                      : `Add ₹${amountNeededForFree} more for FREE Express Shipping`}
                  </span>
                </span>
                <span className="text-[11px] text-emerald-700 font-mono">
                  {progressPercent}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Toolbar Bar */}
            <div className="flex items-center justify-between py-3 px-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs text-xs">
              <span className="font-bold text-slate-800">
                {items.length} {items.length === 1 ? 'Distinct Formulation' : 'Distinct Formulations'}
              </span>

              <button
                type="button"
                onClick={clearCart}
                className="text-slate-400 hover:text-rose-600 transition flex items-center space-x-1.5 font-semibold text-xs cursor-pointer"
                title="Remove all items from your bag"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Entire Bag</span>
              </button>
            </div>

            {/* Items Card List */}
            <div className="space-y-3.5">
              {items.map((item) => {
                const itemTotal = item.price * item.quantity;
                const itemMrpTotal = item.mrp * item.quantity;
                const itemSavings = Math.max(0, itemMrpTotal - itemTotal);

                return (
                  <div
                    key={item.productId}
                    className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white transition hover:border-forest-900/30 shadow-xs flex flex-col sm:flex-row gap-4 items-start sm:items-center"
                  >
                    {/* Product Thumbnail */}
                    <div
                      onClick={() => {
                        const slug = item.sku.includes('CMB')
                          ? 'novise-hair-oil-shampoo-combo'
                          : (item.sku.includes('SHM') ? 'novise-anti-dandruff-shampoo' : 'novise-ayurvedic-hair-growth-oil');
                        onNavigate('product', slug);
                      }}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0 cursor-pointer group"
                    >
                      <img
                        src={getFullImageUrl(item.image, item.name)}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getFallbackProductImage(item.name);
                        }}
                      />
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex justify-between items-start gap-2">
                        <h3
                          onClick={() => {
                            const slug = item.sku.includes('CMB')
                              ? 'novise-hair-oil-shampoo-combo'
                              : (item.sku.includes('SHM') ? 'novise-anti-dandruff-shampoo' : 'novise-ayurvedic-hair-growth-oil');
                            onNavigate('product', slug);
                          }}
                          className="font-serif text-sm sm:text-base font-bold text-forest-950 hover:text-amber-700 transition cursor-pointer line-clamp-2 leading-tight"
                        >
                          {item.name}
                        </h3>

                        {/* Delete Item Button */}
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId)}
                          className="text-slate-300 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition shrink-0 cursor-pointer"
                          title="Remove from bag"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {item.volumeText && (
                        <span className="inline-block text-[10.5px] font-bold text-forest-900 bg-forest-900/10 px-2.5 py-0.5 rounded-md">
                          {item.volumeText}
                        </span>
                      )}

                      {/* Price Details */}
                      <div className="flex items-baseline space-x-2 pt-1">
                        <span className="text-base font-black text-forest-950">₹{item.price}</span>
                        {item.mrp > item.price && (
                          <span className="text-xs text-slate-400 line-through">₹{item.mrp}</span>
                        )}
                        {itemSavings > 0 && (
                          <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.2 rounded">
                            Save ₹{itemSavings}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quantity Modifier & Subtotal Controls */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shadow-inner">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="px-2.5 py-1.5 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 text-xs font-bold text-slate-900 font-mono select-none">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="px-2.5 py-1.5 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-slate-400 block sm:inline mr-1">Subtotal:</span>
                        <span className="text-sm font-black text-forest-950 font-serif">₹{itemTotal}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Synergistic Combo Upsell Card (if Combo not already in cart) */}
            {!hasComboInCart && (
              <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-amber-50 via-white to-amber-50 border border-amber-300 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-5 h-5 text-amber-600 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-forest-950">
                      Add the Complete Synergistic Combo & Save ₹800!
                    </h4>
                    <p className="text-[11.5px] text-slate-600 mt-0.5 leading-relaxed">
                      Complete 2-Step Routine: 200 ML Herbal Hair Oil + 250 ML Clarifying Shampoo for just ₹599.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddComboQuick}
                  className="w-full sm:w-auto px-5 py-2.5 bg-forest-950 hover:bg-forest-900 text-gold-400 font-black text-xs uppercase tracking-wider rounded-xl transition shadow-xs whitespace-nowrap cursor-pointer shrink-0"
                >
                  + Add Combo (₹599)
                </button>
              </div>
            )}

            {/* Back to Shopping Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigate('shop')}
                className="inline-flex items-center space-x-2 text-xs font-bold text-forest-900 hover:text-forest-950 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Continue Shopping (Add More Products)</span>
              </button>
            </div>

          </div>

          {/* Right Column: Order Summary Card (4 Columns, Sticky on Desktop) */}
          <div className="lg:col-span-4 sticky top-24 space-y-4">

            <div className="p-5 sm:p-6 bg-white rounded-3xl border border-slate-200/90 shadow-md space-y-4">
              <h3 className="font-serif text-lg font-bold text-forest-950 border-b border-slate-100 pb-3 flex items-center justify-between">
                <span>Order Summary</span>
                <span className="text-xs font-sans text-slate-400 font-medium">
                  {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
                </span>
              </h3>

              {/* Price Breakdown */}
              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex justify-between items-center">
                  <span>Items Subtotal</span>
                  <span className="font-bold text-slate-900 font-mono">₹{subtotal}</span>
                </div>

                {totalSavings > 0 && (
                  <div className="flex justify-between items-center text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200/60">
                    <span>Total Savings</span>
                    <span className="font-mono">-₹{totalSavings}</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span>Shipping & Handling</span>
                  <span>
                    {shippingFee === 0 ? (
                      <span className="font-bold text-emerald-700 uppercase">FREE</span>
                    ) : (
                      <span className="font-bold text-slate-900 font-mono">₹{shippingFee}</span>
                    )}
                  </span>
                </div>

                {taxAmount > 0 && (
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Estimated GST ({appConfig.gstPercentage}%)</span>
                    <span className="font-mono font-semibold">₹{taxAmount}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                  <span className="font-bold text-sm text-forest-950">Grand Total</span>
                  <span className="font-serif text-2xl font-black text-forest-950">₹{total}</span>
                </div>
              </div>

              {/* Checkout Primary Button */}
              <button
                type="button"
                onClick={() => onNavigate('checkout')}
                className="w-full py-4 bg-forest-950 hover:bg-forest-900 text-gold-400 font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl transition shadow-xl shadow-forest-950/20 hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center space-x-2 group cursor-pointer"
              >
                <Lock className="w-4 h-4 text-gold-400" />
                <span>PROCEED TO CHECKOUT • ₹{total}</span>
                <ArrowRight className="w-4 h-4 text-gold-400 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Trust Badging */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-[11px] text-slate-500">
                <div className="flex items-center space-x-2">
                  <Truck className="w-4 h-4 text-forest-900 shrink-0" />
                  <span>Free Shipping across India on eligible orders</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-forest-900 shrink-0" />
                  <span>Cash on Delivery (COD) Available at Doorstep</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-forest-900 shrink-0" />
                  <span>100% Secure 256-Bit SSL Encrypted Checkout</span>
                </div>
              </div>

            </div>

          </div>

        </div>
            )}

      </div>
    </div>
  );
};
