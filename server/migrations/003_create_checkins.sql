CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  location_id UUID REFERENCES locations(id),
  contact_name VARCHAR NOT NULL,
  photo_url VARCHAR,
  gps_latitude DECIMAL(10,8),
  gps_longitude DECIMAL(11,8),
  gps_accuracy DECIMAL,
  address_resolved VARCHAR,
  checked_in_at TIMESTAMP DEFAULT NOW(),
  notes VARCHAR
);
