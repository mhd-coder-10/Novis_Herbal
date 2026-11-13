import React, { useState } from 'react';
import { ShieldCheck, Truck, ArrowLeft, Tag, Lock, CheckCircle2 } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';
import { getFullImageUrl, getFallbackProductImage } from '../../services/api';
import api from '../../services/api';
import { toast } from '../../store/useToastStore';
import { StoreSelect } from '../../components/common/StoreSelect';
import { sanitizePhoneNumber, isValidIndianPhone, handlePhoneKeyDown } from '../../utils/phoneValidation';
import { appConfig } from '../../config/appConfig';

interface CheckoutPageProps {
  onOrderSuccess: (orderId: string) => void;
  onBackToCart: () => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onOrderSuccess, onBackToCart }) => {
  const { items, getSubtotal, getShippingFee, getTaxAmount, getTotal, clearCart } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();

  const savedAddress = (user?.addresses && user.addresses.length > 0)
    ? (user.addresses.find(a => a.isDefault) || user.addresses[0])
    : null;

  const [formData, setFormData] = useState({
    fullName: savedAddress?.fullName || user?.name || '',
    email: user?.email || '',
    phone: savedAddress?.phone || user?.phone || '',
    addressLine1: savedAddress?.addressLine1 || '',
    addressLine2: savedAddress?.addressLine2 || '',
    landmark: savedAddress?.landmark || '',
    city: savedAddress?.city || '',
    state: savedAddress?.state || 'Maharashtra',
    pincode: savedAddress?.pincode || '',
    paymentMethod: 'ONLINE' as 'ONLINE' | 'COD'
  });

  const hasPopulatedFromSavedAddress = React.useRef(false);

  // Sync user info & saved delivery address into form if loaded
  React.useEffect(() => {
    if (user) {
      const saved = (user.addresses && user.addresses.length > 0)
        ? (user.addresses.find(a => a.isDefault) || user.addresses[0])
        : null;

      setFormData((prev) => {
        if (!hasPopulatedFromSavedAddress.current && saved) {
          hasPopulatedFromSavedAddress.current = true;
          return {
            ...prev,
            fullName: prev.fullName || saved.fullName || user.name || '',
            email: prev.email || user.email || '',
            phone: prev.phone || saved.phone || user.phone || '',
            addressLine1: prev.addressLine1 || saved.addressLine1 || '',
            addressLine2: prev.addressLine2 || saved.addressLine2 || '',
            landmark: prev.landmark || saved.landmark || '',
            city: prev.city || saved.city || '',
            state: saved.state || prev.state || 'Maharashtra',
            pincode: prev.pincode || saved.pincode || ''
          };
        }

        return {
          ...prev,
          fullName: prev.fullName || user.name || '',
          email: prev.email || user.email || '',
          phone: prev.phone || user.phone || ''
        };
      });
    }
  }, [user]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const subtotal = getSubtotal();
  const shippingFee = getShippingFee();
  const taxAmount = getTaxAmount ? getTaxAmount() : 0;
  const codFee = formData.paymentMethod === 'COD' ? appConfig.codFee : 0;
  const total = subtotal + shippingFee + taxAmount + codFee;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let value = e.target.value;
    if (e.target.name === 'phone') {
      value = sanitizePhoneNumber(value);
    }
    setFormData({ ...formData, [e.target.name]: value });
  };

  // Login Gate: Prevent unauthorized checkouts
  if (!isAuthenticated) {
    return (
      <div className="w-full px-3.5 sm:px-6 lg:px-10 py-12 sm:py-20 max-w-lg mx-auto text-center">
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/80 shadow-luxury space-y-4">
          <div className="w-16 h-16 rounded-full bg-forest-900/10 text-forest-900 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-forest-950">
            Sign In Required to Place Order
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            To prevent fraudulent orders, secure delivery address, and send automatic email updates on dispatch, please sign in or create an account with email verification.
          </p>
          <div className="pt-3 space-y-2.5">
            <a
              href="/login?redirect=/checkout"
              className="w-full py-3.5 bg-forest-900 text-gold-400 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-forest-800 transition shadow-md shadow-forest-900/10 flex items-center justify-center space-x-2"
            >
              <span>Sign In / Create Account with OTP</span>
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </a>
            <button
              onClick={onBackToCart}
              className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-800 font-semibold"
            >
              Return to Store
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (items.length === 0) {
      setErrorMessage('Your bag is empty.');
      return;
    }

    if (!formData.fullName || !formData.email || !formData.phone || !formData.addressLine1 || !formData.pincode || !formData.city) {
      const err = 'Please fill in all mandatory delivery details.';
      setErrorMessage(err);
      toast.warning(err, 'Delivery Details Required');
      return;
    }

    const cleanPhone = sanitizePhoneNumber(formData.phone);
    if (!isValidIndianPhone(cleanPhone)) {
      const err = 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.';
      setErrorMessage(err);
      toast.warning(err, 'Invalid Mobile Number');
      return;
    }

    setIsProcessing(true);

    try {
      const payload = {
        items: items.map(i => ({
          productId: i.productId,
          quantity: i.quantity
        })),
        customerDetails: {
          fullName: formData.fullName,
          email: formData.email,
          phone: cleanPhone
        },
        shippingAddress: {
          fullName: formData.fullName,
          phone: cleanPhone,
          addressLine1: formData.addressLine1,
          addressLine2: formData.addressLine2,
          landmark: formData.landmark,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          country: 'India'
        },
        paymentMethod: formData.paymentMethod
      };

      const res = await api.post('/orders/checkout', payload);

      if (!res.data?.success) {
        throw new Error(res.data?.message || 'Could not place order');
      }

      // Handle COD Flow
      if (formData.paymentMethod === 'COD') {
        clearCart();
        const createdOrderId = res.data.orderId;
        sessionStorage.setItem('novis_last_order_id', createdOrderId);
        toast.success(`Order #${createdOrderId} placed successfully! Check your email for details.`, 'Order Placed');
        onOrderSuccess(createdOrderId);
        return;
      }

      // Handle Razorpay Online Payment Flow
      const { razorpayOrder, orderId, mode } = res.data;

      // In simulated mode
      if (mode === 'SIMULATED') {
        const verifyRes = await api.post('/orders/verify-payment', {
          razorpayOrderId: razorpayOrder.id,
          razorpayPaymentId: `pay_sim_${Date.now()}`,
          razorpaySignature: 'simulated_signature'
        });

        if (verifyRes.data?.success) {
          clearCart();
          sessionStorage.setItem('novis_last_order_id', orderId);
          toast.success(`Order #${orderId} confirmed via Online Payment!`, 'Payment Successful');
          onOrderSuccess(orderId);
          return;
        }
      }

      // Standard Razorpay SDK Modal
      if (typeof window.Razorpay !== 'undefined') {
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_novise_sample_key',
          amount: razorpayOrder.amount,
          currency: 'INR',
          name: 'Novis Herbal',
          description: `Order ${orderId}`,
          image: '/novise-emblem.png',
          order_id: razorpayOrder.id,
          prefill: {
            name: formData.fullName,
            email: formData.email,
            contact: formData.phone
          },
          theme: {
            color: '#0B3B24'
          },
          handler: async function (response: any) {
            try {
              const verifyRes = await api.post('/orders/verify-payment', {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              });

              if (verifyRes.data?.success) {
                clearCart();
                sessionStorage.setItem('novis_last_order_id', orderId);
                toast.success(`Order #${orderId} confirmed via Online Payment!`, 'Payment Successful');
                onOrderSuccess(orderId);
              } else {
                setErrorMessage('Payment verification failed on server.');
                toast.error('Payment verification failed on server.', 'Payment Error');
              }
            } catch (err: any) {
              const msg = err.response?.data?.message || 'Payment signature verification error.';
              setErrorMessage(msg);
              toast.error(msg, 'Payment Failed');
            }
          },
          modal: {
            ondismiss: function () {
              setIsProcessing(false);
              toast.info('Payment window closed.', 'Checkout');
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        clearCart();
        sessionStorage.setItem('novis_last_order_id', orderId);
        toast.success(`Order #${orderId} placed successfully!`, 'Order Placed');
        onOrderSuccess(orderId);
      }

    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'An error occurred during checkout';
      setErrorMessage(msg);
      toast.error(msg, 'Checkout Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const indianStates = [
    'Andhra Pradesh', 'Assam', 'Bihar', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Punjab',
    'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'West Bengal'
  ];

  return (
    <div className="py-4 sm:py-12">
      <div className="w-full px-3.5 sm:px-6 lg:px-10">

        {/* Return button */}
        <button
          onClick={onBackToCart}
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-forest-900 transition mb-4 sm:mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Shopping</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 lg:gap-14">

          {/* Left Form: Delivery Address & Payment Method (7 cols) */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-8">

            <form onSubmit={handlePlaceOrder} className="space-y-6 sm:space-y-8">

              {/* Step 1: Customer Contact */}
              <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm space-y-3 sm:space-y-4">
                <h2 className="font-serif text-base sm:text-lg font-bold text-forest-950 flex items-center space-x-2">
                  <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-forest-950 text-gold-400 text-[10px] sm:text-xs font-extrabold flex items-center justify-center">1</span>
                  <span>Contact Information</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="e.g. Ramesh Patel"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-[#FAF8F5] focus:outline-none focus:ring-2 focus:ring-forest-900"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-slate-700 font-bold">
                        Mobile Number <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formData.phone ? `${formData.phone.length}/10 digits` : '10 digits'}
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">+91</span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[6-9][0-9]{9}"
                        required
                        name="phone"
                        maxLength={10}
                        value={formData.phone}
                        onChange={handleInputChange}
                        onKeyDown={handlePhoneKeyDown}
                        placeholder="9876543210"
                        className="w-full pl-11 pr-3.5 py-2.5 border border-slate-200 rounded-xl bg-[#FAF8F5] focus:outline-none focus:ring-2 focus:ring-forest-900 font-mono tracking-wider"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-bold mb-1">Email Address (for order tracking & invoices) *</label>
                    <input
                      type="email"
                      required
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="e.g. ramesh@gmail.com"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-[#FAF8F5] focus:outline-none focus:ring-2 focus:ring-forest-900"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Shipping Address */}
              <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h2 className="font-serif text-base sm:text-lg font-bold text-forest-950 flex items-center space-x-2">
                    <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-forest-950 text-gold-400 text-[10px] sm:text-xs font-extrabold flex items-center justify-center">2</span>
                    <span>Delivery Address</span>
                  </h2>
                </div>

                {savedAddress && (
                  <div className="flex items-center space-x-2.5 px-3.5 py-2.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-emerald-900 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      Autofilled from your saved profile address. You can edit any field below for this order.
                    </span>
                  </div>
                )}

                <div className="space-y-3 sm:space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">House / Flat / Building No. & Street *</label>
                    <input
                      type="text"
                      required
                      name="addressLine1"
                      value={formData.addressLine1}
                      onChange={handleInputChange}
                      placeholder="e.g. Flat 402, Green Orchid Apartments, Link Road"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-[#FAF8F5] focus:outline-none focus:ring-2 focus:ring-forest-900"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Area / Locality</label>
                      <input
                        type="text"
                        name="addressLine2"
                        value={formData.addressLine2}
                        onChange={handleInputChange}
                        placeholder="e.g. Andheri West"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-[#FAF8F5] focus:outline-none focus:ring-2 focus:ring-forest-900"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Landmark</label>
                      <input
                        type="text"
                        name="landmark"
                        value={formData.landmark}
                        onChange={handleInputChange}
                        placeholder="e.g. Near Infinity Mall"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-[#FAF8F5] focus:outline-none focus:ring-2 focus:ring-forest-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Pincode *</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleInputChange}
                        placeholder="e.g. 400053"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-[#FAF8F5] focus:outline-none focus:ring-2 focus:ring-forest-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">City *</label>
                      <input
                        type="text"
                        required
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="e.g. Mumbai"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-[#FAF8F5] focus:outline-none focus:ring-2 focus:ring-forest-900"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">State *</label>
                      <StoreSelect
                        value={formData.state}
                        onChange={(val) => setFormData(prev => ({ ...prev, state: val }))}
                        options={indianStates}
                        searchable={true}
                        placeholder="Select State"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Payment Method Selection */}
              <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm space-y-3 sm:space-y-4">
                <h2 className="font-serif text-base sm:text-lg font-bold text-forest-950 flex items-center space-x-2">
                  <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-forest-950 text-gold-400 text-[10px] sm:text-xs font-extrabold flex items-center justify-center">3</span>
                  <span>Select Payment Method</span>
                </h2>

                <div className="space-y-3">

                  {/* Online Payment */}
                  <label
                    className={`flex items-start p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 cursor-pointer transition ${formData.paymentMethod === 'ONLINE'
                      ? 'border-forest-950 bg-forest-950/5'
                      : 'border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="ONLINE"
                      checked={formData.paymentMethod === 'ONLINE'}
                      onChange={() => setFormData({ ...formData, paymentMethod: 'ONLINE' })}
                      className="mt-1 text-forest-950 focus:ring-forest-950"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-forest-950">Pay Online via UPI, Cards, Netbanking</span>
                        <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">FASTEST</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                        Secure encrypted Razorpay checkout. Supports Google Pay, PhonePe, Paytm, and all Indian banks.
                      </p>
                    </div>
                  </label>

                  {/* Cash on Delivery */}
                  <label
                    className={`flex items-start p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 cursor-pointer transition ${formData.paymentMethod === 'COD'
                      ? 'border-forest-950 bg-forest-950/5'
                      : 'border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="COD"
                      checked={formData.paymentMethod === 'COD'}
                      onChange={() => setFormData({ ...formData, paymentMethod: 'COD' })}
                      className="mt-1 text-forest-950 focus:ring-forest-950"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-forest-950">Cash on Delivery (COD)</span>
                        {appConfig.codFee > 0 ? (
                          <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                            +₹{appConfig.codFee} COD FEE
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                            FREE COD
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                        Pay cash or UPI at your doorstep upon parcel delivery.
                      </p>
                    </div>
                  </label>

                </div>
              </div>

              {errorMessage && (
                <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                  {errorMessage}
                </div>
              )}

              {/* Place Order CTA */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3.5 sm:py-4 bg-forest-950 text-gold-400 hover:bg-forest-900 font-extrabold text-xs sm:text-sm tracking-wider uppercase rounded-xl sm:rounded-2xl transition shadow-xl shadow-forest-950/20 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                <span>
                  {isProcessing
                    ? 'PROCESSING ORDER...'
                    : formData.paymentMethod === 'COD'
                      ? `CONFIRM CASH ON DELIVERY ORDER (₹${total})`
                      : `PAY ₹${total} SECURELY WITH RAZORPAY`}
                </span>
              </button>

            </form>

          </div>

          {/* Right Summary Column: Items, Subtotal, Guarantees (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm sticky top-28 space-y-4 sm:space-y-6">

              <h3 className="font-serif text-lg font-bold text-forest-950 border-b border-slate-100 pb-3">
                Order Summary ({items.reduce((s, i) => s + i.quantity, 0)} items)
              </h3>

              {/* Items Mini List */}
              <div className="space-y-3 max-h-64 overflow-y-auto no-scrollbar pr-1">
                {items.map((item) => (
                  <div key={item.productId} className="flex items-center space-x-3 text-xs">
                    <img
                      src={getFullImageUrl(item.image, item.name)}
                      alt={item.name}
                      className="w-12 h-12 rounded-xl object-cover bg-slate-50 border border-slate-100 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getFallbackProductImage(item.name);
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-400">Qty: {item.quantity} {item.volumeText ? `• ${item.volumeText}` : ''}</p>
                    </div>
                    <span className="font-extrabold text-forest-950 shrink-0">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-2.5 text-xs border-t border-slate-100 pt-4 text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-800">₹{subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>
                    {shippingFee === 0 ? (
                      <span className="font-semibold text-emerald-700">FREE</span>
                    ) : (
                      `₹${shippingFee}`
                    )}
                  </span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span>GST ({appConfig.gstPercentage}%)</span>
                    <span className="font-semibold text-slate-800">₹{taxAmount}</span>
                  </div>
                )}
                {codFee > 0 && formData.paymentMethod === 'COD' && (
                  <div className="flex justify-between text-amber-900 font-semibold">
                    <span>COD Handling Fee</span>
                    <span>₹{codFee}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold text-forest-950 pt-2 border-t border-slate-200">
                  <span>Grand Total</span>
                  <span className="text-xl text-forest-950">₹{total}</span>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 border-t border-slate-100 space-y-2.5 text-[11px] text-slate-500 font-medium">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{appConfig.estimatedDeliveryText}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-forest-950 shrink-0" />
                  <span>100% Genuine Ayurvedic & Botanical Guarantee</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-forest-950 shrink-0" />
                  <span>256-bit Bank Grade Encrypted Transactions</span>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
