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

const returnBatchSchema = new mongoose.Schema({
  returnDate: { type: Date, default: Date.now },
  quantity: { type: Number, required: true },
  refundAmount: { type: Number, required: true, default: 0 },
  reason: { type: String, required: true },
  refundStatus: { type: String, enum: ['CREDITED', 'PENDING'], default: 'CREDITED' }
});

const manufacturingExpenseSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  batchNumber: { type: String }, // e.g. BATCH-2026-NOV01
  vendorName: { type: String, required: true }, // Manufacturer / Distributor / Packaging vendor
  vendorContact: { type: String },
  quantity: { type: Number, required: true, min: 1 },
  unitCost: { type: Number, required: true, min: 0 },
  totalCost: { type: Number, required: true, min: 0 },
  amountPaid: { type: Number, default: 0, min: 0 },
  amountDue: { type: Number, default: 0, min: 0 },
  paymentStatus: {
    type: String,
    enum: ['PAID', 'PARTIAL', 'DUE'],
    default: 'DUE'
  },
  paymentMode: {
    type: String,
    enum: ['BANK_TRANSFER', 'UPI', 'CASH', 'CHEQUE'],
    default: 'BANK_TRANSFER'
  },
  invoiceNumber: { type: String },
  returns: [returnBatchSchema],
  totalRefundedFromReturns: { type: Number, default: 0 },
  expenseDate: { type: Date, default: Date.now },
  notes: { type: String },
  changeLogs: [changeLogSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

manufacturingExpenseSchema.index({ expenseDate: -1 });

export default mongoose.model('ManufacturingExpense', manufacturingExpenseSchema);
