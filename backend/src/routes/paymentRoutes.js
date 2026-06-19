const router = require("express").Router();

const { protect, allow } = require("../middleware/authMiddleware");

const paymentController = require("../controllers/paymentController");

// Create Payment
router.post(
  "/",
  protect,
  allow("ADMIN", "MANAGER"),
  paymentController.createPayment
);

// Payment History
router.get(
  "/",
  protect,
  paymentController.getPayments
);

// Summary
router.get(
  "/summary",
  protect,
  paymentController.getSummary
);

// Delete Payment
router.delete(
  "/:id",
  protect,
  allow("ADMIN", "MANAGER"),
  paymentController.deletePayment
);

module.exports = router;