import { buildContextSummary, ctaPayload } from "./crmService.js";
import { postCtaAction } from "./leadsApi.js";

/**
 * "Speak to an Expert" handoff (spec §9).
 *
 *  - the customer is sent the Microsoft Bookings link, and
 *  - when Neo already has an email (they came from a journey that captured one),
 *    a tagged CRM record is created via cta-action so an owner picks it up with
 *    full context. Cold handoffs (one routing question, no email) rely on the
 *    Bookings booking to capture details — we don't ask a second question.
 *
 * TODO(expert alert): fire a Slack / email alert to the sales channel here so a
 * human can also reach out proactively (decision deferred).
 */

/** @returns {string|null} configured Bookings URL, or null */
export function expertBookingUrl() {
  const url = (process.env.NEXT_PUBLIC_MS_BOOKINGS_URL || "").trim();
  return url || null;
}

/**
 * @param {import('./sessionStore.js').Session} session
 * @param {string|null} topic  routing answer when Neo had no context to pass
 * @returns {Promise<{bookingUrl: string|null, topic: string|null, crm: string}>}
 */
export async function notifyExpertHandoff(session, topic = null) {
  const expertSession = { ...session, context: { ...session.context, intent: "expert" } };
  const summary = buildContextSummary(expertSession);
  console.log(`🧑‍💼 Expert handoff for ${session.phone}${topic ? ` — topic: ${topic}` : ""}\n${summary}`);

  let crm = "skipped: no email";
  if (session.context?.email) {
    const payload = {
      ...ctaPayload(expertSession, "WhatsApp Neo — Expert"),
      requirement: `Expert requested${topic ? ` — ${topic}` : ""}\n\n${summary}`,
    };
    try {
      const r = await postCtaAction(payload);
      crm = r.ok ? "ok" : `not sent: ${r.skipped || r.error || `HTTP ${r.status}`}`;
    } catch (err) {
      crm = `failed: ${err.message}`;
      console.error("❌ expert cta-action failed:", err.message);
    }
  }
  console.log(`   expert CRM record: ${crm}`);

  return { bookingUrl: expertBookingUrl(), topic: topic || null, crm };
}
