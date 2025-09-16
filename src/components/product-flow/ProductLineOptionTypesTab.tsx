import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowRight, Plus, Trash2, Settings, Check, Edit, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { FormState } from "@/pages/ProductFlow";

interface ProductLineOptionTypesTabProps {
  formState: FormState;
  updateFormState: (updates: Partial<FormState>) => void;
  onComplete: () => void;
}

interface VariantOptionType {
  id: string;
  name: string;
  display_name: string;
  data_type: string;
  unit: string | null;
  validation_rules: any;
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
}

interface VariantOptionValue {
  id: string;
  value: string;
  display_value: string;
  numeric_value: number | null;
  sort_order: number;
}

interface ProductLineOptionType {
  option_type_id: string;
  is_required: boolean;
  sort_order: number;
  option_type: VariantOptionType;
  option_values: VariantOptionValue[];
}

interface NewOptionValue {
  value: string;
  display_value: string;
  numeric_value: number | null;
}

export const ProductLineOptionTypesTab = ({ formState, updateFormState, onComplete }: ProductLineOptionTypesTabProps) => {
  const [availableOptionTypes, setAvailableOptionTypes] = useState<VariantOptionType[]>([]);
  const [selectedOptionTypes, setSelectedOptionTypes] = useState<ProductLineOptionType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // State for managing new option values
  const [newValueDialogOpen, setNewValueDialogOpen] = useState(false);
  const [editingOptionType, setEditingOptionType] = useState<VariantOptionType | null>(null);
  const [newOptionValue, setNewOptionValue] = useState<NewOptionValue>({
    value: "",
    display_value: "",
    numeric_value: null
  });

  useEffect(() => {
    fetchAvailableOptionTypes();
    if (formState.productLineId) {
      fetchProductLineOptionTypes();
    }
  }, [formState.productLineId]);

  const fetchAvailableOptionTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("variant_option_types")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      setAvailableOptionTypes(data || []);
    } catch (error) {
      console.error("Error fetching available option types:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch available option types."
      });
    }
  };

  const fetchProductLineOptionTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("product_line_option_types")
        .select(`
          option_type_id,
          is_required,
          sort_order,
          variant_option_types (*)
        `)
        .eq("product_line_id", formState.productLineId)
        .order("sort_order");

      if (error) throw error;

      const optionTypes = data?.map(item => ({
        option_type_id: item.option_type_id,
        is_required: item.is_required,
        sort_order: item.sort_order,
        option_type: item.variant_option_types,
        option_values: [] // Will be populated below
      })) || [];

      // Fetch option values for each selected option type
      for (const optionType of optionTypes) {
        const { data: valuesData, error: valuesError } = await supabase
          .from("variant_option_values")
          .select("*")
          .eq("option_type_id", optionType.option_type_id)
          .eq("is_active", true)
          .order("sort_order");

        if (!valuesError && valuesData) {
          optionType.option_values = valuesData;
        }
      }

      setSelectedOptionTypes(optionTypes);
    } catch (error) {
      console.error("Error fetching product line option types:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch product line option types."
      });
    }
  };

  const toggleOptionType = async (optionType: VariantOptionType) => {
    const isSelected = selectedOptionTypes.some(st => st.option_type_id === optionType.id);
    
    if (isSelected) {
      setSelectedOptionTypes(prev => prev.filter(st => st.option_type_id !== optionType.id));
    } else {
      // Fetch existing option values for this type
      const { data: valuesData, error: valuesError } = await supabase
        .from("variant_option_values")
        .select("*")
        .eq("option_type_id", optionType.id)
        .eq("is_active", true)
        .order("sort_order");

      const optionValues = valuesError ? [] : (valuesData || []);

      const newOptionType: ProductLineOptionType = {
        option_type_id: optionType.id,
        is_required: false,
        sort_order: selectedOptionTypes.length,
        option_type: optionType,
        option_values: optionValues
      };
      setSelectedOptionTypes(prev => [...prev, newOptionType]);
    }
  };

  const updateOptionTypeSettings = (optionTypeId: string, field: keyof ProductLineOptionType, value: any) => {
    setSelectedOptionTypes(prev => prev.map(st => 
      st.option_type_id === optionTypeId 
        ? { ...st, [field]: value }
        : st
    ));
  };

  const moveOptionType = (optionTypeId: string, direction: 'up' | 'down') => {
    setSelectedOptionTypes(prev => {
      const index = prev.findIndex(st => st.option_type_id === optionTypeId);
      if (index === -1) return prev;

      const newOrder = [...prev];
      if (direction === 'up' && index > 0) {
        [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      } else if (direction === 'down' && index < newOrder.length - 1) {
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      }

      return newOrder.map((st, i) => ({ ...st, sort_order: i }));
    });
  };

  const openNewValueDialog = (optionType: VariantOptionType) => {
    setEditingOptionType(optionType);
    setNewOptionValue({
      value: "",
      display_value: "",
      numeric_value: optionType.data_type === 'numeric' ? 0 : null
    });
    setNewValueDialogOpen(true);
  };

  const addNewOptionValue = async () => {
    if (!editingOptionType || !newOptionValue.value.trim()) return;

    try {
      const { data, error } = await supabase
        .from("variant_option_values")
        .insert({
          option_type_id: editingOptionType.id,
          value: newOptionValue.value.trim(),
          display_value: newOptionValue.display_value.trim() || newOptionValue.value.trim(),
          numeric_value: newOptionValue.numeric_value,
          sort_order: 999 // Will be reordered later
        })
        .select()
        .single();

      if (error) throw error;

      // Update the selected option types with the new value
      setSelectedOptionTypes(prev => prev.map(st => 
        st.option_type_id === editingOptionType.id
          ? { ...st, option_values: [...st.option_values, data] }
          : st
      ));

      setNewValueDialogOpen(false);
      setEditingOptionType(null);
      setNewOptionValue({ value: "", display_value: "", numeric_value: null });

      toast({
        title: "Success!",
        description: `Added new ${editingOptionType.display_name} value: ${data.display_value}`
      });
    } catch (error) {
      console.error("Error adding new option value:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add new option value."
      });
    }
  };

  const removeOptionValue = async (optionValueId: string, optionTypeId: string) => {
    try {
      const { error } = await supabase
        .from("variant_option_values")
        .update({ is_active: false })
        .eq("id", optionValueId);

      if (error) throw error;

      // Update the selected option types to remove the value
      setSelectedOptionTypes(prev => prev.map(st => 
        st.option_type_id === optionTypeId
          ? { ...st, option_values: st.option_values.filter(ov => ov.id !== optionValueId) }
          : st
      ));

      toast({
        title: "Success!",
        description: "Option value removed successfully."
      });
    } catch (error) {
      console.error("Error removing option value:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove option value."
      });
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      if (!formState.productLineId) {
        throw new Error("Product line ID is required");
      }

      // Delete existing product line option types
      const { error: deleteError } = await supabase
        .from("product_line_option_types")
        .delete()
        .eq("product_line_id", formState.productLineId);

      if (deleteError) throw deleteError;

      // Insert new product line option types
      if (selectedOptionTypes.length > 0) {
        const inserts = selectedOptionTypes.map(st => ({
          product_line_id: formState.productLineId,
          option_type_id: st.option_type_id,
          is_required: st.is_required,
          sort_order: st.sort_order
        }));

        const { error: insertError } = await supabase
          .from("product_line_option_types")
          .insert(inserts);

        if (insertError) throw insertError;
      }

      toast({
        title: "Success!",
        description: "Product line option types configured successfully."
      });

      onComplete();
    } catch (error) {
      console.error("Error configuring product line option types:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to configure option types: ${error.message || 'Unknown error'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = selectedOptionTypes.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Configure Variant Options</h2>
        <p className="text-muted-foreground">
          Select which option types this product line will support (e.g., Size, Flavor, Life Stage)
        </p>
      </div>

      {/* Available Option Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Available Option Types
          </CardTitle>
          <CardDescription>
            Select the option types you want to use for this product line
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableOptionTypes.map((optionType) => {
              const isSelected = selectedOptionTypes.some(st => st.option_type_id === optionType.id);
              
              return (
                <div 
                  key={optionType.id} 
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => toggleOptionType(optionType)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => {}} // Handled by parent div click
                        />
                        <Label className="text-sm font-medium cursor-pointer">
                          {optionType.display_name}
                        </Label>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Type: {optionType.data_type}</div>
                        {optionType.unit && <div>Unit: {optionType.unit}</div>}
                        {optionType.is_required && (
                          <Badge variant="secondary" className="text-xs">Required</Badge>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Option Types Configuration */}
      {selectedOptionTypes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Configure Selected Options & Values</CardTitle>
            <CardDescription>
              Set requirements, order, and manage option values for each selected option type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {selectedOptionTypes.map((selectedOptionType, index) => (
                <div key={selectedOptionType.option_type_id} className="border rounded-lg p-4">
                  {/* Option Type Header */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveOptionType(selectedOptionType.option_type_id, 'up')}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveOptionType(selectedOptionType.option_type_id, 'down')}
                        disabled={index === selectedOptionTypes.length - 1}
                      >
                        ↓
                      </Button>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Label className="text-lg font-medium">
                          {selectedOptionType.option_type.display_name}
                        </Label>
                        <Badge variant="outline" className="text-xs">
                          {selectedOptionType.option_type.data_type}
                        </Badge>
                        {selectedOptionType.option_type.unit && (
                          <Badge variant="outline" className="text-xs">
                            {selectedOptionType.option_type.unit}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`required-${selectedOptionType.option_type_id}`}
                        checked={selectedOptionType.is_required}
                        onCheckedChange={(checked) => 
                          updateOptionTypeSettings(selectedOptionType.option_type_id, 'is_required', checked === true)
                        }
                      />
                      <Label htmlFor={`required-${selectedOptionType.option_type_id}`} className="text-sm">
                        Required
                      </Label>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleOptionType(selectedOptionType.option_type)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Option Values Section */}
                  <div className="ml-8 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-muted-foreground">
                        Available Values ({selectedOptionType.option_values.length})
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openNewValueDialog(selectedOptionType.option_type)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Value
                      </Button>
                    </div>

                    {selectedOptionType.option_values.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {selectedOptionType.option_values.map((optionValue) => (
                          <div key={optionValue.id} className="flex items-center justify-between p-2 bg-muted/50 rounded border">
                            <div className="flex-1">
                              <div className="text-sm font-medium">{optionValue.display_value}</div>
                              {optionValue.numeric_value && (
                                <div className="text-xs text-muted-foreground">
                                  {optionValue.numeric_value}{selectedOptionType.option_type.unit || ''}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeOptionValue(optionValue.id, selectedOptionType.option_type_id)}
                              className="text-destructive hover:text-destructive h-6 w-6 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        No values configured yet. Click "Add Value" to get started.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add New Option Value Dialog */}
      <Dialog open={newValueDialogOpen} onOpenChange={setNewValueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New {editingOptionType?.display_name} Value</DialogTitle>
            <DialogDescription>
              Create a new option value for {editingOptionType?.display_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-value">Value *</Label>
              <Input
                id="new-value"
                value={newOptionValue.value}
                onChange={(e) => setNewOptionValue(prev => ({ ...prev, value: e.target.value }))}
                placeholder="e.g., 20lb, Duck, Senior"
              />
            </div>
            
            <div>
              <Label htmlFor="new-display-value">Display Value</Label>
              <Input
                id="new-display-value"
                value={newOptionValue.display_value}
                onChange={(e) => setNewOptionValue(prev => ({ ...prev, display_value: e.target.value }))}
                placeholder="e.g., 20 lb, Duck Flavor, Senior Formula"
              />
              <p className="text-xs text-muted-foreground mt-1">
                How this value will be displayed to users (optional)
              </p>
            </div>

            {editingOptionType?.data_type === 'numeric' && (
              <div>
                <Label htmlFor="new-numeric-value">Numeric Value</Label>
                <Input
                  id="new-numeric-value"
                  type="number"
                  value={newOptionValue.numeric_value || ""}
                  onChange={(e) => setNewOptionValue(prev => ({ 
                    ...prev, 
                    numeric_value: e.target.value ? parseFloat(e.target.value) : null 
                  }))}
                  placeholder="20"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Numeric value for sorting and calculations ({editingOptionType.unit})
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewValueDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={addNewOptionValue}
              disabled={!newOptionValue.value.trim()}
            >
              Add Value
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Actions */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!isValid || isLoading}
          variant="premium"
          size="lg"
        >
          {isLoading ? "Saving..." : "Continue to Variants"}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};
