-- Migration: Flexible Variant Options System
-- This migration creates a flexible system for managing product variant options
-- that can handle multiple unit types and shared option values

-- Create variant_option_types table
CREATE TABLE IF NOT EXISTS variant_option_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    data_type VARCHAR(20) NOT NULL CHECK (data_type IN ('text', 'numeric', 'boolean', 'enum')),
    unit VARCHAR(20) NULL, -- References units.symbol
    description TEXT NULL,
    validation_rules JSONB NULL,
    is_required BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create variant_option_values table
CREATE TABLE IF NOT EXISTS variant_option_values (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    option_type_id UUID NOT NULL REFERENCES variant_option_types(id) ON DELETE CASCADE,
    value VARCHAR(100) NOT NULL,
    display_value VARCHAR(100) NOT NULL,
    numeric_value DECIMAL(10,3) NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(option_type_id, value)
);

-- Create product_line_option_types table (junction table)
CREATE TABLE IF NOT EXISTS product_line_option_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_line_id UUID NOT NULL REFERENCES product_lines(id) ON DELETE CASCADE,
    option_type_id UUID NOT NULL REFERENCES variant_option_types(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_line_id, option_type_id)
);

-- Create product_variant_options table (junction table for variant-specific values)
CREATE TABLE IF NOT EXISTS product_variant_options (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    option_type_id UUID NOT NULL REFERENCES variant_option_types(id) ON DELETE CASCADE,
    option_value_id UUID NULL REFERENCES variant_option_values(id) ON DELETE SET NULL,
    custom_value TEXT NULL, -- For custom values not in the predefined list
    numeric_value DECIMAL(10,3) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_variant_id, option_type_id)
);

-- Create unit_categories table
CREATE TABLE IF NOT EXISTS unit_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NULL,
    base_unit VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create units table
CREATE TABLE IF NOT EXISTS units (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    symbol VARCHAR(20) NOT NULL UNIQUE,
    category_id UUID NOT NULL REFERENCES unit_categories(id) ON DELETE CASCADE,
    conversion_factor DECIMAL(10,6) NOT NULL DEFAULT 1.0,
    is_base_unit BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_variant_option_types_active ON variant_option_types(is_active);
CREATE INDEX IF NOT EXISTS idx_variant_option_types_sort ON variant_option_types(sort_order);
CREATE INDEX IF NOT EXISTS idx_variant_option_values_type ON variant_option_values(option_type_id);
CREATE INDEX IF NOT EXISTS idx_variant_option_values_active ON variant_option_values(is_active);
CREATE INDEX IF NOT EXISTS idx_product_line_option_types_line ON product_line_option_types(product_line_id);
CREATE INDEX IF NOT EXISTS idx_product_variant_options_variant ON product_variant_options(product_variant_id);
CREATE INDEX IF NOT EXISTS idx_product_variant_options_type ON product_variant_options(option_type_id);
CREATE INDEX IF NOT EXISTS idx_units_category ON units(category_id);
CREATE INDEX IF NOT EXISTS idx_units_symbol ON units(symbol);

-- Insert default unit categories
INSERT INTO unit_categories (name, description, base_unit) VALUES
('Weight', 'Units for measuring weight/mass', 'g'),
('Volume', 'Units for measuring volume', 'ml'),
('Length', 'Units for measuring length/distance', 'cm'),
('Count', 'Units for counting items', 'piece')
ON CONFLICT (name) DO NOTHING;

-- Insert common units
INSERT INTO units (name, symbol, category_id, conversion_factor, is_base_unit) VALUES
-- Weight units (base: gram)
('Gram', 'g', (SELECT id FROM unit_categories WHERE name = 'Weight'), 1.0, true),
('Kilogram', 'kg', (SELECT id FROM unit_categories WHERE name = 'Weight'), 1000.0, false),
('Pound', 'lb', (SELECT id FROM unit_categories WHERE name = 'Weight'), 453.592, false),
('Ounce', 'oz', (SELECT id FROM unit_categories WHERE name = 'Weight'), 28.3495, false),

-- Volume units (base: milliliter)
('Milliliter', 'ml', (SELECT id FROM unit_categories WHERE name = 'Volume'), 1.0, true),
('Liter', 'l', (SELECT id FROM unit_categories WHERE name = 'Volume'), 1000.0, false),
('Fluid Ounce', 'fl oz', (SELECT id FROM unit_categories WHERE name = 'Volume'), 29.5735, false),
('Cup', 'cup', (SELECT id FROM unit_categories WHERE name = 'Volume'), 236.588, false),

-- Length units (base: centimeter)
('Centimeter', 'cm', (SELECT id FROM unit_categories WHERE name = 'Length'), 1.0, true),
('Meter', 'm', (SELECT id FROM unit_categories WHERE name = 'Length'), 100.0, false),
('Inch', 'in', (SELECT id FROM unit_categories WHERE name = 'Length'), 2.54, false),
('Foot', 'ft', (SELECT id FROM unit_categories WHERE name = 'Length'), 30.48, false),

-- Count units (base: piece)
('Piece', 'piece', (SELECT id FROM unit_categories WHERE name = 'Count'), 1.0, true),
('Pack', 'pack', (SELECT id FROM unit_categories WHERE name = 'Count'), 1.0, false),
('Box', 'box', (SELECT id FROM unit_categories WHERE name = 'Count'), 1.0, false)
ON CONFLICT (symbol) DO NOTHING;

-- Insert common variant option types for pet food
INSERT INTO variant_option_types (name, display_name, data_type, unit, description, sort_order) VALUES
('size', 'Size', 'numeric', 'lb', 'Package size in pounds', 1),
('flavor', 'Flavor', 'text', NULL, 'Product flavor or protein source', 2),
('life_stage', 'Life Stage', 'text', NULL, 'Target life stage (puppy, adult, senior)', 3),
('texture', 'Texture', 'text', NULL, 'Food texture (dry, wet, semi-moist)', 4),
('packaging_type', 'Packaging Type', 'text', NULL, 'Type of packaging (bag, can, pouch)', 5),
('protein_source', 'Protein Source', 'text', NULL, 'Primary protein ingredient', 6),
('grain_free', 'Grain Free', 'boolean', NULL, 'Whether the product is grain-free', 7),
('organic', 'Organic', 'boolean', NULL, 'Whether the product is organic certified', 8)
ON CONFLICT (name) DO NOTHING;

-- Insert common option values
INSERT INTO variant_option_values (option_type_id, value, display_value, numeric_value, sort_order) VALUES
-- Size values
((SELECT id FROM variant_option_types WHERE name = 'size'), '1lb', '1 lb', 1.0, 1),
((SELECT id FROM variant_option_types WHERE name = 'size'), '3lb', '3 lb', 3.0, 2),
((SELECT id FROM variant_option_types WHERE name = 'size'), '5lb', '5 lb', 5.0, 3),
((SELECT id FROM variant_option_types WHERE name = 'size'), '10lb', '10 lb', 10.0, 4),
((SELECT id FROM variant_option_types WHERE name = 'size'), '15lb', '15 lb', 15.0, 5),
((SELECT id FROM variant_option_types WHERE name = 'size'), '20lb', '20 lb', 20.0, 6),
((SELECT id FROM variant_option_types WHERE name = 'size'), '30lb', '30 lb', 30.0, 7),

-- Flavor values
((SELECT id FROM variant_option_types WHERE name = 'flavor'), 'chicken', 'Chicken', NULL, 1),
((SELECT id FROM variant_option_types WHERE name = 'flavor'), 'beef', 'Beef', NULL, 2),
((SELECT id FROM variant_option_types WHERE name = 'flavor'), 'salmon', 'Salmon', NULL, 3),
((SELECT id FROM variant_option_types WHERE name = 'flavor'), 'duck', 'Duck', NULL, 4),
((SELECT id FROM variant_option_types WHERE name = 'flavor'), 'turkey', 'Turkey', NULL, 5),
((SELECT id FROM variant_option_types WHERE name = 'flavor'), 'lamb', 'Lamb', NULL, 6),
((SELECT id FROM variant_option_types WHERE name = 'flavor'), 'fish', 'Fish', NULL, 7),

-- Life stage values
((SELECT id FROM variant_option_types WHERE name = 'life_stage'), 'puppy', 'Puppy', NULL, 1),
((SELECT id FROM variant_option_types WHERE name = 'life_stage'), 'adult', 'Adult', NULL, 2),
((SELECT id FROM variant_option_types WHERE name = 'life_stage'), 'senior', 'Senior', NULL, 3),
((SELECT id FROM variant_option_types WHERE name = 'life_stage'), 'all_life_stages', 'All Life Stages', NULL, 4),

-- Texture values
((SELECT id FROM variant_option_types WHERE name = 'texture'), 'dry', 'Dry', NULL, 1),
((SELECT id FROM variant_option_types WHERE name = 'texture'), 'wet', 'Wet', NULL, 2),
((SELECT id FROM variant_option_types WHERE name = 'texture'), 'semi_moist', 'Semi-Moist', NULL, 3),
((SELECT id FROM variant_option_types WHERE name = 'texture'), 'freeze_dried', 'Freeze-Dried', NULL, 4),

-- Packaging type values
((SELECT id FROM variant_option_types WHERE name = 'packaging_type'), 'bag', 'Bag', NULL, 1),
((SELECT id FROM variant_option_types WHERE name = 'packaging_type'), 'can', 'Can', NULL, 2),
((SELECT id FROM variant_option_types WHERE name = 'packaging_type'), 'pouch', 'Pouch', NULL, 3),
((SELECT id FROM variant_option_types WHERE name = 'packaging_type'), 'box', 'Box', NULL, 4),

-- Protein source values
((SELECT id FROM variant_option_types WHERE name = 'protein_source'), 'chicken', 'Chicken', NULL, 1),
((SELECT id FROM variant_option_types WHERE name = 'protein_source'), 'beef', 'Beef', NULL, 2),
((SELECT id FROM variant_option_types WHERE name = 'protein_source'), 'salmon', 'Salmon', NULL, 3),
((SELECT id FROM variant_option_types WHERE name = 'protein_source'), 'duck', 'Duck', NULL, 4),
((SELECT id FROM variant_option_types WHERE name = 'protein_source'), 'turkey', 'Turkey', NULL, 5),
((SELECT id FROM variant_option_types WHERE name = 'protein_source'), 'lamb', 'Lamb', NULL, 6),
((SELECT id FROM variant_option_types WHERE name = 'protein_source'), 'fish', 'Fish', NULL, 7)
ON CONFLICT (option_type_id, value) DO NOTHING;

-- Create views for easier querying
CREATE OR REPLACE VIEW product_variants_with_options AS
SELECT 
    pv.id,
    pv.name,
    pv.product_line_id,
    pl.name as product_line_name,
    b.name as brand_name,
    COALESCE(
        json_agg(
            json_build_object(
                'option_type', vot.display_name,
                'option_value', COALESCE(vov.display_value, pvo.custom_value),
                'numeric_value', COALESCE(pvo.numeric_value, vov.numeric_value)
            )
        ) FILTER (WHERE vot.id IS NOT NULL),
        '[]'::json
    ) as options
FROM product_variants pv
LEFT JOIN product_lines pl ON pv.product_line_id = pl.id
LEFT JOIN brands b ON pl.brand_id = b.id
LEFT JOIN product_variant_options pvo ON pv.id = pvo.product_variant_id
LEFT JOIN variant_option_types vot ON pvo.option_type_id = vot.id
LEFT JOIN variant_option_values vov ON pvo.option_value_id = vov.id
GROUP BY pv.id, pv.name, pv.product_line_id, pl.name, b.name;

-- Create view for product variants with flexible options (showing unit information)
CREATE OR REPLACE VIEW product_variants_with_flexible_options AS
SELECT 
    pv.id,
    pv.name,
    pv.product_line_id,
    pl.name as product_line_name,
    b.name as brand_name,
    COALESCE(
        json_agg(
            json_build_object(
                'option_type', vot.display_name,
                'option_type_unit', vot.unit,
                'option_value', COALESCE(vov.display_value, pvo.custom_value),
                'numeric_value', COALESCE(pvo.numeric_value, vov.numeric_value),
                'unit_info', CASE 
                    WHEN vot.unit IS NOT NULL THEN 
                        json_build_object(
                            'symbol', u.symbol,
                            'name', u.name,
                            'category', uc.name,
                            'conversion_factor', u.conversion_factor
                        )
                    ELSE NULL
                END
            )
        ) FILTER (WHERE vot.id IS NOT NULL),
        '[]'::json
    ) as options
FROM product_variants pv
LEFT JOIN product_lines pl ON pv.product_line_id = pl.id
LEFT JOIN brands b ON pl.brand_id = b.id
LEFT JOIN product_variant_options pvo ON pv.id = pvo.product_variant_id
LEFT JOIN variant_option_types vot ON pvo.option_type_id = vot.id
LEFT JOIN variant_option_values vov ON pvo.option_value_id = vov.id
LEFT JOIN units u ON vot.unit = u.symbol
LEFT JOIN unit_categories uc ON u.category_id = uc.id
GROUP BY pv.id, pv.name, pv.product_line_id, pl.name, b.name;

-- Create view for product variants optimized for scanning
CREATE OR REPLACE VIEW product_variants_for_scanning AS
SELECT 
    pv.id,
    pv.name,
    pv.product_line_id,
    pl.name as product_line_name,
    b.name as brand_name,
    pi.identifier_value as upc,
    pi.identifier_type,
    COALESCE(
        json_agg(
            json_build_object(
                'type', vot.display_name,
                'value', COALESCE(vov.display_value, pvo.custom_value),
                'numeric', COALESCE(pvo.numeric_value, vov.numeric_value),
                'unit', vot.unit
            )
        ) FILTER (WHERE vot.id IS NOT NULL),
        '[]'::json
    ) as options
FROM product_variants pv
LEFT JOIN product_lines pl ON pv.product_line_id = pl.id
LEFT JOIN brands b ON pl.brand_id = b.id
LEFT JOIN product_identifiers pi ON pv.id = pi.product_variant_id AND pi.is_primary = true
LEFT JOIN product_variant_options pvo ON pv.id = pvo.product_variant_id
LEFT JOIN variant_option_types vot ON pvo.option_type_id = vot.id
LEFT JOIN variant_option_values vov ON pvo.option_value_id = vov.id
GROUP BY pv.id, pv.name, pv.product_line_id, pl.name, b.name, pi.identifier_value, pi.identifier_type;

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_variant_option_types_updated_at BEFORE UPDATE ON variant_option_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_variant_option_values_updated_at BEFORE UPDATE ON variant_option_values FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_line_option_types_updated_at BEFORE UPDATE ON product_line_option_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_variant_options_updated_at BEFORE UPDATE ON product_variant_options FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_unit_categories_updated_at BEFORE UPDATE ON unit_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

