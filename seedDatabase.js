const mongoose = require('mongoose');
const Product = require('./src/models/Product');
const Variant = require('./src/models/Variant');
const config = require('./src/config');

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const products = [
  {
    title: 'Nike Air Max 270',
    description: 'The Nike Air Max 270 delivers visible Max Air cushioning under every step. The sleek upper features mesh and synthetic materials for breathability and durability. Perfect for running and casual wear.',
    price: 150,
    categories: ['Running', 'Sports', 'Casual'],
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500'
    ],
    featured: true,
    variants: [
      { size: '8', color: 'Black', price: 150, stock: 25, images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500'] },
      { size: '8', color: 'White', price: 150, stock: 20, images: ['https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500'] },
      { size: '9', color: 'Black', price: 150, stock: 30, images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500'] },
      { size: '9', color: 'White', price: 150, stock: 18, images: ['https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500'] },
      { size: '10', color: 'Black', price: 150, stock: 22, images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500'] },
      { size: '10', color: 'White', price: 150, stock: 15, images: ['https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500'] },
      { size: '11', color: 'Black', price: 150, stock: 12, images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500'] }
    ]
  },
  {
    title: 'Adidas Ultraboost 22',
    description: 'Experience endless energy with these running shoes. The adidas Ultraboost 22 features responsive Boost midsole and a sock-like fit for maximum comfort during long runs.',
    price: 180,
    categories: ['Running', 'Sports'],
    images: [
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500',
      'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=500'
    ],
    featured: true,
    variants: [
      { size: '7', color: 'Blue', price: 180, stock: 12, images: ['https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500'] },
      { size: '8', color: 'Blue', price: 180, stock: 20, images: ['https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500'] },
      { size: '8', color: 'Gray', price: 180, stock: 18, images: ['https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=500'] },
      { size: '9', color: 'Blue', price: 180, stock: 25, images: ['https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500'] },
      { size: '9', color: 'Gray', price: 180, stock: 22, images: ['https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=500'] },
      { size: '10', color: 'Blue', price: 180, stock: 15, images: ['https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500'] },
      { size: '11', color: 'Gray', price: 180, stock: 8, images: ['https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=500'] }
    ]
  },
  {
    title: 'Converse Chuck Taylor All Star',
    description: 'Classic canvas sneakers that never go out of style. The Chuck Taylor All Star features the iconic design with durable canvas upper and rubber sole.',
    price: 65,
    categories: ['Casual', 'Classic'],
    images: [
      'https://images.unsplash.com/photo-1605812860427-4024433a70fd?w=500',
      'https://images.unsplash.com/photo-1552066344-2464c1135c32?w=500'
    ],
    featured: false,
    variants: [
      { size: '7', color: 'Red', price: 65, stock: 30, images: ['https://images.unsplash.com/photo-1605812860427-4024433a70fd?w=500'] },
      { size: '8', color: 'Red', price: 65, stock: 35, images: ['https://images.unsplash.com/photo-1605812860427-4024433a70fd?w=500'] },
      { size: '8', color: 'Black', price: 65, stock: 40, images: ['https://images.unsplash.com/photo-1552066344-2464c1135c32?w=500'] },
      { size: '9', color: 'Red', price: 65, stock: 28, images: ['https://images.unsplash.com/photo-1605812860427-4024433a70fd?w=500'] },
      { size: '9', color: 'Black', price: 65, stock: 32, images: ['https://images.unsplash.com/photo-1552066344-2464c1135c32?w=500'] },
      { size: '10', color: 'Black', price: 65, stock: 25, images: ['https://images.unsplash.com/photo-1552066344-2464c1135c32?w=500'] }
    ]
  },
  {
    title: 'Vans Old Skool',
    description: 'The iconic side-stripe skate shoe. Vans Old Skool combines style and durability with canvas and suede uppers, perfect for skateboarding and street style.',
    price: 75,
    categories: ['Casual', 'Skateboarding'],
    images: [
      'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=500',
      'https://images.unsplash.com/photo-1494955464529-790775240ac6?w=500'
    ],
    featured: false,
    variants: [
      { size: '7', color: 'Black', price: 75, stock: 22, images: ['https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=500'] },
      { size: '8', color: 'Black', price: 75, stock: 30, images: ['https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=500'] },
      { size: '8', color: 'White', price: 75, stock: 25, images: ['https://images.unsplash.com/photo-1494955464529-790775240ac6?w=500'] },
      { size: '9', color: 'Black', price: 75, stock: 28, images: ['https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=500'] },
      { size: '9', color: 'White', price: 75, stock: 20, images: ['https://images.unsplash.com/photo-1494955464529-790775240ac6?w=500'] },
      { size: '10', color: 'Black', price: 75, stock: 18, images: ['https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=500'] }
    ]
  },
  {
    title: 'New Balance 990v5',
    description: 'Premium running shoes made in USA. The 990v5 features ENCAP midsole technology and premium suede and mesh upper for exceptional comfort and style.',
    price: 175,
    categories: ['Running', 'Premium'],
    images: [
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500',
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=500'
    ],
    featured: true,
    variants: [
      { size: '8', color: 'Gray', price: 175, stock: 15, images: ['https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500'] },
      { size: '8', color: 'Brown', price: 175, stock: 12, images: ['https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=500'] },
      { size: '9', color: 'Gray', price: 175, stock: 18, images: ['https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500'] },
      { size: '9', color: 'Brown', price: 175, stock: 10, images: ['https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=500'] },
      { size: '10', color: 'Gray', price: 175, stock: 14, images: ['https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500'] },
      { size: '11', color: 'Gray', price: 175, stock: 8, images: ['https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500'] }
    ]
  },
  {
    title: 'Puma RS-X3',
    description: 'Retro-futuristic running shoes with bold colors and chunky silhouette. Features responsive cushioning and mixed material upper for street-ready style.',
    price: 110,
    categories: ['Casual', 'Retro', 'Sports'],
    images: [
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500',
      'https://images.unsplash.com/photo-1584735175315-9d5df23860e6?w=500'
    ],
    featured: false,
    variants: [
      { size: '7', color: 'White', price: 110, stock: 20, images: ['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500'] },
      { size: '8', color: 'White', price: 110, stock: 25, images: ['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500'] },
      { size: '8', color: 'Blue', price: 110, stock: 22, images: ['https://images.unsplash.com/photo-1584735175315-9d5df23860e6?w=500'] },
      { size: '9', color: 'White', price: 110, stock: 30, images: ['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500'] },
      { size: '9', color: 'Blue', price: 110, stock: 18, images: ['https://images.unsplash.com/photo-1584735175315-9d5df23860e6?w=500'] },
      { size: '10', color: 'Blue', price: 110, stock: 15, images: ['https://images.unsplash.com/photo-1584735175315-9d5df23860e6?w=500'] }
    ]
  }
];

async function clearDatabase() {
  console.log('🗑️  Clearing existing products and variants...');
  await Product.deleteMany({});
  await Variant.deleteMany({});
  console.log('✅ Database cleared\n');
}

async function seedProducts() {
  console.log('🌱 Starting database seeding...\n');
  
  let successCount = 0;
  let totalVariants = 0;

  for (const productData of products) {
    try {
      console.log(`📦 Creating: ${productData.title}...`);
      
      // Extract variants from product data
      const variants = productData.variants;
      delete productData.variants;
      
      // Create the product
      const product = new Product(productData);
      await product.save();
      
      // Create variants for this product
      const variantPromises = variants.map(variantData => {
        const variant = new Variant({
          ...variantData,
          productId: product._id
        });
        return variant.save();
      });
      
      await Promise.all(variantPromises);
      
      successCount++;
      totalVariants += variants.length;
      
      console.log(`✅ Success! Created ${productData.title}`);
      console.log(`   - ${variants.length} variants added`);
      console.log(`   - Categories: ${productData.categories.join(', ')}`);
      console.log(`   - Featured: ${productData.featured ? 'Yes' : 'No'}\n`);
      
    } catch (error) {
      console.log(`❌ Error creating ${productData.title}:`, error.message, '\n');
    }
  }

  console.log('🎯 Seeding Summary:');
  console.log(`✅ Products created: ${successCount}/${products.length}`);
  console.log(`✅ Variants created: ${totalVariants}`);
  console.log(`📊 Total items in database: ${successCount} products with ${totalVariants} variants`);
  
  if (successCount === products.length) {
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('🔍 Your admin panel and frontend now have sample data to work with.');
  }
}

async function main() {
  try {
    await connectDB();
    await clearDatabase();
    await seedProducts();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the seeder
main();