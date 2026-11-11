import { AuthService } from '../services/authService.js';

// @route POST /api/auth/register
export const register = async (req, res) => {
  try {
    const result = await AuthService.registerUser(req.body);
    res.status(201).json({ success: true, ...result });
  } catch (error) {
    res.status(error.statusCode || 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @route POST /api/auth/verify-otp
export const verifyOtp = async (req, res) => {
  try {
    const result = await AuthService.verifyOtp(req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.statusCode || 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @route POST /api/auth/resend-otp
export const resendOtp = async (req, res) => {
  try {
    const result = await AuthService.resendOtp(req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.statusCode || 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @route POST /api/auth/login
export const login = async (req, res) => {
  try {
    const result = await AuthService.loginUser(req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.statusCode || 500).json({ 
      success: false, 
      message: error.message,
      isUnverified: error.isUnverified || false,
      email: error.email || undefined
    });
  }
};

// @route GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const user = await AuthService.getUserProfile(req.user._id);
    res.json({ success: true, user });
  } catch (error) {
    res.status(error.statusCode || 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @route PUT /api/auth/profile
export const updateProfile = async (req, res) => {
  try {
    const user = await AuthService.updateUserProfile(req.user._id, req.body);
    res.json({ success: true, user });
  } catch (error) {
    res.status(error.statusCode || 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @route POST /api/auth/wishlist/toggle
export const toggleWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const result = await AuthService.toggleWishlist(req.user._id, productId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.statusCode || 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @route DELETE /api/auth/profile OR POST /api/auth/delete-account
export const deleteAccount = async (req, res) => {
  try {
    const password = req.body?.password || req.headers['x-account-password'] || req.query?.password;
    if (!password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please enter your current password to confirm account deletion.' 
      });
    }
    const result = await AuthService.deleteAccount(req.user._id, password);
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @route POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  try {
    const result = await AuthService.forgotPassword(req.body);
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @route POST /api/auth/reset-password
export const resetPassword = async (req, res) => {
  try {
    const result = await AuthService.resetPassword(req.body);
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ 
      success: false, 
      message: error.message 
    });
  }
};
