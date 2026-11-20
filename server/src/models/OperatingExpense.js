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

const operatingExpenseSchema = new mongoose.Schema({
  expenseId: { type: String, trim: true, index: true },
  category: {
    type: String,
    enum: [
      'RENT',
      'ELECTRICITY_BILL',
      'STAFF_SALARY',
      'FOOD_REFRESHMENTS',
      'PACKAGING_MATERIALS',
      'INTERNET_SOFTWARE',
      'LOGISTICS_SUPPLIES',
      'MAINTENANCE_REPAIRS',
      'MARKETING_ADS',
      'MISCELLANEOUS',
      'OTHER'
    ],
    required: true
  },
  title: { type: String, required: false, default: '' }, // Optional description, e.g. Warehouse Rent Oct, Torrent Power Bill
  amount: { type: Number, required: true, min: 0 },
  paymentMode: {
    type: String,
    enum: ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'],
    default: 'UPI'
  },
  paidTo: { type: String }, // Recipient name / company
  expenseDate: { type: Date, default: Date.now },
  billNumber: { type: String },
  receiptUrl: { type: String },
  notes: { type: String },
  changeLogs: [changeLogSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

operatingExpenseSchema.index({ expenseDate: -1 });
operatingExpenseSchema.index({ category: 1 });

export default mongoose.model('OperatingExpense', operatingExpenseSchema);
