-- Apply the approved account-fee plus per-VM operating model as the new
-- catalogue baseline. Older admin overrides for these tier SKUs would
-- otherwise mask the revised scope, volume bands and USD reference rates.
DELETE FROM pricing_overrides
WHERE sku GLOB 'NE0-001-*'
   OR sku GLOB 'NE0-002-*'
   OR sku GLOB 'NE0-003-*';

DELETE FROM catalog_overrides
WHERE sku GLOB 'NE0-001-*'
   OR sku GLOB 'NE0-002-*'
   OR sku GLOB 'NE0-003-*';
