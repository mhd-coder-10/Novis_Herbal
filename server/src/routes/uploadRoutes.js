import express from 'express';
import { upload, uploadComplaintVideo } from '../middleware/upload.js';
import { protect, authorize } from '../middleware/auth.js';
import { CloudinaryService } from '../services/cloudinaryService.js';
import User from '../models/User.js';

const router = express.Router();

/**
 * @route POST /api/upload
 * @desc Upload single product image directly to Cloudinary (NOVISE_HERBAL/products) or Hero_Banner
 * @access Admin/Staff
 */
router.post('/', protect, authorize('admin', 'staff'), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const isHeroBanner = req.body.folder === 'Hero_Banner' || req.body.type === 'hero-banner';
    const oldImageUrl = req.body.oldImageUrl || null;

    const uploadResult = isHeroBanner
      ? await CloudinaryService.uploadHeroBanner(req.file.buffer, req.file.originalname, oldImageUrl)
      : await CloudinaryService.uploadProductImage(req.file.buffer, req.file.originalname);

    res.json({
      success: true,
      fileUrl: uploadResult.url,
      publicId: uploadResult.publicId,
      format: uploadResult.format,
      width: uploadResult.width,
      height: uploadResult.height
    });
  } catch (error) {
    console.error('[Upload Image Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Image upload failed' });
  }
});

/**
 * @route POST /api/upload/hero-banner
 * @desc Upload single Hero Banner image directly to Cloudinary folder (NOVISE_HERBAL/Hero_Banner)
 * @access Admin/Staff
 */
router.post('/hero-banner', protect, authorize('admin', 'staff'), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const oldImageUrl = req.body.oldImageUrl || null;
    const uploadResult = await CloudinaryService.uploadHeroBanner(
      req.file.buffer,
      req.file.originalname,
      oldImageUrl
    );

    res.json({
      success: true,
      fileUrl: uploadResult.url,
      publicId: uploadResult.publicId,
      format: uploadResult.format,
      width: uploadResult.width,
      height: uploadResult.height
    });
  } catch (error) {
    console.error('[Upload Hero Banner Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Banner upload failed' });
  }
});

/**
 * @route POST /api/upload/multiple
 * @desc Upload multiple product images directly to Cloudinary (NOVISE_HERBAL/products)
 * @access Admin/Staff
 */
router.post('/multiple', protect, authorize('admin', 'staff'), upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const uploadPromises = req.files.map(file =>
      CloudinaryService.uploadProductImage(file.buffer, file.originalname)
    );

    const results = await Promise.all(uploadPromises);

    res.json({
      success: true,
      files: results.map(r => ({
        url: r.url,
        publicId: r.publicId
      }))
    });
  } catch (error) {
    console.error('[Upload Multiple Product Images Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Multiple upload failed' });
  }
});

/**
 * @route DELETE /api/upload
 * @desc Delete image from Cloudinary
 * @access Admin/Staff
 */
router.delete('/', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: 'Image URL is required' });
    }

    const result = await CloudinaryService.deleteMediaByUrl(url);
    res.json({ success: true, message: 'Image deleted from Cloudinary', result });
  } catch (error) {
    console.error('[Delete Cloudinary Image Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Delete failed' });
  }
});

/**
 * @route POST /api/upload/avatar
 * @desc Customer Avatar / Profile Picture Upload to Cloudinary (NOVISE_HERBAL/users)
 * @access Customer (Protected)
 */
router.post('/avatar', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // 1. Fetch current user from DB to check for existing avatar
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 2. If user already has an avatar in Cloudinary, delete old avatar first!
    if (user.avatar && user.avatar.includes('cloudinary.com')) {
      await CloudinaryService.deleteMediaByUrl(user.avatar);
    }

    // 3. Upload new avatar buffer to Cloudinary in 'NOVISE_HERBAL/users'
    const uploadResult = await CloudinaryService.uploadUserAvatar(
      req.file.buffer,
      req.file.originalname,
      String(req.user._id)
    );

    // 4. Update user record in database
    user.avatar = uploadResult.url;
    await user.save();

    res.json({
      success: true,
      fileUrl: uploadResult.url,
      publicId: uploadResult.publicId
    });
  } catch (error) {
    console.error('[Upload Avatar Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Avatar upload failed' });
  }
});

/**
 * @route DELETE /api/upload/avatar
 * @desc Remove profile picture from Cloudinary (NOVISE_HERBAL/users) and database
 * @access Customer (Protected)
 */
router.delete('/avatar', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.avatar && user.avatar.includes('cloudinary.com')) {
      await CloudinaryService.deleteMediaByUrl(user.avatar);
    }

    user.avatar = '';
    await user.save();

    res.json({
      success: true,
      message: 'Profile photo removed from Cloudinary and profile updated'
    });
  } catch (error) {
    console.error('[Delete Avatar Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to remove avatar' });
  }
});

/**
 * @route POST /api/upload/complaint-video
 * @desc Customer Order Damage/Missing Item Report Video Upload to Cloudinary (Order_Report_Videos)
 * @access Customer (Protected)
 */
router.post('/complaint-video', protect, uploadComplaintVideo.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No video file uploaded' });
    }

    const orderId = req.body.orderId || '';
    const uploadResult = await CloudinaryService.uploadReportVideo(
      req.file.buffer,
      req.file.originalname,
      orderId
    );

    res.json({
      success: true,
      fileUrl: uploadResult.url,
      videoUrl: uploadResult.url,
      publicId: uploadResult.publicId,
      format: uploadResult.format,
      duration: uploadResult.duration
    });
  } catch (error) {
    console.error('[Upload Complaint Video Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Video upload failed' });
  }
});

/**
 * @route DELETE /api/upload/complaint-video
 * @desc Delete uploaded complaint video from Cloudinary
 * @access Customer (Protected)
 */
router.delete('/complaint-video', protect, async (req, res) => {
  try {
    const { publicId, url } = req.body;
    if (publicId) {
      await CloudinaryService.deleteVideoByPublicId(publicId);
    } else if (url) {
      await CloudinaryService.deleteMediaByUrl(url);
    }
    res.json({ success: true, message: 'Video removed from Cloudinary' });
  } catch (error) {
    console.error('[Delete Complaint Video Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete video' });
  }
});

export default router;
