-- ============================================================
-- MIGRATION 007: Fix bundles table — add missing columns &
--                drop NOT NULL constraints on optional fields
-- Safe to run multiple times (IF NOT EXISTS / IF EXISTS guards)
-- ============================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════
-- 1. Add missing columns
-- ══════════════════════════════════════════════════════════════
ALTER TABLE bundles
  ADD COLUMN IF NOT EXISTS select_isv_products              BIGINT[]     DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS product_role_in_bundle           VARCHAR(255),
  ADD COLUMN IF NOT EXISTS select_spectrum_partner_services BIGINT[]     DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS service_role_in_bundle           VARCHAR(255),
  ADD COLUMN IF NOT EXISTS spectrum_partners                BIGINT[]     DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS external_support_required        BOOLEAN      DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS type                             VARCHAR(50)  DEFAULT 'bundle',
  ADD COLUMN IF NOT EXISTS is_drapt                         BOOLEAN      DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_publish                       BOOLEAN      DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_approved                      BOOLEAN      DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_by                      INTEGER,
  ADD COLUMN IF NOT EXISTS published_by                     INTEGER,
  ADD COLUMN IF NOT EXISTS status                           VARCHAR(50)  DEFAULT 'pending';

-- ══════════════════════════════════════════════════════════════
-- 2. Drop NOT NULL constraints on optional fields &
--    set sensible defaults
-- ══════════════════════════════════════════════════════════════
ALTER TABLE bundles
  ALTER COLUMN bundle_type                DROP NOT NULL,
  ALTER COLUMN bundle_type                SET DEFAULT 'standard',
  ALTER COLUMN detailed_description       DROP NOT NULL,
  ALTER COLUMN primary_business_outcome   DROP NOT NULL,
  ALTER COLUMN target_customer_segments   DROP NOT NULL,
  ALTER COLUMN licensing_model            DROP NOT NULL,
  ALTER COLUMN delivery_mode              DROP NOT NULL,
  ALTER COLUMN workload_types             DROP NOT NULL,
  ALTER COLUMN supported_regions          DROP NOT NULL,
  ALTER COLUMN bundle_pricing_model       DROP NOT NULL,
  ALTER COLUMN engagement_duration        DROP NOT NULL,
  ALTER COLUMN cloud_provider_focus       DROP NOT NULL,
  ALTER COLUMN free_assessment_poc        DROP NOT NULL,
  ALTER COLUMN accept_bundle_listing_terms   DROP NOT NULL,
  ALTER COLUMN consent_data_privacy_policy   DROP NOT NULL;

COMMIT;
