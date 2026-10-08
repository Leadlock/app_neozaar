# Affiliate program migration

The affiliate schema is stored in `025_affiliate_program.sql` in this directory.
It creates the affiliate assignments, links, clicks, tokens, attributions,
contacts, campaigns, campaign sends, audit log, and attribution configuration
tables, along with their indexes and foreign keys. It also adds `users.ref_code`
if missing. The existing users, products, and CRM schema must already be present.

## Existing schema dependencies

`025` is the affiliate-specific migration, not a standalone installation of the
whole CRM. These existing files in this directory supply related schema:

| File | Relevant dependency |
| --- | --- |
| `003_update_roles.sql` and subsequent role updates in `006_missing_tables.sql` | Affiliate/manager role support; older role seeds must be reviewed against the target database |
| `005_fix_missing_columns.sql` | CRM stage/account fields and opportunity affiliate ID |
| `006_missing_tables.sql` | Seller assignments, category `allowed_types`, assignment uniqueness, and lead affiliate ID |
| `008_solution_fields.sql` | Product slug used for marketplace landing URLs |
| `009_add_verification_token.sql` | User email-verification token and lead source |
| `010_crm_reliability.sql` | Normalized email, CRM deduplication, scoring and progress fields |
| `011_crm_integration.sql` | Opportunity products, final deal value, and follow-up tracking |
| `021_crm_opportunity_product_type.sql` | Product/service/solution type on opportunities |
| `crm_v2_full_schema.sql` and `crm_v2_indexes.sql` | Base CRM tables, including personal notifications and their indexes |

This is a dependency map, not an instruction to rerun every historical migration
on an existing database. Base marketplace users/products/categories/company
tables are also required. The affiliate runner executes only `025`; it does not
install these prerequisites. `CREATE TABLE IF NOT EXISTS` does not repair an
older table that exists with missing columns.

## Audit on 2026-08-31

A read-only inspection of the configured local database checked 138 columns:
all columns declared for the ten affiliate tables in `025`, plus selected
registration, assignment, CRM, and notification prerequisites. None were missing.
The seller-assignment composite unique constraint was present. No status CHECK
constraints were found on affiliate attributions or campaigns, so the new status
values do not need an ALTER TABLE.

No migration-history table was found in the public schema. Therefore this confirms
current schema availability, not the exact historical list of scripts executed.
No additional affiliate schema migration was identified by this audit, and no
database migration was executed during it. Other deployment databases must be
checked separately.

## Applying the affiliate schema

To apply it to the database configured in the backend environment, run from the
`neozaar_backend` directory:

```powershell
node src/migrations/run_affiliate_migration.js
```

The runner reads `src/migrations/025_affiliate_program.sql`. Review the target
database configuration before running it. This documentation update does not
execute a migration.

The subsequent affiliate fixes (assignment visibility, required contact fields,
anonymous tracking, referral registration, awaiting-verification customer lists,
CRM scope, and notification routing) use the existing schema. They do not require
an additional migration. In particular, attribution `status` is a VARCHAR without
a status CHECK constraint, so `pending` needs no database change. Campaign
`partial` and `failed` statuses likewise use the existing VARCHAR column.

Registration attribution is saved before email delivery and activated by the
existing email-verification transaction. No migration backfills or reassigns
existing customers as part of these affiliate fixes, and no migration is needed
for the Angular UI changes.

## CTA opportunity data repair

`027_repair_cta_opportunity.js` is a targeted data-repair migration for a CTA
submission that created a legacy lead before the CRM opportunity upsert was
fixed. It accepts a `lead_details.id`, creates or reuses the corresponding CRM
customer and product opportunity, and preserves permanent affiliate attribution:

```powershell
node src/migrations/027_repair_cta_opportunity.js <lead_details_id>
```

This is not a schema migration and should only be run for a confirmed missed CTA
submission. Normal CTA submissions now create their opportunities directly.
