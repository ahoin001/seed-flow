import { supabase } from '@/integrations/supabase/client';

export interface ParsedIngredient {
  name: string;
  position: number;
  percentage?: number;
  isPrimary: boolean;
}

export interface IngredientProcessingResult {
  success: boolean;
  ingredientsCreated: number;
  ingredientsLinked: number;
  errors: string[];
}

/**
 * Processes ingredient lists and creates proper ingredient-variant relationships
 */
export class IngredientProcessor {
  /**
   * Parse ingredient list text into individual ingredients
   */
  static parseIngredientList(ingredientText: string): ParsedIngredient[] {
    if (!ingredientText || ingredientText.trim() === '') {
      return [];
    }

    // Split by common separators and clean up
    const ingredients = ingredientText
      .split(/[,;]/)
      .map(ingredient => ingredient.trim())
      .filter(ingredient => ingredient.length > 0)
      .map((ingredient, index) => ({
        name: ingredient,
        position: index + 1,
        percentage: this.extractPercentage(ingredient),
        isPrimary: index < 5 // First 5 ingredients are typically primary
      }));

    return ingredients;
  }

  /**
   * Extract percentage from ingredient name if present
   */
  private static extractPercentage(ingredient: string): number | undefined {
    const percentageMatch = ingredient.match(/(\d+(?:\.\d+)?)\s*%/);
    return percentageMatch ? parseFloat(percentageMatch[1]) : undefined;
  }

  /**
   * Process ingredients for a product variant
   */
  static async processVariantIngredients(
    variantId: number,
    ingredientText: string
  ): Promise<IngredientProcessingResult> {
    const result: IngredientProcessingResult = {
      success: true,
      ingredientsCreated: 0,
      ingredientsLinked: 0,
      errors: []
    };

    try {
      // Parse ingredients
      const parsedIngredients = this.parseIngredientList(ingredientText);
      
      if (parsedIngredients.length === 0) {
        return result;
      }

      // Get ingredient names
      const ingredientNames = parsedIngredients.map(ing => ing.name);

      // Check which ingredients already exist
      const { data: existingIngredients, error: searchError } = await supabase
        .from('ingredients')
        .select('id, name')
        .in('name', ingredientNames);

      if (searchError) {
        result.errors.push(`Error searching ingredients: ${searchError.message}`);
        result.success = false;
        return result;
      }

      const existingNames = new Set(existingIngredients?.map(ing => ing.name.toLowerCase()) || []);
      const newIngredientNames = ingredientNames.filter(name => 
        !existingNames.has(name.toLowerCase())
      );

      // Create new ingredients
      let newIngredients: any[] = [];
      if (newIngredientNames.length > 0) {
        const { data: createdIngredients, error: createError } = await supabase
          .from('ingredients')
          .insert(
            newIngredientNames.map(name => ({
              name: name,
              is_toxic: false,
              is_controversial: false,
              tags: []
            }))
          )
          .select('id, name');

        if (createError) {
          result.errors.push(`Error creating ingredients: ${createError.message}`);
          result.success = false;
          return result;
        }

        newIngredients = createdIngredients || [];
        result.ingredientsCreated = newIngredients.length;
      }

      // Combine existing and new ingredients
      const allIngredients = [...(existingIngredients || []), ...newIngredients];
      
      // Create ingredient-variant relationships
      const analysisInserts = parsedIngredients.map(parsedIngredient => {
        const ingredient = allIngredients.find(ing => 
          ing.name.toLowerCase() === parsedIngredient.name.toLowerCase()
        );
        
        if (!ingredient) {
          result.errors.push(`Ingredient not found: ${parsedIngredient.name}`);
          return null;
        }

        return {
          variant_id: variantId,
          ingredient_id: ingredient.id,
          ingredient_name: parsedIngredient.name,
          position_in_list: parsedIngredient.position,
          amount_percent: parsedIngredient.percentage || null,
          is_primary_ingredient: parsedIngredient.isPrimary,
          analysis_notes: null
        };
      }).filter(Boolean);

      if (analysisInserts.length > 0) {
        const { error: analysisError } = await supabase
          .from('variant_ingredient_analysis')
          .insert(analysisInserts);

        if (analysisError) {
          result.errors.push(`Error linking ingredients: ${analysisError.message}`);
          result.success = false;
          return result;
        }

        result.ingredientsLinked = analysisInserts.length;
      }

    } catch (error) {
      result.errors.push(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.success = false;
    }

    return result;
  }

  /**
   * Process ingredients for multiple variants
   */
  static async processMultipleVariants(
    variants: Array<{ id: number; ingredientText: string }>
  ): Promise<IngredientProcessingResult> {
    const result: IngredientProcessingResult = {
      success: true,
      ingredientsCreated: 0,
      ingredientsLinked: 0,
      errors: []
    };

    for (const variant of variants) {
      const variantResult = await this.processVariantIngredients(
        variant.id,
        variant.ingredientText
      );

      result.ingredientsCreated += variantResult.ingredientsCreated;
      result.ingredientsLinked += variantResult.ingredientsLinked;
      result.errors.push(...variantResult.errors);
    }

    result.success = result.errors.length === 0;
    return result;
  }
}
