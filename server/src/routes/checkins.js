const express = require('express');
const https = require('https');
const cloudinary = require('cloudinary').v2;
const { Resend } = require('resend');
const { find: findTimezone } = require('geo-tz');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function fetchNominatim(lat, lng) {
  return new Promise((resolve, reject) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const options = {
      headers: { 'User-Agent': 'DreamsLiveCheckin/1.0' },
    };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// POST /api/checkins
router.post('/', requireAuth, requireRole('rep', 'supervisor', 'admin'), async (req, res) => {
  const { business_name, contact_name, contact_email, contact_phone, notes, photo, latitude, longitude, gps_accuracy } = req.body;

  if (!business_name || !contact_name) {
    return res.status(400).json({ error: 'Business name and contact name are required' });
  }

  try {
    // Reverse geocode
    let address_resolved = null;
    if (latitude && longitude) {
      try {
        const geo = await fetchNominatim(latitude, longitude);
        address_resolved = geo.display_name || null;
      } catch (geoErr) {
        console.error('Geocode error:', geoErr.message);
      }
    }

    const google_maps_url = latitude && longitude
      ? `https://www.google.com/maps?q=${latitude},${longitude}`
      : null;

    // Derive timezone from coordinates
    let timezone = null;
    if (latitude && longitude) {
      try {
        const zones = findTimezone(latitude, longitude);
        timezone = zones[0] || null;
      } catch (tzErr) {
        console.error('Timezone lookup error:', tzErr.message);
      }
    }

    // Upsert location
    let location;
    const { rows: existingLocs } = await pool.query(
      'SELECT * FROM locations WHERE LOWER(name) = LOWER($1) LIMIT 1',
      [business_name]
    );

    if (existingLocs.length > 0) {
      location = existingLocs[0];
    } else {
      const { rows: newLocs } = await pool.query(
        `INSERT INTO locations (name, address, latitude, longitude, google_maps_url)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [business_name, address_resolved, latitude || null, longitude || null, google_maps_url]
      );
      location = newLocs[0];
    }

    // Upload photo to Cloudinary
    let photo_url = null;
    if (photo) {
      try {
        const result = await cloudinary.uploader.upload(photo, {
          folder: 'checkins',
          transformation: [{ width: 800, quality: 'auto:low', fetch_format: 'auto' }],
        });
        photo_url = result.secure_url;
      } catch (uploadErr) {
        console.error('Cloudinary upload error:', uploadErr.message);
      }
    }

    // Insert check-in
    const { rows: checkinRows } = await pool.query(
      `INSERT INTO checkins (user_id, location_id, contact_name, contact_email, contact_phone, photo_url, gps_latitude, gps_longitude, gps_accuracy, address_resolved, notes, timezone, checked_in_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
       RETURNING *`,
      [req.user.id, location.id, contact_name, contact_email || null, contact_phone || null, photo_url, latitude || null, longitude || null, gps_accuracy || null, address_resolved, notes || null, timezone]
    );
    const checkin = checkinRows[0];

    // Send supervisor email
    const now = new Date();
    const timeStr = now.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      ...(timezone ? { timeZone: timezone } : {}),
    });
    const subject = `Check-in: ${req.user.name} @ ${business_name} — ${timeStr}`;

    try {
      const { rows: supervisors } = await pool.query(
        `SELECT email FROM users WHERE role = 'supervisor' AND active = true AND verified = true`
      );
      const uniqueRecipients = [...new Set(supervisors.map(s => s.email))];

      if (uniqueRecipients.length > 0) {
        const html = `
          <h2>New Check-In Received</h2>
          <table style="border-collapse:collapse;width:100%">
            <tr><td style="padding:8px;font-weight:bold">Rep</td><td style="padding:8px">${req.user.name}</td></tr>
            <tr><td style="padding:8px;font-weight:bold">Time</td><td style="padding:8px">${timeStr}</td></tr>
            <tr><td style="padding:8px;font-weight:bold">Business</td><td style="padding:8px">${business_name}</td></tr>
            <tr><td style="padding:8px;font-weight:bold">Contact</td><td style="padding:8px">${contact_name}</td></tr>
            ${contact_email ? `<tr><td style="padding:8px;font-weight:bold">Contact Email</td><td style="padding:8px">${contact_email}</td></tr>` : ''}
            ${contact_phone ? `<tr><td style="padding:8px;font-weight:bold">Contact Phone</td><td style="padding:8px">${contact_phone}</td></tr>` : ''}
            <tr><td style="padding:8px;font-weight:bold">Address</td><td style="padding:8px">${address_resolved || 'N/A'}</td></tr>
            ${google_maps_url ? `<tr><td style="padding:8px;font-weight:bold">Maps</td><td style="padding:8px"><a href="${google_maps_url}">View on Google Maps</a></td></tr>` : ''}
            ${notes ? `<tr><td style="padding:8px;font-weight:bold">Notes</td><td style="padding:8px">${notes}</td></tr>` : ''}
          </table>
          ${photo_url ? `<br><img src="${photo_url}" alt="Check-in photo" style="max-width:600px;border-radius:8px;">` : ''}
        `;
        await Promise.all(uniqueRecipients.map(to =>
          resend.emails.send({ from: 'DreamsLive <noreply@hellorocket.com>', to, subject, html })
            .catch(err => console.error(`Failed to send alert to ${to}:`, JSON.stringify(err)))
        ));
      }
    } catch (emailErr) {
      console.error('Failed to send supervisor alerts:', JSON.stringify(emailErr));
    }

    res.json({ success: true, data: { checkin } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit check-in' });
  }
});

// GET /api/checkins/my
router.get('/my', requireAuth, async (req, res) => {
  const now = new Date();
  const { start_date, end_date } = req.query;

  try {
    let query, params;

    if (start_date || end_date) {
      const conditions = ['c.user_id = $1'];
      params = [req.user.id];
      if (start_date) {
        params.push(start_date);
        conditions.push(`c.checked_in_at >= $${params.length}`);
      }
      if (end_date) {
        params.push(end_date);
        conditions.push(`c.checked_in_at <= $${params.length}::date + interval '1 day'`);
      }
      query = `SELECT c.*, l.name as location_name, l.address as location_address, l.google_maps_url
               FROM checkins c
               LEFT JOIN locations l ON l.id = c.location_id
               WHERE ${conditions.join(' AND ')}
               ORDER BY c.checked_in_at DESC`;
    } else {
      const month = parseInt(req.query.month) || now.getMonth() + 1;
      const year = parseInt(req.query.year) || now.getFullYear();
      query = `SELECT c.*, l.name as location_name, l.address as location_address, l.google_maps_url
               FROM checkins c
               LEFT JOIN locations l ON l.id = c.location_id
               WHERE c.user_id = $1
                 AND EXTRACT(MONTH FROM c.checked_in_at) = $2
                 AND EXTRACT(YEAR FROM c.checked_in_at) = $3
               ORDER BY c.checked_in_at DESC`;
      params = [req.user.id, month, year];
    }

    const { rows } = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch check-ins' });
  }
});

// GET /api/checkins/all
router.get('/all', requireAuth, requireRole('supervisor', 'admin'), async (req, res) => {
  const { rep_id, region, category, start_date, end_date } = req.query;

  const conditions = [];
  const params = [];

  if (rep_id) {
    params.push(rep_id);
    conditions.push(`c.user_id = $${params.length}`);
  }
  if (region) {
    params.push(region);
    conditions.push(`u.region = $${params.length}`);
  }
  if (category) {
    params.push(category);
    conditions.push(`u.category = $${params.length}`);
  }
  if (start_date) {
    params.push(start_date);
    conditions.push(`c.checked_in_at >= $${params.length}`);
  }
  if (end_date) {
    params.push(end_date);
    conditions.push(`c.checked_in_at <= $${params.length}::date + interval '1 day'`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const { rows } = await pool.query(
      `SELECT c.*, u.name as rep_name, u.email as rep_email, u.region, u.category,
              l.name as location_name, l.address as location_address, l.google_maps_url
       FROM checkins c
       LEFT JOIN users u ON u.id = c.user_id
       LEFT JOIN locations l ON l.id = c.location_id
       ${where}
       ORDER BY c.checked_in_at DESC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch check-ins' });
  }
});

// DELETE /api/checkins/:id — admin only
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query('DELETE FROM checkins WHERE id = $1 RETURNING id, photo_url', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Check-in not found' });

    // Delete photo from Cloudinary if one exists
    const photoUrl = rows[0].photo_url;
    if (photoUrl) {
      try {
        // Extract public_id from URL: everything after /upload/ and before the file extension
        const match = photoUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
        if (match) {
          await cloudinary.uploader.destroy(match[1]);
        }
      } catch (cloudErr) {
        console.error('Failed to delete Cloudinary image:', cloudErr.message);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete check-in' });
  }
});

module.exports = router;
