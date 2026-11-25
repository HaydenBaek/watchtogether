-- Run this once to create the tables. Safe to re-run: existing tables and data are kept.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per call to /users/me and /recommendations (the "API calls" counts).
CREATE TABLE IF NOT EXISTS api_usage (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  method TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- api_usage grows with every call, so counting one user's calls would get slower over time.
-- This index lets PostgreSQL jump straight to that user's rows instead of reading the whole table.
CREATE INDEX IF NOT EXISTS api_usage_user_id_idx ON api_usage (user_id);
