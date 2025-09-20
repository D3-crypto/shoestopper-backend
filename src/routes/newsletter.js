const express = require('express');
const router = express.Router();
const Subscriber = require('../models/Subscriber');
const nodemailer = require('nodemailer');
const config = require('../config');

// Create transporter for sending emails (using existing email config)
const createTransporter = () => {
  return nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    auth: {
      user: config.email.user,
      pass: config.email.pass
    }
  });
};

// @route   POST /api/newsletter/subscribe
// @desc    Subscribe to newsletter
// @access  Public
router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email address is required' 
      });
    }

    // Check if already subscribed
    const existingSubscriber = await Subscriber.findOne({ email });
    
    if (existingSubscriber) {
      if (existingSubscriber.isActive) {
        return res.status(400).json({ 
          success: false, 
          message: 'This email is already subscribed to our newsletter' 
        });
      } else {
        // Reactivate if previously unsubscribed
        existingSubscriber.isActive = true;
        existingSubscriber.subscribedAt = new Date();
        await existingSubscriber.save();
        
        return res.json({ 
          success: true, 
          message: 'Welcome back! You have been resubscribed to our newsletter' 
        });
      }
    }

    // Create new subscriber
    const subscriber = new Subscriber({ email });
    await subscriber.save();

    // Send welcome email
    try {
      const transporter = createTransporter();
      
      const mailOptions = {
        from: config.email.from,
        to: email,
        subject: 'Welcome to ShoeStopper Newsletter! 👟',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to ShoeStopper! 🎉</h1>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-top: 0;">Thank you for subscribing!</h2>
              
              <p style="color: #666; line-height: 1.6; font-size: 16px;">
                You're now part of our exclusive community! Get ready to discover:
              </p>
              
              <ul style="color: #666; line-height: 1.8; font-size: 16px;">
                <li>🆕 New product arrivals</li>
                <li>💰 Exclusive offers and discounts</li>
                <li>👟 Style tips and trends</li>
                <li>🎯 Early access to sales</li>
              </ul>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://d3-crypto.github.io/ShoeStopper" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                  Start Shopping Now
                </a>
              </div>
              
              <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                Don't want these emails? 
                <a href="https://shoestopper-backend.onrender.com/api/newsletter/unsubscribe/${subscriber.unsubscribeToken}" 
                   style="color: #667eea;">Unsubscribe here</a>
              </p>
            </div>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`Welcome email sent to ${email}`);
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Don't fail the subscription if email fails
    }

    res.status(201).json({ 
      success: true, 
      message: 'Successfully subscribed! Check your email for a welcome message.' 
    });

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'This email is already subscribed' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to subscribe. Please try again later.' 
    });
  }
});

// @route   GET /api/newsletter/unsubscribe/:token
// @desc    Unsubscribe from newsletter
// @access  Public
router.get('/unsubscribe/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const subscriber = await Subscriber.findOne({ unsubscribeToken: token });
    
    if (!subscriber) {
      return res.status(404).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>Invalid unsubscribe link</h2>
            <p>This unsubscribe link is not valid or has expired.</p>
          </body>
        </html>
      `);
    }
    
    await subscriber.unsubscribe();
    
    res.send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>Successfully Unsubscribed</h2>
          <p>You have been unsubscribed from ShoeStopper newsletter.</p>
          <p>We're sorry to see you go! 😢</p>
          <a href="https://d3-crypto.github.io/ShoeStopper" style="color: #667eea;">Visit ShoeStopper</a>
        </body>
      </html>
    `);
    
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>Error</h2>
          <p>Something went wrong. Please try again later.</p>
        </body>
      </html>
    `);
  }
});

// @route   GET /api/newsletter/subscribers (Admin only)
// @desc    Get all active subscribers
// @access  Private
router.get('/subscribers', async (req, res) => {
  try {
    const subscribers = await Subscriber.findActive().select('email subscribedAt').sort({ subscribedAt: -1 });
    
    res.json({
      success: true,
      count: subscribers.length,
      subscribers
    });
    
  } catch (error) {
    console.error('Get subscribers error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch subscribers' 
    });
  }
});

module.exports = router;