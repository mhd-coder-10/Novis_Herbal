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
  static async notifyUser({
    userId,
    userEmail,
    type,
    title,
    message,
    data = {},
    priority = 'NORMAL',
    actionUrl = '',
    sentByAdmin = false,
    adminUser = null,
    adminEmail = null
  }) {
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
        sentByAdmin: Boolean(sentByAdmin),
        adminUser: adminUser || null,
        adminEmail: adminEmail || null,
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
  static async notifyBroadcast({
    type,
    title,
    message,
    data = {},
    priority = 'NORMAL',
    actionUrl = '',
    sentByAdmin = false,
    adminUser = null,
    adminEmail = null
  }) {
    try {
      const notification = await Notification.create({
        recipientType: 'BROADCAST',
        type,
        title,
        message,
        data,
        priority,
        actionUrl,
        sentByAdmin: Boolean(sentByAdmin),
        adminUser: adminUser || null,
        adminEmail: adminEmail || null,
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
   * Fetch admin notifications (with 24h auto-removal for read notifications; unread never removed)
   */
  static async getAdminNotifications({ limit = 30, page = 1, unreadOnly = false } = {}) {
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const query = {
      recipientType: 'ADMIN',
      $or: [
        { isRead: false },
        { isRead: true, readAt: { $gte: cutoff24h } }
      ]
    };

    if (unreadOnly) {
      delete query.$or;
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
   * Fetch sent notification history for Admin (Broadcast announcements, direct user messages, and user/system activity)
   */
  static async getAdminSentHistory({ tab = 'announcement', page = 1, limit = 20, search = '' } = {}) {
    // Background auto-cleanup of user notifications older than configured days
    this.cleanupOldUserNotifications().catch(() => { });

    let query = {};
    if (tab === 'announcement') {
      query = { sentByAdmin: true, recipientType: 'BROADCAST' };
    } else if (tab === 'direct') {
      query = { sentByAdmin: true, recipientType: 'USER' };
    } else if (tab === 'user' || tab === 'system') {
      // User-side and system activity notifications (orders, claims, cancellations, reviews, etc.)
      query = { sentByAdmin: { $ne: true } };
    }

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { title: { $regex: s, $options: 'i' } },
        { message: { $regex: s, $options: 'i' } },
        { userEmail: { $regex: s, $options: 'i' } },
        { type: { $regex: s, $options: 'i' } }
      ];
    }

    const skip = (Math.max(1, page) - 1) * limit;

    const [items, total, totalAnnouncements, totalDirect, totalUserNotifications] = await Promise.all([
      Notification.find(query)
        .populate('user', 'name email phone avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ sentByAdmin: true, recipientType: 'BROADCAST' }),
      Notification.countDocuments({ sentByAdmin: true, recipientType: 'USER' }),
      Notification.countDocuments({ sentByAdmin: { $ne: true } })
    ]);

    return {
      success: true,
      notifications: items,
      total,
      totalAnnouncements,
      totalDirect,
      totalUserNotifications,
      page: Number(page),
      pages: Math.ceil(total / limit)
    };
  }

  /**
   * Automatically purge customer/user-side system notifications older than dynamic retention days (default: 5 days)
   * Strictly preserves Admin-sent announcements & messages (sentByAdmin: true)
   */
  static async cleanupOldUserNotifications() {
    try {
      const CMS = (await import('../models/CMS.js')).default;
      const cms = await CMS.findOne().select('storeSettings').lean();
      const settings = cms?.storeSettings || {};

      const isEnabled = settings.autoNotificationCleanupEnabled !== false;
      if (!isEnabled) {
        return { success: true, enabled: false, deletedCount: 0 };
      }

      const retentionDays = Number(settings.autoNotificationCleanupDays) > 0 ? Number(settings.autoNotificationCleanupDays) : 5;
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      const result = await Notification.deleteMany({
        sentByAdmin: { $ne: true },
        createdAt: { $lt: cutoffDate }
      });

      if (result.deletedCount > 0) {
        console.log(`[NotificationService] Auto-cleanup: Purged ${result.deletedCount} user/system notifications older than ${retentionDays} days.`);
      }

      return {
        success: true,
        enabled: true,
        days: retentionDays,
        deletedCount: result.deletedCount
      };
    } catch (err) {
      console.error('[NotificationService] cleanupOldUserNotifications error:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Delete sent notification or user notification from Sent Notifications Hub
   * Realtime broadcast NOTIFICATION_DELETED instantly removes it everywhere (Admin & Customer storefront)
   */
  static async deleteAdminSentNotification(id) {
    const deleted = await Notification.findByIdAndDelete(id);
    if (deleted) {
      // Broadcast live deletion event across all active screens in 0ms without page reload
      realtimeService.broadcast('NOTIFICATION_DELETED', {
        id: String(id),
        recipientType: deleted.recipientType,
        targetUserId: deleted.user ? String(deleted.user) : null,
        targetEmail: deleted.userEmail || null
      });
    }
    return deleted;
  }

  /**
   * Admin clear all user & system notifications from Notification Hub
   */
  static async clearAdminUserNotifications() {
    const result = await Notification.deleteMany({ sentByAdmin: { $ne: true } });
    realtimeService.broadcast('NOTIFICATION_DELETED', { clearAllUserSide: true });
    return { success: true, deletedCount: result.deletedCount };
  }

  /**
   * Fetch customer notifications (user specific + broadcast)
   * Strict Rule:
   * 1. Unread notifications NEVER expire and are ALWAYS kept!
   * 2. Notifications read more than 24 hours ago are automatically removed.
   * 3. Notifications dismissed/removed by customer are excluded.
   * 4. New customer receives broadcast announcements created strictly AFTER account registration!
   */
  static async getUserNotifications({ userId = null, userEmail = null, userCreatedAt = null, limit = 50, page = 1 } = {}) {
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const normalizedEmail = userEmail ? userEmail.toLowerCase().trim() : null;

    // Resolve user account creation timestamp
    let accountJoinedDate = userCreatedAt ? new Date(userCreatedAt) : null;
    if (!accountJoinedDate && (userId || normalizedEmail)) {
      try {
        const User = (await import('../models/User.js')).default;
        const u = userId
          ? await User.findById(userId).select('createdAt')
          : await User.findOne({ email: normalizedEmail }).select('createdAt');
        if (u?.createdAt) {
          accountJoinedDate = new Date(u.createdAt);
        }
      } catch (err) {
        // ignore
      }
    }

    const conditions = [];

    // Broadcast condition:
    // 1. Exclude if dismissed by this user
    // 2. Strict Rule: Newly joined customers only receive broadcast announcements created AFTER they joined!
    const broadcastQuery = {
      recipientType: 'BROADCAST'
    };

    if (accountJoinedDate) {
      // 5-second buffer so simultaneous broadcasts during account registration are included
      const joinThreshold = new Date(accountJoinedDate.getTime() - 5000);
      broadcastQuery.createdAt = { $gte: joinThreshold };
    }

    const dismissedMatches = [];
    if (userId) dismissedMatches.push({ userId });
    if (normalizedEmail) dismissedMatches.push({ userEmail: normalizedEmail });

    if (dismissedMatches.length > 0) {
      broadcastQuery.dismissedBy = {
        $not: {
          $elemMatch: { $or: dismissedMatches }
        }
      };
    }
    conditions.push(broadcastQuery);

    // Specific user condition
    const userTargeting = [];
    if (userId) {
      userTargeting.push({ recipientType: 'USER', user: userId });
    }
    if (normalizedEmail) {
      userTargeting.push({ recipientType: 'USER', userEmail: normalizedEmail });
    }

    if (userTargeting.length > 0) {
      const userCondition = {
        $or: userTargeting,
        isDismissed: { $ne: true }
      };
      if (accountJoinedDate) {
        userCondition.createdAt = { $gte: new Date(accountJoinedDate.getTime() - 5000) };
      }
      conditions.push(userCondition);
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

    // Format isRead state, apply dismissal exclusion, and apply 24h post-read auto-removal filter
    const notifications = [];
    for (const n of items) {
      // Exclude if globally or directly dismissed
      if (n.isDismissed) continue;

      // Exclude if dismissedBy contains this user ID or email
      const isDismissedByUser = (n.dismissedBy || []).some((d) => {
        if (userId && d.userId && String(d.userId) === String(userId)) return true;
        if (normalizedEmail && d.userEmail && d.userEmail.toLowerCase() === normalizedEmail) return true;
        return false;
      });
      if (isDismissedByUser) continue;

      let isReadForUser = Boolean(n.isRead);
      let userReadAt = n.readAt ? new Date(n.readAt) : null;

      if (n.recipientType === 'BROADCAST') {
        if (userId) {
          const readEntry = (n.readBy || []).find(
            (r) => String(r.userId) === String(userId)
          );
          isReadForUser = Boolean(readEntry);
          userReadAt = readEntry?.readAt ? new Date(readEntry.readAt) : null;
        } else {
          isReadForUser = false;
        }
      }

      // 24-Hour Auto-Removal Rule:
      // If NOT read: KEEP IT ALWAYS!
      // If READ: Remove if userReadAt is older than 24 hours
      if (isReadForUser && userReadAt) {
        const diffMs = Date.now() - userReadAt.getTime();
        if (diffMs >= 24 * 60 * 60 * 1000) {
          // Read 24 hours ago -> automatically drop from view
          continue;
        }
      }

      notifications.push({
        ...n,
        isRead: isReadForUser,
        readAt: userReadAt || n.readAt
      });
    }

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return {
      success: true,
      notifications,
      total: notifications.length,
      unreadCount,
      page: Number(page),
      pages: Math.ceil(notifications.length / limit)
    };
  }

  /**
   * Mark single user notification as read
   */
  static async markUserNotificationAsRead(id, userId, userEmail) {
    const notification = await Notification.findById(id);
    if (!notification) return null;

    const now = new Date();

    if (notification.recipientType === 'BROADCAST') {
      if (userId) {
        await Notification.findByIdAndUpdate(id, {
          $addToSet: { readBy: { userId, readAt: now } }
        });
      }
    } else if (notification.recipientType === 'USER') {
      notification.isRead = true;
      notification.readAt = now;
      if (userId) {
        notification.readBy.push({ userId, readAt: now });
      }
      await notification.save();
    }

    return { success: true };
  }

  /**
   * Mark all user notifications as read
   */
  static async markAllUserNotificationsAsRead(userId, userEmail) {
    const now = new Date();
    const normalizedEmail = userEmail ? userEmail.toLowerCase().trim() : null;
    const conditions = [];
    if (userId) conditions.push({ recipientType: 'USER', user: userId });
    if (normalizedEmail) conditions.push({ recipientType: 'USER', userEmail: normalizedEmail });

    if (conditions.length > 0) {
      await Notification.updateMany(
        { $or: conditions, isRead: false },
        { $set: { isRead: true, readAt: now } }
      );
    }

    // For broadcasts: add userId to readBy
    if (userId) {
      await Notification.updateMany(
        { recipientType: 'BROADCAST', 'readBy.userId': { $ne: userId } },
        { $addToSet: { readBy: { userId, readAt: now } } }
      );
    }

    return { success: true };
  }

  /**
   * Customer dismisses/removes single notification from their notification view
   */
  static async dismissUserNotification(id, userId, userEmail) {
    const notification = await Notification.findById(id);
    if (!notification) return null;

    const normalizedEmail = userEmail ? userEmail.toLowerCase().trim() : null;
    const now = new Date();

    if (notification.recipientType === 'BROADCAST') {
      // Add customer to dismissedBy so broadcast remains for other users
      await Notification.findByIdAndUpdate(id, {
        $addToSet: {
          dismissedBy: {
            userId: userId || null,
            userEmail: normalizedEmail,
            dismissedAt: now
          }
        }
      });
    } else if (notification.recipientType === 'USER') {
      notification.isDismissed = true;
      notification.dismissedAt = now;
      if (userId || normalizedEmail) {
        notification.dismissedBy.push({
          userId: userId || null,
          userEmail: normalizedEmail,
          dismissedAt: now
        });
      }
      await notification.save();
    }

    return { success: true };
  }

  /**
   * Customer dismisses/clears all notifications from their view
   */
  static async clearAllUserNotifications(userId, userEmail) {
    const now = new Date();
    const normalizedEmail = userEmail ? userEmail.toLowerCase().trim() : null;
    const userConditions = [];
    if (userId) userConditions.push({ recipientType: 'USER', user: userId });
    if (normalizedEmail) userConditions.push({ recipientType: 'USER', userEmail: normalizedEmail });

    if (userConditions.length > 0) {
      await Notification.updateMany(
        { $or: userConditions },
        {
          $set: { isDismissed: true, dismissedAt: now },
          $addToSet: {
            dismissedBy: {
              userId: userId || null,
              userEmail: normalizedEmail,
              dismissedAt: now
            }
          }
        }
      );
    }

    if (userId || normalizedEmail) {
      await Notification.updateMany(
        { recipientType: 'BROADCAST' },
        {
          $addToSet: {
            dismissedBy: {
              userId: userId || null,
              userEmail: normalizedEmail,
              dismissedAt: now
            }
          }
        }
      );
    }

    return { success: true };
  }
}

