const mongoose = require('mongoose');
const Cart = require('../src/models/Cart');
const mailer = require('../src/utils/mailer');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shoestopper')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const sendAbandonedCartEmails = async () => {
  try {
    console.log('🔍 Checking for abandoned carts...');
    
    // Find carts that:
    // 1. Have items
    // 2. Haven't been updated in more than 24 hours
    // 3. Haven't received abandoned email yet
    // 4. Have user email
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const abandonedCarts = await Cart.find({
      'items.0': { $exists: true }, // Has at least one item
      lastActivity: { $lt: oneDayAgo }, // Not updated in 24+ hours
      abandonedEmailSent: { $ne: true }, // Email not sent yet
      userEmail: { $exists: true, $ne: null } // Has user email
    }).populate('items.variantId');
    
    console.log(`📧 Found ${abandonedCarts.length} abandoned carts to email`);
    
    for (const cart of abandonedCarts) {
      try {
        await sendAbandonedCartEmail(cart);
        
        // Mark email as sent
        cart.abandonedEmailSent = true;
        await cart.save();
        
        console.log(`✅ Sent abandoned cart email to: ${cart.userEmail}`);
      } catch (error) {
        console.error(`❌ Failed to send email to ${cart.userEmail}:`, error.message);
      }
    }
    
    console.log('🎉 Abandoned cart email process completed');
  } catch (error) {
    console.error('💥 Error in abandoned cart email process:', error);
  } finally {
    mongoose.connection.close();
  }
};

const sendAbandonedCartEmail = async (cart) => {
  const items = cart.items.map(item => ({
    name: item.variantId.productId?.title || 'Product',
    color: item.variantId.color,
    size: item.variantId.size,
    quantity: item.qty,
    price: item.variantId.price,
    image: item.variantId.images?.[0] || item.variantId.productId?.images?.[0] || ''
  }));
  
  const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Cart is Waiting!</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }
        .content { padding: 30px; }
        .item { display: flex; align-items: center; padding: 15px; border-bottom: 1px solid #eee; }
        .item img { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; margin-right: 15px; }
        .item-details { flex: 1; }
        .item-name { font-weight: bold; color: #333; margin-bottom: 5px; }
        .item-variant { color: #666; font-size: 14px; margin-bottom: 5px; }
        .item-price { color: #667eea; font-weight: bold; }
        .total { background: #f8f9fa; padding: 20px; text-align: center; font-size: 18px; font-weight: bold; color: #333; }
        .cta { text-align: center; padding: 30px; }
        .btn { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 25px; font-weight: bold; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>👟 Your Cart is Waiting!</h1>
          <p>Don't let these amazing shoes slip away</p>
        </div>
        
        <div class="content">
          <p>Hi there!</p>
          <p>You left some fantastic items in your cart. Complete your purchase before they're gone!</p>
          
          ${items.map(item => `
            <div class="item">
              ${item.image ? `<img src="${item.image}" alt="${item.name}" />` : '<div style="width:80px;height:80px;background:#eee;border-radius:8px;margin-right:15px;"></div>'}
              <div class="item-details">
                <div class="item-name">${item.name}</div>
                <div class="item-variant">${item.color} • Size ${item.size} • Qty: ${item.quantity}</div>
                <div class="item-price">$${item.price}</div>
              </div>
            </div>
          `).join('')}
          
          <div class="total">
            Total: $${totalValue.toFixed(2)}
          </div>
        </div>
        
        <div class="cta">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/cart" class="btn">
            Complete Your Purchase
          </a>
        </div>
        
        <div class="footer">
          <p>This email was sent because you have items in your cart.</p>
          <p>© 2024 ShoeStopper. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  await mailer.sendEmail({
    to: cart.userEmail,
    subject: '👟 Your Cart is Waiting - Complete Your Purchase!',
    html: emailHtml
  });
};

// Run the script
sendAbandonedCartEmails();