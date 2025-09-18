import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Plus, Trash2, Barcode, Star, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { FormState } from "@/pages/ProductFlow";
import { IdentifierDuplicateChecker } from "@/components/IdentifierDuplicateChecker";

interface ProductIdentifiersTabProps {
  formState: FormState;
  updateFormState: (updates: Partial<FormState>) => void;
  onComplete: () => void;
}

interface Variant {
  id: number;
  variant_name_suffix: string;
}

interface Identifier {
  id?: number;
  type: string;
  value: string;
  is_primary: boolean;
  retailer_name?: string;
}

interface VariantIdentifiers {
  variantId: number;
  identifiers: Identifier[];
}

const IDENTIFIER_TYPES = [
  { value: "upc", label: "UPC (Universal Product Code)" },
  { value: "ean", label: "EAN (European Article Number)" },
  { value: "asin", label: "ASIN (Amazon Standard Identification)" },
  { value: "retailer_sku", label: "Retailer SKU" }
];

const IDENTIFIER_SOURCES = [
  { value: "manufacturer", label: "Manufacturer" },
  { value: "retailer", label: "Retailer" },
  { value: "distributor", label: "Distributor" },
  { value: "user", label: "User Input" }
];

export const ProductIdentifiersTab = ({ formState, updateFormState, onComplete }: ProductIdentifiersTabProps) => {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantIdentifiers, setVariantIdentifiers] = useState<VariantIdentifiers[]>([]);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showDuplicateChecker, setShowDuplicateChecker] = useState(false);
  const [hasDuplicates, setHasDuplicates] = useState(false);

  useEffect(() => {
    loadVariants();
  }, [formState.variantIds]);

  const loadVariants = async () => {
    try {
      setIsLoadingData(true);
      if (formState.variantIds.length > 0) {
        const { data, error } = await supabase
          .from("product_variants")
          .select("id, name")
          .in("id", formState.variantIds);

        if (error) throw error;

        setVariants(data || []);
        setVariantIdentifiers(
          (data || []).map(variant => ({
            variantId: variant.id,
            identifiers: []
          }))
        );
      }
    } catch (error) {
      console.error("Error loading variants:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load variants."
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const addIdentifier = (variantId: string) => {
    setVariantIdentifiers(prev => prev.map(vi => 
      vi.variantId === variantId
        ? {
            ...vi,
            identifiers: [...vi.identifiers, {
              type: "UPC",
              value: "",
              isPrimary: vi.identifiers.length === 0,
              source: "user"
            }]
          }
        : vi
    ));
  };

  const updateIdentifier = (variantId: string, index: number, field: keyof Identifier, value: any) => {
    setVariantIdentifiers(prev => prev.map(vi => 
      vi.variantId === variantId
        ? {
            ...vi,
            identifiers: vi.identifiers.map((identifier, i) => 
              i === index ? { ...identifier, [field]: value } : identifier
            )
          }
        : vi
    ));
  };

  const removeIdentifier = (variantId: string, index: number) => {
    setVariantIdentifiers(prev => prev.map(vi => 
      vi.variantId === variantId
        ? {
            ...vi,
            identifiers: vi.identifiers.filter((_, i) => i !== index)
          }
        : vi
    ));
  };

  const setPrimaryIdentifier = (variantId: string, index: number) => {
    setVariantIdentifiers(prev => prev.map(vi => 
      vi.variantId === variantId
        ? {
            ...vi,
            identifiers: vi.identifiers.map((identifier, i) => ({
              ...identifier,
              isPrimary: i === index
            }))
          }
        : vi
    ));
  };

  const handleSubmit = async () => {
    const hasValidIdentifiers = variantIdentifiers.some(vi => 
      vi.identifiers.some(id => id.value.trim())
    );

    if (!hasValidIdentifiers) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please add at least one identifier."
      });
      return;
    }

    // Check for duplicates before proceeding
    const allIdentifiers = variantIdentifiers
      .flatMap(vi => vi.identifiers)
      .filter(id => id.value.trim())
      .map(id => ({
        identifier_type: id.type,
        identifier_value: id.value.trim()
      }));

    if (allIdentifiers.length > 0) {
      setShowDuplicateChecker(true);
      return;
    }

    await proceedWithSubmission();
  };

  const proceedWithSubmission = async () => {
    setIsLoading(true);
    try {
      // Save identifiers to database
      for (const variantIdentifier of variantIdentifiers) {
        if (variantIdentifier.identifiers.length > 0) {
          const identifierData = variantIdentifier.identifiers.map(id => ({
            product_variant_id: variantIdentifier.variantId,
            identifier_type: id.type,
            identifier_value: id.value.trim(),
            is_primary: id.isPrimary,
            source: id.source,
            is_active: true
          }));

          const { error } = await supabase
            .from("product_identifiers")
            .insert(identifierData);

          if (error) throw error;
        }
      }

      toast({
        title: "Success!",
        description: "Product identifiers configured successfully."
      });

      onComplete();
    } catch (error) {
      console.error("Error saving identifiers:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save product identifiers."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicateFound = () => {
    setHasDuplicates(true);
    setShowDuplicateChecker(false);
    toast({
      variant: "destructive",
      title: "Duplicates Found",
      description: "Please review and fix duplicate identifiers before proceeding."
    });
  };

  const handleNoDuplicates = () => {
    setHasDuplicates(false);
    setShowDuplicateChecker(false);
    proceedWithSubmission();
  };

  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading variants...</p>
        </div>
      </div>
    );
  }

  if (variants.length === 0) {
    return (
      <div className="text-center py-8">
        <Barcode className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          No variants available. Please complete the previous steps first.
        </p>
      </div>
    );
  }

  const currentVariant = variants[selectedVariantIndex];
  const currentIdentifiers = variantIdentifiers.find(vi => vi.variantId === currentVariant?.id)?.identifiers || [];
  const hasValidIdentifiers = variantIdentifiers.some(vi => 
    vi.identifiers.some(id => id.value.trim())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Product Identifiers</h2>
        <p className="text-muted-foreground">
          Add UPC, EAN, ASIN, and other identifiers to make your products searchable and trackable.
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

        {/* Identifiers Management */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Barcode className="h-5 w-5" />
                    Identifiers for {currentVariant?.name}
                  </CardTitle>
                  <CardDescription>
                    Add product codes and identifiers for this variant
                  </CardDescription>
                </div>
                <Button
                  onClick={() => addIdentifier(currentVariant.id)}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentIdentifiers.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No identifiers added yet. Click "Add" to create one.
                </div>
              ) : (
                currentIdentifiers.map((identifier, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-3">
                      <Label htmlFor={`type-${index}`}>Type</Label>
                      <Select
                        value={identifier.type}
                        onValueChange={(value) => updateIdentifier(currentVariant.id, index, "type", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {IDENTIFIER_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="col-span-4">
                      <Label htmlFor={`value-${index}`}>Value</Label>
                      <Input
                        id={`value-${index}`}
                        value={identifier.value}
                        onChange={(e) => updateIdentifier(currentVariant.id, index, "value", e.target.value)}
                        placeholder="Enter identifier value"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor={`source-${index}`}>Source</Label>
                      <Select
                        value={identifier.source}
                        onValueChange={(value) => updateIdentifier(currentVariant.id, index, "source", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {IDENTIFIER_SOURCES.map(source => (
                            <SelectItem key={source.value} value={source.value}>
                              {source.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2 flex gap-2">
                      <Button
                        variant={identifier.isPrimary ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPrimaryIdentifier(currentVariant.id, index)}
                        title="Set as primary identifier"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeIdentifier(currentVariant.id, index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {identifier.isPrimary && (
                      <div className="col-span-12">
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Primary Identifier
                        </Badge>
                      </div>
                    )}
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
                  <span className="font-medium">Variants with Identifiers:</span>{" "}
                  {variantIdentifiers.filter(vi => vi.identifiers.some(id => id.value.trim())).length}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Duplicate Checker */}
      {showDuplicateChecker && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Checking for Duplicate Identifiers
            </CardTitle>
            <CardDescription className="text-orange-700">
              We're checking if any of your identifiers are already in use...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IdentifierDuplicateChecker
              identifiers={variantIdentifiers
                .flatMap(vi => vi.identifiers)
                .filter(id => id.value.trim())
                .map(id => ({
                  identifier_type: id.type,
                  identifier_value: id.value.trim()
                }))}
              onDuplicateFound={handleDuplicateFound}
              onNoDuplicates={handleNoDuplicates}
            />
          </CardContent>
        </Card>
      )}

      {/* Duplicate Warning */}
      {hasDuplicates && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold">Duplicate Identifiers Detected</span>
            </div>
            <p className="text-red-700 mt-2">
              Please review the duplicate identifiers above and either remove them or use different values before proceeding.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!hasValidIdentifiers || isLoading || hasDuplicates}
          variant="premium"
          size="lg"
        >
          {isLoading ? "Saving..." : "Continue to Ingredients"}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};