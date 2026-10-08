-- ============================================================
-- MIGRATION 037: DPDPA consent ledger + notice registry
-- Idempotent — safe to run multiple times.
-- ============================================================
--
-- CONTEXT
-- ─────────────────────────────────────────────────────────────
-- `user_consents` (migration 006) is a JWT-only, single-boolean
-- ('analytics') store. It cannot represent an anonymous visitor's
-- choice, the purpose scope, the exact notice shown, the UI
-- surface, or an audit trail — all of which the DPDP Act, 2023
-- s.5/s.6 and the demonstrability duty (s.8(5)) require.
--
-- This adds:
--   consent_events   — append-only, hash-chained log of every
--                      grant / withdraw / update / renew, for
--                      anonymous and signed-in subjects alike.
--                      Rows are NEVER updated (except the one
--                      deferred row_hash write inside the same
--                      txn that inserts them) or deleted.
--   consent_notices  — the full text of every notice version, so
--                      we can prove exactly what a subject saw.
--   dsar_requests    — data-principal request queue (access /
--                      correction / erasure / withdraw-all) with
--                      an SLA clock. Read-only in the console for
--                      v1; intake workflow comes later.
--
-- `user_consents` is kept as-is; the ledger service mirrors
-- analytics grants into it so existing /api/track gating
-- (middlewares/consent.js) keeps working unchanged.
--
-- See DPDPA-CONSENT-PLAN.md (repo root) — Phase 1.
-- ============================================================

BEGIN;

-- ── append-only consent event log ───────────────────────────
CREATE TABLE IF NOT EXISTS consent_events (
  id              bigserial     PRIMARY KEY,
  subject_type    varchar(10)   NOT NULL CHECK (subject_type IN ('anon','user')),
  anon_id         uuid          NOT NULL,                        -- first-party id, always set
  user_id         bigint        REFERENCES users(id),            -- set once the subject is known
  action          varchar(16)   NOT NULL CHECK (action IN ('grant','withdraw','update','renew')),
  purposes        jsonb         NOT NULL,                        -- {necessary:true,analytics:bool,marketing:bool}
  notice_version  varchar(20)   NOT NULL,
  notice_locale   varchar(12)   NOT NULL DEFAULT 'en',
  ui_surface      varchar(20)   NOT NULL CHECK (ui_surface IN ('banner','modal','settings','api')),
  policy_url      text,
  ip_hash         varchar(64),                                   -- sha256(salt + ip)
  ip_trunc        varchar(45),                                   -- last octet / hextet zeroed
  user_agent      text,
  country         varchar(2),
  source_app      varchar(30)   NOT NULL,                        -- 'neozaar.com' | 'portal' | ...
  prev_hash       varchar(64),                                   -- row_hash of the previous event ('' for genesis)
  row_hash        varchar(64)   NOT NULL DEFAULT '',             -- sha256(canonical_row + prev_hash)
  created_at      timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_consent_events_anon    ON consent_events (anon_id, id DESC);
CREATE INDEX IF NOT EXISTS ix_consent_events_user    ON consent_events (user_id, id DESC);
CREATE INDEX IF NOT EXISTS ix_consent_events_created ON consent_events (created_at DESC);
CREATE INDEX IF NOT EXISTS ix_consent_events_country ON consent_events (country);

COMMENT ON TABLE  consent_events            IS 'Append-only, hash-chained consent log (DPDP s.8(5) demonstrability). Never UPDATE/DELETE rows.';
COMMENT ON COLUMN consent_events.anon_id    IS 'First-party visitor id (nz_aid cookie / localStorage), set for every event including signed-in ones.';
COMMENT ON COLUMN consent_events.purposes   IS 'Resolved category state at this event: {necessary,analytics,marketing} booleans.';
COMMENT ON COLUMN consent_events.row_hash   IS 'sha256 of the canonical row joined with prev_hash; written once, in the inserting txn.';
COMMENT ON COLUMN consent_events.ip_hash    IS 'Salted sha256 of the request IP — correlation without storing the address.';

-- ── notice version registry ─────────────────────────────────
CREATE TABLE IF NOT EXISTS consent_notices (
  version        varchar(20)   NOT NULL,
  locale         varchar(12)   NOT NULL DEFAULT 'en',
  title          text          NOT NULL,
  body_html      text          NOT NULL,
  categories     jsonb         NOT NULL,      -- [{key,label,purpose,retention,recipients[]}]
  effective_from timestamptz   NOT NULL DEFAULT now(),
  effective_to   timestamptz,
  created_at     timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY (version, locale)
);

COMMENT ON TABLE consent_notices IS 'Exact text + category definitions of every consent-notice version shown, for proving what a subject saw.';

-- ── data-principal request queue ────────────────────────────
CREATE TABLE IF NOT EXISTS dsar_requests (
  id            bigserial    PRIMARY KEY,
  subject_email text         NOT NULL,
  anon_id       uuid,
  user_id       bigint       REFERENCES users(id),
  kind          varchar(20)  NOT NULL CHECK (kind IN ('access','correction','erasure','withdraw')),
  status        varchar(20)  NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','closed','rejected')),
  details       text,
  received_at   timestamptz  NOT NULL DEFAULT now(),
  due_at        timestamptz,
  closed_at     timestamptz,
  handler_note  text
);

CREATE INDEX IF NOT EXISTS ix_dsar_status ON dsar_requests (status, received_at);

COMMENT ON TABLE dsar_requests IS 'Data-principal requests (DPDP s.11-14). Read-only in the Consent Audit Console for v1.';

-- ── seed notice v1 / en ─────────────────────────────────────
-- The banner renders categories from this row. Bump the version
-- (and the frontend NOTICE_VERSION constant) whenever purposes,
-- recipients or retention change — that forces re-consent.
INSERT INTO consent_notices (version, locale, title, body_html, categories, effective_from)
VALUES (
  'v1', 'en',
  'We value your privacy',
  '<p>We use cookies to run this site and, with your consent, to understand how it is used. Necessary cookies are always on. You can accept or reject analytics, and change your choice any time from <strong>Cookie preferences</strong> in the footer.</p><p>Data Fiduciary: NeoZaar Technologies Pvt. Ltd. Grievances may be raised with our Compliance Officer (compliance@neozaar.com) and, if unresolved, with the Data Protection Board of India.</p>',
  '[
    {"key":"necessary","label":"Strictly necessary","purpose":"Authentication, session, security and load-balancing. Required for the site to function.","retention":"Session / up to 12 months","recipients":["NeoZaar"],"required":true},
    {"key":"analytics","label":"Analytics","purpose":"Measure and improve how the site is used (Google Analytics 4).","retention":"Up to 14 months","recipients":["Google LLC"],"required":false}
  ]'::jsonb,
  now()
)
ON CONFLICT (version, locale) DO NOTHING;

COMMIT;
