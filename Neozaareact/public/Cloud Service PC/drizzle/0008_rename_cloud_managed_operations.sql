UPDATE catalog_overrides
SET data_json = json_set(data_json, '$.family', 'Cloud Managed Operations')
WHERE sku GLOB 'NE0-001-*'
   OR sku GLOB 'NE0-002-*'
   OR sku GLOB 'NE0-003-*'
   OR sku GLOB 'NE0-004-*'
   OR sku GLOB 'NE0-005-*'
   OR sku GLOB 'NE0-006-*'
   OR sku GLOB 'NE0-007-*'
   OR sku GLOB 'NE0-018-*';

UPDATE custom_catalog_skus
SET data_json = json_set(data_json, '$.family', 'Cloud Managed Operations')
WHERE json_extract(data_json, '$.family') = 'Managed Services';

DELETE FROM calculator_families WHERE name = 'Managed Services';
