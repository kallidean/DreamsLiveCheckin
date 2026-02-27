const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { Resend } = require('resend');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, phone, password, role = 'rep' } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  try {
    const password_hash = await bcrypt.hash(password, 10);
    const verification_token = uuidv4();

    const { rows } = await pool.query(
      `INSERT INTO users (name, email, phone, role, password_hash, verified, verification_token)
       VALUES ($1, $2, $3, $4, $5, false, $6)
       RETURNING id, name, email`,
      [name, email, phone || null, role, password_hash, verification_token]
    );

    const user = rows[0];
    const verifyUrl = `${process.env.CLIENT_URL}/verify?token=${verification_token}`;

    // Send verification email
    try {
      await resend.emails.send({
        from: 'DreamsLive <noreply@dreamslive.app>',
        to: email,
        subject: 'Verify your DreamsLive Check-In account',
        html: `
          <h2>Welcome to DreamsLive Check-In, ${name}!</h2>
          <p>Please verify your email address by clicking the link below:</p>
          <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;">Verify Email</a>
          <p>Or copy this link: ${verifyUrl}</p>
        `,
      });
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr.message);
    }

    res.json({ success: true, message: 'Check your email to verify your account' });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email or phone already registered' });
    }
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!user.verified) {
      return res.status(403).json({ error: 'Please verify your email before logging in' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const payload = { id: user.id, name: user.name, email: user.email, role: user.role, region: user.region };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    res.cookie('accessToken', accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, region: user.region },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/verify?token=xxx
router.get('/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE users SET verified = true, verification_token = NULL
       WHERE verification_token = $1 RETURNING id`,
      [token]
    );
    if (rows.length === 0) {
      return res.redirect(`${process.env.CLIENT_URL}/verify?error=invalid`);
    }
    res.redirect(`${process.env.CLIENT_URL}/login?verified=true`);
  } catch (err) {
    console.error(err);
    res.redirect(`${process.env.CLIENT_URL}/verify?error=server`);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('accessToken', COOKIE_OPTS);
  res.clearCookie('refreshToken', COOKIE_OPTS);
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, region, category FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ error: 'No refresh token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const { rows } = await pool.query(
      'SELECT id, name, email, role, region FROM users WHERE id = $1',
      [decoded.id]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'User not found' });

    const payload = { id: user.id, name: user.name, email: user.email, role: user.role, region: user.region };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
    res.cookie('accessToken', accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
    res.json({ success: true });
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

module.exports = router;
