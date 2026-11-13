import Notification from '../models/Notification.js';
import { realtimeService } from './realtimeService.js';

export class NotificationService {
  /**
   * Send notification to Store Administrators (Owner & Staff)
   */
  static async notifyAdmin({ type, title, message, data = {}, priority = 'NORMAL', actionUrl = '' }) {
    try {
      const notification = await Notification.create({
        recipientType: 'ADMIN',
        type,
        title,
        message,
        data,
        priority,
        actionUrl,
        isRead: false
      });

      // Realtime push to admin panel
      realtimeService.broadcast('NOTIFICATION_ADMIN', notification.toObject());
      return notification;
    } catch (err) {
      console.error('[NotificationService] notifyAdmin error:', err.message);
      return null;
    }
  }

  /**
   * Send notification to a specific customer/user
   */
  static async notifyUser({ userId, userEmail, type, title, message, data = {}, priority = 'NORMAL', actionUrl = '' }) {
    try {
      const notification = await Notification.create({
        recipientType: 'USER',
        user: userId || null,
        userEmail: userEmail ? userEmail.toLowerCase().trim() : null,
        type,
        title,
        message,
        data,
        priority,
        actionUrl,
        isRead: false
      });

      // Realtime push
      realtimeService.broadcast('NOTIFICATION_USER', {
        ...notification.toObject(),
        targetUserId: userId ? String(userId) : null,
        targetEmail: userEmail ? userEmail.toLowerCase().trim() : null
      });

      return notification;
    } catch (err) {
      console.error('[NotificationService] notifyUser error:', err.message);
      return null;
    }
  }

  /**
   * Send store-wide broadcast notification to all customers
   */
  static async notifyBroadcast({ type, title, message, data = {}, priority = 'NORMAL', actionUrl = '' }) {
    try {
      const notification = await Notification.create({
        recipientType: 'BROADCAST',
        type,
        title,
        message,
        data,
        priority,
        actionUrl,
        isRead: false
      });

      // Realtime push
      realtimeService.broadcast('NOTIFICATION_BROADCAST', notification.toObject());
      return notification;
    } catch (err) {
      console.error('[NotificationService] notifyBroadcast error:', err.message);
      return null;
    }
  }

  /**
   * Fetch admin notifications
   */
  static async getAdminNotifications({ limit = 30, page = 1, unreadOnly = false } = {}) {
    const query = { recipientType: 'ADMIN' };
    if (unreadOnly) {
      query.isRead = false;
    }

    const skip = (Math.max(1, page) - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipientType: 'ADMIN', isRead: false })
    ]);

    return {
      success: true,
      notifications,
      total,
      unreadCount,
      page: Number(page),
      pages: Math.ceil(total / limit)
    };
  }

  /**
   * Mark single admin notification as read
   */
  static async markAdminNotificationAsRead(id, adminUserId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipientType: 'ADMIN' },
      {
        $set: { isRead: true, readAt: new Date() },
        $addToSet: { readBy: { userId: adminUserId, readAt: new Date() } }
      },
      { new: true }
    );

    if (notification) {
      realtimeService.broadcast('NOTIFICATION_ADMIN_UPDATED', { id: String(id), isRead: true });
    }

    return notification;
  }

  /**
   * Mark all admin notifications as read
   */
  static async markAllAdminNotificationsAsRead(adminUserId) {
    await Notification.updateMany(
      { recipientType: 'ADMIN', isRead: false },
      {
        $set: { isRead: true, readAt: new Date() },
        $addToSet: { readBy: { userId: adminUserId, readAt: new Date() } }
      }
    );

    realtimeService.broadcast('NOTIFICATION_ADMIN_ALL_READ', { adminUserId });
    return { success: true };
  }

  /**
   * Clear all read admin notifications
   */
  static async clearAdminNotifications() {
    await Notification.deleteMany({ recipientType: 'ADMIN', isRead: true });
    realtimeService.broadcast('NOTIFICATION_ADMIN_CLEARED');
    return { success: true };
  }

  /**
   * Fetch customer notifications (user specific + broadcast)
   */
  static async getUserNotifications({ userId = null, userEmail = null, limit = 30, page = 1 } = {}) {
    const conditions = [{ recipientType: 'BROADCAST' }];

    if (userId) {
      conditions.push({ recipientType: 'USER', user: userId });
    }
    if (userEmail) {
      conditions.push({ recipientType: 'USER', userEmail: userEmail.toLowerCase().trim() });
    }

    const query = { $or: conditions };
    const skip = (Math.max(1, page) - 1) * limit;

    const [items, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query)
    ]);

    // Format isRead state according to user context
    const notifications = items.map((n) => {
      let isReadForUser = n.isRead;
      if (n.recipientType === 'BROADCAST' && userId) {
        isReadForUser = (n.readBy || []).some(
          (r) => String(r.userId) === String(userId)
        );
      }
      return {
        ...n,
        isRead: Boolean(isReadForUser)
      };
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return {
      success: true,
      notifications,
      total,
      unreadCount,
      page: Number(page),
      pages: Math.ceil(total / limit)
    };
  }

  /**
   * Mark single user notification as read
   */
  static async markUserNotificationAsRead(id, userId, userEmail) {
    const notification = await Notification.findById(id);
    if (!notification) return null;

    if (notification.recipientType === 'BROADCAST') {
      if (userId) {
        await Notification.findByIdAndUpdate(id, {
          $addToSet: { readBy: { userId, readAt: new Date() } }
        });
      }
    } else if (notification.recipientType === 'USER') {
      notification.isRead = true;
      notification.readAt = new Date();
      if (userId) {
        notification.readBy.push({ userId, readAt: new Date() });
      }
      await notification.save();
    }

    return { success: true };
  }

  /**
   * Mark all user notifications as read
   */
  static async markAllUserNotificationsAsRead(userId, userEmail) {
    const conditions = [];
    if (userId) conditions.push({ recipientType: 'USER', user: userId });
    if (userEmail) conditions.push({ recipientType: 'USER', userEmail: userEmail.toLowerCase().trim() });

    if (conditions.length > 0) {
      await Notification.updateMany(
        { $or: conditions, isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
      );
    }

    // For broadcasts: add userId to readBy
    if (userId) {
      await Notification.updateMany(
        { recipientType: 'BROADCAST', 'readBy.userId': { $ne: userId } },
        { $addToSet: { readBy: { userId, readAt: new Date() } } }
      );
    }

    return { success: true };
  }
}

