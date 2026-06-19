const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.createAuditLog = async (
  businessId,
  userId,
  action,
  module
) => {
  return prisma.auditLog.create({
    data: {
      business_id: businessId,
      user_id: userId,
      action,
      module,
    },
  });
};