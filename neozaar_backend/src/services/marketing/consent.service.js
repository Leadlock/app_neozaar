// Marketing consent — deliberately separate from the DPDPA cookie-consent
// ledger (services/consentLedger.service.js). Accepting analytics/marketing
// cookies never implies email/WhatsApp/SMS consent, and vice versa: every
// channel here requires its own explicit, auditable opt-in.
const crypto = require("crypto");
const pool = require("../../config/database");
const sendEmail = require("../../utils/sendEmailAzure");

const CHANNELS = new Set(["email", "whatsapp", "sms"]);
const CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h, consistent with a "confirm now" nudge rather than a standing invite

function assertChannel(channel) {
  if (!CHANNELS.has(channel)) throw Object.assign(new Error(`Unsupported consent channel: ${channel}`), { statusCode: 400 });
}

function token() {
  return crypto.randomBytes(24).toString("hex");
}

function publicBase() {
  return (process.env.MARKETING_PUBLIC_BASE_URL || "https://neozaar.com/api").replace(/\/$/, "");
}

async function recordEvent(client, contactId, channel, action, method, source = {}) {
  await client.query(
    `INSERT INTO marketing_consent_events (marketing_contact_id, channel, action, method, source)
     VALUES ($1,$2,$3,$4,$5)`,
    [contactId, channel, action, method, JSON.stringify(source)],
  );
}

/** Immediate, explicit opt-in (e.g. a checked consent checkbox on a public
 * form, or a self-service preference-center change) — no further
 * confirmation needed since the action itself is already unambiguous. */
async function grantConsent(contactId, channel, method, source = {}) {
  assertChannel(channel);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `UPDATE marketing_contacts SET ${channel}_consent = TRUE, updated_at = NOW()
       WHERE id = $1 AND is_deleted = FALSE RETURNING id`,
      [contactId],
    );
    if (!rows[0]) throw Object.assign(new Error("Marketing contact not found"), { statusCode: 404 });
    await recordEvent(client, contactId, channel, "granted", method, source);
    await client.query("COMMIT");
    return { contactId, channel, granted: true };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/** Explicit opt-out — from the preference center or an unsubscribe action. */
async function revokeConsent(contactId, channel, method, source = {}) {
  assertChannel(channel);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `UPDATE marketing_contacts SET ${channel}_consent = FALSE, updated_at = NOW()
       WHERE id = $1 AND is_deleted = FALSE RETURNING id`,
      [contactId],
    );
    if (!rows[0]) throw Object.assign(new Error("Marketing contact not found"), { statusCode: 404 });
    await recordEvent(client, contactId, channel, "revoked", method, source);
    await client.query("COMMIT");
    return { contactId, channel, granted: false };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

function confirmationEmailHtml(confirmUrl) {
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;">
    <div style="background:#fff;max-width:520px;margin:0 auto;padding:30px;border-radius:10px;text-align:center;">
      <h2 style="color:#333;">Confirm your subscription</h2>
      <p style="color:#555;">Please confirm you'd like to receive emails from NeoZaar.</p>
      <p><a href="${confirmUrl}" style="display:inline-block;background:#111;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Confirm subscription</a></p>
      <p style="color:#999;font-size:12px;">If you didn't request this, you can ignore this email — no subscription will be created.</p>
    </div></body></html>`;
}

/** Confirmed opt-in (double opt-in): does NOT grant consent yet. Emails a
 * time-limited confirmation link; consent is only granted when that link
 * is used (see confirmEmail below). Used when a form's consent_config
 * sets doubleOptIn: true for the email channel. */
async function requestEmailConfirmation(contactId, method, source = {}) {
  const expires = new Date(Date.now() + CONFIRMATION_TTL_MS);
  const t = token();
  const client = await pool.connect();
  let email;
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `UPDATE marketing_contacts SET email_confirmation_token = $1, email_confirmation_expires_at = $2, updated_at = NOW()
       WHERE id = $3 AND is_deleted = FALSE RETURNING email, (SELECT email FROM crm_contacts WHERE id = marketing_contacts.crm_contact_id) crm_email`,
      [t, expires, contactId],
    );
    if (!rows[0]) throw Object.assign(new Error("Marketing contact not found"), { statusCode: 404 });
    email = rows[0].crm_email || rows[0].email;
    if (!email) throw Object.assign(new Error("Contact has no email address to confirm"), { statusCode: 400 });
    await recordEvent(client, contactId, "email", "requested", method, source);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
  const confirmUrl = `${publicBase()}/marketing/email/confirm/${t}`;
  // Transactional "please confirm" email — sent directly via Graph, not
  // through email.service.js's queue, which requires email_consent to
  // already be true. That would be circular here: this IS the step that
  // earns consent.
  await sendEmail(email, "Please confirm your subscription", confirmationEmailHtml(confirmUrl), true).catch((error) => {
    throw Object.assign(new Error(`Failed to send confirmation email: ${error.message}`), { statusCode: 502 });
  });
  return { contactId, channel: "email", status: "confirmation_sent" };
}

/** Completes a double opt-in: looks up the contact by confirmation token,
 * grants email consent if the token hasn't expired, and always clears the
 * token so it can't be reused or left dangling. */
async function confirmEmail(rawToken) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT id, email_confirmation_expires_at FROM marketing_contacts
       WHERE email_confirmation_token = $1 AND is_deleted = FALSE FOR UPDATE`,
      [rawToken],
    );
    const contact = rows[0];
    if (!contact) throw Object.assign(new Error("Confirmation link is invalid or already used"), { statusCode: 404 });
    const expired = !contact.email_confirmation_expires_at || new Date(contact.email_confirmation_expires_at) < new Date();
    await client.query(
      `UPDATE marketing_contacts SET email_confirmation_token = NULL, email_confirmation_expires_at = NULL,
       email_consent = CASE WHEN $2 THEN email_consent ELSE TRUE END,
       email_confirmed_at = CASE WHEN $2 THEN email_confirmed_at ELSE NOW() END,
       updated_at = NOW() WHERE id = $1`,
      [contact.id, expired],
    );
    if (expired) throw Object.assign(new Error("Confirmation link has expired — please subscribe again"), { statusCode: 410 });
    await recordEvent(client, contact.id, "email", "confirmed", "double_optin_confirm", {});
    await client.query("COMMIT");
    return { contactId: contact.id };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { grantConsent, revokeConsent, requestEmailConfirmation, confirmEmail, recordEvent, CHANNELS };
