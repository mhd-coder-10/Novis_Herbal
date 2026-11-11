import React, { useState, useEffect } from 'react';
import {
  Settings,
  Calendar,
  RotateCcw,
  Truck,
  Building,
  Mail,
  ShieldCheck,
  Save,
  Check,
  Plus,
  Minus,
  RefreshCw,
  Loader2,
  AlertCircle,
  HelpCircle,
  Package,
  Phone,
  PhoneCall,
  MessageCircle,
  DollarSign,
  Clock
} from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../store/useToastStore';
import { sanitizePhoneNumber, isValidIndianPhone, handlePhoneKeyDown } from '../../utils/phoneValidation';
import { emitLiveEvent } from '../../services/realtimeSync';

interface OrderSettings {
  allowCancellationAfterPacking: boolean;
  autoRestockOnCancellation: boolean;
  autoManageStock: boolean;
  damagedReportWindowHours: number;
  maxReportVideoMinutes: number;
}

interface StoreSettings {
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  supportWhatsApp: string;
  businessAddress: string;
  gstNumber: string;
  currencySymbol: string;
  freeShippingThreshold: number;
  standardShippingFee: number;
  codFee: number;
  estimatedDeliveryText: string;
  enableOrderEmails: boolean;
  enableStatusUpdateEmails: boolean;
  enableAdminAlerts: boolean;
}

export const AdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'POLICY' | 'SHIPPING' | 'STORE' | 'NOTIFICATIONS'>('STORE');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [orderSettings, setOrderSettings] = useState<OrderSettings>({
    allowCancellationAfterPacking: true,
    autoRestockOnCancellation: true,
    autoManageStock: true,
    damagedReportWindowHours: 2,
    maxReportVideoMinutes: 3
  });

  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    storeName: 'Novise Herbal',
    supportEmail: 'support@novise.in',
    supportPhone: '8980596225',
    supportWhatsApp: '8980596225',
    businessAddress: 'Novise Naturals, Mumbai, Maharashtra, India',
    gstNumber: '27AAAAA0000A1Z5',
    currencySymbol: '₹',
    freeShippingThreshold: 499,
    standardShippingFee: 49,
    codFee: 0,
    estimatedDeliveryText: '3-5 Business Days',
    enableOrderEmails: true,
    enableStatusUpdateEmails: true,
    enableAdminAlerts: true
  });

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/orders/admin/settings/order-policy');
      if (res.data?.success && res.data.settings) {
        if (res.data.settings.orderSettings) {
          setOrderSettings({
            allowCancellationAfterPacking: res.data.settings.orderSettings.allowCancellationAfterPacking ?? true,
            autoRestockOnCancellation: res.data.settings.orderSettings.autoRestockOnCancellation ?? true,
            autoManageStock: res.data.settings.orderSettings.autoManageStock ?? true,
            damagedReportWindowHours: res.data.settings.orderSettings.damagedReportWindowHours ?? 2,
            maxReportVideoMinutes: res.data.settings.orderSettings.maxReportVideoMinutes ?? 3
          });
        }

        if (res.data.settings.storeSettings) {
          setStoreSettings(prev => ({
            ...prev,
            ...res.data.settings.storeSettings,
            supportPhone: res.data.settings.storeSettings.supportPhone || prev.supportPhone,
            supportWhatsApp: res.data.settings.storeSettings.supportWhatsApp || res.data.settings.storeSettings.supportPhone || prev.supportWhatsApp,
          }));
        }
      }
    } catch (err: any) {
      console.warn('Settings load error:', err);
      toast.error('Could not load stored project settings', 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanSupportPhone = sanitizePhoneNumber(storeSettings.supportPhone);
    if (!isValidIndianPhone(cleanSupportPhone)) {
      toast.warning('Please enter a valid 10-digit calling hotline mobile number starting with 6, 7, 8, or 9', 'Invalid Calling Phone');
      return;
    }

    const cleanSupportWhatsApp = sanitizePhoneNumber(storeSettings.supportWhatsApp);
    if (!isValidIndianPhone(cleanSupportWhatsApp)) {
      toast.warning('Please enter a valid 10-digit WhatsApp mobile number starting with 6, 7, 8, or 9', 'Invalid WhatsApp Number');
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.put('/orders/admin/settings/order-policy', {
        orderSettings,
        storeSettings: {
          ...storeSettings,
          supportPhone: cleanSupportPhone,
          supportWhatsApp: cleanSupportWhatsApp
        }
      });
      if (res.data?.success) {
        toast.success('Store information & credentials saved successfully!', 'Settings Saved');
        emitLiveEvent('SETTINGS_UPDATED', res.data.settings);
        emitLiveEvent('CMS_UPDATED', { settings: res.data.settings, cms: res.data.settings?.cms });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save settings', 'Error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 w-full animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-forest-900 text-gold-400 flex items-center justify-center shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-black text-forest-950">
                Store Settings
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure order cancellation policies, shipping rates, and store contact info.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={fetchSettings}
            disabled={isLoading || isSaving}
            className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition shadow-xs flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isLoading || isSaving}
            className="px-5 py-2.5 bg-forest-900 hover:bg-forest-800 text-gold-400 font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Saving Changes...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1 text-xs">
        <button
          onClick={() => setActiveTab('POLICY')}
          className={`px-4 py-2.5 rounded-2xl font-bold whitespace-nowrap transition flex items-center space-x-2 ${activeTab === 'POLICY'
            ? 'bg-forest-900 text-gold-400 shadow-sm'
            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Inventory & Fulfillment Rules</span>
        </button>

        <button
          onClick={() => setActiveTab('SHIPPING')}
          className={`px-4 py-2.5 rounded-2xl font-bold whitespace-nowrap transition flex items-center space-x-2 ${activeTab === 'SHIPPING'
            ? 'bg-forest-900 text-gold-400 shadow-sm'
            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
        >
          <Truck className="w-4 h-4" />
          <span>Shipping & Delivery Rules</span>
        </button>

        <button
          onClick={() => setActiveTab('STORE')}
          className={`px-4 py-2.5 rounded-2xl font-bold whitespace-nowrap transition flex items-center space-x-2 ${activeTab === 'STORE'
            ? 'bg-forest-900 text-gold-400 shadow-sm'
            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
        >
          <Building className="w-4 h-4" />
          <span>Store Information & GST</span>
        </button>

        <button
          onClick={() => setActiveTab('NOTIFICATIONS')}
          className={`px-4 py-2.5 rounded-2xl font-bold whitespace-nowrap transition flex items-center space-x-2 ${activeTab === 'NOTIFICATIONS'
            ? 'bg-forest-900 text-gold-400 shadow-sm'
            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
        >
          <Mail className="w-4 h-4" />
          <span>Automated Notifications</span>
        </button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80">
          <Loader2 className="w-8 h-8 animate-spin text-forest-900 mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-semibold">Loading system settings...</p>
        </div>
      ) : (
        <form onSubmit={handleSaveAll} className="space-y-6">

          {/* ================================================================
             TAB 1: CANCELLATION & NON-RETURNABLE POLICY
             ================================================================ */}
          {activeTab === 'POLICY' && (
            <div className="space-y-6">

              {/* Strict Non-Returnable & Non-Replaceable Store Policy Notice */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
                <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200/80">
                    <ShieldCheck className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-forest-950">
                      Strictly Non-Returnable & Non-Replaceable Policy Active
                    </h3>
                    <p className="text-xs text-slate-500">
                      All Novise botanical personal-care formulations are strictly non-returnable and non-replaceable once delivered
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-slate-200/80 flex items-start space-x-3 text-xs text-slate-700">
                  <AlertCircle className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold text-slate-900 block">Zero Return & Replacement Guarantee:</span>
                    <p>
                      Returns, exchanges, and replacements are permanently disabled across the customer storefront and backend operations. For customer hygiene and herbal active integrity, products once delivered cannot be returned, exchanged, or restocked. Customers can only cancel orders prior to courier delivery.
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Cancellation Rules */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm space-y-5">
                <h3 className="font-serif text-lg font-bold text-forest-950 pb-3 border-b border-slate-100">
                  Order Cancellation & Pre-Delivery Fulfillment Rules
                </h3>

                <div className="space-y-4 text-xs">
                  {/* Rule 1: Automatic Stock & Quantity Management */}
                  <div className="flex items-start justify-between p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <strong className="text-forest-950 font-bold text-sm">Automatic Inventory & Quantity Management</strong>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-forest-900 text-gold-400">Core Stock Sync</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">
                        When enabled, product warehouse stock is automatically deducted upon sales (both online store orders and offline retail counter sales) and automatically adjusted when sale quantities are revised or cancelled. If turned off, stock quantities must be adjusted manually by the store owner.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={orderSettings.autoManageStock}
                        onChange={(e) => setOrderSettings(prev => ({ ...prev, autoManageStock: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest-900"></div>
                    </label>
                  </div>

                  {/* Rule 2: Allow Cancellation After Packing */}
                  <div className="flex items-start justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/80 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <strong className="text-slate-900 font-bold text-sm">Allow Cancellation Requests After Packing</strong>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Requires Approval</span>
                      </div>
                      <p className="text-slate-500">
                        When enabled, customers can submit cancellation requests for orders in <strong>Packed</strong> or <strong>Shipment Booked</strong> stages. The order is not cancelled immediately; it waits for your review and approval.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={orderSettings.allowCancellationAfterPacking}
                        onChange={(e) => setOrderSettings(prev => ({ ...prev, allowCancellationAfterPacking: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest-900"></div>
                    </label>
                  </div>

                  {/* Rule 3: Auto Restock on Cancellation */}
                  <div className="flex items-start justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/80 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <strong className="text-slate-900 font-bold text-sm">Automatic Inventory Restocking on Cancellation</strong>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Inventory Sync</span>
                      </div>
                      <p className="text-slate-500">
                        Automatically restore product inventory quantities when an order is cancelled prior to courier dispatch.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={orderSettings.autoRestockOnCancellation}
                        onChange={(e) => setOrderSettings(prev => ({ ...prev, autoRestockOnCancellation: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest-900"></div>
                    </label>
                  </div>

                  {/* Rule 4: Damage & Missing Item Video Reporting Time Limit (Dynamic with Public Timer) */}
                  <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-amber-200/90 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <strong className="text-forest-950 font-bold text-sm">
                            Damage & Missing Item Video Reporting Time Limit
                          </strong>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 font-mono">
                            Live Countdown Timer Sync
                          </span>
                        </div>
                        <p className="text-slate-600 leading-relaxed text-xs">
                          Set the maximum duration (in hours) after order delivery during which a customer can raise a damage, defect, or missing item report with required video proof. A live countdown timer is shown on the customer portal. After this window closes, reports cannot be submitted.
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 self-start sm:self-auto">
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            max="72"
                            required
                            value={orderSettings.damagedReportWindowHours}
                            onChange={(e) => {
                              const val = Math.max(1, Math.min(72, Number(e.target.value) || 1));
                              setOrderSettings(prev => ({ ...prev, damagedReportWindowHours: val }));
                            }}
                            className="w-24 px-3 py-2 bg-white border border-amber-300 rounded-xl text-center font-bold text-sm text-forest-950 focus:outline-none focus:ring-2 focus:ring-forest-900/15"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                            hrs
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 text-[11px] text-amber-800 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/60">
                      <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>
                        Currently: Customers have exactly <strong>{orderSettings.damagedReportWindowHours} hour(s)</strong> ({orderSettings.damagedReportWindowHours * 60} minutes) after doorstep delivery to upload unboxing video proof (Cloudinary folder: <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300">Order_Report_Videos</code>).
                      </span>
                    </div>
                  </div>

                  {/* Rule 5: Max Video Proof Duration Limit */}
                  <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-amber-200/90 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <strong className="text-forest-950 font-bold text-sm">
                            Max Video Proof Duration (Per Report)
                          </strong>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 font-mono">
                            Auto Form Validation
                          </span>
                        </div>
                        <p className="text-slate-600 leading-relaxed text-xs">
                          Set the maximum duration (in minutes) for the customer's unboxing and damaged parcel video proof. Customer can upload 1 single video up to this length.
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 self-start sm:self-auto">
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            max="10"
                            required
                            value={orderSettings.maxReportVideoMinutes}
                            onChange={(e) => {
                              const val = Math.max(1, Math.min(10, Number(e.target.value) || 1));
                              setOrderSettings(prev => ({ ...prev, maxReportVideoMinutes: val }));
                            }}
                            className="w-24 px-3 py-2 bg-white border border-amber-300 rounded-xl text-center font-bold text-sm text-forest-950 focus:outline-none focus:ring-2 focus:ring-forest-900/15"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                            min
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 text-[11px] text-amber-800 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/60">
                      <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>
                        Currently: Maximum allowed video proof length is <strong>{orderSettings.maxReportVideoMinutes} minute(s)</strong> ({orderSettings.maxReportVideoMinutes * 60} seconds).
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ================================================================
             TAB 2: SHIPPING & DELIVERY RULES
             ================================================================ */}
          {activeTab === 'SHIPPING' && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm space-y-6">
              <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
                <Truck className="w-5 h-5 text-forest-900" />
                <div>
                  <h3 className="font-serif text-lg font-bold text-forest-950">
                    Shipping Charges & Free Delivery Threshold
                  </h3>
                  <p className="text-xs text-slate-500">
                    Set up standard rates, minimum order criteria for free shipping, and delivery timelines.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Free Shipping Minimum Order Amount (₹) *
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">Orders above this cart subtotal receive complimentary delivery.</p>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500">₹</span>
                    <input
                      type="number"
                      required
                      min="0"
                      value={storeSettings.freeShippingThreshold}
                      onChange={(e) => setStoreSettings({ ...storeSettings, freeShippingThreshold: Number(e.target.value) })}
                      className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-bold text-forest-950 focus:outline-none focus:ring-1 focus:ring-forest-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Standard Courier Shipping Fee (₹) *
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">Applied to cart orders that do not qualify for free shipping.</p>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500">₹</span>
                    <input
                      type="number"
                      required
                      min="0"
                      value={storeSettings.standardShippingFee}
                      onChange={(e) => setStoreSettings({ ...storeSettings, standardShippingFee: Number(e.target.value) })}
                      className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-bold text-forest-950 focus:outline-none focus:ring-1 focus:ring-forest-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Cash on Delivery (COD) Convenience Fee (₹)
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">Extra fee for handling COD doorstep collections (0 for free).</p>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={storeSettings.codFee}
                      onChange={(e) => setStoreSettings({ ...storeSettings, codFee: Number(e.target.value) })}
                      className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-bold text-forest-950 focus:outline-none focus:ring-1 focus:ring-forest-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Estimated Courier Delivery Display Text
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">Shown on checkout and product pages for delivery expectation.</p>
                  <input
                    type="text"
                    value={storeSettings.estimatedDeliveryText}
                    onChange={(e) => setStoreSettings({ ...storeSettings, estimatedDeliveryText: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-forest-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
             TAB 3: STORE & BUSINESS INFORMATION
             ================================================================ */}
          {activeTab === 'STORE' && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm space-y-6">
              <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
                <Building className="w-5 h-5 text-forest-900" />
                <div>
                  <h3 className="font-serif text-lg font-bold text-forest-950">
                    Store Identity & Customer Care Contact
                  </h3>
                  <p className="text-xs text-slate-500">
                    Details printed on GST Invoices, order notifications, and customer return labels.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Store / Brand Name *</label>
                  <input
                    type="text"
                    required
                    value={storeSettings.storeName}
                    onChange={(e) => setStoreSettings({ ...storeSettings, storeName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-forest-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">GSTIN / Tax ID Number *</label>
                  <input
                    type="text"
                    required
                    value={storeSettings.gstNumber}
                    onChange={(e) => setStoreSettings({ ...storeSettings, gstNumber: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-mono font-bold text-slate-900 uppercase focus:outline-none focus:ring-1 focus:ring-forest-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Customer Support Email *</label>
                  <input
                    type="email"
                    required
                    value={storeSettings.supportEmail}
                    onChange={(e) => setStoreSettings({ ...storeSettings, supportEmail: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-forest-900"
                  />
                </div>

                {/* Calling Phone Number Field */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-bold text-slate-700 flex items-center space-x-1.5">
                      <PhoneCall className="w-3.5 h-3.5 text-forest-900" />
                      <span>Customer Calling Phone Hotline *</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {storeSettings.supportPhone ? `${sanitizePhoneNumber(storeSettings.supportPhone).length}/10 digits` : '10 digits'}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">+91</span>
                    <input
                      type="tel"
                      required
                      inputMode="numeric"
                      maxLength={10}
                      pattern="[6-9][0-9]{9}"
                      placeholder="9876543210"
                      value={sanitizePhoneNumber(storeSettings.supportPhone)}
                      onChange={(e) => setStoreSettings({ ...storeSettings, supportPhone: sanitizePhoneNumber(e.target.value) })}
                      onKeyDown={handlePhoneKeyDown}
                      className="w-full pl-12 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-mono font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-forest-900"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Dialed when customers click voice call links across the storefront and invoices.</p>
                </div>

                {/* WhatsApp Support Number Field */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-bold text-slate-700 flex items-center space-x-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Direct WhatsApp Support Number *</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {storeSettings.supportWhatsApp ? `${sanitizePhoneNumber(storeSettings.supportWhatsApp).length}/10 digits` : '10 digits'}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">+91</span>
                    <input
                      type="tel"
                      required
                      inputMode="numeric"
                      maxLength={10}
                      pattern="[6-9][0-9]{9}"
                      placeholder="9876543210"
                      value={sanitizePhoneNumber(storeSettings.supportWhatsApp)}
                      onChange={(e) => setStoreSettings({ ...storeSettings, supportWhatsApp: sanitizePhoneNumber(e.target.value) })}
                      onKeyDown={handlePhoneKeyDown}
                      className="w-full pl-12 pr-4 py-2.5 border border-emerald-200/80 rounded-xl bg-emerald-50/20 font-mono font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Opens direct WhatsApp chat (wa.me) when customers click WhatsApp buttons.</p>
                </div>

                <div className="md:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Warehouse & Operating Business Address *</label>
                  <textarea
                    rows={2}
                    required
                    value={storeSettings.businessAddress}
                    onChange={(e) => setStoreSettings({ ...storeSettings, businessAddress: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-forest-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
             TAB 4: NOTIFICATIONS
             ================================================================ */}
          {activeTab === 'NOTIFICATIONS' && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm space-y-6">
              <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
                <Mail className="w-5 h-5 text-forest-900" />
                <div>
                  <h3 className="font-serif text-lg font-bold text-forest-950">
                    Automated Transactional Emails & Alerts
                  </h3>
                  <p className="text-xs text-slate-500">
                    Control which transactional emails are dispatched to customers and administrators.
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div>
                    <strong className="text-slate-900 font-bold block text-sm">Send Order Confirmation Emails</strong>
                    <span className="text-slate-500">Dispatches invoice and order receipt to customer immediately upon placement.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={storeSettings.enableOrderEmails}
                      onChange={(e) => setStoreSettings(prev => ({ ...prev, enableOrderEmails: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest-900"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div>
                    <strong className="text-slate-900 font-bold block text-sm">Send Order Status & Tracking Emails</strong>
                    <span className="text-slate-500">Notifies customer when their parcel is Packed, Courier Shipped, Out for Delivery, or Delivered.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={storeSettings.enableStatusUpdateEmails}
                      onChange={(e) => setStoreSettings(prev => ({ ...prev, enableStatusUpdateEmails: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest-900"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div>
                    <strong className="text-slate-900 font-bold block text-sm">Send Admin Order Alerts</strong>
                    <span className="text-slate-500">Sends instant notification to store support team whenever a new order is received.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={storeSettings.enableAdminAlerts}
                      onChange={(e) => setStoreSettings(prev => ({ ...prev, enableAdminAlerts: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest-900"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Save Bar */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-forest-900 hover:bg-forest-800 text-gold-400 font-bold text-xs rounded-xl shadow-lg transition flex items-center space-x-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSaving ? 'Saving Store Settings...' : 'Save All Changes'}</span>
            </button>
          </div>

        </form>
      )}
    </div>
  );
};

