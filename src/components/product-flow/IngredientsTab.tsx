import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Plus, X, AlertTriangle, Leaf, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { FormState } from "@/pages/ProductFlow";

interface IngredientsTabProps {
  formState: FormState;
  updateFormState: (updates: Partial<FormState>) => void;
  onComplete: () => void;
}

interface Variant {
  id: string;
  name: string;
}

interface Ingredient {
  id: string;
  name: string;
  is_toxic: boolean;
  is_controversial: boolean;
  tags: string[];
}

interface VariantIngredient {
  variantId: string;
  ingredientIds: string[];
}

export const IngredientsTab = ({ formState, updateFormState, onComplete }: IngredientsTabProps) => {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantIngredients, setVariantIngredients] = useState<VariantIngredient[]>([]);
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Ingredient[]>([]);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [bulkIngredients, setBulkIngredients] = useState("");

  useEffect(() => {
    loadVariants();
  }, [formState.variantIds]);

  useEffect(() => {
    const currentVariant = variants[selectedVariantIndex];
    if (currentVariant) {
      loadExistingIngredients(currentVariant.id);
    }
  }, [selectedVariantIndex, variants]);

  useEffect(() => {
    if (ingredientSearch.trim()) {
      searchIngredients();
    } else {
      setSearchResults([]);
    }
  }, [ingredientSearch]);

  const loadVariants = async () => {
    try {
      setIsLoadingData(true);
      if (formState.variantIds.length > 0) {
        const { data, error } = await supabase
          .from("product_variants")
          .select("id, name")
          .in("id", formState.variantIds);

        if (error) throw error;

        setVariants(data || []);
        setVariantIngredients(
          (data || []).map(variant => ({
            variantId: variant.id,
            ingredientIds: []
          }))
        );
      }
    } catch (error) {
      console.error("Error loading variants:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load variants."
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadExistingIngredients = async (variantId: string) => {
    try {
      const { data, error } = await supabase
        .from("product_variant_ingredients")
        .select("ingredient_id")
        .eq("product_variant_id", variantId);

      if (error) throw error;

      const existingIngredientIds = data?.map(pvi => pvi.ingredient_id) || [];
      
      setVariantIngredients(prev => prev.map(vi => 
        vi.variantId === variantId
          ? { ...vi, ingredientIds: existingIngredientIds }
          : vi
      ));
    } catch (error) {
      console.error("Error loading existing ingredients:", error);
    }
  };

  const searchIngredients = async () => {
    try {
      const { data, error } = await supabase
        .from("ingredients")
        .select("*")
        .ilike("name", `%${ingredientSearch}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error("Error searching ingredients:", error);
    }
  };

  const createNewIngredient = async () => {
    if (!ingredientSearch.trim()) return;

    try {
      const { data, error } = await supabase
        .from("ingredients")
        .insert({
          name: ingredientSearch.trim(),
          category: 'additive', // Default category - users can update later
          is_toxic: false,
          is_controversial: false,
          tags: []
        })
        .select()
        .single();

      if (error) throw error;

      setSearchResults(prev => [data, ...prev]);
      toast({
        title: "Success!",
        description: `Ingredient "${data.name}" created successfully.`
      });
    } catch (error) {
      console.error("Error creating ingredient:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create ingredient."
      });
    }
  };

  const addIngredientToVariant = (variantId: string, ingredientId: string) => {
    setVariantIngredients(prev => prev.map(vi => 
      vi.variantId === variantId
        ? { ...vi, ingredientIds: [...new Set([...vi.ingredientIds, ingredientId])] }
        : vi
    ));
    setIngredientSearch("");
    setSearchResults([]);
  };

  const removeIngredientFromVariant = async (variantId: string, ingredientId: string) => {
    try {
      // Remove from database if it exists
      await supabase
        .from("product_variant_ingredients")
        .delete()
        .eq("product_variant_id", variantId)
        .eq("ingredient_id", ingredientId);

      // Update local state
      setVariantIngredients(prev => prev.map(vi => 
        vi.variantId === variantId
          ? { ...vi, ingredientIds: vi.ingredientIds.filter(id => id !== ingredientId) }
          : vi
      ));

      toast({
        title: "Success!",
        description: "Ingredient removed successfully."
      });
    } catch (error) {
      console.error("Error removing ingredient:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove ingredient."
      });
    }
  };

  const processBulkIngredients = async () => {
    if (!bulkIngredients.trim() || !currentVariant) return;

    try {
      setIsLoading(true);
      const ingredientNames = bulkIngredients
        .split(',')
        .map(name => name.trim())
        .filter(name => name.length > 0);

      if (ingredientNames.length === 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please enter some ingredients separated by commas."
        });
        return;
      }

      // Check which ingredients already exist
      const { data: existingIngredients, error: searchError } = await supabase
        .from("ingredients")
        .select("id, name")
        .in("name", ingredientNames);

      if (searchError) throw searchError;

      const existingNames = new Set(existingIngredients?.map(ing => ing.name.toLowerCase()) || []);
      const newIngredientNames = ingredientNames.filter(name => 
        !existingNames.has(name.toLowerCase())
      );

      // Create new ingredients that don't exist
      let newIngredients: any[] = [];
      if (newIngredientNames.length > 0) {
        const { data: createdIngredients, error: createError } = await supabase
          .from("ingredients")
          .insert(
            newIngredientNames.map(name => ({
              name: name,
              category: 'additive', // Default category - users can update later
              is_toxic: false,
              is_controversial: false,
              tags: []
            }))
          )
          .select("id, name");

        if (createError) throw createError;
        newIngredients = createdIngredients || [];
      }

      // Combine existing and new ingredients
      const allIngredients = [...(existingIngredients || []), ...newIngredients];
      
      // Add all ingredients to current variant
      const newIngredientIds = allIngredients.map(ing => ing.id);
      setVariantIngredients(prev => prev.map(vi => 
        vi.variantId === currentVariant.id
          ? { ...vi, ingredientIds: [...new Set([...vi.ingredientIds, ...newIngredientIds])] }
          : vi
      ));

      setBulkIngredients("");
      
      toast({
        title: "Success!",
        description: `Added ${allIngredients.length} ingredients to ${currentVariant.name}. ${newIngredients.length} new ingredients were created.`
      });

    } catch (error) {
      console.error("Error processing bulk ingredients:", error);
      console.error("Bulk ingredients error details:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process bulk ingredients. Check console for details."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getIngredientById = async (id: string): Promise<Ingredient | null> => {
    try {
      const { data, error } = await supabase
        .from("ingredients")
        .select("*")
        .eq("id", id)
        .single();

      if (error) return null;
      return data;
    } catch (error) {
      return null;
    }
  };

  const [variantIngredientsDetails, setVariantIngredientsDetails] = useState<Record<string, Ingredient[]>>({});

  useEffect(() => {
    const loadIngredientDetails = async () => {
      const details: Record<string, Ingredient[]> = {};
      
      for (const vi of variantIngredients) {
        const ingredients: Ingredient[] = [];
        for (const ingredientId of vi.ingredientIds) {
          const ingredient = await getIngredientById(ingredientId);
          if (ingredient) ingredients.push(ingredient);
        }
        details[vi.variantId] = ingredients;
      }
      
      setVariantIngredientsDetails(details);
    };

    loadIngredientDetails();
  }, [variantIngredients]);

  const handleSubmit = async () => {
    setIsLoading(true);
    let insertData: any[] = [];
    
    try {
      variantIngredients.forEach(vi => {
        vi.ingredientIds.forEach((ingredientId, index) => {
          insertData.push({
            product_variant_id: vi.variantId,
            ingredient_id: ingredientId,
            ingredient_order: index + 1 // Required field for ingredient order
          });
        });
      });

      if (insertData.length === 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please add ingredients to at least one variant."
        });
        return;
      }

      const { error } = await supabase
        .from("product_variant_ingredients")
        .insert(insertData);

      if (error) throw error;

      toast({
        title: "Success!",
        description: `${insertData.length} ingredient assignment(s) created successfully.`
      });

      onComplete();
    } catch (error) {
      console.error("Error creating ingredient assignments:", error);
      console.error("Insert data that failed:", insertData);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create ingredient assignments. Check console for details."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = variantIngredients.some(vi => vi.ingredientIds.length > 0);

  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading variants...</p>
        </div>
      </div>
    );
  }

  const currentVariant = variants[selectedVariantIndex];
  const currentVariantIngredients = variantIngredientsDetails[currentVariant?.id] || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Ingredients</h2>
        <p className="text-muted-foreground">
          Map ingredients to each product variant for complete nutrition information.
        </p>
      </div>

      {variants.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            No variants available. Please complete the previous steps first.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Variant Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Variant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {variants.map((variant, index) => (
                <Button
                  key={variant.id}
                  variant={selectedVariantIndex === index ? "default" : "outline"}
                  className="w-full justify-start text-left overflow-hidden"
                  onClick={() => setSelectedVariantIndex(index)}
                  title={variant.name}
                >
                  <span className="truncate block w-full">
                    {variant.name}
                  </span>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Ingredient Search & Add */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Search className="h-5 w-5" />
                Add Ingredients
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="ingredient-search">Search Ingredients</Label>
                <Input
                  id="ingredient-search"
                  value={ingredientSearch}
                  onChange={(e) => setIngredientSearch(e.target.value)}
                  placeholder="Type ingredient name..."
                />
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Search Results</Label>
                  {searchResults.map(ingredient => (
                    <div
                      key={ingredient.id}
                      className="flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-muted/50"
                      onClick={() => addIngredientToVariant(currentVariant.id, ingredient.id)}
                    >
                      <div>
                        <span className="font-medium">{ingredient.name}</span>
                        <div className="flex gap-1 mt-1">
                          {ingredient.is_toxic && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Toxic
                            </Badge>
                          )}
                          {ingredient.is_controversial && (
                            <Badge variant="warning" className="text-xs">
                              Controversial
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Plus className="h-4 w-4" />
                    </div>
                  ))}
                </div>
              )}

              {ingredientSearch.trim() && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={createNewIngredient}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create "{ingredientSearch}"
                </Button>
              )}

              <div className="border-t pt-4">
                <Label htmlFor="bulk-ingredients">Bulk Add Ingredients</Label>
                <Textarea
                  id="bulk-ingredients"
                  value={bulkIngredients}
                  onChange={(e) => setBulkIngredients(e.target.value)}
                  placeholder="Paste comma-separated ingredients here (e.g., chicken, rice, carrots, peas)"
                  className="mt-1"
                  rows={4}
                />
                {bulkIngredients.trim() && (
                  <Button
                    variant="default"
                    className="w-full mt-2"
                    onClick={processBulkIngredients}
                    disabled={isLoading}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {isLoading ? "Processing..." : "Add All Ingredients"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Current Variant Ingredients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Leaf className="h-5 w-5" />
                {currentVariant?.name} Ingredients
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentVariantIngredients.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No ingredients added yet
                </p>
              ) : (
                <div className="space-y-2">
                  {currentVariantIngredients.map(ingredient => (
                    <div
                      key={ingredient.id}
                      className="flex items-center justify-between p-2 bg-muted/20 rounded"
                    >
                      <div>
                        <span className="font-medium">{ingredient.name}</span>
                        <div className="flex gap-1 mt-1">
                          {ingredient.is_toxic && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Toxic
                            </Badge>
                          )}
                          {ingredient.is_controversial && (
                            <Badge variant="warning" className="text-xs">
                              Controversial
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeIngredientFromVariant(currentVariant.id, ingredient.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!isValid || isLoading}
          variant="premium"
          size="lg"
        >
          {isLoading ? "Saving..." : "Continue to Sources"}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};