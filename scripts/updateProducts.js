const mongoose = require('mongoose');
const Product = require('../src/models/Product');
require('dotenv').config();

async function updateExistingProducts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shoestopper');
    console.log('Connected to MongoDB');

    // Update all existing products to have isActive: true if not set
    const result = await Product.updateMany(
      { isActive: { $exists: false } }, // Products without isActive field
      { $set: { isActive: true } }       // Set isActive to true
    );

    console.log(`Updated ${result.modifiedCount} products with isActive: true`);

    // Also ensure all products have proper indexes
    const allProducts = await Product.find({});
    console.log(`Total products in database: ${allProducts.length}`);
    
    const featuredProducts = await Product.find({ featured: true });
    console.log(`Featured products: ${featuredProducts.length}`);

    const activeProducts = await Product.find({ isActive: true });
    console.log(`Active products: ${activeProducts.length}`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error updating products:', error);
    process.exit(1);
  }
}

updateExistingProducts();