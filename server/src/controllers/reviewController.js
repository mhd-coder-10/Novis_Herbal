import { ReviewService } from '../services/reviewService.js';
import { CloudinaryService } from '../services/cloudinaryService.js';
import { realtimeService } from '../services/realtimeService.js';

// Get reviews for a product
export const getProductReviews = async (req, res) => {
  try {
    const reviews = await ReviewService.getProductReviews(req.params.productId);
    res.json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// Get reviews written by the logged in user
export const getMyReviews = async (req, res) => {
  try {
    const reviews = await ReviewService.getMyReviews(req.user._id);
    res.json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// Submit a new review
export const submitReview = async (req, res) => {
  try {
    const review = await ReviewService.submitReview({
      ...req.body,
      user: req.user
    });
    res.status(201).json({ success: true, message: 'Review submitted successfully', review });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// Update existing review (max 1 edit)
export const updateReview = async (req, res) => {
  try {
    const review = await ReviewService.updateReview({
      reviewId: req.params.id,
      ...req.body,
      user: req.user
    });
    res.json({ success: true, message: 'Review updated successfully', review });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// Delete review
export const deleteReview = async (req, res) => {
  try {
    const result = await ReviewService.deleteReview({
      reviewId: req.params.id,
      user: req.user
    });
    realtimeService.broadcast('REVIEW_UPDATED', { action: 'delete', reviewId: req.params.id });
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// Upload review media (up to 3 files: images or videos) to Cloudinary (NOVISE_HERBAL/reviews)
export const uploadReviewMediaController = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No media files provided' });
    }

      const uploadPromises = req.files.map(async (file) => {
        const isVideo = file.mimetype.startsWith('video/') || /mp4|webm|mov|m4v|ogg/.test(file.originalname.toLowerCase());
        const uploadResult = await CloudinaryService.uploadReviewMedia(
          file.buffer,
          file.originalname,
          isVideo
        );
        return {
          url: uploadResult.url,
          publicId: uploadResult.publicId,
          type: isVideo ? 'video' : 'image',
          name: file.originalname
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      res.json({ success: true, files: uploadedFiles });
    } catch (error) {
      console.error('[Upload Review Media Error]:', error);
      res.status(500).json({ success: false, message: error.message || 'Media upload failed' });
    }
  };

  // Admin: Get all reviews
  export const getAllReviewsAdmin = async (req, res) => {
    try {
      const reviews = await ReviewService.getAllReviewsAdmin();
      res.json({ success: true, count: reviews.length, reviews });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  };

  // Admin: Toggle approval status
  export const toggleReviewApproval = async (req, res) => {
    try {
      const isApproved = await ReviewService.toggleReviewApproval(req.params.id);
      realtimeService.broadcast('REVIEW_UPDATED', { action: 'toggle', reviewId: req.params.id, isApproved });
      res.json({ success: true, isApproved });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  };
