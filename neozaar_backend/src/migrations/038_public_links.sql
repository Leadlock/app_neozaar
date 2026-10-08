-- ============================================================
-- MIGRATION 038: public shareable links + engagement events
-- Idempotent — safe to run multiple times.
-- ============================================================
--
-- CONTEXT
-- ─────────────────────────────────────────────────────────────
-- Adds an admin-minted, no-login public web page for a campaign
-- or a single listing (product / service / solution), served at
-- FRONTEND_URL/p/<slug>. Multiple labelled links may point at
-- the same target so engagement can be split by channel.
--
--   public_links        — one row per shareable URL. `slug` is
--                         readable (title[+label]); `label` is an
--                         internal channel name only. A link is
--                         "live" when is_active AND not past
--                         expires_at AND its target row exists.
--   public_link_events  — append-only engagement log (view /
--                         cta_click / block_click). IPs are only
--                         ever stored hashed (daily salt), never
--                         raw — see PUBLIC-LINKS-PLAN.md §8.
--
-- target_id is polymorphic (products.id | campaigns.id) so it
-- carries no FK; the app resolves it per target_type.
--
-- See PUBLIC-LINKS-PLAN.md (repo root) — Phase 1.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public_links (
  id             bigserial     PRIMARY KEY,
  slug           text          NOT NULL UNIQUE,
  target_type    text          NOT NULL CHECK (target_type IN ('listing','campaign')),
  target_id      bigint        NOT NULL,
  label          text,
  is_active      boolean       NOT NULL DEFAULT true,
  expires_at     timestamptz,
  unlisted       boolean       NOT NULL DEFAULT false,
  created_by     bigint        REFERENCES users(id),
  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now(),
  deactivated_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_public_links_target
  ON public_links (target_type, target_id);

CREATE TABLE IF NOT EXISTS public_link_events (
  id          bigserial     PRIMARY KEY,
  link_id     bigint        NOT NULL REFERENCES public_links(id) ON DELETE CASCADE,
  event_type  text          NOT NULL CHECK (event_type IN ('view','cta_click','block_click')),
  occurred_at timestamptz   NOT NULL DEFAULT now(),
  ip_hash     text,
  user_agent  text,
  referrer    text,
  is_bot      boolean       NOT NULL DEFAULT false,
  meta        jsonb         NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_ple_link_time
  ON public_link_events (link_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_ple_link_type
  ON public_link_events (link_id, event_type);

COMMIT;
