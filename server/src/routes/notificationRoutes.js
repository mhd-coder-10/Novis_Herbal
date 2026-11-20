import express from 'express';
import {
  getAdminNotifications,
  markAdminNotificationAsRead,
  markAllAdminNotificationsAsRead,
  clearAdminNotifications,
  sendAdminCustomNotification,
  getNotificationCustomerList,
  getAdminSentHistory,
  deleteAdminSentNotification,
  clearAdminUserNotifications,
  getUserNotifications,
  markUserNotificationAsRead,
  markAllUserNotificationsAsRead,
  dismissUserNotification,
  clearAllUserNotifications
} from '../controllers/notificationController.js';
import { protect, authorize, optionalProtect } from '../middleware/auth.js';

const router = express.Router();

// ==========================================
// ADMIN NOTIFICATION ROUTES
// ==========================================
router.get('/admin', protect, authorize('admin', 'staff'), getAdminNotifications);
router.post('/admin/send', protect, authorize('admin', 'staff'), sendAdminCustomNotification);
router.get('/admin/customers', protect, authorize('admin', 'staff'), getNotificationCustomerList);
router.get('/admin/sent-history', protect, authorize('admin', 'staff'), getAdminSentHistory);
router.delete('/admin/sent/user-notifications/clear-all', protect, authorize('admin', 'staff'), clearAdminUserNotifications);
router.delete('/admin/sent/:id', protect, authorize('admin', 'staff'), deleteAdminSentNotification);
router.patch('/admin/:id/read', protect, authorize('admin', 'staff'), markAdminNotificationAsRead);
router.post('/admin/read-all', protect, authorize('admin', 'staff'), markAllAdminNotificationsAsRead);
router.delete('/admin/clear-all', protect, authorize('admin', 'staff'), clearAdminNotifications);

// ==========================================
// CUSTOMER / USER NOTIFICATION ROUTES
// ==========================================
router.get('/user', optionalProtect, getUserNotifications);
router.patch('/user/:id/read', optionalProtect, markUserNotificationAsRead);
router.post('/user/read-all', optionalProtect, markAllUserNotificationsAsRead);
router.delete('/user/clear-all', optionalProtect, clearAllUserNotifications);
router.delete('/user/:id', optionalProtect, dismissUserNotification);

export default router;

