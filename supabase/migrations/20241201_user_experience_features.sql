-- Migration: Enhanced User Experience Features for Pawdi Competitor
-- This migration adds features to improve user engagement and app competitiveness

-- ============================================================================
-- SMART RECOMMENDATIONS SYSTEM
-- ============================================================================

-- Add recommendation engine data
CREATE TABLE IF NOT EXISTS recommendation_models (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    model_type VARCHAR(50) NOT NULL, -- 'collaborative', 'content_based', 'hybrid'
    model_version VARCHAR(20) NOT NULL,
    model_parameters JSONB NOT NULL,
    training_data_size INTEGER,
    accuracy_score DECIMAL(5,4),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add user recommendation history
CREATE TABLE IF NOT EXISTS user_recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,
    recommended_variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    recommendation_score DECIMAL(5,4) NOT NULL,
    recommendation_reasons TEXT[],
    model_id UUID REFERENCES recommendation_models(id),
    user_feedback VARCHAR(20), -- 'liked', 'disliked', 'purchased', 'ignored'
    feedback_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SOCIAL FEATURES
-- ============================================================================

-- Add user reviews and ratings
CREATE TABLE IF NOT EXISTS user_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_title VARCHAR(200),
    review_text TEXT,
    pros TEXT[],
    cons TEXT[],
    would_recommend BOOLEAN,
    purchase_price DECIMAL(10,2),
    purchase_location VARCHAR(200),
    usage_duration_days INTEGER,
    pet_reaction VARCHAR(50), -- 'loved', 'liked', 'neutral', 'disliked', 'refused'
    is_verified_purchase BOOLEAN DEFAULT false,
    helpful_votes INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_variant_id)
);

-- Add review helpfulness tracking
CREATE TABLE IF NOT EXISTS review_helpfulness (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    review_id UUID NOT NULL REFERENCES user_reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_helpful BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(review_id, user_id)
);

-- Add user following system
CREATE TABLE IF NOT EXISTS user_follows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- ============================================================================
-- SMART PANTRY MANAGEMENT
-- ============================================================================

-- Enhanced pantry tracking
CREATE TABLE IF NOT EXISTS user_pantry_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    purchase_date DATE,
    expiration_date DATE,
    purchase_price DECIMAL(10,2),
    purchase_location VARCHAR(200),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add pantry alerts and notifications
CREATE TABLE IF NOT EXISTS pantry_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pantry_item_id UUID REFERENCES user_pantry_items(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL, -- 'expiring_soon', 'low_stock', 'recall', 'price_drop'
    alert_message TEXT NOT NULL,
    alert_priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    is_read BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- PRICE TRACKING AND COMPARISON
-- ============================================================================

-- Enhanced price tracking
CREATE TABLE IF NOT EXISTS price_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    retailer_name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    price_per_unit DECIMAL(10,4),
    unit_type VARCHAR(20), -- 'per_lb', 'per_oz', 'per_can', etc.
    availability_status VARCHAR(50), -- 'in_stock', 'out_of_stock', 'limited', 'discontinued'
    retailer_url TEXT,
    data_source VARCHAR(50), -- 'manual', 'scraping', 'api', 'user_report'
    is_current BOOLEAN DEFAULT true,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add price alerts
CREATE TABLE IF NOT EXISTS price_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    target_price DECIMAL(10,2) NOT NULL,
    alert_type VARCHAR(50) NOT NULL, -- 'price_drop', 'price_increase', 'best_deal'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    triggered_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, product_variant_id, alert_type)
);

-- ============================================================================
-- HEALTH TRACKING AND INSIGHTS
-- ============================================================================

-- Add pet health tracking
CREATE TABLE IF NOT EXISTS pet_health_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    log_type VARCHAR(50) NOT NULL, -- 'weight', 'energy', 'coat_condition', 'digestive_health', 'appetite'
    value DECIMAL(10,2),
    unit VARCHAR(20),
    notes TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add food transition tracking
CREATE TABLE IF NOT EXISTS food_transitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    from_variant_id UUID REFERENCES product_variants(id),
    to_variant_id UUID NOT NULL REFERENCES product_variants(id),
    transition_start_date DATE NOT NULL,
    transition_end_date DATE,
    transition_method VARCHAR(50), -- 'gradual', 'immediate', 'cold_turkey'
    success_rating INTEGER CHECK (success_rating >= 1 AND success_rating <= 5),
    side_effects TEXT[],
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- GAMIFICATION AND ENGAGEMENT
-- ============================================================================

-- Add user achievements
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    achievement_name VARCHAR(100) NOT NULL UNIQUE,
    achievement_description TEXT NOT NULL,
    achievement_type VARCHAR(50) NOT NULL, -- 'scanning', 'reviewing', 'social', 'health'
    icon_url TEXT,
    points_value INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add user achievement progress
CREATE TABLE IF NOT EXISTS user_achievement_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES user_achievements(id) ON DELETE CASCADE,
    progress_value INTEGER DEFAULT 0,
    target_value INTEGER NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- Add user points and levels
CREATE TABLE IF NOT EXISTS user_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points_earned INTEGER DEFAULT 0,
    points_spent INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    level_title VARCHAR(50) DEFAULT 'New Pet Parent',
    last_activity_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ============================================================================
-- ENHANCED FUNCTIONS FOR USER EXPERIENCE
-- ============================================================================

-- Function to get personalized product recommendations
CREATE OR REPLACE FUNCTION get_personalized_recommendations(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    variant_id UUID,
    variant_name TEXT,
    brand_name TEXT,
    recommendation_score DECIMAL,
    recommendation_reasons TEXT[],
    price_info JSONB,
    user_reviews_summary JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pv.id,
        pv.name,
        b.name,
        -- Calculate personalized score based on user history, pet needs, and social proof
        (
            -- Base score from user's past preferences
            COALESCE(
                (SELECT AVG(ur.rating) FROM user_reviews ur 
                 WHERE ur.user_id = p_user_id 
                 AND ur.product_variant_id IN (
                     SELECT pv2.id FROM product_variants pv2 
                     JOIN product_lines pl2 ON pv2.product_line_id = pl2.id 
                     WHERE pl2.brand_id = pl.brand_id
                 )), 3.0
            ) * 0.3 +
            -- Social proof score
            COALESCE(
                (SELECT AVG(ur.rating) FROM user_reviews ur 
                 WHERE ur.product_variant_id = pv.id 
                 AND ur.is_active = true), 3.0
            ) * 0.3 +
            -- Pet compatibility score
            CASE WHEN EXISTS (
                SELECT 1 FROM pets p 
                WHERE p.user_id = p_user_id 
                AND p.species_id = ANY(pl.target_species)
            ) THEN 0.2 ELSE 0.1 END +
            -- Trending score
            COALESCE(pa.trend_score, 0) * 0.1 +
            -- Price competitiveness
            CASE WHEN EXISTS (
                SELECT 1 FROM price_history ph 
                WHERE ph.product_variant_id = pv.id 
                AND ph.is_current = true 
                AND ph.price <= (
                    SELECT AVG(ph2.price) FROM price_history ph2 
                    WHERE ph2.product_variant_id = pv.id 
                    AND ph2.recorded_at >= NOW() - INTERVAL '30 days'
                )
            ) THEN 0.1 ELSE 0.05 END
        ) as recommendation_score,
        ARRAY[
            CASE WHEN EXISTS (
                SELECT 1 FROM user_reviews ur 
                WHERE ur.user_id = p_user_id 
                AND ur.product_variant_id IN (
                    SELECT pv2.id FROM product_variants pv2 
                    JOIN product_lines pl2 ON pv2.product_line_id = pl2.id 
                    WHERE pl2.brand_id = pl.brand_id
                )
            ) THEN 'brand_preference' END,
            CASE WHEN COALESCE(
                (SELECT AVG(ur.rating) FROM user_reviews ur 
                 WHERE ur.product_variant_id = pv.id 
                 AND ur.is_active = true), 0
            ) > 4.0 THEN 'highly_rated' END,
            CASE WHEN EXISTS (
                SELECT 1 FROM pets p 
                WHERE p.user_id = p_user_id 
                AND p.species_id = ANY(pl.target_species)
            ) THEN 'pet_compatible' END,
            CASE WHEN pa.trend_score > 0 THEN 'trending' END
        ] as recommendation_reasons,
        -- Price information
        COALESCE(
            json_build_object(
                'current_price', ph.price,
                'currency', ph.currency,
                'retailer', ph.retailer_name,
                'price_per_unit', ph.price_per_unit,
                'unit_type', ph.unit_type,
                'availability', ph.availability_status
            ),
            '{}'::jsonb
        ) as price_info,
        -- User reviews summary
        COALESCE(
            json_build_object(
                'average_rating', ROUND(AVG(ur.rating), 1),
                'total_reviews', COUNT(ur.id),
                'recommendation_rate', ROUND(
                    COUNT(*) FILTER (WHERE ur.would_recommend = true)::DECIMAL / 
                    NULLIF(COUNT(*) FILTER (WHERE ur.would_recommend IS NOT NULL), 0) * 100, 1
                )
            ),
            '{}'::jsonb
        ) as user_reviews_summary
    FROM product_variants pv
    JOIN product_lines pl ON pv.product_line_id = pl.id
    JOIN brands b ON pl.brand_id = b.id
    LEFT JOIN product_analytics pa ON pv.id = pa.product_variant_id
    LEFT JOIN price_history ph ON pv.id = ph.product_variant_id AND ph.is_current = true
    LEFT JOIN user_reviews ur ON pv.id = ur.product_variant_id AND ur.is_active = true
    WHERE pv.is_active = true AND pl.is_active = true AND b.is_active = true
    GROUP BY pv.id, pv.name, b.name, pl.brand_id, pl.target_species, pa.trend_score, ph.price, ph.currency, ph.retailer_name, ph.price_per_unit, ph.unit_type, ph.availability_status
    ORDER BY recommendation_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to check pantry expiration alerts
CREATE OR REPLACE FUNCTION check_pantry_expiration_alerts()
RETURNS TABLE (
    user_id UUID,
    pantry_item_id UUID,
    product_name TEXT,
    expiration_date DATE,
    days_until_expiration INTEGER,
    alert_type VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        upi.user_id,
        upi.id,
        pv.name,
        upi.expiration_date,
        upi.expiration_date - CURRENT_DATE as days_until_expiration,
        CASE 
            WHEN upi.expiration_date - CURRENT_DATE <= 0 THEN 'expired'
            WHEN upi.expiration_date - CURRENT_DATE <= 3 THEN 'expiring_today'
            WHEN upi.expiration_date - CURRENT_DATE <= 7 THEN 'expiring_soon'
            ELSE 'expiring_later'
        END as alert_type
    FROM user_pantry_items upi
    JOIN product_variants pv ON upi.product_variant_id = pv.id
    WHERE upi.is_active = true 
    AND upi.expiration_date IS NOT NULL
    AND upi.expiration_date - CURRENT_DATE <= 30 -- Only show alerts for items expiring within 30 days
    ORDER BY upi.expiration_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate user achievement progress
CREATE OR REPLACE FUNCTION update_user_achievement_progress(
    p_user_id UUID,
    p_achievement_type VARCHAR,
    p_increment INTEGER DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
    achievement_record RECORD;
BEGIN
    -- Update progress for all achievements of the given type
    FOR achievement_record IN 
        SELECT ua.id, ua.points_value, uap.progress_value, uap.target_value
        FROM user_achievements ua
        LEFT JOIN user_achievement_progress uap ON ua.id = uap.achievement_id AND uap.user_id = p_user_id
        WHERE ua.achievement_type = p_achievement_type
        AND ua.is_active = true
    LOOP
        -- Insert or update achievement progress
        INSERT INTO user_achievement_progress (user_id, achievement_id, progress_value, target_value, is_completed)
        VALUES (p_user_id, achievement_record.id, p_increment, 100, false) -- Default target of 100
        ON CONFLICT (user_id, achievement_id) 
        DO UPDATE SET 
            progress_value = user_achievement_progress.progress_value + p_increment,
            is_completed = (user_achievement_progress.progress_value + p_increment) >= achievement_record.target_value,
            completed_at = CASE 
                WHEN (user_achievement_progress.progress_value + p_increment) >= achievement_record.target_value 
                AND user_achievement_progress.is_completed = false 
                THEN NOW() 
                ELSE user_achievement_progress.completed_at 
            END;
        
        -- Update user points
        INSERT INTO user_points (user_id, points_earned, current_level, level_title)
        VALUES (p_user_id, achievement_record.points_value, 1, 'New Pet Parent')
        ON CONFLICT (user_id)
        DO UPDATE SET 
            points_earned = user_points.points_earned + achievement_record.points_value,
            last_activity_date = CURRENT_DATE;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INDEXES FOR USER EXPERIENCE PERFORMANCE
-- ============================================================================

-- Indexes for recommendations
CREATE INDEX IF NOT EXISTS idx_user_recommendations_user ON user_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recommendations_pet ON user_recommendations(pet_id);
CREATE INDEX IF NOT EXISTS idx_user_recommendations_feedback ON user_recommendations(user_feedback);

-- Indexes for reviews
CREATE INDEX IF NOT EXISTS idx_user_reviews_variant ON user_reviews(product_variant_id);
CREATE INDEX IF NOT EXISTS idx_user_reviews_user ON user_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reviews_rating ON user_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_user_reviews_active ON user_reviews(is_active);

-- Indexes for pantry
CREATE INDEX IF NOT EXISTS idx_pantry_items_user ON user_pantry_items(user_id);
CREATE INDEX IF NOT EXISTS idx_pantry_items_expiration ON user_pantry_items(expiration_date);
CREATE INDEX IF NOT EXISTS idx_pantry_alerts_user ON pantry_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_pantry_alerts_read ON pantry_alerts(is_read);

-- Indexes for price tracking
CREATE INDEX IF NOT EXISTS idx_price_history_variant ON price_history(product_variant_id);
CREATE INDEX IF NOT EXISTS idx_price_history_current ON price_history(is_current);
CREATE INDEX IF NOT EXISTS idx_price_history_recorded ON price_history(recorded_at);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON price_alerts(user_id);

-- Indexes for health tracking
CREATE INDEX IF NOT EXISTS idx_health_logs_pet ON pet_health_logs(pet_id);
CREATE INDEX IF NOT EXISTS idx_health_logs_date ON pet_health_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_food_transitions_pet ON food_transitions(pet_id);

-- Indexes for gamification
CREATE INDEX IF NOT EXISTS idx_achievement_progress_user ON user_achievement_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_achievement_progress_completed ON user_achievement_progress(is_completed);
CREATE INDEX IF NOT EXISTS idx_user_points_level ON user_points(current_level);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Trigger to update user points when reviews are created
CREATE OR REPLACE FUNCTION update_points_on_review()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_user_achievement_progress(NEW.user_id, 'reviewing', 1);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_points_on_review_trigger
    AFTER INSERT ON user_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_points_on_review();

-- Trigger to update user points when scans are performed
CREATE OR REPLACE FUNCTION update_points_on_scan()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_user_achievement_progress(NEW.user_id, 'scanning', 1);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_points_on_scan_trigger
    AFTER INSERT ON user_scans
    FOR EACH ROW
    EXECUTE FUNCTION update_points_on_scan();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE user_reviews IS 'User-generated reviews and ratings for products with detailed feedback';
COMMENT ON TABLE user_pantry_items IS 'Enhanced pantry tracking with expiration dates and purchase history';
COMMENT ON TABLE price_history IS 'Historical price tracking for price comparison and alerts';
COMMENT ON TABLE pet_health_logs IS 'Pet health tracking over time for dietary impact analysis';
COMMENT ON TABLE user_achievements IS 'Gamification system with achievements and points';
COMMENT ON TABLE recommendation_models IS 'Machine learning models for personalized product recommendations';
