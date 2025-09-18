const axios = require('axios');

// Admin credentials
const adminCredentials = {
  email: 'flamethe06@gmail.com',
  password: 'flame123'
};

const products = [
  {
    name: 'Nike Air Max 270',
    description: 'The Nike Air Max 270 delivers visible Max Air cushioning under every step. The sleek upper features mesh and synthetic materials for breathability and durability. Perfect for running and casual wear.',
    brand: 'Nike',
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
    name: 'Adidas Ultraboost 22',
    description: 'Experience endless energy with these running shoes. The adidas Ultraboost 22 features responsive Boost midsole and a sock-like fit for maximum comfort during long runs.',
    brand: 'Adidas',
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
    name: 'Converse Chuck Taylor All Star',
    description: 'Classic canvas sneakers that never go out of style. The Chuck Taylor All Star features the iconic design with durable canvas upper and rubber sole.',
    brand: 'Converse',
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
    name: 'Vans Old Skool',
    description: 'The iconic side-stripe skate shoe. Vans Old Skool combines style and durability with canvas and suede uppers, perfect for skateboarding and street style.',
    brand: 'Vans',
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
    name: 'New Balance 990v5',
    description: 'Premium running shoes made in USA. The 990v5 features ENCAP midsole technology and premium suede and mesh upper for exceptional comfort and style.',
    brand: 'New Balance',
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
    name: 'Puma RS-X3',
    description: 'Retro-futuristic running shoes with bold colors and chunky silhouette. Features responsive cushioning and mixed material upper for street-ready style.',
    brand: 'Puma',
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

async function getAdminToken() {
  try {
    console.log('🔐 Logging in as admin...');
    const response = await axios.post('http://localhost:4000/api/admin/login', adminCredentials);
    
    if (response.data.token) {
      console.log('✅ Admin login successful!\n');
      return response.data.token;
    } else {
      throw new Error('No token received');
    }
  } catch (error) {
    console.log('❌ Admin login failed:', error.response?.data?.error || error.message);
    return null;
  }
}

async function addProducts() {
  console.log('🚀 Starting to add sample products to database...\n');
  
  // First, get admin token
  const token = await getAdminToken();
  if (!token) {
    console.log('❌ Cannot proceed without admin authentication');
    return;
  }

  // Set up axios with authorization header
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  
  let successCount = 0;
  let errorCount = 0;

  for (const product of products) {
    try {
      console.log(`📦 Adding: ${product.name} by ${product.brand}...`);
      
      const response = await axios.post('http://localhost:4000/api/products', product, {
        headers: authHeaders
      });
      
      if (response.data.success) {
        successCount++;
        console.log(`✅ Success! Added ${product.name}`);
        console.log(`   - ${product.variants.length} variants created`);
        console.log(`   - Categories: ${product.categories.join(', ')}`);
        console.log(`   - Featured: ${product.featured ? 'Yes' : 'No'}\n`);
      } else {
        errorCount++;
        console.log(`❌ Failed to add ${product.name}: ${response.data.error || 'Unknown error'}\n`);
      }
    } catch (error) {
      errorCount++;
      console.log(`❌ Error adding ${product.name}:`);
      console.log(`   Error: ${error.response?.data?.error || error.message}\n`);
    }
  }

  console.log('🎯 Summary:');
  console.log(`✅ Successfully added: ${successCount} products`);
  console.log(`❌ Failed to add: ${errorCount} products`);
  console.log(`📊 Total attempted: ${products.length} products`);
  
  if (successCount === products.length) {
    console.log('\n🎉 All sample products have been successfully added to your database!');
    console.log('🔍 You can now view them in your admin panel or frontend.');
  }
}

// Run the script
addProducts();