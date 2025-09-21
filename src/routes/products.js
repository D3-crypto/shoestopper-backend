const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Variant = require('../models/Variant');
const RecentlyViewed = require('../models/RecentlyViewed');
const StockNotification = require('../models/StockNotification');
const { authenticateToken } = require('../middleware/auth');

// Get products by brand
router.get('/brand/:brandName', async (req, res) => {
  try {
    const { brandName } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const sortBy = req.query.sortBy || 'newest';
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = { brand: new RegExp(brandName, 'i') };

    // Add additional filters from query params
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) filter.price.$lte = parseFloat(req.query.maxPrice);
    }

    if (req.query.sizes) {
      const sizes = req.query.sizes.split(',');
      filter['variants.sizes.size'] = { $in: sizes };
    }

    if (req.query.colors) {
      const colors = req.query.colors.split(',');
      filter['variants.color'] = { $in: colors };
    }

    if (req.query.materials) {
      const materials = req.query.materials.split(',');
      filter.material = { $in: materials };
    }

    if (req.query.categories) {
      const categories = req.query.categories.split(',');
      filter.category = { $in: categories };
    }

    if (req.query.inStock === 'true') {
      filter['variants.sizes.stock'] = { $gt: 0 };
    }

    // Build sort object
    let sort = {};
    switch (sortBy) {
      case 'price_low':
        sort = { price: 1 };
        break;
      case 'price_high':
        sort = { price: -1 };
        break;
      case 'rating':
        sort = { 'reviews.averageRating': -1 };
        break;
      case 'popular':
        sort = { 'reviews.totalReviews': -1 };
        break;
      case 'oldest':
        sort = { createdAt: 1 };
        break;
      case 'newest':
      default:
        sort = { createdAt: -1 };
        break;
    }

    // Execute queries
    const [products, totalProducts] = await Promise.all([
      Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('reviews.averageRating')
        .populate('reviews.totalReviews'),
      Product.countDocuments(filter)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalProducts / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      products,
      pagination: {
        currentPage: page,
        totalPages,
        totalProducts,
        hasNextPage,
        hasPrevPage,
        limit
      },
      brand: brandName
    });

  } catch (error) {
    console.error('Error fetching brand products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all products with advanced filtering
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      color, 
      size, 
      q, 
      featured, 
      brand,
      gender,
      material,
      type,
      minPrice,
      maxPrice,
      sortBy = 'newest',
      page = 1,
      limit = 20
    } = req.query;
    
    // Build product filter
    const productFilter = { isActive: true };
    if (category) productFilter.categories = { $in: Array.isArray(category) ? category : [category] };
    if (q) productFilter.$text = { $search: q };
    if (featured !== undefined) productFilter.featured = featured === 'true';
    if (brand) productFilter.brand = { $in: Array.isArray(brand) ? brand : [brand] };
    if (gender) productFilter.gender = { $in: Array.isArray(gender) ? gender : [gender] };
    if (material) productFilter.material = { $regex: material, $options: 'i' };
    if (type) productFilter.type = { $regex: type, $options: 'i' };
    if (minPrice || maxPrice) {
      productFilter.price = {};
      if (minPrice) productFilter.price.$gte = parseFloat(minPrice);
      if (maxPrice) productFilter.price.$lte = parseFloat(maxPrice);
    }
    
    // Build sort query
    let sortQuery = {};
    switch (sortBy) {
      case 'newest':
        sortQuery = { createdAt: -1 };
        break;
      case 'oldest':
        sortQuery = { createdAt: 1 };
        break;
      case 'price_low':
        sortQuery = { price: 1 };
        break;
      case 'price_high':
        sortQuery = { price: -1 };
        break;
      case 'rating':
        sortQuery = { averageRating: -1 };
        break;
      case 'popular':
        sortQuery = { viewCount: -1 };
        break;
      case 'name_asc':
        sortQuery = { title: 1 };
        break;
      case 'name_desc':
        sortQuery = { title: -1 };
        break;
      default:
        sortQuery = { createdAt: -1 };
    }
    
    let products = await Product.find(productFilter)
      .sort(sortQuery)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();
    
    // Filter by color/size if specified (requires checking variants)
    if (color || size) {
      const variantFilter = {};
      if (color) variantFilter.color = { $in: Array.isArray(color) ? color : [color] };
      if (size) variantFilter.size = { $in: Array.isArray(size) ? size : [size] };
      
      const variants = await Variant.find(variantFilter).distinct('productId');
      products = products.filter(p => variants.some(vid => vid.toString() === p._id.toString()));
    }
    
    // Get total count for pagination
    const totalProducts = await Product.countDocuments(productFilter);
    
    // Add variant information to products
    for (let product of products) {
      const variants = await Variant.find({ productId: product._id });
      product.variants = variants;
      product.availableSizes = [...new Set(variants.map(v => v.size))];
      product.availableColors = [...new Set(variants.map(v => v.color))];
      product.inStock = variants.some(v => v.stock > 0);
      product.lowestPrice = Math.min(...variants.map(v => v.price));
      product.highestPrice = Math.max(...variants.map(v => v.price));
    }
    
    res.json({ 
      success: true, 
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalProducts / parseInt(limit)),
        totalProducts,
        hasNextPage: parseInt(page) < Math.ceil(totalProducts / parseInt(limit)),
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get featured products specifically
router.get('/featured', async (req, res) => {
  try {
    const featuredProducts = await Product.find({ featured: true })
      .limit(8) // Limit to 8 featured products
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      products: featuredProducts
    });
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new product (Admin only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin && !req.user.email.includes('admin')) {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const { name, description, brand, categories, images, featured, variants } = req.body;

    // Create the product
    const product = new Product({
      title: name, // Using 'title' as per schema
      description,
      price: variants && variants.length > 0 ? Math.min(...variants.map(v => v.price)) : 0, // Use lowest variant price as base price
      categories: categories || [],
      images: images || [],
      featured: featured || false
    });

    const savedProduct = await product.save();

    // Create variants with individual pricing and stock
    const variantDocuments = [];
    if (variants && variants.length > 0) {
      for (const variant of variants) {
        const variantDoc = new Variant({
          productId: savedProduct._id,
          size: variant.size,
          color: variant.color,
          price: variant.price || 0, // Individual variant pricing
          stock: variant.stock || 0,
          images: variant.images || []
        });
        variantDocuments.push(variantDoc);
      }
      await Variant.insertMany(variantDocuments);
    }

    res.status(201).json({ 
      success: true, 
      product: savedProduct,
      message: 'Product created successfully'
    });
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const prod = await Product.findById(req.params.id).lean();
    if (!prod) return res.status(404).json({ error: 'Not found' });
    
    const variants = await Variant.find({ productId: prod._id }).lean();
    
    // Increment view count
    await Product.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });
    
    // Track recently viewed for authenticated users
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        await RecentlyViewed.findOneAndUpdate(
          { userId: decoded.id, productId: req.params.id },
          { viewedAt: new Date() },
          { upsert: true }
        );
        
        // Cleanup old views
        await RecentlyViewed.cleanupOldViews(decoded.id);
      } catch (authError) {
        // Silent fail for auth errors
      }
    }
    
    res.json({ ...prod, variants });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get product recommendations
router.get('/:id/recommendations', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    // Find similar products based on categories, brand, and type
    const recommendations = await Product.find({
      _id: { $ne: req.params.id },
      isActive: true,
      $or: [
        { categories: { $in: product.categories } },
        { brand: product.brand },
        { type: product.type }
      ]
    })
    .sort({ averageRating: -1, viewCount: -1 })
    .limit(6)
    .lean();
    
    // Add variant info to recommendations
    for (let rec of recommendations) {
      const variants = await Variant.find({ productId: rec._id });
      rec.variants = variants;
      rec.inStock = variants.some(v => v.stock > 0);
    }
    
    res.json({ success: true, recommendations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get recently viewed products
router.get('/user/recently-viewed', authenticateToken, async (req, res) => {
  try {
    const recentlyViewed = await RecentlyViewed.find({ userId: req.user.id })
      .populate('productId')
      .sort({ viewedAt: -1 })
      .limit(20);
    
    const products = recentlyViewed.map(rv => rv.productId).filter(Boolean);
    
    res.json({ success: true, products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get filter options (brands, categories, etc.)
router.get('/filters/options', async (req, res) => {
  try {
    const [brands, categories, materials, types, colors, sizes] = await Promise.all([
      Product.distinct('brand', { isActive: true, brand: { $exists: true, $ne: null } }),
      Product.distinct('categories', { isActive: true }),
      Product.distinct('material', { isActive: true, material: { $exists: true, $ne: null } }),
      Product.distinct('type', { isActive: true, type: { $exists: true, $ne: null } }),
      Variant.distinct('color'),
      Variant.distinct('size')
    ]);
    
    // Get price range
    const priceRange = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } }
    ]);
    
    res.json({
      success: true,
      filters: {
        brands: brands.filter(Boolean).sort(),
        categories: categories.flat().filter(Boolean).sort(),
        materials: materials.filter(Boolean).sort(),
        types: types.filter(Boolean).sort(),
        colors: colors.filter(Boolean).sort(),
        sizes: sizes.filter(Boolean).sort(),
        priceRange: priceRange[0] || { min: 0, max: 1000 }
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Search suggestions
router.get('/search/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ success: true, suggestions: [] });
    }
    
    const suggestions = await Product.find({
      isActive: true,
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { brand: { $regex: q, $options: 'i' } },
        { categories: { $regex: q, $options: 'i' } }
      ]
    })
    .select('title brand categories')
    .limit(10);
    
    res.json({ success: true, suggestions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check stock availability for specific variant
router.get('/:id/variants/:variantId/stock', async (req, res) => {
  try {
    const variant = await Variant.findById(req.params.variantId);
    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }
    
    res.json({
      success: true,
      inStock: variant.stock > 0,
      stockCount: variant.stock,
      size: variant.size,
      color: variant.color
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Request stock notification
router.post('/:id/variants/:variantId/notify', authenticateToken, async (req, res) => {
  try {
    const variant = await Variant.findById(req.params.variantId);
    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }
    
    if (variant.stock > 0) {
      return res.status(400).json({ error: 'Item is currently in stock' });
    }
    
    const existingNotification = await StockNotification.findOne({
      userId: req.user.id,
      variantId: req.params.variantId,
      isActive: true
    });
    
    if (existingNotification) {
      return res.status(400).json({ error: 'You are already subscribed to notifications for this item' });
    }
    
    const notification = new StockNotification({
      userId: req.user.id,
      productId: req.params.id,
      variantId: req.params.variantId,
      email: req.user.email,
      size: variant.size,
      color: variant.color
    });
    
    await notification.save();
    
    res.json({
      success: true,
      message: 'You will be notified when this item is back in stock'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get products by brand
router.get('/brand/:brandName', async (req, res) => {
  try {
    const { brandName } = req.params;
    const { page = 1, limit = 20, sortBy = 'newest' } = req.query;
    
    let sortQuery = {};
    switch (sortBy) {
      case 'newest':
        sortQuery = { createdAt: -1 };
        break;
      case 'price_low':
        sortQuery = { price: 1 };
        break;
      case 'price_high':
        sortQuery = { price: -1 };
        break;
      case 'rating':
        sortQuery = { averageRating: -1 };
        break;
      default:
        sortQuery = { createdAt: -1 };
    }
    
    const products = await Product.find({ 
      brand: { $regex: brandName, $options: 'i' },
      isActive: true 
    })
    .sort(sortQuery)
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .lean();
    
    const totalProducts = await Product.countDocuments({ 
      brand: { $regex: brandName, $options: 'i' },
      isActive: true 
    });
    
    // Add variant information
    for (let product of products) {
      const variants = await Variant.find({ productId: product._id });
      product.variants = variants;
      product.inStock = variants.some(v => v.stock > 0);
    }
    
    res.json({
      success: true,
      brand: brandName,
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalProducts / parseInt(limit)),
        totalProducts
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
