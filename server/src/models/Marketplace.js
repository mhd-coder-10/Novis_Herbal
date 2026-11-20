import mongoose from 'mongoose';

const marketplaceProductLinkSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: false
  },
  productName: { type: String, required: true, trim: true },
  productSlug: { type: String, default: '' },
  productSku: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  url: { type: String, required: true, trim: true },
  badgeText: { type: String, default: '' },
  priceNote: { type: String, default: '' },
  inStock: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  clicks: { type: Number, default: 0 },
  lastClickedAt: { type: Date }
}, { timestamps: true });

const marketplaceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, // e.g. "Amazon", "Meesho", "Flipkart"
  code: { type: String, required: true, unique: true, lowercase: true, trim: true }, // e.g. "amazon", "meesho", "flipkart"
  tagline: { type: String, default: '' },
  brandColor: { type: String, default: '#FF9900' },
  textColor: { type: String, default: '#111827' },
  bgColor: { type: String, default: '#FFF8ED' },
  iconType: { type: String, default: 'default' }, // 'amazon' | 'meesho' | 'flipkart' | 'nykaa' | 'custom'
  logoUrl: { type: String, default: '' },
  storeUrl: { type: String, default: '' },
  badgeText: { type: String, default: 'Verified Partner' },
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  products: [marketplaceProductLinkSchema]
}, { timestamps: true });

marketplaceSchema.index({ isActive: 1 });
marketplaceSchema.index({ 'products.product': 1 });
marketplaceSchema.index({ 'products.productSlug': 1 });

export default mongoose.model('Marketplace', marketplaceSchema);
