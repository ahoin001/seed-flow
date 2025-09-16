import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Star, Shield, Leaf, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { FormState } from "@/pages/ProductFlow";

interface ProductRatingTabProps {
  formState: FormState;
  updateFormState: (updates: Partial<FormState>) => void;
  onComplete: () => void;
}

interface RatingData {
  overall_score: number | null;
  ingredient_quality_score: number | null;
  nutritional_balance_score: number | null;
  processing_score: number | null;
  sustainability_score: number | null;
  safety_factors: any;
  species_specific_scores: any;
}

export const ProductRatingTab = ({ formState, updateFormState, onComplete }: ProductRatingTabProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [ratingData, setRatingData] = useState<RatingData>({
    overall_score: null,
    ingredient_quality_score: null,
    nutritional_balance_score: null,
    processing_score: null,
    sustainability_score: null,
    safety_factors: null,
    species_specific_scores: null
  });

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Create product rating
      const { error } = await supabase
        .from("product_ratings")
        .insert({
          product_line_id: formState.productLineId,
          overall_score: ratingData.overall_score,
          ingredient_quality_score: ratingData.ingredient_quality_score,
          nutritional_balance_score: ratingData.nutritional_balance_score,
          processing_score: ratingData.processing_score,
          sustainability_score: ratingData.sustainability_score,
          safety_factors: ratingData.safety_factors,
          species_specific_scores: ratingData.species_specific_scores
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Product data seed workflow completed successfully!"
      });

      onComplete();
    } catch (error) {
      console.error("Error creating product rating:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create product rating."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Product Rating</h2>
        <p className="text-muted-foreground">
          Set comprehensive quality and safety ratings for your product line.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Rating System Configuration
          </CardTitle>
          <CardDescription>
            Set comprehensive quality and safety ratings for your product line (scores are 0-10).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="overall-score">Overall Score</Label>
                <Input
                  id="overall-score"
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={ratingData.overall_score || ""}
                  onChange={(e) => setRatingData(prev => ({ 
                    ...prev, 
                    overall_score: e.target.value ? parseFloat(e.target.value) : null 
                  }))}
                  placeholder="8.5"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Comprehensive assessment of all quality factors
                </p>
              </div>

              <div>
                <Label htmlFor="ingredient-quality">Ingredient Quality Score</Label>
                <Input
                  id="ingredient-quality"
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={ratingData.ingredient_quality_score || ""}
                  onChange={(e) => setRatingData(prev => ({ 
                    ...prev, 
                    ingredient_quality_score: e.target.value ? parseFloat(e.target.value) : null 
                  }))}
                  placeholder="9.0"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Quality and sourcing of ingredients
                </p>
              </div>

              <div>
                <Label htmlFor="nutritional-balance">Nutritional Balance Score</Label>
                <Input
                  id="nutritional-balance"
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={ratingData.nutritional_balance_score || ""}
                  onChange={(e) => setRatingData(prev => ({ 
                    ...prev, 
                    nutritional_balance_score: e.target.value ? parseFloat(e.target.value) : null 
                  }))}
                  placeholder="8.0"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Nutritional completeness and balance
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="processing-score">Processing Score</Label>
                <Input
                  id="processing-score"
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={ratingData.processing_score || ""}
                  onChange={(e) => setRatingData(prev => ({ 
                    ...prev, 
                    processing_score: e.target.value ? parseFloat(e.target.value) : null 
                  }))}
                  placeholder="7.5"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Processing methods and quality control
                </p>
              </div>

              <div>
                <Label htmlFor="sustainability-score">Sustainability Score</Label>
                <Input
                  id="sustainability-score"
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={ratingData.sustainability_score || ""}
                  onChange={(e) => setRatingData(prev => ({ 
                    ...prev, 
                    sustainability_score: e.target.value ? parseFloat(e.target.value) : null 
                  }))}
                  placeholder="8.0"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Environmental impact and sustainability practices
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Safety Factors
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Award className="h-3 w-3" />
                  Species-Specific
                </Badge>
              </div>
            </div>
          </div>

          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Advanced safety factors and species-specific scores can be added through the database directly.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          variant="premium"
          size="lg"
        >
          {isLoading ? "Completing..." : "Complete Workflow"}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};