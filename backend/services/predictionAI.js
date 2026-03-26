/**
 * Inventory Prediction AI Service
 * Simple ML-based demand prediction using historical data
 */

/**
 * Predict demand for inventory items based on historical usage
 * @param {Object} inventoryItem - Inventory item with dailyUsage array
 * @returns {Object} - Prediction results
 */
function predictDemand(inventoryItem) {
  try {
    const { dailyUsage, quantity, reorderLevel } = inventoryItem;
    
    if (!dailyUsage || dailyUsage.length === 0) {
      return {
        predictedDemand: 0,
        daysUntilStockout: null,
        shouldReorder: quantity <= reorderLevel,
        confidence: 'low',
        recommendation: 'Not enough historical data for prediction',
      };
    }

    // Calculate average daily usage (last 7 days or available data)
    const recentUsage = dailyUsage.slice(-7);
    const avgDailyUsage = recentUsage.reduce((sum, day) => sum + day.used, 0) / recentUsage.length;
    
    // Calculate trend (increasing/decreasing/stable)
    const trend = calculateTrend(dailyUsage);
    
    // Adjust prediction based on trend
    let predictedDailyDemand = avgDailyUsage;
    if (trend === 'increasing') {
      predictedDailyDemand *= 1.2; // 20% increase
    } else if (trend === 'decreasing') {
      predictedDailyDemand *= 0.8; // 20% decrease
    }
    
    // Predict for next 7 days
    const predictedWeeklyDemand = Math.ceil(predictedDailyDemand * 7);
    
    // Calculate days until stockout
    const daysUntilStockout = avgDailyUsage > 0 
      ? Math.floor(quantity / avgDailyUsage)
      : null;
    
    // Determine if reorder is needed
    const shouldReorder = daysUntilStockout !== null && daysUntilStockout <= 3;
    
    // Calculate recommended order quantity
    const recommendedOrderQty = Math.max(
      predictedWeeklyDemand * 2, // 2 weeks supply
      reorderLevel * 2
    );
    
    // Calculate waste prediction
    const avgDailyWaste = recentUsage.reduce((sum, day) => sum + (day.wasted || 0), 0) / recentUsage.length;
    const wastePercentage = avgDailyUsage > 0 
      ? ((avgDailyWaste / avgDailyUsage) * 100).toFixed(1)
      : 0;
    
    return {
      predictedDailyDemand: Math.ceil(predictedDailyDemand),
      predictedWeeklyDemand,
      daysUntilStockout,
      shouldReorder,
      recommendedOrderQty,
      trend,
      wastePercentage,
      confidence: recentUsage.length >= 7 ? 'high' : 'medium',
      recommendation: generateRecommendation(daysUntilStockout, trend, wastePercentage),
    };
  } catch (error) {
    console.error('❌ Prediction error:', error.message);
    return {
      predictedDemand: 0,
      confidence: 'low',
      recommendation: 'Error in prediction',
    };
  }
}

/**
 * Calculate trend from historical data
 */
function calculateTrend(dailyUsage) {
  if (dailyUsage.length < 3) return 'stable';
  
  const recent = dailyUsage.slice(-3);
  const older = dailyUsage.slice(-6, -3);
  
  if (older.length === 0) return 'stable';
  
  const recentAvg = recent.reduce((sum, day) => sum + day.used, 0) / recent.length;
  const olderAvg = older.reduce((sum, day) => sum + day.used, 0) / older.length;
  
  const change = ((recentAvg - olderAvg) / olderAvg) * 100;
  
  if (change > 15) return 'increasing';
  if (change < -15) return 'decreasing';
  return 'stable';
}

/**
 * Generate recommendation based on prediction
 */
function generateRecommendation(daysUntilStockout, trend, wastePercentage) {
  const recommendations = [];
  
  if (daysUntilStockout !== null && daysUntilStockout <= 3) {
    recommendations.push('🚨 URGENT: Reorder immediately - stock running low');
  } else if (daysUntilStockout !== null && daysUntilStockout <= 7) {
    recommendations.push('⚠️  Plan to reorder soon - less than a week of stock');
  }
  
  if (trend === 'increasing') {
    recommendations.push('📈 Demand is increasing - consider ordering more than usual');
  } else if (trend === 'decreasing') {
    recommendations.push('📉 Demand is decreasing - order conservatively');
  }
  
  if (wastePercentage > 10) {
    recommendations.push(`♻️ High waste detected (${wastePercentage}%) - review portion sizes or storage`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ Stock levels are healthy');
  }
  
  return recommendations.join(' | ');
}

/**
 * Analyze all inventory and generate insights
 */
function analyzeInventory(inventoryItems) {
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;

  const insights = {
    lowStockItems: [],
    highWasteItems: [],
    trendingItems: [],
    expiringItems: [],
    recommendations: [],
  };
  
  inventoryItems.forEach(item => {
    const prediction = predictDemand(item);

    if (prediction.shouldReorder) {
      insights.lowStockItems.push({
        name: item.itemName,
        currentQty: item.quantity,
        daysLeft: prediction.daysUntilStockout,
        recommendedQty: prediction.recommendedOrderQty,
      });
    }

    if (parseFloat(prediction.wastePercentage) > 10) {
      insights.highWasteItems.push({
        name: item.itemName,
        wastePercentage: prediction.wastePercentage,
      });
    }

    if (prediction.trend === 'increasing') {
      insights.trendingItems.push({
        name: item.itemName,
        trend: 'up',
      });
    }

    // Expiry analysis
    if (item.expiryDate) {
      const daysLeft = Math.ceil((new Date(item.expiryDate) - now) / msPerDay);
      if (daysLeft <= 7) {
        insights.expiringItems.push({
          name: item.itemName,
          expiryDate: item.expiryDate,
          daysLeft,
          status: daysLeft <= 0 ? 'expired' : 'expiring_soon',
        });
      }
    }
  });
  
  // Generate overall recommendations
  if (insights.lowStockItems.length > 0) {
    insights.recommendations.push(`${insights.lowStockItems.length} items need reordering`);
  }

  if (insights.highWasteItems.length > 0) {
    insights.recommendations.push(`${insights.highWasteItems.length} items have high waste - review storage`);
  }

  if (insights.trendingItems.length > 0) {
    insights.recommendations.push(`${insights.trendingItems.length} items trending up - stock accordingly`);
  }

  const expiredCount  = insights.expiringItems.filter(i => i.status === 'expired').length;
  const expiringCount = insights.expiringItems.filter(i => i.status === 'expiring_soon').length;
  if (expiredCount > 0) {
    insights.recommendations.push(`🚨 ${expiredCount} item(s) have EXPIRED - remove immediately`);
  }
  if (expiringCount > 0) {
    insights.recommendations.push(`⚠️ ${expiringCount} item(s) expire within 7 days - use or discard`);
  }
  
  return insights;
}

/**
 * Predict optimal reorder point
 */
function calculateOptimalReorderPoint(dailyUsage, leadTimeDays = 3) {
  if (!dailyUsage || dailyUsage.length === 0) {
    return 10; // Default
  }
  
  const avgDailyUsage = dailyUsage.reduce((sum, day) => sum + day.used, 0) / dailyUsage.length;
  
  // Reorder point = (Average daily usage × Lead time) + Safety stock
  const safetyStock = avgDailyUsage * 2; // 2 days safety stock
  const reorderPoint = Math.ceil((avgDailyUsage * leadTimeDays) + safetyStock);
  
  return reorderPoint;
}

module.exports = {
  predictDemand,
  analyzeInventory,
  calculateOptimalReorderPoint,
};
