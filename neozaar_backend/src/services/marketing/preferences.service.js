// Self-service consent/subscription management, reached via a long-lived
// per-contact token (marketing_contacts.preference_token) rather than a
// platform login — most marketing contacts are prospects, not users of
// the app. The token is only ever included in emails this contact already
// received (see email.service.js's footer), so possessing it is treated
// as proof of being that contact, same as an unsubscribe link.
const pool = require("../../config/database");
const consent = require("./consent.service");

async function findContactId(token) {
  const { rows } = await pool.query(
    `SELECT id FROM marketing_contacts WHERE preference_token = $1 AND is_deleted = FALSE`,
    [token],
  );
  if (!rows[0]) throw Object.assign(new Error("Preference link is invalid"), { statusCode: 404 });
  return rows[0].id;
}

async function getByToken(token) {
  const { rows } = await pool.query(
    `SELECT mc.id, COALESCE(cc.email, mc.email) email, COALESCE(cc.phone, mc.phone) phone,
            mc.email_consent, mc.whatsapp_consent, mc.sms_consent, mc.do_not_contact
     FROM marketing_contacts mc LEFT JOIN crm_contacts cc ON cc.id = mc.crm_contact_id
     WHERE mc.preference_token = $1 AND mc.is_deleted = FALSE`,
    [token],
  );
  const contact = rows[0];
  if (!contact) throw Object.assign(new Error("Preference link is invalid"), { statusCode: 404 });
  const subscriptions = (await pool.query(
    `SELECT t.code, t.name, COALESCE(s.status, 'unsubscribed') = 'subscribed' AS subscribed
     FROM marketing_subscription_types t
     LEFT JOIN marketing_subscriptions s ON s.subscription_type_id = t.id AND s.marketing_contact_id = $1
     ORDER BY t.name`,
    [contact.id],
  )).rows;
  return {
    email: contact.email,
    phone: contact.phone,
    consent: { email: contact.email_consent, whatsapp: contact.whatsapp_consent, sms: contact.sms_consent },
    doNotContact: contact.do_not_contact,
    subscriptions,
  };
}

async function updateByToken(token, updates) {
  const contactId = await findContactId(token);
  const source = { via: "preference_center" };

  const channelUpdates = [["email", updates.emailConsent], ["whatsapp", updates.whatsappConsent], ["sms", updates.smsConsent]];
  for (const [channel, value] of channelUpdates) {
    if (value === undefined) continue;
    if (value) await consent.grantConsent(contactId, channel, "preference_center", source);
    else await consent.revokeConsent(contactId, channel, "preference_center", source);
  }

  if (updates.doNotContact !== undefined) {
    await pool.query(
      `UPDATE marketing_contacts SET do_not_contact = $1,
       unsubscribed_at = CASE WHEN $1 THEN COALESCE(unsubscribed_at, NOW()) ELSE unsubscribed_at END,
       updated_at = NOW() WHERE id = $2`,
      [Boolean(updates.doNotContact), contactId],
    );
  }

  if (Array.isArray(updates.subscriptions)) {
    const wanted = new Set(updates.subscriptions);
    const types = (await pool.query(`SELECT id, code FROM marketing_subscription_types`)).rows;
    for (const type of types) {
      const status = wanted.has(type.code) ? "subscribed" : "unsubscribed";
      await pool.query(
        `INSERT INTO marketing_subscriptions (marketing_contact_id, subscription_type_id, status, updated_at)
         VALUES ($1,$2,$3,NOW())
         ON CONFLICT (marketing_contact_id, subscription_type_id) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()`,
        [contactId, type.id, status],
      );
    }
  }

  return getByToken(token);
}

module.exports = { getByToken, updateByToken };
