-- ============================================================================
-- BULK INGREDIENT PROCESSING SCRIPT
-- ============================================================================
-- This script processes all product variants to:
-- 1. Extract unique ingredients from ingredient_list_text
-- 2. Insert missing ingredients into the ingredients table
-- 3. Create ingredient-variant relationships in variant_ingredient_analysis
-- ============================================================================

-- Step 1: Extract all unique ingredients and insert missing ones
WITH all_ingredients AS (
  SELECT DISTINCT
    TRIM(unnest(string_to_array(ingredient_list_text, ','))) as ingredient_name
  FROM product_variants pv
  WHERE pv.ingredient_list_text IS NOT NULL 
    AND pv.ingredient_list_text != ''
),
unique_ingredients AS (
  SELECT DISTINCT ingredient_name
  FROM all_ingredients
  WHERE LENGTH(TRIM(ingredient_name)) > 0
    AND ingredient_name NOT LIKE '%]%' -- Remove malformed entries
),
existing_ingredients AS (
  SELECT name FROM ingredients
),
new_ingredients AS (
  SELECT ui.ingredient_name
  FROM unique_ingredients ui
  LEFT JOIN existing_ingredients ei ON LOWER(ui.ingredient_name) = LOWER(ei.name)
  WHERE ei.name IS NULL
)
INSERT INTO ingredients (name, is_toxic, is_controversial, tags)
SELECT 
  ingredient_name,
  false as is_toxic,
  false as is_controversial,
  '{}' as tags
FROM new_ingredients
ON CONFLICT (name) DO NOTHING;

-- Step 2: Create ingredient-variant relationships
-- Note: This processes variants in batches to avoid timeout
-- You may need to run this multiple times or adjust the LIMIT

WITH ingredient_positions AS (
  SELECT 
    pv.id as variant_id,
    TRIM(unnest(string_to_array(pv.ingredient_list_text, ','))) as ingredient_name,
    row_number() OVER (PARTITION BY pv.id ORDER BY ordinality) as position_num
  FROM product_variants pv,
       unnest(string_to_array(pv.ingredient_list_text, ',')) WITH ORDINALITY
  WHERE pv.ingredient_list_text IS NOT NULL 
    AND pv.ingredient_list_text != ''
    AND pv.id NOT IN (SELECT DISTINCT variant_id FROM variant_ingredient_analysis) -- Only process unprocessed variants
),
cleaned_ingredients AS (
  SELECT 
    variant_id,
    ingredient_name,
    position_num
  FROM ingredient_positions
  WHERE LENGTH(TRIM(ingredient_name)) > 0
    AND ingredient_name NOT LIKE '%]%'
),
ingredient_mapping AS (
  SELECT 
    ci.variant_id,
    ci.ingredient_name,
    ci.position_num,
    i.id as ingredient_id
  FROM cleaned_ingredients ci
  JOIN ingredients i ON LOWER(ci.ingredient_name) = LOWER(i.name)
)
INSERT INTO variant_ingredient_analysis (
  variant_id,
  ingredient_id,
  ingredient_name,
  position_in_list,
  is_primary_ingredient,
  analysis_notes
)
SELECT 
  variant_id,
  ingredient_id,
  ingredient_name,
  position_num as position_in_list,
  position_num <= 5 as is_primary_ingredient,
  NULL as analysis_notes
FROM ingredient_mapping;

-- Step 3: Verification queries
-- Run these to check the results:

-- Check total counts
SELECT 
  (SELECT COUNT(*) FROM ingredients) as total_ingredients,
  (SELECT COUNT(*) FROM variant_ingredient_analysis) as total_relationships,
  (SELECT COUNT(DISTINCT variant_id) FROM variant_ingredient_analysis) as variants_processed,
  (SELECT COUNT(*) FROM product_variants WHERE ingredient_list_text IS NOT NULL) as total_variants_with_ingredients;

-- Check processing progress
SELECT 
  COUNT(DISTINCT pv.id) as total_variants,
  COUNT(DISTINCT via.variant_id) as processed_variants,
  ROUND(
    (COUNT(DISTINCT via.variant_id)::DECIMAL / COUNT(DISTINCT pv.id)) * 100, 
    2
  ) as processing_percentage
FROM product_variants pv
LEFT JOIN variant_ingredient_analysis via ON pv.id = via.variant_id
WHERE pv.ingredient_list_text IS NOT NULL;

-- Sample ingredient-variant relationships
SELECT 
  pv.id as variant_id,
  pv.variant_name_suffix,
  via.ingredient_name,
  via.position_in_list,
  via.is_primary_ingredient
FROM product_variants pv
JOIN variant_ingredient_analysis via ON pv.id = via.variant_id
WHERE pv.id IN (SELECT id FROM product_variants LIMIT 3)
ORDER BY pv.id, via.position_in_list
LIMIT 20;
