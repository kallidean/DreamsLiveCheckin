CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  email VARCHAR UNIQUE,
  phone VARCHAR UNIQUE,
  role VARCHAR DEFAULT 'rep' CHECK (role IN ('rep','supervisor','admin')),
  region VARCHAR,
  category VARCHAR,
  password_hash VARCHAR NOT NULL,
  verified BOOLEAN DEFAULT false,
  verification_token VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);
