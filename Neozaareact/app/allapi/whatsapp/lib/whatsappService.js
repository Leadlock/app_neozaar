import axios from "axios";
import { logOutbound } from "./messageLog.js";

const ACCESS_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || "v25.0";
const API_URL = `https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/messages`;

/**
 * Meta WhatsApp Cloud API field limits (interactive messages).
 * Kept here so callers don't have to remember them — everything is clamped
 * before it goes out so a slightly-too-long catalogue string never causes a
 * 400 from Meta.
 */
export const WA_LIMITS = {
  bodyText: 1024,
  headerText: 60,
  footerText: 60,
  buttonTitle: 20,
  buttons: 3,
  listButton: 20,
  rowTitle: 24,
  rowDescription: 72,
  rows: 10,
  replyId: 256,
};

/* ────────────────────────────── helpers ────────────────────────────── */

function clamp(value, max) {
  const s = String(value ?? "");
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/**
 * Derive a stable, Meta-safe reply id from a human label. The router matches on
 * these ids, so they must be deterministic for the same label.
 */
export function slugId(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, WA_LIMITS.replyId) || "opt";
}

/** Coerce "Label" | {id,title,description} into a normalised option. */
function normOption(opt, fallbackIndex) {
  if (typeof opt === "string") {
    return { id: slugId(opt), title: opt, description: null };
  }
  const title = opt.title ?? opt.label ?? "";
  return {
    id: String(opt.id ?? slugId(title) ?? `opt_${fallbackIndex}`).slice(0, WA_LIMITS.replyId),
    title,
    description: opt.description ?? null,
  };
}

async function sendPayload(payload, label, agent) {
  try {
    const response = await axios.post(
      API_URL,
      { messaging_product: "whatsapp", recipient_type: "individual", ...payload },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );
    const wamid = response.data?.messages?.[0]?.id;
    console.log(`✅ WhatsApp ${label} → ${payload.to}:`, wamid || "(no id)");
    // Awaited so transcript row order == send order. logOutbound swallows its
    // own errors, so this never throws and can't break a reply.
    const logged = await logOutbound({ to: payload.to, payload, wamid, agent });
    if (agent && !logged) return { ...response.data, loggingWarning: 'Message accepted by WhatsApp, but transcript logging failed. Do not resend; contact an administrator' };
    return response.data;
  } catch (err) {
    if (err.response) {
      console.error(
        `❌ WhatsApp ${label} error (${err.response.status}):`,
        JSON.stringify(err.response.data)
      );
    } else {
      console.error(`❌ WhatsApp ${label} error:`, err.message);
    }
    const failedLog = logOutbound({
      to: payload.to,
      payload,
      agent,
      error: err.response?.data?.error?.message || err.message,
    }).catch(() => {});
    if (agent) await failedLog;
    throw err;
  }
}

/* ────────────────────────────── senders ────────────────────────────── */

/**
 * Plain text message.
 * @param {string} to             recipient in E.164 without '+'
 * @param {string} message        body text
 * @param {object} [opts]
 * @param {boolean} [opts.previewUrl=false]  render a link preview for the first URL
 */
export async function sendWhatsAppMessage(to, message, { previewUrl = false, agent } = {}) {
  return sendPayload(
    { to, type: "text", text: { preview_url: previewUrl, body: clamp(message, 4096) } },
    "text", agent
  );
}

/**
 * Interactive reply buttons (max 3). Use for a short set of next actions.
 * @param {string} to
 * @param {string} bodyText
 * @param {Array<string|{id,title}>} buttons
 * @param {object} [opts] { header, footer }
 */
export async function sendWhatsAppButtons(to, bodyText, buttons, { header, footer } = {}) {
  const list = (buttons || []).slice(0, WA_LIMITS.buttons).map((b, i) => {
    const { id, title } = normOption(b, i);
    return { type: "reply", reply: { id, title: clamp(title, WA_LIMITS.buttonTitle) } };
  });

  if (!list.length) {
    // Nothing actionable to render — fall back to plain text so we never send
    // an invalid interactive payload.
    return sendWhatsAppMessage(to, bodyText);
  }

  const interactive = {
    type: "button",
    body: { text: clamp(bodyText, WA_LIMITS.bodyText) },
    action: { buttons: list },
  };
  if (header) interactive.header = { type: "text", text: clamp(header, WA_LIMITS.headerText) };
  if (footer) interactive.footer = { text: clamp(footer, WA_LIMITS.footerText) };

  return sendPayload({ to, type: "interactive", interactive }, "buttons");
}

/**
 * Interactive list message (max 10 rows total across sections). Use for menus
 * or any choice set with more than 3 options.
 * @param {string} to
 * @param {string} bodyText
 * @param {string} buttonLabel                 label on the list-opener button
 * @param {Array} sections  either [{title?, rows:[...]}] or a flat array of rows
 *                          where each row is "Label" | {id,title,description}
 * @param {object} [opts] { header, footer }
 */
export async function sendWhatsAppList(to, bodyText, buttonLabel, sections, { header, footer } = {}) {
  const rawSections =
    Array.isArray(sections) && sections.length && sections[0] && Array.isArray(sections[0].rows)
      ? sections
      : [{ rows: sections || [] }];

  let budget = WA_LIMITS.rows;
  const cleanSections = [];
  for (const section of rawSections) {
    if (budget <= 0) break;
    const rows = (section.rows || []).slice(0, budget).map((r, i) => {
      const { id, title, description } = normOption(r, i);
      const row = { id, title: clamp(title, WA_LIMITS.rowTitle) };
      if (description) row.description = clamp(description, WA_LIMITS.rowDescription);
      return row;
    });
    if (!rows.length) continue;
    budget -= rows.length;
    const out = { rows };
    if (section.title) out.title = clamp(section.title, WA_LIMITS.rowTitle);
    cleanSections.push(out);
  }

  if (!cleanSections.length) {
    return sendWhatsAppMessage(to, bodyText);
  }

  const interactive = {
    type: "list",
    body: { text: clamp(bodyText, WA_LIMITS.bodyText) },
    action: { button: clamp(buttonLabel || "Select", WA_LIMITS.listButton), sections: cleanSections },
  };
  if (header) interactive.header = { type: "text", text: clamp(header, WA_LIMITS.headerText) };
  if (footer) interactive.footer = { text: clamp(footer, WA_LIMITS.footerText) };

  return sendPayload({ to, type: "interactive", interactive }, "list");
}

/**
 * Single call-to-action URL button under a body of text. Use where the next
 * step is "go open this page" (e.g. Proposal Studio). Falls back to a plain
 * text message with the link if the interactive send is rejected.
 * @param {string} to
 * @param {string} bodyText
 * @param {string} buttonText   label on the button (<=20 chars)
 * @param {string} url          https URL to open
 * @param {object} [opts] { header, footer }
 */
export async function sendWhatsAppCtaUrl(to, bodyText, buttonText, url, { header, footer } = {}) {
  if (!url) return sendWhatsAppMessage(to, bodyText, { previewUrl: true });

  const interactive = {
    type: "cta_url",
    body: { text: clamp(bodyText, WA_LIMITS.bodyText) },
    action: {
      name: "cta_url",
      parameters: { display_text: clamp(buttonText || "Open", WA_LIMITS.buttonTitle), url },
    },
  };
  if (header) interactive.header = { type: "text", text: clamp(header, WA_LIMITS.headerText) };
  if (footer) interactive.footer = { text: clamp(footer, WA_LIMITS.footerText) };

  try {
    return await sendPayload({ to, type: "interactive", interactive }, "cta_url");
  } catch (err) {
    console.warn(
      "cta_url rejected, falling back to text link:",
      err.response?.data?.error?.message || err.message
    );
    return sendWhatsAppMessage(to, `${bodyText}\n\n${buttonText || "Open"}: ${url}`, {
      previewUrl: true,
    });
  }
}

/**
 * Mark an inbound message as read (blue ticks). Best-effort — never throws.
 * @param {string} messageId  the inbound message's `id` (wamid...)
 */
export async function markAsRead(messageId) {
  if (!messageId) return;
  try {
    await axios.post(
      API_URL,
      { messaging_product: "whatsapp", status: "read", message_id: messageId },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );
  } catch (err) {
    console.warn("markAsRead failed:", err.response?.data?.error?.message || err.message);
  }
}
