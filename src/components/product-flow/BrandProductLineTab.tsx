import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EnhancedSelect, ComboboxOption } from "@/components/ui/enhanced-select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, Plus, Building2, Package, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
interface AmazonFormState {
  brandId?: number;
  productLineId?: number;
  brand?: any;
  productLine?: any;
  parsedOptions: any[];
  selectedOptionTypes: any[];
  selectedVariants: any[];
  configuredVariants: any[];
  completedTabs: string[];
  parsedItemForm?: string;
}

interface BrandProductLineTabProps {
  formState: AmazonFormState;
  updateFormState: (updates: Partial<AmazonFormState>) => void;
  onComplete: () => void;
}

export const BrandProductLineTab = ({ formState, updateFormState, onComplete }: BrandProductLineTabProps) => {
  const [brandData, setBrandData] = useState({
    name: "",
    website_url: "",
    manufacturer: "",
    country_of_origin: "",
    data_confidence: 50,
    is_verified: false
  });
  
  const [productLineData, setProductLineData] = useState({
    name: "",
    description: "",
    target_species: ["dog"] as string[],
    data_confidence: 50
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [showNewBrandForm, setShowNewBrandForm] = useState(false);
  const [showNewProductLineForm, setShowNewProductLineForm] = useState(true);
  const [brands, setBrands] = useState<{id: number, name: string}[]>([]);
  const [productLines, setProductLines] = useState<{id: number, name: string, brand_id?: number}[]>([]);
  const [filteredProductLines, setFilteredProductLines] = useState<{id: number, name: string, brand_id?: number}[]>([]);

  const speciesOptions = [
    { id: "dog", label: "Dog" },
    { id: "cat", label: "Cat" }
  ];

  useEffect(() => {
    const fetchBrands = async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("id, name")
        .order("name");
      
      if (error) {
        console.error("Error fetching brands:", error);
      } else {
        setBrands(data || []);
      }
    };

    const fetchProductLines = async () => {
      const { data, error } = await supabase
        .from("product_models")
        .select("id, name, brand_id")
        .order("name");
      
      if (error) {
        console.error("Error fetching product models:", error);
      } else {
        setProductLines(data || []);
        setFilteredProductLines(data || []);
      }
    };

    fetchBrands();
    fetchProductLines();
  }, []);

  // Filter product lines when brand selection changes
  useEffect(() => {
    if (!showNewBrandForm && formState.brandId) {
      // Filter product lines by selected brand
      const filtered = productLines.filter(pl => pl.brand_id === formState.brandId);
      setFilteredProductLines(filtered);
    } else {
      // Show all product lines if creating new brand or no brand selected
      setFilteredProductLines(productLines);
    }
  }, [formState.brandId, showNewBrandForm, productLines]);

  const handleSpeciesChange = (speciesId: string, checked: boolean) => {
    setProductLineData(prev => ({
      ...prev,
      target_species: checked 
        ? [...prev.target_species, speciesId]
        : prev.target_species.filter(id => id !== speciesId)
    }));
  };

  const handleSubmit = async () => {
    // Proceed directly with creation
    await proceedWithCreation();
  };

  const proceedWithCreation = async () => {
    setIsLoading(true);
    try {
      let brandId = formState.brandId;
      let productLineId = formState.productLineId;

      // Create brand if new
      if (showNewBrandForm) {
        const { data: brand, error: brandError } = await supabase
          .from("brands")
          .insert(brandData)
          .select("id")
          .single();

        if (brandError) throw brandError;
        brandId = brand.id;
      }

      // Create product model if new
      if (showNewProductLineForm) {
        const { data: productModel, error: productModelError } = await supabase
          .from("product_models")
          .insert({
            name: productLineData.name,
            base_description: productLineData.description,
            species: productLineData.target_species.length === 2 ? "both" : productLineData.target_species[0],
            life_stage: productLineData.target_species, // Using target_species as life_stage for now
            brand_id: brandId,
            data_confidence: productLineData.data_confidence
          })
          .select("id")
          .single();

        if (productModelError) throw productModelError;
        productLineId = productModel.id;
      }

      updateFormState({
        brandId,
        productLineId,
        isNewProductLine: showNewProductLineForm
      });

      toast({
        title: "Success!",
        description: "Brand and product line set up successfully."
      });

      onComplete();
    } catch (error) {
      console.error("Error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to set up brand and product line."
      });
    } finally {
      setIsLoading(false);
    }
  };


  const isValid = (showNewProductLineForm ? productLineData.name && productLineData.target_species.length > 0 : formState.productLineId) && 
    (formState.brandId || (showNewBrandForm && brandData.name));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Brand & Product Line</h2>
        <p className="text-muted-foreground">
          Start by setting up the brand and product line information.
        </p>
      </div>

      {/* Brand Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Brand Information
          </CardTitle>
          <CardDescription>
            Select an existing brand or create a new one.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={!showNewBrandForm ? "default" : "outline"}
              onClick={() => setShowNewBrandForm(false)}
              size="sm"
            >
              Select Existing
            </Button>
            <Button
              variant={showNewBrandForm ? "default" : "outline"}
              onClick={() => setShowNewBrandForm(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Create New
            </Button>
          </div>

          {showNewBrandForm ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brandName">Brand Name *</Label>
                  <Input
                    id="brandName"
                    value={brandData.name}
                    onChange={(e) => setBrandData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter brand name"
                  />
                </div>
                <div>
                  <Label htmlFor="brandWebsite">Website</Label>
                  <Input
                    id="brandWebsite"
                    value={brandData.website_url}
                    onChange={(e) => setBrandData(prev => ({ ...prev, website_url: e.target.value }))}
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="brandManufacturer">Manufacturer</Label>
                  <Input
                    id="brandManufacturer"
                    value={brandData.manufacturer}
                    onChange={(e) => setBrandData(prev => ({ ...prev, manufacturer: e.target.value }))}
                    placeholder="Manufacturer name"
                  />
                </div>
                <div>
                  <Label htmlFor="brandCountry">Country of Origin</Label>
                  <Input
                    id="brandCountry"
                    value={brandData.country_of_origin}
                    onChange={(e) => setBrandData(prev => ({ ...prev, country_of_origin: e.target.value }))}
                    placeholder="Country"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="brandDataConfidence">Data Confidence (0-100)</Label>
                <Input
                  id="brandDataConfidence"
                  type="number"
                  min="0"
                  max="100"
                  value={brandData.data_confidence}
                  onChange={(e) => setBrandData(prev => ({ ...prev, data_confidence: parseInt(e.target.value) || 50 }))}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="brandVerified"
                  checked={brandData.is_verified}
                  onCheckedChange={(checked) => setBrandData(prev => ({ ...prev, is_verified: checked as boolean }))}
                />
                <Label htmlFor="brandVerified">Verified Brand</Label>
              </div>
            </div>
            </>
          ) : (
            <div>
              <Label htmlFor="existingBrand">Select Brand</Label>
              <EnhancedSelect
                options={brands.map((brand) => ({
                  value: brand.id.toString(),
                  label: brand.name
                }))}
                value={formState.brandId?.toString()}
                onValueChange={(value) => updateFormState({ brandId: parseInt(value) })}
                placeholder="Choose an existing brand"
                searchPlaceholder="Search brands..."
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Line */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Line Details
          </CardTitle>
          <CardDescription>
            Define the main product line information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={!showNewProductLineForm ? "default" : "outline"}
              onClick={() => setShowNewProductLineForm(false)}
              size="sm"
            >
              Select Existing
            </Button>
            <Button
              variant={showNewProductLineForm ? "default" : "outline"}
              onClick={() => setShowNewProductLineForm(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Create New
            </Button>
          </div>

          {showNewProductLineForm ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="productLineName">Product Line Name *</Label>
                  <Input
                    id="productLineName"
                    value={productLineData.name}
                    onChange={(e) => setProductLineData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Premium Dog Food Series"
                  />
                </div>
                <div>
                  <Label>Target Species *</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {speciesOptions.map((species) => (
                      <div key={species.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={species.id}
                          checked={productLineData.target_species.includes(species.id)}
                          onCheckedChange={(checked) => handleSpeciesChange(species.id, checked as boolean)}
                        />
                        <Label htmlFor={species.id} className="text-sm">
                          {species.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="productLineDescription">Description</Label>
                <Textarea
                  id="productLineDescription"
                  value={productLineData.description}
                  onChange={(e) => setProductLineData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the product line..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="productLineDataConfidence">Data Confidence (0-100)</Label>
                <Input
                  id="productLineDataConfidence"
                  type="number"
                  min="0"
                  max="100"
                  value={productLineData.data_confidence}
                  onChange={(e) => setProductLineData(prev => ({ ...prev, data_confidence: parseInt(e.target.value) || 50 }))}
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="existingProductLine">Select Product Line</Label>
              <EnhancedSelect
                options={filteredProductLines.map((productLine) => ({
                  value: productLine.id.toString(),
                  label: productLine.name
                }))}
                value={formState.productLineId?.toString()}
                onValueChange={(value) => updateFormState({ productLineId: parseInt(value) })}
                placeholder="Choose an existing product line"
                searchPlaceholder="Search product lines..."
              />
              {!showNewBrandForm && formState.brandId && filteredProductLines.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No product lines found for this brand. Consider creating a new product line.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!isValid || isLoading}
          variant="premium"
          size="lg"
        >
          {isLoading ? "Creating..." : "Continue to Variants"}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

    </div>
  );
};