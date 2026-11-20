import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './config/db.js';
import { AdminService } from './services/adminService.js';
import { NotificationService } from './services/notificationService.js';

// Load environment variables - updated for marketplaces
dotenv.config();

// Connect to database & guard Super Admin account
await connectDB();
try {
  await AdminService.ensureDefaultAdmin();
} catch (err) {
  console.error('[Admin Guard Warning]:', err.message);
}

// Background auto-cleanup of user notifications older than retention days (default: 5 days)
NotificationService.cleanupOldUserNotifications().catch(() => { });
setInterval(() => {
  NotificationService.cleanupOldUserNotifications().catch(() => { });
}, 60 * 60 * 1000);

// Start HTTP server
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use by another process.`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
});
