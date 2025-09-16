export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      brands: {
        Row: {
          company_info: Json | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          headquarters: Json | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          logo_url: string | null
          name: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          company_info?: Json | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          headquarters?: Json | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          name: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          company_info?: Json | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          headquarters?: Json | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          name?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          allergen_data: Json | null
          category: string
          common_aliases: string[] | null
          controversy_reason: string | null
          created_at: string | null
          health_benefits: string[] | null
          health_risks: string[] | null
          id: string
          is_active: boolean | null
          is_controversial: boolean | null
          is_toxic: boolean | null
          name: string
          notes: string | null
          regulatory_info: Json | null
          scientific_name: string | null
          subcategory: string | null
          tags: string[] | null
          toxicity_level: string | null
          updated_at: string | null
        }
        Insert: {
          allergen_data?: Json | null
          category: string
          common_aliases?: string[] | null
          controversy_reason?: string | null
          created_at?: string | null
          health_benefits?: string[] | null
          health_risks?: string[] | null
          id?: string
          is_active?: boolean | null
          is_controversial?: boolean | null
          is_toxic?: boolean | null
          name: string
          notes?: string | null
          regulatory_info?: Json | null
          scientific_name?: string | null
          subcategory?: string | null
          tags?: string[] | null
          toxicity_level?: string | null
          updated_at?: string | null
        }
        Update: {
          allergen_data?: Json | null
          category?: string
          common_aliases?: string[] | null
          controversy_reason?: string | null
          created_at?: string | null
          health_benefits?: string[] | null
          health_risks?: string[] | null
          id?: string
          is_active?: boolean | null
          is_controversial?: boolean | null
          is_toxic?: boolean | null
          name?: string
          notes?: string | null
          regulatory_info?: Json | null
          scientific_name?: string | null
          subcategory?: string | null
          tags?: string[] | null
          toxicity_level?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      product_lines: {
        Row: {
          basic_nutrition: Json | null
          brand_id: string
          category_id: string | null
          category_tags: string[] | null
          certifications: string[] | null
          created_at: string | null
          created_by: string | null
          description: string | null
          dietary_types: string[] | null
          id: string
          is_active: boolean | null
          life_stages: string[] | null
          metadata: Json | null
          name: string
          overall_rating: number | null
          rating_factors: Json | null
          safety_flags: Json | null
          target_species: string[] | null
          updated_at: string | null
        }
        Insert: {
          basic_nutrition?: Json | null
          brand_id: string
          category_id?: string | null
          category_tags?: string[] | null
          certifications?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          dietary_types?: string[] | null
          id?: string
          is_active?: boolean | null
          life_stages?: string[] | null
          metadata?: Json | null
          name: string
          overall_rating?: number | null
          rating_factors?: Json | null
          safety_flags?: Json | null
          target_species?: string[] | null
          updated_at?: string | null
        }
        Update: {
          basic_nutrition?: Json | null
          brand_id?: string
          category_id?: string | null
          category_tags?: string[] | null
          certifications?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          dietary_types?: string[] | null
          id?: string
          is_active?: boolean | null
          life_stages?: string[] | null
          metadata?: Json | null
          name?: string
          overall_rating?: number | null
          rating_factors?: Json | null
          safety_flags?: Json | null
          target_species?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_lines_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_lines_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          base_dimensions: Json | null
          base_weight: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string | null
          packaging_type: string | null
          product_line_id: string
          relationship_data: Json | null
          sku: string | null
          updated_at: string | null
          variant_metadata: Json | null
          weight_unit: string | null
        }
        Insert: {
          base_dimensions?: Json | null
          base_weight?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          packaging_type?: string | null
          product_line_id: string
          relationship_data?: Json | null
          sku?: string | null
          updated_at?: string | null
          variant_metadata?: Json | null
          weight_unit?: string | null
        }
        Update: {
          base_dimensions?: Json | null
          base_weight?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          packaging_type?: string | null
          product_line_id?: string
          relationship_data?: Json | null
          sku?: string | null
          updated_at?: string | null
          variant_metadata?: Json | null
          weight_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_line_id_fkey"
            columns: ["product_line_id"]
            isOneToOne: false
            referencedRelation: "product_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      variant_option_types: {
        Row: {
          allow_multiple_units: boolean | null
          created_at: string | null
          data_type: string
          display_name: string
          id: string
          is_active: boolean | null
          is_required: boolean | null
          name: string
          sort_order: number | null
          unit: string | null
          unit_category_id: string | null
          updated_at: string | null
          validation_rules: Json | null
        }
        Insert: {
          allow_multiple_units?: boolean | null
          created_at?: string | null
          data_type: string
          display_name: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          name: string
          sort_order?: number | null
          unit?: string | null
          unit_category_id?: string | null
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Update: {
          allow_multiple_units?: boolean | null
          created_at?: string | null
          data_type?: string
          display_name?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          name?: string
          sort_order?: number | null
          unit?: string | null
          unit_category_id?: string | null
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Relationships: []
      }
      variant_option_values: {
        Row: {
          created_at: string | null
          display_value: string | null
          id: string
          is_active: boolean | null
          numeric_value: number | null
          option_type_id: string
          sort_order: number | null
          unit_id: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          display_value?: string | null
          id?: string
          is_active?: boolean | null
          numeric_value?: number | null
          option_type_id: string
          sort_order?: number | null
          unit_id?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          display_value?: string | null
          id?: string
          is_active?: boolean | null
          numeric_value?: number | null
          option_type_id?: string
          sort_order?: number | null
          unit_id?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "variant_option_values_option_type_id_fkey"
            columns: ["option_type_id"]
            isOneToOne: false
            referencedRelation: "variant_option_types"
            referencedColumns: ["id"]
          },
        ]
      }
      // Additional tables truncated for brevity...
    }
    Views: {
      product_scan_lookup: {
        Row: {
          brand_id: string | null
          brand_name: string | null
          identifier_type: string | null
          ingredient_quality_score: number | null
          is_primary: boolean | null
          nutrition_summary: Json | null
          nutritional_balance_score: number | null
          options: Json | null
          overall_score: number | null
          product_line_id: string | null
          product_line_name: string | null
          safety_flags: Json | null
          upc: string | null
          variant_id: string | null
          variant_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_product_by_upc: {
        Args: { upc_code: string }
        Returns: {
          brand_name: string
          ingredients: Json
          nutrition: Json
          options: Json
          product_line_name: string
          rating: Json
          safety_flags: Json
          variant_id: string
          variant_name: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never