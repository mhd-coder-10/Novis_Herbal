import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  
  // Pricing
  mrp: { type: Number, required: true, min: 0 },
  sellingPrice: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, default: 0 },
  discountPercent: { type: Number, default: 0 },

  // Inventory
  stock: { type: Number, required: true, default: 0, min: 0 },
  lowStockThreshold: { type: Number, default: 10 },
  isPublished: { type: Boolean, default: true },

  // Parcel & Shipping dimensions for courier calculation
  weightGrams: { type: Number, required: true, default: 300 }, // e.g. 250g, 400g
  volumeText: { type: String, default: '200 ML' },
  dimensionsCm: {
    length: { type: Number, default: 15 },
    width: { type: Number, default: 8 },
    height: { type: Number, default: 6 }
  },

  // Media
  images: [{ type: String, required: true }],
  videoUrl: { type: String },

  // Content & Details
  shortDescription: { type: String },
  description: { type: String },
  benefits: [{ type: String }],
  ingredients: [{ type: String }],
  howToUse: [{ type: String }],
  faqs: [{
    question: { type: String },
    answer: { type: String }
  }],

  // Badges & Promotion
  isFeatured: { type: Boolean, default: false },
  isBestSeller: { type: Boolean, default: false },
  isNewArrival: { type: Boolean, default: false },
  isCombo: { type: Boolean, default: false },

  // Reviews
  averageRating: { type: Number, default: 4.8 },
  numReviews: { type: Number, default: 0 }
}, { timestamps: true });

// Auto calculate discount percentage before save
productSchema.pre('save', function(next) {
  if (this.mrp && this.sellingPrice && this.mrp > this.sellingPrice) {
    this.discountPercent = Math.round(((this.mrp - this.sellingPrice) / this.mrp) * 100);
  } else {
    this.discountPercent = 0;
  }
  next();
});

export default mongoose.model('Product', productSchema);
