const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

const User = require('../models/User');
const Otp = require('../models/Otp');
const RefreshToken = require('../models/RefreshToken');

const { sendMail } = require('../utils/mailer');
const { authenticateToken } = require('../middleware/auth');

function signAccess(user) {
  return jwt.sign({ sub: user._id.toString() }, config.jwt.accessSecret, { expiresIn: '15m' });
}

async function signRefresh(user, jti) {
  const payload = { sub: user._id.toString(), rvs: user.refreshTokenVersion, jti };
  return jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: '30d' });
}

async function sendOtpEmail(to, otp) {
  await sendMail({ to, subject: 'Your OTP', text: `Your OTP is ${otp}` });
}

// Signup -> create user (unverified), create OTP, send email
router.post('/signup', async (req, res) => {
  try {
    const { name, email, phone, address, password } = req.body;
    console.log(`[SIGNUP ATTEMPT] Email: ${email}, Name: ${name}`);
    
    if (!name || !email || !password) {
      console.log(`[SIGNUP FAILED] Missing fields: name=${!!name}, email=${!!email}, password=${!!password}`);
      return res.status(400).json({ error: 'Missing fields' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      console.log(`[SIGNUP FAILED] Email already exists: ${email}`);
      return res.status(400).json({ error: 'Email exists' });
    }

    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, phone, password: hash, autoDeleteAt: new Date(Date.now() + 10 * 60 * 1000) });

    // create OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await Otp.create({ email, otp, otpType: 'VERIFICATION', expiresAt });
    await sendOtpEmail(email, otp);

    console.log(`[SIGNUP SUCCESS] User created and OTP sent: ${email}`);
    res.json({ success: true, message: 'User created, verify OTP sent to email' });
  } catch (err) {
    console.error(`[SIGNUP ERROR] ${err.message}`);
    res.status(500).json({ error: 'Server error' });
  }
});

// Resend OTP -> delete existing OTP of type for email, enforce 2m cooldown by checking last created
router.post('/resend-otp', async (req, res) => {
  try {
    const { email, otpType } = req.body;
    console.log(`[RESEND OTP] Request for Email: ${email}, Type: ${otpType}`);
    
    if (!email || !otpType) {
      console.log(`[RESEND OTP] Missing fields - email: ${!!email}, otpType: ${!!otpType}`);
      return res.status(400).json({ error: 'Missing fields' });
    }

    // check cooldown: if an OTP exists that was created < 2 minutes ago, deny
    const last = await Otp.findOne({ email, otpType }).sort({ createdAt: -1 });
    if (last && Date.now() - new Date(last.createdAt).getTime() < 2 * 60 * 1000) {
      const timeLeft = Math.ceil((2 * 60 * 1000 - (Date.now() - new Date(last.createdAt).getTime())) / 1000);
      console.log(`[RESEND OTP] Cooldown active for ${email}, ${timeLeft} seconds remaining`);
      return res.status(429).json({ error: 'Cooldown active. Try later.' });
    }

    // delete old OTPs for this email+type
    const deleteResult = await Otp.deleteMany({ email, otpType });
    console.log(`[RESEND OTP] Deleted ${deleteResult.deletedCount} old OTPs for ${email}`);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await Otp.create({ email, otp, otpType, expiresAt });
    await sendOtpEmail(email, otp);

    console.log(`[RESEND OTP] New OTP generated and sent to ${email}`);
    res.json({ ok: true, message: 'OTP resent' });
  } catch (err) {
    console.error(`[RESEND OTP ERROR] ${err.message}`);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp, otpType } = req.body;
    console.log(`[OTP VERIFICATION ATTEMPT] Email: ${email}, Type: ${otpType}, OTP: ${otp}`);
    
    const item = await Otp.findOne({ email, otp, otpType });
    if (!item) {
      console.log(`[OTP VERIFICATION FAILED] Invalid OTP: ${email}, Type: ${otpType}`);
      return res.status(400).json({ error: 'Invalid OTP' });
    }
    
    // delete on use
    await Otp.deleteMany({ email, otpType });

    // if verification, mark user verified and clear autoDeleteAt
    if (otpType === 'VERIFICATION') {
      const user = await User.findOneAndUpdate({ email }, { verified: true, autoDeleteAt: null });
      console.log(`[OTP VERIFICATION SUCCESS] Email verified: ${email}`);
      return res.json({ ok: true, message: 'Verified' });
    }

    // UNBLOCK_LOGIN will be handled by client flow: set loginBlocked false and reset failed count
    if (otpType === 'UNBLOCK_LOGIN') {
      await User.findOneAndUpdate({ email }, { loginBlocked: false, failedLoginCount: 0 });
      console.log(`[OTP VERIFICATION SUCCESS] Account unblocked: ${email}`);
      return res.json({ ok: true, message: 'Account unblocked' });
    }

    if (otpType === 'RESET_PASSWORD') {
      console.log(`[OTP VERIFICATION SUCCESS] Password reset OTP valid: ${email}`);
      return res.json({ ok: true, message: 'OTP valid for reset' });
    }

    console.log(`[OTP VERIFICATION SUCCESS] Generic OTP verified: ${email}, Type: ${otpType}`);
    res.json({ ok: true });
  } catch (err) {
    console.error(`[OTP VERIFICATION ERROR] ${err.message}`);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`[LOGIN ATTEMPT] Email: ${email}`);
    
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`[LOGIN FAILED] User not found: ${email}`);
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    if (!user.verified) {
      console.log(`[LOGIN FAILED] Email not verified: ${email}`);
      return res.status(403).json({ error: 'Email not verified' });
    }
    
    if (user.loginBlocked) {
      console.log(`[LOGIN FAILED] Account blocked: ${email}`);
      return res.status(403).json({ error: 'Account blocked. Verify UNBLOCK_LOGIN OTP.' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      console.log(`[LOGIN FAILED] Invalid password: ${email}`);
      const updated = await User.findByIdAndUpdate(user._id, { $inc: { failedLoginCount: 1 } }, { new: true });
      if (updated.failedLoginCount >= 5) {
        await User.findByIdAndUpdate(user._id, { loginBlocked: true });
        // create UNBLOCK_LOGIN OTP and email
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await Otp.create({ email, otp, otpType: 'UNBLOCK_LOGIN', expiresAt });
        await sendOtpEmail(email, otp);
        console.log(`[ACCOUNT BLOCKED] Too many failed attempts: ${email}`);
      }
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // success -> reset failedLoginCount
    await User.findByIdAndUpdate(user._id, { failedLoginCount: 0 });
    console.log(`[LOGIN SUCCESS] User: ${user.name} (${email})`);

    const access = signAccess(user);
    const jti = uuidv4();
    const refresh = await signRefresh(user, jti);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await RefreshToken.create({ jti, userId: user._id, expiresAt });

    // Return user data without password
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      verified: user.verified
    };

    console.log(`[LOGIN RESPONSE] Sending user data and tokens for: ${email}`);
    res.json({ 
      message: 'Login successful',
      user: userData, 
      tokens: {
        access: access,
        refresh: refresh
      }
    });
  } catch (err) {
    console.error(`[LOGIN ERROR] ${err.message}`);
    res.status(500).json({ error: 'Server error' });
  }
});

// Refresh tokens
router.post('/refresh', async (req, res) => {
  try {
    const { refresh } = req.body;
    if (!refresh) return res.status(400).json({ error: 'Missing token' });
    const payload = jwt.verify(refresh, config.jwt.refreshSecret);
    const user = await User.findById(payload.sub).select('refreshTokenVersion');
    if (!user || user.refreshTokenVersion !== payload.rvs) return res.status(401).json({ error: 'Revoked' });

    // check persisted refresh token
    const stored = await RefreshToken.findOne({ jti: payload.jti, userId: payload.sub });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) return res.status(401).json({ error: 'Revoked' });

    // rotate: revoke old, create new
    stored.revoked = true;
    await stored.save();
    const newJti = uuidv4();
    const newRefresh = await signRefresh(user, newJti);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await RefreshToken.create({ jti: newJti, userId: user._id, expiresAt });
    const access = signAccess(user);
    res.json({ access, refresh: newRefresh });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Logout (revoke single refresh)
router.post('/logout', async (req, res) => {
  try {
    const { jti } = req.body; // client should send refresh jti if available
    if (jti) await RefreshToken.findOneAndUpdate({ jti }, { revoked: true });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Forgot password -> create RESET_PASSWORD OTP
router.post('/forgot', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ ok: true }); // don't leak

    await Otp.deleteMany({ email, otpType: 'RESET_PASSWORD' });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await Otp.create({ email, otp, otpType: 'RESET_PASSWORD', expiresAt });
    await sendOtpEmail(email, otp);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset password -> requires valid RESET_PASSWORD OTP
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const valid = await Otp.findOne({ email, otp, otpType: 'RESET_PASSWORD' });
    if (!valid) return res.status(400).json({ error: 'Invalid OTP' });
    await Otp.deleteMany({ email, otpType: 'RESET_PASSWORD' });

    const hash = await bcrypt.hash(newPassword, 12);
    // bump refreshTokenVersion to revoke all
    await User.findOneAndUpdate({ email }, { password: hash, $inc: { refreshTokenVersion: 1 } });
    // revoke all persisted refresh tokens for user
    await RefreshToken.updateMany({ userId: (await User.findOne({ email }))._id }, { revoked: true });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userData = {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      verified: req.user.verified
    };
    res.json({ user: userData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
