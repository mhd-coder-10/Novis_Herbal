import mongoose from 'mongoose';

// Review media item schema
const reviewMediaSchema = new mongoose.Schema({
  url: { type: String, required: true },
  type: { type: String, enum: ['image', 'video'], default: 'image' },
  duration: { type: Number, default: 0 }
}, { _id: false });

// Review schema definition
const reviewSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, required: true },
  comment: { type: String, required: true },
  media: [reviewMediaSchema],
  images: [{ type: String }],
  editCount: { type: Number, default: 0 },
  isEdited: { type: Boolean, default: false },
  isVerifiedPurchase: { type: Boolean, default: true },
  isApproved: { type: Boolean, default: true }
}, { timestamps: true });

// Ensure one review per user per product
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

export default mongoose.model('Review', reviewSchema);
