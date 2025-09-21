const express = require('express');
const Review = require('../models/Review');
const Product = require('../models/Product');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Get reviews for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = 'newest' } = req.query;
    
    let sortQuery = {};
    switch (sort) {
      case 'newest':
        sortQuery = { createdAt: -1 };
        break;
      case 'oldest':
        sortQuery = { createdAt: 1 };
        break;
      case 'highest':
        sortQuery = { rating: -1 };
        break;
      case 'lowest':
        sortQuery = { rating: 1 };
        break;
      case 'helpful':
        sortQuery = { helpful: -1 };
        break;
      default:
        sortQuery = { createdAt: -1 };
    }

    const reviews = await Review.find({ productId })
      .populate('userId', 'name')
      .sort(sortQuery)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const totalReviews = await Review.countDocuments({ productId });
    
    // Get rating distribution
    const ratingDistribution = await Review.aggregate([
      { $match: { productId: require('mongoose').Types.ObjectId(productId) } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: -1 } }
    ]);

    res.json({
      reviews,
      totalReviews,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalReviews / parseInt(limit)),
      ratingDistribution
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a review
router.post('/', auth, async (req, res) => {
  try {
    const { productId, rating, title, comment, size, fit } = req.body;
    
    // Check if user already reviewed this product
    const existingReview = await Review.findOne({ 
      productId, 
      userId: req.user.id 
    });
    
    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this product' });
    }

    const review = new Review({
      productId,
      userId: req.user.id,
      rating,
      title,
      comment,
      size,
      fit
    });

    await review.save();

    // Update product's average rating and review count
    const allReviews = await Review.find({ productId });
    const averageRating = allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length;
    
    await Product.findByIdAndUpdate(productId, {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: allReviews.length
    });

    await review.populate('userId', 'name');
    res.status(201).json(review);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Mark review as helpful
router.post('/:reviewId/helpful', auth, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const alreadyMarked = review.helpfulBy.includes(userId);
    
    if (alreadyMarked) {
      // Remove helpful mark
      review.helpfulBy = review.helpfulBy.filter(id => id.toString() !== userId);
      review.helpful -= 1;
    } else {
      // Add helpful mark
      review.helpfulBy.push(userId);
      review.helpful += 1;
    }

    await review.save();
    res.json({ helpful: review.helpful, marked: !alreadyMarked });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update review (only by review author)
router.put('/:reviewId', auth, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, title, comment, size, fit } = req.body;

    const review = await Review.findOneAndUpdate(
      { _id: reviewId, userId: req.user.id },
      { rating, title, comment, size, fit },
      { new: true }
    ).populate('userId', 'name');

    if (!review) {
      return res.status(404).json({ error: 'Review not found or unauthorized' });
    }

    // Update product's average rating
    const allReviews = await Review.find({ productId: review.productId });
    const averageRating = allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length;
    
    await Product.findByIdAndUpdate(review.productId, {
      averageRating: Math.round(averageRating * 10) / 10
    });

    res.json(review);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete review (only by review author)
router.delete('/:reviewId', auth, async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findOneAndDelete({ 
      _id: reviewId, 
      userId: req.user.id 
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found or unauthorized' });
    }

    // Update product's average rating and review count
    const allReviews = await Review.find({ productId: review.productId });
    const averageRating = allReviews.length > 0 
      ? allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length 
      : 0;
    
    await Product.findByIdAndUpdate(review.productId, {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: allReviews.length
    });

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;