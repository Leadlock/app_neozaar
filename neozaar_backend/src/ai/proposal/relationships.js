/**
 * Phase 4 — Solution Relationship Expansion.
 *
 * When the workspace contains a Solution catalog item, this module
 * looks up the Solution's existing catalog relationships (includedProductIds,
 * includedServiceIds, relatedIds) and returns the actual catalog items —
 * not GPT-4o-invented relationships.
 *
 * Only relationships that exist in the API/database catalog are returned.
 * If a relationship references an Excel-sourced item, it cannot be expanded
 * (no structured relatedIds on Excel items), but the item itself is already in the workspace.
 */

const { catalog } = require("../db/catalog");
const { activeItems } = require("./workspaceStore");

/**
 * For every active solution item in the workspace, expand its catalog
 * relationships and return the related items.
 * The caller can use this to suggest additional items to add to the workspace.
 */
function expandSolutionRelationships(ws) {
  const results = [];

  for (const solutionItem of activeItems(ws, "solution")) {
    const { source, source_id } = solutionItem.catalog;

    // Only API catalog items have typed relationships (includedProductIds etc.)
    // Excel items don't have relatedIds in the same structured way
    if (source !== "api") continue;

    const dbSolution = catalog.getSolution(source_id);
    if (!dbSolution) continue;

    const included_products = (dbSolution.includedProductIds ?? [])
      .map((id) => catalog.getProduct(id))
      .filter(Boolean)
      .map((p) => ({ id: p.id, name: p.name, category: p.category, vendor: p.vendor }));

    const included_services = (dbSolution.includedServiceIds ?? [])
      .map((id) => catalog.getService(id))
      .filter(Boolean)
      .map((s) => ({ id: s.id, name: s.name, category: s.category }));

    const related_items = catalog.getRelatedItems(source_id).map((i) => ({
      id: i.id,
      type: i.type,
      name: i.name,
    }));

    results.push({
      solution_workspace_item_id: solutionItem.workspace_item_id,
      solution_name: solutionItem.catalog.name,
      included_products,
      included_services,
      related_items,
    });
  }

  return results;
}

module.exports = { expandSolutionRelationships };
