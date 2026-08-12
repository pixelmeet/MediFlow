import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { ALLOW_MEMORY_FALLBACK } from "../auth/config";
import { CreateNotificationInput } from "../validation/notifications";

export interface NotificationDTO {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  channel: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  payload?: Record<string, unknown> | null;
}

// In-memory fallback
const memoryNotifications = new Map<string, NotificationDTO[]>();

export class NotificationService {
  /**
   * Fetch notifications and unread count for a given user
   */
  static async getUserNotifications(
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number }
  ): Promise<{
    notifications: NotificationDTO[];
    unreadCount: number;
    totalCount: number;
  }> {
    try {
      const whereClause: Prisma.NotificationWhereInput = { userId };
      if (options?.unreadOnly) {
        whereClause.readAt = null;
      }

      const [items, unreadCount, totalCount] = await Promise.all([
        prisma.notification.findMany({
          where: whereClause,
          orderBy: { createdAt: "desc" },
          take: options?.limit || 30,
        }),
        prisma.notification.count({
          where: { userId, readAt: null },
        }),
        prisma.notification.count({
          where: { userId },
        }),
      ]);

      const formatted: NotificationDTO[] = items.map((n) => ({
        id: n.id,
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        channel: n.channel,
        isRead: !!n.readAt,
        readAt: n.readAt ? n.readAt.toISOString() : null,
        createdAt: n.createdAt.toISOString(),
        payload: (n.payload as Record<string, unknown>) || null,
      }));

      return {
        notifications: formatted,
        unreadCount,
        totalCount,
      };
    } catch (err) {
      console.error("NotificationService.getUserNotifications error:", err);
      if (ALLOW_MEMORY_FALLBACK) {
        const userList = memoryNotifications.get(userId) || [];
        const filtered = options?.unreadOnly ? userList.filter((n) => !n.isRead) : userList;
        const unread = userList.filter((n) => !n.isRead).length;
        return {
          notifications: filtered.slice(0, options?.limit || 30),
          unreadCount: unread,
          totalCount: userList.length,
        };
      }
      return { notifications: [], unreadCount: 0, totalCount: 0 };
    }
  }

  /**
   * Mark a single notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      await prisma.notification.updateMany({
        where: { id: notificationId, userId },
        data: { readAt: new Date() },
      });
      return true;
    } catch (err) {
      console.error("NotificationService.markAsRead error:", err);
      if (ALLOW_MEMORY_FALLBACK) {
        const userList = memoryNotifications.get(userId) || [];
        const target = userList.find((n) => n.id === notificationId);
        if (target) {
          target.isRead = true;
          target.readAt = new Date().toISOString();
        }
        return true;
      }
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<boolean> {
    try {
      await prisma.notification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date() },
      });
      return true;
    } catch (err) {
      console.error("NotificationService.markAllAsRead error:", err);
      if (ALLOW_MEMORY_FALLBACK) {
        const userList = memoryNotifications.get(userId) || [];
        userList.forEach((n) => {
          n.isRead = true;
          n.readAt = new Date().toISOString();
        });
        return true;
      }
      return false;
    }
  }

  /**
   * Create and deliver a notification
   */
  static async createNotification(input: CreateNotificationInput): Promise<NotificationDTO | null> {
    try {
      const created = await prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          title: input.title,
          message: input.message,
          channel: input.channel || "push",
          payload: input.payload ? JSON.stringify(input.payload) : undefined,
          sentAt: new Date(),
        },
      });

      return {
        id: created.id,
        userId: created.userId,
        type: created.type,
        title: created.title,
        message: created.message,
        channel: created.channel,
        isRead: false,
        readAt: null,
        createdAt: created.createdAt.toISOString(),
        payload: input.payload || null,
      };
    } catch (err) {
      console.error("NotificationService.createNotification error:", err);
      if (ALLOW_MEMORY_FALLBACK) {
        const mock: NotificationDTO = {
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId: input.userId,
          type: input.type,
          title: input.title,
          message: input.message,
          channel: input.channel || "push",
          isRead: false,
          readAt: null,
          createdAt: new Date().toISOString(),
          payload: input.payload || null,
        };
        const current = memoryNotifications.get(input.userId) || [];
        memoryNotifications.set(input.userId, [mock, ...current]);
        return mock;
      }
      return null;
    }
  }
}
