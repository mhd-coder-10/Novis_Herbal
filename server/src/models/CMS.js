import mongoose from 'mongoose';

const cmsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'global_cms' },

  // Brand & Header
  brandName: { type: String, default: 'Novise' },
  tagline: { type: String, default: 'Pure Botanical Care for Majestic Hair' },
  logoUrl: { type: String, default: '/images/logo.png' },
  announcementBar: {
    enabled: { type: Boolean, default: true },
    text: { type: String, default: '🌿 Shipping Available in All India • 100% PURE BOTANICAL AYURVEDA' },
    link: { type: String, default: '/shop' }
  },

  // Homepage Hero Slides
  heroSlides: [{
    productId: { type: String },
    productSlug: { type: String },
    title: { type: String, required: true },
    subtitle: { type: String },
    buttonText: { type: String, default: 'Shop Now' },
    buttonLink: { type: String, default: '/shop' },
    imageUrl: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
  }],

  // Promo Banners / Strips
  promoBanners: [{
    title: { type: String },
    description: { type: String },
    imageUrl: { type: String },
    link: { type: String },
    code: { type: String },
    isActive: { type: Boolean, default: true }
  }],

  // Why Novise / Key Value Propositions
  featuresList: [{
    icon: { type: String },
    title: { type: String },
    description: { type: String }
  }],

  // FAQs
  faqs: [{
    question: { type: String },
    answer: { type: String },
    category: { type: String, default: 'General' }
  }],

  // Static / Policy Pages
  policies: {
    aboutUs: { type: String },
    privacyPolicy: { type: String },
    termsAndConditions: { type: String },
    shippingPolicy: { type: String },
    refundAndCancellation: { type: String },
    contactUs: {
      email: { type: String, default: 'support@novise.in' },
      phone: { type: String, default: '+91 98765 43210' },
      address: { type: String, default: 'Novise Naturals Pvt Ltd, Mumbai, Maharashtra, India' },
      whatsapp: { type: String, default: '+91 98765 43210' },
      instagram: { type: String, default: 'https://instagram.com/novise' },
      facebook: { type: String, default: 'https://facebook.com/novise' }
    }
  },

  // Section Ordering and Visibility
  sectionVisibility: {
    showHeroSlider: { type: Boolean, default: true },
    showFeaturesStrip: { type: Boolean, default: true },
    showBestSellers: { type: Boolean, default: true },
    showComboPromo: { type: Boolean, default: true },
    showIngredientsShowcase: { type: Boolean, default: true },
    showReviews: { type: Boolean, default: true },
    showFaqs: { type: Boolean, default: true }
  },

  // E-Commerce Order & Cancellation Policy Settings (Strictly Non-Returnable & Non-Replaceable Products)
  orderSettings: {
    allowCancellationAfterPacking: { type: Boolean, default: true },
    autoRestockOnCancellation: { type: Boolean, default: true },
    autoManageStock: { type: Boolean, default: true },
    damagedReportWindowHours: { type: Number, default: 2, min: 1, max: 72 },
    maxReportVideoMinutes: { type: Number, default: 3, min: 1, max: 10 }
  },

  // General Store, Shipping & Notification Settings
  storeSettings: {
    storeName: { type: String, default: 'Novise Herbal' },
    legalEntityName: { type: String, default: 'Novis Herbal Naturals' },
    sellerState: { type: String, default: 'Gujarat' },
    gstPercentage: { type: Number, default: 5, min: 0, max: 28 },
    supportEmail: { type: String, default: 'support@novise.in' },
    supportPhone: { type: String, default: '+91 98765 43210' },
    supportWhatsApp: { type: String, default: '+91 98765 43210' },
    businessAddress: { type: String, default: 'Novise Naturals, Mumbai, Maharashtra, India' },
    gstNumber: { type: String, default: '27AAAAA0000A1Z5' },
    invoiceTerms: {
      type: String,
      default: '• Authentic Ayurvedic personal-care formulation with tamper-evident seal.\n• All items once delivered are strictly Non-Returnable and Non-Replaceable for hygiene & safety.\n• This is a computer-generated tax invoice and requires no physical signature.'
    },
    currencySymbol: { type: String, default: '₹' },
    isFreeShippingEnabled: { type: Boolean, default: true },
    freeShippingThreshold: { type: Number, default: 0 },
    standardShippingFee: { type: Number, default: 0 },
    codFee: { type: Number, default: 0 },
    estimatedDeliveryText: { type: String, default: '3-5 Business Days' },
    enableOrderEmails: { type: Boolean, default: true },
    enableStatusUpdateEmails: { type: Boolean, default: true },
    enableAdminAlerts: { type: Boolean, default: true },
    autoNotificationCleanupEnabled: { type: Boolean, default: true },
    autoNotificationCleanupDays: { type: Number, default: 5, min: 1, max: 90 }
  }
}, { timestamps: true });

export default mongoose.model('CMS', cmsSchema);
