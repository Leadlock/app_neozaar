/**
 * Normalises a Meta WhatsApp webhook payload into a single flat object the
 * conversation router can consume, regardless of whether the customer typed
 * text, tapped a reply button, picked a list row, or tapped a template button.
 *
 * Meta wraps everything in entry[].changes[].value; a single POST can also
 * carry status receipts (sent/delivered/read) instead of a message — those
 * return null here and the webhook route just acks them.
 */

/**
 * @typedef {Object} InboundMessage
 * @property {string}  from          sender in E.164 without '+'
 * @property {string|null} profileName  WhatsApp display name, if present
 * @property {string}  messageId     inbound wamid (for mark-as-read / dedupe)
 * @property {string}  timestamp     unix seconds, as sent by Meta
 * @property {string}  type          text | interactive | button | <media> | ...
 * @property {string}  text          best-effort text: typed body, or the
 *                                   chosen option's title, or a media caption
 * @property {string|null} choiceId  reply id for button/list/template taps
 * @property {string|null} choiceTitle  human label of the tapped option
 * @property {object}  raw           the untouched Meta `message` object
 */

/**
 * @param {any} body  parsed JSON body of the webhook POST
 * @returns {InboundMessage|null}  null for non-message webhooks (status receipts,
 *                                 empty/unknown payloads)
 */
export function parseInboundMessage(body) {
  const value = body?.entry?.[0]?.changes?.[0]?.value;
  if (!value) return null;

  const message = value.messages?.[0];
  if (!message) return null; // status receipt or something we don't handle

  const profileName = value.contacts?.[0]?.profile?.name || null;
  const type = message.type;

  let text = "";
  let choiceId = null;
  let choiceTitle = null;

  switch (type) {
    case "text":
      text = (message.text?.body || "").trim();
      break;

    case "interactive": {
      const interactive = message.interactive || {};
      const reply =
        interactive.type === "button_reply"
          ? interactive.button_reply
          : interactive.type === "list_reply"
          ? interactive.list_reply
          : null;
      choiceId = reply?.id || null;
      choiceTitle = reply?.title || null;
      text = (choiceTitle || "").trim();
      break;
    }

    case "button":
      // Quick-reply button on a template message.
      choiceId = message.button?.payload || null;
      choiceTitle = message.button?.text || null;
      text = (choiceTitle || "").trim();
      break;

    default:
      // media (image/video/audio/document/sticker), location, contacts,
      // reaction, order, system... no routable text beyond an optional caption.
      text = (message[type]?.caption || "").trim();
      break;
  }

  return {
    from: message.from,
    profileName,
    messageId: message.id,
    timestamp: message.timestamp,
    type,
    text,
    choiceId,
    choiceTitle,
    raw: message,
  };
}

/**
 * Convenience for logging/metrics: summarise a webhook POST without dumping the
 * whole payload.
 */
export function describeWebhook(body) {
  const value = body?.entry?.[0]?.changes?.[0]?.value;
  if (!value) return "unrecognised payload";
  if (value.statuses?.length) {
    const s = value.statuses[0];
    return `status: ${s.status} for ${s.recipient_id}`;
  }
  if (value.messages?.length) {
    const m = value.messages[0];
    return `message: ${m.type} from ${m.from}`;
  }
  return "no messages or statuses";
}
