const crypto = require("crypto");
const repository = require("../../repositories/marketing/marketing.repository");

function normalizeEmail(value) {
  return value ? String(value).trim().toLowerCase() : null;
}

function normalizePhone(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const plus = raw.startsWith("+") ? "+" : "";
  const digits = raw.replace(/\D/g, "");
  return digits ? `${plus}${digits}` : null;
}

async function findCrmContact(client, email, phone) {
  if (!email && !phone) return null;
  const { rows } = await client.query(`SELECT id, email, phone FROM crm_contacts
    WHERE is_deleted = FALSE AND (($1::text IS NOT NULL AND LOWER(TRIM(email)) = $1)
      OR ($2::text IS NOT NULL AND REGEXP_REPLACE(phone, '[^0-9+]', '', 'g') = $2))
    ORDER BY CASE WHEN $1::text IS NOT NULL AND LOWER(TRIM(email)) = $1 THEN 0 ELSE 1 END, id ASC LIMIT 2`,
  [email, phone]);
  if (rows.length > 1 && rows[0].id !== rows[1].id) {
    const error = new Error("Identity matches multiple CRM contacts");
    error.statusCode = 409;
    throw error;
  }
  return rows[0] || null;
}

async function mergeContacts(client, sourceId, targetId, reason) {
  if (sourceId === targetId) return targetId;
  await client.query("UPDATE marketing_events SET marketing_contact_id = $1 WHERE marketing_contact_id = $2", [targetId, sourceId]);
  await client.query(`INSERT INTO marketing_contact_tags (marketing_contact_id, tag_id, added_at)
    SELECT $1, tag_id, added_at FROM marketing_contact_tags WHERE marketing_contact_id = $2
    ON CONFLICT DO NOTHING`, [targetId, sourceId]);
  await client.query("DELETE FROM marketing_contact_tags WHERE marketing_contact_id = $1", [sourceId]);
  await client.query(`INSERT INTO marketing_segment_members (segment_id, marketing_contact_id, added_at)
    SELECT segment_id, $1, added_at FROM marketing_segment_members WHERE marketing_contact_id = $2
    ON CONFLICT DO NOTHING`, [targetId, sourceId]);
  await client.query("DELETE FROM marketing_segment_members WHERE marketing_contact_id = $1", [sourceId]);
  await client.query(`INSERT INTO marketing_identity_keys
    (marketing_contact_id, identity_type, identity_value, is_primary, first_seen_at, last_seen_at)
    SELECT $1, identity_type, identity_value, is_primary, first_seen_at, last_seen_at
    FROM marketing_identity_keys WHERE marketing_contact_id = $2 ON CONFLICT DO NOTHING`, [targetId, sourceId]);
  await client.query("DELETE FROM marketing_identity_keys WHERE marketing_contact_id = $1", [sourceId]);
  await client.query(`UPDATE marketing_contacts target SET
    marketing_score = target.marketing_score + source.marketing_score,
    email_consent = target.email_consent OR source.email_consent,
    whatsapp_consent = target.whatsapp_consent OR source.whatsapp_consent,
    sms_consent = target.sms_consent OR source.sms_consent,
    do_not_contact = target.do_not_contact OR source.do_not_contact,
    first_source = COALESCE(target.first_source, source.first_source),
    last_source = COALESCE(source.last_source, target.last_source),
    last_activity_at = GREATEST(target.last_activity_at, source.last_activity_at), updated_at = NOW()
    FROM marketing_contacts source WHERE target.id = $1 AND source.id = $2`, [targetId, sourceId]);
  await client.query(`UPDATE marketing_contacts SET is_deleted = TRUE, merged_into_contact_id = $1,
    crm_contact_id = NULL, anonymous_id = NULL, email_normalized = NULL, phone_normalized = NULL,
    updated_at = NOW() WHERE id = $2`, [targetId, sourceId]);
  await client.query(`INSERT INTO marketing_identity_merges (source_contact_id, target_contact_id, reason)
    VALUES ($1, $2, $3)`, [sourceId, targetId, reason]);
  return targetId;
}

async function resolveIdentity(input, existingClient) {
  const client = existingClient || await repository.pool.connect();
  const ownsTransaction = !existingClient;
  try {
    if (ownsTransaction) await client.query("BEGIN");
    const email = normalizeEmail(input.email);
    const phone = normalizePhone(input.phone);
    const anonymousId = input.anonymousId ? String(input.anonymousId).trim() : null;
    const crm = await findCrmContact(client, email, phone);
    const values = [["anonymous_id", anonymousId], ["email", email], ["phone", phone]].filter(([, value]) => value);
    const foundIds = new Set();
    if (input.marketingContactId) foundIds.add(Number(input.marketingContactId));
    if (crm) {
      const byCrm = await client.query("SELECT id FROM marketing_contacts WHERE crm_contact_id = $1 AND is_deleted = FALSE FOR UPDATE", [crm.id]);
      if (byCrm.rows[0]) foundIds.add(byCrm.rows[0].id);
    }
    for (const [type, value] of values) {
      const found = await client.query(`SELECT mc.id FROM marketing_identity_keys ik
        JOIN marketing_contacts mc ON mc.id = ik.marketing_contact_id
        WHERE ik.identity_type = $1 AND ik.identity_value = $2 AND mc.is_deleted = FALSE FOR UPDATE`, [type, value]);
      if (found.rows[0]) foundIds.add(found.rows[0].id);
    }
    if (anonymousId) {
      const legacy = await client.query("SELECT id FROM marketing_contacts WHERE anonymous_id = $1 AND is_deleted = FALSE FOR UPDATE", [anonymousId]);
      if (legacy.rows[0]) foundIds.add(legacy.rows[0].id);
    }

    let targetId;
    if (crm) {
      const crmOwned = await client.query("SELECT id FROM marketing_contacts WHERE crm_contact_id = $1 AND is_deleted = FALSE FOR UPDATE", [crm.id]);
      targetId = crmOwned.rows[0]?.id;
    }
    targetId ||= [...foundIds][0];
    if (!targetId) {
      const inserted = await client.query(`INSERT INTO marketing_contacts
        (crm_contact_id, anonymous_id, email, phone, email_normalized, phone_normalized, identified_at, lifecycle_stage, preference_token)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [crm?.id || null, anonymousId, email, phone, email, phone, crm ? new Date() : null, crm ? "lead" : "visitor", crypto.randomBytes(24).toString("hex")]);
      targetId = inserted.rows[0].id;
    } else {
      const target = await client.query(`SELECT id, crm_contact_id FROM marketing_contacts
        WHERE id = $1 AND is_deleted = FALSE FOR UPDATE`, [targetId]);
      if (!target.rows[0]) {
        const error = new Error("Marketing contact not found");
        error.statusCode = 404;
        throw error;
      }
      if (crm && target.rows[0].crm_contact_id && target.rows[0].crm_contact_id !== crm.id) {
        const error = new Error("Marketing identity is already linked to another CRM contact");
        error.statusCode = 409;
        throw error;
      }
      if (crm) {
        await client.query(`UPDATE marketing_contacts SET crm_contact_id = $1,
          email = COALESCE(email, $2), phone = COALESCE(phone, $3),
          email_normalized = COALESCE(email_normalized, $2), phone_normalized = COALESCE(phone_normalized, $3),
          identified_at = COALESCE(identified_at, NOW()), updated_at = NOW() WHERE id = $4`,
        [crm.id, email, phone, targetId]);
      }
    }

    for (const sourceId of foundIds) {
      if (sourceId !== targetId) {
        const source = await client.query(`SELECT crm_contact_id FROM marketing_contacts
          WHERE id = $1 AND is_deleted = FALSE FOR UPDATE`, [sourceId]);
        if (source.rows[0]?.crm_contact_id && crm && source.rows[0].crm_contact_id !== crm.id) {
          const error = new Error("Cannot merge profiles linked to different CRM contacts");
          error.statusCode = 409;
          throw error;
        }
        await mergeContacts(client, sourceId, targetId, "identity_resolution");
      }
    }
    for (const [type, value] of values) {
      await client.query(`INSERT INTO marketing_identity_keys
        (marketing_contact_id, identity_type, identity_value, is_primary)
        VALUES ($1,$2,$3,$4) ON CONFLICT (identity_type, identity_value)
        DO UPDATE SET last_seen_at = NOW()`, [targetId, type, value, type !== "anonymous_id"]);
    }
    if (anonymousId) {
      // Stamp the denormalized pointer on marketing_visitors with the final,
      // post-merge contact id. Must run after targetId is resolved above —
      // it previously referenced targetId before it was declared, which
      // threw a ReferenceError on every anonymous-visitor identity
      // resolution (i.e. on every tracked event and form submission).
      await client.query(`UPDATE marketing_visitors SET marketing_contact_id=$1
        WHERE visitor_id=$2 AND marketing_contact_id IS DISTINCT FROM $1`, [targetId, anonymousId]);
    }
    if (ownsTransaction) await client.query("COMMIT");
    return { marketingContactId: targetId, crmContactId: crm?.id || null, identified: Boolean(crm) };
  } catch (error) {
    if (ownsTransaction) await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    if (ownsTransaction) client.release();
  }
}

module.exports = { normalizeEmail, normalizePhone, resolveIdentity, mergeContacts };
