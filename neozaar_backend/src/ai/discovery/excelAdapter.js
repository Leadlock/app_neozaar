/**
 * Excel Catalog Adapter.
 *
 * Loads product/solution data from Excel files in the /data directory and
 * normalises them into UnifiedSearchResult-compatible catalog items that Neo
 * can search alongside database items.
 *
 * If no Excel files are present the adapter returns an empty catalog silently —
 * the system degrades gracefully to database-only search.
 *
 * STARTUP CACHE
 * ─────────────
 * Call preloadExcelCatalog() once at application startup (done in agent.ts).
 * After that, getExcelCache() returns the already-loaded items instantly.
 * The cache can be reset in tests via resetExcelCache().
 *
 * SUPPORTED FILE FORMATS
 * ──────────────────────
 * 1. Standard product catalog format (column-based, auto-detected):
 *    Columns: name, id, vendor, category, subcategory, description, keywords
 *    Items are loaded as type: "product"
 *
 * 2. NeoZaar Discovery Requirements Knowledge Base format (excel_1.xlsx):
 *    Sheet: "Discovery Requirements"
 *    Columns: Requirement ID, Solution ID, Solution, Family, Sub-category,
 *             Capability Area, Attribute Key, What Neo Must Learn, Priority
 *    Unique Solutions are extracted and loaded as type: "solution"
 *    Multiple rows per Solution are collapsed into one item with aggregated keywords
 *
 * 3. NeoZaar Solution-Product-Service Relationship Map format (excel_2.xlsx):
 *    Sheet: "Solution Relationship Map"
 *    Columns: Relationship ID, Solution ID, Solution, Family, Sub-category,
 *             Entity Type, Entity Name, Brand / Service Role, Relationship Role
 *    Solutions, Products, and Services are extracted from the relationship map.
 *    Each unique Solution, Product, and Service becomes a searchable catalog item.
 *    Products and Services carry rich keywords linking them to their parent Solutions.
 *
 * COLUMN AUTO-DETECTION (standard format)
 * ─────────────────────────────────────────
 * Recognised aliases (case-insensitive):
 *   name/product name/product/title
 *   id/product id/sku/part number/part no
 *   vendor/brand/manufacturer/supplier
 *   category/product category/type
 *   subcategory/sub category/sub-category
 *   description/desc/product description/summary/overview
 *   keywords/tags/search terms
 */

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

// ─────────────────────────────────────────────────────────────────────────────
// NeoZaar KB format (excel_1.xlsx) — Discovery Requirements
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detect if a sheet has NeoZaar KB format by looking for the "Solution ID" column.
 */
function isNeoZaarKBFormat(headers) {
  return headers.some((h) => h.toLowerCase().trim() === "solution id");
}

/**
 * Detect if a sheet has NeoZaar Relationship Map format by looking for "Entity Type" column.
 */
function isNeoZaarRelationshipMapFormat(headers) {
  return headers.some((h) => h.toLowerCase().trim() === "entity type");
}

/**
 * Parse a NeoZaar Discovery Requirements Knowledge Base sheet.
 * Extracts unique Solutions (grouped by Solution ID) and returns them as
 * UnifiedSearchResult items of type "solution".
 *
 * Each solution aggregates:
 *   - solution name (Solution column)
 *   - family (Family column)
 *   - sub-category (Sub-category column)
 *   - all unique capability areas across its rows
 *   - all "What Neo Must Learn" values as additional description context
 */
function parseNeoZaarKBSheet(rows, source) {
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => String(h ?? "").toLowerCase().trim());

  // Find column indices
  const COL = {
    reqId:       headers.indexOf("requirement id"),
    solId:       headers.indexOf("solution id"),
    solution:    headers.indexOf("solution"),
    family:      headers.indexOf("family"),
    subCat:      headers.indexOf("sub-category"),
    capArea:     headers.indexOf("capability area"),
    attrKey:     headers.indexOf("attribute key"),
    whatToLearn: headers.indexOf("what neo must learn"),
    priority:    headers.indexOf("priority"),
  };

  if (COL.solId < 0 || COL.solution < 0) return [];

  // Group rows by Solution ID
  const solutionMap = new Map();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const solId   = String(row[COL.solId] ?? "").trim();
    const solName = String(row[COL.solution] ?? "").trim();
    if (!solId || !solName) continue;

    if (!solutionMap.has(solId)) {
      solutionMap.set(solId, {
        name:        solName,
        family:      COL.family >= 0 ? String(row[COL.family] ?? "").trim() : "",
        subCat:      COL.subCat >= 0 ? String(row[COL.subCat] ?? "").trim() : "",
        capAreas:    new Set(),
        attrKeys:    new Set(),
        whatToLearn: new Set(),
        priority:    COL.priority >= 0 ? String(row[COL.priority] ?? "").trim() : "Medium",
      });
    }

    const entry = solutionMap.get(solId);

    if (COL.capArea >= 0) {
      const ca = String(row[COL.capArea] ?? "").trim();
      if (ca) entry.capAreas.add(ca);
    }
    if (COL.attrKey >= 0) {
      const ak = String(row[COL.attrKey] ?? "").trim();
      if (ak) entry.attrKeys.add(ak);
    }
    if (COL.whatToLearn >= 0) {
      const wl = String(row[COL.whatToLearn] ?? "").trim();
      if (wl) entry.whatToLearn.add(wl);
    }
  }

  // Convert each unique solution into a UnifiedSearchResult
  const items = [];
  for (const [solId, sol] of solutionMap) {
    const capAreaList = Array.from(sol.capAreas);
    const subCatSlug = sol.subCat.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const familySlug = sol.family.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

    // Build rich keyword set from solution name, family, sub-category and capability areas
    const keywords = Array.from(new Set([
      sol.name.toLowerCase(),
      ...(sol.family ? [sol.family.toLowerCase()] : []),
      ...(sol.subCat ? [sol.subCat.toLowerCase()] : []),
      ...capAreaList.map((c) => c.toLowerCase()),
      // Extract meaningful sub-words from solution name for better matching
      ...sol.name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3),
      // Sub-category terms for keyword expansion
      ...sol.subCat.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3),
    ]));

    // Build a rich description from the solution's context
    const capAreaSummary = capAreaList.length > 0
      ? `Covers capability areas: ${capAreaList.join(", ")}.`
      : "";
    const description = [
      sol.name,
      sol.family ? `Part of the ${sol.family} family.` : "",
      sol.subCat ? `Sub-category: ${sol.subCat}.` : "",
      capAreaSummary,
    ].filter(Boolean).join(" ");

    const category = subCatSlug || familySlug || "solution";

    items.push({
      dedup_key: `${source}::${solId}`,
      type: "solution",
      name: sol.name,
      description,
      category,
      subcategory: sol.subCat || undefined,
      vendor: undefined,
      keywords,
      source,
      source_id: solId,
      relevance_score: 0,
      match_reasons: [],
      satisfies_requirements: [],
      raw: {
        solution_id: solId,
        solution_name: sol.name,
        family: sol.family,
        sub_category: sol.subCat,
        capability_areas: capAreaList,
        attribute_keys: Array.from(sol.attrKeys),
        what_to_learn: Array.from(sol.whatToLearn),
        priority: sol.priority,
        source,
      },
    });
  }

  return items;
}

// ─────────────────────────────────────────────────────────────────────────────
// NeoZaar Relationship Map format (excel_2.xlsx)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse a NeoZaar Solution-Product-Service Relationship Map sheet.
 * Extracts:
 *   - Solutions as type:"solution" (with rich keywords including all related product/service names)
 *   - Products as type:"product" (with keywords linking to their parent solutions)
 *   - Services as type:"service" (with keywords linking to their parent solutions)
 *
 * Deduplication within the sheet: products/services with the same name across
 * different solutions are merged into a single item with aggregated keywords.
 */
function parseNeoZaarRelationshipMapSheet(rows, source) {
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => String(h ?? "").toLowerCase().trim());

  const COL = {
    relId:      headers.indexOf("relationship id"),
    solId:      headers.indexOf("solution id"),
    solution:   headers.indexOf("solution"),
    family:     headers.indexOf("family"),
    subCat:     headers.indexOf("sub-category"),
    entityType: headers.indexOf("entity type"),
    entityName: headers.indexOf("entity name"),
    brand:      headers.indexOf("brand / service role"),
    relRole:    headers.indexOf("relationship role"),
  };

  if (COL.solId < 0 || COL.entityType < 0 || COL.entityName < 0) return [];

  // ── Pass 1: Group by solution ─────────────────────────────────────────────
  const solutionMap = new Map();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const solId   = String(row[COL.solId] ?? "").trim();
    const solName = String(row[COL.solution] ?? "").trim();
    if (!solId || !solName) continue;

    if (!solutionMap.has(solId)) {
      solutionMap.set(solId, {
        name:     solName,
        family:   COL.family >= 0 ? String(row[COL.family] ?? "").trim() : "",
        subCat:   COL.subCat >= 0 ? String(row[COL.subCat] ?? "").trim() : "",
        products: [],
        services: [],
      });
    }

    const sol     = solutionMap.get(solId);
    const entType = String(row[COL.entityType] ?? "").trim().toLowerCase();
    const entName = String(row[COL.entityName] ?? "").trim();
    const brand   = COL.brand >= 0 ? String(row[COL.brand] ?? "").trim() : "";
    const relRole = COL.relRole >= 0 ? String(row[COL.relRole] ?? "").trim() : "";

    if (!entName) continue;

    if (entType === "product") {
      // Avoid duplicating same product in same solution
      if (!sol.products.some((p) => p.name === entName)) {
        sol.products.push({ name: entName, brand, role: relRole });
      }
    } else if (entType === "service") {
      if (!sol.services.some((s) => s.name === entName)) {
        sol.services.push({ name: entName, role: brand || relRole });
      }
    }
  }

  // ── Pass 2: Build solution items ─────────────────────────────────────────
  const items = [];
  const productMap = new Map();
  const serviceMap = new Map();

  for (const [solId, sol] of solutionMap) {
    const subCatSlug = sol.subCat.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const familySlug = sol.family.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const category   = subCatSlug || familySlug || "solution";

    // Build keywords from name, family, subCat, related product/service names
    const keywords = Array.from(new Set([
      sol.name.toLowerCase(),
      ...(sol.family ? [sol.family.toLowerCase()] : []),
      ...(sol.subCat ? [sol.subCat.toLowerCase()] : []),
      ...sol.name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3),
      ...sol.subCat.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3),
      // Product/service names expand solution keywords
      ...sol.products.flatMap((p) => [
        p.name.toLowerCase(),
        ...(p.brand ? [p.brand.toLowerCase()] : []),
        ...p.name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3),
      ]),
      ...sol.services.flatMap((s) => [
        s.name.toLowerCase(),
        ...s.name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3),
      ]),
    ]));

    const prodNames = sol.products.map((p) => p.name).join(", ");
    const svcNames  = sol.services.map((s) => s.name).join(", ");
    const description = [
      sol.name,
      sol.family ? `Family: ${sol.family}.` : "",
      sol.subCat ? `Area: ${sol.subCat}.` : "",
      prodNames ? `Products: ${prodNames}.` : "",
      svcNames  ? `Services: ${svcNames}.` : "",
    ].filter(Boolean).join(" ");

    items.push({
      dedup_key: `${source}::${solId}`,
      type: "solution",
      name: sol.name,
      description,
      category,
      subcategory: sol.subCat || undefined,
      vendor: undefined,
      keywords,
      source,
      source_id: solId,
      relevance_score: 0,
      match_reasons: [],
      satisfies_requirements: [],
      raw: {
        solution_id: solId,
        solution_name: sol.name,
        family: sol.family,
        sub_category: sol.subCat,
        related_products: sol.products,
        related_services: sol.services,
        source,
      },
    });

    // Aggregate product entries
    for (const prod of sol.products) {
      if (!productMap.has(prod.name)) {
        productMap.set(prod.name, { brand: prod.brand, parentSolutions: [], parentSolNames: [], parentSubCats: [] });
      }
      const pe = productMap.get(prod.name);
      pe.parentSolutions.push(solId);
      pe.parentSolNames.push(sol.name);
      pe.parentSubCats.push(sol.subCat);
    }

    // Aggregate service entries
    for (const svc of sol.services) {
      if (!serviceMap.has(svc.name)) {
        serviceMap.set(svc.name, { role: svc.role, parentSolutions: [], parentSolNames: [], parentSubCats: [] });
      }
      const se = serviceMap.get(svc.name);
      se.parentSolutions.push(solId);
      se.parentSolNames.push(sol.name);
      se.parentSubCats.push(sol.subCat);
    }
  }

  // ── Pass 3: Build product items ───────────────────────────────────────────
  let productIdx = 0;
  for (const [prodName, prod] of productMap) {
    productIdx++;
    const nameSlug = prodName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const brandSlug = prod.brand.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

    const subCats = Array.from(new Set(prod.parentSubCats.filter(Boolean)));
    const catSlug = subCats[0]
      ? subCats[0].toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
      : "product";

    const keywords = Array.from(new Set([
      prodName.toLowerCase(),
      ...(prod.brand ? [prod.brand.toLowerCase()] : []),
      ...prodName.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3),
      ...(prod.brand ? prod.brand.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3) : []),
      // Inherit solution context keywords
      ...prod.parentSolNames.flatMap((n) => n.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3)),
      ...subCats.flatMap((sc) => sc.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3)),
    ]));

    const description = [
      prodName,
      prod.brand ? `by ${prod.brand}.` : "",
      subCats.length > 0 ? `Part of ${subCats.join(", ")}.` : "",
      `Related solutions: ${prod.parentSolNames.slice(0, 2).join("; ")}.`,
    ].filter(Boolean).join(" ");

    const sourceId = `${source}_prod_${nameSlug.slice(0, 30)}_${productIdx}`;

    items.push({
      dedup_key: `${source}::prod::${nameSlug}`,
      type: "product",
      name: prodName,
      description,
      category: catSlug,
      subcategory: subCats[0] || undefined,
      vendor: prod.brand || undefined,
      keywords,
      source,
      source_id: sourceId,
      relevance_score: 0,
      match_reasons: [],
      satisfies_requirements: [],
      raw: {
        product_name: prodName,
        brand: prod.brand,
        parent_solution_ids: prod.parentSolutions,
        parent_solution_names: prod.parentSolNames,
        source,
      },
    });
  }

  // ── Pass 4: Build service items ───────────────────────────────────────────
  let serviceIdx = 0;
  for (const [svcName, svc] of serviceMap) {
    serviceIdx++;
    const nameSlug = svcName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

    const subCats = Array.from(new Set(svc.parentSubCats.filter(Boolean)));
    const catSlug = subCats[0]
      ? subCats[0].toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
      : "service";

    const keywords = Array.from(new Set([
      svcName.toLowerCase(),
      ...svcName.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3),
      // Inherit solution context keywords
      ...svc.parentSolNames.flatMap((n) => n.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3)),
      ...subCats.flatMap((sc) => sc.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3)),
    ]));

    const description = [
      svcName,
      svc.role ? `Role: ${svc.role}.` : "",
      subCats.length > 0 ? `Part of ${subCats.join(", ")}.` : "",
      `Related solutions: ${svc.parentSolNames.slice(0, 2).join("; ")}.`,
    ].filter(Boolean).join(" ");

    const sourceId = `${source}_svc_${nameSlug.slice(0, 30)}_${serviceIdx}`;

    items.push({
      dedup_key: `${source}::svc::${nameSlug}`,
      type: "service",
      name: svcName,
      description,
      category: catSlug,
      subcategory: subCats[0] || undefined,
      vendor: undefined,
      keywords,
      source,
      source_id: sourceId,
      relevance_score: 0,
      match_reasons: [],
      satisfies_requirements: [],
      raw: {
        service_name: svcName,
        role: svc.role,
        parent_solution_ids: svc.parentSolutions,
        parent_solution_names: svc.parentSolNames,
        source,
      },
    });
  }

  return items;
}

// ─────────────────────────────────────────────────────────────────────────────
// Standard product catalog format
// ─────────────────────────────────────────────────────────────────────────────

const ALIAS = {
  name:        ["name", "product name", "product", "title"],
  id:          ["id", "product id", "sku", "part number", "part no", "item id"],
  vendor:      ["vendor", "brand", "manufacturer", "supplier"],
  category:    ["category", "product category", "type", "group"],
  subcategory: ["subcategory", "sub category", "sub-category", "sub_category"],
  description: ["description", "desc", "product description", "summary", "overview", "details"],
  keywords:    ["keywords", "tags", "search terms", "key words"],
};

function detectColumn(headers, field) {
  const aliases = ALIAS[field] ?? [field];
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().trim();
    if (aliases.includes(h)) return i;
  }
  return -1;
}

function rowToItem(row, colMap, source, rowIndex) {
  const get = (field) =>
    colMap[field] >= 0 ? String(row[colMap[field]] ?? "").trim() : "";

  const name = get("name");
  if (!name) return null;

  const rawId      = get("id");
  const vendor     = get("vendor");
  const category   = get("category") || "general";
  const subcategory = get("subcategory") || undefined;
  const description = get("description") || name;
  const rawKeywords = get("keywords");

  const keywords = rawKeywords
    ? rawKeywords.split(/[,;|]+/).map((k) => k.trim()).filter(Boolean)
    : [];

  const augmented = Array.from(
    new Set([
      ...keywords,
      name.toLowerCase(),
      ...(vendor ? [vendor.toLowerCase()] : []),
      category.toLowerCase().replace(/_/g, " "),
    ])
  );

  const sourceId = rawId || `${source}_row_${rowIndex}`;
  const dedupKey = rawId
    ? `${source}::${rawId}`
    : `${source}::${(vendor + "::" + name).toLowerCase().replace(/\s+/g, "_")}`;

  return {
    dedup_key: dedupKey,
    type: "product",
    name,
    description,
    category: category.toLowerCase().replace(/\s+/g, "_"),
    subcategory,
    vendor: vendor || undefined,
    keywords: augmented,
    source,
    source_id: sourceId,
    relevance_score: 0,
    match_reasons: [],
    satisfies_requirements: [],
    raw: Object.fromEntries(row.map((v, i) => [i, v])),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sheet dispatcher — routes to correct parser based on format
// ─────────────────────────────────────────────────────────────────────────────

function parseSheet(worksheet, source) {
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  if (rows.length < 2) return [];

  // Row 0 might be a title row (all cells identical) in the NeoZaar KB / Relationship Map.
  // Row 1 has the actual column headers in that case.
  let headerRowIdx = 0;
  const firstRowValues = rows[0].map((v) => String(v ?? "").trim()).filter(Boolean);
  if (firstRowValues.length > 0 && firstRowValues.every((v) => v === firstRowValues[0])) {
    // All non-empty cells are the same string → this is a title row; use row 1 as headers
    headerRowIdx = 1;
  }

  if (rows.length <= headerRowIdx + 1) return [];

  const headers = rows[headerRowIdx].map((h) => String(h ?? ""));

  if (isNeoZaarRelationshipMapFormat(headers)) {
    // Relationship Map format (excel_2.xlsx) — extracts Solutions, Products, Services
    const mapRows = rows.slice(headerRowIdx).map((r) =>
      r.map((v) => String(v ?? "").trim())
    );
    return parseNeoZaarRelationshipMapSheet(mapRows, source);
  }

  if (isNeoZaarKBFormat(headers)) {
    // KB format (excel_1.xlsx) — extracts Solutions only
    const kbRows = rows.slice(headerRowIdx).map((r) =>
      r.map((v) => String(v ?? "").trim())
    );
    return parseNeoZaarKBSheet(kbRows, source);
  }

  // Standard product catalog format
  const colMap = {};
  for (const field of Object.keys(ALIAS)) {
    colMap[field] = detectColumn(headers, field);
  }

  const items = [];
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const item = rowToItem(rows[i], colMap, source, i);
    if (item) items.push(item);
  }
  return items;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

// Ported adjustment: in standalone Proposal Studio this resolved to
// "<repo root>/data" (two levels up from src/discovery/). In neozaar_backend
// this file lives at src/ai/discovery/, and the Excel catalog files were
// copied alongside it to src/ai/data/ — one level up from src/ai/discovery/.
const DATA_DIR = path.join(__dirname, "../data");

function loadExcelFile(filename, source) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return [];

  try {
    const workbook = XLSX.readFile(filePath);
    const items = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const sheetItems = parseSheet(sheet, source);
      items.push(...sheetItems);
      // For Relationship Map files only process the first relevant sheet
      // to avoid duplicating items from summary/guide sheets
      if (sheetItems.length > 0 && source === "excel_2") break;
    }
    return items;
  } catch (err) {
    console.warn(`[Excel Adapter] Failed to load ${filename}:`, err);
    return [];
  }
}

/** Load all Excel catalog items from both files (reads from disk every call). */
function loadExcelCatalog() {
  return [
    { source: "excel_1", items: loadExcelFile("excel_1.xlsx", "excel_1") },
    { source: "excel_2", items: loadExcelFile("excel_2.xlsx", "excel_2") },
  ];
}

/** Convenience: load and return all items from all Excel files flat (reads from disk). */
function loadAllExcelItems() {
  const allItems = loadExcelCatalog().flatMap((e) => e.items);
  // Deduplicate within the Excel cache itself: same dedup_key → keep highest-scoring item
  const seen = new Map();
  for (const item of allItems) {
    const existing = seen.get(item.dedup_key);
    if (!existing || item.relevance_score > existing.relevance_score) {
      seen.set(item.dedup_key, item);
    }
  }
  return Array.from(seen.values());
}

// ─────────────────────────────────────────────────────────────────────────────
// Startup cache — load once, serve fast
// ─────────────────────────────────────────────────────────────────────────────

let _cache = null;

/**
 * Preload all Excel catalog items into memory.
 * Call once at application startup. Subsequent calls are no-ops.
 * Returns the loaded items so callers can log the count.
 */
function preloadExcelCatalog() {
  if (_cache !== null) return _cache;
  _cache = loadAllExcelItems();
  const counts = { excel_1: 0, excel_2: 0 };
  for (const item of _cache) {
    if (item.source === "excel_1") counts.excel_1++;
    if (item.source === "excel_2") counts.excel_2++;
  }
  console.info(
    `[ExcelAdapter] Loaded ${_cache.length} items from Excel catalog` +
    ` (excel_1: ${counts.excel_1}, excel_2: ${counts.excel_2})`
  );
  return _cache;
}

/**
 * Returns the cached Excel items (preloaded at startup).
 * Falls back to loading from disk if preload was never called.
 */
function getExcelCache() {
  if (_cache !== null) return _cache;
  return preloadExcelCatalog();
}

/**
 * Reset the in-memory cache. Used in tests to isolate state.
 */
function resetExcelCache() {
  _cache = null;
}

module.exports = {
  loadExcelCatalog,
  loadAllExcelItems,
  preloadExcelCatalog,
  getExcelCache,
  resetExcelCache,
};
