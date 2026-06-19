const express = require('express');
const router = express.Router();



const {
  getPlans,
  getCurrentSubscription,
  subscribePlan,
  createOrder,
  verifyPayment,
  getUsage
} = require('../controllers/subscriptionController');

const { protect } = require('../middleware/authMiddleware');

router.get('/plans', getPlans);
router.get('/current', protect, getCurrentSubscription);
router.post('/subscribe', protect, subscribePlan);
router.get(
  '/usage',
  protect,
  getUsage
);
router.post(
  '/create-order',
  protect,
  createOrder
);

router.post(
  '/verify-payment',
  protect,
  verifyPayment
);

module.exports = router;