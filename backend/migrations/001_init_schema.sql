-- =============================================================
-- Cogniq Identity Trust System - Full Schema Migration
-- Run once to initialize the database
-- =============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================
-- USERS
-- =============================================================
CREATE TABLE IF NOT EXISTS users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  email            TEXT UNIQUE NOT NULL,
  phone            TEXT,
  password_hash    TEXT NOT NULL,
  is_employee      BOOLEAN NOT NULL DEFAULT false,
  employee_role    TEXT,
  risk_tier        TEXT NOT NULL DEFAULT 'standard',
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =============================================================
-- DEVICES
-- =============================================================
CREATE TABLE IF NOT EXISTS devices (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_fingerprint    TEXT NOT NULL,
  device_name           TEXT NOT NULL DEFAULT 'Unknown Device',
  os                    TEXT NOT NULL DEFAULT 'Unknown OS',
  browser               TEXT NOT NULL DEFAULT 'Unknown Browser',
  trust_score           NUMERIC(4,3) NOT NULL DEFAULT 0.1,
  first_seen            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_trusted            BOOLEAN NOT NULL DEFAULT false,
  trust_established_at  TIMESTAMPTZ,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(user_id, device_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON devices(device_fingerprint);

-- =============================================================
-- TRANSACTIONS
-- =============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL,
  merchant    TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'general',
  channel     TEXT NOT NULL DEFAULT 'online',
  status      TEXT NOT NULL DEFAULT 'completed',
  risk_score  NUMERIC(5,2) NOT NULL DEFAULT 0,
  flagged     BOOLEAN NOT NULL DEFAULT false,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_flagged ON transactions(flagged);

-- =============================================================
-- RISK EVENTS
-- =============================================================
CREATE TABLE IF NOT EXISTS risk_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id     UUID REFERENCES devices(id) ON DELETE SET NULL,
  event_type    TEXT NOT NULL,
  risk_score    NUMERIC(5,2) NOT NULL DEFAULT 0,
  risk_factors  JSONB NOT NULL DEFAULT '[]',
  action_taken  TEXT NOT NULL DEFAULT 'allow',
  ip_address    TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_events_user_id ON risk_events(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_events_timestamp ON risk_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_risk_events_action ON risk_events(action_taken);

-- =============================================================
-- ALERTS
-- =============================================================
CREATE TABLE IF NOT EXISTS alerts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  severity     TEXT NOT NULL DEFAULT 'medium',
  status       TEXT NOT NULL DEFAULT 'active',
  description  TEXT NOT NULL,
  risk_factors JSONB NOT NULL DEFAULT '[]',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ,
  resolved_by  TEXT
);

CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);

-- =============================================================
-- Done
-- =============================================================
