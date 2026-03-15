/**
 * Order Routes
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
  getTodayStats,
  validateCoupon,
} = require('../controllers/orderController');

// All routes are protected
router.use(protect);

router.route('/')
  .get(getOrders)
  .post(createOrder);

router.get('/stats/today', getTodayStats);

// Validate a coupon code before checkout
router.post('/validate-coupon', validateCoupon);

router.route('/:id')
  .get(getOrder)
  .put(updateOrder)
  .delete(authorize('admin', 'manager'), deleteOrder);

module.exports = router;
