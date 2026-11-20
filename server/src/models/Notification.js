import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipientType: {
    type: String,
    enum: ['ADMIN', 'USER', 'BROADCAST'],
    required: true,
    index: true
  },
  // If recipientType === 'USER'
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  userEmail: {
    type: String,
    lowercase: true,
    trim: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    index: true
  },
  priority: {
    type: String,
    enum: ['NORMAL', 'HIGH', 'URGENT'],
    default: 'NORMAL'
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  actionUrl: {
    type: String,
    default: ''
  },
  sentByAdmin: {
    type: Boolean,
    default: false,
    index: true
  },
  adminUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  adminEmail: {
    type: String
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  },
  // For BROADCAST and multi-admin notifications: track which users/admins have marked it read
  readBy: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }],
  // Customer dismissal tracking (allows customers to remove notifications from their view)
  isDismissed: {
    type: Boolean,
    default: false,
    index: true
  },
  dismissedAt: {
    type: Date
  },
  dismissedBy: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userEmail: { type: String, lowercase: true, trim: true },
    dismissedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ recipientType: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientType: 1, isDismissed: 1, createdAt: -1 });
notificationSchema.index({ recipientType: 1, user: 1, createdAt: -1 });
notificationSchema.index({ recipientType: 1, userEmail: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;

