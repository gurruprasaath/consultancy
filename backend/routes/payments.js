/**
 * Payments Routes — Razorpay
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createRazorpayOrder,
  verifyPayment,
  getPaymentConfig,
  testSuccessPayment,
} = require('../controllers/paymentController');

router.use(protect);

// Fetch publishable key for frontend
router.get('/config', getPaymentConfig);

// Create a Razorpay order (call before opening checkout)
router.post('/create-order', createRazorpayOrder);

// Verify signature after payment success
router.post('/verify', verifyPayment);

// Simulate a successful payment (test mode only — rzp_test_ keys)
router.post('/test-success', testSuccessPayment);

module.exports = router;
