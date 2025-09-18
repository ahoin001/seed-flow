import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowRight, Tag, Leaf } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { FormState } from "@/pages/ProductFlow";

interface CategoriesTabProps {
  formState: FormState;
  updateFormState: (updates: Partial<FormState>) => void;
  onComplete: () => void;
}

export const CategoriesTab = ({ formState, updateFormState, onComplete }: CategoriesTabProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);

  useEffect(() => {
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

    fetchCategories();
  }, []);

  const handleCategoryToggle = (categoryId: number) => {
    setSelectedCategories(prev => {
      const newSelection = prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId];
      
      updateFormState({ categoryIds: newSelection });
      return newSelection;
    });
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
      // Create product line category associations
      const categoryInserts = selectedCategories.map((categoryId, index) => ({
        product_model_id: formState.productLineId,
        category_id: categoryId,
        is_primary: index === 0 // First category is primary
      }));

      const { error } = await supabase
        .from("product_model_categories")
        .insert(categoryInserts);

      if (error) throw error;

      toast({
        title: "Success!",
        description: `${selectedCategories.length} categories assigned successfully.`
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
        <h2 className="text-2xl font-bold mb-2">Product Categories</h2>
        <p className="text-muted-foreground">
          Assign your product line to relevant categories for better organization and discoverability.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Available Categories
          </CardTitle>
          <CardDescription>
            Select categories that best describe your product line
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableCategories.map((category) => (
              <div
                key={category.id}
                className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50"
              >
                <Checkbox
                  id={category.id}
                  checked={selectedCategories.includes(category.id)}
                  onCheckedChange={() => handleCategoryToggle(category.id)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label htmlFor={category.id} className="font-medium cursor-pointer">
                    {category.name}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {category.description}
                  </p>
                  {category.target_species && category.target_species.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {category.target_species.map(species => (
                        <span 
                          key={species}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary"
                        >
                          <Leaf className="h-3 w-3 mr-1" />
                          {species.charAt(0).toUpperCase() + species.slice(1)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {selectedCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Selected Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              {selectedCategories.length} categories selected
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedCategories.map((categoryId, index) => {
                const category = availableCategories.find(c => c.id === categoryId);
                return category ? (
                  <span 
                    key={categoryId}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/20 text-primary"
                  >
                    {index === 0 && "⭐ "}
                    {category.name}
                    {index === 0 && " (Primary)"}
                  </span>
                ) : null;
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={selectedCategories.length === 0 || isLoading}
          variant="premium"
          size="lg"
        >
          {isLoading ? "Assigning..." : "Continue to Identifiers"}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};