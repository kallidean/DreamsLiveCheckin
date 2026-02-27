const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/users — admin only
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, phone, role, region, category, verified, created_at
       FROM users ORDER BY created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PATCH /api/users/:id — admin only
router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { role, region, category, verified } = req.body;

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

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  params.push(id);
  try {
    const { rows } = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length}
       RETURNING id, name, email, phone, role, region, category, verified`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

module.exports = router;
