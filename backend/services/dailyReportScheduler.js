/**
 * Daily Report Scheduler
 * Uses node-cron to send the owner a full business report at 11:59 PM every day
 * Runs in IST (UTC+5:30) — cron uses server local time
 */

const cron = require('node-cron');
const Order = require('../models/Order');
const User = require('../models/User');
const { sendDailyReport } = require('../services/emailService');

/**
 * Compile today's data into a report object
 */
async function compileDailyReport() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const orders = await Order.find({
    createdAt: { $gte: start, $lte: end },
  }).populate('createdBy', 'name email').lean();

  if (orders.length === 0) {
    return null; // No orders today — skip report
  }

  // Revenue totals
  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const totalGst = orders.reduce((s, o) => s + (o.gst || 0), 0);
  const totalDiscount = orders.reduce((s, o) => s + (o.discountAmount || 0), 0);
  const netRevenue = totalRevenue - totalGst;
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Payment breakdown
  const paymentMap = {};
  for (const o of orders) {
    const method = o.paymentMethod || 'cash';
    if (!paymentMap[method]) paymentMap[method] = { count: 0, amount: 0 };
    paymentMap[method].count += 1;
    paymentMap[method].amount += o.total || 0;
  }

  // Top selling items
  const itemMap = {};
  let totalItemsSold = 0;
  for (const o of orders) {
    for (const item of (o.items || [])) {
      if (!itemMap[item.name]) itemMap[item.name] = { name: item.name, quantity: 0, revenue: 0 };
      itemMap[item.name].quantity += item.quantity;
      itemMap[item.name].revenue += item.total || 0;
      totalItemsSold += item.quantity;
    }
  }
  const topItems = Object.values(itemMap).sort((a, b) => b.quantity - a.quantity);

  // Cashier breakdown
  const cashierMap = {};
  for (const o of orders) {
    const name = o.createdBy?.name || o.createdBy?.email || 'Unknown';
    if (!cashierMap[name]) cashierMap[name] = { name, orders: 0, revenue: 0 };
    cashierMap[name].orders += 1;
    cashierMap[name].revenue += o.total || 0;
  }
  const cashierBreakdown = Object.values(cashierMap).sort((a, b) => b.revenue - a.revenue);

  const dateStr = now.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return {
    date: dateStr,
    totalOrders,
    totalRevenue,
    totalGst,
    totalDiscount,
    netRevenue,
    avgOrderValue,
    totalItemsSold,
    cashOrders: paymentMap['cash'] || { count: 0, amount: 0 },
    cardOrders: paymentMap['card'] || { count: 0, amount: 0 },
    upiOrders: paymentMap['upi'] || { count: 0, amount: 0 },
    topItems,
    cashierBreakdown,
  };
}

/**
 * Start the cron job
 * Fires at 23:59 every day (server local time)
 * If server is in UTC, adjust: '29 18 * * *' for IST 23:59
 */
function startDailyReportScheduler() {
  // '59 23 * * *' = 11:59 PM every day (local server time)
  cron.schedule('59 23 * * *', async () => {
    console.log('📊 Running daily report job...');
    try {
      const report = await compileDailyReport();
      if (!report) {
        console.log('📊 No orders today — skipping daily report email.');
        return;
      }
      const result = await sendDailyReport(report);
      if (result.sent) {
        console.log(`📊 Daily report sent to owner for ${report.date}`);
      } else {
        console.warn('📊 Daily report email failed:', result.error);
      }
    } catch (err) {
      console.error('📊 Daily report job error:', err.message);
    }
  }, {
    timezone: 'Asia/Kolkata', // IST
  });

  console.log('📊 Daily report scheduler started — fires at 11:59 PM IST every day');
}

module.exports = { startDailyReportScheduler, compileDailyReport };
