-- AWS Marketplace Publishing Workflow Migration (026)
-- Run this script once against the NeoZaar PostgreSQL database (hand-run, same as 018_azure_marketplace.sql).
--
-- Mirrors 018_azure_marketplace.sql. The workflow states are identical to the Azure
-- flow (PENDING_REVIEW | APPROVED | SUBMITTED | VALIDATING | PUBLISHED | FAILED | REJECTED);
-- AWS Marketplace Catalog API change-set states (PREPARING / APPLYING / SUCCEEDED /
-- FAILED / CANCELLED) are mapped onto these in the service layer, not the schema.

-- ============================================================
-- TABLE: aws_marketplace_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS aws_marketplace_requests (
  id                  SERIAL PRIMARY KEY,
  marketplace_type    VARCHAR(50)  NOT NULL DEFAULT 'aws',

  -- NeoZaar product reference
  product_id          INTEGER      NOT NULL,
  isv_user_id         BIGINT,                  -- the ISV who owns the product (NULL for NeoZaar-owned products)
  requested_by_user_id BIGINT      NOT NULL,   -- who clicked "Publish"
  reviewed_by_user_id  BIGINT,                 -- admin who approved/rejected

  -- Workflow state
  status              VARCHAR(30)  NOT NULL DEFAULT 'PENDING_REVIEW',
  -- PENDING_REVIEW | APPROVED | SUBMITTED | VALIDATING | PUBLISHED | FAILED | REJECTED
  rejection_reason    TEXT,

  -- AWS Marketplace Catalog API identifiers (populated across the two-step create)
  aws_product_type    VARCHAR(30)  DEFAULT 'SaaSProduct',   -- SaaSProduct | AmiProduct | ContainerProduct
  aws_entity_id       VARCHAR(255),            -- catalog EntityId, read back after CreateProduct succeeds
  aws_product_id      VARCHAR(255),            -- product code / ProductId
  aws_change_set_id   VARCHAR(255),            -- id of the last StartChangeSet call
  visibility          VARCHAR(20)  DEFAULT 'Limited',       -- Limited | Public

  -- Timestamps per stage
  submitted_at        TIMESTAMPTZ,
  validated_at        TIMESTAMPTZ,
  published_at        TIMESTAMPTZ,
  failed_at           TIMESTAMPTZ,

  -- JSON payloads
  validation_errors   JSONB,   -- DescribeChangeSet ErrorDetailList
  aws_response        JSONB,   -- last raw Catalog API response
  aws_payload         JSONB,   -- internal summary payload + admin-entered AWS config

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate active requests for the same product
CREATE UNIQUE INDEX IF NOT EXISTS uq_aws_active_request
  ON aws_marketplace_requests (product_id)
  WHERE status IN ('PENDING_REVIEW', 'APPROVED', 'SUBMITTED', 'VALIDATING');

-- General indexes
CREATE INDEX IF NOT EXISTS idx_awsmr_product_id ON aws_marketplace_requests (product_id);
CREATE INDEX IF NOT EXISTS idx_awsmr_status     ON aws_marketplace_requests (status);
CREATE INDEX IF NOT EXISTS idx_awsmr_isv_user   ON aws_marketplace_requests (isv_user_id);
CREATE INDEX IF NOT EXISTS idx_awsmr_created_at ON aws_marketplace_requests (created_at DESC);

-- ============================================================
-- TABLE: aws_marketplace_audit
-- ============================================================
CREATE TABLE IF NOT EXISTS aws_marketplace_audit (
  id               SERIAL PRIMARY KEY,
  request_id       INTEGER      NOT NULL REFERENCES aws_marketplace_requests(id) ON DELETE CASCADE,
  user_id          BIGINT,                  -- who performed the action (NULL = system)
  action           VARCHAR(50)  NOT NULL,   -- REQUEST_CREATED | APPROVED | REJECTED | SUBMITTED | VALIDATED | PUBLISHED | FAILED | RETRIED
  previous_status  VARCHAR(30),
  new_status       VARCHAR(30),
  aws_response     JSONB,
  error_info       JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_awsma_request_id ON aws_marketplace_audit (request_id);
CREATE INDEX IF NOT EXISTS idx_awsma_created_at ON aws_marketplace_audit (created_at DESC);

-- ============================================================
-- Auto-update updated_at on aws_marketplace_requests
-- ============================================================
CREATE OR REPLACE FUNCTION update_aws_marketplace_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_awsmr_updated_at ON aws_marketplace_requests;
CREATE TRIGGER trg_awsmr_updated_at
  BEFORE UPDATE ON aws_marketplace_requests
  FOR EACH ROW EXECUTE FUNCTION update_aws_marketplace_requests_updated_at();
