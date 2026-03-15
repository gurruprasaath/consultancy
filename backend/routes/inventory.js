/**
 * Inventory Routes
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getInventory,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  restockItem,
  getPredictions,
  getLowStockAlerts,
  getInventoryInsights,
  getRestockForecast,
} = require('../controllers/inventoryController');

// All routes are protected
router.use(protect);

router.route('/')
  .get(getInventory)
  .post(authorize('admin', 'manager'), createInventoryItem);

router.get('/predictions/all', getPredictions);
router.get('/alerts/low-stock', getLowStockAlerts);
router.get('/analysis/insights', getInventoryInsights);
router.get('/forecast/restock', getRestockForecast);

router.route('/:id')
  .get(getInventoryItem)
  .put(updateInventoryItem)
  .delete(authorize('admin', 'manager'), deleteInventoryItem);

router.post('/:id/restock', restockItem);

module.exports = router;
