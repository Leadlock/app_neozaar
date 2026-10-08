-- Register the Marketing role (role_id 12 / role_type 'MARKETING').
-- Scoped to Marketing + Catalog features only; enforced in app code
-- (roles.config.js, marketing.middleware.js, catalog controllers/services,
-- and the Angular route guards + sidebar).
-- Idempotent: safe to re-run.
BEGIN;
INSERT INTO roles (role_id, role_type) VALUES (12, 'MARKETING')
ON CONFLICT (role_id) DO NOTHING;

-- The users.role_type column is guarded by a CHECK constraint enumerating the
-- allowed role_type strings. It must include 'MARKETING' or inserting/updating
-- a Marketing user fails (and the create-user endpoint 500s). Rebuild the
-- constraint to add it (idempotent: drop-if-exists then recreate).
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_type_check;
ALTER TABLE users ADD CONSTRAINT users_role_type_check CHECK (
  (role_type)::text = ANY (ARRAY[
    'CLIENT','ISV','ADMIN','SUPER_ADMIN','ROLE_MANAGER','SUPPORT_PARTNER',
    'M_SELLER','SELLER','AGENT','A_MANAGER','ISV_SELLER','USER','MARKETING'
  ]::text[])
);
COMMIT;

-- Verify
SELECT role_id, role_type FROM roles ORDER BY role_id;
