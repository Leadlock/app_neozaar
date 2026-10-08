const pool = require('../../config/database');

// GET /api/internal/crm/trash
async function getTrash(req, res) {
  try {
    const [leads, accounts, contacts, opps, tasks] = await Promise.all([
      pool.query(`SELECT id, name, email, phone, company, status, score, updated_at
                  FROM crm_leads WHERE is_deleted=TRUE ORDER BY updated_at DESC`),
      pool.query(`SELECT id, name, email, phone, industry, type, updated_at
                  FROM crm_accounts WHERE is_deleted=TRUE ORDER BY updated_at DESC`),
      pool.query(`SELECT id, name, email, phone, designation AS title, updated_at
                  FROM crm_contacts WHERE is_deleted=TRUE ORDER BY updated_at DESC`),
      pool.query(`SELECT id, name, stage, deal_value AS value, updated_at
                  FROM crm_opportunities WHERE is_deleted=TRUE ORDER BY updated_at DESC`),
      pool.query(`SELECT id, title AS name, status, due_date, updated_at
                  FROM crm_tasks WHERE is_deleted=TRUE ORDER BY updated_at DESC`),
    ]);

    const counts = {
      leads:         leads.rowCount,
      accounts:      accounts.rowCount,
      contacts:      contacts.rowCount,
      opportunities: opps.rowCount,
      tasks:         tasks.rowCount,
    };
    counts.total = Object.values(counts).reduce((s, n) => s + n, 0);

    res.json({
      success: true,
      data: {
        leads:         leads.rows,
        accounts:      accounts.rows,
        contacts:      contacts.rows,
        opportunities: opps.rows,
        tasks:         tasks.rows,
      },
      counts,
    });
  } catch (e) {
    console.error('getTrash error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch trash' });
  }
}

// DELETE /api/internal/crm/trash/purge
// Body: { all?: true } OR { leads, accounts, contacts, opportunities, tasks } (arrays of IDs)
async function purgeTrash(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { all = false } = req.body;
    let leads        = toInts(req.body.leads);
    let accounts     = toInts(req.body.accounts);
    let contacts     = toInts(req.body.contacts);
    let opportunities = toInts(req.body.opportunities);
    let tasks        = toInts(req.body.tasks);

    if (all) {
      const [lR, aR, cR, oR, tR] = await Promise.all([
        client.query(`SELECT id FROM crm_leads        WHERE is_deleted=TRUE`),
        client.query(`SELECT id FROM crm_accounts     WHERE is_deleted=TRUE`),
        client.query(`SELECT id FROM crm_contacts     WHERE is_deleted=TRUE`),
        client.query(`SELECT id FROM crm_opportunities WHERE is_deleted=TRUE`),
        client.query(`SELECT id FROM crm_tasks        WHERE is_deleted=TRUE`),
      ]);
      leads         = lR.rows.map(r => r.id);
      accounts      = aR.rows.map(r => r.id);
      contacts      = cR.rows.map(r => r.id);
      opportunities = oR.rows.map(r => r.id);
      tasks         = tR.rows.map(r => r.id);
    }

    const deleted = { leads: 0, accounts: 0, contacts: 0, opportunities: 0, tasks: 0 };

    // 1. Opportunities (FK to leads/contacts/accounts — delete first).
    // Resolve the full set of opportunity ids being purged: explicitly-selected
    // ones (must already be soft-deleted — safety net) plus any still attached to
    // a lead being purged, regardless of the opportunity's own is_deleted flag
    // (a lead can have a live opportunity that was never separately trashed, e.g.
    // one auto-created by a CTA submission) — otherwise the lead delete fails on
    // crm_opportunities_lead_id_fkey.
    let opportunityIdsToDelete = [];
    if (opportunities.length) {
      const { rows: explicitOpps } = await client.query(
        `SELECT id FROM crm_opportunities WHERE id = ANY(${pg(opportunities)}) AND is_deleted=TRUE`
      );
      opportunityIdsToDelete.push(...explicitOpps.map(r => r.id));
    }
    if (leads.length) {
      const { rows: linked } = await client.query(
        `SELECT id FROM crm_opportunities WHERE lead_id = ANY(${pg(leads)}) AND id != ALL(${pg(opportunityIdsToDelete.length ? opportunityIdsToDelete : [0])})`
      );
      opportunityIdsToDelete.push(...linked.map(r => r.id));
    }
    if (opportunityIdsToDelete.length) {
      // Cases/invoices/quotes/sales orders can stand alone — unlink rather than
      // block the delete (same pattern as the lead/account nulling below).
      await client.query(`UPDATE crm_cases SET opportunity_id=NULL WHERE opportunity_id = ANY(${pg(opportunityIdsToDelete)})`).catch(() => {});
      await client.query(`UPDATE crm_invoices SET opportunity_id=NULL WHERE opportunity_id = ANY(${pg(opportunityIdsToDelete)})`).catch(() => {});
      await client.query(`UPDATE crm_quotes SET opportunity_id=NULL WHERE opportunity_id = ANY(${pg(opportunityIdsToDelete)})`).catch(() => {});
      await client.query(`UPDATE crm_sales_orders SET opportunity_id=NULL WHERE opportunity_id = ANY(${pg(opportunityIdsToDelete)})`).catch(() => {});

      const r = await client.query(`DELETE FROM crm_opportunities WHERE id = ANY(${pg(opportunityIdsToDelete)})`);
      deleted.opportunities += r.rowCount;
    }

    // 2. Score history for leads being purged
    if (leads.length) {
      await client.query(`DELETE FROM crm_lead_score_history WHERE lead_id = ANY(${pg(leads)})`);
    }

    // 3. Activities + tasks linked to contacts/accounts being purged (no is_deleted on activities)
    if (contacts.length || accounts.length) {
      const cond = [];
      if (contacts.length) {
        cond.push(`contact_id = ANY(${pg(contacts)})`);
        cond.push(`(entity_type='contact' AND entity_id = ANY(${pg(contacts)}))`);
      }
      if (accounts.length) {
        cond.push(`(entity_type='account' AND entity_id = ANY(${pg(accounts)}))`);
      }
      const w = cond.join(' OR ');
      await client.query(`DELETE FROM crm_activities WHERE ${w}`);
      await client.query(`DELETE FROM crm_tasks      WHERE ${w}`);
    }

    // 4. Explicitly-selected tasks (is_deleted=TRUE)
    if (tasks.length) {
      const r = await client.query(
        `DELETE FROM crm_tasks WHERE id = ANY(${pg(tasks)}) AND is_deleted=TRUE`
      );
      deleted.tasks = r.rowCount;
    }

    // 5. Null FK back-references on crm_leads before deleting contacts/accounts
    if (contacts.length) {
      await client.query(`UPDATE crm_leads SET contact_id=NULL WHERE contact_id = ANY(${pg(contacts)})`);
      await client.query(`UPDATE crm_leads SET converted_to_contact_id=NULL WHERE converted_to_contact_id = ANY(${pg(contacts)})`).catch(() => {});
      await client.query(`UPDATE crm_opportunities SET contact_id=NULL WHERE contact_id = ANY(${pg(contacts)})`).catch(() => {});
    }
    if (accounts.length) {
      await client.query(`UPDATE crm_leads SET account_id=NULL WHERE account_id = ANY(${pg(accounts)})`).catch(() => {});
      await client.query(`UPDATE crm_leads SET converted_to_account_id=NULL WHERE converted_to_account_id = ANY(${pg(accounts)})`).catch(() => {});
      await client.query(`UPDATE crm_opportunities SET account_id=NULL WHERE account_id = ANY(${pg(accounts)})`).catch(() => {});
      // A contact can still point at an account being purged without itself being
      // trashed (e.g. account trashed on its own) — otherwise the account delete
      // fails on crm_contacts_account_id_fkey.
      await client.query(`UPDATE crm_contacts SET account_id=NULL WHERE account_id = ANY(${pg(accounts)})`).catch(() => {});
    }

    // 6. Contacts — unlink standalone records that can outlive the contact
    // (cases/documents/invoices/quotes/sales orders), same pattern as above.
    if (contacts.length) {
      await client.query(`UPDATE crm_cases SET contact_id=NULL WHERE contact_id = ANY(${pg(contacts)})`).catch(() => {});
      await client.query(`UPDATE crm_documents SET contact_id=NULL WHERE contact_id = ANY(${pg(contacts)})`).catch(() => {});
      await client.query(`UPDATE crm_invoices SET contact_id=NULL WHERE contact_id = ANY(${pg(contacts)})`).catch(() => {});
      await client.query(`UPDATE crm_quotes SET contact_id=NULL WHERE contact_id = ANY(${pg(contacts)})`).catch(() => {});
      await client.query(`UPDATE crm_sales_orders SET contact_id=NULL WHERE contact_id = ANY(${pg(contacts)})`).catch(() => {});

      const r = await client.query(
        `DELETE FROM crm_contacts WHERE id = ANY(${pg(contacts)}) AND is_deleted=TRUE`
      );
      deleted.contacts = r.rowCount;
    }

    // 7. Accounts
    if (accounts.length) {
      const r = await client.query(
        `DELETE FROM crm_accounts WHERE id = ANY(${pg(accounts)}) AND is_deleted=TRUE`
      );
      deleted.accounts = r.rowCount;
    }

    // 8. Audit logs + leads
    if (leads.length) {
      await client.query(
        `DELETE FROM crm_audit_logs WHERE entity_id = ANY(${pg(leads)}) AND entity_type='Lead'`
      ).catch(() => {});
      const r = await client.query(
        `DELETE FROM crm_leads WHERE id = ANY(${pg(leads)}) AND is_deleted=TRUE`
      );
      deleted.leads = r.rowCount;
    }

    await client.query('COMMIT');
    res.json({ success: true, deleted });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('purgeTrash error:', e);
    res.status(500).json({ success: false, message: e.message });
  } finally {
    client.release();
  }
}

function toInts(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(Number).filter(n => Number.isInteger(n) && n > 0);
}

function pg(ids) {
  return `ARRAY[${ids.join(',')}]::int[]`;
}

// ─── Admin Trash (Products + all CRM entities) ────────────────

// GET /api/admin/trash
async function getAdminTrash(req, res) {
  try {
    const [products, leads, accounts, contacts, opps, tasks] = await Promise.all([
      pool.query(`SELECT id, name, action_type AS type, deleted_at AS updated_at
                  FROM products WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`),
      pool.query(`SELECT id, name, email, phone, company, status, score, updated_at
                  FROM crm_leads WHERE is_deleted=TRUE ORDER BY updated_at DESC`),
      pool.query(`SELECT id, name, email, phone, industry, type, updated_at
                  FROM crm_accounts WHERE is_deleted=TRUE ORDER BY updated_at DESC`),
      pool.query(`SELECT id, name, email, phone, designation AS title, updated_at
                  FROM crm_contacts WHERE is_deleted=TRUE ORDER BY updated_at DESC`),
      pool.query(`SELECT id, name, stage, deal_value AS value, updated_at
                  FROM crm_opportunities WHERE is_deleted=TRUE ORDER BY updated_at DESC`),
      pool.query(`SELECT id, title AS name, status, due_date, updated_at
                  FROM crm_tasks WHERE is_deleted=TRUE ORDER BY updated_at DESC`),
    ]);

    const counts = {
      products:      products.rowCount,
      leads:         leads.rowCount,
      accounts:      accounts.rowCount,
      contacts:      contacts.rowCount,
      opportunities: opps.rowCount,
      tasks:         tasks.rowCount,
    };
    counts.total = Object.values(counts).reduce((s, n) => s + n, 0);

    res.json({
      success: true,
      data: {
        products:      products.rows,
        leads:         leads.rows,
        accounts:      accounts.rows,
        contacts:      contacts.rows,
        opportunities: opps.rows,
        tasks:         tasks.rows,
      },
      counts,
    });
  } catch (e) {
    console.error('getAdminTrash error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch trash' });
  }
}

// DELETE /api/admin/trash/purge
// Body: { all?: true } OR { products, leads, accounts, contacts, opportunities, tasks }
async function purgeAdminTrash(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { all = false } = req.body;
    let products      = toInts(req.body.products);
    let leads         = toInts(req.body.leads);
    let accounts      = toInts(req.body.accounts);
    let contacts      = toInts(req.body.contacts);
    let opportunities = toInts(req.body.opportunities);
    let tasks         = toInts(req.body.tasks);

    if (all) {
      const [pR, lR, aR, cR, oR, tR] = await Promise.all([
        client.query(`SELECT id FROM products         WHERE deleted_at IS NOT NULL`),
        client.query(`SELECT id FROM crm_leads        WHERE is_deleted=TRUE`),
        client.query(`SELECT id FROM crm_accounts     WHERE is_deleted=TRUE`),
        client.query(`SELECT id FROM crm_contacts     WHERE is_deleted=TRUE`),
        client.query(`SELECT id FROM crm_opportunities WHERE is_deleted=TRUE`),
        client.query(`SELECT id FROM crm_tasks        WHERE is_deleted=TRUE`),
      ]);
      products      = pR.rows.map(r => r.id);
      leads         = lR.rows.map(r => r.id);
      accounts      = aR.rows.map(r => r.id);
      contacts      = cR.rows.map(r => r.id);
      opportunities = oR.rows.map(r => r.id);
      tasks         = tR.rows.map(r => r.id);
    }

    const deleted = { products: 0, leads: 0, accounts: 0, contacts: 0, opportunities: 0, tasks: 0 };

    // Products — hard-delete (was Sequelize paranoid soft-delete)
    if (products.length) {
      const r = await client.query(
        `DELETE FROM products WHERE id = ANY(${pg(products)}) AND deleted_at IS NOT NULL`
      );
      deleted.products = r.rowCount;
    }

    // CRM — same FK-safe order as before
    let opportunityIdsToDelete = [];
    if (opportunities.length) {
      const { rows: explicitOpps } = await client.query(
        `SELECT id FROM crm_opportunities WHERE id = ANY(${pg(opportunities)}) AND is_deleted=TRUE`
      );
      opportunityIdsToDelete.push(...explicitOpps.map(r => r.id));
    }
    if (leads.length) {
      const { rows: linked } = await client.query(
        `SELECT id FROM crm_opportunities WHERE lead_id = ANY(${pg(leads)}) AND id != ALL(${pg(opportunityIdsToDelete.length ? opportunityIdsToDelete : [0])})`
      );
      opportunityIdsToDelete.push(...linked.map(r => r.id));
    }
    if (opportunityIdsToDelete.length) {
      await client.query(`UPDATE crm_cases SET opportunity_id=NULL WHERE opportunity_id = ANY(${pg(opportunityIdsToDelete)})`).catch(() => {});
      await client.query(`UPDATE crm_invoices SET opportunity_id=NULL WHERE opportunity_id = ANY(${pg(opportunityIdsToDelete)})`).catch(() => {});
      await client.query(`UPDATE crm_quotes SET opportunity_id=NULL WHERE opportunity_id = ANY(${pg(opportunityIdsToDelete)})`).catch(() => {});
      await client.query(`UPDATE crm_sales_orders SET opportunity_id=NULL WHERE opportunity_id = ANY(${pg(opportunityIdsToDelete)})`).catch(() => {});

      const r = await client.query(`DELETE FROM crm_opportunities WHERE id = ANY(${pg(opportunityIdsToDelete)})`);
      deleted.opportunities += r.rowCount;
    }
    if (leads.length) {
      await client.query(`DELETE FROM crm_lead_score_history WHERE lead_id = ANY(${pg(leads)})`);
    }
    if (contacts.length || accounts.length) {
      const cond = [];
      if (contacts.length) {
        cond.push(`contact_id = ANY(${pg(contacts)})`);
        cond.push(`(entity_type='contact' AND entity_id = ANY(${pg(contacts)}))`);
      }
      if (accounts.length) {
        cond.push(`(entity_type='account' AND entity_id = ANY(${pg(accounts)}))`);
      }
      const w = cond.join(' OR ');
      await client.query(`DELETE FROM crm_activities WHERE ${w}`);
      await client.query(`DELETE FROM crm_tasks      WHERE ${w}`);
    }
    if (tasks.length) {
      const r = await client.query(
        `DELETE FROM crm_tasks WHERE id = ANY(${pg(tasks)}) AND is_deleted=TRUE`
      );
      deleted.tasks = r.rowCount;
    }
    if (contacts.length) {
      await client.query(`UPDATE crm_leads SET contact_id=NULL WHERE contact_id = ANY(${pg(contacts)})`);
      await client.query(`UPDATE crm_leads SET converted_to_contact_id=NULL WHERE converted_to_contact_id = ANY(${pg(contacts)})`).catch(() => {});
      await client.query(`UPDATE crm_opportunities SET contact_id=NULL WHERE contact_id = ANY(${pg(contacts)})`).catch(() => {});
    }
    if (accounts.length) {
      await client.query(`UPDATE crm_leads SET account_id=NULL WHERE account_id = ANY(${pg(accounts)})`).catch(() => {});
      await client.query(`UPDATE crm_leads SET converted_to_account_id=NULL WHERE converted_to_account_id = ANY(${pg(accounts)})`).catch(() => {});
      await client.query(`UPDATE crm_opportunities SET account_id=NULL WHERE account_id = ANY(${pg(accounts)})`).catch(() => {});
      // A contact can still point at an account being purged without itself being
      // trashed (e.g. account trashed on its own) — otherwise the account delete
      // fails on crm_contacts_account_id_fkey.
      await client.query(`UPDATE crm_contacts SET account_id=NULL WHERE account_id = ANY(${pg(accounts)})`).catch(() => {});
    }
    if (contacts.length) {
      await client.query(`UPDATE crm_cases SET contact_id=NULL WHERE contact_id = ANY(${pg(contacts)})`).catch(() => {});
      await client.query(`UPDATE crm_documents SET contact_id=NULL WHERE contact_id = ANY(${pg(contacts)})`).catch(() => {});
      await client.query(`UPDATE crm_invoices SET contact_id=NULL WHERE contact_id = ANY(${pg(contacts)})`).catch(() => {});
      await client.query(`UPDATE crm_quotes SET contact_id=NULL WHERE contact_id = ANY(${pg(contacts)})`).catch(() => {});
      await client.query(`UPDATE crm_sales_orders SET contact_id=NULL WHERE contact_id = ANY(${pg(contacts)})`).catch(() => {});

      const r = await client.query(`DELETE FROM crm_contacts WHERE id = ANY(${pg(contacts)}) AND is_deleted=TRUE`);
      deleted.contacts = r.rowCount;
    }
    if (accounts.length) {
      const r = await client.query(`DELETE FROM crm_accounts WHERE id = ANY(${pg(accounts)}) AND is_deleted=TRUE`);
      deleted.accounts = r.rowCount;
    }
    if (leads.length) {
      await client.query(`DELETE FROM crm_audit_logs WHERE entity_id = ANY(${pg(leads)}) AND entity_type='Lead'`).catch(() => {});
      const r = await client.query(`DELETE FROM crm_leads WHERE id = ANY(${pg(leads)}) AND is_deleted=TRUE`);
      deleted.leads = r.rowCount;
    }

    await client.query('COMMIT');
    res.json({ success: true, deleted });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('purgeAdminTrash error:', e);
    res.status(500).json({ success: false, message: e.message });
  } finally {
    client.release();
  }
}

module.exports = { getTrash, purgeTrash, getAdminTrash, purgeAdminTrash };
