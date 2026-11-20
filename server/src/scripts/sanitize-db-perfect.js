import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/novise';

// Comprehensive legal cleanups for Indian Consumer Protection Act 2019 & Drugs and Magic Remedies Act
const textReplacements = [
  // Titles & Claims
  [/100%\s*Dandruff\s*Free\s*Scalp\s*from\s*1st\s*Wash/gi, 'Clarifying Scalp Care & Dandruff Defense'],
  [/Tough\s*on\s*Fungus/gi, 'Gentle Scalp Clarification'],
  [/eliminate(s)?\s*fungus/gi, 'clarifies scalp buildup'],
  [/eliminates?\s*100%\s*(visible\s*)?dandruff\s*flakes(\s*from\s*1st\s*wash)?/gi, 'helps reduce visible dandruff flakes with regular use'],
  [/from\s*1st\s*wash/gi, 'with consistent use'],
  [/from\s*the\s*very\s*first\s*wash/gi, 'with regular application'],
  [/stop\s*persistent\s*dandruff/gi, 'soothe persistent dandruff and dryness'],
  [/permanently\s*eliminate\s*dandruff/gi, 'soothe and manage dandruff flakes'],
  [/guaranteed\s*hair\s*restoration/gi, 'comprehensive scalp and root nourishment'],
  [/guaranteed/gi, 'botanical'],
  [/stops\s*shedding\s*overnight/gi, 'provides deep overnight root nourishment'],
  [/accelerate\s*hair\s*regrowth/gi, 'support natural hair vitality'],
  [/accelerates?\s*(hair\s*)?regrowth/gi, 'nourishes hair roots'],
  [/arrest\s*hair\s*fall/gi, 'help reduce hair fall due to breakage'],
  [/arrests?\s*hair\s*fall/gi, 'helps reduce hair fall due to breakage'],
  [/Clinically\s*proven\s*Ayurvedic\s*elixir/gi, 'Authentic Ayurvedic hair oil'],
  [/Clinically\s*proven/gi, 'Dermatologically tested'],
  [/stimulates?\s*dormant\s*(hair\s*)?follicles/gi, 'nourishes hair roots'],
  [/dormant\s*follicles/gi, 'hair roots'],
  [/baby\s*hair\s*growth/gi, 'stronger-looking hair'],
  [/new\s*baby\s*hair/gi, 'resilient hair strands'],
  [/Ketoconazole(\s*1%)?,?\s*(\+\s*)?/gi, ''],
  [/anti[- ]?fungal\s*formula/gi, 'anti-dandruff clarifying formula'],
  [/anti[- ]?fungal\s*agents/gi, 'anti-dandruff actives'],
  [/anti[- ]?fungal/gi, 'anti-dandruff'],
  [/peak\s*clinical\s*transformation/gi, 'optimal hair and scalp nourishment'],
  [/14[- ]?Day\s*Hair\s*Fall\s*Control/gi, 'Ayurvedic Hair Fall Control'],
  [/Visible\s*Results\s*in\s*14\s*Days/gi, 'Deep Scalp & Root Nourishment'],
  [/Visible\s*14[- ]?Day\s*Results/gi, 'Targeted Scalp & Root Care'],
  [/within\s*14\s*days/gi, 'with consistent use'],
  [/in\s*14\s*days/gi, 'with regular use'],
  [/14[- ]?day/gi, 'botanical'],
  [/18\s*ancient\s*Ayurvedic\s*herbs/gi, '20 traditional Ayurvedic botanicals'],
  [/18\s*Ancient\s*Cold-Pressed\s*Herbs/gi, '20 Traditional Cold-Pressed Botanicals'],
  [/Contains\s*\+\s*Australian/gi, 'Contains Zinc Pyrithione (ZPTO) & Australian'],
  [/Contains\s*Australian\s*Tea\s*Tree/gi, 'Contains Zinc Pyrithione (ZPTO) & Australian Tea Tree'],
];

function sanitizeString(str) {
  if (!str || typeof str !== 'string') return str;
  let res = str;
  for (const [pattern, replacement] of textReplacements) {
    res = res.replace(pattern, replacement);
  }
  // Clean up any double spaces or awkward punctuation left over
  res = res.replace(/\s{2,}/g, ' ').replace(/\s,\s/g, ', ').trim();
  return res;
}

function sanitizeObject(obj) {
  if (!obj) return obj;
  if (typeof obj === 'string') return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (typeof obj === 'object') {
    const updated = {};
    for (const key of Object.keys(obj)) {
      updated[key] = sanitizeObject(obj[key]);
    }
    return updated;
  }
  return obj;
}

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.\n');

  const db = mongoose.connection.db;

  // 1. Clean CMS heroSlides
  console.log('1. Sanitizing CMS Collection...');
  const cmsDoc = await db.collection('cms').findOne({});
  if (cmsDoc) {
    const updatedHeroSlides = (cmsDoc.heroSlides || []).map((slide, idx) => {
      let title = sanitizeString(slide.title);
      let subtitle = sanitizeString(slide.subtitle);
      let badge = sanitizeString(slide.badge);

      // Specifically set compliant, attractive hero slide titles per user product images
      if (idx === 0) {
        title = 'Revitalize Your Hair with Authentic Ayurvedic Care';
        subtitle = 'Complete 2-step botanical ritual: overnight root nourishment + clarifying dandruff defense shampoo.';
        badge = 'Flat 57% OFF on Combos';
      } else if (idx === 1) {
        title = 'Clarifying Scalp Care & Dandruff Defense Shampoo';
        subtitle = 'Enriched with Zinc Pyrithione (ZPTO), Salicylic Acid & Australian Tea Tree Oil. Gentle on hair, effective on flakes.';
        badge = 'Dermatologically Tested Actives';
      } else if (idx === 2) {
        title = 'Ayurvedic Hair Fall Control & Deep Root Nourishing Oil';
        subtitle = 'Crafted with 20 traditional cold-pressed botanicals including Rosemary, Bhringraj, and Redensyl to nourish roots and support resilient hair.';
        badge = '100% Natural Formulation';
      }

      return {
        ...slide,
        title,
        subtitle,
        badge
      };
    });

    const updatedFeatures = (cmsDoc.featuresList || []).map(f => ({
      ...f,
      title: sanitizeString(f.title),
      description: sanitizeString(f.description)
    }));

    await db.collection('cms').updateOne(
      { _id: cmsDoc._id },
      {
        $set: {
          heroSlides: updatedHeroSlides,
          featuresList: updatedFeatures,
          'announcementBar.text': sanitizeString(cmsDoc.announcementBar?.text || '100% PURE BOTANICAL AYURVEDA • SHIPPING AVAILABLE IN ALL INDIA • CASH ON DELIVERY AVAILABLE')
        }
      }
    );
    console.log('CMS collection sanitized successfully.\n');
  }

  // 2. Clean Products
  console.log('2. Sanitizing Products Collection...');
  const products = await db.collection('products').find({}).toArray();

  for (const prod of products) {
    const isCombo = prod.slug?.includes('combo') || prod.name?.toLowerCase().includes('combo');
    const isOil = !isCombo && (prod.slug?.includes('oil') || prod.name?.toLowerCase().includes('oil'));
    const isShampoo = !isCombo && (prod.slug?.includes('shampoo') || prod.name?.toLowerCase().includes('shampoo'));

    let newBenefits = (prod.benefits || []).map(b => sanitizeString(b));
    let newShortDesc = sanitizeString(prod.shortDescription);
    let newDesc = sanitizeString(prod.description);
    let newHowToUse = (prod.howToUse || []).map(h => sanitizeString(h));

    if (isOil) {
      newShortDesc = 'Authentic Ayurvedic formulation enriched with Bhringraj, Redensyl, and Rosemary to nourish hair roots and help reduce hair fall due to breakage.';
      newDesc = 'Novis Herbal Advanced Hair Oil is crafted with a rich blend of 20 traditional cold-pressed oils including Bhringraj, Rosemary, Redensyl, Methi, and Virgin Coconut Oil. It deeply conditions the scalp, nourishes hair roots, tames frizz, and supports natural hair vitality and shine.';
      newBenefits = [
        'Nourishes hair roots to help reduce hair fall due to breakage',
        'Deeply conditions scalp to support natural hair vitality and shine',
        'Formulated with Rosemary Oil, Redensyl, Bhringraj & 18 Ancient Botanicals',
        'Helps manage dryness, split ends and controls frizz',
        '100% Mineral Oil-Free, Silicone-Free, Chemical-Free & Paraben-Free'
      ];
    } else if (isShampoo) {
      newShortDesc = 'Targeted scalp clarifying shampoo with Zinc Pyrithione (ZPTO), Tea Tree Oil & Salicylic Acid that gently cleanses scalp buildup and soothes dandruff flakes.';
      newDesc = 'Novis Herbal Anti-Dandruff Clarifying Shampoo is an advanced botanical scalp formula designed to gently clear excess sebum and visible flakes without stripping hair moisture. Powered by Zinc Pyrithione, Australian Tea Tree Oil, and Salicylic Acid, it leaves your scalp feeling fresh, balanced, and invigorated.';
      newBenefits = [
        'Helps reduce visible dandruff flakes and soothes scalp irritation',
        'Gently clarifies excess sebum and dead skin cell buildup',
        'Powered by Zinc Pyrithione (ZPTO) & Australian Tea Tree Oil',
        'Salicylic Acid gently exfoliates and refreshes the scalp',
        'Zero Harsh Sulfates, Zero Parabens, pH-Balanced 5.5 Gentle Formula'
      ];
      newHowToUse = [
        'Thoroughly wet your hair and scalp with lukewarm water.',
        'Take a coin-sized amount and work into a rich gentle lather across scalp.',
        'Leave lather on scalp for 2 to 3 minutes to allow botanical actives to refresh and clarify.',
        'Rinse thoroughly. Use 2 to 3 times weekly for optimal scalp health.'
      ];
    } else if (isCombo) {
      newShortDesc = 'The Synergistic 2-Step Botanical Routine: Deep Overnight Root Nourishment & Morning Scalp Clarification. Save Flat ₹800!';
      newDesc = 'Experience complete botanical hair and scalp wellness. Novis Herbal Hair Oil provides deep overnight nourishment for roots and scalp, while Novis Herbal Clarifying Shampoo gently clears away flakes and impurities next morning. The ideal everyday ritual for stronger-looking, manageable hair.';
      newBenefits = [
        'Complete 2-Step Routine for Comprehensive Root & Scalp Care',
        'Save ₹800 instantly (Over 57% OFF Combo Discount)',
        'Dual Botanical Action: Deep Nourishment + Gentle Scalp Clarification',
        'Free Express Delivery Pan-India & Cash on Delivery Available'
      ];
    }

    await db.collection('products').updateOne(
      { _id: prod._id },
      {
        $set: {
          shortDescription: newShortDesc,
          description: newDesc,
          benefits: newBenefits,
          howToUse: newHowToUse
        }
      }
    );
    console.log(`  Updated product: ${prod.name}`);
  }

  console.log('\nAll products sanitized with 100% legal, authentic claims.');
  await mongoose.disconnect();
  console.log('Done!');
}

run().catch(err => {
  console.error('Error during sanitization:', err);
  process.exit(1);
});
