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

exports.getNotifications = async (req, res) => {
  return res.json({
    success: true,
    data: []
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

exports.getUnreadCount = async (req, res) => {
  return res.json({
    success: true,
    count: 0
  });
};

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  getUnreadCount,
};