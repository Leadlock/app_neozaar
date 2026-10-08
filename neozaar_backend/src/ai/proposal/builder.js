/**
 * Phases 5–12 — Proposal Builder + AI Section Generator + AI Editor.
 *
 * Uses Azure AI Foundry / GPT-4o (via the shared LLM client) to generate
 * proposal content grounded in the WorkspaceState.
 *
 * GROUNDING RULES enforced throughout:
 *   - GPT-4o receives only the actual workspace items (from catalog retrieval).
 *   - The prompt explicitly forbids inventing products, services, vendors, or
 *     technical capabilities.
 *   - All generated text is labelled ai_generated = true so the user knows.
 *   - The hallucination guard in Neo already filtered recommended items, so
 *     everything in the workspace is already catalog-grounded.
 */

const crypto = require("crypto");
const { getLLMClient, getLLMModel } = require("../lib/llmClient");
const {
  activeItems,
  requireWorkspace,
  updateWorkspaceStatus,
} = require("./workspaceStore");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function now() {
  return new Date().toISOString();
}

function emptySection(id, title) {
  return { id, title, content: "", status: "empty", ai_generated: false, updated_at: now() };
}

function makeSection(id, title, content, aiGenerated = true) {
  return {
    id,
    title,
    content,
    status: aiGenerated ? "ai_generated" : "user_edited",
    ai_generated: aiGenerated,
    updated_at: now(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 5 — Create empty ProposalDraft from WorkspaceState
// ─────────────────────────────────────────────────────────────────────────────

function createDraft(ws) {
  const now_ts = now();
  const draft = {
    draft_id: `DRAFT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    workspace_id: ws.workspace_id,
    version: 1,
    executive_summary:          emptySection("executive_summary", "Executive Summary"),
    customer_requirements:      emptySection("customer_requirements", "Customer Requirements"),
    current_challenges:         emptySection("current_challenges", "Current Challenges & Business Need"),
    recommended_solution:       emptySection("recommended_solution", "Recommended Solution"),
    solution_architecture:      emptySection("solution_architecture", "Solution Architecture & Approach"),
    products_section:           emptySection("products_section", "Products"),
    services_section:           emptySection("services_section", "Services"),
    scope_of_work:              emptySection("scope_of_work", "Scope of Work"),
    deliverables:               emptySection("deliverables", "Deliverables"),
    implementation_approach:    emptySection("implementation_approach", "Implementation Approach"),
    timeline:                   emptySection("timeline", "Timeline"),
    timeline_phases:            [],
    assumptions:                emptySection("assumptions", "Assumptions"),
    dependencies:               emptySection("dependencies", "Dependencies"),
    customer_responsibilities:  emptySection("customer_responsibilities", "Customer Responsibilities"),
    commercials:                { line_items: [], contains_tbd_pricing: false },
    next_steps:                 emptySection("next_steps", "Next Steps"),
    created_at: now_ts,
    updated_at: now_ts,
  };
  return draft;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 6 — AI section generation context builder
// ─────────────────────────────────────────────────────────────────────────────

const PROPOSAL_GROUNDING_SYSTEM = `
You are Proposal Studio, a B2B technology proposal writer.

You receive structured workspace data from Neo (the discovery agent) and generate
professional proposal content for a specific section.

GROUNDING RULES — CRITICAL:
- Reference ONLY the products, services, and solutions listed in the workspace data.
- Do NOT invent products, services, vendors, features, pricing, certifications, or integrations.
- Do NOT add technical capabilities that are not described in the provided catalog data.
- If insufficient data exists to generate a section, say so and provide a placeholder.
- Write in professional B2B language appropriate for a technology proposal.
- Return ONLY the section content as plain text — no JSON, no markdown headers.
`.trim();

function buildWorkspaceContext(ws) {
  const solutions = activeItems(ws, "solution");
  const products  = activeItems(ws, "product");
  const services  = activeItems(ws, "service");

  return JSON.stringify({
    customer: ws.customer,
    solution_title: ws.solution_title,
    customer_request: ws.handoff.customer_request,
    requirements: ws.handoff.requirements.map((r) => ({
      label: r.label,
      category: r.category,
      priority: r.priority,
    })),
    confidence: ws.handoff.confidence,
    recommendation_summary: ws.handoff.recommendation_summary,
    solutions: solutions.map((i) => ({
      name: i.catalog.name,
      description: i.catalog.description,
      category: i.catalog.category,
      reasoning: i.catalog.reasoning,
    })),
    products: products.map((i) => ({
      name: i.catalog.name,
      vendor: i.catalog.vendor,
      description: i.catalog.description,
      category: i.catalog.category,
      reasoning: i.catalog.reasoning,
    })),
    services: services.map((i) => ({
      name: i.catalog.name,
      description: i.catalog.description,
      category: i.catalog.category,
      reasoning: i.catalog.reasoning,
    })),
  }, null, 2);
}

const SECTION_PROMPTS = {
  executive_summary:
    "Write a 3–5 sentence executive summary for a B2B technology proposal. Summarise the customer's problem, the recommended solution, and the key benefits. Reference the specific products and services in the workspace.",
  customer_requirements:
    "Write a paragraph describing the customer's stated requirements. Reference each requirement by name. Be specific and professional.",
  current_challenges:
    "Write 2–3 paragraphs describing the business challenges and technology pain points that the customer is facing based on their requirements. Do not invent details — only describe what can be inferred from the requirements.",
  recommended_solution:
    "Write 2–3 paragraphs describing the recommended solution. Explain how the selected products and services address the customer's requirements. Reference specific product and service names from the workspace.",
  solution_architecture:
    "Write a paragraph describing the solution architecture and approach. Describe how the components work together. Reference only catalog items in the workspace.",
  products_section:
    "Write a section listing and briefly describing each product in the workspace. For each product, include the vendor and a 1–2 sentence description of its role in the solution.",
  services_section:
    "Write a section listing and briefly describing each service in the workspace. For each service, include a 1–2 sentence description of what it delivers.",
  scope_of_work:
    "Generate a detailed scope of work based on the selected services. For each service, list 4–8 specific activities or deliverables. Use numbered lists.",
  deliverables:
    "List the key deliverables the customer will receive at the end of the engagement, based on the selected services. Use a numbered list.",
  implementation_approach:
    "Describe the implementation approach in 2–3 paragraphs. Cover the methodology, key phases, and how risks will be managed. Ground this in the actual services selected.",
  timeline:
    "Suggest an indicative implementation timeline with 4–6 phases. For each phase, include a name and a week range. Clearly label this as an estimate. Base it on the selected services.",
  assumptions:
    "List 6–10 reasonable assumptions for this engagement. Cover access, licensing, environment readiness, and customer cooperation. Use a numbered list. Base assumptions on the selected products and services.",
  dependencies:
    "List any key dependencies that must be in place before or during the engagement. Use a numbered list.",
  customer_responsibilities:
    "List the customer's responsibilities during this engagement. Include access, approvals, testing, and communications. Use a numbered list.",
  next_steps:
    "Write 4–6 clear next steps for moving forward. Include a discovery call, proposal acceptance, and project kick-off. Use a numbered list.",
};

// ─────────────────────────────────────────────────────────────────────────────
// Phase 6 — Generate a single section
// ─────────────────────────────────────────────────────────────────────────────

async function generateSection(workspace_id, section_id, instruction) {
  const ws = requireWorkspace(workspace_id);

  // Ensure a draft exists
  if (!ws.proposal) {
    ws.proposal = createDraft(ws);
  }

  const client = getLLMClient();
  const basePrompt = SECTION_PROMPTS[section_id];
  const finalPrompt = instruction
    ? `${basePrompt}\n\nAdditional instruction: ${instruction}`
    : basePrompt;

  const response = await client.chat.completions.create({
    model: getLLMModel(),
    messages: [
      { role: "system", content: PROPOSAL_GROUNDING_SYSTEM },
      { role: "user", content: `WORKSPACE DATA:\n${buildWorkspaceContext(ws)}\n\nSECTION TO GENERATE:\n${finalPrompt}` },
    ],
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content ?? "";

  const sectionTitles = {
    executive_summary:         "Executive Summary",
    customer_requirements:     "Customer Requirements",
    current_challenges:        "Current Challenges & Business Need",
    recommended_solution:      "Recommended Solution",
    solution_architecture:     "Solution Architecture & Approach",
    products_section:          "Products",
    services_section:          "Services",
    scope_of_work:             "Scope of Work",
    deliverables:              "Deliverables",
    implementation_approach:   "Implementation Approach",
    timeline:                  "Timeline",
    assumptions:               "Assumptions",
    dependencies:              "Dependencies",
    customer_responsibilities: "Customer Responsibilities",
    next_steps:                "Next Steps",
  };

  const section = makeSection(section_id, sectionTitles[section_id], content, true);

  // Write back into draft
  ws.proposal[section_id] = section;
  ws.proposal.updated_at = now();
  ws.updated_at = now();

  // Phase 8 — parse timeline phases from the generated timeline section
  if (section_id === "timeline") {
    ws.proposal.timeline_phases = parseTimelinePhases(content);
  }

  return section;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 6 — Generate all sections in sequence
// ─────────────────────────────────────────────────────────────────────────────

async function generateAllSections(workspace_id) {
  const ws = requireWorkspace(workspace_id);
  if (!ws.proposal) ws.proposal = createDraft(ws);

  updateWorkspaceStatus(workspace_id, "building");

  const sections = [
    "executive_summary",
    "customer_requirements",
    "current_challenges",
    "recommended_solution",
    "solution_architecture",
    "products_section",
    "services_section",
    "scope_of_work",
    "deliverables",
    "implementation_approach",
    "timeline",
    "assumptions",
    "dependencies",
    "customer_responsibilities",
    "next_steps",
  ];

  for (const section_id of sections) {
    await generateSection(workspace_id, section_id);
  }

  // Phase 10 — auto-populate commercials placeholders from workspace items
  populateCommercialPlaceholders(ws);

  updateWorkspaceStatus(workspace_id, "review");
  return ws.proposal;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 7 — Scope of Work (also via generateSection("scope_of_work"))
// Phase 8 — Timeline parsing
// ─────────────────────────────────────────────────────────────────────────────

function parseTimelinePhases(timelineContent) {
  // Best-effort regex parse of "Phase N — Name\nWeek X–Y" patterns
  const phases = [];
  const regex = /phase\s+(\d+)[^—\n]*[—\-–]\s*([^\n]+)\n[^\d]*(?:week[s]?\s+)?(\d+)(?:\s*[–\-–]\s*(\d+))?/gi;
  let match;
  let idx = 0;
  while ((match = regex.exec(timelineContent)) !== null) {
    phases.push({
      id: `TP-${idx + 1}`,
      name: `Phase ${match[1]} — ${match[2].trim()}`,
      start_week: parseInt(match[3], 10),
      end_week: match[4] ? parseInt(match[4], 10) : parseInt(match[3], 10),
      is_estimate: true,
    });
    idx++;
  }

  // If parsing failed, create generic phases
  if (phases.length === 0) {
    ["Assessment", "Design", "Implementation", "Testing", "Handover"].forEach((name, i) => {
      phases.push({
        id: `TP-${i + 1}`,
        name: `Phase ${i + 1} — ${name}`,
        is_estimate: true,
        duration_label: "TBD",
      });
    });
  }

  return phases;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 10 — Commercials (placeholder population)
// ─────────────────────────────────────────────────────────────────────────────

function populateCommercialPlaceholders(ws) {
  if (!ws.proposal) return;

  const lineItems = [];

  for (const item of activeItems(ws, "product")) {
    lineItems.push({
      id: crypto.randomUUID(),
      type: "product",
      name: item.catalog.name,
      description: item.catalog.vendor ? `${item.catalog.vendor} — ${item.catalog.category}` : item.catalog.category,
      quantity: 1,
      unit: "license",
      price_tbd: true,
    });
  }

  for (const item of activeItems(ws, "service")) {
    lineItems.push({
      id: crypto.randomUUID(),
      type: "service",
      name: item.catalog.name,
      description: item.catalog.category,
      quantity: 1,
      unit: "engagement",
      price_tbd: true,
    });
  }

  const summary = {
    line_items: lineItems,
    pricing_notes: "All pricing is indicative and subject to final scoping. Items marked 'TBD' require commercial agreement.",
    contains_tbd_pricing: true,
  };

  ws.proposal.commercials = summary;
  ws.proposal.updated_at = now();
}

/**
 * Update a commercial line item (manual price entry).
 * Recalculates totals after update.
 */
function updateCommercialLineItem(workspace_id, line_item_id, updates) {
  const ws = requireWorkspace(workspace_id);
  if (!ws.proposal) throw new Error("No proposal draft — generate sections first.");

  const item = ws.proposal.commercials.line_items.find((li) => li.id === line_item_id);
  if (!item) throw new Error(`Line item not found: ${line_item_id}`);

  Object.assign(item, updates);

  // Recalculate total for this item
  if (item.quantity !== undefined && item.unit_price !== undefined) {
    item.total = item.quantity * item.unit_price;
    item.price_tbd = false;
  }

  // Recalculate summary
  const hasKnown = ws.proposal.commercials.line_items.some(
    (li) => !li.price_tbd && li.total !== undefined
  );
  if (hasKnown) {
    ws.proposal.commercials.subtotal = ws.proposal.commercials.line_items
      .filter((li) => !li.price_tbd && li.total !== undefined)
      .reduce((sum, li) => sum + (li.total ?? 0), 0);
  }

  ws.proposal.commercials.contains_tbd_pricing = ws.proposal.commercials.line_items.some(
    (li) => li.price_tbd
  );

  ws.proposal.updated_at = now();
  ws.updated_at = now();
  return ws.proposal.commercials;
}

/**
 * Directly update the content of any proposal section (user edit).
 */
function updateSectionContent(workspace_id, section_id, content) {
  const ws = requireWorkspace(workspace_id);
  if (!ws.proposal) throw new Error("No proposal draft — generate sections first.");

  const section = ws.proposal[section_id];
  if (!section || typeof section !== "object" || !("content" in section)) {
    throw new Error(`Section not found: ${section_id}`);
  }

  const prev = section.status;
  section.content = content;
  section.status = prev === "approved" ? "approved" : "user_edited";
  section.updated_at = now();
  ws.proposal.updated_at = now();
  ws.updated_at = now();
  return section;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 11 — Proposal Review
// ─────────────────────────────────────────────────────────────────────────────

const REQUIRED_SECTIONS = [
  "executive_summary",
  "customer_requirements",
  "recommended_solution",
  "scope_of_work",
  "next_steps",
];

function reviewProposal(workspace_id) {
  const ws = requireWorkspace(workspace_id);
  const draft = ws.proposal;

  if (!draft) {
    return {
      workspace_id,
      is_ready: false,
      sections_status: [],
      missing_sections: REQUIRED_SECTIONS,
      warnings: ["Proposal draft has not been generated yet."],
      can_export: false,
    };
  }

  const allSectionIds = [
    "executive_summary", "customer_requirements", "current_challenges",
    "recommended_solution", "solution_architecture", "products_section",
    "services_section", "scope_of_work", "deliverables",
    "implementation_approach", "timeline", "assumptions",
    "dependencies", "customer_responsibilities", "next_steps",
  ];

  const sectionsStatus = allSectionIds.map((id) => {
    const s = draft[id];
    return {
      section_id: id,
      title: s?.title ?? id,
      status: s?.status ?? "empty",
      has_content: Boolean(s?.content?.trim()),
    };
  });

  const missingSections = REQUIRED_SECTIONS.filter((id) => {
    const entry = sectionsStatus.find((s) => s.section_id === id);
    return !entry?.has_content;
  });

  const warnings = [];
  if (ws.products.filter((i) => i.status === "accepted" || i.status === "user_added").length === 0) {
    warnings.push("No products selected in the workspace.");
  }
  if (draft.commercials.contains_tbd_pricing) {
    warnings.push("Some commercial line items have TBD pricing.");
  }

  const can_export = missingSections.length === 0;

  return {
    workspace_id,
    is_ready: can_export,
    sections_status: sectionsStatus,
    missing_sections: missingSections,
    warnings,
    can_export,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 12 — AI Editing
// ─────────────────────────────────────────────────────────────────────────────

const AI_EDIT_SYSTEM = `
You are Proposal Studio's AI editor. The user wants to modify a proposal.

You will receive:
1. The current proposal content for one or more sections.
2. An editing instruction from the user.

Apply the instruction and return the modified section content.

RULES:
- Do NOT add products, services, vendors, or capabilities not already in the content.
- Do NOT restart discovery.
- Return a JSON object mapping section_id → new_content.
- Only return sections you actually changed.
- Return ONLY the JSON object.
`.trim();

async function aiEditProposal(req) {
  const ws = requireWorkspace(req.workspace_id);
  if (!ws.proposal) throw new Error("No proposal draft — generate sections first.");

  const client = getLLMClient();
  const draft = ws.proposal;

  // Decide which sections to include in context
  const allSectionIds = req.target_section_id
    ? [req.target_section_id]
    : [
        "executive_summary", "customer_requirements", "current_challenges",
        "recommended_solution", "solution_architecture", "scope_of_work",
        "deliverables", "implementation_approach", "timeline",
        "assumptions", "next_steps",
      ];

  const currentContent = {};
  for (const id of allSectionIds) {
    const s = draft[id];
    if (s?.content?.trim()) currentContent[id] = s.content;
  }

  const userMsg = JSON.stringify({
    instruction: req.instruction,
    current_sections: currentContent,
    workspace_context: {
      solution_title: ws.solution_title,
      products: activeItems(ws, "product").map((i) => i.catalog.name),
      services: activeItems(ws, "service").map((i) => i.catalog.name),
    },
  }, null, 2);

  const response = await client.chat.completions.create({
    model: getLLMModel(),
    messages: [
      { role: "system", content: AI_EDIT_SYSTEM },
      { role: "user", content: userMsg },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const changes = JSON.parse(raw);

  const applied = [];

  for (const [section_id, new_content] of Object.entries(changes)) {
    const s = draft[section_id];
    if (s && typeof s === "object" && "content" in s) {
      applied.push({
        section_id,
        previous_content: s.content,
        new_content,
      });
      s.content = new_content;
      s.status = "user_edited";
      s.updated_at = now();
    }
  }

  draft.updated_at = now();
  ws.updated_at = now();

  return {
    workspace_id: req.workspace_id,
    applied_changes: applied,
    instruction_applied: req.instruction,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 13 — Final Proposal Export
// ─────────────────────────────────────────────────────────────────────────────

function exportProposal(workspace_id, format, customerName, authorName) {
  const ws = requireWorkspace(workspace_id);
  if (!ws.proposal) throw new Error("No proposal draft — generate sections first.");

  const draft = ws.proposal;
  const date = new Date().toISOString().split("T")[0];
  const customer = customerName ?? ws.customer.name ?? "Customer";
  const title = `${ws.solution_title} — Proposal`;

  let content;

  if (format === "json") {
    content = JSON.stringify(draft, null, 2);
  } else if (format === "markdown") {
    content = renderMarkdown(ws, draft, customer, authorName, date);
  } else {
    content = renderHTML(ws, draft, customer, authorName, date);
  }

  updateWorkspaceStatus(workspace_id, "exported");

  return {
    proposal_id: `PROP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    workspace_id,
    format,
    title,
    customer_name: customer,
    author_name: authorName,
    date,
    content,
    proposal_json: draft,
    created_at: now(),
  };
}

function sectionMd(s) {
  if (!s.content?.trim()) return "";
  return `## ${s.title}\n\n${s.content}\n\n`;
}

function renderMarkdown(ws, draft, customer, author, date) {
  const products = activeItems(ws, "product");
  const services = activeItems(ws, "service");
  const solutions = activeItems(ws, "solution");

  const commercialRows = draft.commercials.line_items
    .map((li) => `| ${li.name} | ${li.quantity ?? "-"} | ${li.unit ?? "-"} | ${li.price_tbd ? "TBD" : String(li.unit_price ?? "-")} | ${li.price_tbd ? "TBD" : String(li.total ?? "-")} |`)
    .join("\n");

  return [
    `# ${ws.solution_title}`,
    `**Customer:** ${customer}${author ? `  \n**Author:** ${author}` : ""}  \n**Date:** ${date}`,
    "",
    sectionMd(draft.executive_summary),
    sectionMd(draft.customer_requirements),
    sectionMd(draft.current_challenges),
    sectionMd(draft.recommended_solution),
    sectionMd(draft.solution_architecture),
    solutions.length > 0
      ? `## Solutions\n\n${solutions.map((i) => `- **${i.catalog.name}**${i.catalog.vendor ? ` (${i.catalog.vendor})` : ""}`).join("\n")}\n\n`
      : "",
    products.length > 0
      ? `## Products\n\n${products.map((i) => `- **${i.catalog.name}**${i.catalog.vendor ? ` — ${i.catalog.vendor}` : ""}: ${i.catalog.description}`).join("\n\n")}\n\n`
      : "",
    sectionMd(draft.products_section),
    services.length > 0
      ? `## Services\n\n${services.map((i) => `- **${i.catalog.name}**: ${i.catalog.description}`).join("\n\n")}\n\n`
      : "",
    sectionMd(draft.services_section),
    sectionMd(draft.scope_of_work),
    sectionMd(draft.deliverables),
    sectionMd(draft.implementation_approach),
    sectionMd(draft.timeline),
    draft.timeline_phases.length > 0
      ? `### Timeline Phases (Indicative)\n\n${draft.timeline_phases.map((p) => `| ${p.name} | Week ${p.start_week ?? "?"}${p.end_week && p.end_week !== p.start_week ? `–${p.end_week}` : ""} |`).join("\n")}\n\n`
      : "",
    sectionMd(draft.assumptions),
    sectionMd(draft.dependencies),
    sectionMd(draft.customer_responsibilities),
    `## Commercials\n\n*All pricing indicative — subject to final agreement.*\n\n| Item | Qty | Unit | Unit Price | Total |\n|------|-----|------|-----------|-------|\n${commercialRows}\n\n${draft.commercials.subtotal !== undefined ? `**Subtotal:** ${draft.commercials.subtotal}\n\n` : ""}`,
    sectionMd(draft.next_steps),
  ].join("");
}

function renderHTML(ws, draft, customer, author, date) {
  const md = renderMarkdown(ws, draft, customer, author, date);
  // Minimal HTML wrapper — replace with a proper template engine in production
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${ws.solution_title} — Proposal</title>
<style>
  body { font-family: -apple-system, "Segoe UI", sans-serif; max-width: 900px; margin: 40px auto; color: #1f2328; line-height: 1.6; }
  h1 { border-bottom: 2px solid #3b82d4; padding-bottom: 8px; }
  h2 { margin-top: 2em; color: #3b82d4; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
  th { background: #f7f8fa; }
</style>
</head>
<body>
${md
  .replace(/^# (.+)$/gm, "<h1>$1</h1>")
  .replace(/^## (.+)$/gm, "<h2>$1</h2>")
  .replace(/^### (.+)$/gm, "<h3>$1</h3>")
  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  .replace(/^- (.+)$/gm, "<li>$1</li>")
  .replace(/\n\n/g, "<br><br>")}
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 14 — CRM Handoff
// ─────────────────────────────────────────────────────────────────────────────

function buildCRMHandoff(workspace_id) {
  const ws = requireWorkspace(workspace_id);
  const draft = ws.proposal;

  const timeline_summary = draft?.timeline_phases
    .map((p) => p.name + (p.duration_label ? ` (${p.duration_label})` : ""))
    .join("; ");

  return {
    handoff_id: `CRM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    workspace_id,
    customer: ws.customer,
    opportunity_name: ws.solution_title,
    requirements: ws.handoff.requirements,
    recommended_solution_title: ws.solution_title,
    products: activeItems(ws, "product").map((i) => ({
      name: i.catalog.name,
      vendor: i.catalog.vendor,
      source_id: i.catalog.source_id,
      source: i.catalog.source,
    })),
    services: activeItems(ws, "service").map((i) => ({
      name: i.catalog.name,
      source_id: i.catalog.source_id,
      source: i.catalog.source,
    })),
    solutions: activeItems(ws, "solution").map((i) => ({
      name: i.catalog.name,
      source_id: i.catalog.source_id,
      source: i.catalog.source,
    })),
    estimated_value: draft?.commercials.subtotal,
    currency: draft?.commercials.currency,
    timeline_summary,
    proposal_summary: draft?.executive_summary.content ?? ws.handoff.recommendation_summary,
    next_steps: draft?.next_steps.content,
    proposal_date: new Date().toISOString().split("T")[0],
    confidence: ws.handoff.confidence,
  };
}

module.exports = {
  createDraft,
  generateSection,
  generateAllSections,
  updateCommercialLineItem,
  updateSectionContent,
  reviewProposal,
  aiEditProposal,
  exportProposal,
  buildCRMHandoff,
};
