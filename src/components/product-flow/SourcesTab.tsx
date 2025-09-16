import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Check, Plus, Trash2, MapPin, DollarSign, Link, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { FormState } from "@/pages/ProductFlow";

interface SourcesTabProps {
  formState: FormState;
  updateFormState: (updates: Partial<FormState>) => void;
  onComplete: () => void;
}

interface Variant {
  id: string;
  name: string;
}

interface SourceData {
  variantId: string;
  retailerName: string;
  url: string;
  price: string;
  currency: string;
  availability: string;
  sourceType: string;
}

export const SourcesTab = ({ formState, updateFormState, onComplete }: SourcesTabProps) => {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [sources, setSources] = useState<SourceData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [urlErrors, setUrlErrors] = useState<Record<number, string>>({});

  const availabilityOptions = [
    { value: "in_stock", label: "In Stock" },
    { value: "out_of_stock", label: "Out of Stock" },
    { value: "limited", label: "Limited Stock" },
    { value: "discontinued", label: "Discontinued" }
  ];

  const sourceTypeOptions = [
    { value: "retailer", label: "Retailer" },
    { value: "manufacturer", label: "Manufacturer" },
    { value: "distributor", label: "Distributor" }
  ];

  const currencyOptions = [
    { value: "USD", label: "USD ($)" },
    { value: "EUR", label: "EUR (€)" },
    { value: "GBP", label: "GBP (£)" },
    { value: "CAD", label: "CAD (C$)" }
  ];

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
        // Initialize with one source per variant
        setSources(
          (data || []).map(variant => ({
            variantId: variant.id,
            retailerName: "",
            url: "",
            price: "",
            currency: "USD",
            availability: "in_stock",
            sourceType: "retailer"
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

  const addSource = (variantId: string) => {
    setSources(prev => [...prev, {
      variantId,
      retailerName: "",
      url: "",
      price: "",
      currency: "USD",
      availability: "in_stock",
      sourceType: "retailer"
    }]);
  };

  const removeSource = (index: number) => {
    setSources(prev => prev.filter((_, i) => i !== index));
  };

  const updateSource = async (index: number, field: keyof SourceData, value: string) => {
    setSources(prev => prev.map((source, i) => 
      i === index ? { ...source, [field]: value } : source
    ));

    // Check for duplicate URL when updating URL field
    if (field === "url" && value.trim()) {
      await checkDuplicateUrl(index, value);
    } else if (field === "url") {
      // Clear error when URL is empty
      setUrlErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[index];
        return newErrors;
      });
    }
  };

  const checkDuplicateUrl = async (index: number, url: string) => {
    try {
      const { data, error } = await supabase
        .from("product_sources")
        .select("id")
        .eq("url", url)
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setUrlErrors(prev => ({
          ...prev,
          [index]: "Duplicate URL already exists in product_sources database"
        }));
      } else {
        setUrlErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[index];
          return newErrors;
        });
      }
    } catch (error) {
      console.error("Error checking duplicate URL:", error);
    }
  };

  const getVariantSources = (variantId: string) => {
    return sources.map((source, index) => ({ ...source, index }))
                 .filter(source => source.variantId === variantId);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    let insertData: any[] = [];
    
    try {
      // Check if there are any URL errors
      if (Object.keys(urlErrors).length > 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please fix duplicate URL errors before saving."
        });
        setIsLoading(false);
        return;
      }

      const validSources = sources.filter(source => 
        source.retailerName.trim() && source.url.trim()
      );
      
      if (validSources.length === 0) {
        toast({
          title: "Info",
          description: "No sources to save. Skipping this step."
        });
        onComplete();
        return;
      }

      insertData = validSources.map(source => ({
        product_variant_id: source.variantId,
        retailer_name: source.retailerName,
        url: source.url,
        price: source.price ? parseFloat(source.price) : null,
        currency: source.currency,
        availability: source.availability
        // Removed source_type as it doesn't exist in the schema
      }));

      const { error } = await supabase
        .from("product_sources")
        .insert(insertData);

      if (error) throw error;

      toast({
        title: "Success!",
        description: `${validSources.length} source(s) created successfully.`
      });

      onComplete();
    } catch (error) {
      console.error("Error creating product sources:", error);
      console.error("Insert data that failed:", insertData);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create product sources. Check console for details."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = () => {
    // Check if there are any URL errors before finishing
    if (Object.keys(urlErrors).length > 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fix duplicate URL errors before finishing."
      });
      return;
    }

    toast({
      title: "Product Flow Complete!",
      description: "Your product has been successfully created with all details.",
      variant: "default"
    });
    onComplete();
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Sources & Retailers</h2>
        <p className="text-muted-foreground">
          Add retailer information and pricing for each variant (optional).
        </p>
      </div>

      {variants.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            No variants available. Please complete the previous steps first.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {variants.map(variant => {
            const variantSources = getVariantSources(variant.id);
            
            return (
              <Card key={variant.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Store className="h-5 w-5" />
                      {variant.name}
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addSource(variant.id)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Source
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {variantSources.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No sources added yet
                    </div>
                  ) : (
                    variantSources.map(source => (
                      <Card key={source.index} className="bg-muted/20">
                        <CardContent className="pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor={`retailer-${source.index}`}>Retailer Name</Label>
                              <Input
                                id={`retailer-${source.index}`}
                                value={source.retailerName}
                                onChange={(e) => updateSource(source.index, "retailerName", e.target.value)}
                                placeholder="Amazon, Chewy, etc."
                              />
                            </div>
                            <div>
                              <Label htmlFor={`url-${source.index}`}>Product URL</Label>
                              <Input
                                id={`url-${source.index}`}
                                value={source.url}
                                onChange={(e) => updateSource(source.index, "url", e.target.value)}
                                placeholder="https://..."
                                className={urlErrors[source.index] ? "border-destructive" : ""}
                              />
                              {urlErrors[source.index] && (
                                <p className="text-sm text-destructive mt-1">
                                  {urlErrors[source.index]}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <Label htmlFor={`price-${source.index}`}>Price</Label>
                                <Input
                                  id={`price-${source.index}`}
                                  type="number"
                                  step="0.01"
                                  value={source.price}
                                  onChange={(e) => updateSource(source.index, "price", e.target.value)}
                                  placeholder="29.99"
                                />
                              </div>
                              <div className="w-24">
                                <Label>Currency</Label>
                                <Select 
                                  value={source.currency} 
                                  onValueChange={(value) => updateSource(source.index, "currency", value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {currencyOptions.map(option => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div>
                              <Label>Availability</Label>
                              <Select 
                                value={source.availability} 
                                onValueChange={(value) => updateSource(source.index, "availability", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {availabilityOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Source Type</Label>
                              <Select 
                                value={source.sourceType} 
                                onValueChange={(value) => updateSource(source.index, "sourceType", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {sourceTypeOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSource(source.index)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <Card className="bg-gradient-primary text-primary-foreground">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5" />
            Ready to Finish
          </CardTitle>
          <CardDescription className="text-primary-foreground/80">
            Complete your product flow or add retailer information.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button
            onClick={handleFinish}
            variant="secondary"
            size="lg"
          >
            <Check className="h-4 w-4 mr-2" />
            Finish Without Sources
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            variant="secondary"
            size="lg"
          >
            {isLoading ? "Saving..." : "Save Sources & Finish"}
            <Check className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};