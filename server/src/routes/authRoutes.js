import express from 'express';
import { 
  register, 
  verifyOtp, 
  resendOtp, 
  login, 
  getMe, 
  updateProfile, 
  toggleWishlist,
  deleteAccount,
  forgotPassword,
  resetPassword
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.delete('/profile', protect, deleteAccount);
router.post('/delete-account', protect, deleteAccount);
router.post('/wishlist/toggle', protect, toggleWishlist);

export default router;
