/**
 * refreshNeoCatalog() — reload Neo's in-memory catalog after a marketplace
 * change (publish / approve / edit) so the item is available in the Neo AI
 * discovery flow immediately, instead of waiting for the ~30s change-detection
 * probe in ai.routes.js.
 *
 * Debounced: a burst of changes (e.g. a bulk approve) triggers a single reload.
 * Fire-and-forget — callers should NOT await it.
 */

const { apiCatalogProvider } = require("./apiCatalogProvider");
const { preloadExcelCatalog } = require("../discovery/excelAdapter");

const DEBOUNCE_MS = Number(process.env.NEO_CATALOG_REFRESH_DEBOUNCE_MS) || 2000;
let timer = null;

function refreshNeoCatalog(reason = "marketplace change") {
  if (timer) return;
  timer = setTimeout(async () => {
    timer = null;
    try {
      await apiCatalogProvider.preload();
      try { preloadExcelCatalog(); } catch { /* excel is optional */ }
      console.log(
        `[refreshNeoCatalog] catalog reloaded (${reason}) — ` +
        `${apiCatalogProvider.getAllProducts().length} products, ` +
        `${apiCatalogProvider.getAllServices().length} services, ` +
        `${apiCatalogProvider.getAllSolutions().length} solutions`,
      );
    } catch (e) {
      console.warn("[refreshNeoCatalog] reload failed:", e.message);
    }
  }, DEBOUNCE_MS);
  if (timer.unref) timer.unref();
}

module.exports = { refreshNeoCatalog };
