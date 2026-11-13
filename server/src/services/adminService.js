import User from '../models/User.js';
import Order from '../models/Order.js';
import { CloudinaryService } from './cloudinaryService.js';
import { sanitizePhoneNumber, isValidIndianPhone } from '../utils/phoneValidation.js';

export class AdminService {
  /**
   * Ensure Default Super Admin exists in database
   */
  static async ensureDefaultAdmin() {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@novise.in';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@Novise2026';
    const adminName = process.env.ADMIN_NAME || 'Novise Administrator';
    const adminPhone = process.env.ADMIN_PHONE || '9876543210';

    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = await User.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        phone: adminPhone,
        role: 'admin',
        isVerified: true,
        isActive: true
      });
      console.log(`[Admin Guard] Super Admin initialized: ${adminEmail}`);
      return { created: true, email: adminEmail };
    } else {
      let modified = false;
      if (admin.role !== 'admin') {
        admin.role = 'admin';
        modified = true;
      }
      if (!admin.isActive) {
        admin.isActive = true;
        modified = true;
      }
      if (!admin.isVerified) {
        admin.isVerified = true;
        modified = true;
      }
      if (modified) {
        await admin.save();
        console.log(`[Admin Guard] Super Admin verified & restored: ${adminEmail}`);
      }
      return { created: false, email: adminEmail };
    }
  }

  /**
   * Reset / Force Default Admin Credentials back to factory values
   */
  static async resetDefaultAdmin() {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@novise.in';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@Novise2026';
    const adminName = process.env.ADMIN_NAME || 'Novise Administrator';

    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = await User.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        phone: '9876543210',
        role: 'admin',
        isVerified: true,
        isActive: true
      });
    } else {
      admin.name = adminName;
      admin.role = 'admin';
      admin.isActive = true;
      admin.isVerified = true;
      admin.password = adminPassword; // Triggers bcrypt pre('save')
      await admin.save();
    }

    return {
      success: true,
      message: `Default Super Admin restored successfully: ${adminEmail}`,
      email: adminEmail
    };
  }

  /**
   * List all admin and staff users
   */
  static async getAllAdmins() {
    const admins = await User.find({
      role: { $in: ['admin', 'staff'] }
    }).select('-password -otp -otpExpires -resetOtp -resetOtpExpires').sort({ role: 1, createdAt: -1 });

    return admins;
  }

  /**
   * Create a new Admin or Staff user
   */
  static async createAdmin({ name, email, phone, role, password }) {
    if (!name || !email || !password) {
      const error = new Error('Name, email, and password are required.');
      error.statusCode = 400;
      throw error;
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      const error = new Error(`An account with email ${cleanEmail} already exists.`);
      error.statusCode = 400;
      throw error;
    }

    if (password.length < 6) {
      const error = new Error('Password must be at least 6 characters long.');
      error.statusCode = 400;
      throw error;
    }

    const cleanPhone = phone ? sanitizePhoneNumber(phone) : '9876543210';
    if (phone && !isValidIndianPhone(cleanPhone)) {
      const error = new Error('Admin mobile number must be a valid 10-digit number starting with 6, 7, 8, or 9');
      error.statusCode = 400;
      throw error;
    }
    const targetRole = role === 'staff' ? 'staff' : 'admin';

    const newAdmin = await User.create({
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      role: targetRole,
      password,
      isVerified: true,
      isActive: true
    });

    return {
      success: true,
      message: `New ${targetRole} account created successfully!`,
      user: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        phone: newAdmin.phone,
        role: newAdmin.role,
        isActive: newAdmin.isActive
      }
    };
  }

  /**
   * Update existing Admin or Staff credentials
   */
  static async updateAdmin(id, { name, email, phone, role, password, isActive }) {
    const admin = await User.findById(id);
    if (!admin) {
      const error = new Error('Admin account not found');
      error.statusCode = 404;
      throw error;
    }

    if (name) admin.name = name.trim();
    if (phone !== undefined) {
      const cleanPhone = sanitizePhoneNumber(phone);
      if (cleanPhone && !isValidIndianPhone(cleanPhone)) {
        const error = new Error('Admin mobile number must be a valid 10-digit number starting with 6, 7, 8, or 9');
        error.statusCode = 400;
        throw error;
      }
      admin.phone = cleanPhone;
    }
    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail !== admin.email) {
        const existing = await User.findOne({ email: cleanEmail });
        if (existing) {
          const error = new Error(`Email ${cleanEmail} is already in use.`);
          error.statusCode = 400;
          throw error;
        }
        admin.email = cleanEmail;
      }
    }

    if (role && ['admin', 'staff'].includes(role)) {
      admin.role = role;
    }

    if (isActive !== undefined) {
      admin.isActive = Boolean(isActive);
    }

    if (password && password.trim().length >= 6) {
      admin.password = password.trim(); // Will be hashed by pre('save')
    }

    await admin.save();

    return {
      success: true,
      message: `Admin credentials for ${admin.name} updated successfully!`,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        isActive: admin.isActive
      }
    };
  }

  /**
   * Delete Admin or Staff user
   */
  static async deleteAdmin(id, currentAdminId) {
    if (String(id) === String(currentAdminId)) {
      const error = new Error('You cannot delete your own logged-in admin account.');
      error.statusCode = 400;
      throw error;
    }

    const admin = await User.findById(id);
    if (!admin) {
      const error = new Error('Account not found');
      error.statusCode = 404;
      throw error;
    }

    const defaultAdminEmail = (process.env.ADMIN_EMAIL || 'admin@novise.in').toLowerCase();
    if (admin.email.toLowerCase() === defaultAdminEmail) {
      const error = new Error('The default Super Admin account cannot be deleted. You can edit its credentials instead.');
      error.statusCode = 400;
      throw error;
    }

    await User.findByIdAndDelete(id);

    return {
      success: true,
      message: `Account for ${admin.email} has been removed successfully.`
    };
  }

  /**
   * Get all customers with orders summary, lifetime spent, and address
   */
  static async getAllCustomers({ search, status, verified, limit = 50, page = 1 }) {
    const filter = { role: 'customer' };

    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: regex },
        { email: regex },
        { phone: regex }
      ];
    }

    if (status === 'active') filter.isActive = true;
    if (status === 'blocked') filter.isActive = false;
    if (verified === 'verified') filter.isVerified = true;
    if (verified === 'unverified') filter.isVerified = false;

    const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -otp -otpExpires -resetOtp -resetOtpExpires')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter)
    ]);

    // Aggregate orders & total spent for each user
    const userEmails = users.map(u => u.email);
    const userIds = users.map(u => u._id);

    const orders = await Order.find({
      $or: [
        { user: { $in: userIds } },
        { 'customerDetails.email': { $in: userEmails } }
      ]
    }).select('user customerDetails pricing orderStatus paymentInfo createdAt');

    const customerData = users.map(user => {
      const userOrders = orders.filter(
        o => (o.user && String(o.user) === String(user._id)) || 
             (o.customerDetails?.email && o.customerDetails.email.toLowerCase() === user.email.toLowerCase())
      );

      const totalSpent = userOrders
        .filter(o => o.orderStatus !== 'CANCELLED' && (
          (o.paymentInfo?.method === 'ONLINE' && o.paymentInfo?.status === 'PAID') ||
          (o.paymentInfo?.method === 'COD' && o.orderStatus === 'DELIVERED')
        ))
        .reduce((sum, o) => sum + (o.pricing?.totalAmount || 0), 0);

      const lastOrder = userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

      return {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar || '',
        isVerified: !!user.isVerified,
        isActive: user.isActive !== false,
        addresses: user.addresses || [],
        ordersCount: userOrders.length,
        totalSpent,
        lastOrderDate: lastOrder ? lastOrder.createdAt : null,
        joinedAt: user.createdAt
      };
    });

    // Overview Stats
    const [totalCustomers, verifiedCount, activeCount] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'customer', isVerified: true }),
      User.countDocuments({ role: 'customer', isActive: true })
    ]);

    return {
      customers: customerData,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      },
      stats: {
        totalCustomers,
        verifiedCount,
        unverifiedCount: totalCustomers - verifiedCount,
        activeCount,
        blockedCount: totalCustomers - activeCount
      }
    };
  }

  /**
   * Get single customer with detailed order history
   */
  static async getCustomerDetails(customerId) {
    const user = await User.findById(customerId).select('-password -otp -otpExpires -resetOtp -resetOtpExpires');
    if (!user) {
      const error = new Error('Customer not found');
      error.statusCode = 404;
      throw error;
    }

    const orders = await Order.find({
      $or: [
        { user: user._id },
        { 'customerDetails.email': user.email }
      ]
    }).sort({ createdAt: -1 });

    const totalSpent = orders
      .filter(o => o.orderStatus !== 'CANCELLED' && (
        (o.paymentInfo?.method === 'ONLINE' && o.paymentInfo?.status === 'PAID') ||
        (o.paymentInfo?.method === 'COD' && o.orderStatus === 'DELIVERED')
      ))
      .reduce((sum, o) => sum + (o.pricing?.totalAmount || 0), 0);

    return {
      customer: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar || '',
        isVerified: !!user.isVerified,
        isActive: user.isActive !== false,
        addresses: user.addresses || [],
        joinedAt: user.createdAt,
        totalSpent,
        ordersCount: orders.length
      },
      orders
    };
  }

  /**
   * Toggle Customer Active / Blocked status
   */
  static async toggleCustomerStatus(customerId, isActive) {
    const user = await User.findById(customerId);
    if (!user) {
      const error = new Error('Customer not found');
      error.statusCode = 404;
      throw error;
    }

    user.isActive = isActive;
    await user.save();

    return {
      success: true,
      message: `Customer account ${user.email} is now ${isActive ? 'Active' : 'Blocked'}.`,
      isActive: user.isActive
    };
  }

  /**
   * Delete Customer permanently with Cloudinary cleanup
   */
  static async deleteCustomer(customerId) {
    const user = await User.findById(customerId);
    if (!user) {
      const error = new Error('Customer not found');
      error.statusCode = 404;
      throw error;
    }

    if (user.avatar && user.avatar.includes('cloudinary.com')) {
      await CloudinaryService.deleteMediaByUrl(user.avatar);
    }

    await User.findByIdAndDelete(customerId);

    return {
      success: true,
      message: `Customer account ${user.email} removed permanently.`
    };
  }

  /**
   * Get store system integrations health
   */
  static async getStoreSystemHealth() {
    return {
      database: {
        name: 'MongoDB Atlas',
        status: 'CONNECTED',
        database: 'novise_db'
      },
      paymentGateway: {
        provider: 'Razorpay',
        keyId: process.env.RAZORPAY_KEY_ID ? 'Configured' : 'Missing',
        status: process.env.RAZORPAY_KEY_ID?.includes('sample') ? 'TEST_SIMULATED' : 'LIVE'
      },
      logistics: {
        provider: 'India Post / Courier Dispatch',
        status: 'ACTIVE_MANUAL'
      },
      emailMailer: {
        provider: 'Google SMTP (Gmail)',
        from: process.env.EMAIL_FROM || 'support@novise.in',
        status: process.env.SMTP_USER ? 'CONNECTED' : 'DISABLED'
      },
      mediaStorage: {
        provider: 'Cloudinary CDN',
        folder: process.env.CLOUDINARY_FOLDER || 'NOVISE_HERBAL',
        status: process.env.CLOUDINARY_CLOUD_NAME ? 'CONNECTED' : 'DISABLED'
      }
    };
  }
}

