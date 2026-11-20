import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Marketplace from '../models/Marketplace.js';
import Product from '../models/Product.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB Atlas for Marketplace seeding');

  const products = await Product.find({}, '_id name slug sku');
  console.log(`Found ${products.length} products in catalog:`, products.map(p => ({ slug: p.slug, id: p._id })));

  const oilProduct = products.find(p => p.slug.includes('oil'));
  const shampooProduct = products.find(p => p.slug.includes('shampoo') && !p.slug.includes('combo'));
  const comboProduct = products.find(p => p.slug.includes('combo'));

  if (!oilProduct || !shampooProduct || !comboProduct) {
    console.error('Could not locate all 3 products by slug:', { oilProduct, shampooProduct, comboProduct });
  }

  // Clear existing marketplaces if needed or upsert
  await Marketplace.deleteMany({});
  console.log('Cleared existing marketplaces collection');

  const amazonPlatform = new Marketplace({
    name: 'Amazon India',
    code: 'amazon',
    tagline: 'Fast Prime delivery & secure doorstep service across India',
    brandColor: '#FF9900',
    textColor: '#111827',
    bgColor: '#FFF8ED',
    iconType: 'amazon',
    logoUrl: '',
    storeUrl: 'https://www.amazon.in',
    badgeText: 'Prime Verified',
    displayOrder: 1,
    isActive: true,
    products: [
      {
        product: comboProduct?._id,
        productName: comboProduct?.name || 'Novise Complete Hair Regrowth & Anti-Dandruff Combo Pack',
        productSlug: comboProduct?.slug || 'novise-hair-oil-shampoo-combo',
        productSku: comboProduct?.sku || 'NOV-CMB-001',
        url: 'https://amzn.in/d/0chVnDi4',
        badgeText: 'Prime Free Delivery',
        priceNote: 'Best Seller Kit',
        inStock: true,
        isActive: true,
        clicks: 0
      },
      {
        product: shampooProduct?._id,
        productName: shampooProduct?.name || 'Novise Anti-Dandruff & Scalp Clarifying Shampoo',
        productSlug: shampooProduct?.slug || 'novise-anti-dandruff-shampoo',
        productSku: shampooProduct?.sku || 'NOV-SHM-250',
        url: 'https://amzn.in/d/0chVnDi4',
        badgeText: 'Prime Available',
        priceNote: 'Anti-Dandruff Specialist',
        inStock: true,
        isActive: true,
        clicks: 0
      },
      {
        product: oilProduct?._id,
        productName: oilProduct?.name || 'Novise Ayurvedic Hair Growth Oil',
        productSlug: oilProduct?.slug || 'novise-ayurvedic-hair-growth-oil',
        productSku: oilProduct?.sku || 'NOV-OIL-200',
        url: 'https://amzn.in/d/0chVnDi4',
        badgeText: 'Prime Available',
        priceNote: 'Pure Cold Pressed',
        inStock: true,
        isActive: true,
        clicks: 0
      }
    ]
  });

  const meeshoPlatform = new Marketplace({
    name: 'Meesho',
    code: 'meesho',
    tagline: 'Direct manufacturer prices & free delivery with cash on delivery',
    brandColor: '#9E1B60',
    textColor: '#FFFFFF',
    bgColor: '#FDF2F8',
    iconType: 'meesho',
    logoUrl: '',
    storeUrl: 'https://www.meesho.com',
    badgeText: 'Lowest Price Guarantee',
    displayOrder: 2,
    isActive: true,
    products: [
      {
        product: oilProduct?._id,
        productName: oilProduct?.name || 'Novise Ayurvedic Hair Growth Oil',
        productSlug: oilProduct?.slug || 'novise-ayurvedic-hair-growth-oil',
        productSku: oilProduct?.sku || 'NOV-OIL-200',
        url: 'https://www.meesho.com/s/p/j3o1hl?utm_source=share_65abc4a8e45f0340a572b9872970274ee3b2eb8dca75c0c37609cd61da6d5498',
        badgeText: 'Free Delivery',
        priceNote: 'Trusted by 5,000+ Customers',
        inStock: true,
        isActive: true,
        clicks: 0
      },
      {
        product: comboProduct?._id,
        productName: comboProduct?.name || 'Novise Complete Hair Regrowth & Anti-Dandruff Combo Pack',
        productSlug: comboProduct?.slug || 'novise-hair-oil-shampoo-combo',
        productSku: comboProduct?.sku || 'NOV-CMB-001',
        url: 'https://www.meesho.com/s/p/j3vx41?utm_source=share_65abc4a8e45f0340a572b9872970274ee3b2eb8dca75c0c37609cd61da6d5498',
        badgeText: 'Top Selling Routine',
        priceNote: '57% OFF Bundle',
        inStock: true,
        isActive: true,
        clicks: 0
      },
      {
        product: shampooProduct?._id,
        productName: shampooProduct?.name || 'Novise Anti-Dandruff & Scalp Clarifying Shampoo',
        productSlug: shampooProduct?.slug || 'novise-anti-dandruff-shampoo',
        productSku: shampooProduct?.sku || 'NOV-SHM-250',
        url: 'https://www.meesho.com/s/p/j3hrbw?utm_source=share_65abc4a8e45f0340a572b9872970274ee3b2eb8dca75c0c37609cd61da6d5498',
        badgeText: 'Free Delivery',
        priceNote: 'Zero Harmful Chemicals',
        inStock: true,
        isActive: true,
        clicks: 0
      }
    ]
  });

  await amazonPlatform.save();
  await meeshoPlatform.save();

  console.log('Seeded Amazon & Meesho platforms and all live product links successfully!');
  await mongoose.disconnect();
}

seed().catch(console.error);

