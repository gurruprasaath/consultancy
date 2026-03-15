/**
 * Forecast Data Seeder
 * Adds historical analytics + inventory usage without wiping data
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Analytics = require('./models/Analytics');
const Inventory = require('./models/Inventory');
const MenuItem = require('./models/MenuItem');

const HISTORY_DAYS = 60;
const USAGE_DAYS = 30;

const SAMPLE_MENU = [
  { name: 'Butter Chicken', category: 'mains', price: 350, isAvailable: true, spiceLevel: 'medium' },
  { name: 'Paneer Tikka', category: 'starters', price: 280, isAvailable: true, spiceLevel: 'medium' },
  { name: 'Biryani', category: 'mains', price: 300, isAvailable: true, spiceLevel: 'medium' },
  { name: 'Garlic Naan', category: 'breads', price: 50, isAvailable: true, spiceLevel: 'mild' },
  { name: 'Dal Makhani', category: 'mains', price: 200, isAvailable: true, spiceLevel: 'mild' },
  { name: 'Roti', category: 'breads', price: 20, isAvailable: true, spiceLevel: 'mild' },
  { name: 'Raita', category: 'sides', price: 80, isAvailable: true, spiceLevel: 'mild' },
];

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');
};

function getStartOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function randomBetween(min, max) {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

async function seedMenuItems() {
  const existing = await MenuItem.countDocuments();
  if (existing > 0) {
    console.log('Menu items already exist, skipping');
    return;
  }
  await MenuItem.insertMany(SAMPLE_MENU);
  console.log('Menu items inserted');
}

async function seedAnalytics() {
  const today = getStartOfDay(new Date());
  const menuItems = await MenuItem.find();
  const topNames = menuItems.slice(0, 3).map(item => item.name);

  for (let i = HISTORY_DAYS; i >= 1; i -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);

    const existing = await Analytics.findOne({ date: day });
    if (existing) {
      continue;
    }

    const dayOfWeek = day.getDay();
    const baseOrders = dayOfWeek === 0 || dayOfWeek === 6 ? 35 : 25;
    const ordersTotal = Math.max(10, Math.round(baseOrders + randomBetween(-8, 12)));
    const averageValue = randomBetween(350, 550);
    const revenueTotal = Math.round(ordersTotal * averageValue);

    const topItems = topNames.map((name, index) => {
      const quantity = Math.max(3, Math.round((ordersTotal / 3) + randomBetween(-3, 5)));
      const revenue = Math.round(quantity * (menuItems[index]?.price || 200));
      return { name, quantity, revenue };
    });

    await Analytics.create({
      date: day,
      revenue: {
        total: revenueTotal,
        cash: Math.round(revenueTotal * 0.25),
        card: Math.round(revenueTotal * 0.35),
        upi: Math.round(revenueTotal * 0.3),
        online: Math.round(revenueTotal * 0.1),
      },
      orders: {
        total: ordersTotal,
        completed: ordersTotal,
        cancelled: 0,
        averageValue,
      },
      topItems,
      peakHours: [
        { hour: 12, orders: Math.round(ordersTotal * 0.4), revenue: Math.round(revenueTotal * 0.4) },
        { hour: 14, orders: Math.round(ordersTotal * 0.25), revenue: Math.round(revenueTotal * 0.25) },
        { hour: 20, orders: Math.round(ordersTotal * 0.35), revenue: Math.round(revenueTotal * 0.35) },
      ],
      complaints: {
        total: 0,
        resolved: 0,
        pending: 0,
      },
      inventory: {
        lowStockItems: 0,
        totalWaste: 0,
      },
    });
  }

  console.log('Analytics history ensured');
}

async function seedInventoryUsage() {
  const items = await Inventory.find();
  const today = getStartOfDay(new Date());

  for (const item of items) {
    const existingMap = new Map(
      item.dailyUsage.map(entry => [dateKey(getStartOfDay(entry.date)), entry])
    );

    for (let i = USAGE_DAYS; i >= 1; i -= 1) {
      const day = new Date(today);
      day.setDate(today.getDate() - i);
      const key = dateKey(day);

      if (existingMap.has(key)) {
        continue;
      }

      const baseUsage = Math.max(1, (item.reorderLevel || 10) * 0.7);
      const used = randomBetween(baseUsage * 0.7, baseUsage * 1.4);
      const wasted = randomBetween(0, baseUsage * 0.1);

      item.dailyUsage.push({
        date: day,
        used,
        wasted,
      });
    }

    if (item.dailyUsage.length > 60) {
      item.dailyUsage = item.dailyUsage.slice(-60);
    }

    await item.save();
  }

  console.log('Inventory daily usage ensured');
}

async function run() {
  try {
    await connectDB();
    await seedMenuItems();
    await seedAnalytics();
    await seedInventoryUsage();
    console.log('Forecast seed completed');
    process.exit(0);
  } catch (error) {
    console.error('Forecast seed failed:', error.message);
    process.exit(1);
  }
}

run();
