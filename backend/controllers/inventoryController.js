/**
 * Inventory Controller
 * Handles inventory management and AI predictions
 */

const Inventory = require('../models/Inventory');
const { predictDemand, analyzeInventory } = require('../services/predictionAI');
const { forecastInventory } = require('../services/inventoryForecastAI');

/**
 * @route   GET /api/inventory
 * @desc    Get all inventory items
 * @access  Private
 */
exports.getInventory = async (req, res, next) => {
  try {
    const { category, lowStock } = req.query;
    
    const query = {};
    
    if (category) {
      query.category = category;
    }
    
    let items = await Inventory.find(query).sort({ itemName: 1 });
    
    if (lowStock === 'true') {
      items = items.filter(item => item.quantity <= item.reorderLevel);
    }

    res.json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/inventory/:id
 * @desc    Get single inventory item
 * @access  Private
 */
exports.getInventoryItem = async (req, res, next) => {
  try {
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found',
      });
    }

    // Get AI prediction
    const prediction = predictDemand(item);

    res.json({
      success: true,
      data: {
        ...item.toJSON(),
        prediction,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/inventory
 * @desc    Add new inventory item
 * @access  Private/Admin
 */
exports.createInventoryItem = async (req, res, next) => {
  try {
    const item = await Inventory.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Inventory item created successfully',
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/inventory/:id
 * @desc    Update inventory item
 * @access  Private
 */
exports.updateInventoryItem = async (req, res, next) => {
  try {
    const item = await Inventory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found',
      });
    }

    res.json({
      success: true,
      message: 'Inventory item updated successfully',
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/inventory/:id
 * @desc    Delete inventory item
 * @access  Private/Admin
 */
exports.deleteInventoryItem = async (req, res, next) => {
  try {
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found',
      });
    }

    await item.deleteOne();

    res.json({
      success: true,
      message: 'Inventory item deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/inventory/:id/restock
 * @desc    Restock inventory item
 * @access  Private
 */
exports.restockItem = async (req, res, next) => {
  try {
    const { quantity } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid quantity',
      });
    }

    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found',
      });
    }

    item.quantity += quantity;
    item.lastRestocked = new Date();
    await item.save();

    res.json({
      success: true,
      message: 'Inventory restocked successfully',
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/inventory/predictions/all
 * @desc    Get AI predictions for all inventory
 * @access  Private
 */
exports.getPredictions = async (req, res, next) => {
  try {
    const items = await Inventory.find();
    
    const predictions = items.map(item => ({
      id: item._id,
      itemName: item.itemName,
      currentQty: item.quantity,
      unit: item.unit,
      ...predictDemand(item),
    }));

    res.json({
      success: true,
      count: predictions.length,
      data: predictions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/inventory/alerts/low-stock
 * @desc    Get low stock alerts
 * @access  Private
 */
exports.getLowStockAlerts = async (req, res, next) => {
  try {
    const items = await Inventory.find();
    
    const lowStockItems = items.filter(item => item.quantity <= item.reorderLevel);

    res.json({
      success: true,
      count: lowStockItems.length,
      data: lowStockItems,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/inventory/analysis/insights
 * @desc    Get AI inventory insights
 * @access  Private
 */
exports.getInventoryInsights = async (req, res, next) => {
  try {
    const items = await Inventory.find();
    const insights = analyzeInventory(items);

    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/inventory/forecast/restock
 * @desc    Get ML-based restock forecast
 * @access  Private
 */
exports.getRestockForecast = async (req, res, next) => {
  try {
    const historyDays = req.query.historyDays ? Number(req.query.historyDays) : undefined;
    const forecastDays = req.query.forecastDays ? Number(req.query.forecastDays) : undefined;

    const forecast = await forecastInventory({ historyDays, forecastDays });

    res.json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    next(error);
  }
};
