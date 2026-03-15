/**
 * Analytics Controller
 * Handles dashboard metrics and AI insights
 */

const Analytics = require('../models/Analytics');
const { generateDailyInsights, getInventoryAlerts, getComplaintAlerts } = require('../services/analyticsAI');
const Order = require('../models/Order');

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get dashboard metrics
 * @access  Private
 */
exports.getDashboard = async (req, res, next) => {
  try {
    // Get today's insights
    const insights = await generateDailyInsights();
    
    // Get alerts
    const inventoryAlerts = await getInventoryAlerts();
    const complaintAlerts = await getComplaintAlerts();

    const dashboard = {
      ...insights,
      alerts: {
        inventory: inventoryAlerts,
        complaints: complaintAlerts,
      },
    };

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/analytics/revenue
 * @desc    Get revenue analytics
 * @access  Private
 */
exports.getRevenueAnalytics = async (req, res, next) => {
  try {
    const { period = '7days' } = req.query;
    
    const days = period === '30days' ? 30 : 7;
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);
    
    // Fetch all completed orders in the date range at once
    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'completed',
    });
    
    // Initialize data array with 0s for all dates
    const dataMap = new Map();
    for (let i = 0; i < days; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        dataMap.set(dateStr, { date: dateStr, revenue: 0, orders: 0 });
    }

    // Aggregate orders into the map
    orders.forEach(order => {
        // Use local date string based on server formatting if possible, or simple split
        // Safest is to rely on Order's timestamp. 
        // We will assume server time for bucketing.
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        if (dataMap.has(orderDate)) {
            const entry = dataMap.get(orderDate);
            entry.revenue += order.total;
            entry.orders += 1;
        }
    });

    // Convert map to array
    const data = Array.from(dataMap.values());

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/analytics/top-items
 * @desc    Get top selling items
 * @access  Private
 */
exports.getTopItems = async (req, res, next) => {
  try {
    const { period = '7days' } = req.query;
    
    const days = period === '30days' ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const orders = await Order.find({
      createdAt: { $gte: startDate },
      status: 'completed',
    });
    
    const itemStats = {};
    
    orders.forEach(order => {
      order.items.forEach(item => {
        if (!itemStats[item.name]) {
          itemStats[item.name] = {
            name: item.name,
            quantity: 0,
            revenue: 0,
          };
        }
        itemStats[item.name].quantity += item.quantity;
        itemStats[item.name].revenue += item.total;
      });
    });
    
    const topItems = Object.values(itemStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    res.json({
      success: true,
      data: topItems,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/analytics/peak-hours
 * @desc    Get peak hours analysis
 * @access  Private
 */
exports.getPeakHours = async (req, res, next) => {
  try {
    const { period = '7days' } = req.query;
    
    const days = period === '30days' ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const orders = await Order.find({
      createdAt: { $gte: startDate },
      status: 'completed',
    });
    
    const hourStats = {};
    
    for (let i = 0; i < 24; i++) {
      hourStats[i] = { hour: i, orders: 0, revenue: 0 };
    }
    
    orders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      hourStats[hour].orders++;
      hourStats[hour].revenue += order.total;
    });
    
    const peakHours = Object.values(hourStats)
      .sort((a, b) => b.revenue - a.revenue);

    res.json({
      success: true,
      data: peakHours,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/analytics/insights
 * @desc    Get AI-generated insights
 * @access  Private
 */
exports.getInsights = async (req, res, next) => {
  try {
    const insights = await generateDailyInsights();

    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/analytics/alerts
 * @desc    Get all alerts
 * @access  Private
 */
exports.getAlerts = async (req, res, next) => {
  try {
    const inventoryAlerts = await getInventoryAlerts();
    const complaintAlerts = await getComplaintAlerts();

    res.json({
      success: true,
      data: {
        inventory: inventoryAlerts,
        complaints: complaintAlerts,
      },
    });
  } catch (error) {
    next(error);
  }
};
