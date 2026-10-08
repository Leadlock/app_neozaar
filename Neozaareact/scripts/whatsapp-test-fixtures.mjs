// Synthetic data for the existing simulation. Fixed disposable localhost cluster;
// deliberately does not read .env files or copy any customer/catalogue records.
import pg from 'pg';
import fs from 'node:fs/promises';
const config = { host: '127.0.0.1', port: 55439, user: 'wa_test', database: 'postgres' };
const admin = new pg.Pool(config);
if (!(await admin.query("SELECT 1 FROM pg_database WHERE datname='wa_regression'")).rowCount)
  await admin.query('CREATE DATABASE wa_regression');
await admin.end();
const pool = new pg.Pool({ ...config, database: 'wa_regression' });
try {
  const migration = name => fs.readFile(new URL(`../../neozaar_backend/src/migrations/${name}`, import.meta.url), 'utf8');
  for (const name of ['030_wa_sessions.sql', '035_wa_conversation_log.sql', '039_wa_human_mode.sql']) await pool.query(await migration(name));
  await pool.query(`CREATE TABLE IF NOT EXISTS lead_details (id bigserial PRIMARY KEY,
    status text, type text, action_id bigint, message text, action_type text, action_for text,
    contact_name text, contact_email text, contact_phone text, created_at timestamp, updated_at timestamp)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS products (
    id integer PRIMARY KEY, name text, brand_name text, brand text, short_description text,
    solution_differentiator text, category text[], subcategory text[], cloud_provider_support text[],
    starting_price numeric, has_private_offer boolean, slug text, action_type text,
    is_feature boolean, select_isv_products bigint[], select_spectrum_partner_services bigint[],
    is_publish boolean DEFAULT true, is_approved boolean DEFAULT true, deleted_at timestamp,
    action_for text DEFAULT 'customer', customer_challenges text[], use_cases text[]);
    INSERT INTO products(id,name,brand_name,short_description,category,action_type,select_isv_products,select_spectrum_partner_services)
    VALUES (1,'Endpoint Security','Test Vendor','Endpoint security solution',ARRAY['Enterprise Security'],'solution',ARRAY[2]::bigint[],ARRAY[3]::bigint[]),
      (2,'Barracuda Test Product','Barracuda','Test security product',ARRAY['Enterprise Security'],'product',NULL,NULL),
      (3,'Cloud Migration Service','Service','Cloud migration',ARRAY['Cloud'],'service',NULL,NULL),
      (4,'CrowdStrike Test Product','CrowdStrike','Test endpoint security',ARRAY['Enterprise Security'],'product',NULL,NULL)
      ,(5,'Security Operations','Test Vendor','Security operations solution',ARRAY['Enterprise Security'],'solution',NULL,NULL)
      ,(6,'Barracuda Test Alternative','Barracuda','Test alternative',ARRAY['Enterprise Security'],'product',NULL,NULL)
      ,(7,'Migration Assessment','Service','Migration readiness',ARRAY['Cloud'],'service',NULL,NULL)
    ON CONFLICT(id) DO NOTHING`);
  console.log('Synthetic WhatsApp simulation fixtures ready: 127.0.0.1:55439/wa_regression');
} finally { await pool.end(); }
