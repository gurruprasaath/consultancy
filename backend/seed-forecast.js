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
  { 
    name: 'Butter Chicken', 
    category: 'mains', 
    price: 350, 
    isAvailable: true, 
    spiceLevel: 'medium',
    isVeg: false,
    // Recipe: Chicken, Spices, Cooking Oil, Milk (for cream)
    ingredients: [
      { itemName: 'Chicken', quantity: 0.3, unit: 'kg' },
      { itemName: 'Spices Mix', quantity: 0.05, unit: 'kg' },
      { itemName: 'Cooking Oil', quantity: 0.05, unit: 'l' },
      { itemName: 'Milk', quantity: 0.1, unit: 'l' },
    ]
  },
  { 
    name: 'Paneer Tikka', 
    category: 'starters', 
    price: 280, 
    isAvailable: true, 
    spiceLevel: 'medium',
    isVeg: true,
    // Recipe: Paneer, Spices, Cooking Oil
    ingredients: [
      { itemName: 'Paneer', quantity: 0.2, unit: 'kg' },
      { itemName: 'Spices Mix', quantity: 0.03, unit: 'kg' },
      { itemName: 'Cooking Oil', quantity: 0.03, unit: 'l' },
    ]
  },
  { 
    name: 'Mutton Biryani', 
    category: 'mains', 
    price: 300, 
    isAvailable: true, 
    spiceLevel: 'medium',
    isVeg: false,
    // Recipe: Chicken (as mutton substitute), Rice, Spices, Cooking Oil, Onions, Tomatoes
    ingredients: [
      { itemName: 'Chicken', quantity: 0.25, unit: 'kg' },
      { itemName: 'Rice', quantity: 0.3, unit: 'kg' },
      { itemName: 'Spices Mix', quantity: 0.04, unit: 'kg' },
      { itemName: 'Cooking Oil', quantity: 0.04, unit: 'l' },
      { itemName: 'Onions', quantity: 0.1, unit: 'kg' },
      { itemName: 'Tomatoes', quantity: 0.08, unit: 'kg' },
    ]
  },
  { 
    name: 'Garlic Naan', 
    category: 'breads', 
    price: 50, 
    isAvailable: true, 
    spiceLevel: 'mild',
    isVeg: true,
    // Recipe: Flour, Milk, Cooking Oil
    ingredients: [
      { itemName: 'Flour', quantity: 0.1, unit: 'kg' },
      { itemName: 'Milk', quantity: 0.05, unit: 'l' },
      { itemName: 'Cooking Oil', quantity: 0.02, unit: 'l' },
    ]
  },
  { 
    name: 'Dal Makhani', 
    category: 'mains', 
    price: 200, 
    isAvailable: true, 
    spiceLevel: 'mild',
    isVeg: true,
    // Recipe: Spices, Cooking Oil, Milk, Tomatoes
    ingredients: [
      { itemName: 'Spices Mix', quantity: 0.03, unit: 'kg' },
      { itemName: 'Cooking Oil', quantity: 0.03, unit: 'l' },
      { itemName: 'Milk', quantity: 0.08, unit: 'l' },
      { itemName: 'Tomatoes', quantity: 0.05, unit: 'kg' },
    ]
  },
  { 
    name: 'Roti', 
    category: 'breads', 
    price: 20, 
    isAvailable: true, 
    spiceLevel: 'mild',
    isVeg: true,
    // Recipe: Flour, Cooking Oil
    ingredients: [
      { itemName: 'Flour', quantity: 0.05, unit: 'kg' },
      { itemName: 'Cooking Oil', quantity: 0.01, unit: 'l' },
    ]
  },
  { 
    name: 'Raita', 
    category: 'sides', 
    price: 80, 
    isAvailable: true, 
    spiceLevel: 'mild',
    isVeg: true,
    // Recipe: Milk, Spices
    ingredients: [
      { itemName: 'Milk', quantity: 0.15, unit: 'l' },
      { itemName: 'Spices Mix', quantity: 0.01, unit: 'kg' },
    ]
  },
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
  // Get all inventory items to link ingredients
  const inventoryItems = await Inventory.find({});
  const inventoryMap = new Map(inventoryItems.map(item => [item.itemName, item]));

  for (const menuData of SAMPLE_MENU) {
    const existing = await MenuItem.findOne({ name: menuData.name });
    if (existing) {
      // Update existing menu item with ingredients
      const ingredients = menuData.ingredients
        .map(ing => {
          const invItem = inventoryMap.get(ing.itemName);
          if (invItem) {
            return {
              inventoryItem: invItem._id,
              quantity: ing.quantity,
              unit: ing.unit,
            };
          }
          return null;
        })
        .filter(Boolean);
      
      existing.ingredients = ingredients;
      await existing.save();
    } else {
      // Create new menu item with ingredients
      const ingredients = menuData.ingredients
        .map(ing => {
          const invItem = inventoryMap.get(ing.itemName);
          if (invItem) {
            return {
              inventoryItem: invItem._id,
              quantity: ing.quantity,
              unit: ing.unit,
            };
          }
          return null;
        })
        .filter(Boolean);

      await MenuItem.create({
        name: menuData.name,
        category: menuData.category,
        price: menuData.price,
        isAvailable: menuData.isAvailable,
        spiceLevel: menuData.spiceLevel,
        isVeg: menuData.isVeg,
        ingredients,
      });
    }
  }
  console.log('Menu items inserted/updated with recipes');
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
  const menuItems = await MenuItem.find().populate('ingredients.inventoryItem');
  const today = getStartOfDay(new Date());

  // Calculate daily usage based on simulated menu orders
  for (let i = USAGE_DAYS; i >= 1; i -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    const key = dateKey(day);

    // Simulate orders for this day based on analytics
    const dayOfWeek = day.getDay();
    const baseOrders = dayOfWeek === 0 || dayOfWeek === 6 ? 35 : 25;
    const numOrders = Math.max(10, Math.round(baseOrders + randomBetween(-8, 12)));

    // Track usage per inventory item for this day
    const dailyUsageMap = new Map();

    // Simulate orders
    for (let orderIdx = 0; orderIdx < numOrders; orderIdx++) {
      // Pick a random menu item
      const menuItem = menuItems[Math.floor(Math.random() * menuItems.length)];
      if (!menuItem.ingredients || menuItem.ingredients.length === 0) continue;

      // Each order has 1-3 items of this menu item
      const qtyPerOrder = Math.floor(randomBetween(1, 3.5));

      // Add ingredient usage
      for (const ingredient of menuItem.ingredients) {
        if (!ingredient.inventoryItem) continue;
        
        const invId = ingredient.inventoryItem._id.toString();
        const usedQty = ingredient.quantity * qtyPerOrder;
        
        if (dailyUsageMap.has(invId)) {
          dailyUsageMap.get(invId).used += usedQty;
        } else {
          dailyUsageMap.set(invId, { used: usedQty, wasted: 0 });
        }
      }
    }

    // Add some random waste (5-15% of usage)
    for (const [invId, usage] of dailyUsageMap) {
      usage.wasted = usage.used * randomBetween(0.05, 0.15);
    }

    // Update each inventory item with this day's usage
    for (const item of items) {
      const existingMap = new Map(
        item.dailyUsage.map(entry => [dateKey(getStartOfDay(entry.date)), entry])
      );

      if (existingMap.has(key)) {
        continue;
      }

      const invId = item._id.toString();
      const usage = dailyUsageMap.get(invId) || { used: randomBetween(0.5, 2), wasted: randomBetween(0, 0.5) };

      item.dailyUsage.push({
        date: day,
        used: Math.round(usage.used * 100) / 100,
        wasted: Math.round(usage.wasted * 100) / 100,
      });

      if (item.dailyUsage.length > 60) {
        item.dailyUsage = item.dailyUsage.slice(-60);
      }

      await item.save();
    }
  }

  console.log('Inventory daily usage ensured (based on simulated menu orders)');
}

async function run() {
  try {
    await connectDB();
    // Seed menu items first (with recipes) so inventory usage can be calculated
    await seedMenuItems();
    // Then seed inventory usage based on simulated menu orders
    await seedInventoryUsage();
    // Finally seed analytics
    await seedAnalytics();
    console.log('Forecast seed completed');
    process.exit(0);
  } catch (error) {
    console.error('Forecast seed failed:', error.message);
    process.exit(1);
  }
}

run();
