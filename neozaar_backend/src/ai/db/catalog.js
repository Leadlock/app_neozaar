/**
 * Catalog store — delegates to ApiCatalogProvider (the PRIMARY catalog source).
 *
 * This module provides the synchronous catalog interface that the retrieval layer
 * uses. The underlying data comes from the ApiCatalogProvider which can be backed
 * by:
 *   - Real PostgreSQL database    (DATABASE_URL env var)
 *   - Real REST catalog API       (CATALOG_API_URL env var)
 *   - Built-in seed data          (default, no env vars needed)
 *
 * In a production system with a real database: set DATABASE_URL or CATALOG_API_URL
 * and call `apiCatalogProvider.preload()` at startup. After that, all sync calls
 * use the in-memory cache populated from the real source.
 *
 * The retrieval layer (search.ts, unifiedRetrieval.ts) uses this `catalog` singleton.
 * The catalog singleton now delegates to `apiCatalogProvider` so that when the
 * API provider is preloaded with real data, all catalog queries automatically use
 * the authoritative source.
 */

const { apiCatalogProvider } = require("./apiCatalogProvider");

class CatalogStore {
  // ── Getters ───────────────────────────────────────────────────────────────

  getProduct(id) {
    return apiCatalogProvider.getProduct(id);
  }

  getService(id) {
    return apiCatalogProvider.getService(id);
  }

  getSolution(id) {
    return apiCatalogProvider.getSolution(id);
  }

  getItem(id) {
    return apiCatalogProvider.getItem(id);
  }

  // ── Collections ───────────────────────────────────────────────────────────

  getAllProducts() {
    return apiCatalogProvider.getAllProducts();
  }

  getAllServices() {
    return apiCatalogProvider.getAllServices();
  }

  getAllSolutions() {
    return apiCatalogProvider.getAllSolutions();
  }

  getAllItems() {
    return apiCatalogProvider.getAllItems();
  }

  // ── Related item expansion ────────────────────────────────────────────────

  getRelatedItems(id) {
    return apiCatalogProvider.getRelatedItems(id);
  }
}

// Singleton instance — all layers share the same catalog
const catalog = new CatalogStore();

module.exports = { catalog };
