import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Review from '../models/Review.js';
import { CloudinaryService } from './cloudinaryService.js';
import { NotificationService } from './notificationService.js';

export class ProductService {
  static async listProducts({
    search,
    category,
    minPrice,
    maxPrice,
    isCombo,
    isFeatured,
    sort,
    inStock,
    page = 1,
    limit = 20,
    includeUnpublished = false
  }) {
    const query = {};

    if (!includeUnpublished || includeUnpublished === 'false') {
      query.isPublished = true;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category;
    }

    if (isCombo === 'true') {
      query.isCombo = true;
    }

    if (isFeatured === 'true') {
      query.isFeatured = true;
    }

    if (inStock === 'true') {
      query.stock = { $gt: 0 };
    }

    if (minPrice || maxPrice) {
      query.sellingPrice = {};
      if (minPrice) query.sellingPrice.$gte = Number(minPrice);
      if (maxPrice) query.sellingPrice.$lte = Number(maxPrice);
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'price-low') sortOption = { sellingPrice: 1 };
    else if (sort === 'price-high') sortOption = { sellingPrice: -1 };
    else if (sort === 'rating') sortOption = { averageRating: -1 };
    else if (sort === 'popular') sortOption = { numReviews: -1 };

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category', 'name slug')
        .sort(sortOption)
        .skip(skip)
        .limit(Number(limit)),
      Product.countDocuments(query)
    ]);

    return {
      products,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      total
    };
  }

  static async getProductBySlugOrId(slugOrId) {
    let product;

    if (slugOrId.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(slugOrId).populate('category');
    }
    if (!product) {
      product = await Product.findOne({ slug: slugOrId }).populate('category');
    }

    if (!product) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }

    const relatedProducts = await Product.find({
      _id: { $ne: product._id },
      isPublished: true
    }).limit(3);

    return { product, relatedProducts };
  }

  static async createProduct(productData) {
    const { name, mrp, sellingPrice, sku } = productData;
    if (!name || !mrp || !sellingPrice || !sku) {
      const error = new Error('Name, SKU, MRP, and Selling Price are required');
      error.statusCode = 400;
      throw error;
    }

    if (Number(sellingPrice) > Number(mrp)) {
      const error = new Error('Selling price cannot exceed MRP');
      error.statusCode = 400;
      throw error;
    }

    const slug = productData.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const discountPercent = productData.discountPercent !== undefined && productData.discountPercent !== null && productData.discountPercent !== ''
      ? Number(productData.discountPercent)
      : (Number(mrp) > Number(sellingPrice) ? Math.round(((Number(mrp) - Number(sellingPrice)) / Number(mrp)) * 100) : 0);

    const createdProduct = await Product.create({
      ...productData,
      discountPercent,
      slug
    });

    // Broadcast new product arrival to all storefront visitors
    NotificationService.notifyBroadcast({
      type: 'PRODUCT_LAUNCH',
      title: `New Launch: ${createdProduct.name}`,
      message: `Explore our newest botanical creation: ${createdProduct.name} at ₹${createdProduct.sellingPrice}. Now available!`,
      priority: 'NORMAL',
      data: { productId: createdProduct._id, slug: createdProduct.slug, price: createdProduct.sellingPrice },
      actionUrl: `/product/${createdProduct.slug}`
    }).catch(err => console.error('[Notification Broadcast Error]:', err.message));

    return createdProduct;
  }

  static async updateProduct(id, updateData) {
    const product = await Product.findById(id);
    if (!product) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }

    const mrp = updateData.mrp !== undefined ? Number(updateData.mrp) : product.mrp;
    const sellingPrice = updateData.sellingPrice !== undefined ? Number(updateData.sellingPrice) : product.sellingPrice;

    if (sellingPrice > mrp) {
      const error = new Error('Selling price cannot exceed MRP');
      error.statusCode = 400;
      throw error;
    }

    // Auto-calculate or update discount percent
    if (updateData.discountPercent !== undefined && updateData.discountPercent !== null && updateData.discountPercent !== '') {
      updateData.discountPercent = Number(updateData.discountPercent);
    } else if (mrp > sellingPrice) {
      updateData.discountPercent = Math.round(((mrp - sellingPrice) / mrp) * 100);
    } else {
      updateData.discountPercent = 0;
    }

    // Rule: When images are edited/removed, delete removed files from Cloudinary
    if (updateData.images && Array.isArray(updateData.images)) {
      const oldImages = product.images || [];
      const newImages = updateData.images;
      const removedImages = oldImages.filter(oldUrl => !newImages.includes(oldUrl));
      if (removedImages.length > 0) {
        console.log(`[Product Update] Removing ${removedImages.length} unreferenced images from Cloudinary`);
        await CloudinaryService.deleteMultipleMedia(removedImages);
      }
    }

    const previousStock = Number(product.stock) || 0;
    Object.assign(product, updateData);
    const updated = await product.save();
    const newStock = Number(updated.stock) || 0;

      // Check if stock changed (handles back in stock, stock increase/decrease, out of stock)
      if (updateData.stock !== undefined && newStock !== previousStock) {
        const isBackInStock = previousStock === 0 && newStock > 0;
        const isOutOfStock = newStock === 0;

        let title = `Stock Updated: ${updated.name}`;
        let message = `Inventory updated for ${updated.name}: ${newStock} units available.`;

        if (isBackInStock) {
          title = `Back in Stock: ${updated.name}!`;
          message = `Good news! ${updated.name} is now back in stock (${newStock} units available). Order now!`;
        } else if (isOutOfStock) {
          title = `Out of Stock: ${updated.name}`;
          message = `${updated.name} has just sold out. Stay tuned for restock updates.`;
        } else if (newStock > previousStock) {
          title = `Fresh Stock Added: ${updated.name}`;
          message = `New batch arrived for ${updated.name}! Total ${newStock} units now available.`;
        }

        NotificationService.notifyBroadcast({
          type: 'STOCK_UPDATE',
          title,
          message,
          priority: 'NORMAL',
          data: { productId: updated._id, slug: updated.slug, stock: newStock, previousStock },
          actionUrl: `/product/${updated.slug}`
        }).catch(err => console.error('[Notification Broadcast Error]:', err.message));
      }

        // Check if low stock alert for admin
        if (updated.stock !== undefined && newStock <= 5 && newStock > 0) {
          NotificationService.notifyAdmin({
            type: 'LOW_STOCK',
            title: `Low Stock Alert: ${updated.name}`,
            message: `Warehouse stock is low: only ${newStock} units remaining for ${updated.name}.`,
            priority: 'HIGH',
            data: { productId: updated._id, stock: newStock },
            actionUrl: `/admin?tab=products`
          }).catch(err => console.error('[Notification Admin Error]:', err.message));
        }

        return updated;
      }

  static async deleteProduct(id) {
    const product = await Product.findById(id);
    if (!product) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }

    // 1. Collect all reviews for this product
    const productReviews = await Review.find({ product: id });
    const reviewMediaUrls = [];

    for (const rev of productReviews) {
      if (Array.isArray(rev.media)) {
        for (const m of rev.media) {
          const url = typeof m === 'string' ? m : m?.url;
          if (url) reviewMediaUrls.push(url);
        }
      }
      if (Array.isArray(rev.images)) {
        for (const img of rev.images) {
          if (img) reviewMediaUrls.push(img);
        }
      }
    }

    // 2. Delete all review media from Cloudinary (NOVISE_HERBAL/reviews)
    if (reviewMediaUrls.length > 0) {
      console.log(`[Product Delete] Deleting ${reviewMediaUrls.length} review media files from Cloudinary for product "${product.name}"`);
      try {
        await CloudinaryService.deleteMultipleMedia(reviewMediaUrls);
      } catch (err) {
        console.error('[Product Delete] Error deleting review media from Cloudinary:', err.message);
      }
    }

    // 3. Delete all reviews for this product from MongoDB
    if (productReviews.length > 0) {
      await Review.deleteMany({ product: id });
      console.log(`[Product Delete] Deleted ${productReviews.length} reviews for product "${product.name}"`);
    }

    // 4. Delete product gallery images & video from Cloudinary (NOVISE_HERBAL/products)
    const productMediaUrls = [...(product.images || [])];
    if (product.videoUrl) {
      productMediaUrls.push(product.videoUrl);
    }

    if (productMediaUrls.length > 0) {
      console.log(`[Product Delete] Deleting ${productMediaUrls.length} product gallery images from Cloudinary for product "${product.name}"`);
      try {
        await CloudinaryService.deleteMultipleMedia(productMediaUrls);
      } catch (err) {
        console.error('[Product Delete] Error deleting product images from Cloudinary:', err.message);
      }
    }

    // 5. Delete product document from MongoDB
    await Product.findByIdAndDelete(id);

    return {
      success: true,
      deletedReviewsCount: productReviews.length,
      deletedImagesCount: productMediaUrls.length + reviewMediaUrls.length,
      message: `Product "${product.name}" and all its photos & reviews deleted permanently.`
    };
  }

  static async getLowStockProducts() {
    const products = await Product.find({
      $expr: { $lte: ['$stock', '$lowStockThreshold'] }
    });
    return { count: products.length, products };
  }
}
