const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Variant = require('../models/Variant');
const { authenticateToken } = require('../middleware/auth');

// list products with optional filters: category, color, size
router.get('/', async (req, res) => {
  try {
    const { category, color, size, q, featured } = req.query;
    const productFilter = {};
    if (category) productFilter.categories = category;
    if (q) productFilter.$text = { $search: q };
    if (featured !== undefined) productFilter.featured = featured === 'true';
    
    let products = await Product.find(productFilter).lean();
    
    // Filter by color/size if specified (requires checking variants)
    if (color || size) {
      const variantFilter = {};
      if (color) variantFilter.color = color;
      if (size) variantFilter.size = size;
      
      const variants = await Variant.find(variantFilter).distinct('productId');
      products = products.filter(p => variants.some(vid => vid.toString() === p._id.toString()));
    }
    
    res.json({ success: true, products });
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
    res.json({ ...prod, variants });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
