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

module.exports = { sendMail };
