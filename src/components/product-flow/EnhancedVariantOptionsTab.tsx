import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Plus, Trash2, Settings, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { FormState } from "@/pages/ProductFlow";

interface EnhancedVariantOptionsTabProps {
  formState: FormState;
  updateFormState: (updates: Partial<FormState>) => void;
  onComplete: () => void;
}

interface OptionType {
  id?: string;
  name: string;
  label: string;
  unit: string;
  data_type: 'text' | 'number' | 'boolean' | 'select';
  options?: string[]; // For select type
}

interface ExistingOptionType {
  id: string;
  name: string;
  label: string;
  unit: string;
  data_type: string;
}

export const EnhancedVariantOptionsTab = ({ formState, updateFormState, onComplete }: EnhancedVariantOptionsTabProps) => {
  const [optionTypes, setOptionTypes] = useState<OptionType[]>([
    { name: "", label: "", unit: "", data_type: 'text' }
  ]);
  const [existingOptionTypes, setExistingOptionTypes] = useState<ExistingOptionType[]>([]);
  const [selectedExistingTypes, setSelectedExistingTypes] = useState<string[]>([]);
  const [showCreateNew, setShowCreateNew] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const dataTypeOptions = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
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
        .select("id, name, label, unit, data_type")
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

  const addOptionType = () => {
    setOptionTypes(prev => [...prev, { name: "", label: "", unit: "", data_type: 'text' }]);
  };

  const removeOptionType = (index: number) => {
    if (optionTypes.length > 1) {
      setOptionTypes(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateOptionType = (index: number, field: keyof OptionType, value: string | string[]) => {
    setOptionTypes(prev => prev.map((option, i) => 
      i === index ? { ...option, [field]: value } : option
    ));
  };

  const addSelectOption = (optionIndex: number) => {
    const currentOptions = optionTypes[optionIndex].options || [];
    updateOptionType(optionIndex, 'options', [...currentOptions, '']);
  };

  const removeSelectOption = (optionIndex: number, optionValueIndex: number) => {
    const currentOptions = optionTypes[optionIndex].options || [];
    const newOptions = currentOptions.filter((_, i) => i !== optionValueIndex);
    updateOptionType(optionIndex, 'options', newOptions);
  };

  const updateSelectOption = (optionIndex: number, optionValueIndex: number, value: string) => {
    const currentOptions = optionTypes[optionIndex].options || [];
    const newOptions = currentOptions.map((opt, i) => i === optionValueIndex ? value : opt);
    updateOptionType(optionIndex, 'options', newOptions);
  };

  const handleExistingTypeToggle = (typeId: string) => {
    setSelectedExistingTypes(prev => 
      prev.includes(typeId) 
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      let optionTypeIds: string[] = [];

      // Handle existing option types selection
      if (selectedExistingTypes.length > 0) {
        optionTypeIds = [...selectedExistingTypes];
      }

      // Handle new option types creation
      if (showCreateNew) {
        const validOptionTypes = optionTypes.filter(option => 
          option.name.trim() && option.label.trim()
        );
        
        if (validOptionTypes.length > 0) {
          const optionInserts = validOptionTypes.map(option => ({
            name: option.name.trim(),
            label: option.label.trim(),
            unit: option.unit.trim(),
            data_type: option.data_type,
            options: option.data_type === 'select' ? option.options?.filter(opt => opt.trim()) : null
          }));

          const { data: createdOptions, error: optionError } = await supabase
            .from("product_options")
            .insert(optionInserts)
            .select("id");

          if (optionError) {
            console.error("Error creating option types:", optionError);
            throw optionError;
          }

          optionTypeIds = [...optionTypeIds, ...createdOptions.map(o => o.id)];
        }
      }

      if (optionTypeIds.length === 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please select existing option types or create new ones."
        });
        return;
      }

      // Store the option type IDs in form state for later use
      updateFormState({ optionTypeIds });

      toast({
        title: "Success!",
        description: `${optionTypeIds.length} option type(s) configured successfully.`
      });

      onComplete();
    } catch (error) {
      console.error("Error processing option types:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to process option types: ${error.message || 'Unknown error'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = (showCreateNew && optionTypes.some(option => option.name.trim() && option.label.trim())) || 
                  selectedExistingTypes.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Variant Option Types</h2>
        <p className="text-muted-foreground">
          Configure the types of options that can be associated with product variants (e.g., Size, Weight, Flavor, etc.)
        </p>
      </div>

      {/* Existing Option Types Selection */}
      {existingOptionTypes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Existing Option Types
            </CardTitle>
            <CardDescription>
              Select from previously created option types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {existingOptionTypes.map((optionType) => (
                <div key={optionType.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <input
                    type="checkbox"
                    id={`existing-${optionType.id}`}
                    checked={selectedExistingTypes.includes(optionType.id)}
                    onChange={() => handleExistingTypeToggle(optionType.id)}
                    className="rounded"
                  />
                  <div className="flex-1">
                    <label htmlFor={`existing-${optionType.id}`} className="text-sm font-medium cursor-pointer">
                      {optionType.label} ({optionType.name})
                    </label>
                    <div className="text-xs text-muted-foreground">
                      Type: {optionType.data_type} • Unit: {optionType.unit || 'None'}
                    </div>
                  </div>
                  {selectedExistingTypes.includes(optionType.id) && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create New Option Types Section */}
      {existingOptionTypes.length > 0 && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="create-new-toggle"
            checked={showCreateNew}
            onChange={(e) => setShowCreateNew(e.target.checked)}
            className="rounded"
          />
          <Label htmlFor="create-new-toggle" className="text-sm font-medium">
            Also create new option types
          </Label>
        </div>
      )}

      {/* New Option Types */}
      {showCreateNew && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            {existingOptionTypes.length > 0 ? "Create New Option Types" : "Create Option Types"}
          </h3>
          {optionTypes.map((optionType, index) => (
            <Card key={index} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Settings className="h-5 w-5" />
                    Option Type {index + 1}
                  </CardTitle>
                  {optionTypes.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOptionType(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`option-name-${index}`}>Option Name *</Label>
                    <Input
                      id={`option-name-${index}`}
                      value={optionType.name}
                      onChange={(e) => updateOptionType(index, "name", e.target.value)}
                      placeholder="e.g., size"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`option-label-${index}`}>Display Label *</Label>
                    <Input
                      id={`option-label-${index}`}
                      value={optionType.label}
                      onChange={(e) => updateOptionType(index, "label", e.target.value)}
                      placeholder="e.g., Size"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`option-unit-${index}`}>Unit</Label>
                    <Input
                      id={`option-unit-${index}`}
                      value={optionType.unit}
                      onChange={(e) => updateOptionType(index, "unit", e.target.value)}
                      placeholder="e.g., lbs, oz, ml"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`option-type-${index}`}>Data Type</Label>
                    <Select 
                      value={optionType.data_type} 
                      onValueChange={(value: 'text' | 'number' | 'boolean' | 'select') => 
                        updateOptionType(index, "data_type", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {dataTypeOptions.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Select Options */}
                {optionType.data_type === 'select' && (
                  <div className="space-y-2">
                    <Label>Select Options</Label>
                    <div className="space-y-2">
                      {(optionType.options || []).map((option, optionIndex) => (
                        <div key={optionIndex} className="flex gap-2">
                          <Input
                            value={option}
                            onChange={(e) => updateSelectOption(index, optionIndex, e.target.value)}
                            placeholder={`Option ${optionIndex + 1}`}
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSelectOption(index, optionIndex)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addSelectOption(index)}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Option
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Add Option Type Button */}
          <div className="flex justify-center">
            <Button onClick={addOptionType} variant="outline" size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Add Another Option Type
            </Button>
          </div>
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
          {isLoading ? "Creating..." : "Continue to Variants"}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};
