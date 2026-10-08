-- Azure Marketplace Publishing Workflow Migration
-- Run this script once against the NeoZaar PostgreSQL database.

-- ============================================================
-- TABLE: azure_marketplace_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS azure_marketplace_requests (
  id                  SERIAL PRIMARY KEY,
  marketplace_type    VARCHAR(50)  NOT NULL DEFAULT 'azure',    -- extensible for AWS etc.

  -- NeoZaar product reference
  product_id          INTEGER      NOT NULL,
  isv_user_id         BIGINT,                  -- the ISV who owns the product (NULL for NeoZaar-owned products)
  requested_by_user_id BIGINT      NOT NULL,   -- who clicked "Publish"
  reviewed_by_user_id  BIGINT,                 -- admin who approved/rejected

  -- Workflow state
  status              VARCHAR(30)  NOT NULL DEFAULT 'PENDING_REVIEW',
  -- PENDING_REVIEW | APPROVED | SUBMITTED | VALIDATING | PUBLISHED | FAILED | REJECTED
  rejection_reason    TEXT,

  -- Microsoft identifiers (populated after submission)
  ms_offer_id         VARCHAR(255),
  ms_product_id       VARCHAR(255),
  ms_job_id           VARCHAR(255),

  -- Timestamps per stage
  submitted_at        TIMESTAMPTZ,
  validated_at        TIMESTAMPTZ,
  published_at        TIMESTAMPTZ,
  failed_at           TIMESTAMPTZ,

  -- JSON payloads
  validation_errors   JSONB,   -- MS validation error list
  ms_response         JSONB,   -- last raw MS API response
  azure_payload       JSONB,   -- the payload that was sent to MS

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate active requests for the same product
CREATE UNIQUE INDEX IF NOT EXISTS uq_azure_active_request
  ON azure_marketplace_requests (product_id)
  WHERE status IN ('PENDING_REVIEW', 'APPROVED', 'SUBMITTED', 'VALIDATING');

-- General indexes
CREATE INDEX IF NOT EXISTS idx_amr_product_id ON azure_marketplace_requests (product_id);
CREATE INDEX IF NOT EXISTS idx_amr_status     ON azure_marketplace_requests (status);
CREATE INDEX IF NOT EXISTS idx_amr_isv_user   ON azure_marketplace_requests (isv_user_id);
CREATE INDEX IF NOT EXISTS idx_amr_created_at ON azure_marketplace_requests (created_at DESC);

-- ============================================================
-- TABLE: azure_marketplace_audit
-- ============================================================
CREATE TABLE IF NOT EXISTS azure_marketplace_audit (
  id               SERIAL PRIMARY KEY,
  request_id       INTEGER      NOT NULL REFERENCES azure_marketplace_requests(id) ON DELETE CASCADE,
  user_id          BIGINT,                  -- who performed the action (NULL = system)
  action           VARCHAR(50)  NOT NULL,   -- REQUEST_CREATED | APPROVED | REJECTED | SUBMITTED | VALIDATED | PUBLISHED | FAILED | RETRIED
  previous_status  VARCHAR(30),
  new_status       VARCHAR(30),
  ms_response      JSONB,
  error_info       JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ama_request_id ON azure_marketplace_audit (request_id);
CREATE INDEX IF NOT EXISTS idx_ama_created_at ON azure_marketplace_audit (created_at DESC);

-- ============================================================
-- Auto-update updated_at on azure_marketplace_requests
-- ============================================================
CREATE OR REPLACE FUNCTION update_azure_marketplace_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_amr_updated_at ON azure_marketplace_requests;
CREATE TRIGGER trg_amr_updated_at
  BEFORE UPDATE ON azure_marketplace_requests
  FOR EACH ROW EXECUTE FUNCTION update_azure_marketplace_requests_updated_at();
