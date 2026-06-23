const prisma = require('../config/prisma');

exports.getAuditLogs = async (req, res) => {
  try {

    const logs =
      await prisma.auditLog.findMany({
        where: {
          business_id: req.user.businessId,
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

    res.json({
      success: true,
      data: logs,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch logs',
    });

  }
};