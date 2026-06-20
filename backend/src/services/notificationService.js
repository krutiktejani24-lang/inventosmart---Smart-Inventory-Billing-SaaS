const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createNotification = async (businessId, title, message) => {
  return prisma.notification.create({
    data: {
      business_id: businessId,
      title,
      message,
    },
  });
};

const getNotifications = async (businessId) => {
  return prisma.notification.findMany({
    where: {
      business_id: businessId,
    },
    orderBy: {
      created_at: 'desc',
    },
  });
};

const markAsRead = async (id, businessId) => {
  return prisma.notification.updateMany({
    where: {
      id,
      business_id: businessId,
    },
    data: {
      is_read: true,
    },
  });
};

const getUnreadCount = async (businessId) => {
  return prisma.notification.count({
    where: {
      business_id: businessId,
      is_read: false,
    },
  });
};

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  getUnreadCount,
};