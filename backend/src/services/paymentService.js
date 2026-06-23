const prisma = require('../config/prisma');
  const notificationService =

require("./notificationService");

  /* -----------------------------
    Create Payment
  ----------------------------- */

  const createPayment = async (businessId, data) => {

    const payment = await prisma.payment.create({
  data: {
    invoice_id: data.invoiceId,
    amount: Number(data.amount),
    method: data.method,
    reference: data.reference || null,
    notes: data.notes || null,
  },
});

   await notificationService.createNotification(
    businessId,
    "Payment Received",
    `₹${data.amount} received via ${data.method}`
  );
    return payment;
  };

  /* -----------------------------
    Payment History
  ----------------------------- */

  const getPayments = async (businessId) => {

  return prisma.payment.findMany({
    where: {
      invoice: {
        business_id: businessId,
      },
    },

    include: {
      invoice: {
        include: {
          customer: true,
        },
      },
    },

    orderBy: {
      created_at: "desc",
    },
  });
};

  /* -----------------------------
    Dashboard Summary
  ----------------------------- */

  const getSummary = async (businessId) => {

    const payments = await prisma.payment.findMany({
  where: {
    invoice: {
      business_id: businessId,
    },
  },
});

    let cash = 0;
    let online = 0;

    payments.forEach((p) => {

      if (p.method === "Cash") {
        cash += p.amount;
      } else {
        online += p.amount;
      }

    });

    return {
      cashCollection: cash,
      onlineCollection: online,
      totalCollection: cash + online,
    };
  };

  /* -----------------------------
    Delete Payment
  ----------------------------- */

  const deletePayment = async (id, businessId) => {

   const payment = await prisma.payment.findFirst({
  where: {
    id,
    invoice: {
      business_id: businessId,
    },
  },
});

    if (!payment) {
      throw new Error("Payment not found");
    }

    await prisma.payment.delete({
      where: {
        id,
      },
    });

    return true;
  };

  module.exports = {
    createPayment,
    getPayments,
    getSummary,
    deletePayment,
  };