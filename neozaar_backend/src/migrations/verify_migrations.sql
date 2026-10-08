-- ============================================================
-- NEOZAAR MIGRATION VERIFICATION SCRIPT
-- Run this on the server and share the output
-- ============================================================

-- 1. CHECK: Which CRM tables exist
SELECT '=== CRM TABLES ===' AS section;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'crm_%'
ORDER BY table_name;

-- 2. CHECK: seller_assignments table exists?
SELECT '=== OTHER MIGRATION TABLES ===' AS section;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('seller_assignments')
ORDER BY table_name;

-- 3. CHECK: seller_id columns on crm_opportunities (migration 004)
SELECT '=== crm_opportunities COLUMNS (check seller_id) ===' AS section;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'crm_opportunities'
ORDER BY ordinal_position;

-- 4. CHECK: service_sub_options on isv_details
SELECT '=== isv_details COLUMNS (check service_sub_options) ===' AS section;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'isv_details'
ORDER BY ordinal_position;

-- 5. CHECK: What roles exist
SELECT '=== ROLES TABLE ===' AS section;
SELECT role_id, role_type FROM roles ORDER BY role_id;

-- 6. CHECK: users role_type constraint
SELECT '=== USERS ROLE_TYPE CONSTRAINT ===' AS section;
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'users_role_type_check';

-- 7. CHECK: lead_assigns constraint
SELECT '=== LEAD_ASSIGNS CONSTRAINT ===' AS section;
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE 'lead_assigns%';

-- 8. SUMMARY: All public tables (to see full picture)
SELECT '=== ALL TABLES ON SERVER ===' AS section;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
