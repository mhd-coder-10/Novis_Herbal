import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendOtpEmail, sendPasswordResetOtpEmail } from './emailService.js';
import { CloudinaryService } from './cloudinaryService.js';
import { sanitizePhoneNumber, isValidIndianPhone } from '../utils/phoneValidation.js';
import { NotificationService } from './notificationService.js';

export class AuthService {
  static generateToken(id) {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'novise_jwt_secret', {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
  }

  static generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  }

  static async registerUser({ name, email, password, phone }) {
    if (!name || !email || !password || !phone) {
      const error = new Error('Please provide all required fields: name, email, mobile number and password');
      error.statusCode = 400;
      throw error;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!this.isValidEmail(cleanEmail)) {
      const error = new Error('Please enter a valid email address (e.g., name@gmail.com)');
      error.statusCode = 400;
      throw error;
    }

    const cleanPhone = sanitizePhoneNumber(phone);
    if (!isValidIndianPhone(cleanPhone)) {
      const error = new Error('Mobile number is required and must be a valid 10-digit number starting with 6, 7, 8, or 9');
      error.statusCode = 400;
      throw error;
    }

    if (String(password).length < 6) {
      const error = new Error('Password must be at least 6 characters long');
      error.statusCode = 400;
      throw error;
    }

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser && existingUser.isVerified) {
      const error = new Error('An account with this email already exists. Please sign in instead.');
      error.statusCode = 400;
      throw error;
    }

    const otp = this.generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    let user;
    if (existingUser && !existingUser.isVerified) {
      // User registered earlier but didn't verify OTP; update details & fresh OTP
      existingUser.name = name.trim();
      existingUser.password = password; // Will be hashed in pre('save')
      existingUser.phone = cleanPhone || existingUser.phone;
      existingUser.otp = otp;
      existingUser.otpExpires = otpExpires;
      user = await existingUser.save();
    } else {
      user = await User.create({
        name: name.trim(),
        email: cleanEmail,
        password,
        phone: cleanPhone,
        role: 'customer',
        isVerified: false,
        otp,
        otpExpires
      });
    }

    // Send high-priority verification email with OTP via Nodemailer
    const emailResult = await sendOtpEmail(cleanEmail, user.name, otp);

    return {
      requiresOtp: true,
      email: cleanEmail,
      message: `A 6-digit verification code has been sent to ${cleanEmail}. Please enter the OTP to activate your account.`,
      simulatedOtp: emailResult?.simulated ? otp : undefined
    };
  }

  static async verifyOtp({ email, otp }) {
    if (!email || !otp) {
      const error = new Error('Please provide both email and 6-digit OTP');
      error.statusCode = 400;
      throw error;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      const error = new Error('No account found with this email');
      error.statusCode = 404;
      throw error;
    }

    if (user.isVerified) {
      const token = this.generateToken(user._id);
      return {
        message: 'Account is already verified. Signed in successfully.',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          addresses: user.addresses,
          wishlist: user.wishlist,
          createdAt: user.createdAt
        }
      };
    }

    if (!user.otp || !user.otpExpires) {
      const error = new Error('No active OTP found. Please request a new verification code.');
      error.statusCode = 400;
      throw error;
    }

    if (new Date() > new Date(user.otpExpires)) {
      const error = new Error('Verification OTP has expired. Please click "Resend Code".');
      error.statusCode = 400;
      throw error;
    }

    if (user.otp !== cleanOtp) {
      const error = new Error('Incorrect OTP code. Please check the 6-digit code sent to your email.');
      error.statusCode = 400;
      throw error;
    }

    // OTP is valid: verify account & clear OTP
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // 1. Welcome In-App Notification to Customer
    NotificationService.notifyUser({
      userId: user._id,
      userEmail: user.email,
      type: 'WELCOME',
      title: 'Welcome to Novis Herbal! 🌿',
      message: `Welcome ${user.name}! Your account is now verified. Explore 100% pure Ayurvedic botanical remedies for healthy hair.`,
      priority: 'NORMAL',
      actionUrl: '/shop'
    }).catch(err => console.error('[Welcome Notification Error]:', err.message));

    // 2. Alert to Store Admin
    NotificationService.notifyAdmin({
      type: 'NEW_CUSTOMER',
      title: `New Customer Signup: ${user.name}`,
      message: `${user.name} (${user.email}) registered and verified their account.`,
      priority: 'NORMAL',
      data: { userId: user._id, email: user.email, name: user.name },
      actionUrl: '/admin?tab=customers'
    }).catch(err => console.error('[Admin Notification Error]:', err.message));

    const token = this.generateToken(user._id);

    return {
      message: 'Email verified successfully! Welcome to Novise.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        addresses: user.addresses,
        wishlist: user.wishlist,
        avatar: user.avatar || '',
        createdAt: user.createdAt
      }
    };
  }

  static async resendOtp({ email }) {
    if (!email) {
      const error = new Error('Please provide email address');
      error.statusCode = 400;
      throw error;
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      const error = new Error('No registered account found with this email');
      error.statusCode = 404;
      throw error;
    }

    if (user.isVerified) {
      const error = new Error('Your email is already verified. Please sign in directly.');
      error.statusCode = 400;
      throw error;
    }

    const otp = this.generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const emailResult = await sendOtpEmail(cleanEmail, user.name, otp);

    return {
      message: `A new 6-digit OTP has been sent to ${cleanEmail}.`,
      simulatedOtp: emailResult?.simulated ? otp : undefined
    };
  }

  static async loginUser({ email, password }) {
    if (!email || !password) {
      const error = new Error('Please provide email and password');
      error.statusCode = 400;
      throw error;
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      const error = new Error('No account found with this email address. Please click Sign Up to create your account.');
      error.statusCode = 404;
      throw error;
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      const error = new Error('Incorrect password. Please verify your password and try again.');
      error.statusCode = 401;
      throw error;
    }

    if (!user.isActive) {
      const error = new Error('Account is deactivated. Contact customer support.');
      error.statusCode = 403;
      throw error;
    }

    // For customers: ensure email has been verified via OTP
    if (user.role === 'customer' && !user.isVerified) {
      // Issue new OTP automatically so user can verify if they choose to
      const otp = this.generateOTP();
      user.otp = otp;
      user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();
      const emailResult = await sendOtpEmail(cleanEmail, user.name, otp);

      const error = new Error('Account signup is pending verification. Please verify your email to sign in.');
      error.statusCode = 403;
      error.isUnverified = true;
      error.email = cleanEmail;
      error.simulatedOtp = emailResult?.simulated ? otp : undefined;
      throw error;
    }

    const token = this.generateToken(user._id);

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        addresses: user.addresses,
        wishlist: user.wishlist,
        avatar: user.avatar || '',
        createdAt: user.createdAt
      }
    };
  }

  static async getUserProfile(userId) {
    const user = await User.findById(userId).select('-password -otp -otpExpires');
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar || '',
      addresses: (user.addresses || []).slice(0, 1),
      wishlist: user.wishlist || [],
      createdAt: user.createdAt
    };
  }

  static async updateUserProfile(userId, updateData) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    if (updateData.name) user.name = updateData.name.trim();
    if (updateData.phone !== undefined) {
      const cleanPhone = sanitizePhoneNumber(updateData.phone);
      if (cleanPhone && !isValidIndianPhone(cleanPhone)) {
        const error = new Error('Mobile number must be a valid 10-digit number starting with 6, 7, 8, or 9');
        error.statusCode = 400;
        throw error;
      }
      user.phone = cleanPhone;
    }
    if (updateData.avatar !== undefined) {
      // If user had an existing Cloudinary avatar and it's being replaced or cleared, delete from Cloudinary!
      if (user.avatar && user.avatar !== updateData.avatar && user.avatar.includes('cloudinary.com')) {
        await CloudinaryService.deleteMediaByUrl(user.avatar);
      }
      user.avatar = updateData.avatar;
    }
    if (updateData.addresses && Array.isArray(updateData.addresses)) {
      // User can only have at most 1 saved delivery address
      const singleList = updateData.addresses.slice(0, 1);
      for (const addr of singleList) {
        if (addr.phone) {
          const cleanAddrPhone = sanitizePhoneNumber(addr.phone);
          if (!isValidIndianPhone(cleanAddrPhone)) {
            const error = new Error('Address mobile number must be a valid 10-digit number starting with 6, 7, 8, or 9');
            error.statusCode = 400;
            throw error;
          }
          addr.phone = cleanAddrPhone;
        }
        addr.isDefault = true;
      }
      user.addresses = singleList;
    }

    // Handle password change if requested
    if (updateData.newPassword) {
      if (!updateData.currentPassword) {
        const error = new Error('Please provide current password to set a new password');
        error.statusCode = 400;
        throw error;
      }
      const isMatch = await user.matchPassword(updateData.currentPassword);
      if (!isMatch) {
        const error = new Error('Current password is incorrect');
        error.statusCode = 400;
        throw error;
      }
      if (updateData.newPassword.length < 6) {
        const error = new Error('New password must be at least 6 characters long');
        error.statusCode = 400;
        throw error;
      }
      user.password = updateData.newPassword;
    }

    const saved = await user.save();
    return {
      id: saved._id,
      name: saved.name,
      email: saved.email,
      phone: saved.phone,
      avatar: saved.avatar,
      role: saved.role,
      addresses: saved.addresses,
      wishlist: saved.wishlist
    };
  }

  static async toggleWishlist(userId, productId) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const index = user.wishlist.indexOf(productId);
    let isInWishlist = false;

    if (index > -1) {
      user.wishlist.splice(index, 1);
    } else {
      user.wishlist.push(productId);
      isInWishlist = true;
    }

    await user.save();
    return { isInWishlist, wishlist: user.wishlist };
  }

  /**
   * Permanently delete user account after verifying current password,
   * and clean up their Cloudinary avatar
   */
  static async deleteAccount(userId, password) {
    if (!password) {
      const error = new Error('Please enter your current password to confirm account deletion.');
      error.statusCode = 400;
      throw error;
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      const error = new Error('Incorrect password. Account deletion aborted.');
      error.statusCode = 400;
      throw error;
    }

    // Explicitly delete user's profile avatar from Cloudinary (NOVISE_HERBAL/users)
    if (user.avatar && user.avatar.includes('cloudinary.com')) {
      await CloudinaryService.deleteMediaByUrl(user.avatar);
    }

    await User.findByIdAndDelete(userId);
    return { success: true, message: 'Account and associated profile assets deleted successfully' };
  }

  /**
   * Initiate Forgot Password flow: sends 6-digit OTP to user's email
   */
  static async forgotPassword({ email }) {
    if (!email) {
      const error = new Error('Please provide your registered email address.');
      error.statusCode = 400;
      throw error;
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      const error = new Error('No account found with this email address. Please verify your email or click Sign Up.');
      error.statusCode = 404;
      throw error;
    }

    const otp = this.generateOTP();
    user.resetOtp = otp;
    user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    const emailResult = await sendPasswordResetOtpEmail(cleanEmail, user.name, otp);

    return {
      success: true,
      message: `A 6-digit password reset code has been sent to ${cleanEmail}.`,
      email: cleanEmail,
      simulatedOtp: emailResult?.simulated ? otp : undefined
    };
  }

  /**
   * Complete Password Reset: verifies 6-digit OTP and sets new password
   */
  static async resetPassword({ email, otp, newPassword }) {
    if (!email || !otp || !newPassword) {
      const error = new Error('Please provide email, 6-digit reset code, and new password.');
      error.statusCode = 400;
      throw error;
    }

    if (newPassword.length < 6) {
      const error = new Error('New password must be at least 6 characters long.');
      error.statusCode = 400;
      throw error;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      const error = new Error('No account found with this email address.');
      error.statusCode = 404;
      throw error;
    }

    if (!user.resetOtp || !user.resetOtpExpires) {
      const error = new Error('No active password reset request found. Please request a new recovery code.');
      error.statusCode = 400;
      throw error;
    }

    if (new Date() > new Date(user.resetOtpExpires)) {
      const error = new Error('Password reset code has expired. Please request a new recovery code.');
      error.statusCode = 400;
      throw error;
    }

    if (user.resetOtp !== cleanOtp) {
      const error = new Error('Incorrect 6-digit security code. Please check your email or click resend.');
      error.statusCode = 400;
      throw error;
    }

    // Set new password (will be hashed by pre('save'))
    user.password = newPassword;
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;

    // Email has been verified via reset OTP
    if (!user.isVerified) {
      user.isVerified = true;
    }

    await user.save();

    return {
      success: true,
      message: 'Your password has been reset successfully! You can now sign in with your new password.'
    };
  }
}
