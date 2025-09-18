import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EnhancedSelect, ComboboxOption } from "@/components/ui/enhanced-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Tag, Barcode, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { FormState } from "@/pages/ProductFlow";

interface ProductDetailsTabProps {
  formState: FormState;
  updateFormState: (updates: Partial<FormState>) => void;
  onComplete: () => void;
}

interface Category {
  id: number;
  name: string;
  description: string;
  target_species: string[];
}

interface Identifier {
  id?: number;
  type: string;
  value: string;
  is_primary: boolean;
  retailer_name?: string;
}

const IDENTIFIER_TYPES = [
  { value: "upc", label: "UPC (Universal Product Code)" },
  { value: "ean", label: "EAN (European Article Number)" },
  { value: "asin", label: "ASIN (Amazon Standard Identification)" },
  { value: "retailer_sku", label: "Retailer SKU" }
];

export const ProductDetailsTab = ({ formState, updateFormState, onComplete }: ProductDetailsTabProps) => {
  const [isLoading, setIsLoading] = useState(false);
  
  // Categories state
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  
  // Identifiers state
  const [identifiers, setIdentifiers] = useState<Identifier[]>([]);
  const [newIdentifier, setNewIdentifier] = useState<Identifier>({
    type: "upc",
    value: "",
    is_primary: false
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("product_categories")
        .select("id, name, description, target_species")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setAvailableCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load categories."
      });
    }
  };

  const handleCategoryToggle = (categoryId: number) => {
    setSelectedCategories(prev => {
      const newSelection = prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId];
      
      updateFormState({ categoryIds: newSelection });
      return newSelection;
    });
  };

  const addIdentifier = () => {
    if (!newIdentifier.value.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a value for the identifier."
      });
      return;
    }

    setIdentifiers(prev => [...prev, { ...newIdentifier, id: Date.now() }]);
    setNewIdentifier({
      type: "upc",
      value: "",
      is_primary: false
    });
  };

  const removeIdentifier = (id: number) => {
    setIdentifiers(prev => prev.filter(identifier => identifier.id !== id));
  };

  const handleSubmit = async () => {
    if (selectedCategories.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select at least one category."
      });
      return;
    }

    setIsLoading(true);
    try {
      // Create product model category associations
      const categoryInserts = selectedCategories.map((categoryId, index) => ({
        product_model_id: formState.productLineId,
        category_id: categoryId,
        is_primary: index === 0 // First category is primary
      }));

      const { error: categoryError } = await supabase
        .from("product_model_categories")
        .insert(categoryInserts);

      if (categoryError) throw categoryError;

      // Store identifiers for later use (will be saved with variants)
      updateFormState({ 
        productIdentifiers: identifiers,
        categoryIds: selectedCategories
      });

      toast({
        title: "Success!",
        description: `${selectedCategories.length} categories and ${identifiers.length} identifiers assigned successfully.`
      });

      onComplete();
    } catch (error) {
      console.error("Error assigning categories:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to assign categories."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Product Details</h2>
        <p className="text-muted-foreground">
          Assign categories and add product identifiers (UPC, EAN, ASIN, etc.)
        </p>
      </div>

      {/* Categories Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Product Categories
          </CardTitle>
          <CardDescription>
            Select the categories that best describe your product
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableCategories.map((category) => (
              <Card 
                key={category.id} 
                className={`cursor-pointer transition-all ${
                  selectedCategories.includes(category.id) ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-md'
                }`}
                onClick={() => handleCategoryToggle(category.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{category.name}</h4>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {category.target_species.map((species) => (
                          <Badge key={species} variant="outline" className="text-xs">
                            {species}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Checkbox
                      checked={selectedCategories.includes(category.id)}
                      onChange={() => handleCategoryToggle(category.id)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Identifiers Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Barcode className="h-5 w-5" />
            Product Identifiers
          </CardTitle>
          <CardDescription>
            Add UPC, EAN, ASIN, and other product identifiers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Identifier */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="identifierType">Type</Label>
              <EnhancedSelect
                options={IDENTIFIER_TYPES.map((type) => ({
                  value: type.value,
                  label: type.label
                }))}
                value={newIdentifier.type}
                onValueChange={(value) => setNewIdentifier(prev => ({ ...prev, type: value }))}
                placeholder="Select identifier type"
                searchPlaceholder="Search identifier types..."
              />
            </div>
            <div>
              <Label htmlFor="identifierValue">Value *</Label>
              <Input
                id="identifierValue"
                value={newIdentifier.value}
                onChange={(e) => setNewIdentifier(prev => ({ ...prev, value: e.target.value }))}
                placeholder="Enter identifier value"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addIdentifier} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Identifier
              </Button>
            </div>
          </div>

          {/* Identifiers List */}
          {identifiers.length > 0 && (
            <div className="space-y-2">
              <Label>Added Identifiers</Label>
              {identifiers.map((identifier) => (
                <div key={identifier.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{identifier.type.toUpperCase()}</Badge>
                    <span className="font-mono text-sm">{identifier.value}</span>
                    {identifier.is_primary && (
                      <Badge variant="default" className="text-xs">Primary</Badge>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeIdentifier(identifier.id!)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit} 
          disabled={isLoading || selectedCategories.length === 0}
          className="min-w-[120px]"
        >
          {isLoading ? (
            "Processing..."
          ) : (
            <>
              Continue to Nutrition
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
