import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Package, Image, Tag, List, Globe, Edit, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { IngredientProcessor } from "@/lib/ingredientProcessor";

interface AmazonReviewCreateProps {
  formState: any;
  updateFormState: (updates: any) => void;
  onComplete: () => void;
}

export const AmazonReviewCreate = ({ formState, updateFormState, onComplete }: AmazonReviewCreateProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingVariant, setEditingVariant] = useState<number | null>(null);
  const [editedVariants, setEditedVariants] = useState<any[]>([]);
  const { toast } = useToast();

  // Form factor options for inline editing
  const FORM_FACTOR_OPTIONS = [
    { value: "dehydrated", label: "Dehydrated" },
    { value: "dry kibble", label: "Dry Kibble" },
    { value: "freeze-dried", label: "Freeze-Dried" },
    { value: "raw frozen", label: "Raw Frozen" },
    { value: "semi-moist", label: "Semi-Moist" },
    { value: "topper", label: "Topper" },
    { value: "treats", label: "Treats" },
    { value: "wet chunks", label: "Wet Chunks" },
    { value: "wet pâté", label: "Wet Pâté" },
    { value: "wet shreds", label: "Wet Shreds" },
    { value: "wet stew", label: "Wet Stew" }
  ];

  const PACKAGE_SIZE_UNITS = [
    { value: "can", label: "Cans" },
    { value: "cup", label: "Cups" },
    { value: "g", label: "Grams (g)" },
    { value: "kg", label: "Kilograms (kg)" },
    { value: "l", label: "Liters (l)" },
    { value: "lb", label: "Pounds (lb)" },
    { value: "ml", label: "Milliliters (ml)" },
    { value: "oz", label: "Ounces (oz)" },
    { value: "pouch", label: "Pouches" }
  ];

  // Initialize edited variants from form state
  const getCurrentVariants = () => {
    return editedVariants.length > 0 ? editedVariants : formState.configuredVariants || [];
  };

  const startEditing = (index: number) => {
    setEditingVariant(index);
    if (editedVariants.length === 0) {
      setEditedVariants([...formState.configuredVariants]);
    }
  };

  const cancelEditing = () => {
    setEditingVariant(null);
  };

  const saveEditing = (index: number) => {
    setEditingVariant(null);
    updateFormState({ configuredVariants: editedVariants });
    toast({
      title: "Success",
      description: "Variant updated successfully."
    });
  };

  const updateVariantField = (index: number, field: string, value: any) => {
    setEditedVariants(prev => 
      prev.map((variant, i) => 
        i === index ? { ...variant, [field]: value } : variant
      )
    );
  };

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
      // Brand and product model should already be created in step 1
      if (!formState.brandId || !formState.productLineId) {
        throw new Error('Brand and product line must be set up in step 1 before creating products');
      }

      // Create variants
      for (const variant of formState.configuredVariants) {
        const { data: productVariant, error: variantError } = await supabase
          .from('product_variants')
          .insert({
            model_id: formState.productLineId,
            variant_name_suffix: variant.customName || variant.name,
            image_url: variant.imageUrl || null,
            form_factor: variant.formFactor || 'dry kibble',
            package_size_value: parseFloat(variant.packageSize || '1'),
            package_size_unit: variant.packageSizeUnit || 'lb',
            ingredient_list_text: variant.ingredients || 'Ingredients not specified',
            price: variant.price || null,
            cost: variant.cost || null,
            stock_status: variant.stockStatus || 'unknown',
            average_rating: variant.averageRating || null,
            review_count: variant.reviewCount || 0,
            created_by: 'amazon_flow',
            data_confidence: 80
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
                variant_id: productVariant.id,
                barcode: identifier.value,
                barcode_type: identifier.type.toLowerCase(),
                is_primary: false,
                is_verified: false,
                is_active: true
              });
          }
        }

        // Process ingredients and create ingredient-variant relationships
        if (variant.ingredients && variant.ingredients.trim()) {
          try {
            const ingredientResult = await IngredientProcessor.processVariantIngredients(
              productVariant.id,
              variant.ingredients
            );
            
            if (!ingredientResult.success) {
              console.warn(`Ingredient processing failed for variant ${productVariant.id}:`, ingredientResult.errors);
            }
          } catch (error) {
            console.error('Error processing ingredients:', error);
          }
        }
      }

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
        {getCurrentVariants().map((variant: any, index: number) => (
          <Card key={index} className="border-l-4 border-l-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {editingVariant === index ? (
                    <Input
                      value={variant.customName || variant.name}
                      onChange={(e) => updateVariantField(index, 'customName', e.target.value)}
                      className="font-semibold"
                    />
                  ) : (
                    variant.customName || variant.name
                  )}
                </CardTitle>
                <div className="flex gap-2">
                  {editingVariant === index ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => saveEditing(index)}
                        className="gap-1"
                      >
                        <Save className="h-3 w-3" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEditing}
                        className="gap-1"
                      >
                        <X className="h-3 w-3" />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEditing(index)}
                      className="gap-1"
                    >
                      <Edit className="h-3 w-3" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
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
                  {editingVariant === index ? (
                    <Select
                      value={variant.formFactor}
                      onValueChange={(value) => updateVariantField(index, 'formFactor', value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FORM_FACTOR_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary">{variant.formFactor}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Size:</span>
                  {editingVariant === index ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={variant.packageSize || ''}
                        onChange={(e) => updateVariantField(index, 'packageSize', e.target.value)}
                        className="w-16 h-6 text-xs"
                        placeholder="Size"
                      />
                      <Select
                        value={variant.packageSizeUnit}
                        onValueChange={(value) => updateVariantField(index, 'packageSizeUnit', value)}
                      >
                        <SelectTrigger className="w-20 h-6 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PACKAGE_SIZE_UNITS.map((unit) => (
                            <SelectItem key={unit.value} value={unit.value}>
                              {unit.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <Badge variant="outline">{variant.packageSize} {variant.packageSizeUnit}</Badge>
                  )}
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
              <div>
                <span className="text-sm font-medium">Description:</span>
                {editingVariant === index ? (
                  <Textarea
                    value={variant.description || ''}
                    onChange={(e) => updateVariantField(index, 'description', e.target.value)}
                    placeholder="Enter product description..."
                    className="mt-1 text-sm"
                    rows={2}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">
                    {variant.description || 'No description provided'}
                  </p>
                )}
              </div>
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
