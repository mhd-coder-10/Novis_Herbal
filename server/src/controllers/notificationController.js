import { NotificationService } from '../services/notificationService.js';

// ==========================================
// ADMIN CONTROLLERS
// ==========================================

export const getAdminNotifications = async (req, res) => {
  try {
    const { limit, page, unreadOnly } = req.query;
    const result = await NotificationService.getAdminNotifications({
      limit: limit ? Number(limit) : 30,
      page: page ? Number(page) : 1,
      unreadOnly: unreadOnly === 'true'
    });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const markAdminNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await NotificationService.markAdminNotificationAsRead(id, req.user?._id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    return res.json({ success: true, notification });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const markAllAdminNotificationsAsRead = async (req, res) => {
  try {
    await NotificationService.markAllAdminNotificationsAsRead(req.user?._id);
    return res.json({ success: true, message: 'All admin notifications marked as read' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const clearAdminNotifications = async (req, res) => {
  try {
    await NotificationService.clearAdminNotifications();
    return res.json({ success: true, message: 'Read admin notifications cleared' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// CUSTOMER / USER CONTROLLERS
// ==========================================

export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user?._id || null;
    const userEmail = req.user?.email || req.query.email || null;
    const { limit, page } = req.query;

    const result = await NotificationService.getUserNotifications({
      userId,
      userEmail,
      limit: limit ? Number(limit) : 30,
      page: page ? Number(page) : 1
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const markUserNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || null;
    const userEmail = req.user?.email || req.body.email || null;

    await NotificationService.markUserNotificationAsRead(id, userId, userEmail);
    return res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const markAllUserNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user?._id || null;
    const userEmail = req.user?.email || req.body.email || null;

    if (!userId && !userEmail) {
      return res.status(400).json({ success: false, message: 'User identifier required' });
    }

    await NotificationService.markAllUserNotificationsAsRead(userId, userEmail);
    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

