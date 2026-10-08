/**
 * Query Understanding — Natural Language → Canonical Requirements.
 *
 * Uses GPT-4o (via Azure AI Foundry or direct OpenAI) to extract structured
 * requirements from a free-text customer message.
 *
 * OUTPUT VALIDATION
 * ─────────────────
 * GPT-4o's JSON response is validated with a zod schema before it enters the
 * retrieval layer. Invalid/missing fields are normalised defensively rather
 * than failing silently — callers always receive a well-typed
 * CanonicalRequirements object.
 */

const { z } = require("zod");
const { QUERY_UNDERSTANDING_PROMPT } = require("./instructions");
const { getLLMClient, getLLMModel } = require("../lib/llmClient");

// ─────────────────────────────────────────────────────────────────────────────
// Zod schema — validates GPT-4o structured output before entering retrieval
// ─────────────────────────────────────────────────────────────────────────────

const RequirementSchema = z.object({
  id:           z.string().optional(),
  label:        z.string().optional(),
  category:     z.string().default("general"),
  priority:     z.enum(["high", "medium", "low"]).default("high"),
  keywords:     z.array(z.string()).default([]),
  sourcePhrase: z.string().optional(),
});

const CanonicalRequirementsSchema = z.object({
  customer_request:      z.string().optional(),
  requirements:          z.array(RequirementSchema).default([]),
  clarifications_needed: z.array(z.string()).default([]),
});

// ─────────────────────────────────────────────────────────────────────────────
// Validate and normalise GPT-4o output
// ─────────────────────────────────────────────────────────────────────────────

function parseAndValidate(raw, originalMessage) {
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(
      `[Neo/queryUnderstanding] GPT-4o returned non-JSON output.\n` +
      `Raw response (first 400 chars): ${raw.slice(0, 400)}`
    );
  }

  const result = CanonicalRequirementsSchema.safeParse(json);

  if (!result.success) {
    // Log schema errors for diagnostics (no secrets in these messages)
    console.warn(
      "[Neo/queryUnderstanding] Schema validation warnings:",
      result.error.flatten()
    );
    // Fall back to partial normalisation rather than hard-failing
  }

  const parsed = result.success ? result.data : json;
  const rawReqs = parsed.requirements;
  const reqs = Array.isArray(rawReqs) ? rawReqs : [];

  return {
    customer_request: parsed.customer_request ?? originalMessage,
    requirements: reqs.map((r, i) => ({
      id:           r.id           ?? `REQ-${String(i + 1).padStart(3, "0")}`,
      label:        r.label        ?? r.category ?? "Unnamed Requirement",
      category:     r.category     ?? "general",
      priority:     r.priority     ?? "high",
      keywords:     Array.isArray(r.keywords) ? r.keywords : [],
      sourcePhrase: r.sourcePhrase,
    })),
    clarifications_needed: Array.isArray(parsed.clarifications_needed)
      ? parsed.clarifications_needed ?? []
      : [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main extraction function
// ─────────────────────────────────────────────────────────────────────────────

async function extractRequirements(message, conversationHistory = []) {
  const client = getLLMClient();
  const t0 = Date.now();

  const messages = [
    { role: "system", content: QUERY_UNDERSTANDING_PROMPT },
    ...conversationHistory.map(
      (t) => ({
        role: t.role,
        content: t.content,
      })
    ),
    { role: "user", content: message },
  ];

  const response = await client.chat.completions.create({
    model: getLLMModel(),
    messages,
    temperature: 0.1,
    response_format: { type: "json_object" },
  });

  const latencyMs = Date.now() - t0;
  const usage = response.usage;

  // Diagnostic logging — no secrets, no user PII beyond what was already sent
  console.info(
    `[Neo/queryUnderstanding] model=${response.model ?? getLLMModel()} ` +
    `latency=${latencyMs}ms ` +
    `tokens=(prompt:${usage?.prompt_tokens ?? "?"} completion:${usage?.completion_tokens ?? "?"} total:${usage?.total_tokens ?? "?"})`
  );

  const raw = response.choices[0]?.message?.content ?? "{}";
  return parseAndValidate(raw, message);
}

module.exports = { extractRequirements };
