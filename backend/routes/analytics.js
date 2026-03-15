/**
 * Analytics Routes
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getDashboard,
  getRevenueAnalytics,
  getTopItems,
  getPeakHours,
  getInsights,
  getAlerts,
} = require('../controllers/analyticsController');

// All routes are protected
router.use(protect);

router.get('/dashboard', getDashboard);
router.get('/revenue', getRevenueAnalytics);
router.get('/top-items', getTopItems);
router.get('/peak-hours', getPeakHours);
router.get('/insights', getInsights);
router.get('/alerts', getAlerts);

module.exports = router;
