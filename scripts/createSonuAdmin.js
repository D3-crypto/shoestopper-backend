const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../src/models/User');
const config = require('../src/config');

async function createSonuAdmin() {
  try {
    // Connect to database
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'flamethe06@gmail.com' });
    if (existingAdmin) {
      // Update existing user to admin
      await User.findOneAndUpdate(
        { email: 'flamethe06@gmail.com' }, 
        { 
          isAdmin: true,
          verified: true,
          name: 'sonu'
        }
      );
      console.log('✅ Existing user updated to admin!');
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash('babubhaiya', 12);
      const adminUser = await User.create({
        name: 'sonu',
        email: 'flamethe06@gmail.com',
        password: hashedPassword,
        phone: '1234567890',
        verified: true,
        isAdmin: true
      });
      console.log('✅ New admin user created successfully!');
    }

    console.log('Admin Details:');
    console.log('Name: sonu');
    console.log('Email: flamethe06@gmail.com');
    console.log('Password: babubhaiya');
    console.log('Phone: 1234567890');
    
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createSonuAdmin();
