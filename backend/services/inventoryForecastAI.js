/**
 * Inventory Forecast AI Service
 * Predicts raw material usage using menu, day, and customer trends
 */

const Analytics = require('../models/Analytics');
const Inventory = require('../models/Inventory');
const MenuItem = require('../models/MenuItem');

const DEFAULT_HISTORY_DAYS = 60;
const DEFAULT_FORECAST_DAYS = 7;
const MIN_SAMPLES = 14;

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getStartOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function summarizeTopItems(topItems = []) {
  return topItems.reduce(
    (acc, item) => {
      acc.quantity += item.quantity || 0;
      acc.revenue += item.revenue || 0;
      return acc;
    },
    { quantity: 0, revenue: 0 }
  );
}

function getMenuStats(menuItems) {
  const stats = {
    totalCount: menuItems.length,
    availableCount: menuItems.filter(item => item.isAvailable).length,
  };

  return stats;
}

function buildFeatureVector({
  date,
  analytics,
  menuStats,
  averages,
}) {
  const day = date.getDay();
  const month = date.getMonth();

  const daySin = Math.sin((2 * Math.PI * day) / 7);
  const dayCos = Math.cos((2 * Math.PI * day) / 7);
  const monthSin = Math.sin((2 * Math.PI * month) / 12);
  const monthCos = Math.cos((2 * Math.PI * month) / 12);
  const isWeekend = day === 0 || day === 6 ? 1 : 0;

  const ordersTotal = analytics?.orders?.total ?? averages.ordersTotal;
  const revenueTotal = analytics?.revenue?.total ?? averages.revenueTotal;

  const topSummary = summarizeTopItems(analytics?.topItems);
  const topItemsQuantity = analytics ? topSummary.quantity : averages.topItemsQuantity;
  const topItemsRevenue = analytics ? topSummary.revenue : averages.topItemsRevenue;

  const menuAvailable = menuStats.availableCount;
  const menuTotal = menuStats.totalCount;

  return [
    daySin,
    dayCos,
    monthSin,
    monthCos,
    isWeekend,
    ordersTotal,
    revenueTotal,
    topItemsQuantity,
    topItemsRevenue,
    menuAvailable,
    menuTotal,
  ];
}

function standardizeSamples(samples) {
  if (samples.length === 0) {
    return { normalized: [], means: [], stds: [] };
  }

  const featureCount = samples[0].length;
  const means = new Array(featureCount).fill(0);
  const stds = new Array(featureCount).fill(0);

  samples.forEach(sample => {
    sample.forEach((value, index) => {
      means[index] += value;
    });
  });

  for (let i = 0; i < featureCount; i += 1) {
    means[i] /= samples.length;
  }

  samples.forEach(sample => {
    sample.forEach((value, index) => {
      const diff = value - means[index];
      stds[index] += diff * diff;
    });
  });

  for (let i = 0; i < featureCount; i += 1) {
    stds[i] = Math.sqrt(stds[i] / samples.length) || 1;
  }

  const normalized = samples.map(sample =>
    sample.map((value, index) => (value - means[index]) / stds[index])
  );

  return { normalized, means, stds };
}

function trainLinearRegression(samples, labels, options = {}) {
  const learningRate = options.learningRate ?? 0.02;
  const iterations = options.iterations ?? 500;
  const lambda = options.lambda ?? 0.001;

  const { normalized, means, stds } = standardizeSamples(samples);
  const featureCount = normalized[0]?.length ?? 0;
  const weights = new Array(featureCount + 1).fill(0);

  const n = normalized.length;

  for (let iter = 0; iter < iterations; iter += 1) {
    const gradients = new Array(featureCount + 1).fill(0);

    for (let i = 0; i < n; i += 1) {
      const x = normalized[i];
      let prediction = weights[0];
      for (let j = 0; j < featureCount; j += 1) {
        prediction += weights[j + 1] * x[j];
      }
      const error = prediction - labels[i];
      gradients[0] += error;
      for (let j = 0; j < featureCount; j += 1) {
        gradients[j + 1] += error * x[j];
      }
    }

    weights[0] -= (learningRate * gradients[0]) / n;
    for (let j = 0; j < featureCount; j += 1) {
      const regularization = lambda * weights[j + 1];
      weights[j + 1] -= (learningRate * (gradients[j + 1] / n + regularization));
    }
  }

  return { weights, means, stds };
}

function predictWithModel(model, sample) {
  const { weights, means, stds } = model;
  let prediction = weights[0];

  for (let i = 0; i < sample.length; i += 1) {
    const normalized = (sample[i] - means[i]) / stds[i];
    prediction += weights[i + 1] * normalized;
  }

  return prediction;
}

function buildAnalyticsMap(analyticsDocs) {
  const map = new Map();
  analyticsDocs.forEach(doc => {
    const dateKey = getDateKey(getStartOfDay(doc.date));
    map.set(dateKey, doc);
  });
  return map;
}

function calculateAnalyticsAverages(analyticsDocs) {
  if (analyticsDocs.length === 0) {
    return {
      ordersTotal: 0,
      revenueTotal: 0,
      topItemsQuantity: 0,
      topItemsRevenue: 0,
    };
  }

  const totals = analyticsDocs.reduce(
    (acc, doc) => {
      acc.ordersTotal += doc.orders?.total || 0;
      acc.revenueTotal += doc.revenue?.total || 0;
      const topSummary = summarizeTopItems(doc.topItems);
      acc.topItemsQuantity += topSummary.quantity;
      acc.topItemsRevenue += topSummary.revenue;
      return acc;
    },
    { ordersTotal: 0, revenueTotal: 0, topItemsQuantity: 0, topItemsRevenue: 0 }
  );

  return {
    ordersTotal: totals.ordersTotal / analyticsDocs.length,
    revenueTotal: totals.revenueTotal / analyticsDocs.length,
    topItemsQuantity: totals.topItemsQuantity / analyticsDocs.length,
    topItemsRevenue: totals.topItemsRevenue / analyticsDocs.length,
  };
}

function buildTrainingSamples(item, analyticsMap, menuStats, averages) {
  const samples = [];
  const labels = [];

  item.dailyUsage.forEach(entry => {
    const entryDate = getStartOfDay(entry.date);
    const analytics = analyticsMap.get(getDateKey(entryDate));
    const features = buildFeatureVector({
      date: entryDate,
      analytics,
      menuStats,
      averages,
    });
    samples.push(features);
    labels.push((entry.used || 0) + (entry.wasted || 0));
  });

  return { samples, labels };
}

function predictFutureUsage({
  model,
  fallbackDaily,
  forecastDays,
  analyticsAverages,
  menuStats,
}) {
  const predictions = [];
  const today = getStartOfDay(new Date());

  for (let i = 1; i <= forecastDays; i += 1) {
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + i);

    const features = buildFeatureVector({
      date: futureDate,
      analytics: null,
      menuStats,
      averages: analyticsAverages,
    });

    const rawPrediction = model
      ? predictWithModel(model, features)
      : fallbackDaily;

    predictions.push(Math.max(0, rawPrediction));
  }

  return predictions;
}

async function forecastInventory({
  historyDays = DEFAULT_HISTORY_DAYS,
  forecastDays = DEFAULT_FORECAST_DAYS,
} = {}) {
  const historyStart = new Date();
  historyStart.setDate(historyStart.getDate() - historyDays);
  historyStart.setHours(0, 0, 0, 0);

  const [analyticsDocs, menuItems, inventoryItems] = await Promise.all([
    Analytics.find({ date: { $gte: historyStart } }).sort({ date: 1 }),
    MenuItem.find({}),
    Inventory.find({}),
  ]);

  const analyticsMap = buildAnalyticsMap(analyticsDocs);
  const analyticsAverages = calculateAnalyticsAverages(analyticsDocs.slice(-7));
  const menuStats = getMenuStats(menuItems);

  const results = inventoryItems.map(item => {
    const { samples, labels } = buildTrainingSamples(item, analyticsMap, menuStats, analyticsAverages);
    let model = null;
    let confidence = 'low';

    if (samples.length >= MIN_SAMPLES) {
      model = trainLinearRegression(samples, labels);
      confidence = samples.length >= 30 ? 'high' : 'medium';
    }

    const fallbackDaily = labels.length > 0
      ? labels.reduce((sum, value) => sum + value, 0) / labels.length
      : 0;

    const dailyPredictions = predictFutureUsage({
      model,
      fallbackDaily,
      forecastDays,
      analyticsAverages,
      menuStats,
    });

    const predictedTotal = dailyPredictions.reduce((sum, value) => sum + value, 0);
    const predictedDaily = dailyPredictions.length > 0
      ? predictedTotal / dailyPredictions.length
      : 0;

    const safetyStock = Math.max(item.reorderLevel || 0, Math.ceil(predictedDaily * 2));
    const recommendedRestockQty = Math.max(0, Math.ceil(predictedTotal + safetyStock - item.quantity));

    return {
      id: item._id,
      itemName: item.itemName,
      unit: item.unit,
      currentQty: item.quantity,
      predictedDailyDemand: Math.ceil(predictedDaily),
      predictedTotalDemand: Math.ceil(predictedTotal),
      recommendedRestockQty,
      confidence,
      expiryDate: item.expiryDate || null,
    };
  });

  return {
    forecastDays,
    menuCoverage: {
      totalItems: menuStats.totalCount,
      availableItems: menuStats.availableCount,
    },
    avgCustomers: Math.round(analyticsAverages.ordersTotal),
    dataPointsUsed: analyticsDocs.length,
    results,
  };
}

module.exports = {
  forecastInventory,
};
