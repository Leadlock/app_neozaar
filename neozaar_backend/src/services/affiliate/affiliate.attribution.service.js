/**
 * Affiliate Attribution Service
 * ─────────────────────────────────────────────────────────────
 * Central service for all affiliate attribution logic.
 *
 * Key principles:
 *  - Server-side only — no client-supplied affiliate_id trusted
 *  - "First wins" by default (configurable in affiliate_attribution_config)
 *  - Persistent attribution via affiliate_attributions table
 *  - Token bridge for anonymous visitor → registration
 *  - Audit every important event
 */
const crypto = require('crypto');
const pool   = require('../../config/database');

// ─── Token TTL (default 7 days, overridden by DB config) ─────────
const DEFAULT_TOKEN_TTL_DAYS = 7;

// ─── Attribution rule cache (loaded on first use) ─────────────────
let _configCache = null;
async function getConfig() {
  if (_configCache) return _configCache;
  const { rows } = await pool.query(
    'SELECT rule, token_ttl_days, allow_reassign FROM affiliate_attribution_config LIMIT 1'
  );
  _configCache = rows[0] || { rule: 'first_wins', token_ttl_days: DEFAULT_TOKEN_TTL_DAYS, allow_reassign: false };
  // Expire cache every 5 minutes
  setTimeout(() => { _configCache = null; }, 5 * 60 * 1000).unref();
  return _configCache;
}

/**
 * resolveAffiliateFromToken
 * ──────────────────────────────────────────────────────────────
 * Recover affiliate identity from a short-lived token created when
 * an anonymous visitor clicked an affiliate link.
 *
 * Returns { affiliateId, linkId, campaignId, contactId } or null.
 *
 * Tokens are consumed on first successful registration — preventing
 * replay attacks.
 */
async function resolveAffiliateFromToken(token) {
  if (!token) return null;
  try {
    const { rows } = await pool.query(
      `SELECT at.*
       FROM affiliate_tokens at
       JOIN users u ON u.id=at.affiliate_id AND u.is_active=TRUE AND u.role_type IN ('AGENT','A_MANAGER')
       LEFT JOIN affiliate_links al ON al.id=at.link_id
       WHERE at.token = $1
         AND (at.link_id IS NULL OR al.is_active=TRUE)
         AND at.consumed = FALSE
         AND at.expires_at > NOW()
       LIMIT 1`,
      [token]
    );
    if (!rows.length) return null;
    const t = rows[0];
    return {
      affiliateId : t.affiliate_id,
      linkId      : t.link_id,
      campaignId  : t.campaign_id,
      contactId   : t.contact_id,
    };
  } catch (e) {
    console.error('[affiliate] resolveAffiliateFromToken error:', e.message);
    return null;
  }
}

/**
 * consumeToken
 * ──────────────────────────────────────────────────────────────
 * Mark a token as consumed.  Call after attribution is recorded.
 */
async function consumeToken(token) {
  if (!token) return;
  try {
    await pool.query(
      `UPDATE affiliate_tokens SET consumed=TRUE, consumed_at=NOW() WHERE token=$1`,
      [token]
    );
  } catch (e) {
    console.error('[affiliate] consumeToken error:', e.message);
  }
}

/**
 * createAttributionToken
 * ──────────────────────────────────────────────────────────────
 * Create a short-lived opaque token for a link click.
 * Called when an anonymous visitor clicks an affiliate link.
 */
async function createAttributionToken({ affiliateId, linkId, campaignId = null, contactId = null }) {
  try {
    const config = await getConfig();
    const ttlDays = config.token_ttl_days || DEFAULT_TOKEN_TTL_DAYS;
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO affiliate_tokens (token, affiliate_id, link_id, campaign_id, contact_id, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [token, affiliateId, linkId || null, campaignId || null, contactId || null, expiresAt]
    );
    return token;
  } catch (e) {
    console.error('[affiliate] createAttributionToken error:', e.message);
    return null;
  }
}

/**
 * resolveAffiliateFromUtmSource
 * ──────────────────────────────────────────────────────────────
 * Given utm_source, find the affiliate user.
 * Accepts: ref_code OR user id as string.
 *
 * Only AGENT and A_MANAGER users are valid affiliates.
 */
async function resolveAffiliateFromUtmSource(utmSource) {
  if (!utmSource) return null;
  try {
    const { rows } = await pool.query(
      `SELECT id, role_type, ref_code
       FROM users
       WHERE (ref_code=$1 OR id::text=$1)
         AND role_type IN ('AGENT','A_MANAGER')
         AND is_active=TRUE
       LIMIT 1`,
      [String(utmSource).trim()]
    );
    return rows[0] || null;
  } catch (e) {
    console.error('[affiliate] resolveAffiliateFromUtmSource error:', e.message);
    return null;
  }
}

/**
 * resolveLinkFromSlug
 * ──────────────────────────────────────────────────────────────
 * Resolve an affiliate_links row from a short slug.
 */
async function resolveLinkFromSlug(slug) {
  if (!slug) return null;
  try {
    const { rows } = await pool.query(
      `SELECT al.*, u.ref_code
       FROM affiliate_links al
       JOIN users u ON u.id = al.affiliate_id
       WHERE al.slug=$1 AND al.is_active=TRUE AND u.is_active=TRUE AND u.role_type IN ('AGENT','A_MANAGER')
       LIMIT 1`,
      [slug]
    );
    return rows[0] || null;
  } catch (e) {
    console.error('[affiliate] resolveLinkFromSlug error:', e.message);
    return null;
  }
}

/**
 * recordLinkClick
 * ──────────────────────────────────────────────────────────────
 * Log a click on an affiliate link (anonymous).
 * Returns the created attribution token (to be passed to the browser).
 */
async function recordLinkClick({ linkId, affiliateId, ipHash, userAgent, referer }) {
  try {
    await pool.query(
      `INSERT INTO affiliate_link_clicks (link_id, affiliate_id, ip_hash, user_agent, referer)
       VALUES ($1, $2, $3, $4, $5)`,
      [linkId, affiliateId, ipHash || null, userAgent ? userAgent.slice(0, 500) : null, referer || null]
    );
    const token = await createAttributionToken({ affiliateId, linkId });
    return token;
  } catch (e) {
    console.error('[affiliate] recordLinkClick error:', e.message);
    return null;
  }
}

/**
 * recordAttribution
 * ──────────────────────────────────────────────────────────────
 * Create a permanent affiliate↔customer attribution record.
 *
 * Rules:
 *  - If no existing active attribution for this crm_lead_id → insert (active)
 *  - If existing active attribution for same affiliate → skip (idempotent)
 *  - If existing active attribution for different affiliate → mark conflict
 *    unless rule='last_wins' or allow_reassign=true
 *
 * @returns { action: 'created'|'existing'|'conflict', attributionId }
 */
async function recordAttribution({
  affiliateId,
  crmLeadId,
  userId = null,
  linkId = null,
  campaignId = null,
  contactId = null,
  attributionType,
  utmSource = null,
  utmMedium = null,
  utmCampaign = null,
  metadata = {},
}) {
  const config = await getConfig();

  try {
    // Check for existing active attribution on this lead
    const { rows: existing } = await pool.query(
      `SELECT id, affiliate_id, status
       FROM affiliate_attributions
       WHERE crm_lead_id=$1 AND status='active'
       ORDER BY attributed_at ASC LIMIT 1`,
      [crmLeadId]
    );

    if (existing.length) {
      const ex = existing[0];

      // Same affiliate — idempotent, just return
      if (ex.affiliate_id === affiliateId) {
        // Also update user_id if not set yet
        if (userId) {
          await pool.query(
            `UPDATE affiliate_attributions SET user_id=$1, updated_at=NOW()
             WHERE id=$2 AND user_id IS NULL`,
            [userId, ex.id]
          ).catch(() => {});
        }
        return { action: 'existing', attributionId: ex.id };
      }

      // Different affiliate already attributed
      if (config.rule === 'first_wins' && !config.allow_reassign) {
        // Mark the incoming as conflict — do NOT overwrite existing
        const { rows: conflict } = await pool.query(
          `INSERT INTO affiliate_attributions
             (affiliate_id, crm_lead_id, user_id, affiliate_link_id, campaign_id, contact_id,
              attribution_type, utm_source, utm_medium, utm_campaign, status, metadata)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'conflict',$11)
           RETURNING id`,
          [affiliateId, crmLeadId, userId, linkId, campaignId, contactId,
           attributionType, utmSource, utmMedium, utmCampaign, JSON.stringify(metadata)]
        );
        await affiliateAuditLog({
          actorId: affiliateId,
          action: 'attribution_conflict',
          affiliateId,
          entityType: 'crm_lead',
          entityId: crmLeadId,
          newValue: { incoming_affiliate: affiliateId, existing_affiliate: ex.affiliate_id },
        });
        return { action: 'conflict', attributionId: conflict[0].id };
      }

      if (config.rule === 'last_wins') {
        // Supersede existing
        await pool.query(
          `UPDATE affiliate_attributions SET status='superseded' WHERE id=$1`, [ex.id]
        );
      }
    }

    // Insert new active attribution
    const { rows: inserted } = await pool.query(
      `INSERT INTO affiliate_attributions
         (affiliate_id, crm_lead_id, user_id, affiliate_link_id, campaign_id, contact_id,
          attribution_type, utm_source, utm_medium, utm_campaign, status, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active',$11)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [affiliateId, crmLeadId, userId, linkId, campaignId, contactId,
       attributionType, utmSource, utmMedium, utmCampaign, JSON.stringify(metadata)]
    );

    // Also update crm_leads.affiliate_id (first wins via COALESCE — matches existing lifecycle.engine logic)
    await pool.query(
      `UPDATE crm_leads
       SET affiliate_id = COALESCE(affiliate_id, $1), updated_at=NOW()
       WHERE id=$2`,
      [affiliateId, crmLeadId]
    );

    await affiliateAuditLog({
      actorId: affiliateId,
      action: 'attribution_created',
      affiliateId,
      entityType: 'crm_lead',
      entityId: crmLeadId,
      newValue: { attribution_type: attributionType, utm_source: utmSource },
    });

    return { action: 'created', attributionId: inserted[0]?.id };
  } catch (e) {
    console.error('[affiliate] recordAttribution error:', e.message);
    throw e;
  }
}

/**
 * matchContactToLead
 * ──────────────────────────────────────────────────────────────
 * When a campaign contact registers, find (or create) their crm_lead.
 * Matches by email (normalised).
 * Does NOT create duplicate leads — always upserts.
 *
 * @returns { leadId, isNew }
 */
async function matchContactToLead({ email, name, phone, company, affiliateId, ownerId }) {
  const normalizedEmail = email.trim().toLowerCase();
  try {
    const { rows } = await pool.query(
      `INSERT INTO crm_leads
         (name, email, phone, company, lead_source, status, score, score_label,
          owner_id, affiliate_id, created_at, updated_at)
       VALUES ($1,$2,$3,$4,'Affiliate Campaign','New',0,'Not Scored',$5,$6,NOW(),NOW())
       ON CONFLICT (email_normalized)
         WHERE is_deleted=FALSE AND email_normalized IS NOT NULL AND email_normalized <> ''
       DO UPDATE SET
         name       = COALESCE(EXCLUDED.name, crm_leads.name),
         company    = COALESCE(EXCLUDED.company, crm_leads.company),
         affiliate_id = COALESCE(crm_leads.affiliate_id, EXCLUDED.affiliate_id),
         owner_id   = COALESCE(crm_leads.owner_id, EXCLUDED.owner_id),
         updated_at = NOW()
       RETURNING id, (xmax=0) AS is_new`,
      [name || normalizedEmail.split('@')[0], normalizedEmail, phone || null,
       company || null, ownerId || null, affiliateId]
    );
    return { leadId: rows[0].id, isNew: rows[0].is_new };
  } catch (e) {
    console.error('[affiliate] matchContactToLead error:', e.message);
    throw e;
  }
}

/**
 * affiliateAuditLog
 * ──────────────────────────────────────────────────────────────
 * Write an affiliate_audit_log entry (non-blocking).
 */
function affiliateAuditLog({ actorId, action, affiliateId, entityType, entityId, previousValue, newValue, ip }) {
  pool.query(
    `INSERT INTO affiliate_audit_log
       (actor_id, action, affiliate_id, entity_type, entity_id, previous_value, new_value, ip_address)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      actorId || null, action, affiliateId || null, entityType || null, entityId || null,
      previousValue ? JSON.stringify(previousValue) : null,
      newValue      ? JSON.stringify(newValue)      : null,
      ip || null,
    ]
  ).catch(e => console.error('[affiliate] audit log write error:', e.message));
}

/**
 * generateRefCode
 * ──────────────────────────────────────────────────────────────
 * Generate or return the ref_code for a user.
 */
async function ensureRefCode(userId) {
  // First try to return existing
  const { rows: existing } = await pool.query(
    'SELECT ref_code FROM users WHERE id=$1 LIMIT 1', [userId]
  );
  if (existing[0]?.ref_code) return existing[0].ref_code;

  // Generate and store
  const code = crypto.randomBytes(6).toString('hex'); // 12-char hex
  await pool.query(
    `UPDATE users SET ref_code=$1 WHERE id=$2 AND ref_code IS NULL`, [code, userId]
  );
  // Re-read in case of race
  const { rows } = await pool.query('SELECT ref_code FROM users WHERE id=$1', [userId]);
  return rows[0]?.ref_code;
}

/**
 * generateLinkSlug
 * ──────────────────────────────────────────────────────────────
 * Generate a unique URL slug for an affiliate link.
 */
async function generateLinkSlug() {
  for (let i = 0; i < 5; i++) {
    const slug = crypto.randomBytes(6).toString('hex');
    const { rows } = await pool.query(
      'SELECT id FROM affiliate_links WHERE slug=$1 LIMIT 1', [slug]
    );
    if (!rows.length) return slug;
  }
  // Fallback: longer slug
  return crypto.randomBytes(12).toString('hex');
}

module.exports = {
  resolveAffiliateFromToken,
  consumeToken,
  createAttributionToken,
  resolveAffiliateFromUtmSource,
  resolveLinkFromSlug,
  recordLinkClick,
  recordAttribution,
  matchContactToLead,
  affiliateAuditLog,
  ensureRefCode,
  generateLinkSlug,
  getConfig,
};
