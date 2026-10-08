/**
 * Relevance scorer.
 *
 * Scores a single catalog item against a search query using:
 *  1. Keyword overlap (Jaccard-style token matching)
 *  2. Category match bonus
 *  3. Tag match bonus
 *  4. Description token overlap
 *
 * All scoring is deterministic and requires no external API call.
 * The Discovery Agent may additionally rerank results using an LLM call
 * after this first-pass filter.
 */

// Tokenise a string into lowercase words, removing common stop words
function tokenise(text) {
  const STOP_WORDS = new Set([
    "a",
    "an",
    "the",
    "and",
    "or",
    "for",
    "to",
    "in",
    "of",
    "is",
    "are",
    "that",
    "this",
    "with",
    "from",
    "by",
    "on",
    "at",
    "i",
    "we",
    "my",
    "our",
    "want",
    "need",
    "get",
    "have",
    "can",
    "will",
    "be",
    "it",
    "its",
    "as",
    "into",
    "up",
    "do",
    "not",
    "also",
    "some",
    "any",
    "all",
  ]);
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOP_WORDS.has(t))
  );
}

// Overlap coefficient: |A ∩ B| / min(|A|, |B|)
// Preferred over Jaccard for asymmetric matching (query << item)
function overlapCoefficient(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) {
    if (b.has(t)) intersection++;
  }
  return intersection / Math.min(a.size, b.size);
}

// Partial / substring overlap: does any query token appear as a substring in any item token?
function substringBonus(queryTokens, targetText) {
  const lc = targetText.toLowerCase();
  let hits = 0;
  for (const qt of queryTokens) {
    if (lc.includes(qt)) hits++;
  }
  return queryTokens.size > 0 ? hits / queryTokens.size : 0;
}

function scoreItem(item, query) {
  const reasons = [];
  let score = 0;

  // Build query token set from both the keywords array and optional requirementText
  const queryText = [
    ...query.keywords,
    query.requirementText ?? "",
    query.category ?? "",
  ].join(" ");
  const queryTokens = tokenise(queryText);

  // ── 1. Keyword field overlap (weight: 0.40) ────────────────────────────
  const keywordText = item.keywords.join(" ");
  const keywordTokens = tokenise(keywordText);
  const kwOverlap = overlapCoefficient(queryTokens, keywordTokens);
  if (kwOverlap > 0) {
    const contribution = kwOverlap * 0.40;
    score += contribution;
    reasons.push(`keyword match (${(kwOverlap * 100).toFixed(0)}%)`);
  }

  // ── 2. Name match (weight: 0.25) ──────────────────────────────────────
  const nameTokens = tokenise(item.name);
  const nameOverlap = overlapCoefficient(queryTokens, nameTokens);
  // Also check substring: e.g. query "email" matches "Email Security"
  const nameSub = substringBonus(queryTokens, item.name) * 0.5;
  const nameScore = Math.max(nameOverlap, nameSub) * 0.25;
  if (nameScore > 0) {
    score += nameScore;
    reasons.push(`name match (${item.name})`);
  }

  // ── 3. Description overlap (weight: 0.20) ─────────────────────────────
  const descTokens = tokenise(item.description);
  const descOverlap = overlapCoefficient(queryTokens, descTokens);
  if (descOverlap > 0) {
    const contribution = descOverlap * 0.20;
    score += contribution;
    reasons.push(`description match (${(descOverlap * 100).toFixed(0)}%)`);
  }

  // ── 4. Category match bonus (weight: 0.10) ────────────────────────────
  if (query.category) {
    const qCatTokens = tokenise(query.category);
    const iCatTokens = tokenise(item.category + " " + (item.subcategory ?? ""));
    const catOverlap = overlapCoefficient(qCatTokens, iCatTokens);
    if (catOverlap > 0) {
      const contribution = catOverlap * 0.10;
      score += contribution;
      reasons.push(`category match (${item.category})`);
    }
  }

  // ── 5. Tag match bonus (weight: 0.05) ─────────────────────────────────
  if (item.tags && item.tags.length > 0) {
    const tagText = item.tags.join(" ");
    const tagBonus = substringBonus(queryTokens, tagText) * 0.05;
    if (tagBonus > 0) {
      score += tagBonus;
      reasons.push("tag match");
    }
  }

  // Clamp to [0, 1]
  score = Math.min(1, score);

  return { item, score, matchReasons: reasons };
}

module.exports = { scoreItem };
