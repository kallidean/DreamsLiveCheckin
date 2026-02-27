CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  address VARCHAR,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  google_maps_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);
