-- Esquema de base de datos del sistema de gimnasio

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin', -- 'admin' | 'coach'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  photo_url TEXT,
  join_date TEXT NOT NULL DEFAULT (date('now')),
  active INTEGER NOT NULL DEFAULT 1, -- baja lógica
  notes TEXT,
  fingerprint_id TEXT, -- reservado para integración futura de lector de huellas (fase 2)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  plan_id INTEGER REFERENCES plans(id),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  payment_method TEXT,
  payment_date TEXT NOT NULL DEFAULT (date('now')),
  registered_by INTEGER REFERENCES admins(id),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  result TEXT NOT NULL, -- 'allowed' | 'denied'
  reason TEXT,
  method TEXT NOT NULL DEFAULT 'manual', -- 'manual' | reservado 'fingerprint' (fase 2)
  registered_by INTEGER REFERENCES admins(id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_member ON subscriptions(member_id);
CREATE INDEX IF NOT EXISTS idx_checkins_member ON checkins(member_id);
CREATE INDEX IF NOT EXISTS idx_members_full_name ON members(full_name);
