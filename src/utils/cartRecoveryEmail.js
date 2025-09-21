const nodemailer = require('nodemailer');

class CartRecoveryEmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Generate cart recovery URL
  generateRecoveryUrl(recoveryToken) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/cart/recover/${recoveryToken}`;
  }

  // Generate email templates
  getEmailTemplate(reminderType, cartData, recoveryUrl) {
    const { user, cartItems, totalValue, cartSummary } = cartData;
    const customerName = user?.name || 'Valued Customer';
    
    const templates = {
      first: {
        subject: `Don't forget your items! 👟 ${cartSummary.itemCount} items waiting`,
        html: this.getFirstReminderTemplate(customerName, cartItems, totalValue, recoveryUrl)
      },
      second: {
        subject: `Still thinking it over? Your cart is waiting! 🛒`,
        html: this.getSecondReminderTemplate(customerName, cartItems, totalValue, recoveryUrl)
      },
      final: {
        subject: `Last chance! Your cart expires soon ⏰`,
        html: this.getFinalReminderTemplate(customerName, cartItems, totalValue, recoveryUrl)
      }
    };

    return templates[reminderType] || templates.first;
  }

  // First reminder template (2 hours after abandonment)
  getFirstReminderTemplate(customerName, cartItems, totalValue, recoveryUrl) {
    const itemsList = cartItems.map(item => `
      <tr>
        <td style="padding: 15px; border-bottom: 1px solid #eee;">
          <img src="${item.product.images?.[0] || '/placeholder-shoe.jpg'}" 
               alt="${item.product.name}" 
               style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; float: left; margin-right: 15px;">
          <div>
            <h3 style="margin: 0 0 5px 0; color: #333; font-size: 16px;">${item.product.name}</h3>
            <p style="margin: 0; color: #666; font-size: 14px;">Size: ${item.size} | Quantity: ${item.quantity}</p>
            <p style="margin: 5px 0 0 0; color: #333; font-weight: bold;">$${item.price.toFixed(2)}</p>
          </div>
        </td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Don't forget your items!</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; margin-top: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">👟 ShoeStopper</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your favorite shoes are waiting!</p>
          </div>

          <!-- Content -->
          <div style="padding: 30px;">
            <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">Hi ${customerName}!</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
              You left some amazing items in your cart. Don't let them walk away! 
              Complete your purchase now and step into style.
            </p>

            <!-- Cart Items -->
            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
              <h3 style="margin: 0 0 15px 0; color: #333;">Your Cart Items:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                ${itemsList}
              </table>
              <div style="text-align: right; margin-top: 15px; padding-top: 15px; border-top: 2px solid #333;">
                <h3 style="margin: 0; color: #333; font-size: 20px;">Total: $${totalValue.toFixed(2)}</h3>
              </div>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${recoveryUrl}" 
                 style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; transition: background 0.2s;">
                Complete Your Purchase
              </a>
            </div>

            <p style="color: #666; font-size: 14px; text-align: center; margin-top: 25px;">
              Need help? Reply to this email or contact our support team.
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="margin: 0; color: #666; font-size: 12px;">
              © 2024 ShoeStopper. All rights reserved.<br>
              This email was sent because you have items in your cart.
            </p>
          </div>

        </div>
      </body>
      </html>
    `;
  }

  // Second reminder template (1 day after abandonment)
  getSecondReminderTemplate(customerName, cartItems, totalValue, recoveryUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Still thinking it over?</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; margin-top: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🛒 ShoeStopper</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your cart is still waiting!</p>
          </div>

          <!-- Content -->
          <div style="padding: 30px;">
            <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">Hi ${customerName}!</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              We noticed you're still thinking about those awesome shoes in your cart. 
              Here's what's waiting for you:
            </p>

            <!-- Special Offer -->
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 25px;">
              <h3 style="margin: 0 0 10px 0; font-size: 20px;">🎉 Special Offer Just for You!</h3>
              <p style="margin: 0; font-size: 16px;">Get 10% off your cart with code: <strong>COMEBACK10</strong></p>
            </div>

            <!-- Quick Cart Summary -->
            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
              <p style="margin: 0; color: #333; font-size: 16px;">
                <strong>${cartItems.length} items</strong> in your cart • Total: <strong>$${totalValue.toFixed(2)}</strong>
              </p>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${recoveryUrl}" 
                 style="background: #ef4444; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                Claim Your 10% Discount
              </a>
            </div>

            <p style="color: #666; font-size: 14px; text-align: center; margin-top: 25px;">
              This offer is exclusive to you and expires in 24 hours.
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="margin: 0; color: #666; font-size: 12px;">
              © 2024 ShoeStopper. All rights reserved.
            </p>
          </div>

        </div>
      </body>
      </html>
    `;
  }

  // Final reminder template (3 days after abandonment)
  getFinalReminderTemplate(customerName, cartItems, totalValue, recoveryUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Last chance - Cart expires soon!</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; margin-top: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">⏰ ShoeStopper</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Last chance to save your cart!</p>
          </div>

          <!-- Content -->
          <div style="padding: 30px;">
            <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">Don't miss out, ${customerName}!</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              This is your final reminder! Your cart will expire in <strong>24 hours</strong> 
              and these items will be released to other customers.
            </p>

            <!-- Urgency Banner -->
            <div style="background: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; padding: 15px; margin-bottom: 25px; text-align: center;">
              <p style="margin: 0; color: #dc2626; font-weight: bold; font-size: 16px;">
                ⚠️ Cart expires in 24 hours!
              </p>
            </div>

            <!-- Final Offer -->
            <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 25px; border-radius: 8px; text-align: center; margin-bottom: 25px;">
              <h3 style="margin: 0 0 15px 0; font-size: 22px;">🚀 FINAL OFFER: 15% OFF!</h3>
              <p style="margin: 0 0 10px 0; font-size: 16px;">Use code: <strong>LASTCHANCE15</strong></p>
              <p style="margin: 0; font-size: 14px; opacity: 0.9;">Save $${(totalValue * 0.15).toFixed(2)} on your order!</p>
            </div>

            <!-- Cart Value -->
            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 25px; text-align: center;">
              <h3 style="margin: 0; color: #333; font-size: 20px;">
                Cart Value: <span style="color: #ef4444;">$${totalValue.toFixed(2)}</span>
              </h3>
              <p style="margin: 10px 0 0 0; color: #666;">Your savings: <strong>$${(totalValue * 0.15).toFixed(2)}</strong></p>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${recoveryUrl}" 
                 style="background: #ef4444; color: white; padding: 18px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; display: inline-block; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);">
                Save My Cart & Get 15% Off
              </a>
            </div>

            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 25px;">
              After 24 hours, your cart will be permanently deleted and this offer will expire.
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="margin: 0; color: #666; font-size: 12px;">
              © 2024 ShoeStopper. All rights reserved.<br>
              This is your final cart reminder.
            </p>
          </div>

        </div>
      </body>
      </html>
    `;
  }

  // Send cart recovery email
  async sendCartRecoveryEmail(email, reminderType, cartData, recoveryUrl) {
    try {
      const template = this.getEmailTemplate(reminderType, cartData, recoveryUrl);
      
      const mailOptions = {
        from: `"ShoeStopper" <${process.env.SMTP_USER}>`,
        to: email,
        subject: template.subject,
        html: template.html
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`Cart recovery email sent: ${result.messageId}`);
      return { success: true, messageId: result.messageId };
      
    } catch (error) {
      console.error('Error sending cart recovery email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send multiple recovery emails (for batch processing)
  async sendBatchRecoveryEmails(emailList) {
    const results = [];
    
    for (const emailData of emailList) {
      const { email, reminderType, cartData, recoveryUrl } = emailData;
      const result = await this.sendCartRecoveryEmail(email, reminderType, cartData, recoveryUrl);
      results.push({ email, result });
      
      // Add delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }
}

module.exports = new CartRecoveryEmailService();