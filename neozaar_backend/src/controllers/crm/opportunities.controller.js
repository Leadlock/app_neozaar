const pool = require('../../config/database');
const { auditLog } = require('./audit.helper');

/**
 * FIELD SEMANTICS
 * ─────────────────────────────────────────────────────────────
 * owner_id     — internal CRM owner (M_SELLER or resolved from lead)
 * seller_id    — SELLER actively pursuing the deal
 * affiliate_id — external affiliate attribution (AGENT/A_MANAGER users.id)
 * isv_id       — ISV user linked via opportunity products
 *
 * owner_id is NEVER overwritten when assigning a seller.
 * affiliate_id is NEVER overwritten by owner or seller assignment.
 */

const OWNERSHIP_RESTRICTED_ROLES = ['ISV_SELLER', 'SELLER', 'AGENT', 'A_MANAGER', 'ISV', 'SUPPORT_PARTNER'];

// ISV users only see opportunities containing their products
const isIsvUser = (role) => role === 'ISV';

// Build ISV visibility filter — ISV sees only opps with their products
const isvFilter = (userId) =>
  `o.id IN (SELECT opportunity_id FROM crm_opportunity_products WHERE isv_id=${userId})`;

const getOpportunities = async (req, res) => {
  try {
    const { stage, contact_id, search, follow_up_status, aging, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = ['o.is_deleted = FALSE'];
    const params = [];

    if (req.user.role_type === 'A_MANAGER') {
      conditions.push('o.affiliate_id IS NOT NULL');
    } else if (isIsvUser(req.user.role_type)) {
      conditions.push(isvFilter(req.user.id));
    } else if (OWNERSHIP_RESTRICTED_ROLES.includes(req.user.role_type)) {
      params.push(req.user.id);
      if (req.user.role_type === 'SELLER') {
        // A SELLER must always see:
        //   1. Opportunities explicitly assigned to them (seller_id)
        //   2. Opportunities they created themselves (created_by)
        // This ensures opps remain visible at any stage/score including Closed Lost (score=0)
        // and opps converted from leads where seller_id may not yet be set.
        conditions.push(`(o.seller_id = $${params.length} OR o.created_by = $${params.length})`);
      } else if (['AGENT','A_MANAGER'].includes(req.user.role_type)) {
        conditions.push(`o.affiliate_id = $${params.length}`);
      } else {
        conditions.push(`(o.owner_id = $${params.length} OR o.seller_id = $${params.length})`);
      }
    }

    if (stage && stage.trim()) { params.push(stage.trim()); conditions.push(`o.stage = $${params.length}`); }
    if (contact_id) { params.push(contact_id); conditions.push(`o.contact_id = $${params.length}`); }
    if (search) { params.push(`%${search}%`); conditions.push(`o.name ILIKE $${params.length}`); }
    if (follow_up_status) { params.push(follow_up_status); conditions.push(`o.follow_up_status = $${params.length}`); }

    // Aging filter: opportunities stuck in stage beyond threshold
    if (aging === 'true') {
      conditions.push(
        `EXISTS (
          SELECT 1 FROM crm_stage_aging_thresholds t
          WHERE t.stage = o.stage
            AND o.stage_entered_at < NOW() - (t.threshold_days || ' days')::interval
        )`
      );
    }

    const where = conditions.join(' AND ');
    params.push(limit, offset);

    const { rows } = await pool.query(
      `SELECT o.*,
              c.name AS contact_name, c.email AS contact_email, c.phone AS contact_phone,
              c.company AS contact_company,
              u.name AS owner_name,
              s.name AS seller_name,
              a.name AS affiliate_name,
              EXTRACT(DAY FROM NOW() - o.stage_entered_at)::int AS days_in_stage,
              EXTRACT(DAY FROM NOW() - o.created_at)::int AS total_age_days
       FROM crm_opportunities o
       LEFT JOIN crm_contacts c ON c.id = o.contact_id
       LEFT JOIN users u ON u.id = o.owner_id
       LEFT JOIN users s ON s.id = o.seller_id
       LEFT JOIN users a ON a.id = o.affiliate_id
       WHERE ${where} ORDER BY o.created_at DESC
       LIMIT $${params.length-1} OFFSET $${params.length}`, params
    );
    const { rows: cnt } = await pool.query(
      `SELECT COUNT(*) FROM crm_opportunities o WHERE ${where}`, params.slice(0,-2)
    );
    res.json({ status: 'success', data: rows, total: parseInt(cnt[0].count) });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

const getOpportunityById = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.*,
              c.name AS contact_name, c.company AS contact_company,
              u.name AS owner_name, s.name AS seller_name, s.email AS seller_email,
              EXTRACT(DAY FROM NOW() - o.stage_entered_at)::int AS days_in_stage,
              EXTRACT(DAY FROM NOW() - o.created_at)::int AS total_age_days
       FROM crm_opportunities o
       LEFT JOIN crm_contacts c ON c.id = o.contact_id
       LEFT JOIN users u ON u.id = o.owner_id
       LEFT JOIN users s ON s.id = o.seller_id
       WHERE o.id=$1 AND o.is_deleted=FALSE`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ status: 'fail', message: 'Opportunity not found' });

    const opp = rows[0];

    // Access control
    if (isIsvUser(req.user.role_type)) {
      const { rows: isvCheck } = await pool.query(
        'SELECT 1 FROM crm_opportunity_products WHERE opportunity_id=$1 AND isv_id=$2 LIMIT 1',
        [req.params.id, req.user.id]
      );
      if (!isvCheck.length) return res.status(403).json({ status: 'fail', message: 'Access denied' });
    } else if (OWNERSHIP_RESTRICTED_ROLES.includes(req.user.role_type)) {
      const uid = req.user.id;
      const allowed =
        (req.user.role_type === 'SELLER'                                     && opp.seller_id    === uid) ||
        (req.user.role_type === 'A_MANAGER' && opp.affiliate_id != null) || (req.user.role_type === 'AGENT' && opp.affiliate_id === uid) ||
        (['ISV_SELLER','SUPPORT_PARTNER'].includes(req.user.role_type)       && opp.owner_id     === uid);
      if (!allowed) return res.status(403).json({ status: 'fail', message: 'Access denied' });
    }

    const [history, customerScoreHistory, products, aging] = await Promise.all([
      pool.query(
        `SELECT h.*, u.name AS changed_by_name FROM crm_opportunity_stage_history h
         LEFT JOIN users u ON u.id = h.changed_by
         WHERE h.opportunity_id=$1 ORDER BY h.created_at DESC`, [req.params.id]
      ),
      opp.lead_id
        ? pool.query(
            `SELECT h.*, u.name AS changed_by_name FROM crm_lead_score_history h
             LEFT JOIN users u ON u.id = h.changed_by
             WHERE h.lead_id=$1 ORDER BY h.created_at DESC`, [opp.lead_id]
          )
        : Promise.resolve({ rows: [] }),
      pool.query(
        `SELECT op.*, p.name AS marketplace_product_name, p.product_logo,
                p.action_type AS marketplace_type, iv.name AS isv_name
         FROM crm_opportunity_products op
         LEFT JOIN products p ON p.id = op.product_id
         LEFT JOIN users iv ON iv.id = op.isv_id
         WHERE op.opportunity_id=$1`, [req.params.id]
      ),
      opp.stage_entered_at
        ? pool.query(
            `SELECT t.stage, t.threshold_days,
                    EXTRACT(DAY FROM NOW() - $2::timestamp)::int AS days_in_stage,
                    CASE WHEN EXTRACT(DAY FROM NOW() - $2::timestamp) > t.threshold_days
                         THEN true ELSE false END AS is_overdue
             FROM crm_stage_aging_thresholds t WHERE t.stage=$1 LIMIT 1`,
            [opp.stage, opp.stage_entered_at]
          )
        : Promise.resolve({ rows: [] }),
    ]);

    res.json({ status: 'success', data: {
      ...opp,
      stage_history:          history.rows,
      customer_score_history: customerScoreHistory.rows,
      score_history:          customerScoreHistory.rows,  // backward-compat
      products:               products.rows,
      aging:                  aging.rows[0] || null,
    }});
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

const createOpportunity = async (req, res) => {
  try {
    const {
      contact_id, lead_id, name, type, cloud, deal_value, neozaar_revenue,
      expected_close_date, stage = 'Discovery', budget, timeline, competition,
      private_offer_required, edp_eligible, macc_eligible, poc_required,
      next_action, next_followup, notes, owner_id, affiliate_id,
    } = req.body;

    // Derive acquisition from the CRM customer, not the current URL or owner.
    let resolvedLeadId = lead_id || null;
    let resolvedAffiliateId = affiliate_id || null;
    if (lead_id || contact_id) {
      const {rows: leads}=await pool.query(`SELECT id,affiliate_id FROM crm_leads WHERE is_deleted=FALSE
        AND (($1::int IS NOT NULL AND id=$1) OR ($1::int IS NULL AND contact_id=$2)) ORDER BY id LIMIT 1`,[lead_id || null,contact_id || null]);
      if (leads.length) { resolvedLeadId=leads[0].id; resolvedAffiliateId=leads[0].affiliate_id || resolvedAffiliateId; }
      if (req.user.role_type==='AGENT' && (!leads.length || Number(leads[0].affiliate_id)!==Number(req.user.id))) {
        return res.status(403).json({status:'fail',message:'Choose one of your referred customers'});
      }
    } else if(req.user.role_type==='AGENT') {
      return res.status(400).json({status:'fail',message:'A referred customer is required'});
    }

    const { STAGE_SCORE, computeFollowUpStatus } = require('./lifecycle.engine');
    const resolvedStage = stage || 'Discovery';
    const stageScore    = STAGE_SCORE[resolvedStage] ?? 10;
    const followUpStatus = computeFollowUpStatus(next_followup);

    // When a SELLER creates an opportunity themselves, auto-assign seller_id to them
    // so the opportunity immediately appears on their dashboard without M_SELLER having to re-assign.
    const isSeller = req.user.role_type === 'SELLER';
    const resolvedSellerId = isSeller ? req.user.id : null;

    // ── Auto-create Account if contact has no account yet ──────────────────
    // Mirrors the lead-conversion flow in lifecycle.engine so every manually
    // created opportunity also ends up with a proper account linkage.
    let resolvedAccountId = null;
    if (contact_id) {
      const { rows: contactRows } = await pool.query(
        'SELECT id, name, company, email, phone, industry, country, account_id FROM crm_contacts WHERE id=$1 AND is_deleted=FALSE',
        [contact_id]
      );
      if (contactRows.length) {
        const contact = contactRows[0];
        if (contact.account_id) {
          // Contact already linked to an account — reuse it
          resolvedAccountId = contact.account_id;
        } else {
          // Find or create an account by email (or company name as fallback)
          let existingAccId = null;
          if (contact.email && contact.email.trim()) {
            const { rows: accByEmail } = await pool.query(
              'SELECT id FROM crm_accounts WHERE LOWER(TRIM(email))=LOWER(TRIM($1)) AND is_deleted=FALSE LIMIT 1',
              [contact.email]
            );
            if (accByEmail.length) existingAccId = accByEmail[0].id;
          }
          if (!existingAccId && contact.company && contact.company.trim()) {
            const { rows: accByName } = await pool.query(
              'SELECT id FROM crm_accounts WHERE LOWER(TRIM(name))=LOWER(TRIM($1)) AND is_deleted=FALSE LIMIT 1',
              [contact.company]
            );
            if (accByName.length) existingAccId = accByName[0].id;
          }

          if (existingAccId) {
            resolvedAccountId = existingAccId;
          } else {
            const accName = contact.company || contact.name || (contact.email ? contact.email.split('@')[0] : name);
            // Pull industry/country from the contact; cloud from the opportunity being created
            const { rows: newAcc } = await pool.query(
              `INSERT INTO crm_accounts
                 (name, email, phone, type, industry, country, cloud_preference, owner_id, created_by, updated_by)
               VALUES ($1,$2,$3,'Prospect',$4,$5,$6,$7,$7,$7) RETURNING id`,
              [
                accName,
                contact.email || null,
                contact.phone || null,
                contact.industry || null,
                contact.country || null,
                cloud || null,
                owner_id || req.user.id,
              ]
            );
            resolvedAccountId = newAcc[0].id;
          }

          // Link the account back to the contact
          await pool.query(
            'UPDATE crm_contacts SET account_id=$1, updated_at=NOW() WHERE id=$2',
            [resolvedAccountId, contact_id]
          );
        }
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO crm_opportunities
         (contact_id, lead_id, name, type, cloud, deal_value, neozaar_revenue, expected_revenue,
          probability, expected_close_date, stage, score, budget, timeline, competition,
          private_offer_required, edp_eligible, macc_eligible, poc_required,
          next_action, next_followup, notes, owner_id, seller_id, affiliate_id,
          account_id,
          conversion_source, customer_score_at_conversion,
          follow_up_status, stage_entered_at,
          seller_assigned_at, seller_assigned_by,
          created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$6,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,0,$27,NOW(),$28,$29,$30,$30)
       RETURNING *`,
      [
        contact_id || null, resolvedLeadId, name, type || null, cloud || null,
        deal_value || 0, neozaar_revenue || 0, stageScore,
        expected_close_date || null, resolvedStage, stageScore,
        budget || null, timeline || null, competition || null,
        private_offer_required || false, edp_eligible || false,
        macc_eligible || false, poc_required || false,
        next_action || null, next_followup || null, notes || null,
        owner_id || req.user.id, resolvedSellerId, resolvedAffiliateId,
        resolvedAccountId,
        'manual', followUpStatus,
        resolvedSellerId ? new Date() : null,
        resolvedSellerId ? req.user.id : null,
        req.user.id,
      ]
    );

    await auditLog(req.user.id, 'CREATE_OPPORTUNITY', 'Opportunity', rows[0].id, null, rows[0], req);
    await auditLog(req.user.id, 'OPPORTUNITY_CREATED', 'Opportunity', rows[0].id, null,
      { name, stage: resolvedStage, conversion_source: 'manual' }, req);
    res.status(201).json({ status: 'success', data: rows[0] });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

const updateOpportunity = async (req, res) => {
  try {
    const { rows: ex } = await pool.query(
      'SELECT * FROM crm_opportunities WHERE id=$1 AND is_deleted=FALSE', [req.params.id]
    );
    if (!ex.length) return res.status(404).json({ status: 'fail', message: 'Opportunity not found' });

    if (OWNERSHIP_RESTRICTED_ROLES.includes(req.user.role_type) &&
        ex[0].owner_id !== req.user.id && ex[0].seller_id !== req.user.id) {
      return res.status(403).json({ status: 'fail', message: 'Access denied' });
    }

    if (ex[0].affiliate_id && ['affiliate_id','lead_id','contact_id'].some(field =>
      req.body[field] !== undefined && String(req.body[field] ?? '') !== String(ex[0][field] ?? ''))) {
      return res.status(409).json({status:'fail',message:'Customer attribution is preserved. Use affiliate management for an explicit reassignment.'});
    }
    const fields = [
      'contact_id','lead_id','name','type','cloud','deal_value','neozaar_revenue','expected_revenue',
      'expected_close_date','budget','timeline','competition',
      'private_offer_required','edp_eligible','macc_eligible','poc_required',
      'next_action','win_loss_reason','win_loss_notes',
      'next_followup','notes','owner_id','affiliate_id','final_deal_value',
    ];
    // stage, score, probability intentionally excluded — handled by changeOpportunityStage
    const updates = []; const params = [];
    fields.forEach(f => {
      if (req.body[f] !== undefined) { params.push(req.body[f]); updates.push(`${f}=$${params.length}`); }
    });

    // Recompute follow_up_status if next_followup changed
    const newActionDate = req.body.next_followup !== undefined
      ? req.body.next_followup
      : ex[0].next_followup;
    const { computeFollowUpStatus } = require('./lifecycle.engine');
    const followUpStatus = computeFollowUpStatus(newActionDate);
    params.push(followUpStatus); updates.push(`follow_up_status=$${params.length}`);

    // Always update updated_by and updated_at
    params.push(req.user.id, new Date(), req.params.id);
    updates.push(`updated_by=$${params.length-2}`, `updated_at=$${params.length-1}`);

    // If only stage is being changed (no other fields), skip the UPDATE and go straight to stage change
    let rows = [ex[0]];
    if (updates.length > 2) { // more than just follow_up_status + updated_by + updated_at
      const result = await pool.query(
        `UPDATE crm_opportunities SET ${updates.join(',')} WHERE id=$${params.length} RETURNING *`, params
      );
      rows = result.rows;
    }

    // Stage change — delegate entirely to changeOpportunityStage
    if (req.body.stage && req.body.stage !== ex[0].stage) {
      const { changeOpportunityStage } = require('./lifecycle.engine');
      const force = ['SUPER_ADMIN','ADMIN'].includes(req.user.role_type);
      await changeOpportunityStage(
        req.params.id, req.body.stage, req.user.id,
        req.body.stage_notes || null, req.body.lost_reason || null,
        req.body, force
      );
    }

    await auditLog(req.user.id, 'UPDATE_OPPORTUNITY', 'Opportunity', rows[0].id, ex[0], rows[0], req);
    res.json({ status: 'success', data: rows[0] });
  } catch (e) {
    const status = e.message.includes('not allowed') || e.message.includes('Missing required') ? 400 : 500;
    res.status(status).json({ status: 'fail', message: e.message });
  }
};

const deleteOpportunity = async (req, res) => {
  try {
    const { rows: ex } = await pool.query(
      'SELECT id, owner_id, seller_id FROM crm_opportunities WHERE id=$1 AND is_deleted=FALSE',
      [req.params.id]
    );
    if (!ex.length) return res.status(404).json({ status: 'fail', message: 'Opportunity not found' });

    // Admins can delete anything; SELLERs/AGENTs can only delete what they own or are assigned to
    if (OWNERSHIP_RESTRICTED_ROLES.includes(req.user.role_type)) {
      const uid = req.user.id;
      const opp = ex[0];
      const allowed =
        (req.user.role_type === 'SELLER' && (opp.owner_id === uid || opp.seller_id === uid)) ||
        (['AGENT','A_MANAGER'].includes(req.user.role_type) && opp.owner_id === uid);
      if (!allowed) return res.status(403).json({ status: 'fail', message: 'Access denied' });
    }

    await pool.query(
      'UPDATE crm_opportunities SET is_deleted=TRUE, updated_by=$1, updated_at=NOW() WHERE id=$2',
      [req.user.id, req.params.id]
    );
    await auditLog(req.user.id, 'DELETE_OPPORTUNITY', 'Opportunity', req.params.id, null, null, req);
    res.json({ status: 'success', message: 'Opportunity deleted' });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

/**
 * POST /api/internal/crm/opportunities/:id/assign-seller
 * M_SELLER assigns a SELLER. owner_id is NOT changed.
 */
const assignSellerToOpportunity = async (req, res) => {
  try {
    const { seller_id } = req.body;
    const oppId = req.params.id;
    if (!seller_id) return res.status(400).json({ status: 'fail', message: 'seller_id is required' });

    const { rows: oppRows } = await pool.query(
      'SELECT * FROM crm_opportunities WHERE id=$1 AND is_deleted=FALSE', [oppId]
    );
    if (!oppRows.length) return res.status(404).json({ status: 'fail', message: 'Opportunity not found' });

    const { rows: sellerRows } = await pool.query(
      "SELECT id, name, email FROM users WHERE id=$1 AND role_type='SELLER' AND is_active=true", [seller_id]
    );
    if (!sellerRows.length) {
      return res.status(400).json({ status: 'fail', message: 'Invalid seller_id. User must be an active SELLER.' });
    }

    const opp = oppRows[0];

    // ── Backfill account_id / contact_id if missing or stale ────────────────
    // Resolve missing/soft-deleted foreign keys so the SELLER immediately sees
    // the Account and Contact in their dashboard.
    // A soft-deleted record has is_deleted=TRUE — treat it the same as missing.
    let backfillAccountId = opp.account_id;
    let backfillContactId = opp.contact_id;

    // Verify existing IDs are not pointing at soft-deleted records
    if (backfillContactId) {
      const { rows: cCheck } = await pool.query(
        'SELECT id FROM crm_contacts WHERE id=$1 AND is_deleted=FALSE LIMIT 1',
        [backfillContactId]
      );
      if (!cCheck.length) backfillContactId = null; // stale reference
    }
    if (backfillAccountId) {
      const { rows: aCheck } = await pool.query(
        'SELECT id FROM crm_accounts WHERE id=$1 AND is_deleted=FALSE LIMIT 1',
        [backfillAccountId]
      );
      if (!aCheck.length) backfillAccountId = null; // stale reference
    }

    // Step A: if contact_id is missing/stale but lead_id exists, pull from the lead row
    // Also verify the lead's references are active (not soft-deleted).
    if (!backfillContactId && opp.lead_id) {
      const { rows: leadRows } = await pool.query(
        'SELECT id, name, company, email, phone, industry, country, account_id, contact_id FROM crm_leads WHERE id=$1 AND is_deleted=FALSE',
        [opp.lead_id]
      );
      if (leadRows.length) {
        const lead = leadRows[0];
        if (lead.contact_id) {
          const { rows: cV } = await pool.query(
            'SELECT id FROM crm_contacts WHERE id=$1 AND is_deleted=FALSE LIMIT 1', [lead.contact_id]
          );
          if (cV.length) backfillContactId = lead.contact_id;
        }
        if (lead.account_id && !backfillAccountId) {
          const { rows: aV } = await pool.query(
            'SELECT id FROM crm_accounts WHERE id=$1 AND is_deleted=FALSE LIMIT 1', [lead.account_id]
          );
          if (aV.length) backfillAccountId = lead.account_id;
        }
        // If lead's refs are stale, find or create active records by the lead's email
        if (!backfillAccountId && lead.email) {
          const { rows: aByEmail } = await pool.query(
            'SELECT id FROM crm_accounts WHERE LOWER(TRIM(email))=LOWER(TRIM($1)) AND is_deleted=FALSE LIMIT 1',
            [lead.email]
          );
          if (aByEmail.length) {
            backfillAccountId = aByEmail[0].id;
          } else {
            const accName = lead.company || lead.name || lead.email.split('@')[0];
            const { rows: newAcc } = await pool.query(
              `INSERT INTO crm_accounts (name,email,phone,industry,type,owner_id,created_by,updated_by)
               VALUES ($1,$2,$3,$4,'Prospect',$5,$5,$5) RETURNING id`,
              [accName, lead.email, lead.phone || null, lead.industry || null, opp.owner_id || req.user.id]
            );
            backfillAccountId = newAcc[0].id;
          }
        }
        if (!backfillContactId && lead.email) {
          const { rows: cByEmail } = await pool.query(
            'SELECT id FROM crm_contacts WHERE LOWER(TRIM(email))=LOWER(TRIM($1)) AND is_deleted=FALSE LIMIT 1',
            [lead.email]
          );
          if (cByEmail.length) {
            backfillContactId = cByEmail[0].id;
          } else if (backfillAccountId) {
            const { rows: newCon } = await pool.query(
              `INSERT INTO crm_contacts (account_id,name,company,email,phone,type,owner_id,created_by,updated_by)
               VALUES ($1,$2,$3,$4,$5,'prospect',$6,$6,$6) RETURNING id`,
              [backfillAccountId, lead.name, lead.company || null, lead.email,
               lead.phone || null, opp.owner_id || req.user.id]
            );
            backfillContactId = newCon[0].id;
          }
        }
      }
    }

    // Step B: if account_id is still missing but contact_id is set, find or create account from contact
    if (!backfillAccountId && backfillContactId) {
      const { rows: contactRows } = await pool.query(
        'SELECT id, name, company, email, phone, industry, country, account_id FROM crm_contacts WHERE id=$1 AND is_deleted=FALSE',
        [backfillContactId]
      );
      if (contactRows.length) {
        const contact = contactRows[0];
        if (contact.account_id) {
          backfillAccountId = contact.account_id;
        } else {
          let existingAccId = null;
          if (contact.email && contact.email.trim()) {
            const { rows: accByEmail } = await pool.query(
              'SELECT id FROM crm_accounts WHERE LOWER(TRIM(email))=LOWER(TRIM($1)) AND is_deleted=FALSE LIMIT 1',
              [contact.email]
            );
            if (accByEmail.length) existingAccId = accByEmail[0].id;
          }
          if (!existingAccId && contact.company && contact.company.trim()) {
            const { rows: accByName } = await pool.query(
              'SELECT id FROM crm_accounts WHERE LOWER(TRIM(name))=LOWER(TRIM($1)) AND is_deleted=FALSE LIMIT 1',
              [contact.company]
            );
            if (accByName.length) existingAccId = accByName[0].id;
          }
          if (existingAccId) {
            backfillAccountId = existingAccId;
          } else {
            const accName = contact.company || contact.name || (contact.email ? contact.email.split('@')[0] : opp.name);
            const { rows: newAcc } = await pool.query(
              `INSERT INTO crm_accounts (name, email, phone, type, industry, country, owner_id, created_by, updated_by)
               VALUES ($1,$2,$3,'Prospect',$4,$5,$6,$6,$6) RETURNING id`,
              [accName, contact.email || null, contact.phone || null, contact.industry || null, contact.country || null, opp.owner_id || req.user.id]
            );
            backfillAccountId = newAcc[0].id;
          }
          await pool.query('UPDATE crm_contacts SET account_id=$1, updated_at=NOW() WHERE id=$2', [backfillAccountId, backfillContactId]);
        }
      }
    }

    // Step C: persist any newly resolved IDs onto the opportunity using parameterized query
    const setFields = ['seller_id=$1', 'seller_assigned_at=NOW()', 'seller_assigned_by=$2', 'updated_at=NOW()', 'updated_by=$2'];
    const updateParams = [seller_id, req.user.id];

    if (backfillContactId && backfillContactId !== opp.contact_id) {
      updateParams.push(backfillContactId);
      setFields.push(`contact_id=$${updateParams.length}`);
    }
    if (backfillAccountId && backfillAccountId !== opp.account_id) {
      updateParams.push(backfillAccountId);
      setFields.push(`account_id=$${updateParams.length}`);
    }
    updateParams.push(oppId);

    await pool.query(
      `UPDATE crm_opportunities SET ${setFields.join(', ')} WHERE id=$${updateParams.length}`,
      updateParams
    );

    const { createActivity, createNotification } = require('./lifecycle.engine');
    await createActivity('opportunity', oppId, opp.contact_id, 'note',
      `Seller "${sellerRows[0].name}" assigned`, null, req.user.id);
    await createNotification(seller_id, 'seller_assigned', 'New Opportunity Assigned',
      `You have been assigned to opportunity "${opp.name}".`, 'opportunity', oppId);

    await auditLog(req.user.id, 'ASSIGN_SELLER', 'Opportunity', oppId,
      { seller_id: opp.seller_id }, { seller_id }, req);
    await auditLog(req.user.id, 'SELLER_ASSIGNED', 'Opportunity', oppId,
      { seller_id: opp.seller_id }, { seller_id, seller_name: sellerRows[0].name }, req);

    res.json({ status: 'success',
      message: `Seller "${sellerRows[0].name}" assigned`,
      data: { opportunity_id: oppId, seller_id, seller_name: sellerRows[0].name },
    });
  } catch (e) {
    console.error('assignSellerToOpportunity error:', e);
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

const getAvailableSellers = async (req, res) => {
  try {
    if (req.user.role_type !== 'M_SELLER') {
      return res.status(403).json({ status: 'fail', message: 'Only Master Sellers can view available sellers' });
    }
    const { rows } = await pool.query(
      "SELECT id, name, email FROM users WHERE role_type='SELLER' AND is_active=true ORDER BY name"
    );
    res.json({ status: 'success', data: rows });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

/**
 * GET /api/internal/crm/opportunities/:id/share-sellers
 * Sellers a SELLER can hand this opportunity to — all active SELLERs except
 * the caller themselves. Also usable by M_SELLER.
 */
const getShareableSellers = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, email FROM users WHERE role_type='SELLER' AND is_active=true AND id <> $1 ORDER BY name",
      [req.user.id]
    );
    res.json({ status: 'success', data: rows });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

/**
 * Compute a SELLER's task state on an opportunity → 'done' | 'in_progress' | 'not_started'
 * done         → has tasks and all are Completed/Cancelled
 * in_progress  → has at least one open (Open/InProgress/Overdue) task
 * not_started  → no tasks recorded for this seller on this opp
 */
const computeSellerTaskStatus = async (opportunityId, sellerId) => {
  const { rows } = await pool.query(
    `SELECT status, COUNT(*)::int AS cnt
       FROM crm_tasks
      WHERE entity_type='opportunity' AND entity_id=$1 AND owner_id=$2 AND is_deleted=FALSE
      GROUP BY status`,
    [opportunityId, sellerId]
  );
  let open = 0, done = 0;
  for (const r of rows) {
    if (['Completed', 'Cancelled'].includes(r.status)) done += r.cnt;
    else open += r.cnt; // Open, InProgress, Overdue, or anything else
  }
  const total = open + done;
  let status = 'not_started';
  if (total > 0) status = open > 0 ? 'in_progress' : 'done';
  return { status, open, done };
};

/**
 * POST /api/internal/crm/opportunities/:id/share-seller
 * A SELLER hands an opportunity they own to ANOTHER seller (regardless of
 * whether their own tasks are done, in progress or not started). M_SELLER may
 * also use this. Records the hand-off in crm_opportunity_seller_history and
 * moves seller_id to the new seller so it appears on their dashboard.
 * Body: { seller_id, note? }
 */
const shareOpportunityToSeller = async (req, res) => {
  try {
    const { seller_id, note } = req.body;
    const oppId = req.params.id;
    if (!seller_id) return res.status(400).json({ status: 'fail', message: 'seller_id is required' });

    const { rows: oppRows } = await pool.query(
      'SELECT * FROM crm_opportunities WHERE id=$1 AND is_deleted=FALSE', [oppId]
    );
    if (!oppRows.length) return res.status(404).json({ status: 'fail', message: 'Opportunity not found' });
    const opp = oppRows[0];

    // ── Ownership gate ──────────────────────────────────────────────────────
    // A SELLER may only share an opportunity they currently hold
    // (seller_id === them, or they created it). M_SELLER may share any.
    if (req.user.role_type === 'SELLER') {
      const owns = opp.seller_id === req.user.id || opp.created_by === req.user.id;
      if (!owns) {
        return res.status(403).json({ status: 'fail', message: 'You can only share opportunities assigned to you.' });
      }
    } else if (req.user.role_type !== 'M_SELLER') {
      return res.status(403).json({ status: 'fail', message: 'Only sellers can share opportunities.' });
    }

    if (Number(seller_id) === Number(req.user.id)) {
      return res.status(400).json({ status: 'fail', message: 'You cannot share an opportunity with yourself.' });
    }

    const { rows: sellerRows } = await pool.query(
      "SELECT id, name, email FROM users WHERE id=$1 AND role_type='SELLER' AND is_active=true", [seller_id]
    );
    if (!sellerRows.length) {
      return res.status(400).json({ status: 'fail', message: 'Invalid seller_id. Recipient must be an active SELLER.' });
    }

    const fromSellerId = opp.seller_id || req.user.id;

    // Snapshot the sharing seller's task state for the hand-off record
    const taskState = await computeSellerTaskStatus(oppId, fromSellerId);

    // Move ownership to the new seller (owner_id and affiliate_id untouched)
    await pool.query(
      `UPDATE crm_opportunities
         SET seller_id=$1, seller_assigned_at=NOW(), seller_assigned_by=$2, updated_at=NOW(), updated_by=$2
       WHERE id=$3`,
      [seller_id, req.user.id, oppId]
    );

    // Record the hand-off history
    await pool.query(
      `INSERT INTO crm_opportunity_seller_history
         (opportunity_id, from_seller_id, to_seller_id, shared_by, task_status, open_task_count, done_task_count, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [oppId, fromSellerId, seller_id, req.user.id, taskState.status, taskState.open, taskState.done, note || null]
    );

    const statusLabel = { done: 'Done', in_progress: 'In Progress', not_started: 'Not Started' }[taskState.status] || taskState.status;

    const { createActivity, createNotification } = require('./lifecycle.engine');
    await createActivity('opportunity', oppId, opp.contact_id, 'note',
      `Opportunity shared with seller "${sellerRows[0].name}" (prior seller tasks: ${statusLabel})`,
      note || null, req.user.id);
    await createNotification(seller_id, 'seller_assigned', 'Opportunity Shared With You',
      `An opportunity "${opp.name}" was shared with you. Prior seller tasks: ${statusLabel}.`, 'opportunity', oppId);

    await auditLog(req.user.id, 'SHARE_SELLER', 'Opportunity', oppId,
      { seller_id: opp.seller_id }, { seller_id, task_status: taskState.status }, req);

    res.json({
      status: 'success',
      message: `Opportunity shared with "${sellerRows[0].name}"`,
      data: {
        opportunity_id: oppId,
        seller_id,
        seller_name: sellerRows[0].name,
        prior_task_status: taskState.status,
      },
    });
  } catch (e) {
    console.error('shareOpportunityToSeller error:', e);
    res.status(500).json({ status: 'fail', message: e.message });
  }
};

/**
 * POST /api/internal/crm/opportunities/:id/reopen
 * Reopen a Closed Lost opportunity — moves back to Discovery.
 * Preserves all history. Records reopen event in stage history.
 */
const reopenOpportunity = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM crm_opportunities WHERE id=$1 AND is_deleted=FALSE AND stage='Closed Lost'",
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(400).json({ status: 'fail', message: 'Only Closed Lost opportunities can be reopened' });
    }
    const opp = rows[0];

    const { STAGE_SCORE, createActivity, createNotification } = require('./lifecycle.engine');
    const newScore = STAGE_SCORE['Discovery'];

    await pool.query(
      `UPDATE crm_opportunities
       SET stage='Discovery', score=$1, probability=$1,
           is_reopened=TRUE, reopened_at=NOW(), reopened_by=$2,
           win_loss_reason=NULL, win_loss_notes=NULL, closed_at=NULL,
           stage_entered_at=NOW(), follow_up_status='No Follow-up Scheduled',
           updated_at=NOW(), updated_by=$2
       WHERE id=$3`,
      [newScore, req.user.id, req.params.id]
    );

    await pool.query(
      `INSERT INTO crm_opportunity_stage_history
         (opportunity_id, old_stage, new_stage, old_score, new_score, changed_by, notes)
       VALUES ($1,'Closed Lost','Discovery',$2,$3,$4,'Opportunity reopened')`,
      [req.params.id, opp.score, newScore, req.user.id]
    );

    await createActivity('opportunity', req.params.id, opp.contact_id, 'note',
      'Opportunity reopened — moved back to Discovery', req.body.notes || null, req.user.id);
    await auditLog(req.user.id, 'OPPORTUNITY_REOPENED', 'Opportunity', req.params.id,
      { stage: 'Closed Lost' }, { stage: 'Discovery' }, req);

    res.json({ status: 'success', message: 'Opportunity reopened' });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

/**
 * GET /api/internal/crm/opportunities/follow-up
 * Returns opportunities grouped by follow-up status for the dashboard.
 */
const getFollowUpOpportunities = async (req, res) => {
  try {
    const isRestricted = OWNERSHIP_RESTRICTED_ROLES.includes(req.user.role_type);
    const isIsv = isIsvUser(req.user.role_type);
    const closedStages = "'Closed Won','Closed Lost'";
    let filter = `o.is_deleted=FALSE AND o.stage NOT IN (${closedStages})`;
    if (isIsv) filter += ` AND ${isvFilter(req.user.id)}`;
    else if (isRestricted) filter += ` AND (o.owner_id=${req.user.id} OR o.seller_id=${req.user.id})`;

    const { rows } = await pool.query(
      `SELECT o.id, o.name, o.stage, o.next_followup, o.follow_up_status,
              o.next_action, c.name AS contact_name,
              EXTRACT(DAY FROM NOW() - o.stage_entered_at)::int AS days_in_stage
       FROM crm_opportunities o
       LEFT JOIN crm_contacts c ON c.id = o.contact_id
       WHERE ${filter}
       ORDER BY
         CASE o.follow_up_status
           WHEN 'Overdue Follow-up'         THEN 1
           WHEN 'Follow-up Today'           THEN 2
           WHEN 'Upcoming Follow-up'        THEN 3
           WHEN 'No Follow-up Scheduled'    THEN 4
         END,
         o.next_followup ASC NULLS LAST`
    );
    res.json({ status: 'success', data: rows });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

/**
 * GET /api/internal/crm/opportunities/aging
 * Returns opportunities that have exceeded their stage aging threshold.
 */
const getAgingOpportunities = async (req, res) => {
  try {
    const isRestricted = OWNERSHIP_RESTRICTED_ROLES.includes(req.user.role_type);
    const isIsv = isIsvUser(req.user.role_type);
    let filter = "o.is_deleted=FALSE AND o.stage NOT IN ('Closed Won','Closed Lost')";
    if (isIsv) filter += ` AND ${isvFilter(req.user.id)}`;
    else if (isRestricted) filter += ` AND (o.owner_id=${req.user.id} OR o.seller_id=${req.user.id})`;

    const { rows } = await pool.query(
      `SELECT o.id, o.name, o.stage, o.stage_entered_at,
              t.threshold_days,
              EXTRACT(DAY FROM NOW() - o.stage_entered_at)::int AS days_in_stage,
              c.name AS contact_name, u.name AS owner_name
       FROM crm_opportunities o
       JOIN crm_stage_aging_thresholds t ON t.stage = o.stage
       LEFT JOIN crm_contacts c ON c.id = o.contact_id
       LEFT JOIN users u ON u.id = o.owner_id
       WHERE ${filter}
         AND o.stage_entered_at < NOW() - (t.threshold_days || ' days')::interval
       ORDER BY days_in_stage DESC`
    );
    res.json({ status: 'success', data: rows });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

/**
 * GET /api/internal/crm/opportunities/valid-transitions/:stage
 * Returns allowed next stages for a given current stage.
 */
const getValidTransitions = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT to_stage FROM crm_stage_transitions WHERE from_stage=$1 ORDER BY to_stage',
      [req.params.stage]
    );
    res.json({ status: 'success', data: rows.map(r => r.to_stage) });
  } catch (e) { res.status(500).json({ status: 'fail', message: e.message }); }
};

/**
 * PATCH /api/internal/crm/opportunities/:id/stage
 * Change opportunity stage — allowed for SUPER_ADMIN, ADMIN, and M_SELLER.
 * M_SELLER is subject to normal transition validation (force=false).
 * Body: { stage, stage_notes?, lost_reason? }
 */
const changeStage = async (req, res) => {
  try {
    const { stage, stage_notes, lost_reason } = req.body;
    if (!stage) return res.status(400).json({ status: 'fail', message: 'stage is required' });

    const { rows } = await pool.query(
      'SELECT * FROM crm_opportunities WHERE id=$1 AND is_deleted=FALSE', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ status: 'fail', message: 'Opportunity not found' });

    // Ownership check for non-admin roles
    if (OWNERSHIP_RESTRICTED_ROLES.includes(req.user.role_type)) {
      const uid = req.user.id;
      const opp = rows[0];
      const allowed =
        (req.user.role_type === 'SELLER' && (opp.owner_id === uid || opp.seller_id === uid)) ||
        (['AGENT','A_MANAGER'].includes(req.user.role_type) && opp.affiliate_id === uid) ||
        (['ISV_SELLER','SUPPORT_PARTNER'].includes(req.user.role_type) && opp.owner_id === uid);
      if (!allowed) return res.status(403).json({ status: 'fail', message: 'Access denied' });
    }

    const { changeOpportunityStage } = require('./lifecycle.engine');
    // Admins bypass transition-table checks; all others must follow valid transitions
    const force = ['SUPER_ADMIN', 'ADMIN'].includes(req.user.role_type);
    await changeOpportunityStage(
      req.params.id, stage, req.user.id,
      stage_notes || null, lost_reason || null,
      req.body, force
    );

    await auditLog(req.user.id, 'STAGE_CHANGED', 'Opportunity', req.params.id,
      { stage: rows[0].stage }, { stage }, req);

    res.json({ status: 'success', message: `Stage changed to ${stage}` });
  } catch (e) {
    const status = e.message.includes('not allowed') || e.message.includes('Missing required') ? 400 : 500;
    res.status(status).json({ status: 'fail', message: e.message });
  }
};

module.exports = {
  getOpportunities, getOpportunityById, createOpportunity, updateOpportunity,
  deleteOpportunity, assignSellerToOpportunity, getAvailableSellers,
  getShareableSellers, shareOpportunityToSeller,
  reopenOpportunity, getFollowUpOpportunities, getAgingOpportunities,
  getValidTransitions, changeStage,
};
