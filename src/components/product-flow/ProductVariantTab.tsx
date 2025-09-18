import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Plus, Trash2, Image, Package, Check, Edit, X, Tag, Leaf, Activity, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { FormState } from "@/pages/ProductFlow";

interface ProductVariantTabProps {
  formState: FormState;
  updateFormState: (updates: Partial<FormState>) => void;
  onComplete: () => void;
}

interface VariantData {
  id?: number;
  variant_name_suffix: string;
  image_url: string;
  form_factor: string;
  package_size_value?: number;
  package_size_unit?: string;
  barcodes: Array<{
    barcode: string;
    barcode_type: string;
    retailer?: string;
    is_primary: boolean;
  }>;
  optionValues: Record<string, string>; // Store selected option values
  categories: number[]; // Selected category IDs
  ingredients: string[]; // Selected ingredient names
  nutrition: Record<number, number>; // Nutritional attribute ID -> value
  isActive: boolean;
}

interface GeneratedVariant {
  id: string;
  name: string;
  optionValues: Record<string, string>;
  data: VariantData;
}

interface Category {
  id: number;
  name: string;
  description: string;
  target_species: string[];
}

interface Ingredient {
  id: number;
  name: string;
  is_toxic: boolean;
  is_controversial: boolean;
  tags: string[];
}

interface NutritionalAttribute {
  id: number;
  name: string;
  display_name: string;
  unit: string | null;
  data_type: string;
}

// Form factor options for pet food categorization
const FORM_FACTOR_OPTIONS = [
  { value: "dry kibble", label: "Dry Kibble", description: "Traditional dry dog/cat food" },
  { value: "treats", label: "Treats", description: "Dog/cat treats and snacks" },
  { value: "wet pâté", label: "Wet Pâté", description: "Smooth wet food" },
  { value: "wet chunks", label: "Wet Chunks", description: "Wet food with meat chunks" },
  { value: "wet shreds", label: "Wet Shreds", description: "Wet food with shredded meat" },
  { value: "wet stew", label: "Wet Stew", description: "Wet food in gravy/sauce" },
  { value: "freeze-dried", label: "Freeze-Dried", description: "Freeze-dried raw food" },
  { value: "dehydrated", label: "Dehydrated", description: "Dehydrated raw food" },
  { value: "raw frozen", label: "Raw Frozen", description: "Frozen raw food" },
  { value: "semi-moist", label: "Semi-Moist", description: "Semi-moist food" },
  { value: "topper", label: "Topper", description: "Food toppers and mixers" }
];

// Package size unit options
const PACKAGE_SIZE_UNITS = [
  { value: "oz", label: "Ounces (oz)" },
  { value: "lb", label: "Pounds (lb)" },
  { value: "kg", label: "Kilograms (kg)" },
  { value: "g", label: "Grams (g)" },
  { value: "ml", label: "Milliliters (ml)" },
  { value: "l", label: "Liters (l)" },
  { value: "cup", label: "Cups" },
  { value: "can", label: "Cans" },
  { value: "pouch", label: "Pouches" }
];

// Barcode type options
const BARCODE_TYPES = [
  { value: "upc", label: "UPC" },
  { value: "ean", label: "EAN" },
  { value: "asin", label: "ASIN" },
  { value: "retailer_sku", label: "Retailer SKU" },
  { value: "manufacturer_sku", label: "Manufacturer SKU" }
];

// Add Barcode Form Component
interface AddBarcodeFormProps {
  variantId: string;
  onAddBarcode: (variantId: string, barcode: { barcode: string; barcode_type: string; retailer?: string; is_primary: boolean }) => void;
}

const AddBarcodeForm = ({ variantId, onAddBarcode }: AddBarcodeFormProps) => {
  const [barcodeType, setBarcodeType] = useState("");
  const [barcodeValue, setBarcodeValue] = useState("");
  const [retailer, setRetailer] = useState("");

  const handleAddBarcode = () => {
    if (!barcodeType || !barcodeValue.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a type and enter a barcode value."
      });
      return;
    }

    onAddBarcode(variantId, {
      barcode: barcodeValue.trim(),
      barcode_type: barcodeType,
      retailer: retailer.trim() || undefined,
      is_primary: false // Will be set to true if it's the first barcode
    });

    // Reset form
    setBarcodeType("");
    setBarcodeValue("");
    setRetailer("");

    toast({
      title: "Success",
      description: "Barcode added successfully."
    });
  };

  return (
    <div className="flex gap-2 p-3 border-2 border-dashed rounded-lg bg-muted/20">
      <div className="flex-1">
        <Label htmlFor={`barcode-type-${variantId}`} className="text-xs">Type</Label>
        <Select value={barcodeType} onValueChange={setBarcodeType}>
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Select type..." />
          </SelectTrigger>
          <SelectContent>
            {BARCODE_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1">
        <Label htmlFor={`barcode-value-${variantId}`} className="text-xs">Code</Label>
        <Input
          id={`barcode-value-${variantId}`}
          value={barcodeValue}
          onChange={(e) => setBarcodeValue(e.target.value)}
          placeholder="Enter barcode..."
          className="h-8"
        />
      </div>
      <div className="flex-1">
        <Label htmlFor={`retailer-${variantId}`} className="text-xs">Retailer (Optional)</Label>
        <Input
          id={`retailer-${variantId}`}
          value={retailer}
          onChange={(e) => setRetailer(e.target.value)}
          placeholder="e.g., Amazon"
          className="h-8"
        />
      </div>
      <div className="flex items-end">
        <Button 
          onClick={handleAddBarcode}
          disabled={!barcodeType || !barcodeValue.trim()}
          size="sm"
          className="h-8"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>
    </div>
  );
};


export const ProductVariantTab = ({ formState, updateFormState, onComplete }: ProductVariantTabProps) => {
  const [generatedVariants, setGeneratedVariants] = useState<GeneratedVariant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [globalFormFactor, setGlobalFormFactor] = useState("");
  const [globalCategories, setGlobalCategories] = useState<number[]>([]);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [collapsedIngredients, setCollapsedIngredients] = useState<Set<string>>(new Set());
  const [collapsedNutrition, setCollapsedNutrition] = useState<Set<string>>(new Set());
  
  // Categories state
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  
  // Ingredients state
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
  const [ingredientSearchTerm, setIngredientSearchTerm] = useState("");
  const [filteredIngredients, setFilteredIngredients] = useState<Ingredient[]>([]);
  
  // Nutrition state
  const [nutritionalAttributes, setNutritionalAttributes] = useState<NutritionalAttribute[]>([]);
  
  const [newVariant, setNewVariant] = useState<VariantData>({
    variant_name_suffix: "",
    image_url: "",
    form_factor: "",
    package_size_value: undefined,
    package_size_unit: "",
    barcodes: [],
    optionValues: {},
    categories: [],
    ingredients: [],
    nutrition: {},
    isActive: true
  });

  useEffect(() => {
    generateVariants();
    fetchCategories();
    fetchIngredients();
    fetchNutritionalAttributes();
  }, [formState.selectedOptionTypes]);

  useEffect(() => {
    const filtered = availableIngredients.filter(ingredient =>
      ingredient.name.toLowerCase().includes(ingredientSearchTerm.toLowerCase())
    );
    setFilteredIngredients(filtered);
  }, [ingredientSearchTerm, availableIngredients]);

  const generateVariants = () => {
    if (!formState.selectedOptionTypes || formState.selectedOptionTypes.length === 0) {
      setGeneratedVariants([]);
      return;
    }

    // Generate all permutations of selected option values
    const permutations = generatePermutations(formState.selectedOptionTypes);
    
    const variants: GeneratedVariant[] = permutations.map((permutation, index) => {
      const variantName = Object.entries(permutation)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      
      return {
        id: `variant-${index}`,
        name: variantName,
        optionValues: permutation,
        data: {
          variant_name_suffix: variantName,
          image_url: "",
          form_factor: "",
          package_size_value: undefined,
          package_size_unit: "",
          barcodes: [],
          optionValues: permutation,
          categories: [],
          ingredients: [],
          nutrition: {},
          isActive: true
        }
      };
    });

    setGeneratedVariants(variants);
  };

  const generatePermutations = (optionTypes: any[]): Record<string, string>[] => {
    if (optionTypes.length === 0) return [{}];
    
    const [firstOption, ...restOptions] = optionTypes;
    const restPermutations = generatePermutations(restOptions);
    
    const permutations: Record<string, string>[] = [];
    
    for (const value of firstOption.selectedValues) {
      for (const restPermutation of restPermutations) {
        permutations.push({
          [firstOption.name]: value,
          ...restPermutation
              });
            }
          }

    return permutations;
  };

  const updateVariant = (variantId: string, field: keyof VariantData, value: any) => {
    setGeneratedVariants(prev => 
      prev.map(variant => 
        variant.id === variantId 
          ? {
              ...variant,
              data: { ...variant.data, [field]: value }
            }
          : variant
      )
    );
  };

  const toggleVariantActive = (variantId: string) => {
    setGeneratedVariants(prev => 
      prev.map(variant => 
        variant.id === variantId 
          ? {
              ...variant,
              data: { ...variant.data, isActive: !variant.data.isActive }
            }
          : variant
      )
    );
  };

  const removeVariant = (variantId: string) => {
    setGeneratedVariants(prev => prev.filter(variant => variant.id !== variantId));
  };

  const addBarcodeToVariant = (variantId: string, barcode: { barcode: string; barcode_type: string; retailer?: string; is_primary: boolean }) => {
    setGeneratedVariants(prev => 
      prev.map(variant => 
        variant.id === variantId 
          ? {
              ...variant,
              data: { 
                ...variant.data, 
                barcodes: [
                  ...variant.data.barcodes, 
                  {
                    ...barcode,
                    is_primary: variant.data.barcodes.length === 0 // First barcode is primary
                  }
                ]
              }
            }
          : variant
      )
    );
  };

  const removeBarcodeFromVariant = (variantId: string, barcodeIndex: number) => {
    setGeneratedVariants(prev => 
      prev.map(variant => 
        variant.id === variantId 
          ? {
              ...variant,
              data: { 
                ...variant.data, 
                barcodes: variant.data.barcodes.filter((_, index) => index !== barcodeIndex)
              }
            }
          : variant
      )
    );
  };

  const applyGlobalFormFactor = () => {
    if (!globalFormFactor) return;
    
    setGeneratedVariants(prev => 
      prev.map(variant => ({
        ...variant,
        data: { ...variant.data, form_factor: globalFormFactor }
      }))
    );
    
    toast({
      title: "Success",
      description: `Applied "${globalFormFactor}" to all variants.`
    });
  };

  const applyGlobalCategories = () => {
    if (globalCategories.length === 0) return;
    
    setGeneratedVariants(prev => 
      prev.map(variant => ({
        ...variant,
        data: { ...variant.data, categories: globalCategories }
      }))
    );
    
    const categoryNames = availableCategories
      .filter(cat => globalCategories.includes(cat.id))
      .map(cat => cat.name)
      .join(", ");
    
    toast({
      title: "Success",
      description: `Applied categories "${categoryNames}" to all variants.`
    });
  };

  const toggleIngredientsCollapse = (variantId: string) => {
    setCollapsedIngredients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(variantId)) {
        newSet.delete(variantId);
      } else {
        newSet.add(variantId);
      }
      return newSet;
    });
  };

  const toggleNutritionCollapse = (variantId: string) => {
    setCollapsedNutrition(prev => {
      const newSet = new Set(prev);
      if (newSet.has(variantId)) {
        newSet.delete(variantId);
      } else {
        newSet.add(variantId);
      }
      return newSet;
    });
  };

  const saveIngredientsAndCollapse = (variantId: string) => {
    // Collapse the ingredients section after saving
    setCollapsedIngredients(prev => new Set([...prev, variantId]));
    
    toast({
      title: "Success",
      description: "Ingredients saved and section collapsed."
    });
  };

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
    }
  };

  const fetchIngredients = async () => {
    try {
      const { data, error } = await supabase
        .from("ingredients")
        .select("id, name, is_toxic, is_controversial, tags")
        .order("name");

      if (error) throw error;
      setAvailableIngredients(data || []);
    } catch (error) {
      console.error("Error fetching ingredients:", error);
    }
  };

  const fetchNutritionalAttributes = async () => {
    try {
      const { data, error } = await supabase
        .from("nutritional_attributes")
        .select("id, name, display_name, unit, data_type")
        .order("name");

      if (error) throw error;
      setNutritionalAttributes(data || []);
    } catch (error) {
      console.error("Error fetching nutritional attributes:", error);
    }
  };

  const addCustomVariant = () => {
    if (!newVariant.variant_name_suffix.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a variant name."
      });
      return;
    }

    const customVariant: GeneratedVariant = {
      id: `custom-${Date.now()}`,
      name: newVariant.variant_name_suffix,
      optionValues: {},
      data: { ...newVariant }
    };

    setGeneratedVariants(prev => [...prev, customVariant]);
    setNewVariant({
      variant_name_suffix: "",
      image_url: "",
      form_factor: "",
      package_size_value: undefined,
      package_size_unit: "",
      barcodes: [],
      optionValues: {},
      isActive: true
    });
    setShowAddVariant(false);

    toast({
      title: "Success",
      description: "Custom variant added successfully."
    });
  };

  const isValid = generatedVariants.length > 0 && 
    generatedVariants.every(variant => 
      variant.data.variant_name_suffix.trim() && 
      variant.data.form_factor
    );

  const handleSubmit = async () => {
    if (!isValid) {
        toast({
          variant: "destructive",
          title: "Error",
        description: "Please fill in all required fields for all variants."
        });
        return;
      }

    setIsLoading(true);
    try {
      const activeVariants = generatedVariants.filter(v => v.data.isActive);
      
      // Store variant data in form state for next steps
      updateFormState({ 
        generatedVariants: activeVariants,
        variantIds: activeVariants.map((_, index) => index) // Temporary IDs
      });

      toast({
        title: "Success!",
        description: `${activeVariants.length} variant(s) ready for creation.`
      });

      onComplete();
    } catch (error) {
      console.error("Error submitting variants:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save variants."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Product Variants</h2>
        <p className="text-muted-foreground">
          Review and customize the generated product variants based on your selected options
        </p>
      </div>

      {/* Global Settings */}
      <Card className="bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg">Global Settings</CardTitle>
          <CardDescription>
            Set global values for all variants at once, or override individually below
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Global Food Type */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Food Type</Label>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Select
                  value={globalFormFactor}
                  onValueChange={setGlobalFormFactor}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select food type for all variants..." />
                  </SelectTrigger>
                  <SelectContent>
                    {FORM_FACTOR_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={applyGlobalFormFactor}
                disabled={!globalFormFactor}
                variant="outline"
                size="sm"
              >
                Apply to All
              </Button>
            </div>
          </div>

          {/* Global Categories */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Categories <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
                  {availableCategories.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`global-category-${category.id}`}
                        checked={globalCategories.includes(category.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setGlobalCategories(prev => [...prev, category.id]);
                          } else {
                            setGlobalCategories(prev => prev.filter(id => id !== category.id));
                          }
                        }}
                      />
                      <Label 
                        htmlFor={`global-category-${category.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {category.name}
                      </Label>
                    </div>
                  ))}
                </div>
                {globalCategories.length === 0 && (
                  <p className="text-sm text-red-500 mt-1">Please select at least one category</p>
                )}
              </div>
              <Button 
                onClick={applyGlobalCategories}
                disabled={globalCategories.length === 0}
                variant="outline"
                size="sm"
              >
                Apply to All
              </Button>
            </div>
          </div>

          {/* Advanced Fields Toggle */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <h4 className="font-semibold">Advanced Fields</h4>
              <p className="text-sm text-muted-foreground">
                Show package size and other detailed fields for all variants
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowAdvancedFields(!showAdvancedFields)}
            >
              {showAdvancedFields ? 'Hide' : 'Show'} Advanced Fields
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Variant Summary */}
      <Card className="bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Generated Variants</h4>
              <p className="text-sm text-muted-foreground">
                {generatedVariants.length} total variants • {generatedVariants.filter(v => v.data.isActive).length} active
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowAddVariant(!showAddVariant)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Variant
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Custom Variant Form */}
      {showAddVariant && (
        <Card>
          <CardHeader>
            <CardTitle>Add Custom Variant</CardTitle>
            <CardDescription>
              Add a variant that doesn't follow the standard option combinations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customVariantName">Variant Name *</Label>
                <Input
                  id="customVariantName"
                  value={newVariant.variant_name_suffix}
                  onChange={(e) => setNewVariant(prev => ({ ...prev, variant_name_suffix: e.target.value }))}
                  placeholder="e.g., Special Edition"
                />
              </div>
              <div>
                <Label htmlFor="customFormFactor">Food Type *</Label>
                <Select
                  value={newVariant.form_factor}
                  onValueChange={(value) => setNewVariant(prev => ({ ...prev, form_factor: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select food type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {FORM_FACTOR_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                    </div>
                  </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="packageSizeValue">Package Size</Label>
                <Input
                  id="packageSizeValue"
                  type="number"
                  step="0.1"
                  value={newVariant.package_size_value || ""}
                  onChange={(e) => setNewVariant(prev => ({ ...prev, package_size_value: parseFloat(e.target.value) || undefined }))}
                  placeholder="e.g., 5"
                />
                </div>
              <div>
                <Label htmlFor="packageSizeUnit">Unit</Label>
                <Select
                  value={newVariant.package_size_unit}
                  onValueChange={(value) => setNewVariant(prev => ({ ...prev, package_size_unit: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit..." />
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
              <div>
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  value={newVariant.image_url}
                  onChange={(e) => setNewVariant(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={addCustomVariant}>
                <Plus className="h-4 w-4 mr-2" />
                Add Variant
              </Button>
              <Button variant="outline" onClick={() => setShowAddVariant(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Variants */}
      <div className="space-y-4">
        {generatedVariants.map((variant) => (
          <Card key={variant.id} className={`${!variant.data.isActive ? "opacity-50" : ""} border-l-4 border-l-primary/20`}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold text-foreground">{variant.name}</CardTitle>
                  
                  {/* Custom Variant Name Input */}
                  <div className="mt-3 p-3 bg-muted/30 rounded-lg border">
                    <Label htmlFor={`variant-name-${variant.id}`} className="text-xs font-medium text-muted-foreground">
                      Custom Name (optional)
                    </Label>
                    <Input
                      id={`variant-name-${variant.id}`}
                      value={variant.data.variant_name_suffix || ""}
                      onChange={(e) => updateVariant(variant.id, 'variant_name_suffix', e.target.value)}
                      placeholder="Leave empty to use generated name"
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  
                  {Object.keys(variant.optionValues).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {Object.entries(variant.optionValues).map(([key, value]) => (
                        <Badge key={key} variant="secondary" className="text-xs font-medium">
                          {key}: {value}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
        <div className="flex items-center gap-2">
          <Checkbox
                    checked={variant.data.isActive}
                    onCheckedChange={() => toggleVariantActive(variant.id)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeVariant(variant.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor={`${variant.id}-form-factor`}>Food Type *</Label>
                  <Select
                    value={variant.data.form_factor}
                    onValueChange={(value) => updateVariant(variant.id, 'form_factor', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select food type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {FORM_FACTOR_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-xs text-muted-foreground">{option.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {showAdvancedFields && (
                  <>
                <div>
                      <Label htmlFor={`${variant.id}-package-size-value`}>Package Size</Label>
                  <Input
                        id={`${variant.id}-package-size-value`}
                        type="number"
                        step="0.1"
                        value={variant.data.package_size_value || ""}
                        onChange={(e) => updateVariant(variant.id, 'package_size_value', parseFloat(e.target.value) || undefined)}
                        placeholder="e.g., 5"
                  />
                </div>
                <div>
                      <Label htmlFor={`${variant.id}-package-size-unit`}>Unit</Label>
                      <Select
                        value={variant.data.package_size_unit}
                        onValueChange={(value) => updateVariant(variant.id, 'package_size_unit', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit..." />
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
                  </>
                )}
                <div>
                  <Label htmlFor={`${variant.id}-image`}>Image URL</Label>
                  <Input
                    id={`${variant.id}-image`}
                    value={variant.data.image_url}
                    onChange={(e) => updateVariant(variant.id, 'image_url', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>
              
              {/* Barcodes Section */}
              <div>
                <Label className="text-sm font-medium">Product Identifiers</Label>
                <div className="mt-2 space-y-2">
                  {variant.data.barcodes.map((barcode, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                      <Badge variant="outline">{barcode.barcode_type.toUpperCase()}</Badge>
                      <span className="font-mono text-sm flex-1">{barcode.barcode}</span>
                      {barcode.retailer && (
                        <Badge variant="secondary" className="text-xs">{barcode.retailer}</Badge>
                      )}
                      {barcode.is_primary && (
                        <Badge variant="default" className="text-xs">Primary</Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeBarcodeFromVariant(variant.id, index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  
                  {/* Add Barcode Form - Inline */}
                  <AddBarcodeForm variantId={variant.id} onAddBarcode={addBarcodeToVariant} />
                </div>
              </div>


              {/* Ingredients Section */}
                <div className="bg-green-50/50 p-4 rounded-lg border border-green-200/50">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold flex items-center gap-2 text-green-900">
                    <Leaf className="h-4 w-4" />
                    Ingredients
                  </Label>
                  <div className="flex gap-2">
                    {!collapsedIngredients.has(variant.id) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveIngredientsAndCollapse(variant.id)}
                        className="text-xs"
                      >
                        Save & Collapse
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleIngredientsCollapse(variant.id)}
                      className="text-xs"
                    >
                      {collapsedIngredients.has(variant.id) ? 'Make Changes' : 'Collapse'}
                    </Button>
                  </div>
                </div>
                
                {!collapsedIngredients.has(variant.id) && (
                  <div className="mt-2 space-y-2">
                  {/* Paste Ingredients */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Paste ingredient list (comma-separated)</Label>
                    <Textarea
                      placeholder="Chicken, Brown Rice, Sweet Potatoes, Peas, Chicken Meal..."
                      className="text-sm"
                      rows={2}
                      onChange={(e) => {
                        const ingredients = e.target.value
                          .split(',')
                          .map(ing => ing.trim())
                          .filter(ing => ing.length > 0);
                        
                        if (ingredients.length > 0) {
                          updateVariant(variant.id, 'ingredients', ingredients);
                        }
                      }}
                  />
                </div>
                  
                  {/* Ingredient Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                      placeholder="Search ingredients..."
                      value={ingredientSearchTerm}
                      onChange={(e) => setIngredientSearchTerm(e.target.value)}
                      className="pl-10"
                  />
                </div>
                  
                  {/* Available Ingredients */}
                  <div className="max-h-32 overflow-y-auto border rounded-lg p-2">
                    {filteredIngredients.slice(0, 10).map((ingredient) => (
                      <div key={ingredient.id} className="flex items-center space-x-2 py-1">
                        <Checkbox
                          id={`${variant.id}-ingredient-${ingredient.id}`}
                          checked={variant.data.ingredients.includes(ingredient.name)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              updateVariant(variant.id, 'ingredients', [...variant.data.ingredients, ingredient.name]);
                            } else {
                              updateVariant(variant.id, 'ingredients', variant.data.ingredients.filter(name => name !== ingredient.name));
                            }
                          }}
                        />
                        <Label htmlFor={`${variant.id}-ingredient-${ingredient.id}`} className="text-sm flex-1">
                          {ingredient.name}
                          {ingredient.is_toxic && <Badge variant="destructive" className="ml-2 text-xs">Toxic</Badge>}
                          {ingredient.is_controversial && <Badge variant="secondary" className="ml-2 text-xs">Controversial</Badge>}
                        </Label>
                      </div>
                    ))}
                  </div>
                  
                  {/* Selected Ingredients */}
                  {variant.data.ingredients.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {variant.data.ingredients.map((ingredient) => (
                        <Badge key={ingredient} variant="outline" className="text-xs">
                          {ingredient}
                          <X 
                            className="h-3 w-3 ml-1 cursor-pointer" 
                            onClick={() => updateVariant(variant.id, 'ingredients', variant.data.ingredients.filter(name => name !== ingredient))}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                )}
                
                {/* Show selected ingredients when collapsed */}
                {collapsedIngredients.has(variant.id) && variant.data.ingredients.length > 0 && (
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-1">
                      {variant.data.ingredients.slice(0, 5).map((ingredient) => (
                        <Badge key={ingredient} variant="outline" className="text-xs">
                          {ingredient}
                        </Badge>
                      ))}
                      {variant.data.ingredients.length > 5 && (
                        <Badge variant="secondary" className="text-xs">
                          +{variant.data.ingredients.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Nutrition Section */}
              <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-200/50">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold flex items-center gap-2 text-orange-900">
                    <Activity className="h-4 w-4" />
                    Nutritional Information
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleNutritionCollapse(variant.id)}
                  >
                    {collapsedNutrition.has(variant.id) ? "Show Details" : "Hide Details"}
                  </Button>
                </div>
                
                {!collapsedNutrition.has(variant.id) && (
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {nutritionalAttributes.slice(0, 6).map((attribute) => (
                      <div key={attribute.id}>
                        <Label htmlFor={`${variant.id}-nutrition-${attribute.id}`} className="text-xs">
                          {attribute.display_name}
                          {attribute.unit && ` (${attribute.unit})`}
                        </Label>
                        <Input
                          id={`${variant.id}-nutrition-${attribute.id}`}
                          type="number"
                          step="0.1"
                          value={variant.data.nutrition[attribute.id] || ''}
                          onChange={(e) => {
                            const newNutrition = { ...variant.data.nutrition };
                            newNutrition[attribute.id] = parseFloat(e.target.value) || 0;
                            updateVariant(variant.id, 'nutrition', newNutrition);
                          }}
                          placeholder="0.0"
                          className="text-sm"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          ))}
        </div>

      {/* Actions */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!isValid || isLoading}
          className="min-w-[120px]"
        >
          {isLoading ? (
            "Processing..."
          ) : (
            <>
              Continue to Review
          <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};