-- Migration: Enhanced Scanning System for Pawdi Competitor
-- This migration adds advanced scanning capabilities and improved product lookup

-- ============================================================================
-- ENHANCED PRODUCT IDENTIFIERS
-- ============================================================================

-- Add barcode validation and correction fields
ALTER TABLE product_identifiers 
ADD COLUMN IF NOT EXISTS barcode_checksum VARCHAR(2),
ADD COLUMN IF NOT EXISTS is_validated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS validation_source VARCHAR(50),
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS alternative_codes TEXT[] DEFAULT '{}';

-- Add retailer-specific identifier support
CREATE TABLE IF NOT EXISTS retailer_product_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    retailer_name VARCHAR(100) NOT NULL,
    retailer_code VARCHAR(100) NOT NULL,
    retailer_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(retailer_name, retailer_code)
);

-- ============================================================================
-- FUZZY MATCHING AND PRODUCT SIMILARITY
-- ============================================================================

-- Add similarity tracking for product matching
CREATE TABLE IF NOT EXISTS product_similarities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    variant_id_1 UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    variant_id_2 UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    similarity_score DECIMAL(3,2) NOT NULL,
    similarity_type VARCHAR(50) NOT NULL, -- 'name', 'ingredients', 'nutrition', 'options'
    is_confirmed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(variant_id_1, variant_id_2, similarity_type)
);

-- Add product name variations and aliases
CREATE TABLE IF NOT EXISTS product_name_variations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    variation_name VARCHAR(500) NOT NULL,
    variation_type VARCHAR(50) NOT NULL, -- 'alias', 'misspelling', 'retailer_name', 'translation'
    confidence_score DECIMAL(3,2) DEFAULT 1.0,
    source VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_variant_id, variation_name)
);

-- ============================================================================
-- ENHANCED INGREDIENT SYSTEM
-- ============================================================================

-- Add ingredient normalization and fuzzy matching
ALTER TABLE ingredients 
ADD COLUMN IF NOT EXISTS normalized_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS ingredient_family VARCHAR(100),
ADD COLUMN IF NOT EXISTS common_misspellings TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS regulatory_codes TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS nutritional_profile JSONB DEFAULT '{}';

-- Create ingredient families for better grouping
CREATE TABLE IF NOT EXISTS ingredient_families (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_family_id UUID REFERENCES ingredient_families(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ADVANCED NUTRITIONAL ANALYSIS
-- ============================================================================

-- Add nutritional analysis confidence and source tracking
ALTER TABLE nutritional_values 
ADD COLUMN IF NOT EXISTS analysis_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS testing_lab VARCHAR(100),
ADD COLUMN IF NOT EXISTS test_date DATE,
ADD COLUMN IF NOT EXISTS sample_size VARCHAR(50),
ADD COLUMN IF NOT EXISTS regulatory_compliance JSONB DEFAULT '{}';

-- Add nutritional scoring system
CREATE TABLE IF NOT EXISTS nutritional_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    score_type VARCHAR(50) NOT NULL, -- 'overall', 'protein_quality', 'carb_quality', 'fat_quality'
    score_value DECIMAL(5,2) NOT NULL,
    score_max DECIMAL(5,2) NOT NULL,
    calculation_method VARCHAR(100),
    species_specific BOOLEAN DEFAULT false,
    life_stage_specific BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_variant_id, score_type)
);

-- ============================================================================
-- PET-SPECIFIC RECOMMENDATIONS
-- ============================================================================

-- Add breed-specific nutritional needs
CREATE TABLE IF NOT EXISTS breed_nutritional_needs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    breed_id UUID NOT NULL REFERENCES breeds(id) ON DELETE CASCADE,
    life_stage VARCHAR(50) NOT NULL,
    weight_range_min DECIMAL(5,2),
    weight_range_max DECIMAL(5,2),
    caloric_needs_per_kg DECIMAL(6,2),
    protein_min_percentage DECIMAL(5,2),
    fat_min_percentage DECIMAL(5,2),
    fiber_max_percentage DECIMAL(5,2),
    special_considerations TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add health condition tracking for pets
CREATE TABLE IF NOT EXISTS pet_health_conditions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    condition_name VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL, -- 'mild', 'moderate', 'severe'
    diagnosis_date DATE,
    treatment_notes TEXT,
    dietary_restrictions TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SCANNING HISTORY AND ANALYTICS
-- ============================================================================

-- Enhanced user scanning history
ALTER TABLE user_scans 
ADD COLUMN IF NOT EXISTS scan_method VARCHAR(50), -- 'barcode', 'manual', 'voice', 'image'
ADD COLUMN IF NOT EXISTS scan_quality DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS user_feedback JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS recommendation_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS follow_up_actions TEXT[];

-- Add product popularity and trending data
CREATE TABLE IF NOT EXISTS product_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    scan_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2),
    trend_score DECIMAL(5,2) DEFAULT 0,
    last_scan_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_variant_id)
);

-- ============================================================================
-- SAFETY AND RECALL SYSTEM
-- ============================================================================

-- Add product safety and recall tracking
CREATE TABLE IF NOT EXISTS product_recalls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    product_line_id UUID REFERENCES product_lines(id) ON DELETE CASCADE,
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    recall_type VARCHAR(50) NOT NULL, -- 'voluntary', 'mandatory', 'precautionary'
    recall_reason TEXT NOT NULL,
    affected_lot_numbers TEXT[],
    affected_date_ranges DATERANGE[],
    recall_date DATE NOT NULL,
    resolution_date DATE,
    severity_level VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
    affected_regions TEXT[],
    regulatory_agency VARCHAR(100),
    recall_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ENHANCED VIEWS FOR SCANNING
-- ============================================================================

-- Enhanced product lookup view with fuzzy matching support
CREATE OR REPLACE VIEW enhanced_product_lookup AS
SELECT 
    pv.id as variant_id,
    pv.name as variant_name,
    pv.image_url,
    pl.id as product_line_id,
    pl.name as product_line_name,
    pl.description as product_description,
    b.id as brand_id,
    b.name as brand_name,
    b.website as brand_website,
    -- Primary identifier
    pi.identifier_value as primary_code,
    pi.identifier_type as primary_type,
    pi.confidence_score,
    -- All identifiers as array
    COALESCE(
        json_agg(
            json_build_object(
                'type', pi_all.identifier_type,
                'value', pi_all.identifier_value,
                'is_primary', pi_all.is_primary,
                'confidence', pi_all.confidence_score
            )
        ) FILTER (WHERE pi_all.id IS NOT NULL),
        '[]'::json
    ) as all_identifiers,
    -- Options with enhanced data
    COALESCE(
        json_agg(
            json_build_object(
                'type', vot.display_name,
                'value', COALESCE(vov.display_value, pvo.custom_value),
                'numeric_value', COALESCE(pvo.numeric_value, vov.numeric_value),
                'unit', vot.unit
            )
        ) FILTER (WHERE vot.id IS NOT NULL),
        '[]'::json
    ) as options,
    -- Nutrition summary
    COALESCE(
        json_object_agg(
            na.name, 
            json_build_object(
                'value', nv.value,
                'unit', nv.unit,
                'confidence', nv.confidence_level,
                'method', nv.analysis_method
            )
        ) FILTER (WHERE na.id IS NOT NULL),
        '{}'::json
    ) as nutrition,
    -- Safety flags
    pl.safety_flags,
    -- Recall information
    COALESCE(
        json_agg(
            json_build_object(
                'recall_type', pr.recall_type,
                'recall_reason', pr.recall_reason,
                'recall_date', pr.recall_date,
                'severity', pr.severity_level,
                'is_active', pr.is_active
            )
        ) FILTER (WHERE pr.id IS NOT NULL AND pr.is_active = true),
        '[]'::json
    ) as active_recalls,
    -- Analytics
    pa.scan_count,
    pa.favorite_count,
    pa.average_rating,
    pa.trend_score
FROM product_variants pv
JOIN product_lines pl ON pv.product_line_id = pl.id
JOIN brands b ON pl.brand_id = b.id
LEFT JOIN product_identifiers pi ON pv.id = pi.product_variant_id AND pi.is_primary = true
LEFT JOIN product_identifiers pi_all ON pv.id = pi_all.product_variant_id
LEFT JOIN product_variant_options pvo ON pv.id = pvo.product_variant_id
LEFT JOIN variant_option_types vot ON pvo.option_type_id = vot.id
LEFT JOIN variant_option_values vov ON pvo.option_value_id = vov.id
LEFT JOIN nutritional_values nv ON pv.id = nv.product_variant_id
LEFT JOIN nutritional_attributes na ON nv.nutritional_attribute_id = na.id
LEFT JOIN product_recalls pr ON pv.id = pr.product_variant_id
LEFT JOIN product_analytics pa ON pv.id = pa.product_variant_id
WHERE pv.is_active = true AND pl.is_active = true AND b.is_active = true
GROUP BY pv.id, pv.name, pv.image_url, pl.id, pl.name, pl.description, b.id, b.name, b.website, 
         pi.identifier_value, pi.identifier_type, pi.confidence_score, pl.safety_flags,
         pa.scan_count, pa.favorite_count, pa.average_rating, pa.trend_score;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Indexes for enhanced scanning
CREATE INDEX IF NOT EXISTS idx_product_identifiers_confidence ON product_identifiers(confidence_score);
CREATE INDEX IF NOT EXISTS idx_product_identifiers_validation ON product_identifiers(is_validated);
CREATE INDEX IF NOT EXISTS idx_retailer_codes_variant ON retailer_product_codes(product_variant_id);
CREATE INDEX IF NOT EXISTS idx_retailer_codes_retailer ON retailer_product_codes(retailer_name);

-- Indexes for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_product_similarities_variant1 ON product_similarities(variant_id_1);
CREATE INDEX IF NOT EXISTS idx_product_similarities_score ON product_similarities(similarity_score);
CREATE INDEX IF NOT EXISTS idx_name_variations_variant ON product_name_variations(product_variant_id);
CREATE INDEX IF NOT EXISTS idx_name_variations_name ON product_name_variations(variation_name);

-- Indexes for nutrition
CREATE INDEX IF NOT EXISTS idx_nutritional_scores_variant ON nutritional_scores(product_variant_id);
CREATE INDEX IF NOT EXISTS idx_nutritional_scores_type ON nutritional_scores(score_type);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_product_analytics_trend ON product_analytics(trend_score);
CREATE INDEX IF NOT EXISTS idx_product_analytics_scans ON product_analytics(scan_count);
CREATE INDEX IF NOT EXISTS idx_user_scans_method ON user_scans(scan_method);

-- Indexes for recalls
CREATE INDEX IF NOT EXISTS idx_product_recalls_active ON product_recalls(is_active);
CREATE INDEX IF NOT EXISTS idx_product_recalls_date ON product_recalls(recall_date);
CREATE INDEX IF NOT EXISTS idx_product_recalls_severity ON product_recalls(severity_level);

-- ============================================================================
-- FUNCTIONS FOR ENHANCED SCANNING
-- ============================================================================

-- Function for fuzzy product search
CREATE OR REPLACE FUNCTION fuzzy_product_search(
    search_term TEXT,
    similarity_threshold DECIMAL DEFAULT 0.7
)
RETURNS TABLE (
    variant_id UUID,
    variant_name TEXT,
    brand_name TEXT,
    similarity_score DECIMAL,
    match_type VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pv.id,
        pv.name,
        b.name,
        GREATEST(
            similarity(pv.name, search_term),
            similarity(pl.name, search_term),
            similarity(b.name, search_term)
        ) as similarity_score,
        CASE 
            WHEN similarity(pv.name, search_term) > similarity_threshold THEN 'variant_name'
            WHEN similarity(pl.name, search_term) > similarity_threshold THEN 'product_line'
            WHEN similarity(b.name, search_term) > similarity_threshold THEN 'brand_name'
            ELSE 'low_confidence'
        END as match_type
    FROM product_variants pv
    JOIN product_lines pl ON pv.product_line_id = pl.id
    JOIN brands b ON pl.brand_id = b.id
    WHERE 
        similarity(pv.name, search_term) > similarity_threshold
        OR similarity(pl.name, search_term) > similarity_threshold
        OR similarity(b.name, search_term) > similarity_threshold
    ORDER BY similarity_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get product recommendations for a pet
CREATE OR REPLACE FUNCTION get_pet_recommendations(
    pet_id_param UUID,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    variant_id UUID,
    variant_name TEXT,
    brand_name TEXT,
    recommendation_score DECIMAL,
    match_reasons TEXT[]
) AS $$
DECLARE
    pet_species_id UUID;
    pet_breed_id UUID;
    pet_allergies TEXT[];
    pet_conditions TEXT[];
BEGIN
    -- Get pet information
    SELECT p.species_id, p.breed_id, 
           ARRAY(SELECT pa.allergen_name FROM pet_allergies pa WHERE pa.pet_id = pet_id_param AND pa.is_active = true),
           ARRAY(SELECT phc.condition_name FROM pet_health_conditions phc WHERE phc.pet_id = pet_id_param AND phc.is_active = true)
    INTO pet_species_id, pet_breed_id, pet_allergies, pet_conditions
    FROM pets p WHERE p.id = pet_id_param;

    RETURN QUERY
    SELECT 
        pv.id,
        pv.name,
        b.name,
        -- Calculate recommendation score based on multiple factors
        (
            COALESCE(pa.average_rating, 0) * 0.3 +
            COALESCE(pa.trend_score, 0) * 0.2 +
            CASE WHEN pet_species_id = ANY(pl.target_species) THEN 0.3 ELSE 0 END +
            CASE WHEN NOT EXISTS (
                SELECT 1 FROM product_variant_ingredients pvi 
                JOIN ingredients i ON pvi.ingredient_id = i.id 
                WHERE pvi.product_variant_id = pv.id 
                AND (i.name = ANY(pet_allergies) OR i.common_aliases && pet_allergies)
            ) THEN 0.2 ELSE 0 END
        ) as recommendation_score,
        ARRAY[
            CASE WHEN pet_species_id = ANY(pl.target_species) THEN 'species_match' END,
            CASE WHEN NOT EXISTS (
                SELECT 1 FROM product_variant_ingredients pvi 
                JOIN ingredients i ON pvi.ingredient_id = i.id 
                WHERE pvi.product_variant_id = pv.id 
                AND (i.name = ANY(pet_allergies) OR i.common_aliases && pet_allergies)
            ) THEN 'no_allergens' END,
            CASE WHEN pa.average_rating > 4.0 THEN 'high_rated' END,
            CASE WHEN pa.trend_score > 0 THEN 'trending' END
        ] as match_reasons
    FROM product_variants pv
    JOIN product_lines pl ON pv.product_line_id = pl.id
    JOIN brands b ON pl.brand_id = b.id
    LEFT JOIN product_analytics pa ON pv.id = pa.product_variant_id
    WHERE pv.is_active = true AND pl.is_active = true AND b.is_active = true
    ORDER BY recommendation_score DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Trigger to update analytics when scans occur
CREATE OR REPLACE FUNCTION update_product_analytics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO product_analytics (product_variant_id, scan_count, last_scan_date)
    VALUES (NEW.product_variant_id, 1, NEW.scan_date)
    ON CONFLICT (product_variant_id) 
    DO UPDATE SET 
        scan_count = product_analytics.scan_count + 1,
        last_scan_date = NEW.scan_date,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_analytics_on_scan
    AFTER INSERT ON user_scans
    FOR EACH ROW
    EXECUTE FUNCTION update_product_analytics();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE retailer_product_codes IS 'Retailer-specific product codes for enhanced scanning and price comparison';
COMMENT ON TABLE product_similarities IS 'Tracks similar products for recommendation engine and duplicate detection';
COMMENT ON TABLE product_name_variations IS 'Handles product name variations, misspellings, and retailer-specific names';
COMMENT ON TABLE nutritional_scores IS 'Advanced nutritional scoring system for product quality assessment';
COMMENT ON TABLE breed_nutritional_needs IS 'Breed-specific nutritional requirements for personalized recommendations';
COMMENT ON TABLE product_recalls IS 'Product recall and safety alert system';
COMMENT ON TABLE product_analytics IS 'Product popularity, trending, and user engagement metrics';
