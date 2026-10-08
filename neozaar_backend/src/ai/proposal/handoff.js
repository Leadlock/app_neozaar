/**
 * Phase 1 — Neo → Proposal Studio Handoff.
 *
 * Converts a DiscoveryResponse into a ProposalStudioHandoff.
 * All catalog provenance (source, source_id) is preserved.
 * Nothing is re-discovered or re-ranked here.
 */

const crypto = require("crypto");

// ─────────────────────────────────────────────────────────────────────────────
// Conversion helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a RecommendedItem (Neo output) into a HandoffCatalogItem.
 * The `all_results` from the DiscoveryResponse are used to enrich the item
 * with description, category, and relationship data that RecommendedItem
 * does not carry directly.
 */
function toHandoffItem(item, allResults) {
  // Find the matching full result for enrichment
  const full = allResults.find((r) => r.source_id === item.source_id);

  return {
    type: item.type,
    source_id: item.source_id,
    source: item.source,
    name: item.name,
    description: full?.description ?? "",
    category: full?.category ?? "",
    subcategory: full?.subcategory,
    vendor: item.vendor,
    relevance_score: item.relevance_score,
    reasoning: item.reasoning,
    satisfies_requirements: full?.satisfies_requirements ?? [],
    related_ids: full?.raw?.relatedIds,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a ProposalStudioHandoff from Neo's DiscoveryResponse.
 * This is the single entry point for handing work from Neo to Proposal Studio.
 */
function createHandoff(discovery) {
  const allResults = discovery.all_results ?? [];

  return {
    handoff_id: crypto.randomUUID(),
    customer_request: discovery.customer_request,
    requirements: discovery.requirements,
    requirement_coverage: discovery.reasoning,
    confidence: discovery.confidence,
    recommendation_summary: discovery.recommendation_summary,
    solutions: discovery.recommended_solutions.map((i) => toHandoffItem(i, allResults)),
    products:  discovery.recommended_products.map((i)  => toHandoffItem(i, allResults)),
    services:  discovery.recommended_services.map((i)  => toHandoffItem(i, allResults)),
    clarifications: discovery.clarifications_needed,
    created_at: new Date().toISOString(),
    discovery_context: discovery,
  };
}

module.exports = { createHandoff };
