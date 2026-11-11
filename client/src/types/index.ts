export interface Product {
  _id: string;
  name: string;
  slug: string;
  sku: string;
  category?: { _id: string; name: string; slug: string };
  mrp: number;
  sellingPrice: number;
  costPrice?: number;
  discountPercent?: number;
  stock: number;
  lowStockThreshold?: number;
  weightGrams?: number;
  volumeText?: string;
  dimensionsCm?: { length: number; width: number; height: number };
  images: string[];
  videoUrl?: string;
  shortDescription?: string;
  description?: string;
  benefits?: string[];
  ingredients?: string[];
  howToUse?: string[];
  faqs?: { question: string; answer: string }[];
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  isCombo?: boolean;
  isPublished?: boolean;
  averageRating: number;
  numReviews: number;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  mrp: number;
  quantity: number;
  image: string;
  sku: string;
  volumeText?: string;
  weightGrams?: number;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}

export interface TrackingEvent {
  status: string;
  title: string;
  description?: string;
  location?: string;
  timestamp: string;
  updatedBy: string;
}

export interface OrderCancellation {
  isCancelled?: boolean;
  cancelledAt?: string;
  cancelledBy?: string;
  reason?: string;
  description?: string;
  requiresApproval?: boolean;
  status?: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}


export interface OrderComplaint {
  hasComplaint?: boolean;
  status?: 'NONE' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'RESOLVED';
  reason?: 'Damaged Product' | 'Defective Product' | 'Wrong Product Delivered' | 'Missing Product' | 'Product Leakage / Packaging Damage' | 'Other' | string;
  description?: string;
  customerPhone?: string;
  videoUrl?: string;
  videoPublicId?: string;
  videoDuration?: number;
  videoDeletedByAdmin?: boolean;
  videoDeletedAt?: string;
  videoDeletedBy?: string;
  images?: string[];
  submittedAt?: string;
  reportedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  resolutionType?: 'NONE' | 'REFUND';
  resolutionNotes?: string;
  resolvedAt?: string;
  bankDetails?: {
    beneficiaryName?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    upiId?: string;
  };
}

export interface OrderRefundInfo {
  status?: 'NONE' | 'NOT_APPLICABLE' | 'PENDING_APPROVAL' | 'PROCESSING' | 'REFUNDED' | 'FAILED' | 'REFUND_PENDING' | 'REFUND_INITIATED' | 'REFUND_PROCESSING' | 'REFUND_FAILED';
  amount?: number;
  initiatedAt?: string;
  completedAt?: string;
  transactionId?: string;
  method?: string;
  reason?: string;
  failureReason?: string;
  history?: {
    status: string;
    timestamp: string;
    transactionId?: string;
    notes?: string;
  }[];
}

export interface OrderRTODetails {
  isRTO?: boolean;
  status?: 'NONE' | 'INITIATED' | 'IN_TRANSIT_TO_SELLER' | 'IN_TRANSIT' | 'RETURNED_TO_SELLER' | 'COMPLETED' | string;
  initiatedAt?: string;
  returnedToSellerAt?: string;
  completedAt?: string;
  condition?: 'SELLABLE' | 'DAMAGED_UNSELLABLE';
  isRestocked?: boolean;
  inspectionNotes?: string;
  reason?: string;
  courierName?: string;
  trackingNumber?: string;
  history?: {
    status: string;
    timestamp: string;
    notes?: string;
  }[];
}

export interface Order {
  _id: string;
  orderId: string;
  customerDetails: {
    fullName: string;
    email: string;
    phone: string;
  };
  items: {
    product: Product | string;
    name: string;
    price: number;
    quantity: number;
    image: string;
    sku: string;
    weightGrams?: number;
  }[];
  shippingAddress: ShippingAddress;
  pricing: {
    subtotal: number;
    discountAmount: number;
    couponCode?: string;
    shippingFee: number;
    taxAmount: number;
    totalAmount: number;
    finalTotal?: number;
  };
  paymentInfo?: {
    method: 'ONLINE' | 'COD';
    status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'NOT_APPLICABLE' | 'CANCELLED';
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    paidAt?: string;
  };
  paymentMethod?: 'COD' | 'ONLINE' | 'UPI' | 'NET_BANKING';
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'NOT_APPLICABLE' | 'CANCELLED';
  orderStatus: 
    | 'PLACED'
    | 'CONFIRMED'
    | 'PROCESSING'
    | 'PACKED'
    | 'SHIPMENT_BOOKED'
    | 'PICKED_UP'
    | 'IN_TRANSIT'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'DELIVERY_FAILED'
    | 'CANCELLED'
    | 'CANCELLATION_REQUESTED'
    | 'RTO_INITIATED'
    | 'IN_TRANSIT_TO_SELLER'
    | 'RTO_IN_TRANSIT'
    | 'RETURNED_TO_SELLER'
    | 'RTO_COMPLETED'
    | 'RTO'
    | 'REFUND_PENDING'
    | 'REFUND_INITIATED'
    | 'REFUND_PROCESSING'
    | 'REFUNDED'
    | 'REFUND_FAILED';
  isNonReturnable?: boolean;
  cancellation?: OrderCancellation;
  complaint?: OrderComplaint;
  refundInfo?: OrderRefundInfo;
  rtoDetails?: OrderRTODetails;
  shipment?: {
    provider: string;
    shiprocketOrderId?: string;
    shipmentId?: string;
    awbCode?: string;
    courierName?: string;
    labelUrl?: string;
    trackingUrl?: string;
    pickupScheduledAt?: string;
    deliveredAt?: string;
    estimatedDeliveryDate?: string;
  };
  shippingDetails?: {
    provider?: string;
    shiprocketOrderId?: string;
    shipmentId?: string;
    awbCode?: string;
    courierName?: string;
    labelUrl?: string;
    manifestUrl?: string;
    trackingUrl?: string;
    status?: string;
    pickupScheduledAt?: string;
    estimatedDeliveryDate?: string;
  };
  trackingTimeline?: TrackingEvent[];
  timeline?: {
    status: string;
    title: string;
    description: string;
    timestamp: string;
    author?: string;
    location?: string;
  }[];
  auditLog?: any[];
  invoiceNumber?: string;
  invoiceDate?: string;
  isStockDeducted?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AddressItem extends ShippingAddress {
  _id?: string;
  isDefault?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'admin' | 'staff';
  avatar?: string;
  addresses?: AddressItem[];
  wishlist?: string[];
}

export interface CMSData {
  brandName: string;
  tagline: string;
  logoUrl: string;
  announcementBar: {
    enabled: boolean;
    text: string;
    link: string;
  };
  heroSlides: {
    productId?: string;
    productSlug?: string;
    title: string;
    subtitle: string;
    buttonText: string;
    buttonLink: string;
    imageUrl: string;
    badge?: string;
    isActive: boolean;
    order: number;
  }[];
  promoBanners?: {
    title: string;
    description: string;
    imageUrl: string;
    link: string;
    code?: string;
    isActive: boolean;
  }[];
  featuresList: {
    icon: string;
    title: string;
    description: string;
  }[];
  faqs: {
    question: string;
    answer: string;
    category?: string;
  }[];
  policies: {
    aboutUs: string;
    privacyPolicy: string;
    termsAndConditions: string;
    shippingPolicy: string;
    refundAndCancellation: string;
    contactUs: {
      email: string;
      phone: string;
      address: string;
      whatsapp?: string;
      instagram?: string;
      facebook?: string;
    };
  };
  sectionVisibility?: {
    showHeroSlider: boolean;
    showFeaturesStrip: boolean;
    showBestSellers: boolean;
    showComboPromo: boolean;
    showIngredientsShowcase: boolean;
    showReviews: boolean;
    showFaqs: boolean;
  };
  storeSettings?: {
    storeName?: string;
    supportEmail?: string;
    supportPhone?: string;
    supportWhatsApp?: string;
    businessAddress?: string;
    gstNumber?: string;
    currencySymbol?: string;
    freeShippingThreshold?: number;
    standardShippingFee?: number;
    codFee?: number;
    estimatedDeliveryText?: string;
    enableOrderEmails?: boolean;
    enableStatusUpdateEmails?: boolean;
    enableAdminAlerts?: boolean;
  };
  orderSettings?: {
    allowCancellationAfterPacking?: boolean;
    autoRestockOnCancellation?: boolean;
    autoManageStock?: boolean;
    damagedReportWindowHours?: number;
    maxReportVideoMinutes?: number;
  };
}

export interface ReviewMedia {
  url: string;
  type: 'image' | 'video';
  duration?: number;
}

export interface Review {
  _id: string;
  product: string | { _id: string; name: string; slug: string; images?: string[]; sellingPrice?: number; volumeText?: string };
  user?: string | { _id: string; name: string; avatar?: string };
  customerName: string;
  customerEmail?: string;
  rating: number;
  title: string;
  comment: string;
  media?: ReviewMedia[];
  images?: string[];
  editCount?: number;
  isEdited?: boolean;
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  createdAt: string;
  updatedAt?: string;
}
