CREATE TABLE IF NOT EXISTS catalog_overrides (
  sku TEXT PRIMARY KEY NOT NULL,
  data_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);
