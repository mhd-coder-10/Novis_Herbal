/**
 * One-time migration script to remove illegal "14-Day", "guaranteed", and false medical claims
 * from CMS heroSlides, product benefits, shortDescription, and description fields in MongoDB.
 *
 * Run: node server/src/scripts/sanitize-content.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/novise';

// ─── Replacement Map ────────────────────────────────────────
const textReplacements = [
  // Titles
  [/Clinically (Proven|Formulated) 14[- ]?Day Hair ?Fall Control( Oil)?/gi, 'Ayurvedic Hair Fall Control & Deep Root Nourishing Oil'],
  [/14[- ]?Day Hair ?Fall Control/gi, 'Ayurvedic Hair Fall Control'],
  [/Visible Results in 14 Days/gi, 'Deep Scalp & Root Nourishment'],
  [/Visible 14[- ]?Day Results/gi, 'Targeted Scalp & Root Care'],
  [/Clinically Proven Results/gi, 'Dermatologically Tested Actives'],

  // Benefits / highlights
  [/Visibly controls hair ?fall within 14 days/gi, 'Nourishes hair roots to help reduce hair fall due to breakage'],
  [/Stops hair ?fall in 14 days/gi, 'Helps reduce hair fall due to breakage with consistent use'],
  [/Arrests? hair ?fall in 14 days/gi, 'Helps reduce hair fall due to breakage with consistent use'],
  [/controls hair ?fall in 14 days/gi, 'Helps reduce hair fall due to breakage with consistent use'],
  [/Stimulates dormant follicles for new baby hair growth/gi, 'Nourishes dormant roots to support natural hair vitality'],
  [/Awakens? dormant follicles/gi, 'Nourishes dormant roots'],
  [/boost new dense hair growth/gi, 'support natural hair density and strength'],
  [/permanently clears? fungus/gi, 'helps clarify scalp buildup'],
  [/clears? 100% flakes/gi, 'helps reduce visible flakes'],
  [/3x faster results/gi, 'synergistic 2-step care'],
  [/Guaranteed (delivery|results?)/gi, 'Estimated $1'],
  [/stops hair ?fall/gi, 'helps reduce hair fall due to breakage'],

  // Subtitle / descriptions
  [/anti[- ]?fungal (clarifying |)?formula combining Ketoconazole 1%/gi, 'anti-dandruff formula combining Zinc Pyrithione'],
  [/anti[- ]?fungal clarifying shampoo/gi, 'anti-dandruff clarifying shampoo'],
  [/anti[- ]?fungal/gi, 'anti-dandruff'],
  [/Ketoconazole 1%,? /gi, ''],

  // Generic catch-all for any remaining "14 day" references
  [/in 14 days/gi, 'with regular use'],
  [/within 14 days/gi, 'with consistent use'],
  [/14[- ]?day/gi, 'botanical'],
];

function sanitize(text) {
  if (!text || typeof text !== 'string') return text;
  let result = text;
  for (const [pattern, replacement] of textReplacements) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

async function run() {
  console.log('🔗 Connecting to MongoDB:', MONGO_URI.replace(/\/\/.*@/, '//***@'));
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected.\n');

  const db = mongoose.connection.db;

  // ─── 1. Fix CMS heroSlides ───────────────────────────────
  console.log('── Fixing CMS heroSlides ──');
  const cmsCollection = db.collection('cms');
  const cmsDoc = await cmsCollection.findOne({});
  if (cmsDoc && cmsDoc.heroSlides && cmsDoc.heroSlides.length > 0) {
    let changed = false;
    const updated = cmsDoc.heroSlides.map((slide) => {
      const newTitle = sanitize(slide.title);
      const newSubtitle = sanitize(slide.subtitle);
      const newBadge = sanitize(slide.badge);
      if (newTitle !== slide.title || newSubtitle !== slide.subtitle || newBadge !== slide.badge) {
        changed = true;
        console.log(`  ✏️  Slide "${slide.title?.substring(0, 50)}..." → "${newTitle?.substring(0, 50)}..."`);
      }
      return { ...slide, title: newTitle, subtitle: newSubtitle, badge: newBadge };
    });
    if (changed) {
      await cmsCollection.updateOne({ _id: cmsDoc._id }, { $set: { heroSlides: updated } });
      console.log('  ✅ CMS heroSlides updated.\n');
    } else {
      console.log('  ℹ️  No illegal claims found in heroSlides.\n');
    }
  } else {
    console.log('  ℹ️  No CMS heroSlides found.\n');
  }

  // ─── 2. Fix CMS announcementBar ─────────────────────────
  if (cmsDoc && cmsDoc.announcementBar?.text) {
    const newText = sanitize(cmsDoc.announcementBar.text);
    if (newText !== cmsDoc.announcementBar.text) {
      await cmsCollection.updateOne({ _id: cmsDoc._id }, { $set: { 'announcementBar.text': newText } });
      console.log('  ✅ Announcement bar text updated.\n');
    }
  }

  // ─── 3. Fix all Products ────────────────────────────────
  console.log('── Fixing Product documents ──');
  const productsCollection = db.collection('products');
  const allProducts = await productsCollection.find({}).toArray();
  let prodCount = 0;

  for (const prod of allProducts) {
    const updates = {};
    let thisChanged = false;

    // name
    const newName = sanitize(prod.name);
    if (newName !== prod.name) {
      updates.name = newName;
      thisChanged = true;
    }

    // shortDescription
    const newShort = sanitize(prod.shortDescription);
    if (newShort !== prod.shortDescription) {
      updates.shortDescription = newShort;
      thisChanged = true;
    }

    // description
    const newDesc = sanitize(prod.description);
    if (newDesc !== prod.description) {
      updates.description = newDesc;
      thisChanged = true;
    }

    // benefits array
    if (prod.benefits && Array.isArray(prod.benefits)) {
      const newBenefits = prod.benefits.map(sanitize);
      const benefitsChanged = newBenefits.some((b, i) => b !== prod.benefits[i]);
      if (benefitsChanged) {
        updates.benefits = newBenefits;
        thisChanged = true;
      }
    }

    // howToUse array
    if (prod.howToUse && Array.isArray(prod.howToUse)) {
      const newHow = prod.howToUse.map(sanitize);
      const howChanged = newHow.some((h, i) => h !== prod.howToUse[i]);
      if (howChanged) {
        updates.howToUse = newHow;
        thisChanged = true;
      }
    }

    // FAQs
    if (prod.faqs && Array.isArray(prod.faqs)) {
      const newFaqs = prod.faqs.map(faq => ({
        ...faq,
        question: sanitize(faq.question),
        answer: sanitize(faq.answer)
      }));
      const faqChanged = newFaqs.some((f, i) =>
        f.question !== prod.faqs[i].question || f.answer !== prod.faqs[i].answer
      );
      if (faqChanged) {
        updates.faqs = newFaqs;
        thisChanged = true;
      }
    }

    if (thisChanged) {
      await productsCollection.updateOne({ _id: prod._id }, { $set: updates });
      console.log(`  ✏️  Product "${prod.name?.substring(0, 40)}" updated.`);
      prodCount++;
    }
  }

  if (prodCount > 0) {
    console.log(`  ✅ ${prodCount} product(s) sanitized.\n`);
  } else {
    console.log('  ℹ️  No illegal claims found in products.\n');
  }

  // ─── 4. Fix CMS featuresList (Why Novise section) ─────────
  if (cmsDoc && cmsDoc.featuresList && cmsDoc.featuresList.length > 0) {
    let fChanged = false;
    const newFeatures = cmsDoc.featuresList.map((f) => {
      const newTitle = sanitize(f.title);
      const newDesc = sanitize(f.description);
      if (newTitle !== f.title || newDesc !== f.description) fChanged = true;
      return { ...f, title: newTitle, description: newDesc };
    });
    if (fChanged) {
      await cmsCollection.updateOne({ _id: cmsDoc._id }, { $set: { featuresList: newFeatures } });
      console.log('  ✅ CMS featuresList updated.\n');
    }
  }

  // ─── 5. Fix CMS FAQs ──────────────────────────────────────
  if (cmsDoc && cmsDoc.faqs && cmsDoc.faqs.length > 0) {
    let faqChanged = false;
    const newFaqs = cmsDoc.faqs.map((faq) => {
      const newQ = sanitize(faq.question);
      const newA = sanitize(faq.answer);
      if (newQ !== faq.question || newA !== faq.answer) faqChanged = true;
      return { ...faq, question: newQ, answer: newA };
    });
    if (faqChanged) {
      await cmsCollection.updateOne({ _id: cmsDoc._id }, { $set: { faqs: newFaqs } });
      console.log('  ✅ CMS FAQs updated.\n');
    }
  }

  console.log('══════════════════════════════════════════════════');
  console.log('🎉 Database content sanitization complete!');
  console.log('   All "14-Day", "Guaranteed", and false medical');
  console.log('   claims have been replaced with legally compliant');
  console.log('   botanical benefit language.');
  console.log('══════════════════════════════════════════════════');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Sanitization failed:', err);
  process.exit(1);
});

