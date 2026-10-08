/**
 * Neo Discovery → CRM Opportunity.
 *
 * Each Neo chat session produces ONE opportunity:
 *   - New chat  → new opportunity.
 *   - Same chat, Proceed again → the SAME opportunity is refreshed (comment +
 *     activity + line items re-synced), never duplicated.
 *
 * A single crm_leads row is kept per email (the person), but it can have many
 * opportunities over time — one per engagement.
 *
 * Flow:
 *   1. Upsert crm_leads by email (lead_source = "Neo AI Discovery").
 *   2. Find-or-create the Account + Contact (deduped by email).
 *   3. If this session already made an opportunity and it's still live → reuse it.
 *      Otherwise INSERT a fresh opportunity at stage "Discovery".
 *   4. Name it (solution / product / service + person), write the bundle to the
 *      opportunity note + a comment + an activity, and add the selected
 *      products/services as opportunity line items.
 */

const pool = require("../../config/database");
const { getSession } = require("./chatAgent");
const { createNotification } = require("../../controllers/crm/lifecycle.engine");
const sendEmail = require("../../utils/sendEmailAzure");

const TECH_SUPPORT_EMAIL = process.env.NEO_TECH_SUPPORT_EMAIL || "tech-support@neozaar.com";

const escapeHtml = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ── Pull the bundle (customer-confirmed, else Neo's recommendation) ──────────
function resolveBundle(session) {
  const u = session?.understanding || {};
  const dr = session?.discoveryResult || {};
  const bundle = session?.selectedBundle || null;

  const outcome =
    u.desiredOutcome || u.intent || dr.customer_request || "Requirement captured via Neo AI";

  const solutionName = bundle
    ? (bundle.solution?.name || "")
    : (dr.recommended_solutions?.[0]?.name || "");

  const toItems = (arr) =>
    (arr || [])
      .map((x) => ({ id: String(x.source_id ?? "").trim(), name: String(x.name ?? "").trim() }))
      .filter((x) => x.name);
  const productItems = toItems(bundle ? bundle.products : dr.recommended_products);
  const serviceItems = toItems(bundle ? bundle.services : dr.recommended_services);
  const productNames = productItems.map((x) => x.name);
  const serviceNames = serviceItems.map((x) => x.name);

  const timeline = String(u.timeline || "").trim();
  const environment = String(u.environment || "").trim();
  const ctxLine = [
    environment && `Environment: ${environment}`,
    (u.users || u.scope) && `Scale: ${u.users || u.scope}`,
    timeline && `Timeline: ${timeline}`,
  ].filter(Boolean).join("  ·  ");

  return {
    isCurated: !!bundle,
    outcome: String(outcome).trim(),
    solutionName: String(solutionName).trim(),
    timeline,
    environment,
    productItems,
    serviceItems,
    productNames,
    serviceNames,
    ctxLine,
  };
}

const short = (s, n) => (s && s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

// ── Opportunity name: what it's FOR + who asked ────────────────────────────
function computeOppName(b, personName) {
  const who = personName ? ` — ${personName}` : "";
  if (b.solutionName) return `${b.solutionName}${who}`;
  if (b.productNames.length === 1 && b.serviceNames.length === 0) return `${b.productNames[0]}${who}`;
  if (b.serviceNames.length === 1 && b.productNames.length === 0) return `${b.serviceNames[0]}${who}`;
  if (b.productNames.length && !b.serviceNames.length) return `${short(b.outcome, 60)} (products)${who}`;
  if (b.serviceNames.length && !b.productNames.length) return `${short(b.outcome, 60)} (services)${who}`;
  return `${short(b.outcome, 70)}${who}`;
}

// ── Human-readable breakdown for the opportunity note / comment / activity ──
function buildBundleText(b, { name, company }) {
  return [
    `Neo AI Discovery${b.isCurated ? " — customer-confirmed selection" : " — recommended"}`,
    `Requested by: ${name || "Marketplace user"}${company ? ` (${company})` : ""}`,
    `Desired outcome: ${b.outcome}`,
    `Solution: ${b.solutionName || "None (individual items)"}`,
    `Products: ${b.productNames.length ? b.productNames.join(", ") : "None selected"}`,
    `Services: ${b.serviceNames.length ? b.serviceNames.join(", ") : "None selected"}`,
    b.ctxLine && `Context: ${b.ctxLine}`,
  ].filter(Boolean).join("\n");
}

// ── Notify tech-support by email when an opportunity is created ────────────
async function emailTechSupport(b, { name, email, company }, oppId, oppName) {
  const row = (label, value) =>
    `<tr>
       <td style="padding:6px 14px 6px 0;color:#6b7280;font:600 13px/1.5 Arial,sans-serif;white-space:nowrap;vertical-align:top">${label}</td>
       <td style="padding:6px 0;color:#111827;font:13px/1.6 Arial,sans-serif">${value}</td>
     </tr>`;

  const list = (arr) =>
    arr.length ? arr.map((x) => escapeHtml(x)).join("<br>") : '<span style="color:#9ca3af">None selected</span>';

  const html = `
  <div style="max-width:640px;margin:0 auto;font:14px/1.6 Arial,sans-serif;color:#111827">
    <h2 style="margin:0 0 4px;font-size:18px">New Neo AI opportunity — ${escapeHtml(oppName || `#${oppId}`)}</h2>
    <p style="margin:0 0 16px;color:#6b7280;font-size:13px">Handed to Pre-Sales from the Neo AI discovery flow. CRM ref #${oppId}.</p>
    <table style="border-collapse:collapse;border-top:1px solid #e5e7eb;width:100%">
      ${row("Requested by", escapeHtml(name || "Marketplace user"))}
      ${row("Email", email ? `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>` : '<span style="color:#9ca3af">Not provided</span>')}
      ${company ? row("Company", escapeHtml(company)) : ""}
      ${row("Desired outcome", escapeHtml(b.outcome))}
      ${row("Solution", b.solutionName ? escapeHtml(b.solutionName) : '<span style="color:#9ca3af">No single solution — individual items</span>')}
      ${row("Products", list(b.productNames))}
      ${row("Services", list(b.serviceNames))}
      ${row("Timeline", b.timeline ? escapeHtml(b.timeline) : '<span style="color:#9ca3af">Not specified</span>')}
      ${b.environment ? row("Environment", escapeHtml(b.environment)) : ""}
    </table>
  </div>`;

  const subj = `New Neo AI opportunity #${oppId} — ${oppName || b.solutionName || b.outcome}`.slice(0, 180);
  return sendEmail(TECH_SUPPORT_EMAIL, subj, html, true);
}

async function resolveOwnerId() {
  const { rows } = await pool
    .query("SELECT id FROM users WHERE role_type='M_SELLER' AND is_active=true ORDER BY id LIMIT 1")
    .catch(() => ({ rows: [] }));
  return rows.length ? rows[0].id : null;
}

// ── Find-or-create Account + Contact for the lead's email ──────────────────
async function resolveAccountContact(lead, ownerId) {
  const email = String(lead.email).trim().toLowerCase();

  let accountId = lead.account_id || null;
  if (!accountId) {
    const { rows } = await pool.query(
      "SELECT id FROM crm_accounts WHERE LOWER(TRIM(email))=$1 AND is_deleted=FALSE LIMIT 1",
      [email],
    );
    if (rows.length) {
      accountId = rows[0].id;
    } else {
      const { rows: ins } = await pool.query(
        `INSERT INTO crm_accounts (name, email, phone, industry, type, owner_id, created_by, updated_by)
         VALUES ($1,$2,$3,$4,'Prospect',$5,$5,$5) RETURNING id`,
        [lead.company || lead.name || email.split("@")[0], lead.email, lead.phone || null, lead.industry || null, ownerId],
      );
      accountId = ins[0].id;
    }
  }

  let contactId = lead.contact_id || null;
  if (!contactId) {
    const { rows } = await pool.query(
      "SELECT id FROM crm_contacts WHERE LOWER(TRIM(email))=$1 AND is_deleted=FALSE LIMIT 1",
      [email],
    );
    if (rows.length) {
      contactId = rows[0].id;
    } else {
      const { rows: ins } = await pool.query(
        `INSERT INTO crm_contacts
           (account_id, name, company, email, phone, whatsapp, designation, country, industry, type, owner_id, created_by, updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'prospect',$10,$10,$10) RETURNING id`,
        [
          accountId, lead.name, lead.company || null, lead.email, lead.phone || null,
          lead.whatsapp || null, lead.designation || null, lead.country || null, lead.industry || null,
          ownerId,
        ],
      );
      contactId = ins[0].id;
    }
  }

  await pool.query(
    "UPDATE crm_leads SET account_id=COALESCE(account_id,$1), contact_id=COALESCE(contact_id,$2), updated_at=NOW() WHERE id=$3",
    [accountId, contactId, lead.id],
  );

  return { accountId, contactId };
}

// Add the selected products & services as opportunity line items so they show
// on the opportunity's Products tab / detail API (not just the note).
async function syncLineItems(oppId, b, userId) {
  const items = [
    ...b.productItems.map((x) => ({ ...x, type: "product" })),
    ...b.serviceItems.map((x) => ({ ...x, type: "service" })),
  ].filter((x) => /^\d+$/.test(x.id));
  if (!items.length) return;

  const ids = [...new Set(items.map((x) => Number(x.id)))];
  const { rows: known } = await pool.query(
    `SELECT id, name, action_type FROM products
     WHERE id = ANY($1::int[]) AND is_publish=TRUE AND deleted_at IS NULL`,
    [ids],
  );
  const byId = new Map(known.map((r) => [String(r.id), r]));

  for (const it of items) {
    const p = byId.get(it.id);
    if (!p) continue;
    await pool.query(
      `INSERT INTO crm_opportunity_products
         (opportunity_id, product_id, product_name, product_type, quantity, unit_price, discount, total, notes, created_by)
       VALUES ($1,$2,$3,$4,1,0,0,0,'Added from Neo AI selection',$5)
       ON CONFLICT (opportunity_id, product_id) DO UPDATE SET
         product_name = EXCLUDED.product_name,
         product_type = EXCLUDED.product_type,
         notes        = EXCLUDED.notes,
         updated_at   = NOW()`,
      [oppId, p.id, p.name, p.action_type || it.type, userId],
    );
  }
}

/**
 * @param {{ session_id?: string, name?: string, email: string, company?: string, phone?: string }} input
 * @returns {Promise<{ opportunity_id:number, opportunity_name:string|null, lead_id:number, already_existed:boolean }>}
 */
async function createDiscoveryOpportunity(input) {
  const email = String(input.email || "").trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    const err = new Error("A valid email is required to create an opportunity.");
    err.status = 400;
    throw err;
  }

  const session = input.session_id ? getSession(input.session_id) : null;
  const name = String(input.name || "").trim() || email.split("@")[0];
  const company = String(input.company || "").trim() || null;
  const phone = String(input.phone || "").trim() || null;

  const b = resolveBundle(session);
  const bundleText = buildBundleText(b, { name, company });
  const ownerId = await resolveOwnerId();

  // One lead per email — keep its details fresh.
  const { rows: leadRows } = await pool.query(
    `INSERT INTO crm_leads
       (name, email, phone, company, lead_source, requirement, notes,
        consent_status, status, lead_stage, score, score_label,
        owner_id, created_at, updated_at)
     VALUES ($1,$2,$3,$4,'Neo AI Discovery',$5,$6,true,'New','New Inquiry',0,'Not Scored',$7,NOW(),NOW())
     ON CONFLICT (email_normalized)
       WHERE is_deleted=FALSE AND email_normalized IS NOT NULL AND email_normalized <> ''
     DO UPDATE SET
       name        = EXCLUDED.name,
       company     = COALESCE(EXCLUDED.company, crm_leads.company),
       phone       = COALESCE(EXCLUDED.phone,   crm_leads.phone),
       requirement = EXCLUDED.requirement,
       owner_id    = COALESCE(crm_leads.owner_id, EXCLUDED.owner_id),
       updated_at  = NOW()
     RETURNING *`,
    [name, email, phone, company, short(b.outcome, 500), bundleText, ownerId],
  );
  const lead = leadRows[0];

  const { accountId, contactId } = await resolveAccountContact(lead, ownerId);

  // Reuse the opportunity this SESSION already created, if it's still live.
  let oppId = null;
  if (session && session.crmOpportunityId) {
    const { rows } = await pool.query(
      "SELECT id FROM crm_opportunities WHERE id=$1 AND is_deleted=FALSE",
      [session.crmOpportunityId],
    );
    if (rows.length) oppId = rows[0].id;
  }
  const reused = oppId != null;

  if (!reused) {
    const { rows: ins } = await pool.query(
      `INSERT INTO crm_opportunities
         (account_id, contact_id, lead_id, name,
          stage, score, probability, deal_value, expected_revenue,
          owner_id, conversion_source, notes,
          stage_entered_at, created_by, updated_by)
       VALUES ($1,$2,$3,$4,
               'Discovery',10,10,0,0,
               $5,'direct_cta',$6,
               NOW(),$5,$5)
       RETURNING id`,
      [accountId, contactId, lead.id, computeOppName(b, name), ownerId, bundleText],
    );
    oppId = ins[0].id;
    if (session) session.crmOpportunityId = oppId;

    // Point the lead at its first opportunity (for reference only).
    await pool.query(
      `UPDATE crm_leads SET
         converted_to_opportunity_id = COALESCE(converted_to_opportunity_id, $1),
         converted_to_account_id     = COALESCE(converted_to_account_id, $2),
         converted_to_contact_id     = COALESCE(converted_to_contact_id, $3),
         converted_at                = COALESCE(converted_at, NOW()),
         lead_stage                  = 'Converted to Opportunity',
         updated_at                  = NOW()
       WHERE id=$4`,
      [oppId, accountId, contactId, lead.id],
    );
  }

  // Annotate (fresh or reused). Name is only set on creation — a salesperson
  // may rename it afterwards.
  try {
    await pool.query(
      `INSERT INTO crm_opportunity_comments (opportunity_id, user_id, author_name, text)
       VALUES ($1,$2,$3,$4)`,
      [oppId, ownerId, "Neo AI", reused ? `Selection updated —\n${bundleText}` : bundleText],
    );
    await pool.query(
      `INSERT INTO crm_activities
         (entity_type, entity_id, contact_id, type, subject, description, owner_id, activity_date, created_by)
       VALUES ('opportunity',$1,$2,'note',$3,$4,$5,NOW(),$5)`,
      [oppId, contactId, "Neo AI — selected products & services", bundleText, ownerId],
    );
    await syncLineItems(oppId, b, ownerId);
    if (reused) {
      await pool.query(
        "UPDATE crm_opportunities SET notes=$1, updated_at=NOW() WHERE id=$2",
        [bundleText, oppId],
      );
    }
  } catch (e) {
    console.warn("[discovery/opportunity] annotation failed:", e.message);
  }

  let oppName = null;
  {
    const { rows: opp } = await pool.query("SELECT name FROM crm_opportunities WHERE id=$1", [oppId]);
    oppName = opp[0]?.name ?? null;
  }

  if (!reused) {
    try {
      await createNotification(
        ownerId, "opportunity_created", "New Opportunity from Neo AI",
        `${name} submitted "${oppName || computeOppName(b, name)}" via Neo AI.`,
        "opportunity", oppId,
      );
    } catch { /* non-critical */ }

    // Fire-and-forget: notify tech-support by email with the full breakdown.
    emailTechSupport(b, { name, email, company }, oppId, oppName).catch((e) =>
      console.warn("[discovery/opportunity] tech-support email failed:", e?.message || e),
    );
  }

  return {
    opportunity_id: oppId,
    opportunity_name: oppName,
    lead_id: lead.id,
    already_existed: reused,
  };
}

module.exports = { createDiscoveryOpportunity };
