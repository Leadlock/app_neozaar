# Neo — WhatsApp concierge

WhatsApp is an **engagement / discovery / routing** layer only:

```
DISCOVER  solution / product / service   (this bot)
DESIGN    Proposal Studio                (deep requirement work, off-platform)
BUY       Commercial Offer               (short capture here; team follows up)
TALK      NeoZaar expert                 (always one tap away)
```

No requirement discovery or scoping happens in WhatsApp. Catalogue answers come
only from published, approved rows; nothing invents availability, pricing or
eligibility.

## Module map

| File | Responsibility |
|---|---|
| `webhook/route.js`, `../webhook/whatsapp/route.js` | Meta webhook — GET verify, POST → `parseInbound` → `handleMessage` (both paths work; use either as the callback URL) |
| `lib/parseInbound.js` | normalises text / button / list / template replies into one shape |
| `lib/botService.js` | the router — 22 states, 6 flows, global commands, direct-intent shortcut |
| `lib/sessionStore.js` + `lib/sessionSchema.js` | conversation state in `wa_sessions` (24h TTL, self-creating) |
| `lib/catalogService.js` | solution / product / service queries against `products` |
| `lib/intentService.js` | keyword intent detection + optional LLM fallback |
| `lib/proposalStudio.js` | Proposal Studio deep link (context in query, no PII) |
| `lib/crmService.js` | commercial submit → cta-action + Bigin + `lead_details` |
| `lib/expertService.js` | expert handoff → Bookings link + tagged CRM record |
| `lib/leadsApi.js` | client for backend `POST /api/public/leads/cta-action` |
| `lib/whatsappService.js` | outbound Cloud API senders (text / buttons / list / cta_url) |
| `lib/messageLog.js` + `lib/conversationSchema.js` | self-logging — writes every message to `wa_messages` / `wa_contacts`, opt-out flag |

## Conversation log (self-logging)

Meta gives no API to fetch past messages and the number is Cloud-API-only (no
inbox), so the bot records every message itself.

- **`wa_messages`** — full transcript, inbound + outbound. `logInbound` (awaited,
  before routing) and `logOutbound` (awaited inside `whatsappService.sendPayload`,
  so row order == send order). Both best-effort — a logging failure never breaks a
  reply.
- **`wa_contacts`** — one row per number: profile name, first/last seen, message
  count, last state/intent, `opted_out`. The "who has messaged us" list.
- **Opt-out** — `stop` / `unsubscribe` → `opted_out = true` + one ack, then the
  bot stays silent; `start` clears it.
- **Read API** (backend, SUPER_ADMIN): `/api/internal/whatsapp/{stats, contacts,
  conversations/:phone, conversations/:phone/export, DELETE conversations/:phone}`.
  Deletes are written to `crm_audit_logs`.
- **UI**: portal admin → **User Setting → WhatsApp Log** (`/whatsapp-conversations`), SUPER_ADMIN only.
- **Retention**: `neozaar_backend` cron `waMessageRetention.cron.js` hard-deletes
  `wa_messages` older than `WA_MSG_RETENTION_DAYS` (default 545 ≈ 18 months),
  daily 03:30. `wa_contacts` is kept indefinitely; pruned only via the DELETE
  endpoint on a deletion request.
- Migration: `neozaar_backend/src/migrations/035_wa_conversation_log.sql` (or the
  bot self-creates the tables on first message).
- CRM linkage is a live join on `crm_leads.phone_normalized` — nothing denormalised.

## Environment variables

### Required

| Var | Purpose | If missing |
|---|---|---|
| `WHATSAPP_TOKEN` | Meta Cloud API token (System User token in prod) | outbound sends fail |
| `WHATSAPP_PHONE_NUMBER_ID` | sender phone-number id | outbound sends fail |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | echoed during Meta's GET verify handshake | webhook won't verify |
| `WA_DB_HOST` / `WA_DB_PORT` / `WA_DB_NAME` / `WA_DB_USER` / `WA_DB_PASSWORD` | proddb (catalogue + sessions). Falls back to `DB_*` | bot can't run |
| `NEXT_PUBLIC_API_BASE` | backend base, e.g. `https://api.neozaar.com/api/` — used for CRM intake | cta-action skipped (Bigin + `lead_details` still write) |
| `NEXT_PUBLIC_API_WEBSITE` | public site origin — catalogue "View" links + Studio deep link. **Build-time** (`NEXT_PUBLIC_*` is inlined at build) | links omitted; Neo says "ask our team for your link" |
| `NEXT_PUBLIC_MS_BOOKINGS_URL` | expert handoff booking page | handoff says "an expert will reach out on this number" |
| `BIGIN_CLIENT_ID` / `BIGIN_CLIENT_SECRET` / `BIGIN_REFRESH_TOKEN` / `BIGIN_ACCOUNTS_URL` / `BIGIN_API_URL` | Zoho Bigin sink | that sink logs failure; others proceed |

### Optional

| Var | Default | Purpose |
|---|---|---|
| `NEO_LLM_INTENT` | `false` | `true` enables the LLM intent fallback (keyword tier always runs first; model is called only at neutral points) |
| `OPENAI_API_KEY` | — | required only when `NEO_LLM_INTENT=true` (`gpt-4o-mini`) |
| `WHATSAPP_GRAPH_VERSION` | `v25.0` | pin the Meta Graph API version |
| `WHATSAPP_TEST_PHONE` | — | recipient for `GET /allapi/whatsapp/test` |
| `WHATSAPP_BUSINESS_ID` | — | WABA id (debug route / future template management) |
| `WA_MSG_RETENTION_DAYS` | `545` | **backend `.env`** — how long `wa_messages` is kept before the retention cron deletes it |

> The bot vars live in `.env.local`, which is Next's **dev** file and is not
> deployed. On the server they must be set in the platform environment (or
> `.env.production`), and `NEXT_PUBLIC_*` must be present **at build time**.
> `WA_MSG_RETENTION_DAYS` is read by `neozaar_backend` (the cron), so it belongs
> in the backend `.env`, not the frontend one.

## One-time setup

1. **Migration** — `neozaar_backend/src/migrations/030_wa_sessions.sql`:
   ```bash
   PGPASSWORD=<pw> psql -h <host> -p 5432 -U <user> -d proddb -f src/migrations/030_wa_sessions.sql
   ```
   (or skip it — `wa_sessions` self-creates on the first inbound message.)

2. **Meta webhook** — in the WhatsApp app config set the callback URL to
   `https://<host>/webhook/whatsapp` (or `/allapi/whatsapp/webhook`), the verify
   token to `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, and subscribe to the **`messages`**
   field.

## Testing

```bash
npm run sim:whatsapp          # full router simulation vs the DB, all HTTP mocked
```

```bash
# live outbound smoke (sends a real WhatsApp message to WHATSAPP_TEST_PHONE)
curl https://<host>/allapi/whatsapp/test

# config / DB / Bigin diagnostics
curl https://<host>/webhook/whatsapp/debug
curl https://<host>/webhook/whatsapp/debug-bigin
```

Reset a conversation from the customer side: send `reset`. Jump to the menu:
send `menu`.

## Known follow-ups

- **Opportunity stage** — `cta-action` uses the lifecycle engine's default
  stage. Stamping `"Commercial Offer Requested"` (spec §8) exactly needs a
  `stage` passthrough param on that backend endpoint.
- **Proposal Studio context** — the deep link carries `?solution=…&product=…`
  etc., but `/proposal-studio` → `/neo` doesn't read them yet (a small frontend
  change; deferred by decision).
- **Expert alert** — no Slack/email alert on handoff yet (`TODO(expert alert)` in
  `expertService.js`); the Bookings link + CRM record are the current handoff.
- **Business-initiated messaging** — Neo only replies inside the 24h window. Any
  proactive re-engagement needs an approved WhatsApp template + a trigger.
