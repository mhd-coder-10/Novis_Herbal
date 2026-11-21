import mongoose from 'mongoose';

const auditChangeSchema = new mongoose.Schema({
  field: { type: String, required: true },
  label: { type: String },
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  description: { type: String }
}, { _id: false });

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true }, // e.g. 'DELETED', 'EDITED', 'STATUS_OVERRIDE', 'PRICE_CHANGE', 'REFUND_TRIGGER'
  entityType: { type: String, required: true }, // 'OFFLINE_SALE', 'ONLINE_ORDER', 'MANUFACTURING', 'OPERATING', 'ORDER', 'PRODUCT', 'CMS'
  entityId: { type: String, required: true },
  entityTitle: { type: String }, // e.g. "Bill #102 - Ramesh Patel", "Batch BATCH-2026-01"
  amount: { type: Number, default: 0 },
  performedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String },
    email: { type: String },
    role: { type: String }
  },
  reason: { type: String },
  changes: [auditChangeSchema],
  snapshot: { type: mongoose.Schema.Types.Mixed }, // Full JSON snapshot of deleted or original state
  previousState: { type: mongoose.Schema.Types.Mixed },
  newState: { type: mongoose.Schema.Types.Mixed },
  ipAddress: { type: String }
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entityType: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ action: 1, entityType: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
