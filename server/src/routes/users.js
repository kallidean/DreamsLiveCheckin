const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/users — admin only
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role, u.region, u.category,
              u.verified, u.active, u.created_at, u.supervisor_id,
              CASE WHEN s.last_name IS NOT NULL AND s.last_name != ''
                   THEN s.last_name || ', ' || s.first_name
                   ELSE s.first_name
              END as supervisor_name
       FROM users u
       LEFT JOIN users s ON s.id = u.supervisor_id
       ORDER BY u.last_name ASC NULLS LAST, u.first_name ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users — admin only
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { first_name, last_name, email, password, phone, role = 'rep', region, category, supervisor_id } = req.body;
  if (!first_name || !email || !password) {
    return res.status(400).json({ error: 'First name, email, and password are required' });
  }
  try {
    const password_hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (first_name, last_name, email, phone, role, region, category, password_hash, verified, supervisor_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)
       RETURNING id, first_name, last_name, email, phone, role, region, category, verified, created_at, supervisor_id`,
      [first_name, last_name || null, email, phone || null, role, region || null, category || null, password_hash, supervisor_id || null]
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
      `SELECT id,
              CASE WHEN last_name IS NOT NULL AND last_name != ''
                   THEN last_name || ', ' || first_name
                   ELSE first_name
              END as name
       FROM users WHERE role = 'supervisor' AND active = true
       ORDER BY last_name ASC NULLS LAST, first_name ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch supervisors' });
  }
});

// GET /api/users/reps — supervisor and admin (for filter dropdowns)
// Supervisors: scoped to their team. Admins: all reps, or scoped to a
// supervisor's team if ?supervisor_id=xxx is provided.
router.get('/reps', requireAuth, requireRole('supervisor', 'admin'), async (req, res) => {
  const { supervisor_id } = req.query;
  const nameExpr = `CASE WHEN last_name IS NOT NULL AND last_name != ''
                         THEN last_name || ', ' || first_name
                         ELSE first_name
                    END`;
  try {
    let rows;
    if (req.user.role === 'admin') {
      if (supervisor_id) {
        const result = await pool.query(
          `WITH RECURSIVE subordinates AS (
             SELECT id FROM users WHERE supervisor_id = $1
             UNION ALL
             SELECT u.id FROM users u INNER JOIN subordinates s ON u.supervisor_id = s.id
           )
           SELECT id, ${nameExpr} as name FROM users
           WHERE role = 'rep' AND active = true AND id IN (SELECT id FROM subordinates)
           ORDER BY last_name ASC NULLS LAST, first_name ASC`,
          [supervisor_id]
        );
        rows = result.rows;
      } else {
        const result = await pool.query(
          `SELECT id, ${nameExpr} as name FROM users
           WHERE role = 'rep' AND active = true
           ORDER BY last_name ASC NULLS LAST, first_name ASC`
        );
        rows = result.rows;
      }
    } else {
      const result = await pool.query(
        `WITH RECURSIVE subordinates AS (
           SELECT id FROM users WHERE supervisor_id = $1
           UNION ALL
           SELECT u.id FROM users u INNER JOIN subordinates s ON u.supervisor_id = s.id
         )
         SELECT id, ${nameExpr} as name FROM users
         WHERE role = 'rep' AND active = true AND id IN (SELECT id FROM subordinates)
         ORDER BY last_name ASC NULLS LAST, first_name ASC`,
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
        `SELECT id, first_name, last_name, role, region, category, supervisor_id, active
         FROM users WHERE role != 'admin' ORDER BY last_name ASC NULLS LAST, first_name ASC`
      );
      rows = result.rows;
    } else {
      const result = await pool.query(
        `WITH RECURSIVE subordinates AS (
           SELECT id, first_name, last_name, role, region, category, supervisor_id, active
           FROM users WHERE supervisor_id = $1
           UNION ALL
           SELECT u.id, u.first_name, u.last_name, u.role, u.region, u.category, u.supervisor_id, u.active
           FROM users u INNER JOIN subordinates s ON u.supervisor_id = s.id
         )
         SELECT * FROM subordinates ORDER BY last_name ASC NULLS LAST, first_name ASC`,
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
  const { first_name, last_name, role, region, category, verified, active, phone, email, supervisor_id } = req.body;

  // If role is being changed away from supervisor, ensure no direct reports exist
  if (role !== undefined) {
    try {
      const { rows: current } = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
      if (!current[0]) return res.status(404).json({ error: 'User not found' });
      if (current[0].role === 'supervisor' && role !== 'supervisor') {
        const { rows: reports } = await pool.query(
          'SELECT id FROM users WHERE supervisor_id = $1 LIMIT 1', [id]
        );
        if (reports.length > 0) {
          return res.status(400).json({
            error: 'This supervisor has direct reports. Reassign them before changing the role.',
          });
        }
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to validate role change' });
    }
  }

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

  if (first_name !== undefined && first_name) {
    params.push(first_name);
    updates.push(`first_name = $${params.length}`);
  }
  if (last_name !== undefined) {
    params.push(last_name || null);
    updates.push(`last_name = $${params.length}`);
  }
  if (role !== undefined) {
    params.push(role);
    updates.push(`role = $${params.length}`);
  }
  if (region !== undefined) {
    params.push(region || null);
    updates.push(`region = $${params.length}`);
  }
  if (category !== undefined) {
    params.push(category || null);
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
       RETURNING id, first_name, last_name, email, phone, role, region, category, verified, active, supervisor_id`,
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
