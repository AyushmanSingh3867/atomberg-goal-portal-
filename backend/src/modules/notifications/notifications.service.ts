import prisma from "../../lib/prisma";

export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: "INFO" | "SUCCESS" | "WARNING" | "DANGER" = "INFO",
  link?: string
) => {
  return prisma.notification.create({
    data: {
      user_id: userId,
      title,
      message,
      type,
      link,
    },
  });
};

export const getMyNotifications = async (userId: string) => {
  return prisma.notification.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
    take: 50,
  });
};

export const markAsRead = async (notificationId: string) => {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { is_read: true },
  });
};

export const markAllAsRead = async (userId: string) => {
  return prisma.notification.updateMany({
    where: { user_id: userId, is_read: false },
    data: { is_read: true },
  });
};
