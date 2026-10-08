-- ============================================================================
-- MIGRATION SCRIPT: Solution Brochure URLs in products.brochures column
-- From: neozaarassets.blob.core.windows.net/assets/assets/<timestamp>_<id>_<name>.pdf
-- To:   neoblob.blob.core.windows.net/neoblobcontainer/<clean name>.pdf
-- ============================================================================
-- Database: PostgreSQL 16+
-- Table: products (brochures column is text[] array)
-- ============================================================================
-- IMPORTANT: 
--   1. Take a backup before running
--   2. Run inside a transaction
--   3. Verify results before COMMIT
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Create a helper function that transforms old URLs to new URLs
-- by extracting the filename, removing timestamp/id prefix, replacing 
-- underscores with spaces, and building the new blob URL.
-- ============================================================================

CREATE OR REPLACE FUNCTION pg_temp.transform_brochure_url(old_url text)
RETURNS text AS $$
DECLARE
    filename text;
    clean_name text;
BEGIN
    -- Extract everything after the last '/' in the URL
    filename := substring(old_url from '.*/(.+)$');
    
    IF filename IS NULL THEN
        RETURN old_url;
    END IF;
    
    -- Remove the leading timestamp_id_ prefix pattern (digits_digits_)
    -- Some files have double prefix like: 1781000403649_9692_1772198019651_4651_Name.pdf
    -- Handle double prefix first
    clean_name := regexp_replace(filename, '^[0-9]+_[0-9]+_[0-9]+_[0-9]+_', '');
    -- If nothing changed, try single prefix
    IF clean_name = filename THEN
        clean_name := regexp_replace(filename, '^[0-9]+_[0-9]+_', '');
    END IF;
    
    -- Replace underscores with spaces (but not in extensions)
    clean_name := regexp_replace(clean_name, '_', ' ', 'g');
    
    -- Fix the extension: ".pdf" should stay as ".pdf"
    -- (spaces in extension area won't happen since .pdf has no underscores)
    
    -- Remove trailing " (1)" or " (2)" etc from filename (before extension)
    clean_name := regexp_replace(clean_name, ' \([0-9]+\)\.pdf$', '.pdf');
    
    -- Build the new URL
    RETURN 'https://neoblob.blob.core.windows.net/neoblobcontainer/' || clean_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 2: Create a function to transform all elements in a text[] array
-- ============================================================================

CREATE OR REPLACE FUNCTION pg_temp.transform_brochure_array(arr text[])
RETURNS text[] AS $$
DECLARE
    result text[] := '{}';
    elem text;
BEGIN
    IF arr IS NULL THEN
        RETURN NULL;
    END IF;
    FOREACH elem IN ARRAY arr
    LOOP
        IF elem LIKE '%neozaarassets.blob.core.windows.net%' THEN
            result := array_append(result, pg_temp.transform_brochure_url(elem));
        ELSE
            result := array_append(result, elem);
        END IF;
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 3: Run the migration - update all brochures that contain old URLs
-- ============================================================================

UPDATE products
SET brochures = pg_temp.transform_brochure_array(brochures)
WHERE array_to_string(brochures, '||') LIKE '%neozaarassets.blob.core.windows.net%';

-- ============================================================================
-- STEP 4: VERIFICATION - Check no brochure URLs still point to neozaarassets
-- ============================================================================

-- This should return 0 rows if migration was successful
SELECT id, name, b AS old_brochure_url
FROM products, unnest(brochures) AS b
WHERE b LIKE '%neozaarassets%'
ORDER BY id;

-- ============================================================================
-- STEP 5: Preview some transformed URLs to sanity-check
-- ============================================================================

SELECT id, name, b AS new_brochure_url
FROM products, unnest(brochures) AS b
WHERE b LIKE '%neoblob.blob.core.windows.net%'
ORDER BY id
LIMIT 20;

-- ============================================================================
-- STEP 6: COMMIT or ROLLBACK
-- ============================================================================
-- If verification looks good (0 rows returned in step 4):
-- COMMIT;

-- If something went wrong:
-- ROLLBACK;
