import React, { useState, useEffect } from 'react';
import {
  Settings,
  Calendar,
  Truck,
  Building,
  Mail,
  ShieldCheck,
  Save,
  Check,
  Plus,
  Minus,
  Loader2,
  AlertCircle,
  HelpCircle,
  Package,
  Phone,
  PhoneCall,
  MessageCircle,
  DollarSign,
  Clock,
  Percent,
  FileText
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
  legalEntityName: string;
  sellerState: string;
  gstPercentage: number;
  supportEmail: string;
  supportPhone: string;
  supportWhatsApp: string;
  businessAddress: string;
  gstNumber: string;
  invoiceTerms: string;
  currencySymbol: string;
  isFreeShippingEnabled: boolean;
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
    legalEntityName: 'Novis Herbal Naturals',
    sellerState: 'Gujarat',
    gstPercentage: 5,
    supportEmail: 'support@novise.in',
    supportPhone: '8980596225',
    supportWhatsApp: '8980596225',
    businessAddress: 'Novis Herbal Naturals, Sidhpur, Gujarat, India, 384151',
    gstNumber: '27AAAAA0000A1Z5',
    invoiceTerms: '• Authentic Ayurvedic personal-care formulation with tamper-evident seal.\n• All items once delivered are strictly Non-Returnable and Non-Replaceable for hygiene & safety.\n• This is a computer-generated tax invoice and requires no physical signature.',
    currencySymbol: '₹',
    isFreeShippingEnabled: true,
    freeShippingThreshold: 0,
    standardShippingFee: 0,
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
            isFreeShippingEnabled: res.data.settings.storeSettings.isFreeShippingEnabled !== undefined
              ? Boolean(res.data.settings.storeSettings.isFreeShippingEnabled)
              : prev.isFreeShippingEnabled,
            legalEntityName: res.data.settings.storeSettings.legalEntityName || prev.legalEntityName,
            sellerState: res.data.settings.storeSettings.sellerState || prev.sellerState,
            gstPercentage: res.data.settings.storeSettings.gstPercentage !== undefined ? Number(res.data.settings.storeSettings.gstPercentage) : prev.gstPercentage,
            supportPhone: res.data.settings.storeSettings.supportPhone || prev.supportPhone,
            supportWhatsApp: res.data.settings.storeSettings.supportWhatsApp || res.data.settings.storeSettings.supportPhone || prev.supportWhatsApp,
            invoiceTerms: res.data.settings.storeSettings.invoiceTerms || prev.invoiceTerms,
            businessAddress: res.data.settings.storeSettings.businessAddress || prev.businessAddress
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
                    Shipping Charges & Delivery Rules
                  </h3>
                  <p className="text-xs text-slate-500">
                    Control store-wide complimentary free shipping or set a custom dynamic courier charge.
                  </p>
                </div>
              </div>

              {/* Shipping Strategy Selector */}
              <div className="space-y-3">
                <label className="font-bold text-slate-700 block text-xs">
                  Store Shipping Policy Mode
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option 1: 100% Free Shipping */}
                  <div
                    onClick={() => setStoreSettings({ ...storeSettings, isFreeShippingEnabled: true, standardShippingFee: 0, freeShippingThreshold: 0 })}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start space-x-3.5 ${storeSettings.isFreeShippingEnabled
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                      }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${storeSettings.isFreeShippingEnabled
                      ? 'border-emerald-600 bg-emerald-600'
                      : 'border-slate-400 bg-white'
                      }`}>
                      {storeSettings.isFreeShippingEnabled && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-forest-950">100% Free Shipping on All Orders</span>
                        {storeSettings.isFreeShippingEnabled && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Active Mode</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Complimentary delivery on all orders across India. Customers are charged ₹0 shipping fee.
                      </p>
                    </div>
                  </div>

                  {/* Option 2: Dynamic Courier Shipping Fee */}
                  <div
                    onClick={() => setStoreSettings({ ...storeSettings, isFreeShippingEnabled: false, standardShippingFee: storeSettings.standardShippingFee || 49, freeShippingThreshold: 0 })}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start space-x-3.5 ${!storeSettings.isFreeShippingEnabled
                      ? 'border-forest-900 bg-forest-50/40 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                      }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${!storeSettings.isFreeShippingEnabled
                      ? 'border-forest-900 bg-forest-900'
                      : 'border-slate-400 bg-white'
                      }`}>
                      {!storeSettings.isFreeShippingEnabled && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-forest-950">Dynamic / Custom Courier Charge</span>
                        {!storeSettings.isFreeShippingEnabled && (
                          <span className="text-[10px] bg-forest-100 text-forest-900 font-bold px-2 py-0.5 rounded-full">Active Mode</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Set any custom courier shipping charge to be applied on customer orders.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              {storeSettings.isFreeShippingEnabled ? (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center space-x-2.5">
                  <span className="text-base">🎁</span>
                  <div>
                    <strong>100% Free Shipping is Active:</strong> All customer orders across India receive ₹0 shipping fee automatically.
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center space-x-2.5">
                  <span className="text-base">🚚</span>
                  <div>
                    <strong>Dynamic Courier Shipping is Active:</strong> Flat ₹{storeSettings.standardShippingFee} courier shipping fee will be charged on customer orders.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs pt-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Courier Shipping Charge (₹)
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">Applied to customer orders when Dynamic mode is active.</p>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500">₹</span>
                    <input
                      type="number"
                      required
                      min="0"
                      disabled={storeSettings.isFreeShippingEnabled}
                      value={storeSettings.standardShippingFee}
                      onChange={(e) => setStoreSettings({ ...storeSettings, standardShippingFee: Math.max(0, Number(e.target.value)) })}
                      className={`w-full pl-8 pr-4 py-2.5 border rounded-xl font-bold text-forest-950 focus:outline-none focus:ring-1 focus:ring-forest-900 ${storeSettings.isFreeShippingEnabled
                        ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'border-slate-200 bg-slate-50'
                        }`}
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
                      onChange={(e) => setStoreSettings({ ...storeSettings, codFee: Math.max(0, Number(e.target.value)) })}
                      className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-bold text-forest-950 focus:outline-none focus:ring-1 focus:ring-forest-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Estimated Courier Delivery Display Text
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">Shown on checkout and product pages (e.g. 3-5 Days).</p>
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
                    Store Identity & GST Configuration
                  </h3>
                  <p className="text-xs text-slate-500">
                    Details printed on official GST Tax Invoices, order notifications, and customer return labels.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* Store Brand Name */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Store / Brand Name *</label>
                  <input
                    type="text"
                    required
                    value={storeSettings.storeName}
                    onChange={(e) => setStoreSettings({ ...storeSettings, storeName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-forest-900"
                    placeholder="Novise Herbal"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Brand header printed on invoices and website branding.</p>
                </div>

                {/* Legal Entity Name */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Legal Registered Entity Name *</label>
                  <input
                    type="text"
                    required
                    value={storeSettings.legalEntityName}
                    onChange={(e) => setStoreSettings({ ...storeSettings, legalEntityName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-forest-900"
                    placeholder="Novis Herbal Naturals"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Official registered legal business name printed on GST invoices.</p>
                </div>

                {/* GSTIN Number */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">GSTIN / Tax ID Number *</label>
                  <input
                    type="text"
                    required
                    value={storeSettings.gstNumber}
                    onChange={(e) => setStoreSettings({ ...storeSettings, gstNumber: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-mono font-bold text-slate-900 uppercase focus:outline-none focus:ring-1 focus:ring-forest-900"
                    placeholder="27AAAAA0000A1Z5"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">15-character GST Identification Number.</p>
                </div>

                {/* Seller State */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Seller Registered State *</label>
                  <input
                    type="text"
                    required
                    value={storeSettings.sellerState}
                    onChange={(e) => setStoreSettings({ ...storeSettings, sellerState: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-forest-900"
                    placeholder="Gujarat"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Used to calculate CGST + SGST (same state) vs IGST (inter-state).</p>
                </div>

                {/* GST Rate (%) Selector & Presets */}
                <div className="md:col-span-2 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                        <Percent className="w-4 h-4 text-emerald-700" />
                        <span>GST Tax Rate & Slabs Management *</span>
                      </label>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Select an applicable GST slab or enter custom rate. This dynamically determines CGST & SGST on all newly generated invoices.
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        max="28"
                        step="0.5"
                        value={storeSettings.gstPercentage}
                        onChange={(e) => setStoreSettings({ ...storeSettings, gstPercentage: parseFloat(e.target.value) || 0 })}
                        className="w-20 px-3 py-1.5 bg-white border border-emerald-300 rounded-xl font-mono font-bold text-emerald-950 text-center text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                      <span className="font-bold text-emerald-900 text-sm">%</span>
                    </div>
                  </div>

                  {/* Preset Pills */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { rate: 0, label: '0% (Exempt / Nil Rated)' },
                      { rate: 5, label: '5% (Ayurvedic/Herbal: 2.5% CGST + 2.5% SGST)' },
                      { rate: 12, label: '12% (FMCG: 6% CGST + 6% SGST)' },
                      { rate: 18, label: '18% (Cosmetics: 9% CGST + 9% SGST)' }
                    ].map(preset => (
                      <button
                        key={preset.rate}
                        type="button"
                        onClick={() => setStoreSettings({ ...storeSettings, gstPercentage: preset.rate })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${storeSettings.gstPercentage === preset.rate
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300'
                          }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Live Breakdown Preview Banner */}
                  <div className="flex flex-wrap items-center gap-3 p-3 bg-white rounded-xl border border-emerald-100 text-[11px] text-slate-600">
                    <span className="font-bold text-emerald-800">Invoice Tax Breakdown:</span>
                    <span>
                      🏛️ <strong>Intra-State ({storeSettings.sellerState || 'Local'}):</strong> CGST ({(storeSettings.gstPercentage / 2).toFixed(1)}%) + SGST ({(storeSettings.gstPercentage / 2).toFixed(1)}%) = {storeSettings.gstPercentage}%
                    </span>
                    <span className="text-slate-300">|</span>
                    <span>
                      🌐 <strong>Inter-State (Other States):</strong> IGST ({storeSettings.gstPercentage}%)
                    </span>
                  </div>
                </div>

                {/* Customer Support Email */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Customer Support Email *</label>
                  <input
                    type="email"
                    required
                    value={storeSettings.supportEmail}
                    onChange={(e) => setStoreSettings({ ...storeSettings, supportEmail: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-forest-900"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Printed on invoice header and customer communications.</p>
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
                  <p className="text-[10px] text-slate-400 mt-1">Printed on invoice helpline and dialed when clicked.</p>
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
                  <p className="text-[10px] text-slate-400 mt-1">Direct WhatsApp chat helpline.</p>
                </div>

                {/* Business Address */}
                <div className="md:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Warehouse & Operating Business Address *</label>
                  <textarea
                    rows={2}
                    required
                    value={storeSettings.businessAddress}
                    onChange={(e) => setStoreSettings({ ...storeSettings, businessAddress: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-forest-900"
                    placeholder="Novis Herbal Naturals, Sidhpur, Gujarat, India, 384151"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Printed under store name on the top left of tax invoices.</p>
                </div>

                {/* Invoice Terms & Declaration */}
                <div className="md:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1 flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Invoice Declaration, Terms & Conditions</span>
                  </label>
                  <textarea
                    rows={3}
                    value={storeSettings.invoiceTerms}
                    onChange={(e) => setStoreSettings({ ...storeSettings, invoiceTerms: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-forest-900 font-mono text-[11px]"
                    placeholder="Terms printed at the bottom of the invoice..."
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Custom terms printed at the footer of official tax invoices.</p>
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
                    <strong className="text-slate-900 font-bold block text-sm">Send Courier Dispatch Email with Tracking Details</strong>
                    <span className="text-slate-500">Notifies customer only when owner dispatches order with courier name and tracking consignment details. (No emails sent on intermediate status changes).</span>
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
              <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
            </button>
          </div>

        </form>
      )}
    </div>
  );
};

