import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowRight, Plus, Trash2, Settings, Check, X, Edit, FileText, Cog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { FormState } from "@/pages/ProductFlow";
import { AmazonHtmlParser } from "./AmazonHtmlParser";

interface EnhancedVariantOptionsTabProps {
  formState: FormState;
  updateFormState: (updates: Partial<FormState>) => void;
  onComplete: () => void;
}

interface OptionType {
  id?: number;
  name: string;
  label: string;
  unit: string;
  data_type: 'text' | 'number' | 'boolean' | 'select';
  options?: string[];
}

interface SelectedOptionType {
  id: number;
  name: string;
  label: string;
  data_type: string;
  selectedValues: string[];
  availableValues: string[];
}

interface NewOptionType {
  name: string;
  label: string;
  unit: string;
  data_type: 'text' | 'number' | 'boolean' | 'select';
  options: string[];
}

export const EnhancedVariantOptionsTab = ({ formState, updateFormState, onComplete }: EnhancedVariantOptionsTabProps) => {
  const [existingOptionTypes, setExistingOptionTypes] = useState<OptionType[]>([]);
  const [selectedOptionTypes, setSelectedOptionTypes] = useState<SelectedOptionType[]>([]);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ optionTypeId: number; value: string } | null>(null);
  const [newOptionType, setNewOptionType] = useState<NewOptionType>({
    name: "",
    label: "",
    unit: "",
    data_type: 'select',
    options: [""]
  });

  const dataTypeOptions = [
    { value: 'text', label: 'Text Input' },
    { value: 'number', label: 'Number Input' },
    { value: 'boolean', label: 'Yes/No' },
    { value: 'select', label: 'Select List' }
  ];

  useEffect(() => {
    fetchExistingOptionTypes();
  }, []);

  const fetchExistingOptionTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("product_options")
        .select("id, name, label, unit, data_type, options")
        .order("name");

      if (error) {
        console.error("Error fetching existing option types:", error);
        throw error;
      }

      setExistingOptionTypes(data || []);
    } catch (error) {
      console.error("Error fetching existing option types:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch existing option types."
      });
    }
  };

  const handleOptionTypeSelect = (optionType: OptionType) => {
    const isAlreadySelected = selectedOptionTypes.some(opt => opt.id === optionType.id);
    
    if (isAlreadySelected) {
      // Remove from selection
      setSelectedOptionTypes(prev => prev.filter(opt => opt.id !== optionType.id));
    } else {
      // Add to selection
      const selectedOption: SelectedOptionType = {
        id: optionType.id!,
        name: optionType.name,
        label: optionType.label,
        data_type: optionType.data_type,
        selectedValues: [],
        availableValues: optionType.options || []
      };
      setSelectedOptionTypes(prev => [...prev, selectedOption]);
    }
  };

  const handleValueToggle = (optionTypeId: number, value: string) => {
    setSelectedOptionTypes(prev => 
      prev.map(opt => 
        opt.id === optionTypeId 
          ? {
              ...opt,
              selectedValues: opt.selectedValues.includes(value)
                ? opt.selectedValues.filter(v => v !== value)
                : [...opt.selectedValues, value]
            }
          : opt
      )
    );
  };

  const addNewOptionValue = async (optionTypeId: number, value: string) => {
    if (!value.trim()) return;
    
    const trimmedValue = value.trim();
    
    try {
      // Update the product_options table to add the new value
      const { data: existingOption } = await supabase
        .from('product_options')
        .select('options')
        .eq('id', optionTypeId)
        .single();

      if (existingOption) {
        const currentOptions = existingOption.options || [];
        const updatedOptions = [...currentOptions, trimmedValue];
        
        const { error } = await supabase
          .from('product_options')
          .update({ options: updatedOptions })
          .eq('id', optionTypeId);

        if (error) throw error;

        toast({
          title: "Success",
          description: `Added "${trimmedValue}" to ${selectedOptionTypes.find(opt => opt.id === optionTypeId)?.label}`
        });
      }
    } catch (error) {
      console.error("Error adding option value:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add the new option value to the database."
      });
    }
    
    // Update local state
    setSelectedOptionTypes(prev => 
      prev.map(opt => 
        opt.id === optionTypeId 
          ? {
              ...opt,
              selectedValues: [...opt.selectedValues, trimmedValue],
              availableValues: [...opt.availableValues, trimmedValue]
            }
          : opt
      )
    );
  };

  const removeValue = (optionTypeId: number, value: string) => {
    setDeleteConfirm({ optionTypeId, value });
  };

  const confirmDeleteValue = async () => {
    if (!deleteConfirm) return;
    
    const { optionTypeId, value } = deleteConfirm;
    
    try {
      // Update the product_options table to remove the value
      const { data: existingOption } = await supabase
        .from('product_options')
        .select('options')
        .eq('id', optionTypeId)
        .single();

      if (existingOption) {
        const currentOptions = existingOption.options || [];
        const updatedOptions = currentOptions.filter(opt => opt !== value);
        
        const { error } = await supabase
          .from('product_options')
          .update({ options: updatedOptions })
          .eq('id', optionTypeId);

        if (error) throw error;

        toast({
          title: "Success",
          description: `Removed "${value}" from ${selectedOptionTypes.find(opt => opt.id === optionTypeId)?.label}`
        });
      }
    } catch (error) {
      console.error("Error removing option value:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove the option value from the database."
      });
    }
    
    // Update local state
    setSelectedOptionTypes(prev => 
      prev.map(opt => 
        opt.id === optionTypeId 
          ? {
              ...opt,
              selectedValues: opt.selectedValues.filter(v => v !== value),
              availableValues: opt.availableValues.filter(v => v !== value)
            }
          : opt
      )
    );
    
    setDeleteConfirm(null);
  };

  const addNewOptionType = () => {
    if (!newOptionType.name.trim() || !newOptionType.label.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in name and label for the new option type."
      });
      return;
    }

    const validOptions = newOptionType.options.filter(opt => opt.trim());
    if (newOptionType.data_type === 'select' && validOptions.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please add at least one option for select type."
      });
      return;
    }

    const optionType: OptionType = {
      name: newOptionType.name.trim(),
      label: newOptionType.label.trim(),
      unit: newOptionType.unit.trim(),
      data_type: newOptionType.data_type,
      options: newOptionType.data_type === 'select' ? validOptions : undefined
    };

    // Add to existing types and selected types
    const newId = Date.now(); // Temporary ID
    const newOptionTypeWithId = { ...optionType, id: newId };
    
    setExistingOptionTypes(prev => [...prev, newOptionTypeWithId]);
    
    const selectedOption: SelectedOptionType = {
      id: newId,
      name: optionType.name,
      label: optionType.label,
      data_type: optionType.data_type,
      selectedValues: [],
      availableValues: optionType.options || []
    };
    setSelectedOptionTypes(prev => [...prev, selectedOption]);

    // Reset form
    setNewOptionType({
      name: "",
      label: "",
      unit: "",
      data_type: 'select',
      options: [""]
    });
    setShowCreateNew(false);

    toast({
      title: "Success",
      description: "New option type added successfully."
    });
  };

  const calculatePermutations = () => {
    if (selectedOptionTypes.length === 0) return 0;
    
    return selectedOptionTypes.reduce((total, optionType) => {
      const selectedCount = optionType.selectedValues.length;
      return total * (selectedCount > 0 ? selectedCount : 1);
    }, 1);
  };

  const isValid = selectedOptionTypes.length > 0 && 
    selectedOptionTypes.every(opt => opt.selectedValues.length > 0);

  const handleSubmit = async () => {
    if (!isValid) {
        toast({
          variant: "destructive",
          title: "Error",
        description: "Please select at least one option type with values."
        });
        return;
      }

    setIsLoading(true);
    try {
      // Store selected option types and their values in form state
      const optionTypeData = selectedOptionTypes.map(opt => ({
        id: opt.id,
        name: opt.name,
        label: opt.label,
        data_type: opt.data_type,
        selectedValues: opt.selectedValues
      }));

      updateFormState({ 
        selectedOptionTypes: optionTypeData,
        variantPermutations: calculatePermutations()
      });

      toast({
        title: "Success!",
        description: `${calculatePermutations()} variant permutations will be generated.`
      });

      onComplete();
    } catch (error) {
      console.error("Error submitting option types:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save option types."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionsExtracted = (options: any[]) => {
    // Convert parsed options to the format expected by the form
    const selectedOptionTypes = options.map((option, index) => ({
      id: Date.now() + index, // Generate temporary ID
      name: option.name,
      label: option.displayName,
      data_type: 'select',
      selectedValues: option.values
    }));
    
    updateFormState({ selectedOptionTypes });
    toast({
      title: "Success",
      description: "Options extracted and applied to the form! Moving to step 3..."
    });
    
    // Mark step 2 as completed and advance to step 3
    onComplete();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Variant Options</h2>
        <p className="text-muted-foreground">
          Select the option types and values that will create product variants (e.g., Size, Flavor, etc.)
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Cog className="h-4 w-4" />
            Manual Setup
          </TabsTrigger>
          <TabsTrigger value="parser" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Amazon Parser
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-6">

      {/* Option Types Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
            Available Option Types
            </CardTitle>
            <CardDescription>
            Choose which option types to use for your product variants
            </CardDescription>
          </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Option Types */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {existingOptionTypes.map((optionType) => {
              const isSelected = selectedOptionTypes.some(opt => opt.id === optionType.id);
              return (
                <Card 
                  key={optionType.id} 
                  className={`cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-md'
                  }`}
                  onClick={() => handleOptionTypeSelect(optionType)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{optionType.label}</h4>
                        <p className="text-sm text-muted-foreground">{optionType.name}</p>
                        <Badge variant="outline" className="mt-1">
                          {optionType.data_type}
                        </Badge>
                    </div>
                      {isSelected && <Check className="h-5 w-5 text-primary" />}
            </div>
          </CardContent>
        </Card>
              );
            })}
        </div>

          {/* Add New Option Type */}
          <div className="border-t pt-4">
                    <Button
              variant="outline" 
              onClick={() => setShowCreateNew(!showCreateNew)}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {showCreateNew ? 'Cancel' : 'Add New Option Type'}
                    </Button>

            {showCreateNew && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Create New Option Type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <Label htmlFor="optionName">Name *</Label>
                    <Input
                        id="optionName"
                        value={newOptionType.name}
                        onChange={(e) => setNewOptionType(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., flavor"
                    />
                  </div>
                  <div>
                      <Label htmlFor="optionLabel">Label *</Label>
                    <Input
                        id="optionLabel"
                        value={newOptionType.label}
                        onChange={(e) => setNewOptionType(prev => ({ ...prev, label: e.target.value }))}
                        placeholder="e.g., Flavor"
                    />
                  </div>
                  <div>
                      <Label htmlFor="optionUnit">Unit</Label>
                    <Input
                        id="optionUnit"
                        value={newOptionType.unit}
                        onChange={(e) => setNewOptionType(prev => ({ ...prev, unit: e.target.value }))}
                        placeholder="e.g., oz, lb"
                    />
                  </div>
                  <div>
                      <Label htmlFor="optionDataType">Data Type *</Label>
                    <Select 
                        value={newOptionType.data_type} 
                        onValueChange={(value: any) => setNewOptionType(prev => ({ ...prev, data_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                          {dataTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                  {newOptionType.data_type === 'select' && (
                    <div>
                      <Label>Options *</Label>
                  <div className="space-y-2">
                        {newOptionType.options.map((option, index) => (
                          <div key={index} className="flex gap-2">
                          <Input
                            value={option}
                              onChange={(e) => {
                                const newOptions = [...newOptionType.options];
                                newOptions[index] = e.target.value;
                                setNewOptionType(prev => ({ ...prev, options: newOptions }));
                              }}
                              placeholder={`Option ${index + 1}`}
                            />
                            {newOptionType.options.length > 1 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newOptions = newOptionType.options.filter((_, i) => i !== index);
                                  setNewOptionType(prev => ({ ...prev, options: newOptions }));
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                          <Button
                          variant="outline"
                            size="sm"
                          onClick={() => setNewOptionType(prev => ({ ...prev, options: [...prev.options, ""] }))}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Option
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={addNewOptionType}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Option Type
                    </Button>
                    <Button variant="outline" onClick={() => setShowCreateNew(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected Option Types and Values */}
      {selectedOptionTypes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Options & Values</CardTitle>
            <CardDescription>
              Choose the specific values for each selected option type
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedOptionTypes.map((optionType) => (
              <Card key={optionType.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{optionType.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Available Values */}
                    <div>
                      <Label className="text-sm font-medium">Available Values</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {optionType.availableValues.map((value) => (
                          <Badge
                            key={value}
                            variant={optionType.selectedValues.includes(value) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => handleValueToggle(optionType.id, value)}
                          >
                            {value}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Selected Values */}
                    {optionType.selectedValues.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Selected Values</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {optionType.selectedValues.map((value) => (
                            <Badge
                              key={value}
                              variant="default"
                              className="cursor-pointer"
                              onClick={() => removeValue(optionType.id, value)}
                            >
                              {value}
                              <X className="h-3 w-3 ml-1" />
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add Custom Value */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add custom value..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const value = e.currentTarget.value;
                            if (value.trim()) {
                              addNewOptionValue(optionType.id, value);
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          const value = input.value;
                          if (value.trim()) {
                            addNewOptionValue(optionType.id, value);
                            input.value = '';
                          }
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
              </CardContent>
            </Card>
          ))}

            {/* Permutation Summary */}
            <Card className="bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Variant Summary</h4>
                    <p className="text-sm text-muted-foreground">
                      {calculatePermutations()} variant permutations will be generated
                    </p>
          </div>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {calculatePermutations()}
                  </Badge>
        </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!isValid || isLoading}
          className="min-w-[120px]"
        >
          {isLoading ? (
            "Processing..."
          ) : (
            <>
              Continue to Variants
          <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Option Value</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.value}" from the database? 
              This action cannot be undone and will remove this value from all future uses of this option type.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteValue}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </TabsContent>

        <TabsContent value="parser" className="space-y-6">
          <AmazonHtmlParser onOptionsExtracted={handleOptionsExtracted} />
        </TabsContent>
      </Tabs>
    </div>
  );
};