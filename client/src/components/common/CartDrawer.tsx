import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Plus, Minus, ArrowRight, Sparkles, Check, ShieldCheck, Truck, ShoppingBag, Lock } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { getFullImageUrl, getFallbackProductImage } from '../../services/api';
import { appConfig } from '../../config/appConfig';

interface CartDrawerProps {
  onCheckout: () => void;
  onNavigateProduct: (slug: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onCheckout, onNavigateProduct }) => {
  const {
    items,
    isOpen,
    closeCart,
    removeItem,
    updateQuantity,
    getSubtotal,
    getTaxAmount,
    getTotal,
    getShippingFee,
    addItem
  } = useCartStore();

  // 1. Prevent background page scrolling when cart drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const subtotal = getSubtotal();
  const shippingFee = getShippingFee();
  const taxAmount = getTaxAmount ? getTaxAmount() : 0;
  const total = getTotal();
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

  // Calculate total MRP savings
  const totalMrp = items.reduce((sum, i) => sum + (i.mrp * i.quantity), 0);
  const totalSavings = Math.max(0, totalMrp - total);

  const hasComboInCart = items.some(i => i.sku.includes('CMB') || i.name.toLowerCase().includes('combo'));

  const handleAddComboQuick = () => {
    addItem({
      productId: 'novise-hair-oil-shampoo-combo',
      name: 'Novise Complete Hair Regrowth & Anti-Dandruff Combo Pack',
      price: 599,
      mrp: 1399,
      sku: 'NOV-CMB-001',
      image: 'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361823/NOVISE_HERBAL/products/novise_combo_1.jpg',
      volumeText: '200 ML (Oil) + 250 ML (Shampoo)'
    });
  };

  const drawerContent = (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Dimmed Blurred Backdrop */}
      <div
        onClick={closeCart}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-fadeIn"
        aria-hidden="true"
      />

      {/* Slide-over Drawer Container */}
      <div className="relative w-full max-w-full sm:max-w-md bg-[#FAF8F5] shadow-2xl flex flex-col h-full z-10 overscroll-contain animate-slideLeft border-l border-forest-900/10">

        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-forest-900/10 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-forest-900 text-gold-400 flex items-center justify-center shadow-sm">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-forest-950 leading-tight">Your Shopping Bag</h2>
              <span className="text-[11px] text-slate-500 font-medium">
                {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'} in your ritual
              </span>
            </div>
          </div>
          <button
            onClick={closeCart}
            className="p-2 text-slate-400 hover:text-forest-950 rounded-full hover:bg-slate-100 transition"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Shipping Notice Bar */}
        <div className="bg-forest-950 text-white px-4 py-2.5 sm:px-5 border-b border-gold-500/20 flex items-center justify-between text-xs font-semibold">
          <span className="flex items-center space-x-1.5">
            <Truck className="w-4 h-4 text-gold-400 shrink-0" />
            <span className="text-slate-200">
              {appConfig.isFreeShippingEnabled || shippingFee === 0
                ? 'FREE Express Delivery Unlocked!'
                : `Express Courier Delivery`}
            </span>
          </span>
          <span className="text-[10px] sm:text-[11px] text-gold-400 font-medium">
            {appConfig.isFreeShippingEnabled || shippingFee === 0
              ? 'Complimentary Delivery'
            : `₹${shippingFee} Courier Fee`}
          </span>
        </div>

        {/* Cart Items Area */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3.5 no-scrollbar">
          {items.length === 0 ? (
            <div className="text-center py-10 sm:py-14 space-y-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-forest-900/10 text-forest-900 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-forest-900/15">
                <ShoppingBag className="w-8 h-8 sm:w-10 sm:h-10 text-forest-900" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-lg sm:text-xl font-bold text-forest-950">Your Bag is Empty</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed font-normal">
                  Experience pure Ayurvedic hair restoration without harsh chemicals or fillers.
                </p>
              </div>

              {/* Instant Best-Seller Recommendation Card */}
              <div className="mt-6 p-4 rounded-2xl bg-white border border-gold-500/30 text-left shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full">
                    #1 Best Seller Bundle
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Save 57%
                  </span>
                </div>

                <div className="flex space-x-3 items-center">
                  <img
                    src="https://res.cloudinary.com/ipb9jst1/image/upload/v1793361823/NOVISE_HERBAL/products/novise_combo_1.jpg"
                    alt="Novise Complete Combo"
                    className="w-16 h-16 object-cover rounded-xl border border-slate-100 bg-slate-50 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/placeholder.jpg';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-forest-950 truncate">Complete Hair & Scalp Combo Pack</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">200 ML Oil + 250 ML Shampoo</p>
                    <div className="flex items-baseline space-x-2 mt-1">
                      <span className="text-sm font-extrabold text-forest-950">₹599</span>
                      <span className="text-xs text-slate-400 line-through">₹1399</span>
                      <span className="text-[10px] font-bold text-emerald-600">Save ₹800</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAddComboQuick}
                  className="w-full py-2.5 bg-forest-950 hover:bg-forest-900 text-gold-400 text-xs font-extrabold uppercase tracking-wider rounded-xl transition flex items-center justify-center space-x-2 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Combo to Bag (₹599)</span>
                </button>
              </div>

              <button
                onClick={() => {
                  closeCart();
                  onNavigateProduct('novise-hair-oil-shampoo-combo');
                }}
                className="inline-block text-xs text-forest-900 font-bold hover:underline pt-2"
              >
                Or Explore All Formulations →
              </button>
            </div>
          ) : (
            <>
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex space-x-3.5 p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 bg-white transition hover:border-forest-900/30 shadow-sm"
                >
                  <img
                    src={getFullImageUrl(item.image, item.name)}
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded-xl bg-slate-50 shrink-0 border border-slate-100"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getFallbackProductImage(item.name);
                    }}
                  />
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-xs font-bold text-forest-950 line-clamp-2 leading-snug">
                          {item.name}
                        </h4>
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="text-slate-300 hover:text-rose-600 p-1 rounded-md transition shrink-0"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {item.volumeText && (
                        <span className="text-[10px] text-forest-900/80 bg-forest-900/5 px-2 py-0.5 rounded-md font-semibold mt-1 inline-block">
                          {item.volumeText}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                      <div className="flex items-baseline space-x-1.5">
                        <span className="text-sm font-extrabold text-forest-950">₹{item.price}</span>
                        {item.mrp > item.price && (
                          <span className="text-xs text-slate-400 line-through">₹{item.mrp}</span>
                        )}
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shadow-inner">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="px-2 py-1 hover:bg-slate-200 text-slate-600 transition"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 text-xs font-bold text-slate-800">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="px-2 py-1 hover:bg-slate-200 text-slate-600 transition"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Combo Upsell Banner if not already added */}
              {!hasComboInCart && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-xs shadow-sm">
                  <div className="flex items-start space-x-2.5">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold text-amber-950">Add the Synergistic Combo & Save ₹800!</p>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Includes Ayurvedic Growth Oil (200ml) + Clarifying Anti-Dandruff Shampoo (250ml) for ₹599.
                      </p>
                      <button
                        onClick={handleAddComboQuick}
                        className="mt-2 text-[11px] bg-amber-700 hover:bg-amber-800 text-white font-extrabold px-3 py-1 rounded-lg transition shadow-sm"
                      >
                        + Add Combo (₹599)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Drawer Footer: Order Summary & Checkout Action */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-slate-200 bg-white space-y-3.5 shadow-lg">

            {/* Price Calculations (No Coupon Option) */}
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-semibold text-slate-900">₹{subtotal}</span>
              </div>

              {totalSavings > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Bundle & MRP Savings</span>
                  <span>-₹{totalSavings}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Shipping</span>
                <span>
                  {shippingFee === 0 ? (
                    <span className="font-semibold text-emerald-700">FREE</span>
                  ) : (
                    <span className="font-semibold text-slate-900">₹{shippingFee}</span>
                  )}
                </span>
              </div>

              {taxAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>GST ({appConfig.gstPercentage}%)</span>
                  <span className="font-semibold text-slate-900">₹{taxAmount}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex justify-between items-baseline text-base font-extrabold text-forest-950">
                <span>Final Payable Amount</span>
                <span className="text-xl text-forest-950 font-serif">₹{total}</span>
              </div>
            </div>

            {/* Trust Micro-Badges */}
            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
              <span className="flex items-center space-x-1">
                <Truck className="w-3.5 h-3.5 text-forest-900" />
                <span>Cash on Delivery</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-forest-900" />
                <span>100% Ayurvedic</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <Lock className="w-3 h-3 text-forest-900" />
                <span>Secure Checkout</span>
              </span>
            </div>

            {/* Primary Checkout CTA */}
            <button
              onClick={() => {
                closeCart();
                onCheckout();
              }}
              className="w-full py-3.5 sm:py-4 bg-forest-950 hover:bg-forest-900 text-white font-extrabold text-xs sm:text-sm tracking-wider uppercase rounded-xl transition shadow-xl shadow-forest-950/20 flex items-center justify-center space-x-2 group"
            >
              <Lock className="w-4 h-4 text-gold-400" />
              <span>PROCEED TO CHECKOUT • ₹{total}</span>
              <ArrowRight className="w-4 h-4 text-gold-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(drawerContent, document.body) : null;
};
