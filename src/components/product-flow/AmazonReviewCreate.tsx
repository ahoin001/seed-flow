import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Package, Image, Tag, List, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AmazonReviewCreateProps {
  formState: any;
  updateFormState: (updates: any) => void;
  onComplete: () => void;
}

export const AmazonReviewCreate = ({ formState, updateFormState, onComplete }: AmazonReviewCreateProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const handleCreateProduct = async () => {
    if (!formState.configuredVariants || formState.configuredVariants.length === 0) {
      toast({
        variant: "destructive",
        title: "No Variants",
        description: "No variants configured to create."
      });
      return;
    }

    setIsCreating(true);
    try {
      // Use brand from form state or create default
      let brandId;
      if (formState.brand?.id) {
        brandId = formState.brand.id;
      } else {
        const { data: brand, error: brandError } = await supabase
          .from('brands')
          .insert({
            name: formState.brand?.name || 'Amazon Product Brand',
            description: formState.brand?.description || 'Brand created from Amazon product data'
          })
          .select('id')
          .single();

        if (brandError) throw brandError;
        brandId = brand.id;
      }

      // Create product model
      const { data: productModel, error: modelError } = await supabase
        .from('product_models')
        .insert({
          brand_id: brandId,
          name: formState.productLine?.name || formState.configuredVariants[0]?.customName || 'Amazon Product',
          description: formState.productLine?.description || formState.configuredVariants[0]?.description || '',
          image_url: formState.productLine?.image_url || formState.configuredVariants[0]?.imageUrl || null,
          form_factor: formState.productLine?.form_factor || formState.configuredVariants[0]?.formFactor || 'dry',
          package_size: parseFloat(formState.productLine?.package_size || formState.configuredVariants[0]?.packageSize || '0'),
          package_size_unit: formState.productLine?.package_size_unit || formState.configuredVariants[0]?.packageSizeUnit || 'lb'
        })
        .select('id')
        .single();

      if (modelError) throw modelError;

      // Create variants
      for (const variant of formState.configuredVariants) {
        const { data: productVariant, error: variantError } = await supabase
          .from('product_variants')
          .insert({
            product_model_id: productModel.id,
            variant_name: variant.name,
            variant_name_suffix: variant.customName,
            image_url: variant.imageUrl || null,
            form_factor: variant.formFactor,
            package_size: parseFloat(variant.packageSize || '0'),
            package_size_unit: variant.packageSizeUnit,
            description: variant.description || '',
            data_confidence: 0.8
          })
          .select('id')
          .single();

        if (variantError) throw variantError;

        // Create identifiers
        for (const identifier of variant.identifiers || []) {
          if (identifier.type && identifier.value) {
            await supabase
              .from('barcodes')
              .insert({
                product_variant_id: productVariant.id,
                barcode_type: identifier.type.toLowerCase(),
                barcode_value: identifier.value,
                is_primary: false
              });
          }
        }

        // Create ingredients if provided
        if (variant.ingredients) {
          const ingredientNames = variant.ingredients.split(',').map((ing: string) => ing.trim());
          
          for (const ingredientName of ingredientNames) {
            if (ingredientName) {
              // Check if ingredient exists
              const { data: existingIngredient } = await supabase
                .from('ingredients')
                .select('id')
                .eq('name', ingredientName)
                .single();

              let ingredientId;
              if (existingIngredient) {
                ingredientId = existingIngredient.id;
              } else {
                const { data: newIngredient, error: ingredientError } = await supabase
                  .from('ingredients')
                  .insert({
                    name: ingredientName,
                    is_toxic: false,
                    is_controversial: false,
                    tags: []
                  })
                  .select('id')
                  .single();

                if (ingredientError) throw ingredientError;
                ingredientId = newIngredient.id;
              }

              // Link ingredient to variant
              await supabase
                .from('variant_ingredients')
                .insert({
                  variant_id: productVariant.id,
                  ingredient_id: ingredientId
                });
            }
          }
        }
      }

      toast({
        title: "Success",
        description: `Created product with ${formState.configuredVariants.length} variant${formState.configuredVariants.length !== 1 ? 's' : ''} successfully!`
      });

      onComplete();
      
    } catch (error) {
      console.error('Error creating product:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create product. Please try again."
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Review & Create Product</h2>
        <p className="text-muted-foreground">
          Review your configured variants and create the product in the database.
        </p>
      </div>

      {/* Summary */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            Ready to Create Product
          </CardTitle>
          <CardDescription className="text-green-700">
            All variants have been configured and are ready for creation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-green-600" />
              <span>{formState.configuredVariants?.length || 0} Variants</span>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-green-600" />
              <span>{formState.configuredVariants?.reduce((sum: number, v: any) => sum + (v.identifiers?.length || 0), 0)} Identifiers</span>
            </div>
            <div className="flex items-center gap-2">
              <List className="h-4 w-4 text-green-600" />
              <span>{formState.configuredVariants?.filter((v: any) => v.ingredients).length} with Ingredients</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Variants Review */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Configured Variants</h3>
        {formState.configuredVariants?.map((variant: any, index: number) => (
          <Card key={index} className="border-l-4 border-l-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {variant.customName || variant.name}
              </CardTitle>
              <CardDescription>
                {Object.entries(variant.values || {}).map(([key, value]) => (
                  <Badge key={key} variant="outline" className="mr-1">
                    {key}: {value}
                  </Badge>
                ))}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Product Image */}
              {variant.imageUrl && (
                <div className="flex items-center gap-3">
                  <Image className="h-4 w-4 text-muted-foreground" />
                  <img src={variant.imageUrl} alt="Product" className="w-16 h-16 object-cover rounded border" />
                </div>
              )}

              {/* Form Factor and Package Size */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Form:</span>
                  <Badge variant="secondary">{variant.formFactor}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Size:</span>
                  <Badge variant="outline">{variant.packageSize} {variant.packageSizeUnit}</Badge>
                </div>
              </div>

              {/* Identifiers */}
              {variant.identifiers && variant.identifiers.length > 0 && (
                <div className="flex items-center gap-3">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-sm font-medium">Identifiers:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {variant.identifiers.map((id: any, idIndex: number) => (
                        <Badge key={idIndex} variant="outline" className="text-xs">
                          {id.type}: {id.value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Ingredients */}
              {variant.ingredients && (
                <div className="flex items-center gap-3">
                  <List className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-sm font-medium">Ingredients:</span>
                    <p className="text-sm text-muted-foreground line-clamp-2">{variant.ingredients}</p>
                  </div>
                </div>
              )}

              {/* Description */}
              {variant.description && (
                <div>
                  <span className="text-sm font-medium">Description:</span>
                  <p className="text-sm text-muted-foreground mt-1">{variant.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Button */}
      <div className="flex justify-center pt-6 border-t">
        <Button 
          onClick={handleCreateProduct}
          disabled={isCreating || !formState.configuredVariants?.length}
          size="lg"
          className="gap-2"
        >
          {isCreating ? (
            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          {isCreating ? 'Creating Product...' : 'Create Product'}
        </Button>
      </div>

      {/* Completion Message */}
      {formState.configuredVariants?.length === 0 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-800">
              <Globe className="h-5 w-5" />
              <span className="font-medium">No Variants Configured</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              Please go back to the previous steps to configure your variants.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
