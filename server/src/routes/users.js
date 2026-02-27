const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/users — admin only
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, phone, role, region, category, verified, active, created_at
       FROM users ORDER BY created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users — admin only
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, email, password, phone, role = 'rep', region, category } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  try {
    const password_hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, phone, role, region, category, password_hash, verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING id, name, email, phone, role, region, category, verified, created_at`,
      [name, email, phone || null, role, region || null, category || null, password_hash]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PATCH /api/users/:id — admin only
router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { role, region, category, verified, active, phone, email } = req.body;

  const updates = [];
  const params = [];

  if (role !== undefined) {
    params.push(role);
    updates.push(`role = $${params.length}`);
  }
  if (region !== undefined) {
    params.push(region);
    updates.push(`region = $${params.length}`);
  }
  if (category !== undefined) {
    params.push(category);
    updates.push(`category = $${params.length}`);
  }
  if (verified !== undefined) {
    params.push(verified);
    updates.push(`verified = $${params.length}`);
  }
  if (active !== undefined) {
    params.push(active);
    updates.push(`active = $${params.length}`);
  }
  if (phone !== undefined) {
    params.push(phone || null);
    updates.push(`phone = $${params.length}`);
  }
  if (email !== undefined && email) {
    params.push(email);
    updates.push(`email = $${params.length}`);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  params.push(id);
  try {
    const { rows } = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length}
       RETURNING id, name, email, phone, role, region, category, verified, active`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// GET /api/users/:id/checkins — admin only
router.get('/:id/checkins', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT c.*, l.name as location_name, l.address as location_address, l.google_maps_url
       FROM checkins c
       LEFT JOIN locations l ON l.id = c.location_id
       WHERE c.user_id = $1
       ORDER BY c.checked_in_at DESC`,
      [id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch check-ins' });
  }
});

module.exports = router;
