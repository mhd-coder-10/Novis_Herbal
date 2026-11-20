import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

async function cleanBadge() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const cms = await db.collection('cms').findOne({});
  if (cms && cms.heroSlides) {
    const updated = cms.heroSlides.map(s => {
      const { badge, ...rest } = s;
      return rest;
    });
    await db.collection('cms').updateOne({ _id: cms._id }, { $set: { heroSlides: updated } });
    console.log('Successfully stripped badge from all heroSlides in DB!');
  }
  await mongoose.disconnect();
}
cleanBadge().catch(console.error);

