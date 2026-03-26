/**
 * Database Seed Script
 * Populates database with demo data for testing
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Order = require('./models/Order');
const Inventory = require('./models/Inventory');
const Analytics = require('./models/Analytics');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const seedUsers = async () => {
  console.log('👥 Seeding users...');
  
  const users = [
    {
      name: 'Admin User',
      email: 'admin@food7.com',
      password: 'admin123',
      role: 'admin',
    },
    {
      name: 'Manager User',
      email: 'manager@food7.com',
      password: 'manager123',
      role: 'manager',
    },
    {
      name: 'Staff User',
      email: 'staff@food7.com',
      password: 'staff123',
      role: 'staff',
    },
  ];

  await User.deleteMany({});
  await User.create(users);
  console.log('✅ Users created');
};

const seedInventory = async () => {
  console.log('📦 Seeding inventory...');

  const now = new Date();
  const day = 24 * 60 * 60 * 1000; // ms per day

  const items = [
    // Already expired (2 days ago)
    { itemName: 'Chicken',     category: 'meat',      quantity: 50,  unit: 'kg',     price: 200, reorderLevel: 10, expiryDate: new Date(now.getTime() - 2  * day) },
    // Expires today
    { itemName: 'Rice',        category: 'other',     quantity: 100, unit: 'kg',     price: 50,  reorderLevel: 20, expiryDate: new Date(now.getTime() + 0  * day) },
    // Expiring in 3 days
    { itemName: 'Tomatoes',    category: 'vegetables',quantity: 30,  unit: 'kg',     price: 40,  reorderLevel: 10, expiryDate: new Date(now.getTime() + 3  * day) },
    // Expiring in 6 days
    { itemName: 'Onions',      category: 'vegetables',quantity: 25,  unit: 'kg',     price: 30,  reorderLevel: 10, expiryDate: new Date(now.getTime() + 6  * day) },
    // Expiring in 5 days
    { itemName: 'Paneer',      category: 'dairy',     quantity: 15,  unit: 'kg',     price: 300, reorderLevel: 5,  expiryDate: new Date(now.getTime() + 5  * day) },
    // Expiring in 2 days
    { itemName: 'Milk',        category: 'dairy',     quantity: 40,  unit: 'l',      price: 60,  reorderLevel: 10, expiryDate: new Date(now.getTime() + 2  * day) },
    // Healthy – 6 months out
    { itemName: 'Spices Mix',  category: 'spices',    quantity: 20,  unit: 'kg',     price: 500, reorderLevel: 5,  expiryDate: new Date(now.getTime() + 180 * day) },
    // Healthy – 1 year out
    { itemName: 'Cooking Oil', category: 'other',     quantity: 50,  unit: 'l',      price: 150, reorderLevel: 10, expiryDate: new Date(now.getTime() + 365 * day) },
    // Healthy – 9 months out
    { itemName: 'Flour',       category: 'other',     quantity: 80,  unit: 'kg',     price: 40,  reorderLevel: 15, expiryDate: new Date(now.getTime() + 270 * day) },
    // No expiry date (beverages often have shelf-life stamped on can)
    { itemName: 'Soft Drinks', category: 'beverages', quantity: 100, unit: 'pieces', price: 30,  reorderLevel: 20, expiryDate: new Date(now.getTime() + 120 * day) },
  ];

  await Inventory.deleteMany({});
  await Inventory.create(items);
  console.log('✅ Inventory items created');
};

const seedOrders = async () => {
  console.log('🛒 Seeding orders...');
  
  const users = await User.find();
  const today = new Date();
  
  await Order.deleteMany({});
  
  // Create orders one by one to allow pre-save hook to work
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;

  const order1 = new Order({
    orderNumber: `F7-${dateStr}-1001`,
    items: [
      { name: 'Butter Chicken', quantity: 2, price: 350, total: 700 },
      { name: 'Garlic Naan', quantity: 4, price: 50, total: 200 },
    ],
    subtotal: 900,
    gst: 45,
    total: 945,
    paymentMethod: 'upi',
    status: 'completed',
    customerName: 'Rajesh Kumar',
    customerPhone: '9876543210',
    tableNumber: 'T1',
    createdBy: users[0]._id,
    createdAt: today,
  });
  await order1.save();

  const order2 = new Order({
    orderNumber: `F7-${dateStr}-1002`,
    items: [
      { name: 'Biryani', quantity: 1, price: 300, total: 300 },
      { name: 'Raita', quantity: 1, price: 80, total: 80 },
    ],
    subtotal: 380,
    gst: 19,
    total: 399,
    paymentMethod: 'cash',
    status: 'completed',
    customerName: 'Priya Sharma',
    customerPhone: '9876543211',
    tableNumber: 'T2',
    createdBy: users[2]._id,
    createdAt: new Date(today.getTime() - 2 * 60 * 60 * 1000),
  });
  await order2.save();

  const order3 = new Order({
    orderNumber: `F7-${dateStr}-1003`,
    items: [
      { name: 'Paneer Tikka', quantity: 1, price: 280, total: 280 },
      { name: 'Dal Makhani', quantity: 1, price: 200, total: 200 },
      { name: 'Roti', quantity: 6, price: 20, total: 120 },
    ],
    subtotal: 600,
    gst: 30,
    total: 630,
    paymentMethod: 'card',
    status: 'completed',
    customerName: 'Amit Patel',
    customerPhone: '9876543212',
    tableNumber: 'T3',
    createdBy: users[2]._id,
    createdAt: new Date(today.getTime() - 4 * 60 * 60 * 1000),
  });
  await order3.save();
  
  console.log('✅ Orders created');
};

const seedAnalytics = async () => {
  console.log('📊 Seeding analytics...');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const analytics = {
    date: today,
    revenue: {
      total: 1974,
      cash: 399,
      card: 630,
      upi: 945,
      online: 0,
    },
    orders: {
      total: 3,
      completed: 3,
      cancelled: 0,
      averageValue: 658,
    },
    topItems: [
      { name: 'Butter Chicken', quantity: 2, revenue: 700 },
      { name: 'Garlic Naan', quantity: 4, revenue: 200 },
      { name: 'Biryani', quantity: 1, revenue: 300 },
    ],
    peakHours: [
      { hour: 12, orders: 1, revenue: 945 },
      { hour: 14, orders: 1, revenue: 399 },
      { hour: 19, orders: 1, revenue: 630 },
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
    aiInsights: {
      salesTrend: 'stable',
      recommendations: [
        '🎉 Excellent start! Keep up the good service',
        '🔥 Butter Chicken is trending - ensure adequate stock',
        '✅ Zero complaints today - great customer service!',
      ],
      predictions: 'Revenue expected to increase during dinner hours',
    },
  };

  await Analytics.deleteMany({});
  await Analytics.create(analytics);
  console.log('✅ Analytics created');
};

const seed = async () => {
  try {
    await connectDB();
    
    console.log('🌱 Starting database seed...\n');
    
    await seedUsers();
    await seedInventory();
    await seedOrders();
    await seedAnalytics();
    
    console.log('\n✅ Database seeded successfully!');
    console.log('\n📝 You can now login with:');
    console.log('   Admin: admin@food7.com / admin123');
    console.log('   Manager: manager@food7.com / manager123');
    console.log('   Staff: staff@food7.com / staff123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seed();
