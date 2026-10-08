ALTER TABLE isv_users
    ADD COLUMN product_name VARCHAR(255),
    ADD COLUMN cloud_platforms TEXT[],
    DROP COLUMN name,
    ADD COLUMN first_name VARCHAR(255),
    ADD COLUMN last_name VARCHAR(255);

ALTER TABLE partner_users
    ALTER COLUMN partner_type TYPE TEXT[] USING string_to_array(partner_type, ','),
    ADD COLUMN expertise TEXT[],
    ADD COLUMN interests TEXT[],
    ADD COLUMN notes TEXT;

ALTER TABLE partner_users
ALTER COLUMN role TYPE VARCHAR(100);

ALTER TABLE partner_users
    drop column name,
    ADD COLUMN full_name VARCHAR(255);

ALTER TABLE enquiries
ADD COLUMN assigned_by INTEGER REFERENCES users(id),
ADD COLUMN assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE products ADD COLUMN approval BOOLEAN DEFAULT false;

ALTER TABLE products
DROP COLUMN product_ids;

ALTER TABLE products
ADD COLUMN product_ids JSONB;


ALTER TABLE products ADD COLUMN has_private_offer BOOLEAN DEFAULT false;


ALTER TABLE enquiries
ALTER COLUMN status DROP DEFAULT,
ALTER COLUMN status TYPE BOOLEAN USING (status = 'true'),
ALTER COLUMN status SET DEFAULT false;


ALTER TABLE products
ALTER COLUMN image_url TYPE TEXT
USING image_url::TEXT;





-- CREATE TABLE enquiries (
--     id SERIAL PRIMARY KEY,
--     user_id INTEGER REFERENCES users(id),
--     product_id INTEGER REFERENCES products(id),

--     -- New Fields from Form UI
--     full_name VARCHAR(100) NOT NULL,  -- Full Name of the person enquiring
--     business_email VARCHAR(150) NOT NULL,  -- Business Email (avoid Gmail/Yahoo)
--     phone_number VARCHAR(20),  -- Optional contact number for follow-up
--     company_name VARCHAR(100),  -- Optional but helpful for B2B context
--     query TEXT NOT NULL,  -- The main enquiry content or requirement
--     preferred_contact_method VARCHAR(20),  -- How the user prefers to be contacted (Email / Call / WhatsApp)
--     consent BOOLEAN NOT NULL DEFAULT FALSE,  -- Checkbox consent to receive communications

--     -- Existing Fields
--     ASSIGN_TO INTEGER REFERENCES users(id),
--     enquiry_type VARCHAR(50),
--     status VARCHAR(50), 
--     remarks TEXT,

--     created_by INTEGER REFERENCES users(id),
--     created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
--     updated_by INTEGER REFERENCES users(id),
--     updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
--     assigned_by INTEGER REFERENCES users(id),
--     assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

--     CONSTRAINT enquiries_id_unique UNIQUE (id)
-- );
