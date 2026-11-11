import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import CMS from '../models/CMS.js';
import Review from '../models/Review.js';

import { connectDB } from '../config/db.js';

dotenv.config();

const seedData = async () => {
  try {
    await connectDB();

    // 1. Seed Super Admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@novise.in';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@Novise2026';

    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = await User.create({
        name: process.env.ADMIN_NAME || 'Novise Administrator',
        email: adminEmail,
        password: adminPassword,
        phone: '+91 98765 43210',
        role: 'admin',
        isVerified: true
      });
      console.log(`[Seed] Super Admin created: ${adminEmail} (password: ${adminPassword})`);
    } else {
      console.log(`[Seed] Super Admin already exists: ${adminEmail}`);
    }

    // 2. Seed Categories
    const categoriesData = [
      { name: 'Hair Care & Oils', slug: 'hair-care-oils', description: 'Ayurvedic potent hair growth oils', displayOrder: 1 },
      { name: 'Scalp Shampoos', slug: 'scalp-shampoos', description: 'Anti-dandruff and clarifying scalp shampoos', displayOrder: 2 },
      { name: 'Super Combos', slug: 'super-combos', description: 'Value bundles and complete hair care kits', displayOrder: 3 }
    ];

    const categoryMap = {};
    for (const cat of categoriesData) {
      let createdCat = await Category.findOne({ slug: cat.slug });
      if (!createdCat) {
        createdCat = await Category.create(cat);
      }
      categoryMap[cat.slug] = createdCat._id;
    }
    console.log('[Seed] Categories verified.');

    // 3. Seed the 3 Hero Products
    const productsData = [
      {
        name: 'Novise Ayurvedic Hair Growth Oil',
        slug: 'novise-ayurvedic-hair-growth-oil',
        sku: 'NOV-OIL-200',
        category: categoryMap['hair-care-oils'],
        mrp: 799,
        sellingPrice: 399,
        costPrice: 120,
        stock: 250,
        lowStockThreshold: 15,
        weightGrams: 280,
        volumeText: '200 ML',
        dimensionsCm: { length: 16, width: 8, height: 6 },
        images: [
          'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361811/NOVISE_HERBAL/products/novise_hair_oil_1.jpg',
          'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361812/NOVISE_HERBAL/products/novise_hair_oil_2.jpg',
          'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361813/NOVISE_HERBAL/products/novise_hair_oil_3.jpg',
          'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361814/NOVISE_HERBAL/products/novise_hair_oil_4.jpg',
          'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361815/NOVISE_HERBAL/products/novise_hair_oil_5.jpg',
          'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361816/NOVISE_HERBAL/products/novise_hair_oil_6.jpg',
          'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361817/NOVISE_HERBAL/products/novise_hair_oil_7.jpg'
        ],
        shortDescription: 'Clinically proven Ayurvedic elixir enriched with Bhringraj, Redensyl and Rosemary to accelerate hair regrowth and arrest hair fall.',
        description: 'Novise Ayurvedic Hair Growth Oil is a potent botanical formulation crafted using 18 ancient Ayurvedic herbs cold-pressed in virgin oils. It stimulates dormant hair follicles, increases micro-circulation to scalp roots, and visibly thickens hair density within 4 weeks of consistent use.',
        benefits: [
          'Visibly controls hair fall within 14 days',
          'Stimulates dormant follicles for new baby hair growth',
          'Formulated with Rosemary Oil, Redensyl & Bhringraj',
          'Controls premature greying and deep conditions split ends',
          '100% Chemical-Free, Mineral Oil-Free, Paraben-Free'
        ],
        ingredients: [
          'Bhringraj (Eclipta Alba)',
          'Pure Rosemary Essential Oil',
          'Redensyl & Anagain Active Complex',
          'Virgin Cold Pressed Coconut Oil',
          'Methi (Fenugreek) Seeds',
          'Amla & Brahmi Extracts',
          'Castor & Jojoba Oil'
        ],
        howToUse: [
          'Section your hair and apply 5-10 ml oil directly onto scalp using the dropper.',
          'Gently massage with your fingertips in circular motions for 5 to 7 minutes.',
          'Leave overnight or at least 2 hours prior to washing for maximum deep root absorption.',
          'Use 3 times a week for 60 to 90 days for peak clinical transformation.'
        ],
        faqs: [
          { question: 'How quickly can I expect to see results?', answer: 'Most customers notice a dramatic reduction in hair fall on the comb within 14 to 21 days. Noticeable new baby hair regrowth and fuller volume appear around 6 to 8 weeks.' },
          { question: 'Is this oil sticky or greasy?', answer: 'No, it is crafted with a lightweight quick-absorbing botanical base that penetrates the scalp without heavy greasiness or stain.' }
        ],
        isFeatured: true,
        isBestSeller: true,
        isNewArrival: false,
        isCombo: false,
        averageRating: 4.9,
        numReviews: 248
      },
      {
        name: 'Novise Anti-Dandruff & Scalp Clarifying Shampoo',
        slug: 'novise-anti-dandruff-shampoo',
        sku: 'NOV-SHM-250',
        category: categoryMap['scalp-shampoos'],
        mrp: 599,
        sellingPrice: 350,
        costPrice: 95,
        stock: 200,
        lowStockThreshold: 15,
        weightGrams: 320,
        volumeText: '250 ML',
        dimensionsCm: { length: 18, width: 7, height: 7 },
        images: [
          'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361817/NOVISE_HERBAL/products/novise_shampoo_1.jpg',
          'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361818/NOVISE_HERBAL/products/novise_shampoo_2.jpg',
          'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361819/NOVISE_HERBAL/products/novise_shampoo_3.jpg',
          'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361820/NOVISE_HERBAL/products/novise_shampoo_4.jpg',
          'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361820/NOVISE_HERBAL/products/novise_shampoo_5.jpg',
          'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361821/NOVISE_HERBAL/products/novise_shampoo_6.jpg',
          'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361822/NOVISE_HERBAL/products/novise_shampoo_7.jpg'
        ],
        shortDescription: 'Targeted scalp clarifying shampoo with Ketoconazole, Tea Tree Oil & Salicylic Acid that eliminates 100% visible dandruff flakes.',
        description: 'Novise Anti-Dandruff Shampoo is an advanced dermatological anti-fungal formula designed to stop persistent dandruff and itchy scalp right from the very first wash. It purifies clogged hair follicles while preserving natural hair moisture.',
        benefits: [
          'Clinically eliminates 100% visible dandruff flakes from 1st wash',
          'Instant soothing relief from severe scalp itching and redness',
          'Contains Ketoconazole 1% + Australian Tea Tree Oil',
          'Salicylic Acid gently exfoliates dead skin cell buildup',
          'Zero Sulfates, Zero Harsh Detergents, pH balanced 5.5'
        ],
        ingredients: [
          'Ketoconazole 1%',
          'Australian Tea Tree Oil',
          'Salicylic Acid (BHA)',
          'Zinc Pyrithione (ZPTO)',
          'Neem Leaf Extract',
          'Organic Aloe Vera Gel'
        ],
        howToUse: [
          'Thoroughly wet your hair and scalp with lukewarm water.',
          'Take a coin-sized amount and work into a rich therapeutic lather across scalp.',
          'Crucial: Leave lather on scalp for 2 to 3 minutes to allow active anti-fungal agents to eliminate fungus.',
          'Rinse completely. Use 2 to 3 times weekly.'
        ],
        faqs: [
          { question: 'Will this shampoo make my hair dry?', answer: 'No! Unlike harsh anti-dandruff shampoos, Novise is infused with Aloe Vera and conditioning botanical extracts so hair stays soft and smooth.' },
          { question: 'Can I use it for colored or chemically treated hair?', answer: 'Yes, it is sulfate-free and safe for color-treated and keratin-treated hair.' }
        ],
        isFeatured: true,
        isBestSeller: true,
        isNewArrival: false,
        isCombo: false,
        averageRating: 4.8,
        numReviews: 184
      },
      {
        name: 'Novise Complete Hair Regrowth & Anti-Dandruff Combo Pack',
        slug: 'novise-hair-oil-shampoo-combo',
        sku: 'NOV-CMB-001',
        category: categoryMap['super-combos'],
        mrp: 1399,
        sellingPrice: 599,
        costPrice: 215,
        stock: 180,
        lowStockThreshold: 10,
        weightGrams: 600,
        volumeText: '200 ML (Oil) + 250 ML (Shampoo)',
        dimensionsCm: { length: 22, width: 14, height: 8 },
        images: [
          'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361823/NOVISE_HERBAL/products/novise_combo_1.jpg',
          'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361824/NOVISE_HERBAL/products/novise_combo_2.jpg',
          'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361825/NOVISE_HERBAL/products/novise_combo_3.jpg',
          'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361825/NOVISE_HERBAL/products/novise_combo_4.jpg',
          'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361826/NOVISE_HERBAL/products/novise_combo_5.jpg',
          'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361827/NOVISE_HERBAL/products/novise_combo_6.jpg'
        ],
        shortDescription: 'The Ultimate 2-Step Botanical Hair Therapy Kit: Accelerate Hair Regrowth & Permanently Eliminate Dandruff. Save Flat ₹800!',
        description: 'Experience the complete synergistic hair transformation kit. Novise Hair Oil repairs weakened roots and stops shedding overnight, while Novise Anti-Dandruff Shampoo clears scalp build-up and stimulates clean follicles in the morning. Buying together gives you our best ever value price!',
        benefits: [
          'Complete 2-Step Routine for guaranteed hair restoration',
          'Save ₹800 instantly (Over 57% OFF Combo Discount)',
          'Double action: Root Strengthening + Scalp Clarification',
          'Express Delivery & Premium Gift Packaging included'
        ],
        ingredients: [
          'Herbal Hair Oil: 18 Ayurvedic Herbs, Redensyl, Rosemary Oil',
          'Anti-Dandruff Shampoo: Ketoconazole, Tea Tree Oil, Salicylic Acid'
        ],
        howToUse: [
          'Step 1: Oil hair generously before bed with Novise Hair Growth Oil.',
          'Step 2: Wash next morning using Novise Anti-Dandruff Clarifying Shampoo.',
          'Step 3: Follow this regimen 3 times a week for luscious, dandruff-free hair.'
        ],
        faqs: [
          { question: 'Why should I buy the combo instead of single products?', answer: 'Hair cannot regrow effectively if the scalp has dandruff or excess sebum clogging the pores. The shampoo clears the foundation while the oil supplies vital nutrients—working 3x faster together!' }
        ],
        isFeatured: true,
        isBestSeller: true,
        isNewArrival: true,
        isCombo: true,
        averageRating: 5.0,
        numReviews: 312
      }
    ];

    for (const p of productsData) {
      await Product.findOneAndUpdate({ sku: p.sku }, p, { upsert: true, new: true });
    }
    console.log('[Seed] 3 Hero Products with photos and prices seeded/updated.');

    // 5. Seed Dynamic CMS
    await CMS.findOneAndUpdate(
      { key: 'global_cms' },
      {
        brandName: 'Novise',
        tagline: 'Pure Botanical Care for Majestic Hair',
        logoUrl: '/images/logo.png',
        announcementBar: {
          enabled: true,
          text: '🌿 100% PURE BOTANICAL AYURVEDA • Shipping Available in All India • CASH ON DELIVERY AVAILABLE',
          link: '/shop'
        },
        heroSlides: [
          {
            title: 'Transform Your Hair with Pure Ayurvedic Science',
            subtitle: 'Say Goodbye to Hair Fall & Stubborn Dandruff with Novis Herbal',
            buttonText: 'Shop Best Sellers',
            buttonLink: '/shop',
            imageUrl: 'https://res.cloudinary.com/ipb9jst1/image/upload/v1793361823/NOVISE_HERBAL/products/novise_combo_1.jpg',
            badge: 'Flat 57% OFF on Combos',
            isActive: true,
            order: 1
          },
          {
            title: 'Clinically Proven 14-Day Hair Fall Control',
            subtitle: 'Enriched with Rosemary, Redensyl & 18 Ancient Cold-Pressed Herbs',
            buttonText: 'Explore Hair Oil',
            buttonLink: '/product/novise-ayurvedic-hair-growth-oil',
            imageUrl: '/uploads/products/HAIR_OIL/1.jpeg',
            badge: '100% Natural Formulation',
            isActive: true,
            order: 2
          },
          {
            title: '100% Dandruff Free Scalp from 1st Wash',
            subtitle: 'Gentle on Hair, Tough on Fungus. Zero Sulfates & Parabens.',
            buttonText: 'Discover Shampoo',
            buttonLink: '/product/novise-anti-dandruff-shampoo',
            imageUrl: '/uploads/products/SHAMPOO/1.jpeg',
            badge: 'Dermatologically Tested',
            isActive: true,
            order: 3
          }
        ],
        promoBanners: [
          {
            title: 'Exclusive Combo Offer',
            description: 'Hair Oil (200ml) + Shampoo (250ml) for just ₹599 (MRP ₹1399)',
            imageUrl: '/uploads/products/COMBO/2.jpeg',
            link: '/product/novise-hair-oil-shampoo-combo',
            code: 'NOVISE10',
            isActive: true
          }
        ],
        featuresList: [
          { icon: 'Sparkles', title: '100% Ayurvedic Actives', description: 'Real botanical herbs, zero harmful synthetics or mineral oils.' },
          { icon: 'ShieldCheck', title: 'Clinically Tested', description: 'Dermatologist backed formulas with visible results in 14 days.' },
          { icon: 'Truck', title: 'Shipping All India', description: 'Dispatched within 24 hours with live Shiprocket courier tracking.' },
          { icon: 'Award', title: 'Cash on Delivery Available', description: 'Secure payments online via UPI/Cards or Pay upon Delivery.' }
        ],
        faqs: [
          { question: 'When will I receive my order?', answer: 'Orders are dispatched within 24 hours from our Mumbai fulfillment center. Metro cities typically receive delivery within 2 to 4 business days, and other regions within 4 to 6 business days.' },
          { question: 'Is Cash on Delivery (COD) supported?', answer: 'Yes! We provide Cash on Delivery (COD) across 26,000+ pincodes in India.' },
          { question: 'Can I track my shipment live?', answer: 'Absolutely! As soon as your order is packed, you will receive an AWB tracking number with real-time courier updates on our Track Order page.' }
        ],
        policies: {
          aboutUs: 'Novise was founded with a singular mission: to bring authentic, high-potency Ayurvedic botanical science into modern hair care rituals. We discard filler chemicals, artificial fragrances, and cheap mineral oils in favor of therapeutic grade herbs that nourish your scalp from within.',
          privacyPolicy: 'Your privacy is paramount to us at Novise. We only collect essential customer data to fulfill your orders safely and provide tracking notifications. We never sell your personal information to third parties.',
          termsAndConditions: 'By placing an order on Novise.in, you agree to our standard terms of purchase. Prices are inclusive of applicable taxes.',
          shippingPolicy: 'We ship orders via leading courier partners including Delhivery, Bluedart, and Xpressbees through Shiprocket. Shipping available across all India.',
          refundAndCancellation: 'All Novise authentic botanical care products are strictly non-returnable and non-replaceable once delivered for hygiene and health safety. If you receive a damaged or incorrect product, notify us within 48 hours with unboxing photos or video, and our team will review and arrange a full refund.'
        }
      },
      { upsert: true }
    );
    console.log('[Seed] CMS Content initialized.');

    // 6. Seed Sample Positive Reviews
    const comboProduct = await Product.findOne({ sku: 'NOV-CMB-001' });
    if (comboProduct && admin) {
      await Review.findOneAndUpdate(
        { title: 'Best Hair Care Investment Ever!' },
        {
          product: comboProduct._id,
          user: admin._id,
          customerEmail: 'aarav.sharma@example.com',
          customerName: 'Aarav Sharma',
          rating: 5,
          title: 'Best Hair Care Investment Ever!',
          comment: 'I was skeptical at first, but after 3 weeks of using the oil and shampoo combo, my hair shedding reduced by 80%! The shampoo doesn’t dry my hair out like Head & Shoulders used to. Total game changer.',
          isApproved: true
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    console.log('========================================================');
    console.log('✅ ALL NOVISE SEED DATA LOADED SUCCESSFULLY!');
    console.log('Admin Email:    admin@novise.in');
    console.log('Admin Password: Admin@Novise2026');
    console.log('========================================================');
    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]:', err);
    process.exit(1);
  }
};

seedData();
