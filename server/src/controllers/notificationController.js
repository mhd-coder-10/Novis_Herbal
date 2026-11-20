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

export const sendAdminCustomNotification = async (req, res) => {
  try {
    const { targetType, targetUserId, targetEmail, title, message, priority = 'NORMAL', actionUrl = '', type } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Notification title is required' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Notification message is required' });
    }

    let result;
    if (targetType === 'BROADCAST') {
      result = await NotificationService.notifyBroadcast({
        type: type || 'ANNOUNCEMENT',
        title: title.trim(),
        message: message.trim(),
        priority,
        actionUrl: actionUrl?.trim() || '',
        sentByAdmin: true,
        adminUser: req.user?._id,
        adminEmail: req.user?.email
      });
    } else if (targetType === 'USER') {
      if (!targetUserId && !targetEmail) {
        return res.status(400).json({ success: false, message: 'Please specify customer user ID or email for direct notification' });
      }
      result = await NotificationService.notifyUser({
        userId: targetUserId || null,
        userEmail: targetEmail ? targetEmail.toLowerCase().trim() : null,
        type: type || 'DIRECT_MESSAGE',
        title: title.trim(),
        message: message.trim(),
        priority,
        actionUrl: actionUrl?.trim() || '',
        sentByAdmin: true,
        adminUser: req.user?._id,
        adminEmail: req.user?.email
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid targetType. Must be BROADCAST or USER' });
    }

    return res.status(201).json({
      success: true,
      message: targetType === 'BROADCAST'
        ? 'Broadcast notification sent live to all customers'
        : `Notification sent directly to customer (${targetEmail || targetUserId})`,
      notification: result
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdminSentHistory = async (req, res) => {
  try {
    const { tab = 'announcement', page = 1, limit = 20, search = '' } = req.query;
    const result = await NotificationService.getAdminSentHistory({
      tab,
      page: Number(page),
      limit: Number(limit),
      search
    });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAdminSentNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await NotificationService.deleteAdminSentNotification(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    return res.json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const clearAdminUserNotifications = async (req, res) => {
  try {
    const result = await NotificationService.clearAdminUserNotifications();
    return res.json({ success: true, message: 'All user & system notifications cleared successfully', ...result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getNotificationCustomerList = async (req, res) => {
  try {
    const User = (await import('../models/User.js')).default;
    const search = req.query.search ? String(req.query.search).trim() : '';
    // Match any customer/user who is not admin or staff
    const query = { role: { $nin: ['admin', 'staff'] } };
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }
    const users = await User.find(query)
      .select('_id name email role')
      .sort({ email: 1 })
      .limit(200)
      .lean();

    const customers = users.map((u) => ({
      _id: String(u._id),
      id: String(u._id),
      name: u.name || '',
      email: u.email || ''
    }));

    return res.json({ success: true, customers });
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
    let userCreatedAt = req.user?.createdAt || null;

    if (!userCreatedAt && (userId || userEmail)) {
      try {
        const User = (await import('../models/User.js')).default;
        const u = userId
          ? await User.findById(userId).select('createdAt')
          : await User.findOne({ email: userEmail.toLowerCase().trim() }).select('createdAt');
        if (u?.createdAt) {
          userCreatedAt = u.createdAt;
        }
      } catch {
        // ignore
      }
    }

    const { limit, page } = req.query;

    const result = await NotificationService.getUserNotifications({
      userId,
      userEmail,
      userCreatedAt,
      limit: limit ? Number(limit) : 50,
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

export const dismissUserNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || null;
    const userEmail = req.user?.email || req.query.email || req.body.email || null;

    await NotificationService.dismissUserNotification(id, userId, userEmail);
    return res.json({ success: true, message: 'Notification removed from your feed' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const clearAllUserNotifications = async (req, res) => {
  try {
    const userId = req.user?._id || null;
    const userEmail = req.user?.email || req.query.email || req.body.email || null;

    await NotificationService.clearAllUserNotifications(userId, userEmail);
    return res.json({ success: true, message: 'All notifications cleared from your feed' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

