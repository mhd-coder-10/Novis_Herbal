import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { CloudinaryService } from '../services/cloudinaryService.js';

const addressSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  addressLine1: { type: String, required: true },
  addressLine2: { type: String },
  landmark: { type: String },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  isDefault: { type: Boolean, default: false }
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  avatar: { type: String, default: '' },
  password: { type: String, required: true, minlength: 6 },
  role: { 
    type: String, 
    enum: ['customer', 'admin', 'staff'], 
    default: 'customer' 
  },
  addresses: [addressSchema],
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpires: { type: Date },
  resetOtp: { type: String },
  resetOtpExpires: { type: Date }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  if (!this.password || !enteredPassword) return false;
  const str = String(enteredPassword);
  const trimmed = str.trim();

  // Plaintext match fallback
  if (this.password === str || this.password === trimmed) {
    return true;
  }

  // Bcrypt match
  try {
    if (await bcrypt.compare(str, this.password)) return true;
    if (trimmed !== str && await bcrypt.compare(trimmed, this.password)) return true;
  } catch (err) {
    return this.password === str || this.password === trimmed;
  }

  return false;
};

// Automatic cleanup of avatar from Cloudinary (NOVISE_HERBAL/users) on user deletion
userSchema.pre('findOneAndDelete', async function() {
  try {
    const doc = await this.model.findOne(this.getQuery());
    if (doc?.avatar && doc.avatar.includes('cloudinary.com')) {
      console.log(`[User Delete Cleanup] Deleting Cloudinary avatar for user: ${doc._id}`);
      await CloudinaryService.deleteMediaByUrl(doc.avatar);
    }
  } catch (err) {
    console.error('[User pre-delete hook error]:', err.message);
  }
});

userSchema.pre('deleteOne', { document: true, query: false }, async function() {
  try {
    if (this.avatar && this.avatar.includes('cloudinary.com')) {
      console.log(`[User Delete Cleanup] Deleting Cloudinary avatar for user: ${this._id}`);
      await CloudinaryService.deleteMediaByUrl(this.avatar);
    }
  } catch (err) {
    console.error('[User pre-delete hook error]:', err.message);
  }
});

export default mongoose.model('User', userSchema);
