/**
 * Analytics AI Service
 * Generates daily insights and recommendations
 */

const Order = require('../models/Order');
const Inventory = require('../models/Inventory');
const Call = require('../models/Call');

/**
 * Generate daily sales insights
 */
async function generateDailyInsights(date = new Date()) {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get ALL TIME orders (for "Whole Data")
    const allOrders = await Order.find({ status: 'completed' });
    const totalRevenueAllTime = allOrders.reduce((sum, order) => sum + order.total, 0);
    const totalOrdersAllTime = allOrders.length;

    // Get today's orders (for "Today's Performance")
    const todayOrders = allOrders.filter(order => 
      new Date(order.createdAt) >= startOfDay && new Date(order.createdAt) <= endOfDay
    );
    
    // Calculate metrics based on TODAY
    const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0);
    const todayOrderCount = todayOrders.length;
    const avgOrderValue = todayOrderCount > 0 ? todayRevenue / todayOrderCount : 0;
    
    // Get top items (based on ALL TIME data for better insights, or Today? User wants "Whole Data")
    // Let's use ALL TIME for top items to show meaningful data if today has few orders
    const itemCounts = {};
    allOrders.forEach(order => {
      order.items.forEach(item => {
        if (!itemCounts[item.name]) {
          itemCounts[item.name] = { quantity: 0, revenue: 0 };
        }
        itemCounts[item.name].quantity += item.quantity;
        itemCounts[item.name].revenue += item.total;
      });
    });
    
    const topItems = Object.entries(itemCounts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    
    // Calculate peak hours (ALL TIME)
    const hourCounts = {};
    allOrders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      if (!hourCounts[hour]) {
        hourCounts[hour] = { orders: 0, revenue: 0 };
      }
      hourCounts[hour].orders++;
      hourCounts[hour].revenue += order.total;
    });
    
    const peakHours = Object.entries(hourCounts)
      .map(([hour, data]) => ({ hour: parseInt(hour), ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);
    
    // Get complaints
    const complaints = await Call.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      isComplaint: true,
    });
    
    // Generate insights
    const insights = {
      revenue: {
        total: totalRevenueAllTime, // Changed to ALL TIME
        today: todayRevenue,
        trend: await calculateRevenueTrend(date),
        change: await calculateRevenueChange(date),
      },
      orders: {
        total: totalOrdersAllTime, // Changed to ALL TIME
        today: todayOrderCount,
        change: await calculateOrdersChange(date), // New metric
        avgValue: avgOrderValue,
      },
      topItems,
      peakHours,
      complaints: {
        total: complaints.length,
        resolved: complaints.filter(c => c.status === 'resolved').length,
        pending: complaints.filter(c => c.status === 'pending').length,
      },
      recommendations: await generateRecommendations(todayRevenue, topItems, complaints),
    };
    
    return insights;
  } catch (error) {
    console.error('❌ Insights generation error:', error.message);
    throw error;
  }
}

/**
 * Calculate revenue trend
 */
async function calculateRevenueTrend(date) {
  try {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(date);
      day.setDate(day.getDate() - i);
      day.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const orders = await Order.find({
        createdAt: { $gte: day, $lt: nextDay },
        status: 'completed',
      });
      
      const revenue = orders.reduce((sum, order) => sum + order.total, 0);
      last7Days.push(revenue);
    }
    
    // Simple trend calculation
    const firstHalf = last7Days.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const secondHalf = last7Days.slice(4).reduce((a, b) => a + b, 0) / 3;
    
    if (secondHalf > firstHalf * 1.1) return 'increasing';
    if (secondHalf < firstHalf * 0.9) return 'decreasing';
    return 'stable';
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Calculate revenue change from yesterday
 */
async function calculateRevenueChange(date) {
  try {
    const today = new Date(date);
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayOrders = await Order.find({
      createdAt: { $gte: today, $lt: tomorrow },
      status: 'completed',
    });
    
    const yesterdayOrders = await Order.find({
      createdAt: { $gte: yesterday, $lt: today },
      status: 'completed',
    });
    
    const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0);
    const yesterdayRevenue = yesterdayOrders.reduce((sum, order) => sum + order.total, 0);
    
    if (yesterdayRevenue === 0) return 0;
    
    const change = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;
    return Math.round(change);
  } catch (error) {
    return 0;
  }
}

/**
 * Calculate orders change from yesterday
 */
async function calculateOrdersChange(date) {
  try {
    const today = new Date(date);
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayCount = await Order.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow },
      status: 'completed',
    });
    
    const yesterdayCount = await Order.countDocuments({
      createdAt: { $gte: yesterday, $lt: today },
      status: 'completed',
    });
    
    if (yesterdayCount === 0) return todayCount > 0 ? 100 : 0;
    
    const change = ((todayCount - yesterdayCount) / yesterdayCount) * 100;
    return Math.round(change);
  } catch (error) {
    return 0;
  }
}

/**
 * Generate AI recommendations
 */
async function generateRecommendations(revenue, topItems, complaints) {
  const recommendations = [];
  
  // Revenue-based recommendations
  if (revenue < 5000) {
    recommendations.push('💡 Revenue is low today - consider running a promotional offer');
  } else if (revenue > 20000) {
    recommendations.push('🎉 Excellent revenue today! Consider upselling premium items');
  }
  
  // Top items recommendations
  if (topItems.length > 0) {
    recommendations.push(`🔥 "${topItems[0].name}" is trending - ensure adequate stock`);
  }
  
  // Complaints recommendations
  if (complaints.length > 5) {
    recommendations.push('⚠️  High complaint volume - review service quality and operations');
  } else if (complaints.length === 0) {
    recommendations.push('✅ Zero complaints today - great customer service!');
  }
  
  // Time-based recommendations
  const hour = new Date().getHours();
  if (hour >= 11 && hour <= 14) {
    recommendations.push('🍽️ Lunch rush - ensure kitchen is well-staffed');
  } else if (hour >= 19 && hour <= 22) {
    recommendations.push('🌙 Dinner time - prepare for peak orders');
  }
  
  return recommendations;
}

/**
 * Get inventory alerts
 */
async function getInventoryAlerts() {
  try {
    const lowStockItems = await Inventory.find({
      $expr: { $lte: ['$quantity', '$reorderLevel'] },
    });
    
    return lowStockItems.map(item => ({
      name: item.itemName,
      currentQty: item.quantity,
      reorderLevel: item.reorderLevel,
      unit: item.unit,
    }));
  } catch (error) {
    console.error('❌ Inventory alerts error:', error.message);
    return [];
  }
}

/**
 * Get complaint alerts
 */
async function getComplaintAlerts() {
  try {
    const pendingComplaints = await Call.find({
      isComplaint: true,
      status: { $in: ['pending', 'escalated'] },
    }).sort({ createdAt: -1 }).limit(10);
    
    return pendingComplaints.map(call => ({
      id: call._id,
      sentiment: call.sentiment,
      category: call.complaintCategory,
      suggestedAction: call.suggestedAction,
      createdAt: call.createdAt,
    }));
  } catch (error) {
    console.error('❌ Complaint alerts error:', error.message);
    return [];
  }
}

module.exports = {
  generateDailyInsights,
  getInventoryAlerts,
  getComplaintAlerts,
};
