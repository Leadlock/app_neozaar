-- Fix: Update the lead_assigns CHECK constraint to allow COSELLER and AGENT assign_user_type values
-- The original constraint only allows: 'isv', 'client', 'SUPPORT_PARTNER'
-- We need to also allow: 'COSELLER', 'AGENT'

-- Drop the old constraint
ALTER TABLE public.lead_assigns DROP CONSTRAINT IF EXISTS lead_assigns_assign_user_type_check;

-- Add updated constraint with COSELLER and AGENT
ALTER TABLE public.lead_assigns ADD CONSTRAINT lead_assigns_assign_user_type_check 
  CHECK ((assign_user_type)::text = ANY (ARRAY[
    'isv'::text, 
    'client'::text, 
    'SUPPORT_PARTNER'::text,
    'COSELLER'::text,
    'AGENT'::text
  ]));
