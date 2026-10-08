/**
 * Neo — Discovery Agent Orchestrator.
 *
 * This is the single entry point for all discovery requests.
 * It wires together:
 *   queryUnderstanding → unifiedRetrieval → recommendationComposer
 * and returns a DiscoveryResponse ready for the API layer or Proposal Studio.
 *
 * Neo never touches Proposal Studio concerns (scope, pricing, executive summary).
 * It only discovers, ranks, and recommends.
 */

const dotenv = require("dotenv");
dotenv.config();

const { extractRequirements } = require("./queryUnderstanding");
const { retrieveAll } = require("./unifiedRetrieval");
const { composeRecommendation } = require("./recommendationComposer");

// ─────────────────────────────────────────────────────────────────────────────
// Main discovery function
// ─────────────────────────────────────────────────────────────────────────────

async function discover(request) {
  const { message, conversationHistory = [] } = request;

  // ── Step 1: Understand the customer's intent ──────────────────────────────
  let canonical;
  try {
    canonical = await extractRequirements(message, conversationHistory);
  } catch (err) {
    throw new Error(`[Neo] Query understanding failed: ${String(err)}`);
  }

  // If Neo needs clarification before searching, return early
  if (
    canonical.requirements.length === 0 &&
    canonical.clarifications_needed.length > 0
  ) {
    return {
      customer_request: message,
      requirements: [],
      recommended_solutions: [],
      recommended_products: [],
      recommended_services: [],
      recommendation_summary: "",
      reasoning: [],
      clarifications_needed: canonical.clarifications_needed,
      confidence: "none",
    };
  }

  // ── Step 2: Search all catalog sources ────────────────────────────────────
  const retrievalResult = retrieveAll(canonical);

  // ── Step 3: Compose recommendation ───────────────────────────────────────
  let recommendation;
  try {
    recommendation = await composeRecommendation(canonical, retrievalResult);
  } catch (err) {
    throw new Error(`[Neo] Recommendation composition failed: ${String(err)}`);
  }

  // ── Step 4: Assemble response ─────────────────────────────────────────────
  const response = {
    customer_request: canonical.customer_request,
    requirements: canonical.requirements,
    recommended_solutions: recommendation.solutions,
    recommended_products: recommendation.products,
    recommended_services: recommendation.services,
    recommendation_summary: `${recommendation.title}\n\n${recommendation.summary}`,
    reasoning: recommendation.requirement_coverage,
    clarifications_needed: canonical.clarifications_needed,
    confidence: recommendation.confidence,
    all_results: retrievalResult.all,
    // Business guardrail fields — passed through from composer
    desired_outcome: recommendation.desired_outcome,
    key_assumptions: recommendation.key_assumptions,
    handoff_recommended: recommendation.handoff_recommended,
    handoff_reason: recommendation.handoff_reason,
    handoff_context: recommendation.handoff_context,
  };

  return response;
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience: run discovery from a plain string (no conversation history)
// ─────────────────────────────────────────────────────────────────────────────

async function discoverFromMessage(message, conversationHistory) {
  return discover({ message, conversationHistory });
}

module.exports = { discover, discoverFromMessage };
