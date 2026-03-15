/**
 * Simple Database Seed Script
 * Creates demo users only
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

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
  try {
    console.log('👥 Creating demo users...');
    
    // Delete existing users
    await User.deleteMany({});
    
    // Create users
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@food7.com',
      password: 'admin123',
      role: 'admin',
    });
    console.log('✅ Admin created:', admin.email);
    
    const manager = await User.create({
      name: 'Manager User',
      email: 'manager@food7.com',
      password: 'manager123',
      role: 'manager',
    });
    console.log('✅ Manager created:', manager.email);
    
    const staff = await User.create({
      name: 'Staff User',
      email: 'staff@food7.com',
      password: 'staff123',
      role: 'staff',
    });
    console.log('✅ Staff created:', staff.email);
    
    console.log('\n✅ All users created successfully!');
    console.log('\n📝 You can now login with:');
    console.log('   Admin: admin@food7.com / admin123');
    console.log('   Manager: manager@food7.com / manager123');
    console.log('   Staff: staff@food7.com / staff123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }
};

const seed = async () => {
  await connectDB();
  await seedUsers();
};

seed();
