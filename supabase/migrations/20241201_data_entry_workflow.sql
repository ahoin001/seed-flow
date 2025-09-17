-- Migration: Enhanced Data Entry Workflow for Pawdi Competitor
-- This migration adds tools for handling messy, unstandardized pet food data

-- ============================================================================
-- DATA VALIDATION AND CLEANUP
-- ============================================================================

-- Add data quality tracking
CREATE TABLE IF NOT EXISTS data_quality_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    quality_score DECIMAL(3,2) NOT NULL,
    issues_found TEXT[],
    validation_rules_failed TEXT[],
    auto_fixes_applied TEXT[],
    manual_review_required BOOLEAN DEFAULT false,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add data entry sessions for tracking bulk imports
CREATE TABLE IF NOT EXISTS data_entry_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    session_name VARCHAR(200),
    import_source VARCHAR(100), -- 'manual', 'csv', 'api', 'scraping'
    total_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    validation_errors JSONB DEFAULT '{}',
    session_status VARCHAR(50) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'failed'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- ============================================================================
-- INGREDIENT NORMALIZATION SYSTEM
-- ============================================================================

-- Add ingredient normalization rules
CREATE TABLE IF NOT EXISTS ingredient_normalization_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pattern_type VARCHAR(50) NOT NULL, -- 'regex', 'exact_match', 'fuzzy_match'
    pattern_value TEXT NOT NULL,
    normalized_ingredient_id UUID NOT NULL REFERENCES ingredients(id),
    confidence_score DECIMAL(3,2) DEFAULT 1.0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add ingredient parsing results for bulk imports
CREATE TABLE IF NOT EXISTS ingredient_parsing_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES data_entry_sessions(id),
    raw_ingredient_text TEXT NOT NULL,
    parsed_ingredients JSONB NOT NULL, -- Array of {ingredient_id, percentage, order}
    parsing_confidence DECIMAL(3,2),
    parsing_method VARCHAR(50),
    manual_review_required BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PRODUCT MATCHING AND DEDUPLICATION
-- ============================================================================

-- Add product matching candidates
CREATE TABLE IF NOT EXISTS product_matching_candidates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES data_entry_sessions(id),
    candidate_variant_id UUID REFERENCES product_variants(id),
    match_type VARCHAR(50) NOT NULL, -- 'exact_upc', 'similar_name', 'same_ingredients', 'same_brand_line'
    match_score DECIMAL(3,2) NOT NULL,
    match_details JSONB NOT NULL,
    is_confirmed BOOLEAN DEFAULT false,
    confirmed_by UUID REFERENCES users(id),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add duplicate detection results
CREATE TABLE IF NOT EXISTS duplicate_detection_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES data_entry_sessions(id),
    primary_variant_id UUID NOT NULL REFERENCES product_variants(id),
    duplicate_variant_id UUID NOT NULL REFERENCES product_variants(id),
    similarity_score DECIMAL(3,2) NOT NULL,
    similarity_factors TEXT[] NOT NULL,
    resolution_action VARCHAR(50), -- 'merge', 'keep_both', 'delete_duplicate'
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- BULK IMPORT TEMPLATES
-- ============================================================================

-- Add import templates for different data sources
CREATE TABLE IF NOT EXISTS import_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_name VARCHAR(200) NOT NULL,
    template_type VARCHAR(50) NOT NULL, -- 'retailer_csv', 'manufacturer_api', 'manual_entry'
    field_mappings JSONB NOT NULL, -- Maps CSV columns to database fields
    validation_rules JSONB DEFAULT '{}',
    transformation_rules JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add import template fields
CREATE TABLE IF NOT EXISTS import_template_fields (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES import_templates(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    field_type VARCHAR(50) NOT NULL, -- 'text', 'number', 'date', 'boolean', 'json'
    is_required BOOLEAN DEFAULT false,
    validation_pattern TEXT,
    default_value TEXT,
    transformation_function TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- DATA ENTRY WORKFLOW FUNCTIONS
-- ============================================================================

-- Function to validate product data during entry
CREATE OR REPLACE FUNCTION validate_product_data(
    p_brand_name TEXT,
    p_product_line_name TEXT,
    p_variant_name TEXT,
    p_upc TEXT DEFAULT NULL,
    p_ingredients TEXT DEFAULT NULL
)
RETURNS TABLE (
    validation_passed BOOLEAN,
    quality_score DECIMAL,
    issues TEXT[],
    suggestions TEXT[]
) AS $$
DECLARE
    issues_found TEXT[] := '{}';
    suggestions_list TEXT[] := '{}';
    quality_score DECIMAL := 1.0;
BEGIN
    -- Check brand exists
    IF NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = LOWER(p_brand_name)) THEN
        issues_found := array_append(issues_found, 'Brand not found in database');
        suggestions_list := array_append(suggestions_list, 'Create new brand or check spelling');
        quality_score := quality_score - 0.2;
    END IF;

    -- Check UPC format if provided
    IF p_upc IS NOT NULL THEN
        IF NOT (p_upc ~ '^[0-9]{12,13}$') THEN
            issues_found := array_append(issues_found, 'Invalid UPC format');
            suggestions_list := array_append(suggestions_list, 'UPC should be 12-13 digits');
            quality_score := quality_score - 0.3;
        END IF;
        
        -- Check for duplicate UPC
        IF EXISTS (SELECT 1 FROM product_identifiers WHERE identifier_value = p_upc) THEN
            issues_found := array_append(issues_found, 'UPC already exists');
            suggestions_list := array_append(suggestions_list, 'Check if this is a duplicate product');
            quality_score := quality_score - 0.4;
        END IF;
    END IF;

    -- Check ingredient list format
    IF p_ingredients IS NOT NULL THEN
        IF LENGTH(p_ingredients) < 10 THEN
            issues_found := array_append(issues_found, 'Ingredient list too short');
            suggestions_list := array_append(suggestions_list, 'Provide complete ingredient list');
            quality_score := quality_score - 0.1;
        END IF;
    END IF;

    -- Check for required fields
    IF p_variant_name IS NULL OR TRIM(p_variant_name) = '' THEN
        issues_found := array_append(issues_found, 'Variant name is required');
        quality_score := quality_score - 0.5;
    END IF;

    RETURN QUERY SELECT 
        quality_score >= 0.7,
        quality_score,
        issues_found,
        suggestions_list;
END;
$$ LANGUAGE plpgsql;

-- Function to suggest similar products
CREATE OR REPLACE FUNCTION suggest_similar_products(
    p_brand_name TEXT,
    p_product_line_name TEXT,
    p_variant_name TEXT,
    p_upc TEXT DEFAULT NULL
)
RETURNS TABLE (
    variant_id UUID,
    variant_name TEXT,
    brand_name TEXT,
    similarity_score DECIMAL,
    match_reasons TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pv.id,
        pv.name,
        b.name,
        GREATEST(
            similarity(pv.name, p_variant_name),
            similarity(pl.name, p_product_line_name),
            similarity(b.name, p_brand_name)
        ) as similarity_score,
        ARRAY[
            CASE WHEN similarity(pv.name, p_variant_name) > 0.8 THEN 'similar_variant_name' END,
            CASE WHEN similarity(pl.name, p_product_line_name) > 0.8 THEN 'similar_product_line' END,
            CASE WHEN similarity(b.name, p_brand_name) > 0.8 THEN 'same_brand' END,
            CASE WHEN EXISTS (
                SELECT 1 FROM product_identifiers pi 
                WHERE pi.product_variant_id = pv.id 
                AND pi.identifier_value = p_upc
            ) THEN 'same_upc' END
        ] as match_reasons
    FROM product_variants pv
    JOIN product_lines pl ON pv.product_line_id = pl.id
    JOIN brands b ON pl.brand_id = b.id
    WHERE 
        similarity(pv.name, p_variant_name) > 0.6
        OR similarity(pl.name, p_product_line_name) > 0.6
        OR similarity(b.name, p_brand_name) > 0.6
        OR (p_upc IS NOT NULL AND EXISTS (
            SELECT 1 FROM product_identifiers pi 
            WHERE pi.product_variant_id = pv.id 
            AND pi.identifier_value = p_upc
        ))
    ORDER BY similarity_score DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Function to parse ingredient list
CREATE OR REPLACE FUNCTION parse_ingredient_list(
    p_ingredient_text TEXT
)
RETURNS TABLE (
    ingredient_name TEXT,
    percentage DECIMAL,
    ingredient_order INTEGER,
    confidence_score DECIMAL,
    suggested_ingredient_id UUID
) AS $$
DECLARE
    ingredient_item TEXT;
    ingredient_parts TEXT[];
    parsed_percentage DECIMAL;
    parsed_name TEXT;
    ingredient_counter INTEGER := 1;
BEGIN
    -- Split by commas and process each ingredient
    FOR ingredient_item IN SELECT unnest(string_to_array(p_ingredient_text, ','))
    LOOP
        ingredient_item := TRIM(ingredient_item);
        
        -- Try to extract percentage (look for patterns like "Chicken (25%)" or "25% Chicken")
        IF ingredient_item ~ '\([0-9]+%\)' THEN
            -- Pattern: "Ingredient Name (25%)"
            parsed_name := TRIM(regexp_replace(ingredient_item, '\s*\([0-9]+%\)', ''));
            parsed_percentage := CAST(regexp_replace(ingredient_item, '.*\(([0-9]+)%\).*', '\1') AS DECIMAL);
        ELSIF ingredient_item ~ '^[0-9]+%' THEN
            -- Pattern: "25% Ingredient Name"
            parsed_percentage := CAST(regexp_replace(ingredient_item, '^([0-9]+)%.*', '\1') AS DECIMAL);
            parsed_name := TRIM(regexp_replace(ingredient_item, '^[0-9]+%\s*', ''));
        ELSE
            -- No percentage found
            parsed_name := ingredient_item;
            parsed_percentage := NULL;
        END IF;

        -- Try to find matching ingredient in database
        RETURN QUERY
        SELECT 
            parsed_name,
            parsed_percentage,
            ingredient_counter,
            GREATEST(
                similarity(i.name, parsed_name),
                CASE WHEN parsed_name = ANY(i.common_aliases) THEN 1.0 ELSE 0.0 END
            ) as confidence_score,
            i.id
        FROM ingredients i
        WHERE 
            similarity(i.name, parsed_name) > 0.7
            OR parsed_name = ANY(i.common_aliases)
        ORDER BY confidence_score DESC
        LIMIT 1;

        -- If no match found, return with null ingredient_id
        IF NOT FOUND THEN
            RETURN QUERY SELECT 
                parsed_name,
                parsed_percentage,
                ingredient_counter,
                0.0 as confidence_score,
                NULL::UUID;
        END IF;

        ingredient_counter := ingredient_counter + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DATA ENTRY WORKFLOW VIEWS
-- ============================================================================

-- View for data entry dashboard
CREATE OR REPLACE VIEW data_entry_dashboard AS
SELECT 
    des.id as session_id,
    des.session_name,
    des.import_source,
    des.total_records,
    des.successful_records,
    des.failed_records,
    ROUND((des.successful_records::DECIMAL / NULLIF(des.total_records, 0)) * 100, 2) as success_rate,
    des.session_status,
    des.started_at,
    des.completed_at,
    u.email as created_by,
    -- Quality metrics
    COALESCE(
        json_object_agg(
            dqm.table_name,
            json_build_object(
                'avg_quality_score', ROUND(AVG(dqm.quality_score), 2),
                'records_needing_review', COUNT(*) FILTER (WHERE dqm.manual_review_required = true),
                'common_issues', array_agg(DISTINCT unnest(dqm.issues_found))
            )
        ) FILTER (WHERE dqm.id IS NOT NULL),
        '{}'::json
    ) as quality_summary
FROM data_entry_sessions des
LEFT JOIN users u ON des.user_id = u.id
LEFT JOIN data_quality_metrics dqm ON des.id = dqm.id
WHERE des.session_status = 'in_progress'
GROUP BY des.id, des.session_name, des.import_source, des.total_records, 
         des.successful_records, des.failed_records, des.session_status, 
         des.started_at, des.completed_at, u.email;

-- View for pending manual reviews
CREATE OR REPLACE VIEW pending_manual_reviews AS
SELECT 
    dqm.id,
    dqm.table_name,
    dqm.record_id,
    dqm.quality_score,
    dqm.issues_found,
    dqm.validation_rules_failed,
    dqm.auto_fixes_applied,
    dqm.created_at,
    -- Get record details based on table_name
    CASE dqm.table_name
        WHEN 'product_variants' THEN (SELECT pv.name FROM product_variants pv WHERE pv.id = dqm.record_id)
        WHEN 'product_lines' THEN (SELECT pl.name FROM product_lines pl WHERE pl.id = dqm.record_id)
        WHEN 'brands' THEN (SELECT b.name FROM brands b WHERE b.id = dqm.record_id)
        ELSE 'Unknown'
    END as record_name
FROM data_quality_metrics dqm
WHERE dqm.manual_review_required = true 
AND dqm.reviewed_by IS NULL
ORDER BY dqm.quality_score ASC, dqm.created_at ASC;

-- ============================================================================
-- INDEXES FOR DATA ENTRY PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_data_quality_metrics_table_record ON data_quality_metrics(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_data_quality_metrics_review ON data_quality_metrics(manual_review_required, reviewed_by);
CREATE INDEX IF NOT EXISTS idx_data_entry_sessions_user ON data_entry_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_data_entry_sessions_status ON data_entry_sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_ingredient_normalization_pattern ON ingredient_normalization_rules(pattern_value);
CREATE INDEX IF NOT EXISTS idx_product_matching_session ON product_matching_candidates(session_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_detection_session ON duplicate_detection_results(session_id);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE data_quality_metrics IS 'Tracks data quality issues and validation results for manual review';
COMMENT ON TABLE data_entry_sessions IS 'Tracks bulk data import sessions with success/failure metrics';
COMMENT ON TABLE ingredient_normalization_rules IS 'Rules for normalizing ingredient names from various sources';
COMMENT ON TABLE product_matching_candidates IS 'Potential product matches during data entry for duplicate prevention';
COMMENT ON TABLE import_templates IS 'Templates for different data import formats and sources';
