const mongoose = require('mongoose');
const Cart = require('../src/models/Cart');
const mailer = require('../src/utils/mailer');
require('dotenv').config();

const checkAbandonedCarts = async () => {
  try {
    console.log('[ABANDONED CART] Starting abandoned cart check...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shoestopper');
    console.log('[ABANDONED CART] Connected to MongoDB');

    // Find carts that:
    // 1. Have items
    // 2. Have user email (logged in users only)
    // 3. Haven't been updated in 2+ days
    // 4. Haven't been marked as abandoned email sent
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    
    const abandonedCarts = await Cart.find({
      'items.0': { $exists: true }, // Has at least one item
      userEmail: { $exists: true, $ne: null }, // Has user email
      lastActivity: { $lt: twoDaysAgo }, // Not updated in 2+ days
      abandonedEmailSent: { $ne: true } // Email not sent yet
    }).populate('items.variantId');

    console.log(`[ABANDONED CART] Found ${abandonedCarts.length} abandoned carts`);

    for (const cart of abandonedCarts) {
      try {
        // Send abandoned cart email
        await mailer.sendAbandonedCartEmail(cart.userEmail, cart);
        
        // Mark as email sent
        cart.abandonedEmailSent = true;
        await cart.save();
        
        console.log(`[ABANDONED CART] Sent email to ${cart.userEmail}`);
      } catch (emailError) {
        console.error(`[ABANDONED CART] Failed to send email to ${cart.userEmail}:`, emailError);
      }
    }

    console.log('[ABANDONED CART] Abandoned cart check completed');
    
  } catch (error) {
    console.error('[ABANDONED CART] Error checking abandoned carts:', error);
  } finally {
    await mongoose.disconnect();
    console.log('[ABANDONED CART] Disconnected from MongoDB');
  }
};

// Run if called directly
if (require.main === module) {
  checkAbandonedCarts();
}

module.exports = checkAbandonedCarts;