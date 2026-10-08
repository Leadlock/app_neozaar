export const pricingOverridesSchema = {
  table: "pricing_overrides",
  columns: {
    sku: "TEXT PRIMARY KEY NOT NULL",
    inr: "INTEGER NOT NULL CHECK (inr >= 0)",
    updatedAt: "TEXT NOT NULL",
    updatedBy: "TEXT NOT NULL",
  },
} as const;

export const catalogOverridesSchema = {
  table: "catalog_overrides",
  columns: {
    sku: "TEXT PRIMARY KEY NOT NULL",
    dataJson: "TEXT NOT NULL",
    updatedAt: "TEXT NOT NULL",
    updatedBy: "TEXT NOT NULL",
  },
} as const;

export const calculatorFamiliesSchema = {
  table: "calculator_families",
  columns: { name: "TEXT PRIMARY KEY NOT NULL", position: "INTEGER NOT NULL", createdAt: "TEXT NOT NULL", createdBy: "TEXT NOT NULL" },
} as const;

export const customCatalogSkusSchema = {
  table: "custom_catalog_skus",
  columns: { sku: "TEXT PRIMARY KEY NOT NULL", dataJson: "TEXT NOT NULL", createdAt: "TEXT NOT NULL", createdBy: "TEXT NOT NULL", updatedAt: "TEXT NOT NULL", updatedBy: "TEXT NOT NULL" },
} as const;

export const calculatorSettingsSchema = {
  table: "calculator_settings",
  columns: { settingKey: "TEXT PRIMARY KEY NOT NULL", settingValue: "TEXT NOT NULL", updatedAt: "TEXT NOT NULL", updatedBy: "TEXT NOT NULL" },
} as const;
