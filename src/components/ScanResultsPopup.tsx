import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Package, 
  Barcode, 
  Leaf, 
  Activity, 
  Tag, 
  Image, 
  Scale,
  ShoppingCart,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Info,
  Edit3,
  Save,
  X,
  Loader2
} from "lucide-react";

interface ProductVariant {
  id: number;
  variant_name_suffix: string;
  form_factor: string;
  package_size_value: number;
  package_size_unit: string;
  image_url: string;
  ingredient_list_text: string;
  first_five_ingredients: string[];
  barcodes: any[];
  options: any[];
}

interface ProductModel {
  id: number;
  name: string;
  base_description: string;
  species: string;
  life_stage: string;
  brand: {
    id: number;
    name: string;
    website_url: string;
    manufacturer: string;
    country_of_origin: string;
  };
  variants: ProductVariant[];
}

interface ScanResultsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  variant: ProductVariant | null;
  productModel: ProductModel | null;
}

export const ScanResultsPopup = ({ isOpen, onClose, variant, productModel }: ScanResultsPopupProps) => {
  const { toast } = useToast();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [localVariant, setLocalVariant] = useState<ProductVariant | null>(null);
  const [localProductModel, setLocalProductModel] = useState<ProductModel | null>(null);

  // Initialize local state when props change
  useEffect(() => {
    if (variant && productModel) {
      setLocalVariant({ ...variant });
      setLocalProductModel({ ...productModel });
    }
  }, [variant, productModel]);


  if (!localVariant || !localProductModel) return null;

  // Inline editing functions
  const startEditing = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue || "");
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValue("");
  };

  const saveField = async (field: string, value: string) => {
    if (!localVariant) return;

    setIsSaving(true);
    try {
      let updateData: any = {};
      
      // Map field names to database columns
      switch (field) {
        case 'variant_name_suffix':
          updateData.variant_name_suffix = value;
          break;
        case 'form_factor':
          updateData.form_factor = value;
          break;
        case 'package_size_value':
          updateData.package_size_value = parseFloat(value) || null;
          break;
        case 'package_size_unit':
          updateData.package_size_unit = value;
          break;
        case 'ingredient_list_text':
          updateData.ingredient_list_text = value;
          break;
        case 'image_url':
          updateData.image_url = value;
          break;
        case 'product_name':
          updateData.name = value;
          break;
        case 'base_description':
          updateData.base_description = value;
          break;
        case 'brand_name':
          updateData.name = value;
          break;
        case 'manufacturer':
          updateData.manufacturer = value;
          break;
        case 'website_url':
          updateData.website_url = value;
          break;
        case 'country_of_origin':
          updateData.country_of_origin = value;
          break;
      }

      // Update the appropriate table
      if (['product_name', 'base_description'].includes(field)) {
        const { error } = await supabase
          .from('product_models')
          .update(updateData)
          .eq('id', localProductModel.id);
        
        if (error) throw error;
        
        setLocalProductModel(prev => prev ? { ...prev, ...updateData } : null);
      } else if (['brand_name', 'manufacturer', 'website_url', 'country_of_origin'].includes(field)) {
        const { error } = await supabase
          .from('brands')
          .update(updateData)
          .eq('id', localProductModel.brand.id);
        
        if (error) throw error;
        
        setLocalProductModel(prev => prev ? {
          ...prev,
          brand: { ...prev.brand, ...updateData }
        } : null);
      } else {
        const { error } = await supabase
          .from('product_variants')
          .update(updateData)
          .eq('id', localVariant.id);
        
        if (error) throw error;
        
        // Update local variant state immediately
        setLocalVariant(prev => prev ? { ...prev, ...updateData } : null);
      }

      toast({
        title: "Success",
        description: "Field updated successfully",
      });

      setEditingField(null);
      setEditValue("");
    } catch (error) {
      console.error('Error updating field:', error);
      toast({
        title: "Error",
        description: "Failed to update field",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatPackageSize = () => {
    if (localVariant.package_size_value && localVariant.package_size_unit) {
      return `${localVariant.package_size_value} ${localVariant.package_size_unit}`;
    }
    return "Not specified";
  };

  const formatIngredients = () => {
    if (localVariant.ingredient_list_text) {
      return localVariant.ingredient_list_text;
    }
    if (localVariant.first_five_ingredients && localVariant.first_five_ingredients.length > 0) {
      return localVariant.first_five_ingredients.join(", ");
    }
    return "Ingredients not available";
  };

  const getBarcodeInfo = () => {
    if (localVariant.barcodes && localVariant.barcodes.length > 0) {
      const primaryBarcode = localVariant.barcodes.find(b => b.is_primary) || localVariant.barcodes[0];
      return {
        barcode: primaryBarcode.barcode,
        type: primaryBarcode.barcode_type,
        retailer: primaryBarcode.retailer
      };
    }
    return null;
  };

  const barcodeInfo = getBarcodeInfo();

  // Inline edit field component
  const InlineEditField = ({ 
    field, 
    value, 
    label, 
    type = "text", 
    options = null,
    className = "",
    placeholder = ""
  }: {
    field: string;
    value: string;
    label: string;
    type?: "text" | "textarea" | "select" | "number";
    options?: { value: string; label: string }[] | null;
    className?: string;
    placeholder?: string;
  }) => {
    const isEditing = editingField === field;
    const displayValue = value || placeholder || "Not specified";

    if (isEditing) {
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
          <div className="flex items-center gap-2">
            {type === "textarea" ? (
              <Textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1"
                rows={3}
                placeholder={placeholder}
              />
            ) : type === "select" && options ? (
              <Select value={editValue} onValueChange={setEditValue}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={type}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1"
                placeholder={placeholder}
              />
            )}
            <Button
              size="sm"
              onClick={() => saveField(field, editValue)}
              disabled={isSaving}
              className="h-8 w-8 p-0"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={cancelEditing}
              disabled={isSaving}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className={`group ${className}`}>
        <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
        <div className="flex items-center justify-between min-h-[2rem]">
          <p className={`text-lg font-semibold flex-1 ${!value ? 'text-muted-foreground' : ''}`}>
            {displayValue}
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => startEditing(field, value)}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 ml-2 flex-shrink-0"
          >
            <Edit3 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Barcode className="h-5 w-5" />
            Scan Results
          </DialogTitle>
          <DialogDescription>
            Product information retrieved from database
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Section */}
          <Card className="bg-primary/5 border-primary/20 shadow-sm">
            <CardHeader className="space-y-4">
              {/* Product Name - Full Width */}
              <div>
                <InlineEditField
                  field="product_name"
                  value={localProductModel.name}
                  label="Product Name"
                  className="w-full"
                />
              </div>
              
              {/* Brand and Variant - Side by Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InlineEditField
                  field="brand_name"
                  value={localProductModel.brand.name}
                  label="Brand"
                  className="w-full"
                />
                <InlineEditField
                  field="variant_name_suffix"
                  value={localVariant.variant_name_suffix}
                  label="Variant"
                  placeholder="Default"
                  className="w-full"
                />
              </div>
              
              {/* Species and Life Stage Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-sm">
                  {localProductModel.species}
                </Badge>
                <Badge variant="outline" className="text-sm">
                  {Array.isArray(localProductModel.life_stage) 
                    ? localProductModel.life_stage.join(', ') 
                    : localProductModel.life_stage}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Product Image & Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Product Image
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Image Preview */}
                {localVariant.image_url ? (
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img 
                      key={localVariant.image_url} // Force re-render when URL changes
                      src={localVariant.image_url} 
                      alt={localProductModel.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="hidden aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                      <Image className="h-12 w-12 text-gray-400" />
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                    <Image className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                
                {/* Edit Image URL Button */}
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEditing('image_url', localVariant.image_url || '')}
                    className="text-xs"
                  >
                    <Edit3 className="h-3 w-3 mr-1" />
                    Edit Image URL
                  </Button>
                </div>
                
                {/* Image URL Field - Only show when editing */}
                {editingField === 'image_url' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Image URL</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1"
                        placeholder="https://example.com/image.jpg"
                      />
                      <Button
                        size="sm"
                        onClick={() => saveField('image_url', editValue)}
                        disabled={isSaving}
                        className="h-8 w-8 p-0"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEditing}
                        disabled={isSaving}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Product Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InlineEditField
                  field="form_factor"
                  value={localVariant.form_factor}
                  label="Form Factor"
                  type="select"
                  options={[
                    { value: 'dehydrated', label: 'Dehydrated' },
                    { value: 'dry kibble', label: 'Dry Kibble' },
                    { value: 'freeze-dried', label: 'Freeze-Dried' },
                    { value: 'raw frozen', label: 'Raw Frozen' },
                    { value: 'semi-moist', label: 'Semi-Moist' },
                    { value: 'topper', label: 'Topper' },
                    { value: 'treats', label: 'Treats' },
                    { value: 'wet chunks', label: 'Wet Chunks' },
                    { value: 'wet pâté', label: 'Wet Pâté' },
                    { value: 'wet shreds', label: 'Wet Shreds' },
                    { value: 'wet stew', label: 'Wet Stew' }
                  ]}
                />
                
                <div className="grid grid-cols-2 gap-2">
                  <InlineEditField
                    field="package_size_value"
                    value={localVariant.package_size_value?.toString()}
                    label="Package Size Value"
                    type="number"
                    placeholder="0"
                  />
                  <InlineEditField
                    field="package_size_unit"
                    value={localVariant.package_size_unit}
                    label="Package Size Unit"
                    type="select"
                    options={[
                      { value: 'can', label: 'Cans' },
                      { value: 'cup', label: 'Cups' },
                      { value: 'g', label: 'Grams' },
                      { value: 'kg', label: 'Kilograms' },
                      { value: 'l', label: 'Liters' },
                      { value: 'lb', label: 'Pounds' },
                      { value: 'ml', label: 'Milliliters' },
                      { value: 'oz', label: 'Ounces' },
                      { value: 'pouch', label: 'Pouches' }
                    ]}
                  />
                </div>

                <InlineEditField
                  field="manufacturer"
                  value={localProductModel.brand.manufacturer}
                  label="Manufacturer"
                />
              </CardContent>
            </Card>
          </div>

          {/* Barcode Information */}
          {barcodeInfo && (
            <Card className="bg-muted/20 border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Barcode className="h-4 w-4" />
                  Barcode Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Barcode</Label>
                    <p className="text-lg font-mono font-semibold">
                      {barcodeInfo.barcode}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Type</Label>
                    <p className="text-sm font-semibold">
                      {barcodeInfo.type}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Retailer</Label>
                    <p className="text-sm">
                      {barcodeInfo.retailer || "Not specified"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ingredients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Leaf className="h-4 w-4" />
                Ingredients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InlineEditField
                field="ingredient_list_text"
                value={localVariant.ingredient_list_text}
                label="Ingredient List"
                type="textarea"
                placeholder="Enter ingredient list..."
                className="mb-4"
              />
              {localVariant.first_five_ingredients && localVariant.first_five_ingredients.length > 0 && (
                <div className="mt-4">
                  <Label className="text-sm font-medium text-muted-foreground">First 5 Ingredients</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {localVariant.first_five_ingredients.map((ingredient, index) => (
                      <Badge key={index} variant="outline">
                        {ingredient}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Options */}
          {localVariant.options && localVariant.options.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Product Options
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {localVariant.options.map((option, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-muted/20 rounded-lg border border-border/50">
                      <span className="font-medium">{option.option_type_name}</span>
                      <Badge variant="secondary">{option.value}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Brand Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Brand Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InlineEditField
                  field="brand_name"
                  value={localProductModel.brand.name}
                  label="Brand Name"
                />
                <InlineEditField
                  field="country_of_origin"
                  value={localProductModel.brand.country_of_origin}
                  label="Country of Origin"
                />
                <div className="md:col-span-2">
                  <InlineEditField
                    field="website_url"
                    value={localProductModel.brand.website_url}
                    label="Website"
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Product Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InlineEditField
                field="base_description"
                value={localProductModel.base_description}
                label="Description"
                type="textarea"
                placeholder="Enter product description..."
              />
            </CardContent>
          </Card>

          {/* Data Quality Indicators */}
          <Card className="bg-muted/20 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Activity className="h-4 w-4" />
                Data Quality
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  {localVariant.image_url ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  )}
                  <span className="text-sm">Image Available</span>
                </div>
                <div className="flex items-center gap-2">
                  {localVariant.ingredient_list_text ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  )}
                  <span className="text-sm">Ingredients Listed</span>
                </div>
                <div className="flex items-center gap-2">
                  {barcodeInfo ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  )}
                  <span className="text-sm">Barcode Available</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onClose}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            View Product
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
