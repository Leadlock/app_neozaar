-- Migration: Add service_sub_options column to isv_details table
-- Run this SQL against your PostgreSQL database

ALTER TABLE isv_details 
ADD COLUMN IF NOT EXISTS service_sub_options JSONB DEFAULT NULL;

-- Verify the column was added
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'isv_details' AND column_name = 'service_sub_options';
