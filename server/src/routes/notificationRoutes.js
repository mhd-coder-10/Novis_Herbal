import express from 'express';
import {
  getAdminNotifications,
  markAdminNotificationAsRead,
  markAllAdminNotificationsAsRead,
  clearAdminNotifications,
  getUserNotifications,
  markUserNotificationAsRead,
  markAllUserNotificationsAsRead
} from '../controllers/notificationController.js';
import { protect, authorize, optionalProtect } from '../middleware/auth.js';

const router = express.Router();

// ==========================================
// ADMIN NOTIFICATION ROUTES
// ==========================================
router.get('/admin', protect, authorize('admin', 'staff'), getAdminNotifications);
router.patch('/admin/:id/read', protect, authorize('admin', 'staff'), markAdminNotificationAsRead);
router.post('/admin/read-all', protect, authorize('admin', 'staff'), markAllAdminNotificationsAsRead);
router.delete('/admin/clear-all', protect, authorize('admin', 'staff'), clearAdminNotifications);

// ==========================================
// CUSTOMER / USER NOTIFICATION ROUTES
// ==========================================
router.get('/user', optionalProtect, getUserNotifications);
router.patch('/user/:id/read', optionalProtect, markUserNotificationAsRead);
router.post('/user/read-all', optionalProtect, markAllUserNotificationsAsRead);

export default router;

