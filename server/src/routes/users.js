const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/users — admin only
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.region, u.category,
              u.verified, u.active, u.created_at, u.supervisor_id, s.name as supervisor_name
       FROM users u
       LEFT JOIN users s ON s.id = u.supervisor_id
       ORDER BY u.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users — admin only
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, email, password, phone, role = 'rep', region, category, supervisor_id } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  try {
    const password_hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, phone, role, region, category, password_hash, verified, supervisor_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
       RETURNING id, name, email, phone, role, region, category, verified, created_at, supervisor_id`,
      [name, email, phone || null, role, region || null, category || null, password_hash, supervisor_id || null]
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

// GET /api/users/supervisors — admin only (for supervisor dropdown)
router.get('/supervisors', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name FROM users WHERE role = 'supervisor' AND active = true ORDER BY name ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch supervisors' });
  }
});

// GET /api/users/reps — supervisor and admin (for report filter dropdown)
// Supervisors only see their own team's reps; admins see all
router.get('/reps', requireAuth, requireRole('supervisor', 'admin'), async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'admin') {
      const result = await pool.query(
        `SELECT id, name FROM users WHERE role = 'rep' AND active = true ORDER BY name ASC`
      );
      rows = result.rows;
    } else {
      const result = await pool.query(
        `WITH RECURSIVE subordinates AS (
           SELECT id FROM users WHERE supervisor_id = $1
           UNION ALL
           SELECT u.id FROM users u INNER JOIN subordinates s ON u.supervisor_id = s.id
         )
         SELECT id, name FROM users
         WHERE role = 'rep' AND active = true AND id IN (SELECT id FROM subordinates)
         ORDER BY name ASC`,
        [req.user.id]
      );
      rows = result.rows;
    }
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch reps' });
  }
});

// GET /api/users/team — supervisor+admin (for Team tab org tree)
// Supervisors get their subordinate subtree; admins get all non-admin users
router.get('/team', requireAuth, requireRole('supervisor', 'admin'), async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'admin') {
      const result = await pool.query(
        `SELECT id, name, role, region, category, supervisor_id, active
         FROM users WHERE role != 'admin' ORDER BY name ASC`
      );
      rows = result.rows;
    } else {
      const result = await pool.query(
        `WITH RECURSIVE subordinates AS (
           SELECT id, name, role, region, category, supervisor_id, active
           FROM users WHERE supervisor_id = $1
           UNION ALL
           SELECT u.id, u.name, u.role, u.region, u.category, u.supervisor_id, u.active
           FROM users u INNER JOIN subordinates s ON u.supervisor_id = s.id
         )
         SELECT * FROM subordinates ORDER BY name ASC`,
        [req.user.id]
      );
      rows = result.rows;
    }
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

// PATCH /api/users/:id — admin only
router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { role, region, category, verified, active, phone, email, supervisor_id } = req.body;

  // If supervisor_id is being set, check for circular relationships
  if (supervisor_id !== undefined && supervisor_id !== null && supervisor_id !== '') {
    if (supervisor_id === id) {
      return res.status(400).json({ error: 'A user cannot be their own supervisor.' });
    }
    try {
      const { rows: cycleCheck } = await pool.query(
        `WITH RECURSIVE subordinates AS (
           SELECT id FROM users WHERE id = $1
           UNION ALL
           SELECT u.id FROM users u INNER JOIN subordinates s ON u.supervisor_id = s.id
         )
         SELECT id FROM subordinates WHERE id = $2`,
        [id, supervisor_id]
      );
      if (cycleCheck.length > 0) {
        return res.status(400).json({ error: 'Circular relationship detected: the proposed supervisor is a subordinate of this user.' });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to validate supervisor relationship' });
    }
  }

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
  if (supervisor_id !== undefined) {
    params.push(supervisor_id || null);
    updates.push(`supervisor_id = $${params.length}`);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  params.push(id);
  try {
    const { rows } = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length}
       RETURNING id, name, email, phone, role, region, category, verified, active, supervisor_id`,
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
