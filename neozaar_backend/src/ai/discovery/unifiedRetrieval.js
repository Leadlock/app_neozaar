/**
 * Unified Retrieval — searches all sources and returns deduplicated, ranked results.
 *
 * Sources:
 *   1. API / Database — PRIMARY via ApiCatalogProvider (searchApiCatalogMulti)
 *   2. Excel 1        — OPTIONAL via excelAdapter (startup-cached)
 *   3. Excel 2        — OPTIONAL via excelAdapter (startup-cached)
 *
 * DB-ONLY BY DEFAULT:
 *   Retrieval uses the API/database ONLY. The Excel KB tiers (excel_1.xlsx,
 *   excel_2.xlsx) are opt-in via the env flag DISCOVERY_INCLUDE_EXCEL=true.
 *   Solution -> Product/Service bundling is unaffected: those relationships come
 *   from the DB columns select_isv_products / select_spectrum_partner_services
 *   (mapped to includedProductIds / includedServiceIds), never from Excel.
 *
 * Source Priority (only relevant when Excel is opted in):
 *   API data is the authoritative source.
 *   Excel data is the secondary source — it supplements API data with additional
 *   Solutions, capability areas, relationships, and discovery requirements that
 *   may not be present in the API catalog.
 *
 * Deduplication:
 *   When an API record and an Excel record represent the same entity:
 *     - API record = primary (preserved as-is)
 *     - Excel record = supporting information (merged in, not presented separately)
 *   Source priority: api > excel_1 > excel_2
 *
 * Ranking priority:
 *   Solutions are always ranked first within the combined result set.
 *   When a Solution matches, its includedProductIds / includedServiceIds are
 *   used to surface related Products and Services even if those items score
 *   below the minimum threshold independently.
 *
 * Steps:
 *   1. Build SearchQuery[] from CanonicalRequirements
 *   2. Run API/DB search (returns ScoredItem[]) — SOURCE: api
 *   3. (opt-in) Run Excel search against the startup cache — SOURCE: excel_1, excel_2
 *   4. Normalise all results into UnifiedSearchResult[]
 *   5. Deduplicate (API record wins when same entity found in both sources)
 *   6. Re-annotate which requirements each item satisfies
 *   7. Apply Solution-relationship boost to included Products/Services
 *   8. Sort: Solutions first (by score), then Products/Services (by score)
 */

const { apiCatalogProvider } = require("../db/apiCatalogProvider");
const { searchCatalogMulti } = require("../retrieval/search");
const { scoreItem } = require("../retrieval/scorer");
const { getExcelCache } = require("./excelAdapter");
const { inferCategories } = require("../retrieval/categorySynonyms");

// ─────────────────────────────────────────────────────────────────────────────
// Source configuration
//
// Discovery retrieves from the API / database ONLY by default. Set
// DISCOVERY_INCLUDE_EXCEL=true in the environment to also blend in the
// excel_1.xlsx / excel_2.xlsx knowledge-base tiers (legacy behaviour).
// ─────────────────────────────────────────────────────────────────────────────
const INCLUDE_EXCEL =
  String(process.env.DISCOVERY_INCLUDE_EXCEL || "").trim().toLowerCase() === "true";

// ─────────────────────────────────────────────────────────────────────────────
// Requirement → SearchQuery conversion
// ─────────────────────────────────────────────────────────────────────────────

function requirementToQuery(req) {
  const keywords = Array.isArray(req.keywords) ? [...req.keywords] : [];
  let category = req.category || "";

  // Bridge everyday language ("HR", "payroll", "firewall") to the catalog's own
  // category taxonomy ("People Tech", "Enterprise Security") so those items
  // actually clear the relevance threshold.
  const inferred = inferCategories([...keywords, req.label || "", category].join(" "));
  if (inferred.length) {
    for (const { category: cat, hits } of inferred) {
      keywords.push(cat, ...hits);
      if (!category.toLowerCase().includes(cat.toLowerCase())) {
        category = category ? `${category} ${cat}` : cat;
      }
    }
  }

  return { keywords, category, requirementText: req.label };
}

// ─────────────────────────────────────────────────────────────────────────────
// API item → UnifiedSearchResult
// ─────────────────────────────────────────────────────────────────────────────

function apiItemToUnified(scored, satisfiedReqs) {
  const item = scored.item;
  return {
    dedup_key: `api::${item.id}`,
    type: item.type,
    name: item.name,
    description: item.description,
    category: item.category,
    subcategory: item.subcategory,
    vendor: item.vendor,
    keywords: item.keywords,
    source: "api",
    source_id: item.id,
    relevance_score: scored.score,
    match_reasons: scored.matchReasons,
    satisfies_requirements: satisfiedReqs,
    raw: item,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Excel item scoring against requirements
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score an Excel UnifiedSearchResult against a single SearchQuery using the
 * same scorer used for API items — we build a synthetic AnyCatalogItem shell.
 */
function scoreExcelItem(excelItem, query) {
  // Wrap the Excel item into the minimal AnyCatalogItem interface so we can
  // reuse the existing scoreItem() function without modification.
  // Use the actual type from the Excel item — solutions should be scored as
  // solutions, products as products, services as services.
  const syntheticItem = {
    id: excelItem.source_id,
    type: excelItem.type,  // preserve actual item type (solution / product / service)
    name: excelItem.name,
    description: excelItem.description,
    category: excelItem.category,
    subcategory: excelItem.subcategory,
    keywords: excelItem.keywords,
    vendor: excelItem.vendor ?? "",
    tags: excelItem.vendor ? [excelItem.vendor.toLowerCase()] : [],
  };
  const scored = scoreItem(syntheticItem, query);
  return scored.score;
}

// ─────────────────────────────────────────────────────────────────────────────
// Source priority helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Source priority for deduplication.
 * Lower number = higher priority.
 *   api     = 0  (PRIMARY — wins all conflicts)
 *   excel_1 = 1  (SECONDARY)
 *   excel_2 = 2  (SECONDARY)
 */
function sourcePriority(source) {
  if (source === "api")     return 0;
  if (source === "excel_1") return 1;
  return 2; // excel_2
}

// ─────────────────────────────────────────────────────────────────────────────
// Deduplication
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deduplication strategy:
 *
 * Primary key:   Normalized vendor + name fingerprint (cross-source identity)
 * Source priority: api > excel_1 > excel_2
 *
 * When duplicates are found:
 *   - The item from the higher-priority source is kept as the primary record.
 *   - match_reasons and satisfies_requirements are merged from both sources.
 *   - This ensures API records are authoritative and Excel supplements them.
 *
 * Secondary score tiebreaker: only used when two items have the same source priority.
 */
function normaliseForDedup(item) {
  const vendor = (item.vendor ?? "").toLowerCase().replace(/\s+/g, "_");
  const name = item.name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  return `${vendor}::${name}`;
}

function deduplicate(items) {
  const byDedup = new Map();

  for (const item of items) {
    const key = normaliseForDedup(item);
    const existing = byDedup.get(key);

    if (!existing) {
      byDedup.set(key, { ...item });
    } else {
      const itemPriority     = sourcePriority(item.source);
      const existingPriority = sourcePriority(existing.source);

      // API wins over Excel regardless of score (source priority rule)
      if (itemPriority < existingPriority) {
        // New item has higher source priority — it becomes the primary record
        byDedup.set(key, {
          ...item,
          match_reasons: Array.from(new Set([...item.match_reasons, ...existing.match_reasons])),
          satisfies_requirements: Array.from(
            new Set([...item.satisfies_requirements, ...existing.satisfies_requirements])
          ),
        });
      } else if (itemPriority === existingPriority && item.relevance_score > existing.relevance_score) {
        // Same source priority — keep the higher-scoring one
        byDedup.set(key, {
          ...item,
          match_reasons: Array.from(new Set([...existing.match_reasons, ...item.match_reasons])),
          satisfies_requirements: Array.from(
            new Set([...existing.satisfies_requirements, ...item.satisfies_requirements])
          ),
        });
      } else {
        // Existing item wins — just merge supplemental information
        existing.match_reasons = Array.from(new Set([...existing.match_reasons, ...item.match_reasons]));
        existing.satisfies_requirements = Array.from(
          new Set([...existing.satisfies_requirements, ...item.satisfies_requirements])
        );
      }
    }
  }

  return Array.from(byDedup.values());
}

// ─────────────────────────────────────────────────────────────────────────────
// Solution-relationship expansion
// ─────────────────────────────────────────────────────────────────────────────

/**
 * When a Solution is matched, its included Products and Services should surface
 * in the results even if they scored below MIN_SCORE independently.
 *
 * For each matched Solution we look up its includedProductIds / includedServiceIds
 * from the API catalog and ensure those items are present with at minimum a
 * "solution-included" boost score and correctly annotated satisfies_requirements.
 */
function expandSolutionRelated(items, reqs) {
  const solutions = items.filter((i) => i.type === "solution");
  if (solutions.length === 0) return items;

  // Build a set of dedup keys already present
  const presentKeys = new Set(items.map((i) => i.dedup_key));

  const additions = [];

  for (const sol of solutions) {
    // Retrieve the full Solution from the API catalog (has includedProductIds/ServiceIds)
    const apiSol = apiCatalogProvider.getSolution(sol.source_id);
    if (!apiSol) continue;

    const includedIds = [
      ...(apiSol.includedProductIds ?? []),
      ...(apiSol.includedServiceIds ?? []),
    ];

    for (const relId of includedIds) {
      const relKey = `api::${relId}`;
      if (presentKeys.has(relKey)) continue; // already in results

      const relItem = apiCatalogProvider.getItem(relId);
      if (!relItem) continue;

      // Score the related item against all requirements
      let maxScore = 0;
      const satisfiedReqs = [];
      for (const req of reqs) {
        const q = requirementToQuery(req);
        const { score } = scoreItem(relItem, q);
        if (score >= MIN_SCORE) {
          satisfiedReqs.push(req.id);
          if (score > maxScore) maxScore = score;
        }
      }

      // Ensure a minimum "solution-related" presence score
      const boostedScore = Math.max(maxScore, 0.10);

      const unified = {
        dedup_key: relKey,
        type: relItem.type,
        name: relItem.name,
        description: relItem.description,
        category: relItem.category,
        subcategory: relItem.subcategory,
        vendor: relItem.vendor,
        keywords: relItem.keywords,
        source: "api",
        source_id: relItem.id,
        relevance_score: boostedScore,
        match_reasons: [`included in solution: ${sol.name}`],
        satisfies_requirements: satisfiedReqs.length > 0
          ? satisfiedReqs
          : sol.satisfies_requirements, // inherit solution's requirement coverage
        raw: relItem,
      };

      additions.push(unified);
      presentKeys.add(relKey);
    }
  }

  return [...items, ...additions];
}

// ─────────────────────────────────────────────────────────────────────────────
// Solution-first sort
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sort the unified result set so that Solutions always appear before
 * Products and Services of equal or lower score.
 * Within each type, items are sorted by relevance_score descending.
 */
function solutionFirstSort(items) {
  const typePriority = (t) => {
    if (t === "solution") return 0;
    if (t === "product")  return 1;
    return 2; // service
  };
  return items.slice().sort((a, b) => {
    const tp = typePriority(a.type) - typePriority(b.type);
    if (tp !== 0) return tp;
    return b.relevance_score - a.relevance_score;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

const MIN_SCORE = 0.08;

function retrieveAll(canonical) {
  const reqs = canonical.requirements;
  if (reqs.length === 0) {
    return { solutions: [], products: [], services: [], all: [] };
  }

  const queries = reqs.map(requirementToQuery);

  // ── 1. API / Database search (PRIMARY) ──────────────────────────────────
  const apiResult = searchCatalogMulti(queries);

  // Collect all API scored items and annotate which requirements they satisfy
  const apiItems = [];
  for (const bucket of [apiResult.solutions, apiResult.products, apiResult.services]) {
    for (const scored of bucket) {
      const satisfiedReqs = [];
      for (const req of reqs) {
        const q = requirementToQuery(req);
        const { score } = scoreItem(scored.item, q);
        if (score >= MIN_SCORE) satisfiedReqs.push(req.id);
      }
      apiItems.push(apiItemToUnified(scored, satisfiedReqs));
    }
  }

  // ── 2. Excel search (OPT-IN — uses startup cache) ───────────────────────
  // Skipped entirely unless DISCOVERY_INCLUDE_EXCEL=true. DB-only is the default.
  const scoredExcel = [];

  if (INCLUDE_EXCEL) {
    const excelItems = getExcelCache();

    for (const excelItem of excelItems) {
      let maxScore = 0;
      const satisfiedReqs = [];
      const reasons = [];

      for (const req of reqs) {
        const q = requirementToQuery(req);
        const score = scoreExcelItem(excelItem, q);
        if (score >= MIN_SCORE) {
          satisfiedReqs.push(req.id);
          if (score > maxScore) maxScore = score;
          reasons.push(`matched requirement: ${req.label}`);
        }
      }

      if (maxScore >= MIN_SCORE) {
        scoredExcel.push({
          ...excelItem,
          relevance_score: maxScore,
          match_reasons: Array.from(new Set([...excelItem.match_reasons, ...reasons])),
          satisfies_requirements: satisfiedReqs,
        });
      }
    }
  }

  // ── 3. Merge: API first, then Excel (API records have dedup priority) ────
  // By placing API items first, the dedup function encounters API items first
  // and will keep them when an Excel duplicate is found. When Excel is disabled
  // scoredExcel is empty and this is a straight pass-through of the API items.
  let merged = deduplicate([...apiItems, ...scoredExcel]);

  // ── 4. Expand Solution-related Products/Services ─────────────────────────
  merged = expandSolutionRelated(merged, reqs);

  // ── 5. Deduplicate again (expansion may introduce items already present) ──
  merged = deduplicate(merged);

  // ── 6. Solution-first sort ────────────────────────────────────────────────
  const all = solutionFirstSort(merged);

  // ── 7. Split by type ──────────────────────────────────────────────────────
  const byType = (t) =>
    all.filter((i) => i.type === t);

  return {
    solutions: byType("solution"),
    products: byType("product"),
    services: byType("service"),
    all,
  };
}

module.exports = { retrieveAll };
