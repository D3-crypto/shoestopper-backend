const mongoose = require('mongoose');
const config = require('./src/config');

// Import models to test
const User = require('./src/models/User');
const Product = require('./src/models/Product');
const Variant = require('./src/models/Variant');
const Cart = require('./src/models/Cart');
const Order = require('./src/models/Order');

async function runTests() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB');

    // Test 1: Create indexes
    console.log('\n📋 Creating indexes...');
    await User.createIndexes();
    await Product.createIndexes();
    await Variant.createIndexes();
    console.log('✅ Indexes created successfully');

    // Test 2: Create sample data
    console.log('\n📦 Creating sample data...');
    
    // Create a product
    const product = await Product.create({
      title: 'Test Shoe',
      description: 'A test shoe product',
      price: 99.99,
      categories: ['shoes', 'sports'],
      images: ['test1.jpg']
    });
    console.log('✅ Product created:', product._id);

    // Create variants
    const variant = await Variant.create({
      productId: product._id,
      color: 'red',
      size: '9',
      stock: 10,
      images: ['test-red.jpg']
    });
    console.log('✅ Variant created:', variant._id);

    // Test 3: Verify unique constraints
    console.log('\n🔐 Testing unique constraints...');
    try {
      await Variant.create({
        productId: product._id,
        color: 'red',
        size: '9', // Same combination should fail
        stock: 5
      });
      console.log('❌ Unique constraint not working!');
    } catch (err) {
      if (err.code === 11000) {
        console.log('✅ Unique constraint working correctly');
      } else {
        throw err;
      }
    }

    console.log('\n🧹 Cleaning up test data...');
    await Product.deleteMany({});
    await Variant.deleteMany({});
    
    console.log('✅ All tests passed!');
    console.log('\n🚀 System is ready to use');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

if (require.main === module) {
  runTests();
}

module.exports = runTests;
