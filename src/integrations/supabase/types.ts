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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      barcodes: {
        Row: {
          barcode: string
          barcode_type: string
          created_at: string | null
          id: number
          is_active: boolean | null
          is_primary: boolean | null
          is_verified: boolean | null
          region: string | null
          retailer: string | null
          updated_at: string | null
          variant_id: number | null
        }
        Insert: {
          barcode: string
          barcode_type: string
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          is_primary?: boolean | null
          is_verified?: boolean | null
          region?: string | null
          retailer?: string | null
          updated_at?: string | null
          variant_id?: number | null
        }
        Update: {
          barcode?: string
          barcode_type?: string
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          is_primary?: boolean | null
          is_verified?: boolean | null
          region?: string | null
          retailer?: string | null
          updated_at?: string | null
          variant_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "barcodes_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          alternate_names: string[] | null
          canonical_name: string | null
          country_of_origin: string | null
          created_at: string
          data_confidence: number | null
          id: number
          is_active: boolean | null
          is_verified: boolean | null
          manufacturer: string | null
          name: string
          updated_at: string
          verification_date: string | null
          website_url: string | null
        }
        Insert: {
          alternate_names?: string[] | null
          canonical_name?: string | null
          country_of_origin?: string | null
          created_at?: string
          data_confidence?: number | null
          id?: number
          is_active?: boolean | null
          is_verified?: boolean | null
          manufacturer?: string | null
          name: string
          updated_at?: string
          verification_date?: string | null
          website_url?: string | null
        }
        Update: {
          alternate_names?: string[] | null
          canonical_name?: string | null
          country_of_origin?: string | null
          created_at?: string
          data_confidence?: number | null
          id?: number
          is_active?: boolean | null
          is_verified?: boolean | null
          manufacturer?: string | null
          name?: string
          updated_at?: string
          verification_date?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      data_gaps: {
        Row: {
          created_at: string | null
          field_name: string
          field_type: string | null
          id: number
          priority: number | null
          reported_count: number | null
          scan_count: number | null
          updated_at: string | null
          variant_id: number | null
        }
        Insert: {
          created_at?: string | null
          field_name: string
          field_type?: string | null
          id?: number
          priority?: number | null
          reported_count?: number | null
          scan_count?: number | null
          updated_at?: string | null
          variant_id?: number | null
        }
        Update: {
          created_at?: string | null
          field_name?: string
          field_type?: string | null
          id?: number
          priority?: number | null
          reported_count?: number | null
          scan_count?: number | null
          updated_at?: string | null
          variant_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "data_gaps_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      data_issues: {
        Row: {
          barcode: string | null
          created_at: string
          description: string | null
          id: number
          issue_type: string | null
          resolved_at: string | null
          status: string | null
          user_email: string | null
          variant_id: number | null
        }
        Insert: {
          barcode?: string | null
          created_at?: string
          description?: string | null
          id?: number
          issue_type?: string | null
          resolved_at?: string | null
          status?: string | null
          user_email?: string | null
          variant_id?: number | null
        }
        Update: {
          barcode?: string | null
          created_at?: string
          description?: string | null
          id?: number
          issue_type?: string | null
          resolved_at?: string | null
          status?: string | null
          user_email?: string | null
          variant_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "data_issues_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      flavors: {
        Row: {
          category: string | null
          id: number
          name: string
          protein_source: string[] | null
        }
        Insert: {
          category?: string | null
          id?: number
          name: string
          protein_source?: string[] | null
        }
        Update: {
          category?: string | null
          id?: number
          name?: string
          protein_source?: string[] | null
        }
        Relationships: []
      }
      formulations: {
        Row: {
          category: string | null
          description: string | null
          id: number
          name: string
        }
        Insert: {
          category?: string | null
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          category?: string | null
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      option_values: {
        Row: {
          created_at: string | null
          id: number
          is_active: boolean | null
          label: string
          option_type_id: number
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          label: string
          option_type_id: number
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          label?: string
          option_type_id?: number
          updated_at?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "option_values_option_type_id_fkey"
            columns: ["option_type_id"]
            isOneToOne: false
            referencedRelation: "product_options"
            referencedColumns: ["id"]
          },
        ]
      }
      package_types: {
        Row: {
          id: number
          is_recyclable: boolean | null
          material: string | null
          name: string
        }
        Insert: {
          id?: number
          is_recyclable?: boolean | null
          material?: string | null
          name: string
        }
        Update: {
          id?: number
          is_recyclable?: boolean | null
          material?: string | null
          name?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          is_active: boolean | null
          name: string
          target_species: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          name: string
          target_species?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          name?: string
          target_species?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      product_model_categories: {
        Row: {
          category_id: number
          created_at: string | null
          id: number
          is_primary: boolean | null
          product_model_id: number
          updated_at: string | null
        }
        Insert: {
          category_id: number
          created_at?: string | null
          id?: number
          is_primary?: boolean | null
          product_model_id: number
          updated_at?: string | null
        }
        Update: {
          category_id?: number
          created_at?: string | null
          id?: number
          is_primary?: boolean | null
          product_model_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_model_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_model_categories_product_model_id_fkey"
            columns: ["product_model_id"]
            isOneToOne: false
            referencedRelation: "product_models"
            referencedColumns: ["id"]
          },
        ]
      }
      product_models: {
        Row: {
          base_description: string | null
          brand_id: number
          canonical_name: string | null
          created_at: string
          data_completeness_score: number | null
          data_confidence: number | null
          id: number
          is_discontinued: boolean | null
          life_stage: string[]
          name: string
          product_line: string | null
          species: string
          updated_at: string
        }
        Insert: {
          base_description?: string | null
          brand_id: number
          canonical_name?: string | null
          created_at?: string
          data_completeness_score?: number | null
          data_confidence?: number | null
          id?: number
          is_discontinued?: boolean | null
          life_stage: string[]
          name: string
          product_line?: string | null
          species: string
          updated_at?: string
        }
        Update: {
          base_description?: string | null
          brand_id?: number
          canonical_name?: string | null
          created_at?: string
          data_completeness_score?: number | null
          data_confidence?: number | null
          id?: number
          is_discontinued?: boolean | null
          life_stage?: string[]
          name?: string
          product_line?: string | null
          species?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_models_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      product_options: {
        Row: {
          created_at: string | null
          data_type: string
          id: number
          label: string
          name: string
          options: string[] | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_type: string
          id?: number
          label: string
          name: string
          options?: string[] | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_type?: string
          id?: number
          label?: string
          name?: string
          options?: string[] | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          aafco_statement: string | null
          ash_max_percent: number | null
          calcium_min_percent: number | null
          calories_kcal_per_can: number | null
          calories_kcal_per_cup: number | null
          calories_kcal_per_kg: number | null
          created_at: string
          data_confidence: number | null
          data_quality_score: number | null
          data_source: string | null
          data_verified_at: string | null
          fat_max_percent: number | null
          fat_min_percent: number | null
          feeding_guidelines: Json | null
          fiber_max_percent: number | null
          first_five_ingredients: string[] | null
          flavor_id: number | null
          form_factor: string | null
          formulation_id: number | null
          full_name: string | null
          has_by_products: boolean | null
          has_meal: boolean | null
          id: number
          image_url: string | null
          ingredient_list_text: string
          last_verified_at: string | null
          meets_aafco_standards: boolean | null
          model_id: number
          moisture_max_percent: number | null
          omega3_min_percent: number | null
          omega6_min_percent: number | null
          pack_count: number
          package_size_unit: string | null
          package_size_value: number | null
          package_type_id: number | null
          phosphorus_min_percent: number | null
          protein_max_percent: number | null
          protein_min_percent: number | null
          search_vector: unknown | null
          taurine_min_percent: number | null
          updated_at: string
          variant_name_suffix: string | null
          verified_by: string | null
          weight_grams: number | null
        }
        Insert: {
          aafco_statement?: string | null
          ash_max_percent?: number | null
          calcium_min_percent?: number | null
          calories_kcal_per_can?: number | null
          calories_kcal_per_cup?: number | null
          calories_kcal_per_kg?: number | null
          created_at?: string
          data_confidence?: number | null
          data_quality_score?: number | null
          data_source?: string | null
          data_verified_at?: string | null
          fat_max_percent?: number | null
          fat_min_percent?: number | null
          feeding_guidelines?: Json | null
          fiber_max_percent?: number | null
          first_five_ingredients?: string[] | null
          flavor_id?: number | null
          form_factor?: string | null
          formulation_id?: number | null
          full_name?: string | null
          has_by_products?: boolean | null
          has_meal?: boolean | null
          id?: number
          image_url?: string | null
          ingredient_list_text: string
          last_verified_at?: string | null
          meets_aafco_standards?: boolean | null
          model_id: number
          moisture_max_percent?: number | null
          omega3_min_percent?: number | null
          omega6_min_percent?: number | null
          pack_count?: number
          package_size_unit?: string | null
          package_size_value?: number | null
          package_type_id?: number | null
          phosphorus_min_percent?: number | null
          protein_max_percent?: number | null
          protein_min_percent?: number | null
          search_vector?: unknown | null
          taurine_min_percent?: number | null
          updated_at?: string
          variant_name_suffix?: string | null
          verified_by?: string | null
          weight_grams?: number | null
        }
        Update: {
          aafco_statement?: string | null
          ash_max_percent?: number | null
          calcium_min_percent?: number | null
          calories_kcal_per_can?: number | null
          calories_kcal_per_cup?: number | null
          calories_kcal_per_kg?: number | null
          created_at?: string
          data_confidence?: number | null
          data_quality_score?: number | null
          data_source?: string | null
          data_verified_at?: string | null
          fat_max_percent?: number | null
          fat_min_percent?: number | null
          feeding_guidelines?: Json | null
          fiber_max_percent?: number | null
          first_five_ingredients?: string[] | null
          flavor_id?: number | null
          form_factor?: string | null
          formulation_id?: number | null
          full_name?: string | null
          has_by_products?: boolean | null
          has_meal?: boolean | null
          id?: number
          image_url?: string | null
          ingredient_list_text?: string
          last_verified_at?: string | null
          meets_aafco_standards?: boolean | null
          model_id?: number
          moisture_max_percent?: number | null
          omega3_min_percent?: number | null
          omega6_min_percent?: number | null
          pack_count?: number
          package_size_unit?: string | null
          package_size_value?: number | null
          package_type_id?: number | null
          phosphorus_min_percent?: number | null
          protein_max_percent?: number | null
          protein_min_percent?: number | null
          search_vector?: unknown | null
          taurine_min_percent?: number | null
          updated_at?: string
          variant_name_suffix?: string | null
          verified_by?: string | null
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_flavor_id_fkey"
            columns: ["flavor_id"]
            isOneToOne: false
            referencedRelation: "flavors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_formulation_id_fkey"
            columns: ["formulation_id"]
            isOneToOne: false
            referencedRelation: "formulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "product_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_package_type_id_fkey"
            columns: ["package_type_id"]
            isOneToOne: false
            referencedRelation: "package_types"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_logs: {
        Row: {
          app_version: string | null
          barcode: string
          barcode_type: string | null
          device_id: string | null
          found: boolean
          id: number
          latitude: number | null
          longitude: number | null
          scanned_at: string
          variant_id: number | null
        }
        Insert: {
          app_version?: string | null
          barcode: string
          barcode_type?: string | null
          device_id?: string | null
          found: boolean
          id?: number
          latitude?: number | null
          longitude?: number | null
          scanned_at?: string
          variant_id?: number | null
        }
        Update: {
          app_version?: string | null
          barcode?: string
          barcode_type?: string | null
          device_id?: string | null
          found?: boolean
          id?: number
          latitude?: number | null
          longitude?: number | null
          scanned_at?: string
          variant_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_logs_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      skus: {
        Row: {
          asin: string | null
          ean: string | null
          id: number
          is_active: boolean | null
          is_primary: boolean | null
          retailer_name: string | null
          retailer_sku: string | null
          upc: string | null
          valid_from: string | null
          valid_until: string | null
          variant_id: number
        }
        Insert: {
          asin?: string | null
          ean?: string | null
          id?: number
          is_active?: boolean | null
          is_primary?: boolean | null
          retailer_name?: string | null
          retailer_sku?: string | null
          upc?: string | null
          valid_from?: string | null
          valid_until?: string | null
          variant_id: number
        }
        Update: {
          asin?: string | null
          ean?: string | null
          id?: number
          is_active?: boolean | null
          is_primary?: boolean | null
          retailer_name?: string | null
          retailer_sku?: string | null
          upc?: string | null
          valid_from?: string | null
          valid_until?: string | null
          variant_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "skus_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      variant_attributes: {
        Row: {
          created_at: string | null
          id: number
          option_type_id: number
          updated_at: string | null
          value: string
          variant_id: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          option_type_id: number
          updated_at?: string | null
          value: string
          variant_id: number
        }
        Update: {
          created_at?: string | null
          id?: number
          option_type_id?: number
          updated_at?: string | null
          value?: string
          variant_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "variant_attributes_option_type_id_fkey"
            columns: ["option_type_id"]
            isOneToOne: false
            referencedRelation: "product_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variant_attributes_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_dry_matter_basis: {
        Args: { moisture_percent: number; nutrient_percent: number }
        Returns: number
      }
      find_duplicate_products: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          ingredients: string
          name: string
          total_skus: number
          total_variants: number
          variants: Json
        }[]
      }
      find_product_by_barcode: {
        Args:
          | { p_barcode: string; p_barcode_type?: string; p_retailer?: string }
          | { p_barcode: string; p_device_id?: string }
        Returns: {
          brand_name: string
          form_factor: string
          image_url: string
          model_name: string
          size_display: string
          variant_id: number
          variant_name: string
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      migrate_skus_to_barcodes: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
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

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const