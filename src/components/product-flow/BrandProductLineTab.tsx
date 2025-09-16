import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, Plus, Building2, Package, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { FormState } from "@/pages/ProductFlow";
import { DuplicateDetectionModal } from "@/components/DuplicateDetectionModal";

interface BrandProductLineTabProps {
  formState: FormState;
  updateFormState: (updates: Partial<FormState>) => void;
  onComplete: () => void;
}

export const BrandProductLineTab = ({ formState, updateFormState, onComplete }: BrandProductLineTabProps) => {
  const [brandData, setBrandData] = useState({
    name: "",
    website: "",
    contact_email: ""
  });
  
  const [productLineData, setProductLineData] = useState({
    name: "",
    description: "",
    target_species: ["dog"] as string[]
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [showNewBrandForm, setShowNewBrandForm] = useState(false);
  const [showNewProductLineForm, setShowNewProductLineForm] = useState(true);
  const [brands, setBrands] = useState<{id: string, name: string}[]>([]);
  const [productLines, setProductLines] = useState<{id: string, name: string, brand_id?: string}[]>([]);
  const [filteredProductLines, setFilteredProductLines] = useState<{id: string, name: string, brand_id?: string}[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [pendingProductData, setPendingProductData] = useState<{
    brandName: string;
    productLineName: string;
    identifiers?: Array<{identifier_type: string; identifier_value: string}>;
  } | null>(null);

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
        .from("product_lines")
        .select("id, name, brand_id")
        .order("name");
      
      if (error) {
        console.error("Error fetching product lines:", error);
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
    // Check for duplicates before proceeding
    if (showNewProductLineForm) {
      const brandName = showNewBrandForm ? brandData.name : brands.find(b => b.id === formState.brandId)?.name || '';
      
      setPendingProductData({
        brandName,
        productLineName: productLineData.name,
        identifiers: [] // We'll add identifier checking in the identifiers tab
      });
      setShowDuplicateModal(true);
      return;
    }

    // If using existing product line, proceed directly
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

      // Create product line if new
      if (showNewProductLineForm) {
        const { data: productLine, error: productLineError } = await supabase
          .from("product_lines")
          .insert({
            name: productLineData.name,
            description: productLineData.description,
            target_species: productLineData.target_species,
            brand_id: brandId
          })
          .select("id")
          .single();

        if (productLineError) throw productLineError;
        productLineId = productLine.id;
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

  const handleDuplicateModalConfirm = () => {
    setShowDuplicateModal(false);
    proceedWithCreation();
  };

  const handleDuplicateModalSelectExisting = (productId: string) => {
    setShowDuplicateModal(false);
    updateFormState({ productLineId: productId, isNewProductLine: false });
    toast({
      title: "Product Selected",
      description: "Using existing product line. You can now add variants to it."
    });
    onComplete();
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
                  value={brandData.website}
                  onChange={(e) => setBrandData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://example.com"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="brandEmail">Contact Email</Label>
                <Input
                  id="brandEmail"
                  type="email"
                  value={brandData.contact_email}
                  onChange={(e) => setBrandData(prev => ({ ...prev, contact_email: e.target.value }))}
                  placeholder="contact@brand.com"
                />
              </div>
            </div>
          ) : (
            <div>
              <Label htmlFor="existingBrand">Select Brand</Label>
              <Select onValueChange={(value) => updateFormState({ brandId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an existing brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="existingProductLine">Select Product Line</Label>
              <Select onValueChange={(value) => updateFormState({ productLineId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an existing product line" />
                </SelectTrigger>
                <SelectContent>
                  {filteredProductLines.map((productLine) => (
                    <SelectItem key={productLine.id} value={productLine.id}>
                      {productLine.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* Duplicate Detection Modal */}
      {pendingProductData && (
        <DuplicateDetectionModal
          isOpen={showDuplicateModal}
          onClose={() => setShowDuplicateModal(false)}
          onConfirmNew={handleDuplicateModalConfirm}
          onSelectExisting={handleDuplicateModalSelectExisting}
          productData={pendingProductData}
        />
      )}
    </div>
  );
};