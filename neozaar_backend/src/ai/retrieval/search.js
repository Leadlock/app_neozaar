/**
 * Catalog search.
 *
 * Searches across all Products, Services, and Solutions using the scorer,
 * then returns top-ranked results per type.
 *
 * Thresholds ensure only meaningfully relevant results are returned.
 * Related-item expansion boosts items that are cross-referenced by
 * highly-scored results.
 */

const { catalog } = require("../db/catalog");
const { scoreItem } = require("./scorer");

const MIN_SCORE = 0.08;   // Minimum score to include a result
const MAX_PER_TYPE = 5;    // Maximum items to return per type per query

/**
 * Apply a small boost to items that are referenced by high-scoring items.
 * This surfaces strongly related catalog items that may have lower direct keyword overlap.
 */
function applyRelatedBoost(scored, allScored) {
  // Build a map of item id → existing score
  const scoreMap = new Map(
    allScored.map((s) => [s.item.id, s.score])
  );

  return scored.map((s) => {
    const relatedIds = s.item.relatedIds ?? [];
    let boost = 0;
    for (const rid of relatedIds) {
      const relScore = scoreMap.get(rid) ?? 0;
      // Carry 15% of a related item's score as a boost (capped per item)
      boost += Math.min(relScore * 0.15, 0.05);
    }
    if (boost > 0) {
      return {
        ...s,
        score: Math.min(1, s.score + boost),
        matchReasons: [...s.matchReasons, "related item boost"],
      };
    }
    return s;
  });
}

function searchCatalog(query) {
  const allItems = catalog.getAllItems();

  // Score every item
  const allScored = allItems.map((item) => scoreItem(item, query));

  // Apply cross-reference boost
  const boosted = applyRelatedBoost(allScored, allScored);

  // Separate by type, filter low scores, sort descending
  const sortedFilter = (type) =>
    boosted
      .filter((s) => s.item.type === type && s.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_PER_TYPE);

  return {
    solutions: sortedFilter("solution"),
    products: sortedFilter("product"),
    services: sortedFilter("service"),
  };
}

/**
 * Search across multiple requirements and merge results.
 * Items that match multiple requirements receive a cumulative score boost.
 */
function searchCatalogMulti(queries) {
  if (queries.length === 0) {
    return { solutions: [], products: [], services: [] };
  }

  // Run individual searches
  const perQuery = queries.map((q) => searchCatalog(q));

  // Merge: accumulate scores across queries for each item id
  const itemScores = new Map();

  for (const result of perQuery) {
    for (const bucket of [result.solutions, result.products, result.services]) {
      for (const scored of bucket) {
        const existing = itemScores.get(scored.item.id);
        if (existing) {
          existing.totalScore = Math.min(1, existing.totalScore + scored.score * 0.6);
          existing.reasons = Array.from(new Set([...existing.reasons, ...scored.matchReasons]));
        } else {
          itemScores.set(scored.item.id, {
            item: scored.item,
            totalScore: scored.score,
            reasons: scored.matchReasons,
          });
        }
      }
    }
  }

  // Re-split by type
  const merged = Array.from(itemScores.values()).map(
    ({ item, totalScore, reasons }) => ({
      item,
      score: totalScore,
      matchReasons: reasons,
    })
  );

  const sortedFilter = (type) =>
    merged
      .filter((s) => s.item.type === type && s.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_PER_TYPE);

  return {
    solutions: sortedFilter("solution"),
    products: sortedFilter("product"),
    services: sortedFilter("service"),
  };
}

module.exports = { searchCatalog, searchCatalogMulti };
