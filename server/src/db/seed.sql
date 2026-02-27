-- Seed data for DreamsLive Check-In
-- Passwords are bcrypt hashed (10 rounds)
-- admin@test.com / Admin1234
-- supervisor@test.com / Super1234
-- rep1-5@test.com / Rep1234

-- Insert users
INSERT INTO users (name, email, phone, role, region, category, password_hash, verified) VALUES
  ('Admin User', 'admin@test.com', '555-000-0001', 'admin', NULL, NULL, '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', true),
  ('Supervisor Sam', 'supervisor@test.com', '555-000-0002', 'supervisor', NULL, NULL, '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', true),
  ('Rep One', 'rep1@test.com', '555-000-0003', 'rep', 'North', 'Retail', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', true),
  ('Rep Two', 'rep2@test.com', '555-000-0004', 'rep', 'North', 'Wholesale', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', true),
  ('Rep Three', 'rep3@test.com', '555-000-0005', 'rep', 'North', 'Retail', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', true),
  ('Rep Four', 'rep4@test.com', '555-000-0006', 'rep', 'South', 'Wholesale', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', true),
  ('Rep Five', 'rep5@test.com', '555-000-0007', 'rep', 'South', 'Retail', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', true)
ON CONFLICT (email) DO NOTHING;

-- Insert locations
INSERT INTO locations (name, address, latitude, longitude, google_maps_url) VALUES
  ('Sunrise Bakery', '123 Main St, Springfield, IL 62701', 39.79853400, -89.64435100, 'https://www.google.com/maps?q=39.79853400,-89.64435100'),
  ('Metro Hardware', '456 Oak Ave, Chicago, IL 60601', 41.87811400, -87.62979800, 'https://www.google.com/maps?q=41.87811400,-87.62979800'),
  ('Green Valley Market', '789 Elm Rd, Peoria, IL 61602', 40.69364800, -89.58899800, 'https://www.google.com/maps?q=40.69364800,-89.58899800'),
  ('Lakeside Pharmacy', '321 Lake Dr, Rockford, IL 61101', 42.27113000, -89.09398700, 'https://www.google.com/maps?q=42.27113000,-89.09398700'),
  ('Downtown Deli', '654 Center Blvd, Joliet, IL 60432', 41.52530000, -88.08173700, 'https://www.google.com/maps?q=41.52530000,-88.08173700'),
  ('Southside Auto Parts', '987 South St, Decatur, IL 62521', 39.84031200, -88.95450900, 'https://www.google.com/maps?q=39.84031200,-88.95450900'),
  ('River City Sports', '147 River Rd, Champaign, IL 61820', 40.11642200, -88.24341500, 'https://www.google.com/maps?q=40.11642200,-88.24341500'),
  ('Northgate Office Supply', '258 North Blvd, Aurora, IL 60505', 41.75753300, -88.32006600, 'https://www.google.com/maps?q=41.75753300,-88.32006600')
ON CONFLICT DO NOTHING;
