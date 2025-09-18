import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
  Info
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
  if (!variant || !productModel) return null;

  const formatPackageSize = () => {
    if (variant.package_size_value && variant.package_size_unit) {
      return `${variant.package_size_value} ${variant.package_size_unit}`;
    }
    return "Not specified";
  };

  const formatIngredients = () => {
    if (variant.ingredient_list_text) {
      return variant.ingredient_list_text;
    }
    if (variant.first_five_ingredients && variant.first_five_ingredients.length > 0) {
      return variant.first_five_ingredients.join(", ");
    }
    return "Ingredients not available";
  };

  const getBarcodeInfo = () => {
    if (variant.barcodes && variant.barcodes.length > 0) {
      const primaryBarcode = variant.barcodes.find(b => b.is_primary) || variant.barcodes[0];
      return {
        barcode: primaryBarcode.barcode,
        type: primaryBarcode.barcode_type,
        retailer: primaryBarcode.retailer
      };
    }
    return null;
  };

  const barcodeInfo = getBarcodeInfo();

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
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-bold text-blue-900">
                    {productModel?.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-white">
                      {productModel?.brand.name}
                    </Badge>
                    <Badge variant="secondary">
                      {productModel?.species}
                    </Badge>
                    <Badge variant="outline">
                      {productModel?.life_stage}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Variant</div>
                  <div className="font-semibold">
                    {variant.variant_name_suffix || "Default"}
                  </div>
                </div>
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
              <CardContent>
                {variant.image_url ? (
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img 
                      src={variant.image_url} 
                      alt={productModel.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                    <Image className="h-12 w-12 text-gray-400" />
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
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Form Factor</Label>
                  <p className="text-lg font-semibold">
                    {variant.form_factor || "Not specified"}
                  </p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Package Size</Label>
                  <p className="text-lg font-semibold flex items-center gap-2">
                    <Scale className="h-4 w-4" />
                    {formatPackageSize()}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Brand</Label>
                  <p className="text-lg font-semibold">
                    {productModel.brand.name}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Manufacturer</Label>
                  <p className="text-sm">
                    {productModel.brand.manufacturer || "Not specified"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Barcode Information */}
          {barcodeInfo && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
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
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm leading-relaxed">
                  {formatIngredients()}
                </p>
              </div>
              {variant.first_five_ingredients && variant.first_five_ingredients.length > 0 && (
                <div className="mt-4">
                  <Label className="text-sm font-medium text-muted-foreground">First 5 Ingredients</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {variant.first_five_ingredients.map((ingredient, index) => (
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
          {variant.options && variant.options.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Product Options
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {variant.options.map((option, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
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
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Brand Name</Label>
                  <p className="text-lg font-semibold">{productModel.brand.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Country of Origin</Label>
                  <p className="text-sm">{productModel.brand.country_of_origin || "Not specified"}</p>
                </div>
                {productModel.brand.website_url && (
                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium text-muted-foreground">Website</Label>
                    <a 
                      href={productModel.brand.website_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      {productModel.brand.website_url}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Data Quality Indicators */}
          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-800">
                <Activity className="h-4 w-4" />
                Data Quality
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  {variant.image_url ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  )}
                  <span className="text-sm">Image Available</span>
                </div>
                <div className="flex items-center gap-2">
                  {variant.ingredient_list_text ? (
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
