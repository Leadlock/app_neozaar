DELETE FROM pricing_overrides WHERE sku IN ('NE0-022-001', 'NE0-022-002');
DELETE FROM catalog_overrides WHERE sku IN ('NE0-022-001', 'NE0-022-002');
DELETE FROM custom_catalog_skus WHERE data_json LIKE '%"family":"Campaigns"%';
DELETE FROM calculator_families WHERE name = 'Campaigns';
