import getPool from "./db.js";
import { createBiginContact } from "./biginService.js";
import { postCtaAction } from "./leadsApi.js";

/**
 * CRM sink for the WhatsApp bot. A commercial-offer submission fans out to three
 * best-effort sinks — a failure in one is logged, never thrown:
 *
 *   1. crm_cta      → POST /api/public/leads/cta-action  (CRM v2: lead upsert,
 *                     customer scoring, opportunity via the lifecycle engine —
 *                     the same path the website's high-intent CTAs use)
 *   2. bigin        → Zoho Bigin contact (existing sales workflow)
 *   3. lead_details → raw row (feeds existing dashboards)
 */

const DASH = "—";

/** Human-readable label for the services bridge outcome (§6 Step 4). */
function servicesLabel(status) {
  switch (status) {
    case "software_only":
      return "Software only";
    case "requires_discussion":
      return "To discuss";
    case "build_requirement":
      return "Proposal Studio (requirement)";
    default:
      return DASH;
  }
}

/**
 * Structured, human-readable recap of everything Neo gathered. Used as the
 * cta-action `requirement`, the Bigin Description, and the lead_details.message.
 * @param {import('./sessionStore.js').Session} session
 */
export function buildContextSummary(session) {
  const c = session.context || {};
  const lines = [
    "Source: WhatsApp Neo",
    `Intent: ${c.intent === "expert" ? "Speak to Expert" : "Commercial Offer"}`,
    `Route: ${c.commercial_route || DASH}`,
    `Commercial Intent: ${c.commercial_intent || DASH}`,
    `Services: ${servicesLabel(c.services_status)}`,
    `Catalog status: ${c.product?.catalog_status || c.catalog_status || DASH}`,
  ];

  if (c.product?.name) {
    lines.push(`Product: ${c.product.name}${c.product.vendor ? ` (${c.product.vendor})` : ""}`);
  }
  if (c.solution?.name) lines.push(`Solution: ${c.solution.name}`);
  if (c.service?.name) lines.push(`Service: ${c.service.name}`);
  if (c.target_cloud) lines.push(`Cloud: ${c.target_cloud}`);
  if (c.business_outcome) lines.push(`Stated outcome: ${c.business_outcome}`);

  const contact = [c.name, c.company, c.email].filter(Boolean).join(" | ");
  if (contact) lines.push(`Contact: ${contact}`);
  lines.push(`Phone: ${session.phone}`);

  return lines.join("\n");
}

/**
 * Map session context to the backend cta-action payload. `product_id` is sent
 * only for a catalogue-verified product, so the lifecycle engine links a real
 * product opportunity; an unverified name goes through as `product_name` alone.
 * @param {import('./sessionStore.js').Session} session
 * @param {string} source  lead_source label
 */
export function ctaPayload(session, source) {
  const c = session.context || {};
  const verified = c.product?.catalog_status === "verified";
  return {
    source,
    name: c.name || undefined,
    email: c.email || "",
    phone: session.phone,
    company: c.company || undefined,
    requirement: buildContextSummary(session),
    consent_status: Boolean(c.email),
    product_name: c.product?.name || undefined,
    product_id: verified ? c.product?.id : undefined,
    cloud_environment: c.target_cloud || undefined,
    procurement_stage: c.commercial_route || undefined,
  };
}

async function insertLeadDetail(session, summary) {
  const pool = getPool();
  const c = session.context || {};
  const actionType = c.product?.type || c.service?.type || c.solution?.type || "product";
  const actionId = c.product?.id || c.service?.id || c.solution?.id || null;

  await pool.query(
    `INSERT INTO lead_details
        (status, type, action_id, message, action_type, action_for,
         contact_name, contact_email, contact_phone, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
    [
      "new", "whatsapp", actionId, summary, actionType, "customer",
      c.name || null, c.email || null, session.phone || null,
    ]
  );
}

/**
 * Persist a commercial-offer request (§8 "After Submission"). Best-effort across
 * all sinks — a failure in one is logged, not thrown, so the customer still
 * gets their confirmation.
 * @param {import('./sessionStore.js').Session} session
 * @returns {Promise<{ok: boolean, sinks: Record<string, string>}>}
 */
export async function submitCommercialRequest(session) {
  const c = session.context || {};
  const summary = buildContextSummary(session);
  const sinks = {};

  try {
    const r = await postCtaAction(ctaPayload(session, "WhatsApp Neo"));
    sinks.crm_cta = r.ok ? "ok" : `not sent: ${r.skipped || r.error || `HTTP ${r.status}`}`;
  } catch (err) {
    sinks.crm_cta = `failed: ${err.message}`;
    console.error("❌ cta-action failed:", err.message);
  }

  try {
    await createBiginContact({
      productName: c.product?.name || "Commercial Offer",
      email: c.email || "",
      phone: session.phone,
      cta: c.commercial_route || "WhatsApp Neo",
    });
    sinks.bigin = "ok";
  } catch (err) {
    sinks.bigin = `failed: ${err.message}`;
    console.error("❌ Bigin submit failed:", err.response?.data || err.message);
  }

  try {
    await insertLeadDetail(session, summary);
    sinks.lead_details = "ok";
  } catch (err) {
    sinks.lead_details = `failed: ${err.message}`;
    console.error("❌ lead_details insert failed:", err.message);
  }

  const ok = Object.values(sinks).some((v) => v === "ok");
  console.log(`📥 Commercial request for ${session.phone}:`, sinks);
  return { ok, sinks };
}
