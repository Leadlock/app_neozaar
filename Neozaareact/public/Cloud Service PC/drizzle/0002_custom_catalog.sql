CREATE TABLE IF NOT EXISTS calculator_families (
  name TEXT PRIMARY KEY NOT NULL,
  position INTEGER NOT NULL DEFAULT 1000,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS custom_catalog_skus (
  sku TEXT PRIMARY KEY NOT NULL,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);
