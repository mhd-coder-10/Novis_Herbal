import { useCMSStore } from '../store/useCMSStore';

/**
 * Centralized Application Configuration
 * Dynamically prioritizes Admin Panel CMS & Store Settings.
 * Fallbacks to client/.env variables (VITE_*) if CMS is not yet loaded.
 */
export const appConfig = {
  // Backend Endpoints
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  serverUrl: import.meta.env.VITE_SERVER_URL || 'http://localhost:5000',

  // Payment Gateway Keys
  razorpayKeyId: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_novise_sample_key',

  // Brand & Identity
  brandName: import.meta.env.VITE_BRAND_NAME || 'Novis Herbal',
  brandTagline: import.meta.env.VITE_BRAND_TAGLINE || 'Pure Botanical Hair Care & Scalp Restoration',
  logoUrl: '/novise-logo-transparent.png',
  logoCreamUrl: '/novise-logo-cream.png',
  emblemUrl: '/novise-emblem.png',

  // Customer Care & Contact (Dynamic from Admin Panel Store Settings with .env fallback)
  get storeName(): string {
    const cms = useCMSStore.getState().cms;
    return (
      cms?.storeSettings?.storeName ||
      cms?.brandName ||
      import.meta.env.VITE_BRAND_NAME ||
      'Novis Herbal'
    );
  },

  get isFreeShippingEnabled(): boolean {
    const cms = useCMSStore.getState().cms;
    if (cms?.storeSettings?.isFreeShippingEnabled !== undefined) {
      return Boolean(cms.storeSettings.isFreeShippingEnabled);
    }
    return true; // Free shipping is enabled by default
  },

  get freeShippingThreshold(): number {
    const cms = useCMSStore.getState().cms;
    return cms?.storeSettings?.freeShippingThreshold !== undefined
      ? Number(cms.storeSettings.freeShippingThreshold)
      : 0;
  },

  get standardShippingFee(): number {
    if (this.isFreeShippingEnabled) return 0;
    const cms = useCMSStore.getState().cms;
    return cms?.storeSettings?.standardShippingFee !== undefined
      ? Number(cms.storeSettings.standardShippingFee)
      : 0;
  },

  get codFee(): number {
    const cms = useCMSStore.getState().cms;
    return cms?.storeSettings?.codFee !== undefined
      ? Number(cms.storeSettings.codFee)
      : 0;
  },

  get estimatedDeliveryText(): string {
    const cms = useCMSStore.getState().cms;
    return (
      cms?.storeSettings?.estimatedDeliveryText ||
      'Dispatched within 24h via India Post / Standard Courier'
    );
  },

  get gstNumber(): string {
    const cms = useCMSStore.getState().cms;
    return cms?.storeSettings?.gstNumber || '27AAAAA0000A1Z5';
  },

  get gstPercentage(): number {
    const cms = useCMSStore.getState().cms;
    return cms?.storeSettings?.gstPercentage !== undefined
      ? Number(cms.storeSettings.gstPercentage)
      : 5;
  },

  get currencySymbol(): string {
    const cms = useCMSStore.getState().cms;
    return cms?.storeSettings?.currencySymbol || '₹';
  },

  get orderSettings() {
    const cms = useCMSStore.getState().cms;
    return {
      allowCancellationAfterPacking: cms?.orderSettings?.allowCancellationAfterPacking ?? true,
      autoRestockOnCancellation: cms?.orderSettings?.autoRestockOnCancellation ?? true,
      autoManageStock: cms?.orderSettings?.autoManageStock ?? true,
      damagedReportWindowHours: cms?.orderSettings?.damagedReportWindowHours ?? 2,
      maxReportVideoMinutes: cms?.orderSettings?.maxReportVideoMinutes ?? 3
    };
  },

  get supportEmail(): string {
    const cms = useCMSStore.getState().cms;
    return (
      cms?.storeSettings?.supportEmail ||
      cms?.policies?.contactUs?.email ||
      import.meta.env.VITE_SUPPORT_EMAIL ||
      'support@novise.in'
    );
  },

  get supportPhone(): string {
    const cms = useCMSStore.getState().cms;
    return (
      cms?.storeSettings?.supportPhone ||
      cms?.policies?.contactUs?.phone ||
      import.meta.env.VITE_SUPPORT_PHONE ||
      '8980596225'
    );
  },

  get supportWhatsApp(): string {
    const cms = useCMSStore.getState().cms;
    return (
      cms?.storeSettings?.supportWhatsApp ||
      cms?.policies?.contactUs?.whatsapp ||
      cms?.storeSettings?.supportPhone ||
      cms?.policies?.contactUs?.phone ||
      import.meta.env.VITE_SUPPORT_WHATSAPP ||
      this.supportPhone
    );
  },

  get storeAddress(): string {
    const cms = useCMSStore.getState().cms;
    return (
      cms?.storeSettings?.businessAddress ||
      cms?.policies?.contactUs?.address ||
      import.meta.env.VITE_STORE_ADDRES ||
      'Novise Herbal, India'
    );
  },

  get defaultTrackingPortal(): string {
    return (
      (import.meta.env.VITE_DEFAULT_TRACKING_PORTAL as string) ||
      'https://www.indiapost.gov.in/'
    );
  },

  /**
   * Helper to generate a direct WhatsApp click-to-chat URL
   */
  getWhatsAppLink(message = 'Hello Novis Herbal Support, I have come via your Novis Herbal website.') {
    let digits = (this.supportWhatsApp || '8980596225').replace(/[^0-9]/g, '');
    if (digits.length === 10) {
      digits = `91${digits}`;
    } else if (digits.length > 10 && !digits.startsWith('91')) {
      digits = `91${digits.slice(-10)}`;
    }
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  },

  /**
   * Helper to open Google Gmail web compose interface directly in browser
   */
  getGmailLink(subject = 'Customer Inquiry - Novis Herbal', body = '') {
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(this.supportEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  },

  /**
   * Helper to generate mailto link (fallback)
   */
  getMailtoLink(subject = 'Customer Inquiry - Novis Herbal') {
    return this.getGmailLink(subject);
  },

  /**
   * Helper to generate tel: link
   */
  getTelLink() {
    let digits = (this.supportPhone || '8980596225').replace(/[^0-9]/g, '');
    if (digits.length === 10) {
      digits = `+91${digits}`;
    } else if (digits.startsWith('91')) {
      digits = `+${digits}`;
    } else {
      digits = `+91${digits.slice(-10)}`;
    }
    return `tel:${digits}`;
  },

  /**
   * Clean formatted phone string for public display (+91 XXXXX XXXXX)
   */
  get formattedPhone(): string {
    const digits = (this.supportPhone || '8980596225').replace(/[^0-9]/g, '').slice(-10);
    return digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : (this.supportPhone || '+91 89805 96225');
  },

  /**
   * Clean formatted WhatsApp string for public display (+91 XXXXX XXXXX)
   */
  get formattedWhatsApp(): string {
    const digits = (this.supportWhatsApp || '8980596225').replace(/[^0-9]/g, '').slice(-10);
    return digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : (this.supportWhatsApp || '+91 89805 96225');
  }
};
