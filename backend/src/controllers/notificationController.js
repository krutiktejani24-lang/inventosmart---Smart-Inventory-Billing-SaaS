const notificationService = require('../services/notificationService');

exports.getNotifications = async (req, res) => {
  try {
    const notifications =
      await notificationService.getNotifications(
        req.user.businessId
      );

    res.json({
      success: true,
      data: notifications,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    await notificationService.markAsRead(
      req.params.id,
      req.user.businessId
    );

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: 'Failed to update notification',
    });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const count =
      await notificationService.getUnreadCount(
        req.user.businessId
      );

    res.json({
      success: true,
      count,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
    });
  }
};