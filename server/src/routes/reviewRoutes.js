import express from 'express';
import { 
  getFeaturedTopReviews,
  getProductReviews,
  getMyReviews,
  submitReview,
  updateReview,
  deleteReview,
  uploadReviewMediaController,
  getAllReviewsAdmin, 
  toggleReviewApproval 
} from '../controllers/reviewController.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadReviewMedia } from '../middleware/upload.js';

const router = express.Router();

// Public routes
router.get('/featured', getFeaturedTopReviews);
router.get('/top', getFeaturedTopReviews);
router.get('/product/:productId', getProductReviews);

// Customer protected routes
router.get('/my', protect, getMyReviews);
router.post('/', protect, submitReview);
router.put('/:id', protect, updateReview);
router.delete('/:id', protect, deleteReview);
router.post('/upload', protect, uploadReviewMedia.array('files', 3), uploadReviewMediaController);

// Admin moderation routes
router.get('/admin/all', protect, authorize('admin', 'staff'), getAllReviewsAdmin);
router.put('/admin/:id/toggle', protect, authorize('admin', 'staff'), toggleReviewApproval);

export default router;
