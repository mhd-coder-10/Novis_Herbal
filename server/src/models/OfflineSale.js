import mongoose from 'mongoose';

const changeLogSchema = new mongoose.Schema({
  field: { type: String, required: true },
  label: { type: String, required: true },
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  description: { type: String },
  changedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String },
    email: { type: String }
  },
  changedAt: { type: Date, default: Date.now }
}, { _id: true });

const offlineSaleItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: { type: String, required: true },
  sku: { type: String },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 }
}, { _id: false });

const offlineSaleSchema = new mongoose.Schema({
  saleId: { type: String, required: true, unique: true },
  customerName: { type: String, required: true, trim: true },
  customerPhone: { type: String, trim: true },
  locationArea: { type: String, trim: true },
  items: [offlineSaleItemSchema],
  totalAmount: { type: Number, required: true, min: 0 },
  amountPaid: { type: Number, required: true, min: 0, default: 0 },
  amountDue: { type: Number, required: true, min: 0, default: 0 },
  paymentMode: {
    type: String,
    enum: ['CASH', 'UPI', 'BANK_TRANSFER', 'CREDIT_UDHAAR'],
    default: 'CASH'
  },
  paymentStatus: {
    type: String,
    enum: ['PAID', 'PARTIAL', 'PENDING'],
    default: 'PAID'
  },
  billNumber: { type: String, trim: true },
  saleDate: { type: Date, default: Date.now },
  inventoryDeducted: { type: Boolean, default: true },
  notes: { type: String, trim: true },
  changeLogs: [changeLogSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

offlineSaleSchema.index({ saleDate: -1 });
offlineSaleSchema.index({ saleId: 1 });

export default mongoose.model('OfflineSale', offlineSaleSchema);
