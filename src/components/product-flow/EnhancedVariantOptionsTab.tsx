import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Plus, Trash2, Settings, Check, Edit, X, Save, AlertTriangle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { FormState } from "@/pages/ProductFlow";

interface EnhancedVariantOptionsTabProps {
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
  description?: string;
}

interface VariantOptionValue {
  id: string;
  value: string;
  display_value: string;
  numeric_value: number | null;
  sort_order: number;
  is_active: boolean;
}

interface ProductLineOptionType {
  option_type_id: string;
  is_required: boolean;
  sort_order: number;
  option_type: VariantOptionType;
  option_values: VariantOptionValue[];
}

interface NewOptionType {
  name: string;
  display_name: string;
  data_type: string;
  description: string;
  validation_rules: any;
}

interface NewOptionValue {
  value: string;
  display_value: string;
  numeric_value: number | null;
  unit_id: string | null;
}

interface UnitCategory {
  id: string;
  name: string;
  description: string;
  base_unit: string;
}

interface Unit {
  id: string;
  name: string;
  display_name: string;
  abbreviation: string;
  unit_category_id: string;
  conversion_factor: number;
  is_base_unit: boolean;
}

export const EnhancedVariantOptionsTab = ({ formState, updateFormState, onComplete }: EnhancedVariantOptionsTabProps) => {
  const [availableOptionTypes, setAvailableOptionTypes] = useState<VariantOptionType[]>([]);
  const [selectedOptionTypes, setSelectedOptionTypes] = useState<ProductLineOptionType[]>([]);
  const [unitCategories, setUnitCategories] = useState<UnitCategory[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Dialog states
  const [newOptionTypeDialogOpen, setNewOptionTypeDialogOpen] = useState(false);
  const [newValueDialogOpen, setNewValueDialogOpen] = useState(false);
  const [newUnitCategoryDialogOpen, setNewUnitCategoryDialogOpen] = useState(false);
  const [newUnitDialogOpen, setNewUnitDialogOpen] = useState(false);
  
  // Editing states
  const [editingOptionType, setEditingOptionType] = useState<VariantOptionType | null>(null);
  const [editingUnitCategory, setEditingUnitCategory] = useState<UnitCategory | null>(null);
  
  // Form states
  const [newOptionType, setNewOptionType] = useState<NewOptionType>({
    name: "",
    display_name: "",
    data_type: "text",
    description: "",
    validation_rules: {}
  });
  
  const [newOptionValue, setNewOptionValue] = useState<NewOptionValue>({
    value: "",
    display_value: "",
    numeric_value: null,
    unit_id: null
  });
  
  const [newUnitCategory, setNewUnitCategory] = useState({
    name: "",
    description: "",
    base_unit: ""
  });
  
  const [newUnit, setNewUnit] = useState({
    name: "",
    symbol: "",
    category_id: "",
    conversion_factor: 1,
    is_base_unit: false
  });
  
  // Confirmation dialog states
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'option_value' | 'option_type';
    id: string;
    name: string;
    optionTypeId?: string;
  } | null>(null);

  useEffect(() => {
    fetchAvailableOptionTypes();
    fetchUnitCategories();
    fetchUnits();
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

  const fetchUnitCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("unit_categories")
        .select("*")
        .order("name");

      if (error) throw error;
      setUnitCategories(data || []);
    } catch (error) {
      console.error("Error fetching unit categories:", error);
    }
  };

  const fetchUnits = async () => {
    try {
      const { data, error } = await supabase
        .from("units")
        .select("*")
        .order("name");

      if (error) throw error;
      setUnits(data || []);
    } catch (error) {
      console.error("Error fetching units:", error);
    }
  };

  const createNewOptionType = async () => {
    if (!newOptionType.name.trim() || !newOptionType.display_name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Name and display name are required."
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("variant_option_types")
        .insert({
          name: newOptionType.name.trim(),
          display_name: newOptionType.display_name.trim(),
          data_type: newOptionType.data_type,
          description: newOptionType.description.trim(),
          validation_rules: newOptionType.validation_rules,
          is_required: false,
          sort_order: 999,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setAvailableOptionTypes(prev => [...prev, data]);
      setNewOptionTypeDialogOpen(false);
      setNewOptionType({
        name: "",
        display_name: "",
        data_type: "text",
        description: "",
        validation_rules: {}
      });

      toast({
        title: "Success!",
        description: `Created new option type: ${data.display_name}`
      });
    } catch (error) {
      console.error("Error creating new option type:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create new option type."
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

    // Check for mixed units warning
    const existingValues = selectedOptionTypes
      .find(st => st.option_type_id === editingOptionType.id)
      ?.option_values || [];
    
    const hasExistingUnits = existingValues.some(v => v.unit_id);
    const newValueHasUnit = newOptionValue.unit_id;
    
    if (hasExistingUnits && !newValueHasUnit) {
      toast({
        variant: "destructive",
        title: "Unit Required",
        description: "This option type already has values with units. Please select a unit for consistency."
      });
      return;
    }

    // Show warning for mixed units but allow it
    if (hasExistingUnits && newValueHasUnit) {
      const existingUnitCategories = existingValues
        .filter(v => v.unit_id)
        .map(v => {
          const unit = units.find(u => u.id === v.unit_id);
          return unit ? unit_categories.find(uc => uc.id === unit.unit_category_id)?.name : null;
        })
        .filter(Boolean);
      
      const newUnitCategory = units.find(u => u.id === newOptionValue.unit_id);
      const newCategoryName = unit_categories.find(uc => uc.id === newUnitCategory?.unit_category_id)?.name;
      
      if (existingUnitCategories.length > 0 && !existingUnitCategories.includes(newCategoryName)) {
        toast({
          title: "Mixed Units Warning",
          description: `This option type will now have mixed unit categories: ${existingUnitCategories.join(', ')} and ${newCategoryName}. This is allowed but may cause confusion.`,
          variant: "default"
        });
      }
    }

    try {
      const { data, error } = await supabase
        .from("variant_option_values")
        .insert({
          option_type_id: editingOptionType.id,
          value: newOptionValue.value.trim(),
          display_value: newOptionValue.display_value.trim() || newOptionValue.value.trim(),
          numeric_value: newOptionValue.numeric_value,
          unit_id: newOptionValue.unit_id,
          sort_order: 999,
          is_active: true
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
      setNewOptionValue({ value: "", display_value: "", numeric_value: null, unit_id: null });

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

  const requestDeleteOptionValue = (optionValueId: string, optionTypeId: string, valueName: string) => {
    setItemToDelete({
      type: 'option_value',
      id: optionValueId,
      name: valueName,
      optionTypeId: optionTypeId
    });
    setDeleteConfirmationOpen(true);
  };

  const confirmDeleteOptionValue = async () => {
    if (!itemToDelete || itemToDelete.type !== 'option_value') return;

    try {
      const { error } = await supabase
        .from("variant_option_values")
        .update({ is_active: false })
        .eq("id", itemToDelete.id);

      if (error) throw error;

      // Update the selected option types to remove the value
      setSelectedOptionTypes(prev => prev.map(st => 
        st.option_type_id === itemToDelete.optionTypeId
          ? { ...st, option_values: st.option_values.filter(ov => ov.id !== itemToDelete.id) }
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
    } finally {
      setDeleteConfirmationOpen(false);
      setItemToDelete(null);
    }
  };

  const addNewUnitCategory = async () => {
    if (!newUnitCategory.name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unit category name is required."
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("unit_categories")
        .insert({
          name: newUnitCategory.name.trim(),
          description: newUnitCategory.description.trim(),
          base_unit: newUnitCategory.base_unit.trim()
        })
        .select()
        .single();

      if (error) throw error;

      setUnitCategories(prev => [...prev, data]);
      setNewUnitCategoryDialogOpen(false);
      setNewUnitCategory({ name: "", description: "", base_unit: "" });

      toast({
        title: "Success!",
        description: `Created new unit category: ${data.name}`
      });
    } catch (error) {
      console.error("Error creating unit category:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create unit category."
      });
    }
  };

  const addNewUnit = async () => {
    if (!newUnit.name.trim() || !newUnit.symbol.trim() || !newUnit.category_id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Name, symbol, and category are required."
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("units")
        .insert({
          name: newUnit.name.trim(),
          symbol: newUnit.symbol.trim(),
          category_id: newUnit.category_id,
          conversion_factor: newUnit.conversion_factor,
          is_base_unit: newUnit.is_base_unit
        })
        .select()
        .single();

      if (error) throw error;

      setUnits(prev => [...prev, data]);
      setNewUnitDialogOpen(false);
      setNewUnit({
        name: "",
        symbol: "",
        category_id: "",
        conversion_factor: 1,
        is_base_unit: false
      });

      toast({
        title: "Success!",
        description: `Created new unit: ${data.name} (${data.symbol})`
      });
    } catch (error) {
      console.error("Error creating unit:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create unit."
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
          Select and configure option types for this product line. Create new options if needed, and manage their values with flexible unit support.
        </p>
      </div>

      {/* Available Option Types */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Available Option Types
              </CardTitle>
              <CardDescription>
                Select existing option types or create new ones for this product line
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => setNewOptionTypeDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Option Type
            </Button>
          </div>
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
                        {optionType.description && (
                          <div className="text-xs">{optionType.description}</div>
                        )}
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
                      {selectedOptionType.option_type.description && (
                        <p className="text-sm text-muted-foreground">
                          {selectedOptionType.option_type.description}
                        </p>
                      )}
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
                              onClick={() => requestDeleteOptionValue(
                                optionValue.id, 
                                selectedOptionType.option_type_id, 
                                optionValue.display_value
                              )}
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

      {/* Quick Reference Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            How This Works
          </CardTitle>
          <CardDescription>
            Flexible option system for pet food products
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="font-medium text-blue-900 dark:text-blue-100">💡 Example: Size Options</div>
              <div className="text-blue-700 dark:text-blue-300 mt-1">
                • <strong>Product A:</strong> "Size" → "5lb", "10lb", "15lb" (weight units)<br/>
                • <strong>Product B:</strong> "Size" → "10 Count", "15 Count", "28 Count" (count units)<br/>
                • <strong>Same option type</strong>, different units per product!
              </div>
            </div>
            
            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="font-medium text-green-900 dark:text-green-100">✅ Your Workflow</div>
              <div className="text-green-700 dark:text-green-300 mt-1">
                1. Select or create option types (Size, Flavor, etc.)<br/>
                2. Add values with flexible units (5lb, Chicken, etc.)<br/>
                3. Each product can use different units for the same option!
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create New Option Type Dialog */}
      <Dialog open={newOptionTypeDialogOpen} onOpenChange={setNewOptionTypeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Option Type</DialogTitle>
            <DialogDescription>
              Create a new option type for product variants
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="option-name">Name *</Label>
              <Input
                id="option-name"
                value={newOptionType.name}
                onChange={(e) => setNewOptionType(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., size, flavor, life_stage"
              />
            </div>
            
            <div>
              <Label htmlFor="option-display-name">Display Name *</Label>
              <Input
                id="option-display-name"
                value={newOptionType.display_name}
                onChange={(e) => setNewOptionType(prev => ({ ...prev, display_name: e.target.value }))}
                placeholder="e.g., Size, Flavor, Life Stage"
              />
            </div>

            <div>
              <Label htmlFor="option-data-type">Data Type</Label>
              <Select
                value={newOptionType.data_type}
                onValueChange={(value) => setNewOptionType(prev => ({ ...prev, data_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="numeric">Numeric</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="enum">Enumeration</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Removed unit selection from option type - units are flexible per value */}
            
            <div>
              <Label htmlFor="option-description">Description</Label>
              <Textarea
                id="option-description"
                value={newOptionType.description}
                onChange={(e) => setNewOptionType(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description of this option type"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOptionTypeDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={createNewOptionType}
              disabled={!newOptionType.name.trim() || !newOptionType.display_name.trim()}
            >
              Create Option Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Option Value Dialog */}
      <Dialog open={newValueDialogOpen} onOpenChange={setNewValueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New {editingOptionType?.display_name} Value</DialogTitle>
            <DialogDescription>
              Create a new option value for {editingOptionType?.display_name}. 
              You can use the same option type (like "Size") with different units for different products.
            </DialogDescription>
          </DialogHeader>

          {/* Example Section */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Example: Size Options</h4>
            <div className="text-xs text-blue-800 space-y-1">
              <p><strong>Product A (Dog Food):</strong> Size with weight units</p>
              <p>• Value: "5lb" • Unit: Pound (lb) • Display: "5 lb"</p>
              <p>• Value: "10lb" • Unit: Pound (lb) • Display: "10 lb"</p>
              <br/>
              <p><strong>Product B (Dog Treats):</strong> Size with count units</p>
              <p>• Value: "10 Count" • Unit: Piece (pc) • Display: "10 Count"</p>
              <p>• Value: "15 Count" • Unit: Piece (pc) • Display: "15 Count"</p>
            </div>
          </div>
          
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
                  Numeric value for sorting and calculations
                </p>
              </div>
            )}

            {/* Unit Selection */}
            <div>
              <Label htmlFor="unit-selection">Unit (Optional)</Label>
              <Select 
                value={newOptionValue.unit_id || "none"} 
                onValueChange={(value) => setNewOptionValue(prev => ({ ...prev, unit_id: value === "none" ? null : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a unit (e.g., lb, oz, count)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No unit</SelectItem>
                  {unitCategories.map(category => (
                    <div key={category.id}>
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted">
                        {category.name} ({category.base_unit})
                      </div>
                      {units
                        .filter(unit => unit.unit_category_id === category.id)
                        .map(unit => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.display_name} ({unit.abbreviation})
                          </SelectItem>
                        ))
                      }
                    </div>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Choose the unit for this value. This helps distinguish between different types of sizes (weight vs. count).
              </p>
            </div>

            {/* Preview */}
            {newOptionValue.value && (
              <div className="p-3 bg-muted rounded-lg">
                <Label className="text-sm font-medium">Preview:</Label>
                <div className="text-sm text-muted-foreground mt-1 space-y-1">
                  <div><strong>Raw Value:</strong> {newOptionValue.value}</div>
                  <div><strong>Display Value:</strong> {newOptionValue.display_value || newOptionValue.value}</div>
                  {newOptionValue.unit_id && (
                    <div><strong>Unit:</strong> {units.find(u => u.id === newOptionValue.unit_id)?.display_name} ({units.find(u => u.id === newOptionValue.unit_id)?.abbreviation})</div>
                  )}
                  <div className="pt-2 border-t border-muted-foreground/20">
                    <strong>Final Display:</strong> 
                    <span className="ml-2 px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                      {newOptionValue.display_value || newOptionValue.value}
                      {newOptionValue.unit_id && ` (${units.find(u => u.id === newOptionValue.unit_id)?.abbreviation})`}
                    </span>
                  </div>
                </div>
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

      {/* Add New Unit Category Dialog */}
      <Dialog open={newUnitCategoryDialogOpen} onOpenChange={setNewUnitCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Unit Category</DialogTitle>
            <DialogDescription>
              Create a new unit category for organizing related units
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="category-name">Category Name *</Label>
              <Input
                id="category-name"
                value={newUnitCategory.name}
                onChange={(e) => setNewUnitCategory(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Weight, Volume, Length"
              />
            </div>
            
            <div>
              <Label htmlFor="category-description">Description</Label>
              <Textarea
                id="category-description"
                value={newUnitCategory.description}
                onChange={(e) => setNewUnitCategory(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description of this unit category"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="base-unit">Base Unit</Label>
              <Input
                id="base-unit"
                value={newUnitCategory.base_unit}
                onChange={(e) => setNewUnitCategory(prev => ({ ...prev, base_unit: e.target.value }))}
                placeholder="e.g., gram, liter, meter"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewUnitCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={addNewUnitCategory}
              disabled={!newUnitCategory.name.trim()}
            >
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Unit Dialog */}
      <Dialog open={newUnitDialogOpen} onOpenChange={setNewUnitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Unit</DialogTitle>
            <DialogDescription>
              Create a new unit within a category
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="unit-name">Unit Name *</Label>
              <Input
                id="unit-name"
                value={newUnit.name}
                onChange={(e) => setNewUnit(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Pound, Kilogram, Ounce"
              />
            </div>
            
            <div>
              <Label htmlFor="unit-symbol">Symbol *</Label>
              <Input
                id="unit-symbol"
                value={newUnit.symbol}
                onChange={(e) => setNewUnit(prev => ({ ...prev, symbol: e.target.value }))}
                placeholder="e.g., lb, kg, oz"
              />
            </div>

            <div>
              <Label htmlFor="unit-category">Category *</Label>
              <Select
                value={newUnit.category_id}
                onValueChange={(value) => setNewUnit(prev => ({ ...prev, category_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {unitCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="conversion-factor">Conversion Factor</Label>
              <Input
                id="conversion-factor"
                type="number"
                step="0.001"
                value={newUnit.conversion_factor}
                onChange={(e) => setNewUnit(prev => ({ 
                  ...prev, 
                  conversion_factor: parseFloat(e.target.value) || 1 
                }))}
                placeholder="1.0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Factor to convert to base unit (e.g., 1 lb = 453.592 g)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-base-unit"
                checked={newUnit.is_base_unit}
                onCheckedChange={(checked) => setNewUnit(prev => ({ ...prev, is_base_unit: checked === true }))}
              />
              <Label htmlFor="is-base-unit" className="text-sm">
                This is the base unit for its category
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewUnitDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={addNewUnit}
              disabled={!newUnit.name.trim() || !newUnit.symbol.trim() || !newUnit.category_id}
            >
              Create Unit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmationOpen} onOpenChange={setDeleteConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
              The option value will be marked as inactive but may still be referenced by existing products.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteOptionValue}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
