require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const pool = require('./pool');

async function seed() {
  const client = await pool.connect();
  try {
    // Hash passwords
    const adminHash = await bcrypt.hash('Admin1234', 10);
    const superHash = await bcrypt.hash('Super1234', 10);
    const repHash = await bcrypt.hash('Rep1234', 10);

    // Insert users
    await client.query(`
      INSERT INTO users (name, email, phone, role, region, category, password_hash, verified) VALUES
        ('Admin User', 'elitovsky@zenproject.net', '555-000-0001', 'admin', NULL, NULL, $1, true),
        ('Supervisor Sam', 'Marketing@dreamsresources.com', '555-000-0002', 'supervisor', NULL, NULL, $2, true),
        ('Rep One', 'rep1@test.com', '555-000-0003', 'rep', 'North', 'Retail', $3, true),
        ('Rep Two', 'rep2@test.com', '555-000-0004', 'rep', 'North', 'Wholesale', $3, true),
        ('Rep Three', 'rep3@test.com', '555-000-0005', 'rep', 'North', 'Retail', $3, true),
        ('Rep Four', 'rep4@test.com', '555-000-0006', 'rep', 'South', 'Wholesale', $3, true),
        ('Rep Five', 'rep5@test.com', '555-000-0007', 'rep', 'South', 'Retail', $3, true)
      ON CONFLICT (email) DO NOTHING
    `, [adminHash, superHash, repHash]);

    // Insert locations
    await client.query(`
      INSERT INTO locations (name, address, latitude, longitude, google_maps_url) VALUES
        ('Sunrise Bakery', '123 Main St, Springfield, IL 62701', 39.79853400, -89.64435100, 'https://www.google.com/maps?q=39.79853400,-89.64435100'),
        ('Metro Hardware', '456 Oak Ave, Chicago, IL 60601', 41.87811400, -87.62979800, 'https://www.google.com/maps?q=41.87811400,-87.62979800'),
        ('Green Valley Market', '789 Elm Rd, Peoria, IL 61602', 40.69364800, -89.58899800, 'https://www.google.com/maps?q=40.69364800,-89.58899800'),
        ('Lakeside Pharmacy', '321 Lake Dr, Rockford, IL 61101', 42.27113000, -89.09398700, 'https://www.google.com/maps?q=42.27113000,-89.09398700'),
        ('Downtown Deli', '654 Center Blvd, Joliet, IL 60432', 41.52530000, -88.08173700, 'https://www.google.com/maps?q=41.52530000,-88.08173700'),
        ('Southside Auto Parts', '987 South St, Decatur, IL 62521', 39.84031200, -88.95450900, 'https://www.google.com/maps?q=39.84031200,-88.95450900'),
        ('River City Sports', '147 River Rd, Champaign, IL 61820', 40.11642200, -88.24341500, 'https://www.google.com/maps?q=40.11642200,-88.24341500'),
        ('Northgate Office Supply', '258 North Blvd, Aurora, IL 60505', 41.75753300, -88.32006600, 'https://www.google.com/maps?q=41.75753300,-88.32006600')
      ON CONFLICT DO NOTHING
    `);

    // Get user and location IDs for check-ins
    const { rows: users } = await client.query(
      "SELECT id, name FROM users WHERE role = 'rep' ORDER BY email"
    );
    const { rows: locations } = await client.query('SELECT id FROM locations ORDER BY created_at');

    if (users.length < 5 || locations.length < 8) {
      console.log('Users or locations not found, skipping checkin seed.');
      return;
    }

    const checkinData = [
      { user: users[0].id, location: locations[0].id, contact: 'Mary Johnson', lat: 39.7985, lng: -89.6444, acc: 8.5, notes: 'Great meeting, interested in new product line' },
      { user: users[0].id, location: locations[1].id, contact: 'Bob Smith', lat: 41.8781, lng: -87.6298, acc: 12.3, notes: 'Placed order for 50 units' },
      { user: users[1].id, location: locations[2].id, contact: 'Linda Park', lat: 40.6936, lng: -89.5890, acc: 6.1, notes: 'Follow up needed next week' },
      { user: users[1].id, location: locations[3].id, contact: 'Tom Davis', lat: 42.2711, lng: -89.0940, acc: 9.7, notes: '' },
      { user: users[2].id, location: locations[4].id, contact: 'Sara Wilson', lat: 41.5253, lng: -88.0817, acc: 15.2, notes: 'Left samples' },
      { user: users[2].id, location: locations[5].id, contact: 'Mike Brown', lat: 39.8403, lng: -88.9545, acc: 7.8, notes: 'Discussed Q2 promotions' },
      { user: users[3].id, location: locations[6].id, contact: 'Amy Chen', lat: 40.1164, lng: -88.2434, acc: 5.4, notes: '' },
      { user: users[3].id, location: locations[7].id, contact: 'James Lee', lat: 41.7575, lng: -88.3201, acc: 11.0, notes: 'New contact — very promising' },
      { user: users[4].id, location: locations[0].id, contact: 'Patricia Hall', lat: 39.7986, lng: -89.6443, acc: 8.9, notes: 'Reorder confirmed' },
      { user: users[4].id, location: locations[2].id, contact: 'Carlos Rivera', lat: 40.6937, lng: -89.5891, acc: 13.6, notes: 'Price concern, will discuss with manager' },
    ];

    for (const c of checkinData) {
      await client.query(`
        INSERT INTO checkins (user_id, location_id, contact_name, gps_latitude, gps_longitude, gps_accuracy, address_resolved, notes, checked_in_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() - INTERVAL '${Math.floor(Math.random() * 30)} days')
      `, [c.user, c.location, c.contact, c.lat, c.lng, c.acc, 'Resolved address via GPS', c.notes]);
    }

    console.log('Seed complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
