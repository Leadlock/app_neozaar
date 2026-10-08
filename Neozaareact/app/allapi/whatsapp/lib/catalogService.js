import getPool from "./db.js";

/**
 * Read-only access to the NeoZaar catalogue for the WhatsApp bot.
 *
 * Solutions, products and services are all rows in `products`, distinguished by
 * `action_type` ('solution' | 'product' | 'service'). Everything here is scoped
 * to live, customer-facing rows only:
 *
 *   is_publish = true AND is_approved = true AND deleted_at IS NULL
 *   action_for IN ('customer','both')          -- never ISV-only
 *
 * Nothing in this module invents availability, pricing, vendor relationships or
 * marketplace presence — callers get catalogue rows or nothing, and the router
 * owns the "requires NeoZaar verification" messaging (guardrails §12.1–4).
 */

const SITE_URL = (process.env.NEXT_PUBLIC_API_WEBSITE || "").replace(/\/+$/, "");

const LIVE = `p.is_publish = true AND p.is_approved = true AND p.deleted_at IS NULL`;
const CUSTOMER_FACING = `p.action_for IN ('customer','both')`;

const COLS = `
  id, name, brand_name, brand, short_description, solution_differentiator,
  category, subcategory, cloud_provider_support, starting_price,
  has_private_offer, slug, action_type, is_feature,
  select_isv_products, select_spectrum_partner_services`;

/* ────────────────────────────── helpers ────────────────────────────── */

/** Strip HTML/entities (service descriptions carry inline markup) and collapse whitespace. */
function plainText(str) {
  if (!str) return "";
  return String(str)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Trim to n chars on a word boundary with an ellipsis. */
function truncate(str, n) {
  const s = String(str || "").trim();
  if (s.length <= n) return s;
  return `${s.slice(0, n - 1).replace(/\s+\S*$/, "")}…`;
}

/** Escape LIKE metacharacters in user-supplied search text. */
function escapeLike(s) {
  return String(s || "").replace(/[\\%_]/g, "\\$&");
}

/** Products list a real ISV in brand_name; services carry the literal "Service". */
function vendorOf(row) {
  const v = (row.brand_name || row.brand || "").trim();
  if (!v || /^service$/i.test(v)) return null;
  return v;
}

/**
 * Detail-page URL. Always the numeric id: the site's detail route resolves a
 * non-numeric segment against seo_pages.page_url (which solutions/services often
 * lack — `products.slug` is a different column), so slug links 404. `/type/<id>`
 * always resolves and matches the site's own canonical-link helper.
 */
function buildCatalogUrl(type, row) {
  if (!SITE_URL || !type || row.id == null) return null;
  return `${SITE_URL}/${type}/${row.id}`;
}

/** Shape a raw `products` row into the object the router consumes. */
function mapRow(row) {
  const type = row.action_type;
  return {
    id: row.id,
    type,
    name: (row.name || "").trim(),
    vendor: vendorOf(row),
    outcome: truncate(plainText(row.short_description), 320),
    differentiator: truncate(plainText(row.solution_differentiator), 320) || null,
    categories: (row.category || []).filter(Boolean),
    cloudProviders: (row.cloud_provider_support || []).filter(Boolean),
    hasPrivateOffer: row.has_private_offer === true,
    slug: row.slug || null,
    url: buildCatalogUrl(type, row),
    startingPrice: row.starting_price != null ? Number(row.starting_price) : null,
  };
}

/* ───────────────────── tiny TTL cache for category lists ───────────────────── */

const CACHE_TTL_MS = 5 * 60 * 1000;
const _cache = new Map();

async function cached(key, fn) {
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
  const value = await fn();
  _cache.set(key, { value, at: Date.now() });
  return value;
}

export function clearCatalogCache() {
  _cache.clear();
}

async function categoriesFor(actionType, cacheKey) {
  return cached(cacheKey, async () => {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT DISTINCT unnest(category) AS c
         FROM products p
        WHERE ${LIVE} AND p.action_type = $1 AND ${CUSTOMER_FACING}
        ORDER BY c`,
      [actionType]
    );
    return rows.map((r) => r.c).filter(Boolean);
  });
}

async function getByIds(ids, actionType, limit = 5) {
  if (!ids || !ids.length) return [];
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT ${COLS}
       FROM products p
      WHERE p.id = ANY($1::bigint[]) AND ${LIVE}
        AND p.action_type = $2 AND ${CUSTOMER_FACING}
      ORDER BY p.is_feature DESC NULLS LAST, p.name ASC
      LIMIT $3`,
    [ids, actionType, limit]
  );
  return rows.map(mapRow);
}

/**
 * Browse/search one catalogue type.
 * - empty `query`  → featured-first list (used for the initial "browse" view)
 * - category match → filter by that category
 * - otherwise      → ILIKE across name / description / (solutions) challenges
 */
async function search(actionType, query, { limit, categories, extraLikeColumns = [] }) {
  const pool = getPool();
  const q = (query || "").trim();

  if (!q) {
    const { rows } = await pool.query(
      `SELECT ${COLS} FROM products p
        WHERE ${LIVE} AND p.action_type = $1 AND ${CUSTOMER_FACING}
        ORDER BY p.is_feature DESC NULLS LAST, p.name ASC
        LIMIT $2`,
      [actionType, limit]
    );
    return rows.map(mapRow);
  }

  const catMatch = (categories || []).find((c) => c.toLowerCase() === q.toLowerCase());
  if (catMatch) {
    const { rows } = await pool.query(
      `SELECT ${COLS} FROM products p
        WHERE ${LIVE} AND p.action_type = $1 AND ${CUSTOMER_FACING}
          AND $2 = ANY(p.category)
        ORDER BY p.is_feature DESC NULLS LAST, p.name ASC
        LIMIT $3`,
      [actionType, catMatch, limit]
    );
    return rows.map(mapRow);
  }

  const like = `%${escapeLike(q)}%`;
  const extra = extraLikeColumns.map((c) => `OR ${c} ILIKE $3 ESCAPE '\\'`).join("\n            ");
  const { rows } = await pool.query(
    `SELECT ${COLS},
       CASE
         WHEN p.name ILIKE $2 ESCAPE '\\' THEN 0
         WHEN COALESCE(p.brand_name, p.brand, '') ILIKE $3 ESCAPE '\\' THEN 1
         WHEN p.name ILIKE $3 ESCAPE '\\' THEN 2
         ELSE 3
       END AS _rank
     FROM products p
     WHERE ${LIVE} AND p.action_type = $1 AND ${CUSTOMER_FACING}
       AND (
            p.name ILIKE $3 ESCAPE '\\'
            OR COALESCE(p.brand_name, p.brand, '') ILIKE $3 ESCAPE '\\'
            OR p.short_description ILIKE $3 ESCAPE '\\'
            OR array_to_string(p.category, ' ') ILIKE $3 ESCAPE '\\'
            ${extra}
       )
     ORDER BY _rank, p.is_feature DESC NULLS LAST, p.name ASC
     LIMIT $4`,
    [actionType, q, like, limit]
  );
  return rows.map(mapRow);
}

/* ────────────────────────────── solutions (§2) ────────────────────────────── */

export function getSolutionCategories() {
  return categoriesFor("solution", "cat:solution");
}

export async function searchSolutions(query = "", { limit = 8 } = {}) {
  const categories = await getSolutionCategories();
  return search("solution", query, {
    limit,
    categories,
    extraLikeColumns: [
      "array_to_string(p.customer_challenges, ' ')",
      "array_to_string(p.use_cases, ' ')",
    ],
  });
}

/**
 * One solution plus its linked products/services (§2 "Relevant products /
 * Relevant services"), resolved from select_isv_products /
 * select_spectrum_partner_services and re-checked against the live scope.
 */
export async function getSolutionById(id) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT ${COLS} FROM products p
      WHERE p.id = $1 AND ${LIVE} AND p.action_type = 'solution'`,
    [id]
  );
  if (!rows.length) return null;

  const solution = mapRow(rows[0]);
  solution.relatedProducts = await getByIds(rows[0].select_isv_products, "product", 5);
  solution.relatedServices = await getByIds(rows[0].select_spectrum_partner_services, "service", 5);
  return solution;
}

/* ────────────────────────────── products (§3) ────────────────────────────── */

export async function searchProducts(freeText, { limit = 5 } = {}) {
  if (!String(freeText || "").trim()) return [];
  return search("product", freeText, { limit });
}

export async function getProductById(id) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT ${COLS} FROM products p
      WHERE p.id = $1 AND ${LIVE} AND p.action_type = 'product'`,
    [id]
  );
  if (!rows.length) return null;

  const product = mapRow(rows[0]);
  const { rows: sol } = await pool.query(
    `SELECT p.name FROM products p
      WHERE ${LIVE} AND p.action_type = 'solution' AND $1 = ANY(p.select_isv_products)
      ORDER BY p.is_feature DESC NULLS LAST
      LIMIT 1`,
    [id]
  );
  product.relatedSolution = (sol[0]?.name || "").trim() || null;
  return product;
}

/**
 * Resolve a product for the commercial-offer flow (§6 Step 2). Accepts a
 * numeric id or free-text name. Never invents availability:
 *   found     → catalog_status 'verified', carries catalog_product_id
 *   not found → catalog_status 'requires_verification', name echoed back
 */
export async function getProductForOffer(idOrName) {
  const raw = String(idOrName ?? "").trim();

  let row = null;
  if (/^\d+$/.test(raw)) row = await getProductById(Number(raw));
  if (!row && raw) row = (await searchProducts(raw, { limit: 1 }))[0] || null;

  if (!row) {
    return {
      found: false,
      product_name: raw.slice(0, 200),
      vendor_name: null,
      catalog_product_id: null,
      catalog_status: "requires_verification",
    };
  }

  return {
    found: true,
    product_name: row.name,
    vendor_name: row.vendor,
    catalog_product_id: row.id,
    catalog_status: "verified",
    url: row.url,
    hasPrivateOffer: row.hasPrivateOffer,
  };
}

/* ────────────────────────────── services (§4) ────────────────────────────── */

export function getServiceCategories() {
  return categoriesFor("service", "cat:service");
}

export async function searchServices(query = "", { limit = 6 } = {}) {
  const categories = await getServiceCategories();
  return search("service", query, { limit, categories });
}

export async function getServiceById(id) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT ${COLS} FROM products p
      WHERE p.id = $1 AND ${LIVE} AND p.action_type = 'service'`,
    [id]
  );
  return rows.length ? mapRow(rows[0]) : null;
}

/* ────────────────────────────── generic ────────────────────────────── */

/** Single live catalogue row of any type, by id — for context carried across journeys. */
export async function getCatalogItem(id) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT ${COLS} FROM products p
      WHERE p.id = $1 AND ${LIVE}
        AND p.action_type IN ('solution', 'product', 'service')`,
    [id]
  );
  return rows.length ? mapRow(rows[0]) : null;
}
