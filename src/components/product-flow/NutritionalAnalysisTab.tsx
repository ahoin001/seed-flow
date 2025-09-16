import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Activity, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { FormState } from "@/pages/ProductFlow";

interface NutritionalAnalysisTabProps {
  formState: FormState;
  updateFormState: (updates: Partial<FormState>) => void;
  onComplete: () => void;
}

interface Variant {
  id: string;
  name: string;
}

interface NutritionalAttribute {
  id: string;
  name: string;
  display_name: string;
  unit: string | null;
  data_type: string;
}

interface NutritionalValue {
  nutritional_attribute_id: string;
  value: number | null;
  text_value: string | null;
  boolean_value: boolean | null;
  unit: string | null;
}

export const NutritionalAnalysisTab = ({ formState, updateFormState, onComplete }: NutritionalAnalysisTabProps) => {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [nutritionalAttributes, setNutritionalAttributes] = useState<NutritionalAttribute[]>([]);
  const [variantNutritionalValues, setVariantNutritionalValues] = useState<Record<string, NutritionalValue[]>>({});
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingData(true);
        
        // Load variants
        if (formState.variantIds.length > 0) {
          const { data: variantsData, error: variantsError } = await supabase
            .from("product_variants")
            .select("id, name")
            .in("id", formState.variantIds);

          if (variantsError) throw variantsError;
          setVariants(variantsData || []);
        }

        // Load nutritional attributes
        const { data: attributesData, error: attributesError } = await supabase
          .from("nutritional_attributes")
          .select("id, name, display_name, unit, data_type")
          .eq("is_active", true)
          .order("sort_order");

        if (attributesError) throw attributesError;
        setNutritionalAttributes(attributesData || []);

        // Initialize nutritional values for each variant
        const initialValues: Record<string, NutritionalValue[]> = {};
        formState.variantIds.forEach(variantId => {
          initialValues[variantId] = [];
        });
        setVariantNutritionalValues(initialValues);

      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load nutritional data."
        });
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [formState.variantIds]);

  const addNutritionalValue = (variantId: string) => {
    setVariantNutritionalValues(prev => ({
      ...prev,
      [variantId]: [
        ...prev[variantId],
        {
          nutritional_attribute_id: "",
          value: null,
          text_value: null,
          boolean_value: null,
          unit: null
        }
      ]
    }));
  };

  const updateNutritionalValue = (variantId: string, index: number, field: keyof NutritionalValue, value: any) => {
    setVariantNutritionalValues(prev => ({
      ...prev,
      [variantId]: prev[variantId].map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeNutritionalValue = (variantId: string, index: number) => {
    setVariantNutritionalValues(prev => ({
      ...prev,
      [variantId]: prev[variantId].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const nutritionalInserts = [];
      
      for (const [variantId, values] of Object.entries(variantNutritionalValues)) {
        for (const value of values) {
          if (value.nutritional_attribute_id && (value.value !== null || value.text_value || value.boolean_value !== null)) {
            nutritionalInserts.push({
              product_variant_id: variantId,
              nutritional_attribute_id: value.nutritional_attribute_id,
              value: value.value,
              text_value: value.text_value,
              boolean_value: value.boolean_value,
              unit: value.unit
            });
          }
        }
      }

      if (nutritionalInserts.length > 0) {
        const { error } = await supabase
          .from("nutritional_values")
          .insert(nutritionalInserts);

        if (error) throw error;
      }

      toast({
        title: "Success!",
        description: `${nutritionalInserts.length} nutritional values saved successfully.`
      });

      onComplete();
    } catch (error) {
      console.error("Error saving nutritional values:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save nutritional values."
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading nutritional data...</p>
        </div>
      </div>
    );
  }

  if (variants.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          No variants available. Please complete the previous steps first.
        </p>
      </div>
    );
  }

  const currentVariant = variants[selectedVariantIndex];
  const currentNutritionalValues = variantNutritionalValues[currentVariant?.id] || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Nutritional Analysis</h2>
        <p className="text-muted-foreground">
          Add detailed nutritional information for each product variant.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Variant Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Variant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {variants.map((variant, index) => (
              <Button
                key={variant.id}
                variant={selectedVariantIndex === index ? "default" : "outline"}
                className="w-full justify-start text-left overflow-hidden"
                onClick={() => setSelectedVariantIndex(index)}
                title={variant.name}
              >
                <span className="truncate block w-full">
                  {variant.name}
                </span>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Nutritional Values Management */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Nutritional Values for {currentVariant?.name}
                  </CardTitle>
                  <CardDescription>
                    Add nutritional information for this variant
                  </CardDescription>
                </div>
                <Button
                  onClick={() => addNutritionalValue(currentVariant.id)}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentNutritionalValues.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No nutritional values added yet. Click "Add" to create one.
                </div>
              ) : (
                currentNutritionalValues.map((nutritionalValue, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-4">
                      <Label htmlFor={`attribute-${index}`}>Attribute</Label>
                      <select
                        id={`attribute-${index}`}
                        value={nutritionalValue.nutritional_attribute_id}
                        onChange={(e) => updateNutritionalValue(currentVariant.id, index, "nutritional_attribute_id", e.target.value)}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="">Select attribute</option>
                        {nutritionalAttributes.map(attr => (
                          <option key={attr.id} value={attr.id}>
                            {attr.display_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="col-span-3">
                      <Label htmlFor={`value-${index}`}>Value</Label>
                      <Input
                        id={`value-${index}`}
                        type="number"
                        value={nutritionalValue.value || ""}
                        onChange={(e) => updateNutritionalValue(currentVariant.id, index, "value", e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="Enter value"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor={`unit-${index}`}>Unit</Label>
                      <Input
                        id={`unit-${index}`}
                        value={nutritionalValue.unit || ""}
                        onChange={(e) => updateNutritionalValue(currentVariant.id, index, "unit", e.target.value)}
                        placeholder="g, %, etc."
                      />
                    </div>

                    <div className="col-span-2 flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeNutritionalValue(currentVariant.id, index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total Variants:</span> {variants.length}
                </div>
                <div>
                  <span className="font-medium">Variants with Nutritional Data:</span>{" "}
                  {Object.values(variantNutritionalValues).filter(values => values.length > 0).length}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          variant="premium"
          size="lg"
        >
          {isLoading ? "Saving..." : "Continue to Sources"}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};