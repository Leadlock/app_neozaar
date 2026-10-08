CREATE TABLE IF NOT EXISTS pricing_overrides (
  sku TEXT PRIMARY KEY NOT NULL,
  inr INTEGER NOT NULL CHECK (inr >= 0),
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);
