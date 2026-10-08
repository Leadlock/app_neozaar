CREATE TABLE public.users (
	id serial4 NOT NULL,
	role_id int4 NOT NULL,
	role_type varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	mobile varchar(20) NULL,
    designation varchar(255) NULL,
	email varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT users_email_key UNIQUE (email),
	CONSTRAINT users_id_unique PRIMARY KEY (id),
	CONSTRAINT users_role_type_check CHECK (((role_type)::text = ANY ((ARRAY['CLIENT'::character varying, 'ISV'::character varying, 'ADMIN'::character varying, 'SUPPORT_PARTNER'::character varying, 'COSELLER'::character varying])::text[])))
);

ALTER TABLE public.users
	ADD COLUMN is_email_verified BOOLEAN DEFAULT FALSE NOT NULL,
	ADD COLUMN is_mobile_verified BOOLEAN DEFAULT FALSE NOT NULL,

CREATE TABLE public.company_detail (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    action_id BIGINT NOT NULL,
    action_type VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    registered_business_name VARCHAR(255),
    brand_name VARCHAR(255),
    brand_logo VARCHAR(255), -- assuming URL or filename as string
    company_registration_number VARCHAR(100),
    Legal_entity_type VARCHAR(100),
    tax_id VARCHAR(100),
    headquater_country VARCHAR(100),
    website_url VARCHAR(255),
    linkedin_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_by BIGINT,
    updated_by BIGINT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE public.isv_details (
	id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	user_id bigint NOT NULL,
	cloud_partnership varchar(255) NULL,
	existing_marketplace_listing text NULL,
	competencies_certificate text NULL,
	preferred_engagement text NULL,
	business_certification text NULL,
    competencies_certifications text NULL,
	neozaar_tc boolean default false,
	data_privacy boolean default false,
	is_active BOOLEAN DEFAULT TRUE,
    created_by BIGINT,
    updated_by BIGINT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.support_partner (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    solution_partner_type VARCHAR(255),
    primary_cloud_alignment TEXT[],
    core_service_offer TEXT,
    vertical_experties TEXT,
    partner_program_membership TEXT,
    competencies_certificate text NULL,    
    preferred_engagement_modal TEXT,         -- replaced LONGTEXT with TEXT
    company_profile_upload VARCHAR(255),
    case_studies TEXT,
    business_certification TEXT,
    neozaar_tc BOOLEAN DEFAULT FALSE,
    data_privacy BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by BIGINT,
    updated_by BIGINT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);


CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,

    name VARCHAR(255) NOT NULL,
    short_description TEXT NOT NULL,
    long_description TEXT NOT NULL,
    key_features TEXT NOT NULL,
    primary_use_cases TEXT NOT NULL,
    target_audience TEXT[] NOT NULL,          -- multi-select
    category_subcategory TEXT[] NOT NULL,     -- multi-select
    cloud_provider_support TEXT[] NOT NULL,   -- multi-select
    supported_aws_services TEXT[],             -- multi-select, optional
    supported_azure_services TEXT[],           -- multi-select, optional
    regions_supported TEXT[] NOT NULL,         -- multi-select
    cta_model  TEXT[] NOT NULL,
    technical_prerequisites TEXT NOT NULL,
    pricing_model VARCHAR(50) NOT NULL,
    billing_dimension TEXT,
    license_model TEXT,
    free_trial_available BOOLEAN NOT NULL,
    sku_id VARCHAR(100),
    api_metering_endpoint TEXT,
    -- File uploads as URLs or arrays of URLs
    sla_documents TEXT[],                -- multi-file URLs (SLA docs)
    product_logo VARCHAR(500),           -- single logo URL
    screenshots TEXT[],                  -- up to 5 screenshots URLs
    brochures TEXT[],                    -- multi-file brochures/datasheets URLs
    demo_video_link VARCHAR(500),        -- URL string (YouTube/Vimeo/etc.)
    customer_case_studies TEXT[],        -- multi-file case studies URLs

    eula_url VARCHAR(500) NOT NULL,
    privacy_policy_url VARCHAR(500) NOT NULL,
    compliance_certifications TEXT[],    -- ISO 27001, SOC2, HIPAA, GDPR, etc.
    export_control_info TEXT,

    accept_marketplace_terms BOOLEAN NOT NULL,
    consent_data_privacy_policy BOOLEAN NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE bundles (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,

    name VARCHAR(255) NOT NULL,
    bundle_type VARCHAR(255) NOT NULL,
    short_description TEXT NOT NULL,             -- max 250 chars
    detailed_description TEXT NOT NULL,
    primary_business_outcome TEXT[] NOT NULL,     -- multi-select
    target_customer_segments VARCHAR(50) NOT NULL,
    licensing_model VARCHAR(50) NOT NULL,
    delivery_mode VARCHAR(50) NOT NULL,
    workload_types VARCHAR(100) NOT NULL,
    supported_regions TEXT[] NOT NULL,            -- multi-select
    bundle_pricing_model VARCHAR(50) NOT NULL,
    indicative_price_range TEXT,
    free_assessment_poc BOOLEAN NOT NULL,
    engagement_duration VARCHAR(50) NOT NULL,
    cloud_provider_focus TEXT[] NOT NULL,

 select_isv_products BIGINT[] DEFAULT '{}'::BIGINT[],
    product_role_in_bundle VARCHAR(255),
    select_spectrum_partner_services BIGINT[] DEFAULT '{}'::BIGINT[],
    service_role_in_bundle VARCHAR(255),
    spectrum_partners BIGINT[] DEFAULT '{}'::BIGINT[]
    -- File uploads as URLs or arrays of URLs
    bundle_logo VARCHAR(500),                    -- single logo URL
    datasheets TEXT[],                            -- multi-file datasheets/brochures URLs
    case_studies TEXT[],                          -- multi-file case studies URLs
    demo_video_url VARCHAR(500),                  -- URL string (YouTube/Vimeo/etc.)

    accept_bundle_listing_terms BOOLEAN NOT NULL,
    consent_data_privacy_policy BOOLEAN NOT NULL,
    external_support_required BOOLEAN,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE bundle_products (
    id SERIAL PRIMARY KEY,
    bundle_id INT NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_role_in_bundle VARCHAR(255),           -- e.g., Backup Software, AI Engine, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (bundle_id, product_id)
);


CREATE TABLE bundle_partner_services (
    id SERIAL PRIMARY KEY,
    bundle_id INT NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
    partner_service_id INT NOT NULL,                  -- FK to partner_services table if exists
    service_role_in_bundle VARCHAR(50),               -- Deployment, Integration, Managed Support, Training, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE bundle_spectrum_partners (
    id SERIAL PRIMARY KEY,
    bundle_id INT NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
    partner_id INT NOT NULL,                          -- FK to partners table if exists
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Enable pgcrypto if you want UUIDs (optional)
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- First create a function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Main lead details table
CREATE TABLE lead_details (
    id SERIAL PRIMARY KEY,
    buyer_name VARCHAR(150),
    email VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    region VARCHAR(50),
    comments TEXT,
    status VARCHAR(20) NOT NULL CHECK (
        status IN ('new','contacted','qualified','proposal_sent','negotiation','won','lost','cancelled')
    ),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for lead_details
CREATE TRIGGER set_timestamp_lead_details
BEFORE UPDATE ON lead_details
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- Table for storing demo request leads
CREATE TABLE demo_leads (
    id SERIAL PRIMARY KEY,
    lead_id BIGINT REFERENCES lead_details(id),
    role_title VARCHAR(100),
    use_case TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_timestamp_demo_leads
BEFORE UPDATE ON demo_leads
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- Table for storing private offer request leads
CREATE TABLE private_offer_leads (
    id SERIAL PRIMARY KEY,
    lead_id BIGINT REFERENCES lead_details(id),
    aws_account_id VARCHAR(20),
    desired_pricing TEXT,
    term_length VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_timestamp_private_offer_leads
BEFORE UPDATE ON private_offer_leads
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX products_search_idx ON products USING GIN(to_tsvector('english',name || ' ' || brand || ' ' || description));

-- Table for storing direct purchases (Buy Now)
CREATE TABLE purchases (
    id SERIAL PRIMARY KEY,
    lead_id BIGINT REFERENCES lead_details(id),
    aws_account_id VARCHAR(20),
    product_id INTEGER NOT NULL,
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    entitlement_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_timestamp_purchases
BEFORE UPDATE ON purchases
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
