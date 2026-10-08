/**
 * Proposal Studio — Composer.
 *
 * Takes a DiscoveryResponse from Neo and calls the LLM to generate
 * a structured Proposal document. This is strictly a downstream consumer
 * of Neo's output — it never performs discovery itself.
 */

const crypto = require("crypto");
const { getLLMClient, getLLMModel } = require("../lib/llmClient");

const PROPOSAL_SYSTEM_PROMPT = `
You are Proposal Studio, a professional proposal writer for a technology solutions marketplace.

You receive a structured discovery result from Neo (the AI Discovery Agent) and write a polished
B2B technology proposal document.

Return a JSON object with these fields:
{
  "executive_summary": "<3-5 sentence executive summary>",
  "customer_requirements": "<paragraph describing what the customer needs>",
  "recommended_solution": "<paragraph describing the recommended approach>",
  "scope": "<paragraph describing what is in scope>",
  "benefits": "<paragraph describing key customer benefits>",
  "assumptions": "<paragraph listing assumptions>",
  "next_steps": "<paragraph listing recommended next steps>"
}

Rules:
- Write in professional B2B proposal language.
- Reference only the products, services, and solutions provided to you.
- Do not invent capabilities or pricing.
- Be specific — reference the actual product and service names from the discovery result.
- Return ONLY the JSON object.
`.trim();

async function composeProposal(request) {
  const client = getLLMClient();
  const { discovery, customer_name, author_name } = request;

  const date = request.date ?? new Date().toISOString().split("T")[0];

  const userContent = JSON.stringify(
    {
      customer_request: discovery.customer_request,
      requirements: discovery.requirements,
      recommended_solutions: discovery.recommended_solutions,
      recommended_products: discovery.recommended_products,
      recommended_services: discovery.recommended_services,
      recommendation_summary: discovery.recommendation_summary,
      confidence: discovery.confidence,
    },
    null,
    2
  );

  const response = await client.chat.completions.create({
    model: getLLMModel(),
    messages: [
      { role: "system", content: PROPOSAL_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const generated = JSON.parse(raw);

  const title = buildTitle(discovery);

  return {
    id: crypto.randomUUID(),
    title,
    customer_name,
    author_name,
    date,
    executive_summary: generated.executive_summary ?? "",
    customer_requirements: {
      title: "Customer Requirements",
      content: generated.customer_requirements ?? "",
    },
    recommended_solution: {
      title: "Recommended Solution",
      content: generated.recommended_solution ?? "",
    },
    products: discovery.recommended_products,
    services: discovery.recommended_services,
    solutions: discovery.recommended_solutions,
    scope: {
      title: "Scope of Work",
      content: generated.scope ?? "",
    },
    benefits: {
      title: "Key Benefits",
      content: generated.benefits ?? "",
    },
    assumptions: {
      title: "Assumptions",
      content: generated.assumptions ?? "",
    },
    next_steps: {
      title: "Next Steps",
      content: generated.next_steps ?? "",
    },
    discovery_context: discovery,
  };
}

function buildTitle(discovery) {
  const allItems = [
    ...discovery.recommended_solutions,
    ...discovery.recommended_products,
    ...discovery.recommended_services,
  ];

  // Use the top solution name if one exists, otherwise summarise from requirements
  if (discovery.recommended_solutions.length > 0) {
    return `${discovery.recommended_solutions[0].name} — Proposal`;
  }

  const reqLabels = discovery.requirements
    .slice(0, 2)
    .map((r) => r.label)
    .join(" & ");

  return reqLabels
    ? `${reqLabels} — Proposal`
    : "Technology Solution Proposal";
}

module.exports = { composeProposal };
