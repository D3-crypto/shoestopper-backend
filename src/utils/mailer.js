const nodemailer = require('nodemailer');
const config = require('../config');

// Gmail SMTP transport with app password
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth: {
    user: config.email.user,
    pass: config.email.pass
  }
});

async function sendMail({ to, subject, text, html }) {
  try {
    console.log(`[EMAIL] Attempting to send email to: ${to}`);
    console.log(`[EMAIL] Subject: ${subject}`);
    
    const result = await transporter.sendMail({ 
      from: config.email.from, 
      to, 
      subject, 
      text, 
      html 
    });
    
    console.log(`[EMAIL] ✅ Email sent successfully to ${to}`);
    console.log(`[EMAIL] Message ID: ${result.messageId}`);
    
    return result;
  } catch (error) {
    console.error(`[EMAIL] ❌ Failed to send email to ${to}:`, error.message);
    throw error;
  }
}

async function sendAbandonedCartEmail(email, cart) {
  const itemsHtml = cart.items.map(item => {
    const variant = item.variantId;
    return `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          <img src="${variant.images?.[0] || ''}" alt="${variant.productId?.title || 'Product'}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;">
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          <strong>${variant.productId?.title || 'Product'}</strong><br>
          <small>Size: ${variant.size} | Color: ${variant.color}</small>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
          ${item.qty}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
          $${variant.price}
        </td>
      </tr>
    `;
  }).join('');

  const totalAmount = cart.items.reduce((total, item) => total + (item.qty * item.variantId.price), 0);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Don't forget your cart!</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Don't forget your shoes! 👟</h1>
        <p style="color: #f1f1f1; margin: 10px 0 0 0; font-size: 16px;">You left some amazing items in your cart</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi there! 👋</p>
        
        <p style="font-size: 16px; margin-bottom: 25px;">
          We noticed you left some fantastic shoes in your cart. Don't let them walk away! 
          Complete your purchase before they're gone.
        </p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="margin: 0 0 15px 0; color: #333;">Your Cart Items:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #e9ecef;">
                <th style="padding: 10px; text-align: left;">Product</th>
                <th style="padding: 10px; text-align: left;">Details</th>
                <th style="padding: 10px; text-align: center;">Qty</th>
                <th style="padding: 10px; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr style="background: #e9ecef; font-weight: bold;">
                <td colspan="3" style="padding: 15px; text-align: right;">Total:</td>
                <td style="padding: 15px; text-align: right;">$${totalAmount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'https://shoestopper-frontend.onrender.com'}/cart" 
             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; display: inline-block; transition: transform 0.2s;">
            Complete Your Purchase 🛒
          </a>
        </div>
        
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; color: #856404;">
            ⚡ <strong>Limited Stock Alert:</strong> Some items in your cart are running low on stock. 
            Don't miss out on your favorite pairs!
          </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
        
        <p style="font-size: 14px; color: #666; text-align: center; margin: 0;">
          If you no longer wish to receive these emails, you can 
          <a href="#" style="color: #667eea;">unsubscribe here</a>.
        </p>
        
        <div style="text-align: center; margin-top: 20px;">
          <p style="font-size: 14px; color: #999; margin: 0;">
            ShoeStopper - Step into Style<br>
            This email was sent because you have items in your cart.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendMail({
    to: email,
    subject: "👟 Don't forget your amazing shoes!",
    html: html,
    text: `Hi! You left some great shoes in your cart at ShoeStopper. Complete your purchase before they're gone! Total: $${totalAmount.toFixed(2)}`
  });
}

module.exports = { sendMail, sendAbandonedCartEmail };
