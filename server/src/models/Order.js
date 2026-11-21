import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  image: { type: String },
  sku: { type: String },
  weightGrams: { type: Number, default: 250 }
});

const trackingTimelineSchema = new mongoose.Schema({
  status: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  location: { type: String },
  timestamp: { type: Date, default: Date.now },
  updatedBy: { type: String, default: 'SYSTEM' } // 'SYSTEM', 'COURIER_WEBHOOK', 'ADMIN'
});

const orderSchema = new mongoose.Schema({
  orderId: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  }, // e.g. NOV-2026-1001
  
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customerDetails: {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true }
  },

  items: [orderItemSchema],

  shippingAddress: {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    landmark: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, default: 'India' }
  },

  pricing: {
    subtotal: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    couponCode: { type: String },
    shippingFee: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true }
  },

  paymentInfo: {
    method: { type: String, enum: ['ONLINE', 'COD'], required: true },
    status: { 
      type: String, 
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'NOT_APPLICABLE', 'CANCELLED'], 
      default: 'PENDING' 
    },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    paidAt: { type: Date }
  },

  orderStatus: {
    type: String,
    enum: [
      // 1. Standard Forward Fulfillment
      'PLACED',
      'CONFIRMED',
      'PROCESSING',
      'PACKED',
      'DISPATCHED',
      'SHIPMENT_BOOKED',
      'PICKED_UP',
      'IN_TRANSIT',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'DELIVERY_FAILED',

      // 2. Cancellation Workflow
      'CANCELLATION_REQUESTED',
      'CANCELLED',

      // 3. RTO (Return to Origin) Courier Logistics Workflow
      'RTO_INITIATED',
      'IN_TRANSIT_TO_SELLER',
      'RTO_IN_TRANSIT',
      'RETURNED_TO_SELLER',
      'RTO_COMPLETED'
    ],
    default: 'PLACED'
  },

  // Note: All Novise Botanical Products are Strictly Non-Returnable & Non-Replaceable
  isNonReturnable: { type: Boolean, default: true },

  shipment: {
    provider: { type: String, default: 'MANUAL_COURIER' },
    courierName: { type: String, default: 'India Post' },
    trackingNumber: { type: String },
    awbCode: { type: String },
    trackingUrl: { 
      type: String, 
      default: () => process.env.DEFAULT_TRACKING_PORTAL || 'https://www.indiapost.gov.in/' 
    },
    dispatchedAt: { type: Date },
    deliveredAt: { type: Date },
    notes: { type: String },
    labelUrl: { type: String },
    packageWeightGrams: { type: Number, default: 500 },
    dimensionsCm: {
      length: { type: Number, default: 15 },
      width: { type: Number, default: 10 },
      height: { type: Number, default: 8 }
    }
  },

  trackingTimeline: [trackingTimelineSchema],

  // 1. Cancellation Workflow State
  cancellation: {
    status: { 
      type: String, 
      enum: ['NONE', 'REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED'], 
      default: 'NONE' 
    },
    isCancelled: { type: Boolean, default: false },
    reason: { type: String }, // e.g. 'Ordered by Mistake', 'Found a Better Price', etc.
    description: { type: String }, // Extra explanation when 'Other' is chosen
    requestedAt: { type: Date },
    cancelledBy: { type: String }, // 'CUSTOMER' or 'ADMIN'
    cancelledAt: { type: Date },
    reviewedBy: { type: String }, // Admin reviewer email/id
    reviewedAt: { type: Date },
    rejectionReason: { type: String }
  },

  // 2. Independent Refund Lifecycle State (Per User Requirements)
  refundInfo: {
    status: {
      type: String,
      enum: ['NOT_APPLICABLE', 'PENDING_APPROVAL', 'PROCESSING', 'REFUNDED', 'FAILED', 'PENDING', 'INITIATED'],
      default: 'NOT_APPLICABLE'
    },
    isRefunded: { type: Boolean, default: false },
    amount: { type: Number, default: 0 },
    method: { 
      type: String, 
      enum: ['ORIGINAL_SOURCE', 'BANK_TRANSFER', 'UPI', 'WALLET', 'MANUAL'], 
      default: 'ORIGINAL_SOURCE' 
    },
    gatewayRefundId: { type: String },
    failureReason: { type: String },
    initiatedAt: { type: Date },
    refundedAt: { type: Date },
    manualResolutionNotes: { type: String }
  },

  // 4. RTO (Return to Origin) State: Initiated -> In Transit to Seller -> Returned to Seller -> RTO Completed
  rtoDetails: {
    isRTO: { type: Boolean, default: false },
    status: { 
      type: String, 
      enum: ['NONE', 'INITIATED', 'IN_TRANSIT_TO_SELLER', 'IN_TRANSIT', 'RETURNED_TO_SELLER', 'COMPLETED'],
      default: 'NONE'
    },
    reason: { type: String }, // 'Customer Refused Delivery', 'Customer Unavailable', etc.
    initiatedAt: { type: Date },
    returnedToSellerAt: { type: Date },
    completedAt: { type: Date },
    condition: { 
      type: String, 
      enum: ['SELLABLE', 'DAMAGED_UNSELLABLE'], 
      default: 'SELLABLE' 
    },
    isRestocked: { type: Boolean, default: false },
    inspectionNotes: { type: String }
  },

  // 5. Exceptional Customer Complaints (Damaged/Defective/Wrong items - Strictly Non-Returnable products)
  complaint: {
    hasComplaint: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['NONE', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RESOLVED'],
      default: 'NONE'
    },
    reason: {
      type: String,
      enum: [
        'Damaged Product',
        'Defective Product',
        'Wrong Product Delivered',
        'Missing Product',
        'Product Leakage / Packaging Damage',
        'Other'
      ]
    },
    customerPhone: { type: String },
    description: { type: String },
    videoUrl: { type: String },
    videoPublicId: { type: String },
    videoDuration: { type: Number },
    videoDeletedByAdmin: { type: Boolean, default: false },
    videoDeletedAt: { type: Date },
    videoDeletedBy: { type: String },
    images: [{ type: String }],
    submittedAt: { type: Date },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
    rejectionReason: { type: String },
    resolutionType: {
      type: String,
      enum: ['NONE', 'REFUND', 'REPLACEMENT'],
      default: 'NONE'
    },
    resolutionNotes: { type: String },
    resolvedAt: { type: Date },
    bankDetails: {
      beneficiaryName: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      upiId: String
    }
  },

  invoiceNumber: { type: String },
  invoiceDate: { type: Date },
  isStockDeducted: { type: Boolean, default: false },
  adminNotes: [{
    note: String,
    createdAt: { type: Date, default: Date.now },
    author: String
  }]
}, { timestamps: true });

orderSchema.index({ createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ 'paymentInfo.method': 1, 'paymentInfo.status': 1 });
orderSchema.index({ 'customerDetails.phone': 1 });
orderSchema.index({ 'customerDetails.email': 1 });

export default mongoose.model('Order', orderSchema);
