/**
 * API Catalog Provider.
 *
 * This is the PRIMARY catalog source — API / PostgreSQL database.
 *
 * It wraps the catalog data layer so that:
 *   - In production: data is fetched from a real PostgreSQL database or REST API
 *   - In development / test (no DB configured): it falls back to the static seed data
 *
 * This design allows the rest of the system to treat the API source as authoritative
 * without requiring a live database connection in all environments.
 *
 * ── Configuration ────────────────────────────────────────────────────────────
 * Set environment variables to enable the real database:
 *
 *   CATALOG_API_URL       Full URL of a REST catalog API  (optional)
 *   DATABASE_URL          PostgreSQL connection string     (optional, takes priority)
 *
 * If neither is set, the provider uses the built-in seed data.
 *
 * ── REST API contract ────────────────────────────────────────────────────────
 * Expected endpoints on CATALOG_API_URL:
 *   GET /products          → Product[]
 *   GET /services          → Service[]
 *   GET /solutions         → Solution[]
 *   GET /products/:id      → Product
 *   GET /services/:id      → Service
 *   GET /solutions/:id     → Solution
 *   GET /items/:id         → Product | Service | Solution
 *
 * ── PostgreSQL schema ────────────────────────────────────────────────────────
 * Expected tables: catalog_products, catalog_services, catalog_solutions
 * with columns matching the Product / Service / Solution interfaces.
 * See DATABASE_SCHEMA.md (in Proposal Studio) for the full schema specification.
 *
 * ── Security ─────────────────────────────────────────────────────────────────
 * All credentials are read from environment variables.
 * The frontend never connects directly to this provider.
 * The AI never receives raw SQL access.
 *
 * ── Ported from Proposal Studio into neozaar_backend ────────────────────────
 * ADJUSTMENT vs. the standalone Proposal Studio version: instead of opening its
 * own `pg.Pool` from DB_HOST/DB_USER/etc., this file now reuses neozaar_backend's
 * existing shared pool (`src/config/database.js`) — the same Postgres database
 * (`proddb`) either way, just one shared connection pool instead of a second one.
 */

const { PRODUCTS, SERVICES, SOLUTIONS } = require("./seed");
// Shared connection pool already used by every other module in neozaar_backend.
// Ported adjustment: the standalone Proposal Studio version opened its own
// `new pg.Pool(...)` here from DB_HOST/DB_USER/etc.; we now reuse the app's
// single shared pool instead of creating a second one against the same DB.
const sharedPool = require("../../config/database.js");

// ─────────────────────────────────────────────────────────────────────────────
// Provider detection
// ─────────────────────────────────────────────────────────────────────────────

function getApiProviderMode() {
  if (process.env.DATABASE_URL || process.env.DB_HOST) return "postgresql";
  if (process.env.CATALOG_API_URL) return "rest_api";
  return "seed";
}

// ─────────────────────────────────────────────────────────────────────────────
// REST API fetch helpers
// ─────────────────────────────────────────────────────────────────────────────

async function apiFetch(path) {
  const base = process.env.CATALOG_API_URL.replace(/\/$/, "");
  const url = `${base}${path}`;
  const headers = { "Content-Type": "application/json" };
  if (process.env.CATALOG_API_KEY) {
    headers["Authorization"] = `Bearer ${process.env.CATALOG_API_KEY}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`[ApiCatalogProvider] API request failed: ${res.status} ${res.statusText} — ${url}`);
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// PostgreSQL helpers — uses the shared pool (see sharedPool import above)
// ─────────────────────────────────────────────────────────────────────────────

async function pgQuery(sql, params = []) {
  const result = await sharedPool.query(sql, params);
  return result.rows;
}

// Map a Neozaar `products` table row to the canonical Product/Service/Solution schema.
//
// Column mapping (Neozaar → Proposal Studio):
//   id            → id           (cast to text)
//   action_type   → type         ('product' | 'service' | 'solution')
//   name          → name
//   short_description → description
//   category[1]   → category     (first element of text[])
//   subcategory[1]→ subcategory
//   brand_name    → vendor
//   industry      → keywords     (text[] — used for search/matching)
//   target_segments + tags → tags (case-insensitively de-duplicated merge — used for filtering and tag-match scoring)
//   select_isv_products / select_spectrum_partner_services → includedProductIds / includedServiceIds (solutions)
function mapDbRow(row) {
  const type = (
    row.action_type?.toLowerCase() ?? "product"
  );

  const toStringArray = (val) => {
    if (Array.isArray(val)) return val.map(String).filter(Boolean);
    if (typeof val === "string") return val.split(",").map((s) => s.trim()).filter(Boolean);
    return [];
  };

  // category is text[] in Neozaar — take the first element as the primary category
  const categoryArr = toStringArray(row.category);
  const subcategoryArr = toStringArray(row.subcategory);

  // Merge target_segments (existing segment-based filtering) with the real
  // tags column (admin-entered tags), case-insensitively de-duplicated, so
  // the scorer's tag-match bonus sees admin tags too.
  const mergedTags = [];
  const seenTags = new Set();
  for (const t of [...toStringArray(row.target_segments), ...toStringArray(row.tags)]) {
    const key = t.toLowerCase();
    if (!seenTags.has(key)) {
      seenTags.add(key);
      mergedTags.push(t);
    }
  }

  return {
    id:          String(row.id ?? ""),
    type,
    name:        String(row.name ?? ""),
    description: String(row.short_description ?? ""),
    category:    categoryArr[0] ?? "general",
    subcategory: subcategoryArr[0] ?? undefined,
    vendor:      row.brand_name ? String(row.brand_name) : undefined,
    keywords:    toStringArray(row.industry),
    tags:        mergedTags,
    relatedIds:  [],
    // Solution-specific — select_isv_products holds linked product IDs
    ...(type === "solution" && {
      includedProductIds: toStringArray(row.select_isv_products),
      includedServiceIds: toStringArray(row.select_spectrum_partner_services),
    }),
    // Product-specific
    ...(type === "product" && {
      productFamily: categoryArr[0] ?? undefined,
    }),
    // Service-specific
    ...(type === "service" && {
      deliveryModel:     undefined,
      relatedProductIds: toStringArray(row.select_isv_products),
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ApiCatalogProvider class
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ApiCatalogProvider — PRIMARY catalog source.
 *
 * Wraps API / PostgreSQL access with automatic fallback to seed data
 * when no database is configured. The interface mirrors CatalogStore
 * so the two are interchangeable in the retrieval layer.
 */
class ApiCatalogProvider {
  // ── In-memory cache populated on first async load ─────────────────────────
  _products = null;
  _services = null;
  _solutions = null;

  constructor() {
    this.mode = getApiProviderMode();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Sync getters — use the seed cache for immediate access
  // (populated at startup via preload(); fallback to seed when not loaded)
  // ─────────────────────────────────────────────────────────────────────────

  getProduct(id) {
    if (this._products) return this._products.get(id);
    return PRODUCTS.find((p) => p.id === id);
  }

  getService(id) {
    if (this._services) return this._services.get(id);
    return SERVICES.find((s) => s.id === id);
  }

  getSolution(id) {
    if (this._solutions) return this._solutions.get(id);
    return SOLUTIONS.find((s) => s.id === id);
  }

  getItem(id) {
    return this.getProduct(id) ?? this.getService(id) ?? this.getSolution(id);
  }

  getAllProducts() {
    if (this._products) return Array.from(this._products.values());
    return [...PRODUCTS];
  }

  getAllServices() {
    if (this._services) return Array.from(this._services.values());
    return [...SERVICES];
  }

  getAllSolutions() {
    if (this._solutions) return Array.from(this._solutions.values());
    return [...SOLUTIONS];
  }

  getAllItems() {
    return [...this.getAllProducts(), ...this.getAllServices(), ...this.getAllSolutions()];
  }

  getRelatedItems(id) {
    const item = this.getItem(id);
    if (!item || !item.relatedIds) return [];
    return item.relatedIds
      .map((rid) => this.getItem(rid))
      .filter((i) => i !== undefined);
  }

  /** Which data source this provider is using */
  getMode() {
    return this.mode;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Async preload — fetches data from the API/DB and caches it
  // Call once at startup; subsequent sync calls use the cache.
  // ─────────────────────────────────────────────────────────────────────────

  async preload() {
    if (this.mode === "seed") {
      // Seed mode: cache is just the static seed data
      this._products  = new Map(PRODUCTS.map((p) => [p.id, p]));
      this._services  = new Map(SERVICES.map((s) => [s.id, s]));
      this._solutions = new Map(SOLUTIONS.map((s) => [s.id, s]));
      console.info("[ApiCatalogProvider] Mode: seed — using built-in catalog data");
      return;
    }

    try {
      let products  = [];
      let services  = [];
      let solutions = [];

      if (this.mode === "rest_api") {
        [products, services, solutions] = await Promise.all([
          apiFetch("/products"),
          apiFetch("/services"),
          apiFetch("/solutions"),
        ]);
        console.info(
          `[ApiCatalogProvider] Mode: REST API — loaded ${products.length} products, ` +
          `${services.length} services, ${solutions.length} solutions`
        );
      } else if (this.mode === "postgresql") {
        // Query Neozaar's products table directly — filtered to published/approved items only.
        // action_type discriminates between 'product', 'service', and 'solution'.
        const allRows = await pgQuery(
          `SELECT id, action_type, name, short_description, category, subcategory,
                  brand_name, industry, target_segments, tags,
                  select_isv_products, select_spectrum_partner_services
           FROM products
           WHERE is_publish  = true
             AND is_approved = true
             AND is_drapt    = false
             AND deleted_at  IS NULL
           ORDER BY action_type, id`
        );
        const items = allRows.map(mapDbRow);
        products  = items.filter((i) => i.type === "product");
        services  = items.filter((i) => i.type === "service");
        solutions = items.filter((i) => i.type === "solution");
        console.info(
          `[ApiCatalogProvider] Mode: PostgreSQL — loaded ${products.length} products, ` +
          `${services.length} services, ${solutions.length} solutions`
        );
      }

      this._products  = new Map(products.map( (p) => [p.id, p]));
      this._services  = new Map(services.map( (s) => [s.id, s]));
      this._solutions = new Map(solutions.map((s) => [s.id, s]));
    } catch (err) {
      // If the API/DB is unreachable, fall back to seed data gracefully
      console.warn(
        `[ApiCatalogProvider] Failed to load from ${this.mode} — falling back to seed data. Error: ${String(err)}`
      );
      this._products  = new Map(PRODUCTS.map((p) => [p.id, p]));
      this._services  = new Map(SERVICES.map((s) => [s.id, s]));
      this._solutions = new Map(SOLUTIONS.map((s) => [s.id, s]));
    }
  }
}

// Singleton — shared across all layers
const apiCatalogProvider = new ApiCatalogProvider();

module.exports = { getApiProviderMode, ApiCatalogProvider, apiCatalogProvider };
