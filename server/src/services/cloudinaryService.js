import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Extracts Cloudinary public_id from a full URL
 * Example:
 * https://res.cloudinary.com/ipb9jst1/image/upload/v1793361811/NOVISE_HERBAL/products/novise_hair_oil_1.jpg
 * -> NOVISE_HERBAL/products/novise_hair_oil_1
 */
export const extractPublicId = (url) => {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) {
    return null;
  }
  const match = url.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
  return match ? match[1] : null;
};

/**
 * Detects if a URL is a video file
 */
export const isVideoUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return url.includes('/video/upload/') || /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(url);
};

/**
 * Helper to upload buffer via Cloudinary stream
 */
const uploadStream = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
};

export class CloudinaryService {
  /**
   * 1. Upload Product Image to NOVISE_HERBAL/products
   */
  static async uploadProductImage(buffer, originalname = 'product.jpg') {
    const parsed = path.parse(originalname);
    const cleanName = parsed.name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const publicId = `${cleanName}_${Date.now()}`;

    const result = await uploadStream(buffer, {
      folder: 'NOVISE_HERBAL/products',
      public_id: publicId,
      resource_type: 'image',
      overwrite: false
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height
    };
  }

  /**
   * 2. Upload Review Media (Images or Videos) to NOVISE_HERBAL/reviews
   */
  static async uploadReviewMedia(buffer, originalname = 'review_media', isVideo = false) {
    const parsed = path.parse(originalname);
    const cleanName = parsed.name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const publicId = `${cleanName}_${Date.now()}`;

    const result = await uploadStream(buffer, {
      folder: 'NOVISE_HERBAL/reviews',
      public_id: publicId,
      resource_type: isVideo ? 'video' : 'image',
      overwrite: false
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format
    };
  }

  /**
   * 3. Upload User Profile Avatar to NOVISE_HERBAL/users
   */
  static async uploadUserAvatar(buffer, originalname = 'avatar.jpg', userId = '') {
    const parsed = path.parse(originalname);
    const cleanName = parsed.name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const publicId = `user_${userId ? userId + '_' : ''}${cleanName}_${Date.now()}`;

    const result = await uploadStream(buffer, {
      folder: 'NOVISE_HERBAL/users',
      public_id: publicId,
      resource_type: 'image',
      overwrite: false
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height
    };
  }

  /**
   * 4. Upload Hero Banner to NOVISE_HERBAL/Hero_Banner
   * Automatically replaces and deletes previous Cloudinary image if present
   */
  static async uploadHeroBanner(buffer, originalname = 'hero_banner.jpg', oldImageUrl = null) {
    // If old image exists in Cloudinary, delete it first to keep storage clean
    if (oldImageUrl && typeof oldImageUrl === 'string' && oldImageUrl.includes('cloudinary.com')) {
      try {
        await this.deleteMediaByUrl(oldImageUrl);
        console.log('[Cloudinary Hero_Banner] Replaced and deleted previous image:', oldImageUrl);
      } catch (e) {
        console.warn('[Cloudinary Hero_Banner] Could not delete previous image:', e.message);
      }
    }

    const parsed = path.parse(originalname);
    const cleanName = parsed.name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const publicId = `hero_${cleanName}_${Date.now()}`;

    const result = await uploadStream(buffer, {
      folder: 'NOVISE_HERBAL/Hero_Banner',
      public_id: publicId,
      resource_type: 'image',
      overwrite: false
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height
    };
  }

  /**
   * 5. Upload Order Complaint / Damage Report Video to 'NOVISE_HERBAL/Order_Report_Videos'
   * Cloudinary folder: NOVISE_HERBAL/Order_Report_Videos
   */
  static async uploadReportVideo(buffer, originalname = 'report_video.mp4', orderId = '') {
    const parsed = path.parse(originalname);
    const cleanName = parsed.name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const cleanOrder = (orderId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const publicId = `report_${cleanOrder ? cleanOrder + '_' : ''}${cleanName}_${Date.now()}`;

    const result = await uploadStream(buffer, {
      folder: 'NOVISE_HERBAL/Order_Report_Videos',
      public_id: publicId,
      resource_type: 'video',
      overwrite: false
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      duration: result.duration,
      bytes: result.bytes
    };
  }

  /**
   * Delete video from Cloudinary by exact public_id
   */
  static async deleteVideoByPublicId(publicId) {
    if (!publicId) return null;
    try {
      const res = await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
      console.log(`[Cloudinary Destroy Video] ${publicId}:`, res);
      return res;
    } catch (err) {
      console.error(`[Cloudinary Destroy Video Error] Failed to delete ${publicId}:`, err.message);
      return null;
    }
  }

  /**
   * 6. Delete Media from Cloudinary by full URL or public_id
   */
  static async deleteMediaByUrl(url) {
    if (!url || typeof url !== 'string') return null;

    const publicId = extractPublicId(url);
    if (!publicId) {
      // Not a cloudinary URL or invalid
      return null;
    }

    const isVideo = isVideoUrl(url);
    const resourceType = isVideo ? 'video' : 'image';

    try {
      const res = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      console.log(`[Cloudinary Destroy] ${publicId} (${resourceType}):`, res);
      return res;
    } catch (err) {
      console.error(`[Cloudinary Destroy Error] Failed to delete ${publicId}:`, err.message);
      return null;
    }
  }

  /**
   * 4. Delete multiple media URLs from Cloudinary
   */
  static async deleteMultipleMedia(urls) {
    if (!Array.isArray(urls) || urls.length === 0) return [];
    const results = [];
    for (const url of urls) {
      if (url) {
        const res = await this.deleteMediaByUrl(url);
        results.push(res);
      }
    }
    return results;
  }
}

export default CloudinaryService;

