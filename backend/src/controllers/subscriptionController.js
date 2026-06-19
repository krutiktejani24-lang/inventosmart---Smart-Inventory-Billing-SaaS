const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
console.log("KEY ID:", process.env.RAZORPAY_KEY_ID);

console.log("KEY SECRET:", process.env.RAZORPAY_KEY_SECRET);

const createOrder = async (req, res) => {
  try {
    const { planId } = req.body;
    console.log('PLAN ID RECEIVED:', planId);
    const plan = await prisma.plan.findUnique({
  where: {
    id: planId
  }
});

if (!plan) {
  return res.status(400).json({
    message: 'Plan not found'
  });
}

const amount = plan.price;

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: 'Failed to create order'
    });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId
    } = req.body;

    const generatedSignature = crypto
      .createHmac(
        'sha256',
        process.env.RAZORPAY_KEY_SECRET
      )
      .update(
        razorpay_order_id + "|" + razorpay_payment_id
      )
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        message: 'Invalid payment signature'
      });
    }

    // TODO:
    // Prisma ma business subscription update karvi

    const plan = await prisma.plan.findFirst({
  where: {
    id: req.body.planId
  }
});

if (!plan) {
  return res.status(404).json({
    message: 'Plan not found'
  });
}

const endDate = new Date();
endDate.setMonth(endDate.getMonth() + 1);

await prisma.subscription.upsert({
  where: {
    business_id: req.user.businessId
  },

  update: {
    plan_id: plan.id,
    status: 'ACTIVE',
    start_date: new Date(),
    end_date: endDate
  },

  create: {
    business_id: req.user.businessId,
    plan_id: plan.id,
    status: 'ACTIVE',
    start_date: new Date(),
    end_date: endDate
  }
});

await prisma.business.update({
  where: {
    id: req.user.businessId
  },

  data: {
    plan: plan.name.toLowerCase()
  }
});

    return res.json({
  success: true,
  message: 'Subscription activated successfully',
  plan: plan.name,
  expiresAt: endDate
});

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: 'Payment verification failed'
    });
  }
};

exports.getPlans = async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: {
        price: 'asc',
      },
    });

    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch plans',
    });
  }
};

exports.getCurrentSubscription = async (req, res) => {
  try {

    const businessId = req.user.businessId;

    const subscription =
      await prisma.subscription.findUnique({
        where: {
          business_id: businessId,
        },
        include: {
          plan: true,
        },
      });

    if (!subscription) {
      return res.json({
        success: true,
        data: null,
      });
    }

    res.json({
      success: true,
      data: subscription,
    });

  } catch (error) {
  console.error('SUBSCRIPTION ERROR:', error);

  res.status(500).json({
    success: false,
    message: 'Failed to fetch subscription',
    error: error.message
  });
}
};

exports.subscribePlan = async (req, res) => {
  try {

    const { planId } = req.body;
    const businessId = req.user.businessId;

    const plan = await prisma.plan.findUnique({
      where: {
        id: planId,
      },
    });

    if (!plan) {
      return res.status(404).json({
        message: 'Plan not found',
      });
    }
    const amount = plan.price;

    const subscription =
      await prisma.subscription.upsert({
        where: {
          business_id: businessId,
        },
        update: {
          plan_id: plan.id,
          status: 'ACTIVE',
          start_date: new Date(),
        },
        create: {
          business_id: businessId,
          plan_id: plan.id,
          status: 'ACTIVE',
        },
        include: {
          plan: true,
        },
      });

    await prisma.business.update({
      where: {
        id: businessId,
      },
      data: {
        plan: plan.name.toLowerCase(),
      },
    });

    return res.json({
      success: true,
      message: 'Subscription updated successfully',
      data: subscription,
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: 'Subscription failed',
    });

  }
};

const getUsage = async (req, res) => {
  
  try {
    const businessId = req.user.businessId;

    const subscription = await prisma.subscription.findUnique({
      where: {
        business_id: businessId,
      },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No subscription found',
      });
    }

    const [productsUsed, usersUsed, invoicesUsed] =
      await Promise.all([
        prisma.product.count({
          where: {
            business_id: businessId,
            is_active: true,
          },
        }),

        prisma.user.count({
          where: {
            business_id: businessId,
            is_active: true,
          },
        }),

        prisma.invoice.count({
          where: {
            business_id: businessId,
          },
        }),
      ]);

    return res.json({
      success: true,

      data: {
        productsUsed,
        productsLimit: subscription.plan.max_products,

        usersUsed,
        usersLimit: subscription.plan.max_users,

        invoicesUsed,
        invoicesLimit: subscription.plan.max_invoices,
      },
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: 'Failed to load usage',
    });
  }
};
exports.createOrder = createOrder;
exports.verifyPayment = verifyPayment;
exports.getUsage = getUsage;