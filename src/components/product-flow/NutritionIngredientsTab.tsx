import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Leaf, Activity, Plus, X, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { FormState } from "@/pages/ProductFlow";

interface NutritionIngredientsTabProps {
  formState: FormState;
  updateFormState: (updates: Partial<FormState>) => void;
  onComplete: () => void;
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

interface VariantNutrition {
  variantId: string;
  nutritionalData: Record<string, number>;
}

export const NutritionIngredientsTab = ({ formState, updateFormState, onComplete }: NutritionIngredientsTabProps) => {
  const [isLoading, setIsLoading] = useState(false);
  
  // Ingredients state
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredIngredients, setFilteredIngredients] = useState<Ingredient[]>([]);
  
  // Nutrition state
  const [nutritionalAttributes, setNutritionalAttributes] = useState<NutritionalAttribute[]>([]);
  const [variantNutrition, setVariantNutrition] = useState<VariantNutrition[]>([]);

  useEffect(() => {
    fetchIngredients();
    fetchNutritionalAttributes();
    initializeVariantNutrition();
  }, [formState.generatedVariants]);

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
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load ingredients."
      });
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
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load nutritional attributes."
      });
    }
  };

  const initializeVariantNutrition = () => {
    if (!formState.generatedVariants) return;
    
    const nutrition = formState.generatedVariants.map(variant => ({
      variantId: variant.id,
      nutritionalData: {}
    }));
    
    setVariantNutrition(nutrition);
  };

  useEffect(() => {
    const filtered = availableIngredients.filter(ingredient =>
      ingredient.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredIngredients(filtered);
  }, [searchTerm, availableIngredients]);

  const addIngredient = (ingredient: Ingredient) => {
    if (!ingredients.includes(ingredient.name)) {
      setIngredients(prev => [...prev, ingredient.name]);
    }
  };

  const removeIngredient = (ingredientName: string) => {
    setIngredients(prev => prev.filter(name => name !== ingredientName));
  };

  const updateNutritionalValue = (variantId: string, attributeId: number, value: number) => {
    setVariantNutrition(prev => 
      prev.map(variant => 
        variant.variantId === variantId 
          ? {
              ...variant,
              nutritionalData: {
                ...variant.nutritionalData,
                [attributeId]: value
              }
            }
          : variant
      )
    );
  };

  const handleSubmit = async () => {
    if (ingredients.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please add at least one ingredient."
      });
      return;
    }

    setIsLoading(true);
    try {
      // Store ingredients and nutrition data
      updateFormState({
        ingredients: ingredients,
        variantNutrition: variantNutrition
      });

      toast({
        title: "Success!",
        description: "Ingredients and nutritional data saved successfully."
      });

      onComplete();
    } catch (error) {
      console.error("Error saving nutrition data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save nutrition data."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Nutrition & Ingredients</h2>
        <p className="text-muted-foreground">
          Add ingredients and nutritional information for your product variants
        </p>
      </div>

      {/* Ingredients Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="h-5 w-5" />
            Ingredients
          </CardTitle>
          <CardDescription>
            Add ingredients to your product. Search and select from the database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search ingredients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Available Ingredients */}
          <div className="max-h-60 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {filteredIngredients.map((ingredient) => (
                <Card 
                  key={ingredient.id} 
                  className={`cursor-pointer transition-all ${
                    ingredients.includes(ingredient.name) ? 'opacity-50' : 'hover:shadow-md'
                  }`}
                  onClick={() => addIngredient(ingredient)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{ingredient.name}</h4>
                        {ingredient.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {ingredient.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {ingredient.is_toxic && (
                          <Badge variant="destructive" className="text-xs">Toxic</Badge>
                        )}
                        {ingredient.is_controversial && (
                          <Badge variant="secondary" className="text-xs">Controversial</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Selected Ingredients */}
          {ingredients.length > 0 && (
            <div>
              <Label>Selected Ingredients</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {ingredients.map((ingredient) => (
                  <Badge
                    key={ingredient}
                    variant="default"
                    className="cursor-pointer"
                    onClick={() => removeIngredient(ingredient)}
                  >
                    {ingredient}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nutritional Information Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Nutritional Information
          </CardTitle>
          <CardDescription>
            Add nutritional values for each product variant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {formState.generatedVariants?.map((variant) => (
            <Card key={variant.id}>
              <CardHeader>
                <CardTitle className="text-lg">{variant.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {nutritionalAttributes.map((attribute) => (
                    <div key={attribute.id}>
                      <Label htmlFor={`${variant.id}-${attribute.id}`}>
                        {attribute.display_name}
                        {attribute.unit && ` (${attribute.unit})`}
                      </Label>
                      <Input
                        id={`${variant.id}-${attribute.id}`}
                        type="number"
                        step="0.1"
                        value={variantNutrition.find(v => v.variantId === variant.id)?.nutritionalData[attribute.id] || ''}
                        onChange={(e) => updateNutritionalValue(variant.id, attribute.id, parseFloat(e.target.value) || 0)}
                        placeholder="0.0"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit} 
          disabled={isLoading || ingredients.length === 0}
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
