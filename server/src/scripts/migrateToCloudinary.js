import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

import { v2 as cloudinary } from 'cloudinary';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Product from '../models/Product.js';
import CMS from '../models/CMS.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

async function uploadFile(filePath, publicId) {
  console.log(`Uploading ${filePath} as ${publicId}...`);
  const result = await cloudinary.uploader.upload(filePath, {
    folder: 'NOVISE_HERBAL/products',
    public_id: publicId,
    overwrite: true,
    resource_type: 'image'
  });
  console.log(`Uploaded: ${result.secure_url}`);
  return result.secure_url;
}

async function runMigration() {
  try {
    await connectDB();
    console.log('[Migration] Connected to MongoDB');

    const basePath = path.resolve('../Novise_prd');
    
    // 1. Upload Hair Oil Images
    const hairOilUrls = [];
    for (let i = 1; i <= 7; i++) {
      const file = path.join(basePath, 'HAIR_OIL', `${i}.jpeg`);
      if (fs.existsSync(file)) {
        const url = await uploadFile(file, `novise_hair_oil_${i}`);
        hairOilUrls.push(url);
      }
    }

    // 2. Upload Shampoo Images
    const shampooUrls = [];
    for (let i = 1; i <= 7; i++) {
      const file = path.join(basePath, 'SHAMPOO', `${i}.jpeg`);
      if (fs.existsSync(file)) {
        const url = await uploadFile(file, `novise_shampoo_${i}`);
        shampooUrls.push(url);
      }
    }

    // 3. Upload Combo Images
    const comboUrls = [];
    for (let i = 1; i <= 6; i++) {
      const file = path.join(basePath, 'COMBO', `${i}.jpeg`);
      if (fs.existsSync(file)) {
        const url = await uploadFile(file, `novise_combo_${i}`);
        comboUrls.push(url);
      }
    }

    const mapping = {
      hairOil: hairOilUrls,
      shampoo: shampooUrls,
      combo: comboUrls
    };

    fs.writeFileSync(path.resolve('src/config/cloudinary_migrated_urls.json'), JSON.stringify(mapping, null, 2));
    console.log('[Migration] Saved mapping to src/config/cloudinary_migrated_urls.json');

    // 4. Update MongoDB Products
    console.log('[Migration] Updating MongoDB Products...');
    if (hairOilUrls.length > 0) {
      const p1 = await Product.findOneAndUpdate(
        { slug: 'novise-ayurvedic-hair-growth-oil' },
        { images: hairOilUrls },
        { new: true }
      );
      console.log(`Updated Hair Oil: ${p1 ? p1.name : 'Not Found'}`);
    }

    if (shampooUrls.length > 0) {
      const p2 = await Product.findOneAndUpdate(
        { slug: 'novise-anti-dandruff-shampoo' },
        { images: shampooUrls },
        { new: true }
      );
      console.log(`Updated Shampoo: ${p2 ? p2.name : 'Not Found'}`);
    }

    if (comboUrls.length > 0) {
      const p3 = await Product.findOneAndUpdate(
        { slug: 'novise-hair-oil-shampoo-combo' },
        { images: comboUrls },
        { new: true }
      );
      console.log(`Updated Combo: ${p3 ? p3.name : 'Not Found'}`);
    }

    // 5. Update CMS Hero Slides in MongoDB
    console.log('[Migration] Updating CMS Hero Slides...');
    const cms = await CMS.findOne({ key: 'global_cms' });
    if (cms && cms.heroSlides && cms.heroSlides.length > 0 && comboUrls.length > 0) {
      cms.heroSlides[0].imageUrl = comboUrls[0];
      await cms.save();
      console.log('Updated CMS hero slides');
    }

    console.log('[Migration] Migration to Cloudinary completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[Migration Error]:', error);
    process.exit(1);
  }
}

runMigration();

