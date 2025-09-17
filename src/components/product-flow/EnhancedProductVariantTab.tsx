import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Plus, Trash2, Package, Check, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { FormState } from "@/pages/ProductFlow";

interface ProductVariantTabProps {
  formState: FormState;
  updateFormState: (updates: Partial<FormState>) => void;
  onComplete: () => void;
}

interface VariantOptionType {
  id: string;
  name: string;
  display_name: string;
  data_type: string;
  unit: string | null;
  is_required: boolean;
  sort_order: number;
  fuzzy_matching_enabled?: boolean;
  auto_suggest_enabled?: boolean;
  category?: string;
  validation_pattern?: string;
  display_format?: string;
  search_aliases?: string[];
}

interface VariantOptionValue {
  id: string;
  value: string;
  display_value: string;
  normalized_value?: string;
  numeric_value: number | null;
  sort_order: number;
  confidence_score?: number;
  is_verified?: boolean;
  verification_source?: string;
  search_keywords?: string[];
}

interface VariantData {
  id?: string;
  name: string;
  sku: string;
  base_weight: number | null;
  weight_unit: string;
  packaging_type: string | null;
  options: Record<string, string>; // option_type_name -> option_value_id
}

interface ExistingVariant {
  id: string;
  name: string;
  sku: string | null;
  options: Array<{
    option_type: string;
    option_display_name: string;
    option_value: string;
    option_display_value: string;
    numeric_value: number | null;
    unit: string | null;
  }>;
}

export const EnhancedProductVariantTab = ({ formState, updateFormState, onComplete }: ProductVariantTabProps) => {
  const [variants, setVariants] = useState<VariantData[]>([
    { 
      name: "", 
      sku: "", 
      base_weight: null, 
      weight_unit: "oz", 
      packaging_type: null,
      options: {} 
    }
  ]);
  const [existingVariants, setExistingVariants] = useState<ExistingVariant[]>([]);
  const [selectedExistingVariants, setSelectedExistingVariants] = useState<string[]>([]);
  const [showCreateNew, setShowCreateNew] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // Option types and values for the product line
  const [availableOptionTypes, setAvailableOptionTypes] = useState<VariantOptionType[]>([]);
  const [availableOptionValues, setAvailableOptionValues] = useState<Record<string, VariantOptionValue[]>>({});
  const [productLineOptionTypes, setProductLineOptionTypes] = useState<string[]>([]);

  useEffect(() => {
    if (formState.productLineId) {
      fetchProductLineConfiguration();
      if (!formState.isNewProductLine) {
        fetchExistingVariants();
      }
    }
  }, [formState.productLineId, formState.isNewProductLine]);

  const fetchProductLineConfiguration = async () => {
    try {
      // Fetch available option types for this product line
      const { data: optionTypesData, error: optionTypesError } = await supabase
        .from("product_line_option_types")
        .select(`
          option_type_id,
          is_required,
          sort_order,
          variant_option_types (
            id,
            name,
            display_name,
            data_type,
            unit,
            is_required,
            sort_order,
            fuzzy_matching_enabled,
            auto_suggest_enabled,
            category,
            validation_pattern,
            display_format,
            search_aliases
          )
        `)
        .eq("product_line_id", formState.productLineId)
        .order("sort_order");

      if (optionTypesError) throw optionTypesError;

      const optionTypes = optionTypesData?.map(item => item.variant_option_types).filter(Boolean) || [];
      setAvailableOptionTypes(optionTypes);
      setProductLineOptionTypes(optionTypes.map(ot => ot.name));

      // Fetch all available option values for these types
      const optionTypeIds = optionTypes.map(ot => ot.id);
      if (optionTypeIds.length > 0) {
        const { data: optionValuesData, error: optionValuesError } = await supabase
          .from("variant_option_values")
          .select(`
            id,
            option_type_id,
            value,
            display_value,
            normalized_value,
            numeric_value,
            sort_order,
            confidence_score,
            is_verified,
            verification_source,
            search_keywords
          `)
          .in("option_type_id", optionTypeIds)
          .order("sort_order");

        if (optionValuesError) throw optionValuesError;

        // Group option values by option type
        const groupedValues: Record<string, VariantOptionValue[]> = {};
        optionValuesData?.forEach(ov => {
          const optionType = optionTypes.find(ot => ot.id === ov.option_type_id);
          if (optionType) {
            if (!groupedValues[optionType.name]) {
              groupedValues[optionType.name] = [];
            }
            groupedValues[optionType.name].push({
              id: ov.id,
              value: ov.value,
              display_value: ov.display_value,
              numeric_value: ov.numeric_value,
              sort_order: ov.sort_order
            });
          }
        });
        setAvailableOptionValues(groupedValues);
      }
    } catch (error) {
      console.error("Error fetching product line configuration:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch product line configuration."
      });
    }
  };

  const fetchExistingVariants = async () => {
    try {
      const { data, error } = await supabase
        .from("product_variants_with_options")
        .select("*")
        .eq("product_line_id", formState.productLineId)
        .eq("is_active", true);

      if (error) throw error;

      const transformedData = data?.map(variant => ({
        id: variant.id,
        name: variant.name,
        sku: variant.sku,
        options: Array.isArray(variant.options) ? variant.options : []
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
    setVariants(prev => [...prev, { 
      name: "", 
      sku: "", 
      base_weight: null, 
      weight_unit: "oz", 
      packaging_type: null,
      options: {} 
    }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateVariant = (index: number, field: keyof VariantData, value: any) => {
    setVariants(prev => prev.map((variant, i) => 
      i === index ? { ...variant, [field]: value } : variant
    ));
  };

  const updateVariantOption = (variantIndex: number, optionTypeName: string, optionValueId: string) => {
    setVariants(prev => prev.map((variant, i) => 
      i === variantIndex 
        ? { 
            ...variant, 
            options: { 
              ...variant.options, 
              [optionTypeName]: optionValueId 
            } 
          }
        : variant
    ));
  };

  const generateVariantName = (variant: VariantData) => {
    const optionParts: string[] = [];
    
    productLineOptionTypes.forEach(optionTypeName => {
      const optionValueId = variant.options[optionTypeName];
      if (optionValueId) {
        const optionValues = availableOptionValues[optionTypeName] || [];
        const optionValue = optionValues.find(ov => ov.id === optionValueId);
        if (optionValue) {
          optionParts.push(optionValue.display_value);
        }
      }
    });

    return optionParts.length > 0 ? optionParts.join(" ") : variant.name;
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

      // Handle new variants creation
      if (showCreateNew) {
        const validVariants = variants.filter(variant => {
          // Check required options
          const hasRequiredOptions = productLineOptionTypes.every(optionTypeName => {
            const optionType = availableOptionTypes.find(ot => ot.name === optionTypeName);
            if (optionType?.is_required) {
              return variant.options[optionTypeName];
            }
            return true;
          });
          return variant.name.trim() && hasRequiredOptions;
        });
        
        if (validVariants.length > 0) {
          // Create product variants
          const variantInserts = validVariants.map(variant => ({
            product_line_id: formState.productLineId,
            name: generateVariantName(variant),
            sku: variant.sku || null,
            base_weight: variant.base_weight,
            weight_unit: variant.weight_unit,
            packaging_type: variant.packaging_type
          }));

          const { data: createdVariants, error: variantError } = await supabase
            .from("product_variants")
            .insert(variantInserts)
            .select("id");

          if (variantError) throw variantError;

          // Create variant options
          const optionInserts = [];
          for (let i = 0; i < createdVariants.length; i++) {
            const variant = validVariants[i];
            const variantId = createdVariants[i].id;

            Object.entries(variant.options).forEach(([optionTypeName, optionValueId]) => {
              if (optionValueId) {
                optionInserts.push({
                  product_variant_id: variantId,
                  option_value_id: optionValueId
                });
              }
            });
          }

          if (optionInserts.length > 0) {
            const { error: optionError } = await supabase
              .from("product_variant_options")
              .insert(optionInserts);

            if (optionError) throw optionError;
          }

          variantIds = [...variantIds, ...createdVariants.map(v => v.id)];
        }
      }

      if (variantIds.length === 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please select existing variants or create new ones with required options."
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

  const isValid = (showCreateNew && variants.some(variant => {
    const hasRequiredOptions = productLineOptionTypes.every(optionTypeName => {
      const optionType = availableOptionTypes.find(ot => ot.name === optionTypeName);
      if (optionType?.is_required) {
        return variant.options[optionTypeName];
      }
      return true;
    });
    return variant.name.trim() && hasRequiredOptions;
  })) || (!formState.isNewProductLine && selectedExistingVariants.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Product Variants</h2>
        <p className="text-muted-foreground">
          {formState.isNewProductLine 
            ? "Configure variant options and create variants for your product line"
            : "Select existing variants or create new ones for this product line"
          }
        </p>
      </div>

      {/* Product Line Option Types Configuration */}
      {formState.isNewProductLine && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configure Variant Options
            </CardTitle>
            <CardDescription>
              Select which option types this product line will support
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {availableOptionTypes.map((optionType) => (
                <div key={optionType.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                  <Checkbox
                    id={`option-type-${optionType.id}`}
                    checked={productLineOptionTypes.includes(optionType.name)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setProductLineOptionTypes(prev => [...prev, optionType.name]);
                      } else {
                        setProductLineOptionTypes(prev => prev.filter(name => name !== optionType.name));
                        // Remove this option from all variants
                        setVariants(prev => prev.map(variant => ({
                          ...variant,
                          options: Object.fromEntries(
                            Object.entries(variant.options).filter(([key]) => key !== optionType.name)
                          )
                        })));
                      }
                    }}
                  />
                  <div className="flex-1">
                    <label htmlFor={`option-type-${optionType.id}`} className="text-sm font-medium cursor-pointer">
                      {optionType.display_name}
                      {optionType.is_required && <Badge variant="secondary" className="ml-2">Required</Badge>}
                    </label>
                    <div className="text-xs text-muted-foreground">
                      {optionType.data_type} {optionType.unit && `(${optionType.unit})`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Variants Selection */}
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
                    <div className="flex flex-wrap gap-1 mt-1">
                      {variant.options.map((option, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {option.option_display_name}: {option.option_display_value}
                        </Badge>
                      ))}
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

      {/* Create New Variants Toggle */}
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
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <Label htmlFor={`variant-sku-${index}`}>SKU</Label>
                    <Input
                      id={`variant-sku-${index}`}
                      value={variant.sku}
                      onChange={(e) => updateVariant(index, "sku", e.target.value)}
                      placeholder="SKU-001"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`variant-weight-${index}`}>Base Weight</Label>
                    <div className="flex gap-2">
                      <Input
                        id={`variant-weight-${index}`}
                        type="number"
                        value={variant.base_weight || ""}
                        onChange={(e) => updateVariant(index, "base_weight", e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="5"
                      />
                      <Select value={variant.weight_unit} onValueChange={(value) => updateVariant(index, "weight_unit", value)}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="oz">oz</SelectItem>
                          <SelectItem value="lb">lb</SelectItem>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Variant Options */}
                {productLineOptionTypes.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Variant Options</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {productLineOptionTypes.map((optionTypeName) => {
                        const optionType = availableOptionTypes.find(ot => ot.name === optionTypeName);
                        const optionValues = availableOptionValues[optionTypeName] || [];
                        
                        return (
                          <div key={optionTypeName}>
                            <Label htmlFor={`${optionTypeName}-${index}`}>
                              {optionType?.display_name}
                              {optionType?.is_required && <span className="text-destructive ml-1">*</span>}
                            </Label>
                            <Select
                              value={variant.options[optionTypeName] || ""}
                              onValueChange={(value) => updateVariantOption(index, optionTypeName, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={`Select ${optionType?.display_name}`} />
                              </SelectTrigger>
                              <SelectContent>
                                {optionValues.map((optionValue) => (
                                  <SelectItem key={optionValue.id} value={optionValue.id}>
                                    {optionValue.display_value}
                                    {optionValue.numeric_value && ` (${optionValue.numeric_value}${optionType?.unit || ''})`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
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
          {isLoading ? "Creating..." : "Continue to Categories"}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

