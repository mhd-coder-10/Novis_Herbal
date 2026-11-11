import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import { AdminService } from '../services/adminService.js';

dotenv.config();

const run = async () => {
  try {
    console.log('Connecting to MongoDB database...');
    await connectDB();
    console.log('Restoring default Super Admin credentials...');
    const result = await AdminService.resetDefaultAdmin();
    console.log('SUCCESS:', result.message);
    console.log('---------------------------------------------');
    console.log('Default Admin Email:    admin@novise.in');
    console.log('Default Admin Password: Admin@Novise2026');
    console.log('---------------------------------------------');
    process.exit(0);
  } catch (err) {
    console.error('FAILED to restore admin:', err.message);
    process.exit(1);
  }
};

run();

