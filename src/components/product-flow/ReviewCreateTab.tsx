import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CheckCircle, Package, Tag, Barcode, Leaf, Activity, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { FormState } from "@/pages/ProductFlow";
import { IngredientProcessor } from "@/lib/ingredientProcessor";

interface ReviewCreateTabProps {
  formState: FormState;
  updateFormState: (updates: Partial<FormState>) => void;
  onComplete: () => void;
  onNavigateToStep?: (stepId: string) => void;
}

export const ReviewCreateTab = ({ formState, updateFormState, onComplete, onNavigateToStep }: ReviewCreateTabProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  // Mark review step as completed when component mounts
  React.useEffect(() => {
    if (!formState.completedTabs.includes('review-create')) {
      updateFormState({ completedTabs: [...formState.completedTabs, 'review-create'] });
    }
  }, []);

  const handleCreateProduct = async () => {
    setIsCreating(true);
    try {
      if (!formState.brandId || !formState.productLineId || !formState.generatedVariants) {
        throw new Error("Missing required data for product creation");
      }

      // Create product variants in the database
      const variantInserts = formState.generatedVariants
        .filter(variant => variant.data.isActive)
        .map(variant => ({
          model_id: formState.productLineId,
          variant_name_suffix: variant.data.variant_name_suffix || null,
          image_url: variant.data.image_url || null,
          form_factor: variant.data.form_factor || null,
          package_size_value: variant.data.package_size_value || null,
          package_size_unit: variant.data.package_size_unit || null,
          ingredient_list_text: variant.data.ingredients?.join(', ') || null,
          first_five_ingredients: variant.data.ingredients?.slice(0, 5) || null,
          data_confidence: 50,
          data_quality_score: 0
        }));

      if (variantInserts.length === 0) {
        throw new Error("No active variants to create");
      }

      // Insert variants
      const { data: createdVariants, error: variantError } = await supabase
        .from('product_variants')
        .insert(variantInserts)
        .select('id');

      if (variantError) throw variantError;

      // Create barcodes for each variant
      const barcodeInserts = [];
      for (let i = 0; i < createdVariants.length; i++) {
        const variant = formState.generatedVariants[i];
        const variantId = createdVariants[i].id;
        
        if (variant.data.barcodes && variant.data.barcodes.length > 0) {
          for (const barcode of variant.data.barcodes) {
            barcodeInserts.push({
              variant_id: variantId,
              barcode: barcode.barcode,
              barcode_type: barcode.barcode_type,
              retailer: barcode.retailer || null,
              is_primary: barcode.is_primary,
              is_verified: false
            });
          }
        }
      }

      if (barcodeInserts.length > 0) {
        const { error: barcodeError } = await supabase
          .from('barcodes')
          .insert(barcodeInserts);

        if (barcodeError) throw barcodeError;
      }

      // Create variant attributes for option values
      const attributeInserts = [];
      for (let i = 0; i < createdVariants.length; i++) {
        const variant = formState.generatedVariants[i];
        const variantId = createdVariants[i].id;
        
        if (variant.data.optionValues) {
          for (const [optionTypeName, value] of Object.entries(variant.data.optionValues)) {
            // Find the option type ID
            const optionType = formState.selectedOptionTypes?.find(ot => ot.name === optionTypeName);
            if (optionType) {
              attributeInserts.push({
                variant_id: variantId,
                option_type_id: optionType.id,
                value: value
              });
            }
          }
        }
      }

      if (attributeInserts.length > 0) {
        const { error: attributeError } = await supabase
          .from('variant_attributes')
          .insert(attributeInserts);

        if (attributeError) throw attributeError;
      }

      // Process ingredients for all variants
      const ingredientProcessingPromises = createdVariants.map(async (createdVariant, index) => {
        const variant = formState.generatedVariants[index];
        if (variant.data.ingredients && variant.data.ingredients.length > 0) {
          const ingredientText = variant.data.ingredients.join(', ');
          return IngredientProcessor.processVariantIngredients(createdVariant.id, ingredientText);
        }
        return null;
      });

      const ingredientResults = await Promise.all(ingredientProcessingPromises);
      const successfulProcessings = ingredientResults.filter(result => result && result.success).length;
      
      if (successfulProcessings > 0) {
        console.log(`Successfully processed ingredients for ${successfulProcessings} variants`);
      }

      // Create product model categories
      if (formState.generatedVariants[0]?.data.categories && formState.generatedVariants[0].data.categories.length > 0) {
        const categoryInserts = formState.generatedVariants[0].data.categories.map(categoryId => ({
          product_model_id: formState.productLineId,
          category_id: categoryId,
          is_primary: false
        }));

        const { error: categoryError } = await supabase
          .from('product_model_categories')
          .insert(categoryInserts);

        if (categoryError) throw categoryError;
      }
      
      toast({
        title: "Success!",
        description: `Product created successfully with ${createdVariants.length} variants and all associated data.`
      });

      onComplete();
    } catch (error) {
      console.error("Error creating product:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to create product: ${error.message}`
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getCompletionStatus = () => {
    const totalSteps = 4; // We have 4 steps: Brand & Product Line, Variant Options, Product Variants, Review & Create
    const completedSteps = formState.completedTabs.length;
    return {
      completed: completedSteps,
      total: totalSteps,
      percentage: Math.round((completedSteps / totalSteps) * 100)
    };
  };

  const status = getCompletionStatus();

  const startEditing = (section: string, data: any) => {
    setEditingSection(section);
    setEditFormData(data);
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setEditFormData({});
  };

  const saveEditing = () => {
    // Update form state with edited data
    updateFormState(editFormData);
    setEditingSection(null);
    setEditFormData({});
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Review & Create Product</h2>
        <p className="text-muted-foreground">
          Review all the information before creating your product
        </p>
      </div>

      {/* Progress Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Completion Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">
                {status.completed} of {status.total} steps completed
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${status.percentage}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {status.percentage}% complete
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Product Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Information
              </div>
              {onNavigateToStep && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onNavigateToStep('brand-product-line')}
                >
                  Edit
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {editingSection === 'product-info' ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Brand ID</Label>
                  <Input 
                    value={editFormData.brandId || formState.brandId || ''} 
                    onChange={(e) => setEditFormData({...editFormData, brandId: parseInt(e.target.value) || 0})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Product Line ID</Label>
                  <Input 
                    value={editFormData.productLineId || formState.productLineId || ''} 
                    onChange={(e) => setEditFormData({...editFormData, productLineId: parseInt(e.target.value) || 0})}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveEditing}>Save</Button>
                  <Button size="sm" variant="outline" onClick={cancelEditing}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <Label className="text-sm font-medium">Brand ID</Label>
                  <p className="text-sm text-muted-foreground">{formState.brandId || 'Not set'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Product Line ID</Label>
                  <p className="text-sm text-muted-foreground">{formState.productLineId || 'Not set'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Categories</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {formState.categoryIds.length > 0 ? (
                      formState.categoryIds.map((id) => (
                        <Badge key={id} variant="outline">Category {id}</Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No categories selected</span>
                    )}
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => startEditing('product-info', { brandId: formState.brandId, productLineId: formState.productLineId })}
                >
                  Edit Inline
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Variants Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Variants
              </div>
              {onNavigateToStep && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onNavigateToStep('variants')}
                >
                  Edit
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Total Variants</Label>
              <p className="text-sm text-muted-foreground">
                {formState.generatedVariants?.length || 0} variants
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Option Types</Label>
              <p className="text-sm text-muted-foreground">
                {formState.selectedOptionTypes?.length || 0} option types selected
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Permutations</Label>
              <p className="text-sm text-muted-foreground">
                {formState.variantPermutations || 0} total permutations
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variants Preview */}
      {formState.generatedVariants && formState.generatedVariants.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Generated Variants</CardTitle>
                <CardDescription>
                  Preview of the variants that will be created
                </CardDescription>
              </div>
              {onNavigateToStep && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onNavigateToStep('option-types')}
                >
                  Edit Options
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {formState.generatedVariants.slice(0, 6).map((variant) => (
                <Card key={variant.id}>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">{variant.name}</h4>
                    <div className="space-y-1">
                      {Object.entries(variant.optionValues).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{key}:</span>
                          <span>{value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {formState.generatedVariants.length > 6 && (
                <Card>
                  <CardContent className="p-4 flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">
                      +{formState.generatedVariants.length - 6} more variants
                    </span>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ingredients & Nutrition Preview */}
      {(formState.ingredients || formState.variantNutrition) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="h-5 w-5" />
              Ingredients & Nutrition
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formState.ingredients && formState.ingredients.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Ingredients</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {formState.ingredients.map((ingredient) => (
                    <Badge key={ingredient} variant="outline">{ingredient}</Badge>
                  ))}
                </div>
              </div>
            )}
            {formState.variantNutrition && formState.variantNutrition.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Nutritional Data</Label>
                <p className="text-sm text-muted-foreground">
                  Nutritional information added for {formState.variantNutrition.length} variants
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4" />
          <span>Review all information before creating the product</span>
        </div>
        <Button 
          onClick={handleCreateProduct} 
          disabled={isLoading || isCreating || status.percentage < 100}
          className="min-w-[160px]"
        >
          {isCreating ? (
            "Creating Product..."
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Create Product
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
