/**
 * Thin client for the backend's public lead-intake endpoint
 * (neozaar_backend → POST /api/public/leads/cta-action).
 *
 * This is the same high-intent path the website's "Get Quote / Talk to Sales"
 * buttons use: it upserts crm_leads (one per email), scores the customer, and
 * creates an opportunity via the lifecycle engine — so the WhatsApp bot goes
 * through the CRM's own business logic instead of writing tables directly.
 *
 * No auth (public endpoint). `email` is mandatory server-side; calls without one
 * are skipped here rather than sent and rejected.
 */

const CTA_PATH = "/public/leads/cta-action";
const TIMEOUT_MS = 5000;

/**
 * @param {object} payload  see fields in public.leads.routes.js — at minimum
 *   { email }. Commonly: name, phone, company, requirement, source,
 *   product_name, product_id, cloud_environment, procurement_stage,
 *   consent_status.
 * @returns {Promise<{ok: boolean, status?: number, body?: any, skipped?: string, error?: string}>}
 */
export async function postCtaAction(payload) {
  const base = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");
  if (!base) return { ok: false, skipped: "NEXT_PUBLIC_API_BASE not set" };
  if (!payload || !payload.email) return { ok: false, skipped: "no email" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${base}${CTA_PATH}`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, status: res.status, body } : { ok: false, status: res.status, body };
  } catch (err) {
    return { ok: false, error: err.name === "AbortError" ? "timeout" : err.message };
  } finally {
    clearTimeout(timer);
  }
}
