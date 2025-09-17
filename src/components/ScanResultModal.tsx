import { useState, useEffect } from "react";
import { X, Star, AlertTriangle, CheckCircle, Info, ShoppingCart, ExternalLink, Heart, Share2, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ScanResultData {
  variant: {
    id: string;
    name: string;
    sku: string | null;
    base_weight: number | null;
    weight_unit: string;
    packaging_type: string | null;
  };
  productLine: {
    id: string;
    name: string;
    description: string | null;
    target_species: string[];
    life_stages: string[];
    dietary_types: string[];
    certifications: string[];
  };
  brand: {
    id: string;
    name: string;
    website: string | null;
    logo_url: string | null;
  };
  identifiers: Array<{
    identifier_type: string;
    identifier_value: string;
    is_primary: boolean;
  }>;
  options: Array<{
    option_type: string;
    option_display_name: string;
    option_value: string;
    option_display_value: string;
    numeric_value: number | null;
    unit: string | null;
  }>;
  ingredients: Array<{
    name: string;
    category: string;
    percentage: number | null;
    order: number;
    is_toxic: boolean;
    is_controversial: boolean;
    health_risks: string[];
  }>;
  nutrition: Array<{
    name: string;
    display_name: string;
    value: number | null;
    unit: string | null;
    category: string;
  }>;
  rating: {
    overall_score: number | null;
    ingredient_quality_score: number | null;
    nutritional_balance_score: number | null;
    processing_score: number | null;
    sustainability_score: number | null;
    safety_factors: any;
  };
  sources: Array<{
    retailer_name: string;
    price: number | null;
    currency: string;
    availability: string;
    url: string | null;
  }>;
}

interface ScanResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  variantId: string;
}

export const ScanResultModal = ({ isOpen, onClose, variantId }: ScanResultModalProps) => {
  const [scanData, setScanData] = useState<ScanResultData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && variantId) {
      fetchScanResultData();
    }
  }, [isOpen, variantId]);

  const fetchScanResultData = async () => {
    setIsLoading(true);
    try {
      // Use the get_product_by_upc function to get comprehensive scan result data
      const { data, error } = await supabase.rpc('get_product_by_upc', {
        upc_code: variantId // We'll use variant ID as a placeholder for now
      });

      if (error) {
        // Fallback to manual data fetching if function doesn't work
        await fetchManualScanData();
      } else if (data && data.length > 0) {
        // Process the function result
        const result = data[0];
        setScanData({
          variant: {
            id: result.variant_id,
            name: result.variant_name,
            sku: null,
            base_weight: null,
            weight_unit: 'oz',
            packaging_type: null
          },
          productLine: {
            id: '',
            name: result.product_line_name,
            description: null,
            target_species: [],
            life_stages: [],
            dietary_types: [],
            certifications: []
          },
          brand: {
            id: '',
            name: result.brand_name,
            website: null,
            logo_url: null
          },
          identifiers: [],
          options: Array.isArray(result.options) ? result.options : [],
          ingredients: Array.isArray(result.ingredients) ? result.ingredients : [],
          nutrition: Array.isArray(result.nutrition) ? Object.entries(result.nutrition).map(([key, value]: [string, any]) => ({
            name: key,
            display_name: key,
            value: value?.value || null,
            unit: value?.unit || null,
            category: 'other'
          })) : [],
          rating: {
            overall_score: result.rating?.overall_score || null,
            ingredient_quality_score: result.rating?.ingredient_quality || null,
            nutritional_balance_score: result.rating?.nutritional_balance || null,
            processing_score: null,
            sustainability_score: null,
            safety_factors: result.safety_flags || {}
          },
          sources: []
        });
      } else {
        await fetchManualScanData();
      }
    } catch (error) {
      console.error("Error fetching scan result:", error);
      await fetchManualScanData();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchManualScanData = async () => {
    try {
      // Fetch variant data
      const { data: variantData, error: variantError } = await supabase
        .from("product_variants")
        .select(`
          *,
          product_lines (
            *,
            brands (*)
          )
        `)
        .eq("id", variantId)
        .single();

      if (variantError) throw variantError;

      // Fetch identifiers
      const { data: identifiersData } = await supabase
        .from("product_identifiers")
        .select("*")
        .eq("product_variant_id", variantId)
        .eq("is_active", true);

      // Fetch options
      const { data: optionsData } = await supabase
        .from("product_variant_options")
        .select(`
          *,
          variant_option_values (
            *,
            variant_option_types (*)
          )
        `)
        .eq("product_variant_id", variantId);

      // Fetch ingredients
      const { data: ingredientsData } = await supabase
        .from("product_variant_ingredients")
        .select(`
          *,
          ingredients (*)
        `)
        .eq("product_variant_id", variantId)
        .order("ingredient_order");

      // Fetch nutrition
      const { data: nutritionData } = await supabase
        .from("nutritional_values")
        .select(`
          *,
          nutritional_attributes (*)
        `)
        .eq("product_variant_id", variantId);

      // Fetch rating
      const { data: ratingData } = await supabase
        .from("product_ratings")
        .select("*")
        .eq("product_line_id", variantData.product_line_id)
        .single();

      // Fetch sources
      const { data: sourcesData } = await supabase
        .from("product_sources")
        .select("*")
        .eq("product_variant_id", variantId)
        .eq("is_active", true);

      setScanData({
        variant: {
          id: variantData.id,
          name: variantData.name,
          sku: variantData.sku,
          base_weight: variantData.base_weight,
          weight_unit: variantData.weight_unit,
          packaging_type: variantData.packaging_type
        },
        productLine: {
          id: variantData.product_lines.id,
          name: variantData.product_lines.name,
          description: variantData.product_lines.description,
          target_species: variantData.product_lines.target_species || [],
          life_stages: variantData.product_lines.life_stages || [],
          dietary_types: variantData.product_lines.dietary_types || [],
          certifications: variantData.product_lines.certifications || []
        },
        brand: {
          id: variantData.product_lines.brands.id,
          name: variantData.product_lines.brands.name,
          website: variantData.product_lines.brands.website,
          logo_url: variantData.product_lines.brands.logo_url
        },
        identifiers: identifiersData || [],
        options: optionsData?.map(opt => ({
          option_type: opt.variant_option_values.variant_option_types.name,
          option_display_name: opt.variant_option_values.variant_option_types.display_name,
          option_value: opt.variant_option_values.value,
          option_display_value: opt.variant_option_values.display_value || opt.variant_option_values.value,
          numeric_value: opt.numeric_value || opt.variant_option_values.numeric_value,
          unit: opt.variant_option_values.variant_option_types.unit
        })) || [],
        ingredients: ingredientsData?.map(ing => ({
          name: ing.ingredients.name,
          category: ing.ingredients.category,
          percentage: ing.percentage,
          order: ing.ingredient_order,
          is_toxic: ing.ingredients.is_toxic,
          is_controversial: ing.ingredients.is_controversial,
          health_risks: ing.ingredients.health_risks || []
        })) || [],
        nutrition: nutritionData?.map(nut => ({
          name: nut.nutritional_attributes.name,
          display_name: nut.nutritional_attributes.display_name,
          value: nut.value,
          unit: nut.unit || nut.nutritional_attributes.unit,
          category: nut.nutritional_attributes.category || 'other'
        })) || [],
        rating: ratingData || {
          overall_score: null,
          ingredient_quality_score: null,
          nutritional_balance_score: null,
          processing_score: null,
          sustainability_score: null,
          safety_factors: {}
        },
        sources: sourcesData || []
      });
    } catch (error) {
      console.error("Error fetching manual scan data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load scan result data."
      });
    }
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    if (score >= 4) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number | null) => {
    if (!score) return "Not Rated";
    if (score >= 9) return "Excellent";
    if (score >= 7) return "Good";
    if (score >= 5) return "Fair";
    if (score >= 3) return "Poor";
    return "Very Poor";
  };

  if (!scanData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading scan result...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Scan Result
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header - Product Info */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl">{scanData.productLine.name}</CardTitle>
                  <CardDescription className="text-lg mt-1">
                    {scanData.brand.name} • {scanData.variant.name}
                  </CardDescription>
                  {scanData.productLine.description && (
                    <p className="text-sm text-muted-foreground mt-2">{scanData.productLine.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Heart className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share2 className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {scanData.productLine.target_species.map((species) => (
                  <Badge key={species} variant="secondary">{species}</Badge>
                ))}
                {scanData.productLine.life_stages.map((stage) => (
                  <Badge key={stage} variant="outline">{stage}</Badge>
                ))}
                {scanData.productLine.certifications.map((cert) => (
                  <Badge key={cert} variant="default">{cert}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Overall Rating */}
          {scanData.rating.overall_score && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Overall Rating
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${getScoreColor(scanData.rating.overall_score)}`}>
                      {scanData.rating.overall_score}/10
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {getScoreLabel(scanData.rating.overall_score)}
                    </div>
                  </div>
                  <div className="flex-1">
                    <Progress 
                      value={scanData.rating.overall_score * 10} 
                      className="h-3"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Scores */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scanData.rating.ingredient_quality_score && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Ingredient Quality</span>
                      <span className={`text-sm font-bold ${getScoreColor(scanData.rating.ingredient_quality_score)}`}>
                        {scanData.rating.ingredient_quality_score}/10
                      </span>
                    </div>
                    <Progress value={scanData.rating.ingredient_quality_score * 10} className="h-2" />
                  </div>
                )}
                {scanData.rating.nutritional_balance_score && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Nutritional Balance</span>
                      <span className={`text-sm font-bold ${getScoreColor(scanData.rating.nutritional_balance_score)}`}>
                        {scanData.rating.nutritional_balance_score}/10
                      </span>
                    </div>
                    <Progress value={scanData.rating.nutritional_balance_score * 10} className="h-2" />
                  </div>
                )}
                {scanData.rating.processing_score && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Processing Quality</span>
                      <span className={`text-sm font-bold ${getScoreColor(scanData.rating.processing_score)}`}>
                        {scanData.rating.processing_score}/10
                      </span>
                    </div>
                    <Progress value={scanData.rating.processing_score * 10} className="h-2" />
                  </div>
                )}
                {scanData.rating.sustainability_score && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Sustainability</span>
                      <span className={`text-sm font-bold ${getScoreColor(scanData.rating.sustainability_score)}`}>
                        {scanData.rating.sustainability_score}/10
                      </span>
                    </div>
                    <Progress value={scanData.rating.sustainability_score * 10} className="h-2" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ingredients */}
          <Card>
            <CardHeader>
              <CardTitle>Ingredients</CardTitle>
              <CardDescription>
                {scanData.ingredients.length} ingredients listed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scanData.ingredients.map((ingredient, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground">
                        #{ingredient.order}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{ingredient.name}</span>
                          {ingredient.is_toxic && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Toxic
                            </Badge>
                          )}
                          {ingredient.is_controversial && (
                            <Badge variant="outline" className="text-xs">
                              <Info className="h-3 w-3 mr-1" />
                              Controversial
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {ingredient.category}
                          {ingredient.percentage && ` • ${ingredient.percentage}%`}
                        </div>
                      </div>
                    </div>
                    {ingredient.health_risks.length > 0 && (
                      <div className="text-right">
                        <div className="text-xs text-red-600">
                          {ingredient.health_risks.slice(0, 2).join(", ")}
                          {ingredient.health_risks.length > 2 && "..."}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Nutrition Facts */}
          {scanData.nutrition.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Nutrition Facts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {scanData.nutrition.map((nutrient, index) => (
                    <div key={index} className="text-center p-3 border rounded-lg">
                      <div className="text-lg font-bold">{nutrient.value || 'N/A'}</div>
                      <div className="text-sm text-muted-foreground">
                        {nutrient.display_name}
                        {nutrient.unit && ` (${nutrient.unit})`}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Product Details */}
          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  {scanData.variant.sku && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">SKU:</span>
                      <span className="text-sm font-medium">{scanData.variant.sku}</span>
                    </div>
                  )}
                  {scanData.variant.base_weight && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Weight:</span>
                      <span className="text-sm font-medium">
                        {scanData.variant.base_weight} {scanData.variant.weight_unit}
                      </span>
                    </div>
                  )}
                  {scanData.variant.packaging_type && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Packaging:</span>
                      <span className="text-sm font-medium">{scanData.variant.packaging_type}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {scanData.options.map((option, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{option.option_display_name}:</span>
                      <span className="text-sm font-medium">
                        {option.option_display_value}
                        {option.numeric_value && ` (${option.numeric_value}${option.unit || ''})`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Where to Buy */}
          {scanData.sources.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Where to Buy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scanData.sources.map((source, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{source.retailer_name}</span>
                        <Badge variant={source.availability === 'in_stock' ? 'secondary' : 'outline'}>
                          {source.availability?.replace('_', ' ')}
                        </Badge>
                        {source.price && (
                          <span className="font-semibold text-primary">
                            ${source.price} {source.currency}
                          </span>
                        )}
                      </div>
                      {source.url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={source.url} target="_blank" rel="noopener noreferrer">
                            <ShoppingCart className="h-4 w-4 mr-1" />
                            Buy Now
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Safety Warnings */}
          {scanData.rating.safety_factors && Object.keys(scanData.rating.safety_factors).length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-5 w-5" />
                  Safety Warnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-red-700">
                  {/* This would display any safety flags or warnings */}
                  <p>Please review ingredient list for potential allergens or harmful substances.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

