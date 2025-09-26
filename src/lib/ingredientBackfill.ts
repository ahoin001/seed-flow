import { supabase } from '@/integrations/supabase/client';
import { IngredientProcessor } from './ingredientProcessor';

/**
 * Backfill ingredient data for existing product variants
 */
export class IngredientBackfill {
  /**
   * Process all existing product variants that have ingredient text but no ingredient relationships
   */
  static async backfillAllVariants(): Promise<{
    processed: number;
    ingredientsCreated: number;
    ingredientsLinked: number;
    errors: string[];
  }> {
    const result = {
      processed: 0,
      ingredientsCreated: 0,
      ingredientsLinked: 0,
      errors: [] as string[]
    };

    try {
      // Get all variants that have ingredient text but no ingredient analysis
      const { data: variants, error: variantError } = await supabase
        .from('product_variants')
        .select(`
          id,
          ingredient_list_text,
          variant_ingredient_analysis(id)
        `)
        .not('ingredient_list_text', 'is', null)
        .neq('ingredient_list_text', '');

      if (variantError) {
        result.errors.push(`Error fetching variants: ${variantError.message}`);
        return result;
      }

      if (!variants || variants.length === 0) {
        console.log('No variants found with ingredient text');
        return result;
      }

      // Filter variants that don't have ingredient analysis
      const variantsNeedingProcessing = variants.filter(variant => 
        !variant.variant_ingredient_analysis || variant.variant_ingredient_analysis.length === 0
      );

      console.log(`Found ${variantsNeedingProcessing.length} variants needing ingredient processing`);

      // Process each variant
      for (const variant of variantsNeedingProcessing) {
        try {
          const ingredientResult = await IngredientProcessor.processVariantIngredients(
            variant.id,
            variant.ingredient_list_text
          );

          result.processed++;
          result.ingredientsCreated += ingredientResult.ingredientsCreated;
          result.ingredientsLinked += ingredientResult.ingredientsLinked;
          result.errors.push(...ingredientResult.errors);

          if (ingredientResult.success) {
            console.log(`Processed ingredients for variant ${variant.id}`);
          } else {
            console.warn(`Failed to process ingredients for variant ${variant.id}:`, ingredientResult.errors);
          }
        } catch (error) {
          result.errors.push(`Error processing variant ${variant.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

    } catch (error) {
      result.errors.push(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Get statistics about ingredient processing status
   */
  static async getProcessingStats(): Promise<{
    totalVariants: number;
    variantsWithIngredientText: number;
    variantsWithIngredientAnalysis: number;
    totalIngredients: number;
    totalIngredientRelationships: number;
  }> {
    try {
      // Get total variants
      const { count: totalVariants } = await supabase
        .from('product_variants')
        .select('*', { count: 'exact', head: true });

      // Get variants with ingredient text
      const { count: variantsWithIngredientText } = await supabase
        .from('product_variants')
        .select('*', { count: 'exact', head: true })
        .not('ingredient_list_text', 'is', null)
        .neq('ingredient_list_text', '');

      // Get variants with ingredient analysis
      const { count: variantsWithIngredientAnalysis } = await supabase
        .from('variant_ingredient_analysis')
        .select('variant_id', { count: 'exact', head: true });

      // Get total ingredients
      const { count: totalIngredients } = await supabase
        .from('ingredients')
        .select('*', { count: 'exact', head: true });

      // Get total ingredient relationships
      const { count: totalIngredientRelationships } = await supabase
        .from('variant_ingredient_analysis')
        .select('*', { count: 'exact', head: true });

      return {
        totalVariants: totalVariants || 0,
        variantsWithIngredientText: variantsWithIngredientText || 0,
        variantsWithIngredientAnalysis: variantsWithIngredientAnalysis || 0,
        totalIngredients: totalIngredients || 0,
        totalIngredientRelationships: totalIngredientRelationships || 0
      };
    } catch (error) {
      console.error('Error getting processing stats:', error);
      return {
        totalVariants: 0,
        variantsWithIngredientText: 0,
        variantsWithIngredientAnalysis: 0,
        totalIngredients: 0,
        totalIngredientRelationships: 0
      };
    }
  }
}
