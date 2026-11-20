import Review from '../models/Review.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { CloudinaryService } from './cloudinaryService.js';
import { NotificationService } from './notificationService.js';

export class ReviewService {
  // Get top rated approved reviews across all products for Home Page
  static async getFeaturedTopReviews(limit = 6) {
    return await Review.find({ isApproved: true })
      .populate('product', 'name slug images sellingPrice volumeText')
      .populate('user', 'name avatar')
      .sort({ rating: -1, createdAt: -1 })
      .limit(Number(limit) || 6);
  }

  // Get approved reviews for a specific product
  static async getProductReviews(productId) {
    return await Review.find({
      product: productId,
      isApproved: true
    })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 });
  }

  // Get all reviews written by the logged in user
  static async getMyReviews(userId) {
    return await Review.find({ user: userId })
      .populate('product', 'name slug images sellingPrice volumeText')
      .sort({ createdAt: -1 });
  }

  // Submit a new review (max 1 review per user per product)
  static async submitReview({ productId, rating, title, comment, media, images, user }) {
    if (!user) {
      const error = new Error('You must be logged in to submit a review');
      error.statusCode = 401;
      throw error;
    }

    if (!productId || !rating || !title || !comment) {
      const error = new Error('Please provide all required review fields');
      error.statusCode = 400;
      throw error;
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      const error = new Error('Rating must be between 1 and 5 stars');
      error.statusCode = 400;
      throw error;
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({ product: productId, user: user._id });
    if (existingReview) {
      const error = new Error('You have already reviewed this product. You can edit your existing review.');
      error.statusCode = 400;
      throw error;
    }

    // Validate media count (maximum 3 files)
    const mediaList = Array.isArray(media) ? media.slice(0, 3) : [];
    const imageList = Array.isArray(images) ? images.slice(0, 3) : [];

    // Create review with verified user credentials
    const review = await Review.create({
      product: productId,
      user: user._id,
      customerName: user.name,
      customerEmail: user.email,
      rating: numRating,
      title: title.trim(),
      comment: comment.trim(),
      media: mediaList,
      images: imageList,
      editCount: 0,
      isEdited: false,
      isVerifiedPurchase: true,
      isApproved: true
    });

    // Update Product average rating
    await this.recalculateProductRating(productId);

    // Notify Admin of New Customer Review
    NotificationService.notifyAdmin({
      type: 'NEW_REVIEW',
      title: `New Review (${numRating}★) from ${user.name}`,
      message: `"${title ? title + ': ' : ''}${comment.substring(0, 75)}..."`,
      priority: 'NORMAL',
      data: { reviewId: review._id, rating: numRating, productId },
      actionUrl: '/admin?tab=reviews'
    }).catch(err => console.error('[Notification Admin Error]:', err.message));

    // Notify Customer that their review is published live
    NotificationService.notifyUser({
      userId: user._id || user.id,
      userEmail: user.email,
      type: 'REVIEW_POSTED',
      title: 'Review Published Successfully! ⭐',
      message: `Thank you for reviewing! Your feedback has been published and helps the botanical community.`,
      priority: 'NORMAL',
      actionUrl: `/shop`
    }).catch(err => console.error('[Customer Notification Error]:', err.message));

    return review;
  }

  // Update existing review (maximum 1 edit allowed per review)
  static async updateReview({ reviewId, rating, title, comment, media, images, user }) {
    if (!user) {
      const error = new Error('Authentication required');
      error.statusCode = 401;
      throw error;
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      const error = new Error('Review not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify ownership
    if (review.user.toString() !== user._id.toString()) {
      const error = new Error('You can only edit your own review');
      error.statusCode = 403;
      throw error;
    }

    // Enforce 1-time edit limit
    if (review.editCount >= 1) {
      const error = new Error('This review has already been edited once. Further edits are not permitted.');
      error.statusCode = 400;
      throw error;
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      const error = new Error('Rating must be between 1 and 5 stars');
      error.statusCode = 400;
      throw error;
    }

    review.rating = numRating;
    review.title = title ? title.trim() : review.title;
    review.comment = comment ? comment.trim() : review.comment;
    
    // Rule 3: Check removed media and delete from Cloudinary (NOVISE_HERBAL/reviews)
    if (media !== undefined) {
      const oldMediaUrls = (review.media || []).map(m => (typeof m === 'string' ? m : m.url)).filter(Boolean);
      const newMediaUrls = Array.isArray(media) ? media.map(m => (typeof m === 'string' ? m : m.url)).filter(Boolean) : [];
      const removedMedia = oldMediaUrls.filter(oldUrl => !newMediaUrls.includes(oldUrl));
      if (removedMedia.length > 0) {
        console.log(`[Review Update] Removing ${removedMedia.length} deleted review media from Cloudinary`);
        await CloudinaryService.deleteMultipleMedia(removedMedia);
      }
      review.media = Array.isArray(media) ? media.slice(0, 3) : [];
    }
    if (images !== undefined) {
      review.images = Array.isArray(images) ? images.slice(0, 3) : [];
    }

    review.editCount += 1;
    review.isEdited = true;

    await review.save();

    // Recalculate Product average rating
    await this.recalculateProductRating(review.product);

    return review;
  }

  // Delete review (allows user to write a fresh review if desired)
  static async deleteReview({ reviewId, user }) {
    if (!user) {
      const error = new Error('Authentication required');
      error.statusCode = 401;
      throw error;
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      const error = new Error('Review not found');
      error.statusCode = 404;
      throw error;
    }

    // Only owner or admin can delete
    const isOwner = review.user.toString() === user._id.toString();
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isAdmin) {
      const error = new Error('You are not authorized to delete this review');
      error.statusCode = 403;
      throw error;
    }

    // Rule 2: When review is deleted, delete all attached media from Cloudinary (NOVISE_HERBAL/reviews)
    const mediaUrls = (review.media || []).map(m => (typeof m === 'string' ? m : m.url)).filter(Boolean);
    if (mediaUrls.length > 0) {
      console.log(`[Review Delete] Removing ${mediaUrls.length} media files from Cloudinary`);
      await CloudinaryService.deleteMultipleMedia(mediaUrls);
    }

    const productId = review.product;
    await Review.findByIdAndDelete(reviewId);

    // Recalculate Product average rating
    await this.recalculateProductRating(productId);

    return { success: true, message: 'Review deleted successfully' };
  }

  // Recalculate Product rating and review count
  static async recalculateProductRating(productId) {
    const allReviews = await Review.find({ product: productId, isApproved: true });
    const count = allReviews.length;
    const avg = count > 0 
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / count 
      : 5;

    await Product.findByIdAndUpdate(productId, {
      averageRating: Number(avg.toFixed(1)),
      numReviews: count
    });
  }

  // Admin: Get all reviews
  static async getAllReviewsAdmin() {
    return await Review.find()
      .populate('product', 'name images')
      .populate('user', 'name email avatar')
      .sort({ createdAt: -1 });
  }

  // Admin: Toggle approval status
  static async toggleReviewApproval(reviewId) {
    const review = await Review.findById(reviewId);
    if (!review) {
      const error = new Error('Review not found');
      error.statusCode = 404;
      throw error;
    }

    review.isApproved = !review.isApproved;
    await review.save();

    // Recalculate Product rating
    await this.recalculateProductRating(review.product);

    return review.isApproved;
  }
}
