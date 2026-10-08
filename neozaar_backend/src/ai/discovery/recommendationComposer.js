/**
 * Recommendation Composer.
 *
 * Takes structured canonical requirements and unified search results and
 * calls the LLM to compose a coherent DiscoveryRecommendation.
 *
 * The LLM is given ONLY pre-approved candidates — items that pass the mapping gate
 * (solution-mapped or independently requirement-justified). It cannot invent items.
 *
 * PRE-LLM — Mapping Gate (filterToApprovedCandidates):
 *   Solutions  — all solutions from retrieval (they ARE the mapping anchors)
 *   Products   — only those mapped to a retrieved solution OR satisfying a requirement
 *   Services   — only those mapped to a retrieved solution OR satisfying a requirement
 *   Items that appear in raw search results but are NOT mapped/justified are excluded.
 *
 * POST-LLM — Integrity Enforcement:
 *  1. Hallucination guard    — strip any item not in the approved candidate list
 *  2. Solution integrity     — a "solution" may only be recommended if a real
 *                              solution-type item exists in the catalog results
 *  3. Match score cap        — 100% requires ALL requirements verified
 *  4. Solution limit         — 1 primary + max 2 adjacent solutions
 *  5. Component relevance    — mapping-first filter (solution-mapped preferred),
 *                              then requirement-justified; count caps applied
 *  6. Classification         — products: selected/recommended/alternative/optional
 *                              services: Assessment/Design/Implementation/Migration/
 *                                        Validation/Managed Service
 *  7. Mapping flag           — solution_mapped=true on items from solution relationships
 *  8. Handoff enforcement    — confidence "none" or "low" → handoff; no weak rec
 *  9. Output structure       — desired_outcome and key_assumptions preserved
 */

const { RECOMMENDATION_PROMPT } = require("./instructions");
const { getLLMClient, getLLMModel } = require("../lib/llmClient");
const { apiCatalogProvider } = require("../db/apiCatalogProvider");

// Trim the search results before sending to the LLM to keep context small
const MAX_RESULTS_PER_TYPE = 6;

// Business limits on recommended components
const MAX_SOLUTIONS_PRIMARY   = 1;
const MAX_SOLUTIONS_ADJACENT  = 2;
const MAX_SOLUTIONS_TOTAL     = MAX_SOLUTIONS_PRIMARY + MAX_SOLUTIONS_ADJACENT;
const MAX_PRODUCTS_IN_RESULT  = 5;
const MAX_SERVICES_IN_RESULT  = 4;

function trimResults(results) {
  return [
    ...results.solutions.slice(0, MAX_RESULTS_PER_TYPE),
    ...results.products.slice(0, MAX_RESULTS_PER_TYPE),
    ...results.services.slice(0, MAX_RESULTS_PER_TYPE),
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapping Gate — pre-LLM candidate filter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Filter the trimmed result set to only APPROVED CANDIDATES before passing
 * to the LLM. An approved candidate is one that:
 *
 *   SOLUTIONS — all solution-type items pass through (they are the mapping anchors).
 *
 *   PRODUCTS  — must satisfy at least one of:
 *     a) Mapped to a retrieved solution via includedProductIds
 *     b) Independently satisfies at least one requirement (satisfies_requirements)
 *
 *   SERVICES  — must satisfy at least one of:
 *     a) Mapped to a retrieved solution via includedServiceIds
 *     b) Independently satisfies at least one requirement
 *
 * Items returned by search but not meeting these criteria are excluded — they
 * are retrieval artefacts, not approved recommendations.
 *
 * Returns the filtered set AND a lookup of which source_ids are solution-mapped.
 */
function filterToApprovedCandidates(trimmed, requirementIds) {
  const reqIdSet = new Set(requirementIds);

  // Collect all source_ids of retrieved solutions
  const solutionItems = trimmed.filter((i) => i.type === "solution");

  // Build the complete set of solution-mapped product/service IDs
  const solutionMappedIds = new Set();
  for (const sol of solutionItems) {
    const apiSol = apiCatalogProvider.getSolution(sol.source_id);
    if (apiSol) {
      (apiSol.includedProductIds ?? []).forEach((id) => solutionMappedIds.add(id));
      (apiSol.includedServiceIds ?? []).forEach((id) => solutionMappedIds.add(id));
    }
  }

  const approved = [];

  for (const item of trimmed) {
    if (item.type === "solution") {
      // All solutions pass through — they are the anchors
      approved.push(item);
      continue;
    }

    const isSolutionMapped = solutionMappedIds.has(item.source_id);
    const satisfiesRequirement = item.satisfies_requirements.some((rid) => reqIdSet.has(rid));

    if (isSolutionMapped || satisfiesRequirement) {
      approved.push(item);
    } else {
      // Retrieval artefact — excluded from recommendation candidates
    }
  }

  return { approved, solutionMappedIds };
}

// ─────────────────────────────────────────────────────────────────────────────
// Service classification inference
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Infer the ServiceClassification label from a service item's category,
 * name, and description. Returns the best-matching label or undefined
 * when the service cannot be reliably classified.
 */
function inferServiceClassification(item) {
  const text = `${item.name} ${item.category} ${item.subcategory ?? ""} ${item.description}`.toLowerCase();

  if (/\bassessment\b|\baudit\b|\breview\b|\bhealth.?check\b|\breadiness\b/.test(text))
    return "Assessment";
  if (/\bdesign\b|\barchitect\b|\bblueprint\b/.test(text))
    return "Design";
  if (/\bmigrat/.test(text))
    return "Migration";
  if (/\bvalidat\b|\btesting\b|\bquality\b|\bacceptance\b/.test(text))
    return "Validation";
  if (/\bmanaged\b|\boperations?\b|\bmonitoring\b|\bsupport service\b/.test(text))
    return "Managed Service";
  if (/\bimplementat\b|\bdeploy\b|\binstallat\b|\bonboard\b|\bprofessional service\b/.test(text))
    return "Implementation";

  return undefined;
}

/**
 * Build a lean representation of each result for the LLM composition prompt.
 *
 * IMPORTANT — internal-only fields included here (source, source_id,
 * relevance_score, match_reasons, satisfies_requirements) are for LLM
 * REASONING and INTEGRITY checks only. They must NEVER be echoed back in any
 * customer-facing message, option label, or explanation.
 * The post-composition UI layer strips these before display.
 */
function leanResult(item) {
  return {
    // Customer-visible fields
    type: item.type,
    name: item.name,         // MUST be displayed exactly as-is — no generic substitution
    vendor: item.vendor,
    category: item.category,
    description: item.description.slice(0, 200),
    is_solution: item.type === "solution",
    catalog_verified: true,
    // Internal-only fields — for LLM reasoning; DO NOT expose to customer
    _internal_source: item.source,
    _internal_source_id: item.source_id,
    _internal_relevance: Math.round(item.relevance_score * 100) / 100,
    _internal_satisfies: item.satisfies_requirements,
    _internal_match_reasons: item.match_reasons,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Match score integrity  (existing — unchanged)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A 100% match requires ALL of:
 *   - The item exists and is verified in catalog results
 *   - All customer requirements are covered by catalog data
 *   - No requirement remains unverified or unknown
 *
 * If any requirement is uncovered, cap at 95%.
 * If more than half are uncovered, cap at 80%.
 */
function enforceMatchScoreIntegrity(items, coverage) {
  const uncovered = coverage.filter((c) => !c.covered).length;
  const total = coverage.length;

  return items.map((item) => {
    let score = item.relevance_score;

    // 100% is only valid when ALL requirements are covered
    if (score >= 1.0 && uncovered > 0) {
      score = 0.95;
    }

    // If more than half the requirements are uncovered, cap lower
    if (total > 0 && uncovered / total > 0.5) {
      score = Math.min(score, 0.80);
    }

    // Never exceed 0.99 from the LLM — only the retrieval layer can score 1.0
    // (and only when the retrieval scorer assigns it, not the LLM)
    score = Math.min(score, 0.99);

    return { ...item, relevance_score: Math.round(score * 100) / 100 };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Solution entity integrity  (existing — unchanged)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enforce catalog entity integrity for solutions.
 *
 * A recommended item may only appear in the "solutions" array if a
 * real solution-type item (type === "solution") exists in the catalog results
 * with that source_id.
 *
 * If the LLM placed a product or synthesised name in the solutions array,
 * it is moved to products or removed entirely.
 */
function enforceSolutionIntegrity(raw, allowedResults) {
  // Build a set of source_ids that are actually type=solution in the catalog
  const verifiedSolutionIds = new Set(
    allowedResults
      .filter((r) => r.type === "solution")
      .map((r) => r.source_id)
  );

  const verifiedProductServiceIds = new Set(
    allowedResults
      .filter((r) => r.type !== "solution")
      .map((r) => r.source_id)
  );

  const legitimateSolutions = [];
  const demotedToProducts = [];

  for (const item of raw.solutions ?? []) {
    if (verifiedSolutionIds.has(item.source_id)) {
      // Real catalog solution — keep it
      legitimateSolutions.push(item);
    } else if (verifiedProductServiceIds.has(item.source_id)) {
      // LLM placed a product/service in the solutions bucket — demote it
      console.warn(
        `[NeoZaar] Solution integrity: demoted "${item.name}" (${item.source_id}) ` +
        `from solutions to products — it is not a catalog solution type.`
      );
      demotedToProducts.push({ ...item, type: "product" });
    } else {
      // Synthesised / invented — remove entirely
      console.warn(
        `[NeoZaar] Solution integrity: removed synthesised solution "${item.name}" ` +
        `(${item.source_id}) — not found in catalog results.`
      );
    }
  }

  // Merge demoted items into products (avoid duplicates by source_id)
  const existingProductIds = new Set((raw.products ?? []).map((p) => p.source_id));
  const mergedProducts = [
    ...(raw.products ?? []),
    ...demotedToProducts.filter((p) => !existingProductIds.has(p.source_id)),
  ];

  // If no legitimate solutions remain but products/services exist,
  // update summary to reflect this honestly
  let summary = raw.summary ?? "";
  if (legitimateSolutions.length === 0 && (mergedProducts.length > 0 || (raw.services ?? []).length > 0)) {
    summary =
      "No directly matching published solution was found in the NeoZaar catalog. " +
      "The following individual catalog items were found that may address parts of your requirement. " +
      "They are individual published catalog items, not a pre-defined NeoZaar solution.";
  }

  return {
    ...raw,
    solutions: legitimateSolutions,
    products: mergedProducts,
    summary,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW — Business guardrail: solution count limit
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enforce: 1 Primary Solution + up to 2 Adjacent Solutions.
 *
 * If the LLM returned more solutions than this limit, keep only the top-scoring
 * ones. Excess solutions are dropped — they represent loosely related offerings
 * that should not clutter the recommendation.
 *
 * Marks the first solution as is_primary = true.
 * Additional solutions (2nd and 3rd) have is_primary = false.
 *
 * Exception: if the LLM returned 2+ solutions with identical relevance scores
 * (tie at the top), route to handoff instead — we cannot confidently determine
 * the primary Solution from catalog data alone.
 */
function enforceSolutionLimit(rec) {
  const solutions = rec.solutions;
  if (solutions.length === 0) return rec;

  // Detect top-score tie — multiple solutions equally plausible
  const topScore = solutions[0].relevance_score;
  const tiedAtTop = solutions.filter((s) => Math.abs(s.relevance_score - topScore) < 0.02);

  if (tiedAtTop.length > 1 && solutions.length > 1) {
    // Cannot confidently pick a primary — recommend handoff
    console.info(
      `[NeoZaar] Solution limit: ${solutions.length} solutions tied at ${topScore} — routing to handoff.`
    );
    return {
      ...rec,
      solutions: [],
      handoff_recommended: true,
      handoff_reason:
        `Multiple Solutions appear equally relevant (${tiedAtTop.map((s) => s.name).join(", ")}). ` +
        `A NeoZaar Sales Consultant can determine the most appropriate Solution for your specific environment.`,
      summary:
        "Multiple Solutions match your requirement equally well and a clear primary recommendation " +
        "cannot be made from the catalog data alone. A NeoZaar Sales Consultant will review your " +
        "requirement and provide a tailored recommendation.",
    };
  }

  // Trim to 1 primary + 2 adjacent max
  const trimmed = solutions.slice(0, MAX_SOLUTIONS_TOTAL).map((s, idx) => ({
    ...s,
    is_primary: idx === 0,
    classification: (idx === 0 ? "recommended" : "recommended"),
  }));

  if (solutions.length > MAX_SOLUTIONS_TOTAL) {
    console.info(
      `[NeoZaar] Solution limit: trimmed ${solutions.length} → ${MAX_SOLUTIONS_TOTAL} solutions.`
    );
  }

  return { ...rec, solutions: trimmed };
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW — Business guardrail: component relevance filtering
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Keep only products and services that are approved candidates — either
 * solution-mapped or independently requirement-justified — and apply count caps.
 *
 * Priority order within each bucket:
 *   1. Solution-mapped items (highest confidence — direct catalog relationship)
 *   2. Requirement-satisfying items (independently justified)
 *
 * This prevents the recommendation becoming a dump of every retrieved item.
 */
function enforceComponentRelevance(rec, allResults, requirementIds, solutionMappedIds) {
  const reqIdSet = new Set(requirementIds);

  // Split products/services into mapped vs. requirement-justified
  const filterAndSort = (items, maxCount) => {
    const mapped = items.filter((p) => solutionMappedIds.has(p.source_id));
    const reqJustified = items.filter(
      (p) =>
        !solutionMappedIds.has(p.source_id) &&
        allResults.some(
          (r) =>
            r.source_id === p.source_id &&
            r.satisfies_requirements.some((rid) => reqIdSet.has(rid))
        )
    );
    // Mapped items first, then requirement-justified, then cap
    return [...mapped, ...reqJustified].slice(0, maxCount);
  };

  const filteredProducts = filterAndSort(rec.products ?? [], MAX_PRODUCTS_IN_RESULT);
  const filteredServices = filterAndSort(rec.services ?? [], MAX_SERVICES_IN_RESULT);

  return { ...rec, products: filteredProducts, services: filteredServices };
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW — Business guardrail: product classification assignment
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assign classifications to recommended products and services.
 *
 * Products — ProductClassification:
 *   selected    → item.classification already set to "selected" by LLM (preserved)
 *   recommended → satisfies ≥ 1 requirement directly
 *   alternative → relevance_score < 0.5 or satisfies no requirements directly
 *   optional    → low score, only loosely related
 *
 * Services — ServiceClassification (inferred from name/category/description):
 *   Assessment | Design | Implementation | Migration | Validation | Managed Service
 *
 * Also sets solution_mapped = true on items whose source_id is in solutionMappedIds.
 */
function assignProductClassifications(rec, allResults, requirementIds, solutionMappedIds) {
  const reqIdSet = new Set(requirementIds);

  const classifyProduct = (item) => {
    // Preserve explicit "selected" classification from LLM or upstream
    if (item.classification === "selected") return {
      ...item,
      solution_mapped: solutionMappedIds.has(item.source_id),
    };

    const resultEntry = allResults.find((r) => r.source_id === item.source_id);
    const satisfies = resultEntry?.satisfies_requirements.some((r) => reqIdSet.has(r)) ?? false;
    const score = item.relevance_score;

    let classification;
    if (satisfies && score >= 0.5) {
      classification = "recommended";
    } else if (satisfies && score < 0.5) {
      classification = "alternative";
    } else {
      classification = "optional";
    }

    return {
      ...item,
      classification,
      solution_mapped: solutionMappedIds.has(item.source_id),
    };
  };

  const classifyService = (item) => {
    const resultEntry = allResults.find((r) => r.source_id === item.source_id);
    const serviceClass = resultEntry ? inferServiceClassification(resultEntry) : undefined;
    return {
      ...item,
      service_classification: serviceClass,
      solution_mapped: solutionMappedIds.has(item.source_id),
    };
  };

  return {
    ...rec,
    products: (rec.products ?? []).map(classifyProduct),
    services: (rec.services ?? []).map(classifyService),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW — Business guardrail: handoff decision
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine whether a handoff to a NeoZaar Sales/Solution Consultant is more
 * appropriate than presenting a catalog recommendation.
 *
 * Handoff is triggered when:
 *   - confidence is "none" — nothing found in catalog
 *   - confidence is "low"  — recommendation is too weak to be defensible (rule 10)
 *   - no solutions/products/services remain after integrity checks
 *   - handoff_recommended was already set upstream (tie case, custom requirement, etc.)
 *
 * A low-confidence recommendation is never shown to the customer — an honest
 * handoff is always preferable to a weak recommendation (rule 26).
 *
 * Does NOT override handoff_recommended = true already set upstream.
 */
function enforceHandoffDecision(rec) {
  // Already routed to handoff by upstream guard
  if (rec.handoff_recommended) return rec;

  const hasAnything =
    (rec.solutions?.length ?? 0) > 0 ||
    (rec.products?.length ?? 0) > 0 ||
    (rec.services?.length ?? 0) > 0;

  // Trigger handoff when confidence is "none" or "low", or nothing survives filters
  if (rec.confidence === "none" || rec.confidence === "low" || !hasAnything) {
    const isLow = rec.confidence === "low";
    return {
      ...rec,
      handoff_recommended: true,
      handoff_reason:
        rec.handoff_reason ??
        (isLow
          ? "The catalog items found are not a sufficiently close match for the stated requirement. " +
            "A NeoZaar Sales Consultant will review the requirement and identify the best-fit solution."
          : "The requirement could not be matched to a verified NeoZaar catalog offering. " +
            "A NeoZaar Sales Consultant will review the requirement and identify the appropriate solution."),
      summary: isLow
        ? "The available catalog items do not closely enough match your requirement to make a confident recommendation. " +
          "I'll connect you with a NeoZaar Sales Consultant who can identify the best fit for your specific needs."
        : "I was unable to find a verified NeoZaar catalog offering that matches your requirement. " +
          "I'll connect you with a NeoZaar Sales Consultant who can help with your specific needs.",
    };
  }

  return rec;
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW — Build handoff context from recommendation + canonical requirements
// ─────────────────────────────────────────────────────────────────────────────

function buildHandoffContext(rec, canonical, desiredOutcome) {
  const selectedItems = [
    ...(rec.solutions ?? []),
    ...(rec.products ?? []),
    ...(rec.services ?? []),
  ]
    .filter((i) => i.classification === "selected")
    .map((i) => ({ name: i.name, source_id: i.source_id }));

  const recommendedItems = [
    ...(rec.solutions ?? []),
    ...(rec.products ?? []),
    ...(rec.services ?? []),
  ]
    .filter((i) => i.classification !== "selected")
    .map((i) => ({ name: i.name, source_id: i.source_id }));

  return {
    objective: canonical.customer_request,
    desired_outcome: desiredOutcome || canonical.customer_request,
    requirements: canonical.requirements.map((r) => r.label),
    constraints: [],
    selected_items: selectedItems,
    recommended_items: recommendedItems,
    assumptions: rec.key_assumptions ?? [],
    open_questions: canonical.clarifications_needed ?? [],
    handoff_reason: rec.handoff_reason ?? "Human validation required.",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────────────

async function composeRecommendation(canonical, results) {
  const client = getLLMClient();
  const trimmed = trimResults(results);

  // If nothing found at all, return a no-match recommendation without calling LLM
  if (trimmed.length === 0) {
    return buildNoMatchRecommendation(canonical);
  }

  const requirementIds = canonical.requirements.map((r) => r.id);

  // ── PRE-LLM: Mapping Gate ────────────────────────────────────────────────
  // Filter raw results to only approved candidates before sending to the LLM.
  // Only solution-mapped or requirement-justified items are passed as candidates.
  const { approved: approvedCandidates, solutionMappedIds } =
    filterToApprovedCandidates(trimmed, requirementIds);

  // If mapping gate eliminates everything, fall back to no-match handoff
  if (approvedCandidates.length === 0) {
    return buildNoMatchRecommendation(canonical);
  }

  const solutionMappedIdList = Array.from(solutionMappedIds);

  const userContent = JSON.stringify(
    {
      requirements: canonical,
      // Only approved, mapping-gated candidates are passed to the LLM
      catalog_results: approvedCandidates.map(leanResult),
      retrieval_context: {
        has_verified_solutions: approvedCandidates.some((r) => r.type === "solution"),
        verified_solution_ids: approvedCandidates
          .filter((r) => r.type === "solution")
          .map((r) => r.source_id),
        // IDs of products/services directly mapped to a solution — highest-confidence candidates
        solution_mapped_ids: solutionMappedIdList,
        total_approved_candidates: approvedCandidates.length,
      },
    },
    null,
    2
  );

  const response = await client.chat.completions.create({
    model: getLLMModel(),
    messages: [
      { role: "system", content: RECOMMENDATION_PROMPT },
      { role: "user", content: userContent },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "{}";

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Recommendation composer returned invalid JSON: ${raw}`);
  }

  // ── Post-LLM integrity enforcement ──────────────────────────────────────
  // Step 1: Hallucination guard — strip items not in approved candidate list
  const hallucChecked = normaliseRecommendation(parsed, approvedCandidates);

  // Step 2: Solution entity integrity — only real catalog solutions in solutions[]
  const solutionChecked = enforceSolutionIntegrity(hallucChecked, approvedCandidates);

  // Step 3: Match score integrity — cap 100% when requirements unverified
  const coverage = solutionChecked.requirement_coverage ?? [];
  const scoreChecked = {
    ...solutionChecked,
    solutions: enforceMatchScoreIntegrity(solutionChecked.solutions, coverage),
    products:  enforceMatchScoreIntegrity(solutionChecked.products,  coverage),
    services:  enforceMatchScoreIntegrity(solutionChecked.services,  coverage),
  };

  // ── Post-LLM business guardrails ─────────────────────────────────────────
  // Step 4: Solution count limit — 1 primary + max 2 adjacent; tie → handoff
  const solutionLimited = enforceSolutionLimit(scoreChecked);

  // Step 5: Component relevance — mapping-first filter + count caps
  const componentFiltered = enforceComponentRelevance(
    solutionLimited, approvedCandidates, requirementIds, solutionMappedIds
  );

  // Step 6: Classification — products: selected/recommended/alternative/optional
  //                          services: Assessment/Design/Implementation/Migration/…
  const classified = assignProductClassifications(
    componentFiltered, approvedCandidates, requirementIds, solutionMappedIds
  );

  // Step 7: Handoff decision — confidence "none"/"low" → handoff (no weak rec)
  const handoffChecked = enforceHandoffDecision(classified);

  // Step 8: Attach handoff context if routing to consultant
  const desiredOutcome = handoffChecked.desired_outcome ?? canonical.customer_request;
  const finalRec = handoffChecked.handoff_recommended
    ? {
        ...handoffChecked,
        handoff_context: buildHandoffContext(handoffChecked, canonical, desiredOutcome),
      }
    : handoffChecked;

  return finalRec;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildNoMatchRecommendation(canonical) {
  return {
    title: "Request a Callback — NeoZaar Sales Consultant",
    summary:
      "No matching catalog items were found for the stated requirements. " +
      "A NeoZaar Sales Consultant will review your requirement and identify the appropriate solution.",
    solutions: [],
    products: [],
    services: [],
    requirement_coverage: canonical.requirements.map((r) => ({
      requirement_id: r.id,
      requirement_label: r.label,
      covered: false,
      covering_item_ids: [],
      note: "No matching catalog items found.",
    })),
    confidence: "none",
    handoff_recommended: true,
    handoff_reason:
      "No matching catalog items found for the stated requirements. Human review required.",
    handoff_context: {
      objective: canonical.customer_request,
      desired_outcome: canonical.customer_request,
      requirements: canonical.requirements.map((r) => r.label),
      constraints: [],
      selected_items: [],
      recommended_items: [],
      assumptions: [],
      open_questions: canonical.clarifications_needed ?? [],
      handoff_reason: "No matching catalog items found. Human review required.",
    },
  };
}

/**
 * Guard against hallucination: remove any recommended item whose source_id
 * does not exist in the actual search results provided to the LLM.
 */
function normaliseRecommendation(raw, allowedResults) {
  const allowedIds = new Set(allowedResults.map((r) => r.source_id));

  const filterItems = (items = []) =>
    items.filter((item) => {
      if (!allowedIds.has(item.source_id)) {
        console.warn(
          `[NeoZaar] Hallucination guard: removed invented item "${item.name}" (${item.source_id})`
        );
        return false;
      }
      return true;
    });

  const normaliseCoverage = (coverage = []) =>
    coverage.map((c) => ({
      ...c,
      covering_item_ids: (c.covering_item_ids ?? []).filter((id) =>
        allowedIds.has(id)
      ),
    }));

  return {
    title: raw.title ?? "Catalog Match Results",
    summary: raw.summary ?? "",
    solutions: filterItems(raw.solutions),
    products: filterItems(raw.products),
    services: filterItems(raw.services),
    requirement_coverage: normaliseCoverage(raw.requirement_coverage),
    confidence: raw.confidence ?? "low",
    desired_outcome: raw.desired_outcome,
    key_assumptions: raw.key_assumptions,
  };
}

module.exports = { composeRecommendation };
