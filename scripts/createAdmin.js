const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../src/models/User');
const config = require('../src/config');

async function createAdmin() {
  try {
    // Connect to database
    await mongoose.connect(config.mongodb.uri);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@shoestopper.com' });
    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Email: admin@shoestopper.com');
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@shoestopper.com',
      password: hashedPassword,
      phone: '+1234567890',
      verified: true, // Skip email verification for admin
      isAdmin: true // Add admin flag
    });

    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@shoestopper.com');
    console.log('Password: admin123');
    console.log('');
    console.log('⚠️  Please change the password after first login!');
    
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createAdmin();
