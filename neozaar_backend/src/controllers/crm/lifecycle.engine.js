/**
 * CRM Lifecycle Engine
 * ─────────────────────────────────────────────────────────────
 * Two completely independent scoring systems:
 *
 *  1. CUSTOMER SCORE  — measures engagement BEFORE conversion
 *     Range: 0–100
 *     Labels: Not Scored | Registered | Interested | Engaged | Opportunity Ready
 *     Threshold: 30 → auto-convert to Opportunity
 *     Table: crm_leads (score, score_label) + crm_lead_score_history
 *
 *  2. OPPORTUNITY SCORE — measures sales progression AFTER conversion
 *     Controlled exclusively by Opportunity Stage
 *     Discovery=10 … Closed Won=100
 *     Table: crm_opportunities (score, probability, stage)
 *
 * IMPORTANT: Customer Score is NEVER written into Opportunity Score.
 * ─────────────────────────────────────────────────────────────
 */
const pool = require('../../config/database');

// ─── OPPORTUNITY STAGE CONFIG ─────────────────────────────────
//
// SCORE represents current pipeline probability (0–100).
// It answers: "how likely is this deal to close right now?"
//
// Payment Received = 95 (not 100) because:
//   - Payment is confirmed but the deal is not formally closed yet.
//   - Paperwork, onboarding handoff, or final sign-off may still be pending.
//   - Keeping it at 95 forces an explicit Closed Won action, preventing
//     opportunities from silently sitting at "paid but never closed".
//
// Closed Won = 100 — the ONLY stage that triggers handleOpportunityWon().
//   Do NOT add won logic to Payment Received or any other stage.
//   handleOpportunityWon() converts the contact to type='customer'.
//   Running it twice or at the wrong stage corrupts contact state.
//
// Closed Lost = score 0, probability 0 — intentional.
//   This represents current pipeline probability, not historical peak.
//   A lost deal contributes 0 to pipeline forecasting.
//   The historical progression (e.g. was at Proposal/40 before lost) is
//   preserved in crm_opportunity_stage_history and crm_activities.
//   Reporting should use stage_history for peak-stage analysis,
//   and crm_opportunities.score for current pipeline value.
//   win_loss_reason, win_loss_notes, and closed_at are also stored.
const STAGES = [
  'Discovery','Qualification','Assessment','Demo','Trial','Scoping',
  'Technical Validation','Proposal Shared','Negotiation','Private Offer',
  'Procurement','PO Received','Delivered','Payment Pending',
  'Payment Received','Closed Won','Closed Lost',
];

const STAGE_SCORE = {
  'Discovery':10, 'Qualification':20,
  'Assessment':30, 'Demo':30, 'Trial':30, 'Scoping':30, 'Technical Validation':30,
  'Proposal Shared':40, 'Negotiation':40, 'Private Offer':40,
  'Procurement':60, 'PO Received':60,
  'Delivered':80,
  'Payment Pending':90,
  'Payment Received':95,  // payment confirmed — pending formal close, does NOT trigger won logic
  'Closed Won':100,       // ONLY stage that triggers handleOpportunityWon()
  'Closed Lost':0,        // pipeline probability = 0; history preserved in stage_history
};

// Alias kept for backward-compat imports
const STAGE_PROBABILITY = STAGE_SCORE;

const NEXT_STEPS = {
  'Discovery': ['Call customer', 'Send introduction email', 'Share product catalog'],
  'Qualification': ['Qualify budget and timeline', 'Identify decision maker', 'Schedule assessment'],
  'Assessment': ['Conduct needs analysis', 'Document requirements', 'Prepare evaluation plan'],
  'Demo': ['Prepare demo environment', 'Conduct product demo', 'Share recording'],
  'Trial': ['Set up trial access', 'Monitor usage', 'Collect feedback'],
  'Scoping': ['Define project scope', 'Estimate resources', 'Create timeline'],
  'Technical Validation': ['Run POC', 'Security review', 'Integration testing'],
  'Proposal Shared': ['Follow-up after 3 days', 'Answer questions', 'Schedule negotiation'],
  'Negotiation': ['Revise pricing', 'Add discount', 'Final proposal'],
  'Private Offer': ['Generate private offer', 'Share via marketplace', 'Confirm acceptance'],
  'Procurement': ['Submit PO request', 'Legal review', 'Contract signing'],
  'PO Received': ['Confirm PO details', 'Schedule delivery', 'Set up onboarding'],
  'Delivered': ['Confirm delivery', 'Begin onboarding', 'Schedule training'],
  'Payment Pending': ['Send invoice', 'Follow-up on payment', 'Confirm receipt'],
  'Payment Received': ['Confirm payment receipt', 'Send payment confirmation', 'Prepare for formal close'],
  'Closed Won': ['Mark deal closed', 'Request testimonial', 'Customer success handoff', 'Upsell opportunities'],
  'Closed Lost': ['Record loss reason', 'Nurture for future', 'Analyse competitor'],
};

// ─── CUSTOMER SCORING CONFIG ──────────────────────────────────
// Threshold at which a customer auto-converts to an Opportunity
const CUSTOMER_SCORE_CONVERSION_THRESHOLD = 20;

const CUSTOMER_SCORE_EVENTS = {
  'customer_registration': 1,
  'product_page_visit':    5,
  'catalog_engagement':    2,
  'brochure_download':     5,
  'use_case_download':     5,
  'cta_action':            20, // high-intent CTA click — triggers direct conversion
};

/**
 * Customer Score labels — describe engagement BEFORE conversion.
 * "Opportunity Ready" means threshold reached, NOT that opp score = 30.
 */
const CUSTOMER_SCORE_LABEL = (score) => {
  if (score >= CUSTOMER_SCORE_CONVERSION_THRESHOLD) return 'Opportunity Ready';
  if (score >= 15) return 'Engaged';
  if (score >= 10) return 'Interested';
  if (score >= 1)  return 'Registered';
  return 'Not Scored';
};

// ─── AUDIT HELPER (lazy-required to avoid circular deps) ────────
function auditLog(userId, action, entityType, entityId, oldValues, newValues) {
  try {
    pool.query(
      `INSERT INTO crm_audit_logs (user_id,action,entity_type,entity_id,old_values,new_values)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [userId, action, entityType, entityId,
       oldValues ? JSON.stringify(oldValues) : null,
       newValues ? JSON.stringify(newValues) : null]
    );
  } catch (e) {
    console.error('lifecycle auditLog error:', e.message);
  }
}

// ─── INTERNAL ROLE LIST ───────────────────────────────────────
const INTERNAL_ROLES = [
  'SUPER_ADMIN','ADMIN','M_SELLER','SELLER','AGENT','A_MANAGER','ISV_SELLER','SUPPORT_PARTNER',
];

// ─── RESOLVE EFFECTIVE OWNER ──────────────────────────────────
// Accepts an optional transaction client so owner resolution runs
// inside the same transaction when called during conversion.
async function resolveOwner(preferredId, fallbackId, db = pool) {
  for (const id of [preferredId, fallbackId]) {
    if (!id) continue;
    const { rows } = await db.query(
      'SELECT id FROM users WHERE id=$1 AND role_type=ANY($2) AND is_active=true',
      [id, INTERNAL_ROLES]
    );
    if (rows.length) return rows[0].id;
  }
  // Last resort: first active M_SELLER
  const { rows: ms } = await db.query(
    "SELECT id FROM users WHERE role_type='M_SELLER' AND is_active=true ORDER BY id LIMIT 1"
  );
  return ms.length ? ms[0].id : null;
}

// ─────────────────────────────────────────────────────────────
// CUSTOMER SCORING ENGINE
// ─────────────────────────────────────────────────────────────

/**
 * updateCustomerScore
 * Records a customer engagement event, updates crm_leads.score,
 * writes to crm_lead_score_history, and optionally triggers auto-conversion
 * when the threshold is crossed.
 *
 * Does NOT write into crm_opportunities.score — that is stage-controlled only.
 *
 * @param {number} leadId
 * @param {string} reason      - event key e.g. 'product_page_visit'
 * @param {number} points      - points to add
 * @param {number|null} userId
 * @param {boolean} autoConvert - if false, caller handles conversion (default true)
 * @returns {{ oldScore, newScore, thresholdCrossed }}
 */
async function updateCustomerScore(leadId, reason, points, userId, autoConvert = true) {
  const { rows } = await pool.query(
    'SELECT score FROM crm_leads WHERE id=$1 AND is_deleted=FALSE',
    [leadId]
  );
  if (!rows.length) return { oldScore: 0, newScore: 0, thresholdCrossed: false };

  const oldScore = rows[0].score || 0;
  const newScore = Math.max(0, Math.min(100, oldScore + points));
  const newLabel = CUSTOMER_SCORE_LABEL(newScore);
  const thresholdCrossed = newScore >= CUSTOMER_SCORE_CONVERSION_THRESHOLD &&
                           oldScore < CUSTOMER_SCORE_CONVERSION_THRESHOLD;

  // Update customer score — never touches crm_opportunities
  await pool.query(
    'UPDATE crm_leads SET score=$1, score_label=$2, updated_at=NOW() WHERE id=$3',
    [newScore, newLabel, leadId]
  );

  // Record customer score history
  await pool.query(
    `INSERT INTO crm_lead_score_history
       (lead_id, old_score, new_score, reason, points, changed_by)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [leadId, oldScore, newScore, reason, points, userId]
  );

  // Activity log
  await createActivity(
    'lead', leadId, null, 'score_change',
    `Customer Score: ${oldScore} → ${newScore} (${reason})`, null, userId
  );

  // Auto-convert only when caller has not opted out.
  // CTA callers pass autoConvert=false so they control the conversion source.
  if (autoConvert && thresholdCrossed) {
    await convertCustomerToOpportunity(leadId, userId, 'customer_score');
  }

  return { oldScore, newScore, thresholdCrossed };
}

// Backward-compat alias used by track.js and scoring.controller
const updateLeadScore = updateCustomerScore;

// ─── STAGE TRANSITION VALIDATION ────────────────────────────
/**
 * validateStageTransition
 * Checks crm_stage_transitions table for allowed moves.
 * SUPER_ADMIN/ADMIN can bypass (force=true).
 * Returns { allowed: bool, reason: string }
 */
async function validateStageTransition(fromStage, toStage, force = false) {
  if (force) return { allowed: true };
  if (fromStage === toStage) return { allowed: false, reason: 'Already in this stage' };
  const { rows } = await pool.query(
    'SELECT 1 FROM crm_stage_transitions WHERE from_stage=$1 AND to_stage=$2 LIMIT 1',
    [fromStage, toStage]
  );
  if (!rows.length) {
    return { allowed: false, reason: `Transition from "${fromStage}" to "${toStage}" is not allowed` };
  }
  return { allowed: true };
}

/**
 * validateMandatoryFields
 * Checks crm_stage_required_fields for the target stage.
 * opp = current opportunity row, body = incoming update body.
 * Returns { valid: bool, missing: string[] }
 */
async function validateMandatoryFields(toStage, opp, body = {}) {
  // Mandatory-field enforcement for stage transitions has been disabled:
  // stages can now change even when the previously-required fields
  // (e.g. deal_value, expected_close_date) are empty. This does not affect
  // stage-transition adjacency rules or any user permissions.
  return { valid: true, missing: [] };
}

// ─── FOLLOW-UP STATUS COMPUTATION ────────────────────────────
function computeFollowUpStatus(nextActionDate) {
  if (!nextActionDate) return 'No Follow-up Scheduled';
  const now  = new Date();
  const date = new Date(nextActionDate);
  const diffDays = (date - now) / (1000 * 60 * 60 * 24);
  if (diffDays < 0)   return 'Overdue Follow-up';
  if (diffDays < 1)   return 'Follow-up Today';
  return 'Upcoming Follow-up';
}

// ─── CONVERSION SOURCE PRECEDENCE ───────────────────────────
// CTA sources always outrank score-based conversion for attribution.
// If a customer was auto-converted by the score engine and then a CTA
// arrives, the CTA source wins because it was the actual human intent.
//
// Precedence (highest → lowest):
//   affiliate_cta > direct_cta > manual > customer_score
const SOURCE_PRECEDENCE = {
  'affiliate_cta':  4,
  'direct_cta':     3,
  'manual':         2,
  'customer_score': 1,
};


/**
 * convertCustomerToOpportunity
 *
 * Single entry point for ALL four conversion triggers:
 *   'customer_score'  — Customer Score reached threshold (30)
 *   'direct_cta'      — Visitor clicked CTA button directly
 *   'affiliate_cta'   — Affiliate-attributed CTA click
 *   'manual'          — CRM user created opportunity manually
 *
 * Idempotent: guarded by converted_to_opportunity_id IS NULL.
 * Transaction-safe: uses BEGIN/COMMIT/ROLLBACK.
 * Opportunity always starts at Discovery / score=10 / probability=10%.
 * Customer Score is preserved as historical data — NOT copied to Opportunity.
 *
 * @param {number} leadId
 * @param {number|null} userId
 * @param {'customer_score'|'direct_cta'|'affiliate_cta'|'manual'} conversionSource
 */
async function convertCustomerToOpportunity(leadId, userId, conversionSource = 'customer_score') {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the lead row — FOR UPDATE (not SKIP LOCKED) so concurrent requests
    // wait for the lock, then re-check the conversion guard below.
    const { rows } = await client.query(
      `SELECT * FROM crm_leads
       WHERE id=$1 AND is_deleted=FALSE
       FOR UPDATE`,
      [leadId]
    );

    if (!rows.length) {
      await client.query('ROLLBACK');
      return;
    }

    const lead = rows[0];

    // Conversion guard — checked while holding the row lock.
    // If already converted, check whether the incoming source has higher
    // precedence than what was stored (e.g. CTA arriving after score auto-convert).
    // If so, update the conversion_source on the existing opportunity.
    if (lead.converted_to_opportunity_id !== null) {
      const existingPrecedence = SOURCE_PRECEDENCE[lead.conversion_source] ?? 0;
      const incomingPrecedence = SOURCE_PRECEDENCE[conversionSource]       ?? 0;

      if (incomingPrecedence > existingPrecedence) {
        await client.query(
          `UPDATE crm_opportunities
           SET conversion_source=$1, updated_at=NOW()
           WHERE id=$2`,
          [conversionSource, lead.converted_to_opportunity_id]
        );
        // Also update the lead so the stored source stays consistent
        await client.query(
          'UPDATE crm_leads SET conversion_source=$1, updated_at=NOW() WHERE id=$2',
          [conversionSource, leadId]
        );
      }

      await client.query('ROLLBACK');
      return;
    }

    // Step 1 — Resolve effective owner (uses same client, inside transaction)
    const effectiveOwner = await resolveOwner(lead.owner_id, userId, client);
    const customerScoreAtConversion = lead.score || 0;

    // If the effective owner is a SELLER, set seller_id so the converted opportunity
    // is immediately visible on their dashboard (getOpportunities filters by seller_id OR created_by).
    let resolvedSellerId = null;
    if (effectiveOwner) {
      const { rows: ownerRows } = await client.query(
        "SELECT role_type FROM users WHERE id=$1 LIMIT 1", [effectiveOwner]
      );
      if (ownerRows.length && ownerRows[0].role_type === 'SELLER') {
        resolvedSellerId = effectiveOwner;
      }
    }

    // Step 2 — Find or create Account (deduplicated by email)
    let accountId = lead.account_id || null;
    if (!accountId) {
      const { rows: existingAcc } = await client.query(
        'SELECT id FROM crm_accounts WHERE LOWER(TRIM(email))=$1 AND is_deleted=FALSE LIMIT 1',
        [lead.email.trim().toLowerCase()]
      );
      if (existingAcc.length) {
        accountId = existingAcc[0].id;
      } else {
        const accountName = lead.company || lead.name || lead.email.split('@')[0];
        const { rows: newAcc } = await client.query(
          `INSERT INTO crm_accounts
             (name, email, phone, industry, type, owner_id, created_by, updated_by)
           VALUES ($1,$2,$3,$4,'Prospect',$5,$5,$5) RETURNING id`,
          [accountName, lead.email, lead.phone || null, lead.industry || null, effectiveOwner]
        );
        accountId = newAcc[0].id;
      }
      await client.query(
        'UPDATE crm_leads SET account_id=$1, converted_to_account_id=$1 WHERE id=$2',
        [accountId, leadId]
      );
    }

    // Step 3 — Find or create Contact (deduplicated by email)
    let contactId = lead.contact_id || null;
    if (!contactId) {
      const { rows: existingCon } = await client.query(
        'SELECT id FROM crm_contacts WHERE LOWER(TRIM(email))=$1 AND is_deleted=FALSE LIMIT 1',
        [lead.email.trim().toLowerCase()]
      );
      if (existingCon.length) {
        contactId = existingCon[0].id;
      } else {
        const { rows: newCon } = await client.query(
          `INSERT INTO crm_contacts
             (account_id, name, company, email, phone, whatsapp, designation,
              country, industry, type, owner_id, created_by, updated_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'prospect',$10,$10,$10) RETURNING id`,
          [accountId, lead.name, lead.company || null, lead.email, lead.phone || null,
           lead.whatsapp || null, lead.designation || null, lead.country || null,
           lead.industry || null, effectiveOwner]
        );
        contactId = newCon[0].id;
      }
      await client.query(
        'UPDATE crm_leads SET contact_id=$1, converted_to_contact_id=$1 WHERE id=$2',
        [contactId, leadId]
      );
    }

    // Step 4 — Create Opportunity
    // Always starts at Discovery / score=10 / probability=10%.
    // Customer Score stored as customer_score_at_conversion for reporting — NOT as opp score.
    const oppName = lead.product_interest
      ? `Opp - ${lead.product_interest} (${lead.company || lead.name})`
      : `Opp - ${lead.company || lead.name}`;
    const sourceNote = lead.lead_source ? `Source: ${lead.lead_source}. ` : '';

    const { rows: opp } = await client.query(
      `INSERT INTO crm_opportunities
         (account_id, contact_id, lead_id, name,
          stage, score, probability, deal_value, expected_revenue,
          type, cloud, owner_id, seller_id, affiliate_id,
          expected_close_date, notes,
          conversion_source, customer_score_at_conversion,
          created_by, updated_by)
       VALUES ($1,$2,$3,$4,
               'Discovery',10,10,0,0,
               $5,$6,$7,$8,$9,
               $10,$11,
               $12,$13,
               $7,$7)
       RETURNING id`,
      [
        accountId, contactId, leadId, oppName,
        lead.product_interest || null, lead.cloud_preference || null,
        effectiveOwner, resolvedSellerId, lead.affiliate_id || null,
        lead.expected_close_date || null,
        `${sourceNote}${lead.notes || ''}`.trim() || null,
        conversionSource, customerScoreAtConversion,
      ]
    );

    const oppId = opp[0].id;

    // Step 5 — Mark lead converted (store conversion_source for precedence checks)
    await client.query(
      `UPDATE crm_leads SET
         converted_to_opportunity_id=$1,
         converted_to_account_id=$2,
         converted_to_contact_id=$3,
         converted_at=NOW(),
         lead_stage='Converted to Opportunity',
         conversion_source=$4,
         owner_id=COALESCE(owner_id,$5),
         updated_at=NOW()
       WHERE id=$6`,
      [oppId, accountId, contactId, conversionSource, effectiveOwner, leadId]
    );

    // Audit — customer converted (inside transaction so it rolls back on failure)
    await client.query(
      `INSERT INTO crm_audit_logs (user_id,action,entity_type,entity_id,new_values)
       VALUES ($1,'CUSTOMER_CONVERTED','Lead',$2,$3)`,
      [userId, leadId, JSON.stringify({
        opportunity_id: oppId, account_id: accountId, contact_id: contactId,
        conversion_source: conversionSource, customer_score_at_conversion: customerScoreAtConversion,
      })]
    );

    // Audit — opportunity created
    await client.query(
      `INSERT INTO crm_audit_logs (user_id,action,entity_type,entity_id,new_values)
       VALUES ($1,'OPPORTUNITY_CREATED','Opportunity',$2,$3)`,
      [userId, oppId, JSON.stringify({
        name: oppName, stage: 'Discovery', conversion_source: conversionSource,
      })]
    );

    // Step 6 — Conversion activity (inside transaction — if this fails, everything rolls back)
    await client.query(
      `INSERT INTO crm_activities
         (entity_type, entity_id, contact_id, type, subject, description, owner_id, created_by)
       VALUES ('lead',$1,$2,'stage_change',$3,NULL,$4,$4)`,
      [
        leadId, contactId,
        `Lead qualified → Contact, Account & Opportunity created. Source: ${conversionSource}, customer score: ${customerScoreAtConversion}`,
        effectiveOwner,
      ]
    );

    await client.query('COMMIT');

    // Post-commit: notifications use pool directly — outside the transaction.
    // These must never run before COMMIT to avoid notifying on a rolled-back conversion.
    try {
      const { rows: mSellers } = await pool.query(
        "SELECT id FROM users WHERE role_type='M_SELLER' AND is_active=true"
      );
      for (const ms of mSellers) {
        await createNotification(
          ms.id, 'opportunity_created', 'New Opportunity Created',
          `${lead.name} converted to opportunity via ${conversionSource} (customer score: ${customerScoreAtConversion})`,
          'opportunity', oppId
        );
      }
    } catch (notifErr) {
      console.error('convertCustomerToOpportunity notification error:', notifErr.message);
    }

  } catch (e) {
    await client.query('ROLLBACK');
    console.error('convertCustomerToOpportunity error:', e.message);
    throw e;
  } finally {
    client.release();
  }
}

// Backward-compat alias
const autoConvertToOpportunity = convertCustomerToOpportunity;

// ─────────────────────────────────────────────────────────────
// PER-PRODUCT CTA OPPORTUNITY
// ─────────────────────────────────────────────────────────────
/**
 * createProductOpportunity
 *
 * Creates ONE opportunity per product CTA (Demo, Private Offer, etc.)
 * from an authenticated marketplace action (POST /lead/create).
 *
 * Key differences from convertCustomerToOpportunity:
 *  - No lead-level guard — multiple opportunities per customer are allowed,
 *    one per distinct product + intent combination.
 *  - Deduplication guard: if an active (non-closed) opportunity already exists
 *    for this customer × product × lead_source, skip silently.
 *  - Account and Contact are shared per customer (1 per email), found-or-created.
 *  - lead_id is stored on the opportunity for traceability.
 *  - The customer's crm_lead row is NOT marked as "converted" — it stays open
 *    for further scoring and can generate more opportunities.
 *
 * @param {object} params
 * @param {number}      params.leadId        - crm_leads.id for this customer
 * @param {number|null} params.ownerId       - M_SELLER or affiliate user id
 * @param {number|null} params.affiliateId   - affiliate user id if UTM-attributed
 * @param {string}      params.productName   - product/solution/service name
 * @param {number|null} params.productId     - product table id (for notes)
 * @param {string}      params.leadSource    - 'Demo Request' | 'Private Offer Button' | etc.
 * @param {string}      params.conversionSource - 'direct_cta' | 'affiliate_cta'
 * @param {object}      params.lead          - full crm_lead row
 */
async function createProductOpportunity({
  leadId, ownerId, affiliateId,
  productName, productId, leadSource,
  conversionSource, lead,
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Dedup guard: skip if a non-closed opp already exists for this
    //    customer × product × lead_source combination ─────────────────
    const { rows: existing } = await client.query(
      `SELECT id FROM crm_opportunities
       WHERE lead_id=$1
         AND type=$2
         AND notes ILIKE $3
         AND stage NOT IN ('Closed Won','Closed Lost')
         AND is_deleted=FALSE
       LIMIT 1`,
      [leadId, productName, `%${leadSource}%`]
    );
    if (existing.length) {
      await client.query('ROLLBACK');
      return existing[0].id;
    }

    // ── Step 1: Find or create Account (1 per customer email) ────────
    // Verify lead.account_id is not a soft-deleted record before trusting it.
    let accountId = null;
    if (lead.account_id) {
      const { rows: activeAcc } = await client.query(
        'SELECT id FROM crm_accounts WHERE id=$1 AND is_deleted=FALSE LIMIT 1',
        [lead.account_id]
      );
      if (activeAcc.length) accountId = activeAcc[0].id;
    }
    if (!accountId) {
      const { rows: existingAcc } = await client.query(
        'SELECT id FROM crm_accounts WHERE LOWER(TRIM(email))=$1 AND is_deleted=FALSE LIMIT 1',
        [lead.email.trim().toLowerCase()]
      );
      if (existingAcc.length) {
        accountId = existingAcc[0].id;
      } else {
        const accName = lead.company || lead.name || lead.email.split('@')[0];
        const { rows: newAcc } = await client.query(
          `INSERT INTO crm_accounts (name,email,phone,industry,type,owner_id,created_by,updated_by)
           VALUES ($1,$2,$3,$4,'Prospect',$5,$5,$5) RETURNING id`,
          [accName, lead.email, lead.phone || null, lead.industry || null, ownerId]
        );
        accountId = newAcc[0].id;
      }
      // Update lead to point to active account
      await client.query(
        'UPDATE crm_leads SET account_id=$1, updated_at=NOW() WHERE id=$2',
        [accountId, leadId]
      );
    }

    // ── Step 2: Find or create Contact (1 per customer email) ────────
    // Verify lead.contact_id is not a soft-deleted record before trusting it.
    let contactId = null;
    if (lead.contact_id) {
      const { rows: activeCon } = await client.query(
        'SELECT id FROM crm_contacts WHERE id=$1 AND is_deleted=FALSE LIMIT 1',
        [lead.contact_id]
      );
      if (activeCon.length) contactId = activeCon[0].id;
    }
    if (!contactId) {
      const { rows: existingCon } = await client.query(
        'SELECT id FROM crm_contacts WHERE LOWER(TRIM(email))=$1 AND is_deleted=FALSE LIMIT 1',
        [lead.email.trim().toLowerCase()]
      );
      if (existingCon.length) {
        contactId = existingCon[0].id;
      } else {
        const { rows: newCon } = await client.query(
          `INSERT INTO crm_contacts
             (account_id,name,company,email,phone,type,owner_id,created_by,updated_by)
           VALUES ($1,$2,$3,$4,$5,'prospect',$6,$6,$6) RETURNING id`,
          [accountId, lead.name, lead.company || null, lead.email,
           lead.phone || null, ownerId]
        );
        contactId = newCon[0].id;
      }
      // Update lead to point to active contact
      await client.query(
        'UPDATE crm_leads SET contact_id=$1, updated_at=NOW() WHERE id=$2',
        [contactId, leadId]
      );
    }

    // ── Step 3: Create Opportunity ────────────────────────────────────
    const oppName = `${productName} — ${lead.company || lead.name || lead.email.split('@')[0]}`;
    const notes   = `Source: ${leadSource}. Product ID: ${productId || 'N/A'}.`;

    // A private-offer-sourced lead always needs a private offer structured,
    // regardless of which option the customer picked ("Get private offer
    // from": AWS / Azure / NeoZaar). EDP (AWS) and MACC (Azure) only apply
    // when that specific hyperscaler was actually selected — a NeoZaar-only
    // request carries neither, since it isn't going through AWS Marketplace
    // CPPO or Azure MPO.
    const isPrivateOfferRequest = leadSource === 'Private Offer Request';
    const cloudEnv = (lead.cloud_environment || '').toLowerCase();
    const privateOfferRequired = isPrivateOfferRequest;
    const edpEligible = isPrivateOfferRequest && cloudEnv.includes('aws');
    const maccEligible = isPrivateOfferRequest && cloudEnv.includes('azure');

    const { rows: opp } = await client.query(
      `INSERT INTO crm_opportunities
         (account_id, contact_id, lead_id, name,
          stage, score, probability, deal_value, expected_revenue,
          type, owner_id, affiliate_id, notes,
          conversion_source, customer_score_at_conversion,
          follow_up_status, stage_entered_at,
          private_offer_required, edp_eligible, macc_eligible,
          created_by, updated_by)
       VALUES ($1,$2,$3,$4,
               'Discovery',10,10,0,0,
               $5,$6,$7,$8,
               $9,$10,
               'No Follow-up Scheduled',NOW(),
               $11,$12,$13,
               $6,$6)
       RETURNING id`,
      [
        accountId, contactId, leadId, oppName,
        productName, ownerId, lead.affiliate_id || affiliateId || null, notes,
        conversionSource, lead.score || 0,
        privateOfferRequired, edpEligible, maccEligible,
      ]
    );
    const oppId = opp[0].id;

    // ── Audit log ─────────────────────────────────────────────────────
    await client.query(
      `INSERT INTO crm_audit_logs (user_id,action,entity_type,entity_id,new_values)
       VALUES ($1,'OPPORTUNITY_CREATED','Opportunity',$2,$3)`,
      [ownerId, oppId, JSON.stringify({
        name: oppName, stage: 'Discovery',
        conversion_source: conversionSource, product: productName,
      })]
    );

    await client.query('COMMIT');

    // ── Post-commit: notify M_SELLERs ─────────────────────────────────
    try {
      const { rows: mSellers } = await pool.query(
        "SELECT id FROM users WHERE role_type='M_SELLER' AND is_active=true"
      );
      for (const ms of mSellers) {
        await createNotification(
          ms.id, 'opportunity_created', 'New Opportunity Created',
          `${lead.name} requested "${leadSource}" for ${productName}`,
          'opportunity', oppId
        );
      }
    } catch (notifErr) {
      console.error('createProductOpportunity notification error:', notifErr.message);
    }

    return oppId;
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('createProductOpportunity error:', e.message);
    throw e;
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────
// OPPORTUNITY STAGE ENGINE
// ─────────────────────────────────────────────────────────────

/**
 * changeOpportunityStage
 * Single authoritative function for all stage transitions.
 * Writes stage history ONCE. Score and probability are derived from stage.
 * Does NOT read or write Customer Score.
 */
async function changeOpportunityStage(oppId, newStage, userId, notes, lostReason, body = {}, force = false) {
  const { rows } = await pool.query(
    'SELECT * FROM crm_opportunities WHERE id=$1 AND is_deleted=FALSE',
    [oppId]
  );
  if (!rows.length) throw new Error('Opportunity not found');

  const opp = rows[0];
  const oldStage = opp.stage;
  if (oldStage === newStage) return;

  // Stage transition validation
  const transition = await validateStageTransition(oldStage, newStage, force);
  if (!transition.allowed) throw new Error(transition.reason);

  // Mandatory fields validation
  const fieldCheck = await validateMandatoryFields(newStage, opp, body);
  if (!fieldCheck.valid) {
    throw new Error(`Missing required fields for ${newStage}: ${fieldCheck.missing.join(', ')}`);
  }

  const newScore = STAGE_SCORE[newStage] ?? 0;
  const newProb  = STAGE_SCORE[newStage] ?? 0;

  // Compute follow-up status from next_followup
  const followUpStatus = computeFollowUpStatus(opp.next_followup);

  // Update opportunity — score and probability from stage only; reset stage_entered_at
  await pool.query(
    `UPDATE crm_opportunities
     SET stage=$1, score=$2, probability=$3, stage_entered_at=NOW(),
         follow_up_status=$4, updated_at=NOW(), updated_by=$5
     WHERE id=$6`,
    [newStage, newScore, newProb, followUpStatus, userId, oppId]
  );

  // Stage history — written ONCE here, not duplicated in updateOpportunity.
  // old_score/new_score captured for Closed Lost peak-stage reporting.
  await pool.query(
    `INSERT INTO crm_opportunity_stage_history
       (opportunity_id, old_stage, new_stage, old_score, new_score, changed_by, notes, win_loss_reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [oppId, oldStage, newStage, opp.score, newScore, userId, notes || null,
     newStage === 'Closed Lost' ? (lostReason || 'Not specified') : null]
  );

  // Audit — stage changed
  auditLog(userId, 'STAGE_CHANGED', 'Opportunity', oppId,
    { stage: oldStage, score: opp.score },
    { stage: newStage, score: newScore });

  // Activity — records the full transition including previous score for audit trail
  await createActivity(
    'opportunity', oppId, opp.contact_id, 'stage_change',
    `Stage: ${oldStage} (score ${opp.score}) → ${newStage} (score ${newScore})`,
    notes || null, userId
  );

  // Notify owner
  await createNotification(
    opp.owner_id, 'stage_change',
    `Opportunity moved to ${newStage}`,
    `${opp.name} is now in ${newStage}`,
    'opportunity', oppId
  );

  // Won — ONLY Closed Won triggers this. Payment Received (95) does NOT.
  // handleOpportunityWon() sets contact.type='customer'.
  // Running it at any other stage would corrupt contact state.
  if (newStage === 'Closed Won') {
    await handleOpportunityWon(oppId, opp, userId);
    auditLog(userId, 'CLOSED_WON', 'Opportunity', oppId, null, { stage: 'Closed Won' });
  }

  // Lost — store reason, notes, and timestamp.
  // score/probability are already set to 0 above (pipeline value = 0).
  // Historical peak is preserved in stage_history (old_stage = last active stage).
  if (newStage === 'Closed Lost') {
    await pool.query(
      `UPDATE crm_opportunities
       SET win_loss_reason=$1, win_loss_notes=$2, closed_at=NOW(), updated_at=NOW()
       WHERE id=$3`,
      [lostReason || 'Not specified', notes || null, oppId]
    );
    auditLog(userId, 'CLOSED_LOST', 'Opportunity', oppId,
      { stage: oldStage, score: opp.score },
      { win_loss_reason: lostReason || 'Not specified' });
  }
}

// ─────────────────────────────────────────────────────────────
// WON / LOST HANDLERS
// ─────────────────────────────────────────────────────────────

async function handleOpportunityWon(oppId, opp, userId) {
  if (opp.contact_id) {
    await pool.query(
      "UPDATE crm_contacts SET type='customer', updated_at=NOW() WHERE id=$1",
      [opp.contact_id]
    );
  }
  await createActivity(
    'opportunity', oppId, opp.contact_id, 'note',
    'Opportunity WON! Contact converted to customer.', null, userId
  );
  // Marketing: record a conversion for attribution — by decision, only an
  // actually-won opportunity counts, not every high-intent request event.
  // Lazily required and never allowed to fail the opportunity-won flow
  // itself; skipped entirely if this contact has no marketing profile.
  try {
    if (opp.contact_id) {
      const marketingContact = (await pool.query('SELECT id FROM marketing_contacts WHERE crm_contact_id=$1', [opp.contact_id])).rows[0];
      if (marketingContact) {
        const journeys = require('../../services/marketing/journey-attribution.service');
        await journeys.recordConversion({ contactId: marketingContact.id, conversionType: 'opportunity_won', value: opp.deal_value || null });
      }
    }
  } catch (marketingError) {
    console.error('Marketing conversion recording failed:', marketingError?.message || marketingError);
  }
}

// ─────────────────────────────────────────────────────────────
// QUOTE → SALES ORDER
// ─────────────────────────────────────────────────────────────

/**
 * handleQuoteAccepted
 * Transactional: BEGIN → validate → create SO → update quote → audit/activity → COMMIT
 * Rolls back everything on any failure.
 * SO number uses a cryptographically random suffix to avoid collisions.
 */
async function handleQuoteAccepted(quoteId, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Validate quote — lock row to prevent concurrent double-acceptance
    const { rows } = await client.query(
      'SELECT * FROM crm_quotes WHERE id=$1 FOR UPDATE',
      [quoteId]
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      throw new Error('Quote not found');
    }
    const quote = rows[0];
    if (quote.status === 'Accepted') {
      await client.query('ROLLBACK');
      throw new Error('Quote already accepted');
    }

    // Generate unique SO number: SO-<timestamp36><random4>
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    const orderNum = `SO-${Date.now().toString(36).toUpperCase()}${rand}`;

    // Create Sales Order
    const { rows: order } = await client.query(
      `INSERT INTO crm_sales_orders
         (quote_id, opportunity_id, contact_id, order_number, items,
          subtotal, discount, tax, total, owner_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [quoteId, quote.opportunity_id, quote.contact_id, orderNum,
       quote.items, quote.subtotal || 0, quote.discount || 0,
       quote.tax || 0, quote.total || 0, quote.owner_id, userId]
    );
    const orderId = order[0].id;

    // Mark quote accepted
    await client.query(
      `UPDATE crm_quotes SET status='Accepted', accepted_at=NOW(), updated_at=NOW() WHERE id=$1`,
      [quoteId]
    );

    // Activity (inside transaction — rolls back on failure)
    await client.query(
      `INSERT INTO crm_activities
         (entity_type,entity_id,contact_id,type,subject,owner_id,created_by)
       VALUES ('quote',$1,$2,'note',$3,$4,$4)`,
      [quoteId, quote.contact_id,
       `Quote accepted → Sales Order ${orderNum} created`, userId]
    );

    // Audit (inside transaction)
    await client.query(
      `INSERT INTO crm_audit_logs (user_id,action,entity_type,entity_id,new_values)
       VALUES ($1,'QUOTE_ACCEPTED','Quote',$2,$3)`,
      [userId, quoteId, JSON.stringify({ order_number: orderNum, sales_order_id: orderId })]
    );

    await client.query(
      `INSERT INTO crm_audit_logs (user_id,action,entity_type,entity_id,new_values)
       VALUES ($1,'SALES_ORDER_CREATED','SalesOrder',$2,$3)`,
      [userId, orderId, JSON.stringify({ order_number: orderNum, quote_id: quoteId })]
    );

    await client.query('COMMIT');

    // Post-commit notification
    try {
      await createNotification(quote.owner_id, 'quote_accepted', 'Quote Accepted!',
        `Quote for ${quote.subject} was accepted. Sales Order ${orderNum} created.`,
        'order', orderId);
    } catch (notifErr) {
      console.error('handleQuoteAccepted notification error:', notifErr.message);
    }

    return orderId;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

// db defaults to pool so callers outside a transaction need no changes.
async function createActivity(entityType, entityId, contactId, type, subject, description, userId, db = pool) {
  await db.query(
    `INSERT INTO crm_activities
       (entity_type, entity_id, contact_id, type, subject, description, owner_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$7)`,
    [entityType, entityId, contactId, type, subject, description, userId]
  );
}

// Notifications always use pool — they are post-commit side effects.
async function createNotification(userId, type, title, message, entityType, entityId) {
  if (!userId) return;
  await pool.query(
    `INSERT INTO crm_notifications
       (user_id, type, title, message, entity_type, entity_id)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [userId, type, title, message, entityType, entityId]
  );
}

module.exports = {
  // Stage config
  STAGES,
  STAGE_SCORE,
  STAGE_PROBABILITY,   // backward-compat alias
  NEXT_STEPS,
  // Customer scoring config
  CUSTOMER_SCORE_EVENTS,
  CUSTOMER_SCORE_LABEL,
  CUSTOMER_SCORE_CONVERSION_THRESHOLD,
  // Backward-compat alias (old name used in track.js / scoring.controller)
  SCORE_LABELS: CUSTOMER_SCORE_LABEL,
  SCORE_EVENTS: CUSTOMER_SCORE_EVENTS,
  // Customer scoring engine
  updateCustomerScore,
  updateLeadScore,           // backward-compat alias
  // Conversion service
  convertCustomerToOpportunity,
  autoConvertToOpportunity,  // backward-compat alias
  createProductOpportunity,  // per-product CTA opportunity (multiple per customer)
  // Opportunity stage engine
  changeOpportunityStage,
  handleOpportunityWon,
  handleQuoteAccepted,
  // Stage validation
  validateStageTransition,
  validateMandatoryFields,
  computeFollowUpStatus,
  // Helpers
  createActivity,
  createNotification,
  resolveOwner,
};
