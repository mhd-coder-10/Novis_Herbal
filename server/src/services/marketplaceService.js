import mongoose from 'mongoose';
import Marketplace from '../models/Marketplace.js';
import Product from '../models/Product.js';

export class MarketplaceService {
  /**
   * Get all marketplaces and their product links for Admin management
   */
  static async getAllAdmin() {
    const marketplaces = await Marketplace.find()
      .populate('products.product', 'name slug sku images sellingPrice mrp')
      .sort({ displayOrder: 1, createdAt: 1 });

    const totalPlatforms = marketplaces.length;
    const activePlatforms = marketplaces.filter(m => m.isActive).length;
    const totalLinks = marketplaces.reduce((sum, m) => sum + m.products.length, 0);
    const activeLinks = marketplaces.reduce(
      (sum, m) => sum + m.products.filter(p => p.isActive).length,
      0
    );
    const totalClicks = marketplaces.reduce(
      (sum, m) => sum + m.products.reduce((pSum, p) => pSum + (p.clicks || 0), 0),
      0
    );

    return {
      success: true,
      stats: {
        totalPlatforms,
        activePlatforms,
        totalLinks,
        activeLinks,
        totalClicks
      },
      marketplaces
    };
  }

  /**
   * Get active marketplaces and their active product links for Storefront display
   */
  static async getPublic() {
    const marketplaces = await Marketplace.find({ isActive: true })
      .select('name code tagline brandColor textColor bgColor iconType logoUrl storeUrl badgeText displayOrder products')
      .populate('products.product', 'name slug sku images sellingPrice mrp')
      .sort({ displayOrder: 1, createdAt: 1 });

    // Filter to only active product links
    const sanitized = marketplaces.map(m => {
      const mObj = m.toObject();
      mObj.products = (mObj.products || []).filter(p => p.isActive);
      return mObj;
    });

    return {
      success: true,
      marketplaces: sanitized
    };
  }

  /**
   * Get active marketplace links for a specific product by ID or Slug
   */
  static async getByProduct(slugOrId) {
    const query = { isActive: true };
    const marketplaces = await Marketplace.find(query)
      .select('name code tagline brandColor textColor bgColor iconType logoUrl storeUrl badgeText products')
      .sort({ displayOrder: 1 });

    const productLinks = [];

    for (const m of marketplaces) {
      const match = m.products.find(
        p => p.isActive && (p.product?.toString() === slugOrId || p.productSlug === slugOrId)
      );
      if (match) {
        productLinks.push({
          marketplaceId: m._id,
          marketplaceName: m.name,
          marketplaceCode: m.code,
          brandColor: m.brandColor,
          textColor: m.textColor,
          bgColor: m.bgColor,
          iconType: m.iconType,
          logoUrl: m.logoUrl,
          linkId: match._id,
          url: match.url,
          badgeText: match.badgeText || m.badgeText || 'Official Partner',
          priceNote: match.priceNote,
          inStock: match.inStock
        });
      }
    }

    return {
      success: true,
      links: productLinks
    };
  }

  /**
   * Create a new marketplace platform (e.g. Flipkart, Blinkit, Nykaa)
   */
  static async createMarketplace(data) {
    const { name, code, tagline, brandColor, textColor, bgColor, iconType, logoUrl, storeUrl, badgeText, displayOrder, isActive } = data;

    if (!name || !name.trim()) {
      throw new Error('Marketplace name is required');
    }

    const cleanCode = (code || name).toLowerCase().replace(/[^a-z0-9_-]/g, '-').trim();

    const existing = await Marketplace.findOne({ code: cleanCode });
    if (existing) {
      throw new Error(`A marketplace with code "${cleanCode}" already exists.`);
    }

    const marketplace = await Marketplace.create({
      name: name.trim(),
      code: cleanCode,
      tagline: tagline || '',
      brandColor: brandColor || '#07190F',
      textColor: textColor || '#FFFFFF',
      bgColor: bgColor || '#F9FAFB',
      iconType: iconType || 'default',
      logoUrl: logoUrl || '',
      storeUrl: storeUrl || '',
      badgeText: badgeText || 'Verified Partner',
      displayOrder: typeof displayOrder === 'number' ? displayOrder : 0,
      isActive: typeof isActive === 'boolean' ? isActive : true,
      products: []
    });

    return {
      success: true,
      message: `${marketplace.name} platform added successfully`,
      marketplace
    };
  }

  /**
   * Update a marketplace platform
   */
  static async updateMarketplace(id, data) {
    const marketplace = await Marketplace.findById(id);
    if (!marketplace) {
      throw new Error('Marketplace not found');
    }

    const updatable = ['name', 'tagline', 'brandColor', 'textColor', 'bgColor', 'iconType', 'logoUrl', 'storeUrl', 'badgeText', 'displayOrder', 'isActive'];
    updatable.forEach(field => {
      if (data[field] !== undefined) {
        marketplace[field] = data[field];
      }
    });

    await marketplace.save();

    return {
      success: true,
      message: `${marketplace.name} platform updated successfully`,
      marketplace
    };
  }

  /**
   * Delete a marketplace platform
   */
  static async deleteMarketplace(id) {
    const marketplace = await Marketplace.findById(id);
    if (!marketplace) {
      throw new Error('Marketplace not found');
    }

    await Marketplace.findByIdAndDelete(id);

    return {
      success: true,
      message: `${marketplace.name} platform and its associated links were deleted`
    };
  }

  /**
   * Add or update a product link on a marketplace
   */
  static async addOrUpdateProductLink(marketplaceId, data) {
    const marketplace = await Marketplace.findById(marketplaceId);
    if (!marketplace) {
      throw new Error('Marketplace not found');
    }

    const { productId, productName, url, imageUrl, badgeText, priceNote, inStock, isActive, linkId } = data;

    if (!url || !url.trim()) {
      throw new Error('Product marketplace URL is required');
    }

    let resolvedName = (productName || '').trim();
    let resolvedSlug = '';
    let resolvedSku = '';
    let resolvedProductId = null;

    if (productId && mongoose.Types.ObjectId.isValid(productId)) {
      const product = await Product.findById(productId);
      if (product) {
        resolvedProductId = product._id;
        resolvedName = resolvedName || product.name;
        resolvedSlug = product.slug;
        resolvedSku = product.sku || '';
      }
    }

    if (!resolvedName) {
      resolvedName = 'Marketplace Product Listing';
    }

    if (!resolvedSlug) {
      resolvedSlug = resolvedName.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
    }

    // Check if updating existing link
    if (linkId) {
      const link = marketplace.products.id(linkId);
      if (!link) {
        throw new Error('Product link not found');
      }
      if (resolvedProductId) link.product = resolvedProductId;
      link.productName = resolvedName;
      if (resolvedSlug) link.productSlug = resolvedSlug;
      if (resolvedSku) link.productSku = resolvedSku;
      link.url = url.trim();
      if (imageUrl !== undefined) link.imageUrl = imageUrl.trim();
      if (badgeText !== undefined) link.badgeText = badgeText.trim();
      if (priceNote !== undefined) link.priceNote = priceNote.trim();
      if (inStock !== undefined) link.inStock = inStock;
      if (isActive !== undefined) link.isActive = isActive;
    } else {
      marketplace.products.push({
        product: resolvedProductId || undefined,
        productName: resolvedName,
        productSlug: resolvedSlug,
        productSku: resolvedSku,
        imageUrl: imageUrl ? imageUrl.trim() : '',
        url: url.trim(),
        badgeText: badgeText ? badgeText.trim() : (marketplace.badgeText || 'Official Partner'),
        priceNote: priceNote ? priceNote.trim() : '',
        inStock: inStock !== undefined ? inStock : true,
        isActive: isActive !== undefined ? isActive : true,
        clicks: 0
      });
    }

    await marketplace.save();

    return {
      success: true,
      message: 'Marketplace product link saved successfully',
      marketplace
    };
  }

  /**
   * Remove a product link from a marketplace
   */
  static async removeProductLink(marketplaceId, linkId) {
    const marketplace = await Marketplace.findById(marketplaceId);
    if (!marketplace) {
      throw new Error('Marketplace not found');
    }

    marketplace.products = marketplace.products.filter(
      p => p._id.toString() !== linkId.toString()
    );

    await marketplace.save();

    return {
      success: true,
      message: 'Product link removed successfully',
      marketplace
    };
  }

  /**
   * Track outbound click on a marketplace link
   */
  static async trackClick(marketplaceId, linkId) {
    const marketplace = await Marketplace.findById(marketplaceId);
    if (!marketplace) return { success: false };

    const link = marketplace.products.id(linkId);
    if (link) {
      link.clicks = (link.clicks || 0) + 1;
      link.lastClickedAt = new Date();
      await marketplace.save();
    }

    return { success: true };
  }
}

