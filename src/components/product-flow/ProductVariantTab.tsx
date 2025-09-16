import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, Plus, Trash2, Image, Package, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { FormState } from "@/pages/ProductFlow";

interface ProductVariantTabProps {
  formState: FormState;
  updateFormState: (updates: Partial<FormState>) => void;
  onComplete: () => void;
}

interface VariantData {
  id?: string;
  name: string;
  imageUrl: string;
  upc: string;
  ean: string;
  asin: string;
}

interface ExistingVariant {
  id: string;
  name: string;
  identifiers?: Array<{
    identifier_type: string;
    identifier_value: string;
    is_primary: boolean;
  }>;
}

export const ProductVariantTab = ({ formState, updateFormState, onComplete }: ProductVariantTabProps) => {
  const [variants, setVariants] = useState<VariantData[]>([
    { name: "", imageUrl: "", upc: "", ean: "", asin: "" }
  ]);
  const [existingVariants, setExistingVariants] = useState<ExistingVariant[]>([]);
  const [selectedExistingVariants, setSelectedExistingVariants] = useState<string[]>([]);
  const [showCreateNew, setShowCreateNew] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Only fetch existing variants if using existing product line
    if (!formState.isNewProductLine && formState.productLineId) {
      fetchExistingVariants();
    }
  }, [formState.productLineId, formState.isNewProductLine]);

  const fetchExistingVariants = async () => {
    try {
      const { data: variantsData, error: variantsError } = await supabase
        .from("product_variants")
        .select("id, name")
        .eq("product_line_id", formState.productLineId);

      if (variantsError) {
        console.error("Error fetching existing variants:", variantsError);
        throw variantsError;
      }

      const transformedData = variantsData?.map((variant) => ({
        id: variant.id,
        name: variant.name,
        identifiers: [] // Empty for now
      })) || [];

      setExistingVariants(transformedData);
    } catch (error) {
      console.error("Error fetching existing variants:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch existing variants."
      });
    }
  };

  const addVariant = () => {
    setVariants(prev => [...prev, { name: "", imageUrl: "", upc: "", ean: "", asin: "" }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateVariant = (index: number, field: keyof VariantData, value: string) => {
    setVariants(prev => prev.map((variant, i) => 
      i === index ? { ...variant, [field]: value } : variant
    ));
  };

  const handleExistingVariantToggle = (variantId: string) => {
    setSelectedExistingVariants(prev => 
      prev.includes(variantId) 
        ? prev.filter(id => id !== variantId)
        : [...prev, variantId]
    );
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      let variantIds: string[] = [];

      // Handle existing variants selection
      if (!formState.isNewProductLine && selectedExistingVariants.length > 0) {
        variantIds = [...selectedExistingVariants];
      }

      // Handle new variants creation (only if creating new or adding to existing)
      if (showCreateNew) {
        const validVariants = variants.filter(variant => variant.name.trim());
        
        if (validVariants.length > 0) {
          // First, create the product variants (without identifiers)
          const variantInserts = validVariants.map(variant => ({
            product_line_id: formState.productLineId,
            name: variant.name
          }));

          const { data: createdVariants, error: variantError } = await supabase
            .from("product_variants")
            .insert(variantInserts)
            .select("id");

          if (variantError) {
            console.error("Error creating variants:", variantError);
            throw variantError;
          }

          // Now create product identifiers for each variant
          const identifierInserts = [];
          for (let i = 0; i < createdVariants.length; i++) {
            const variant = validVariants[i];
            const variantId = createdVariants[i].id;

            // Add UPC identifier if provided
            if (variant.upc.trim()) {
              identifierInserts.push({
                product_variant_id: variantId,
                identifier_type: 'UPC',
                identifier_value: variant.upc.trim(),
                is_primary: true, // Make UPC primary if it's the first/main identifier
                source: 'user'
              });
            }

            // Add EAN identifier if provided
            if (variant.ean.trim()) {
              identifierInserts.push({
                product_variant_id: variantId,
                identifier_type: 'EAN',
                identifier_value: variant.ean.trim(),
                is_primary: !variant.upc.trim(), // Make EAN primary only if no UPC
                source: 'user'
              });
            }

            // Add ASIN identifier if provided
            if (variant.asin.trim()) {
              identifierInserts.push({
                product_variant_id: variantId,
                identifier_type: 'ASIN',
                identifier_value: variant.asin.trim(),
                is_primary: !variant.upc.trim() && !variant.ean.trim(), // Make ASIN primary only if no UPC/EAN
                source: 'user'
              });
            }
          }

          // Insert product identifiers
          if (identifierInserts.length > 0) {
            const { error: identifierError } = await supabase
              .from("product_identifiers")
              .insert(identifierInserts);

            if (identifierError) {
              console.error("Error creating identifiers:", identifierError);
              throw identifierError;
            }
          }

          variantIds = [...variantIds, ...createdVariants.map(v => v.id)];
        }
      }

      if (variantIds.length === 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please select existing variants or create new ones."
        });
        return;
      }

      updateFormState({ variantIds });

      toast({
        title: "Success!",
        description: `${variantIds.length} variant(s) selected/created successfully.`
      });

      onComplete();
    } catch (error) {
      console.error("Error processing product variants:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to process product variants: ${error.message || 'Unknown error'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = (showCreateNew && variants.some(variant => variant.name.trim())) || 
                  (!formState.isNewProductLine && selectedExistingVariants.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Product Variants</h2>
        <p className="text-muted-foreground">
          {formState.isNewProductLine 
            ? "Add different variants for your product line (e.g., different sizes, flavors, etc.)"
            : "Select existing variants or create new ones for this product line"
          }
        </p>
      </div>

      {/* Existing Variants Selection (only for existing product lines) */}
      {!formState.isNewProductLine && existingVariants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Existing Variants
            </CardTitle>
            <CardDescription>
              Select existing variants from this product line
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {existingVariants.map((variant) => (
                <div key={variant.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    id={`existing-${variant.id}`}
                    checked={selectedExistingVariants.includes(variant.id)}
                    onCheckedChange={() => handleExistingVariantToggle(variant.id)}
                  />
                  <div className="flex-1">
                    <label htmlFor={`existing-${variant.id}`} className="text-sm font-medium cursor-pointer">
                      {variant.name}
                    </label>
                    <div className="text-xs text-muted-foreground">
                      Identifiers will be loaded when types are updated
                    </div>
                  </div>
                  {selectedExistingVariants.includes(variant.id) && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create New Variants Section */}
      {(!formState.isNewProductLine && existingVariants.length > 0) && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="create-new-toggle"
            checked={showCreateNew}
            onCheckedChange={(checked) => setShowCreateNew(checked === true)}
          />
          <Label htmlFor="create-new-toggle" className="text-sm font-medium">
            Also create new variants
          </Label>
        </div>
      )}

      {/* New Variants */}
      {showCreateNew && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            {formState.isNewProductLine ? "Create Variants" : "Create New Variants"}
          </h3>
          {variants.map((variant, index) => (
          <Card key={index} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5" />
                  Variant {index + 1}
                </CardTitle>
                {variants.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeVariant(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`variant-name-${index}`}>Variant Name *</Label>
                  <Input
                    id={`variant-name-${index}`}
                    value={variant.name}
                    onChange={(e) => updateVariant(index, "name", e.target.value)}
                    placeholder="e.g., Chicken & Rice 5lb"
                  />
                </div>
                <div>
                  <Label htmlFor={`variant-image-${index}`}>Image URL</Label>
                  <Input
                    id={`variant-image-${index}`}
                    value={variant.imageUrl}
                    onChange={(e) => updateVariant(index, "imageUrl", e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <div>
                  <Label htmlFor={`variant-upc-${index}`}>UPC</Label>
                  <Input
                    id={`variant-upc-${index}`}
                    value={variant.upc}
                    onChange={(e) => updateVariant(index, "upc", e.target.value)}
                    placeholder="123456789012"
                  />
                </div>
                <div>
                  <Label htmlFor={`variant-ean-${index}`}>EAN</Label>
                  <Input
                    id={`variant-ean-${index}`}
                    value={variant.ean}
                    onChange={(e) => updateVariant(index, "ean", e.target.value)}
                    placeholder="1234567890123"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor={`variant-asin-${index}`}>ASIN</Label>
                  <Input
                    id={`variant-asin-${index}`}
                    value={variant.asin}
                    onChange={(e) => updateVariant(index, "asin", e.target.value)}
                    placeholder="B08XXXXXXX"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          ))}

          {/* Add Variant Button */}
          <div className="flex justify-center">
            <Button onClick={addVariant} variant="outline" size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Add Another Variant
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!isValid || isLoading}
          variant="premium"
          size="lg"
        >
          {isLoading ? "Creating..." : "Continue to Options"}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};