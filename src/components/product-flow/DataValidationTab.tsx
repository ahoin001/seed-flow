import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle, AlertTriangle, Search, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { FormState } from "@/pages/ProductFlow";

interface DataValidationTabProps {
  formState: FormState;
  updateFormState: (updates: Partial<FormState>) => void;
  onComplete: () => void;
}

interface ValidationResult {
  validation_passed: boolean;
  quality_score: number;
  issues: string[];
  suggestions: string[];
  normalized_data: any;
}

interface SimilarProduct {
  variant_id: string;
  variant_name: string;
  brand_name: string;
  product_line_name: string;
  similarity_score: number;
  match_reasons: string[];
}

interface ParsedIngredient {
  ingredient_name: string;
  percentage: number | null;
  ingredient_order: number;
  confidence_score: number;
  suggested_ingredient_id: string | null;
  parsing_method: string;
}

export const DataValidationTab = ({ formState, updateFormState, onComplete }: DataValidationTabProps) => {
  const [productData, setProductData] = useState({
    brandName: "",
    productLineName: "",
    variantName: "",
    upc: "",
    ingredients: ""
  });
  
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [similarProducts, setSimilarProducts] = useState<SimilarProduct[]>([]);
  const [parsedIngredients, setParsedIngredients] = useState<ParsedIngredient[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [showSimilarProducts, setShowSimilarProducts] = useState(false);

  const validateProductData = async () => {
    if (!productData.brandName || !productData.productLineName || !productData.variantName) {
      toast({
        variant: "destructive",
        title: "Missing Required Fields",
        description: "Please fill in brand name, product line name, and variant name."
      });
      return;
    }

    setIsValidating(true);
    try {
      // Call validation function
      const { data, error } = await supabase.rpc('validate_product_entry', {
        p_brand_name: productData.brandName,
        p_product_line_name: productData.productLineName,
        p_variant_name: productData.variantName,
        p_upc: productData.upc || null,
        p_ingredients: productData.ingredients || null
      });

      if (error) throw error;

      const result = data[0];
      setValidationResult(result);

      // If validation passed, get similar products
      if (result.validation_passed) {
        await getSimilarProducts();
      }

      // Parse ingredients if provided
      if (productData.ingredients) {
        await parseIngredients();
      }

    } catch (error) {
      console.error("Validation error:", error);
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Failed to validate product data. Please try again."
      });
    } finally {
      setIsValidating(false);
    }
  };

  const getSimilarProducts = async () => {
    try {
      const { data, error } = await supabase.rpc('suggest_similar_products', {
        p_brand_name: productData.brandName,
        p_product_line_name: productData.productLineName,
        p_variant_name: productData.variantName,
        p_upc: productData.upc || null
      });

      if (error) throw error;
      setSimilarProducts(data || []);
      setShowSimilarProducts(data && data.length > 0);
    } catch (error) {
      console.error("Error getting similar products:", error);
    }
  };

  const parseIngredients = async () => {
    try {
      const { data, error } = await supabase.rpc('parse_ingredient_list_mvp', {
        p_ingredient_text: productData.ingredients
      });

      if (error) throw error;
      setParsedIngredients(data || []);
    } catch (error) {
      console.error("Error parsing ingredients:", error);
    }
  };

  const handleContinue = () => {
    if (validationResult && validationResult.validation_passed) {
      // Store normalized data in form state
      updateFormState({
        normalizedProductData: validationResult.normalized_data
      });
      onComplete();
    } else {
      toast({
        variant: "destructive",
        title: "Validation Required",
        description: "Please fix validation issues before continuing."
      });
    }
  };

  const getQualityScoreColor = (score: number) => {
    if (score >= 0.8) return "text-green-600";
    if (score >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getQualityScoreBadgeVariant = (score: number) => {
    if (score >= 0.8) return "default";
    if (score >= 0.6) return "secondary";
    return "destructive";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Data Validation & Normalization</h2>
        <p className="text-muted-foreground">
          Enter product information to validate and normalize data for consistency.
        </p>
      </div>

      {/* Product Data Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Product Information
          </CardTitle>
          <CardDescription>
            Enter the basic product information for validation and normalization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="brandName">Brand Name *</Label>
              <Input
                id="brandName"
                value={productData.brandName}
                onChange={(e) => setProductData(prev => ({ ...prev, brandName: e.target.value }))}
                placeholder="e.g., Purina"
              />
            </div>
            <div>
              <Label htmlFor="productLineName">Product Line Name *</Label>
              <Input
                id="productLineName"
                value={productData.productLineName}
                onChange={(e) => setProductData(prev => ({ ...prev, productLineName: e.target.value }))}
                placeholder="e.g., Pro Plan Adult"
              />
            </div>
            <div>
              <Label htmlFor="variantName">Variant Name *</Label>
              <Input
                id="variantName"
                value={productData.variantName}
                onChange={(e) => setProductData(prev => ({ ...prev, variantName: e.target.value }))}
                placeholder="e.g., Chicken & Rice 5lb"
              />
            </div>
            <div>
              <Label htmlFor="upc">UPC/Barcode</Label>
              <Input
                id="upc"
                value={productData.upc}
                onChange={(e) => setProductData(prev => ({ ...prev, upc: e.target.value }))}
                placeholder="123456789012"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="ingredients">Ingredients List</Label>
            <Textarea
              id="ingredients"
              value={productData.ingredients}
              onChange={(e) => setProductData(prev => ({ ...prev, ingredients: e.target.value }))}
              placeholder="Chicken, Chicken Meal, Rice, Corn Meal, Chicken Fat..."
              rows={3}
            />
          </div>

          <Button 
            onClick={validateProductData} 
            disabled={isValidating}
            className="w-full"
            variant="premium"
          >
            {isValidating ? "Validating..." : "Validate Product Data"}
          </Button>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {validationResult.validation_passed ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              Validation Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quality Score */}
            <div className="flex items-center gap-4">
              <span className="font-medium">Data Quality Score:</span>
              <Badge variant={getQualityScoreBadgeVariant(validationResult.quality_score)}>
                {Math.round(validationResult.quality_score * 100)}%
              </Badge>
              <span className={`text-sm ${getQualityScoreColor(validationResult.quality_score)}`}>
                {validationResult.quality_score >= 0.8 ? "Excellent" : 
                 validationResult.quality_score >= 0.6 ? "Good" : "Needs Improvement"}
              </span>
            </div>

            {/* Issues */}
            {validationResult.issues.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Issues Found:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {validationResult.issues.map((issue, index) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Suggestions */}
            {validationResult.suggestions.length > 0 && (
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Suggestions:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {validationResult.suggestions.map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Normalized Data Preview */}
            {validationResult.normalized_data && (
              <div>
                <h4 className="font-medium mb-2">Normalized Data:</h4>
                <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                  {JSON.stringify(validationResult.normalized_data, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Similar Products */}
      {showSimilarProducts && similarProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Similar Products Found</CardTitle>
            <CardDescription>
              These products might be duplicates or very similar to what you're entering.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {similarProducts.map((product) => (
                <div key={product.variant_id} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{product.variant_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {product.brand_name} - {product.product_line_name}
                      </p>
                      <div className="flex gap-1 mt-1">
                        {product.match_reasons.map((reason, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {reason.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {Math.round(product.similarity_score * 100)}% match
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parsed Ingredients */}
      {parsedIngredients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Parsed Ingredients</CardTitle>
            <CardDescription>
              Ingredients have been parsed and matched to our database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {parsedIngredients.map((ingredient, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <span className="font-medium">{ingredient.ingredient_name}</span>
                    {ingredient.percentage && (
                      <span className="text-sm text-muted-foreground ml-2">
                        ({ingredient.percentage}%)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={ingredient.confidence_score > 0.7 ? "default" : "secondary"}>
                      {Math.round(ingredient.confidence_score * 100)}% confidence
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {ingredient.parsing_method}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end">
        <Button
          onClick={handleContinue}
          disabled={!validationResult || !validationResult.validation_passed}
          variant="premium"
          size="lg"
        >
          Continue to Brand & Product Line
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};
