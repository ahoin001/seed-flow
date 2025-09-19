import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Package, Globe, Image, Tag, List, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AmazonVariantPrefillModal } from "./AmazonVariantPrefillModal";

// Add Identifier Form Component
interface AddIdentifierFormProps {
  variantId: string;
  onAddIdentifier: (variantId: string, identifier: { type: string; value: string }) => void;
}

const AddIdentifierForm = ({ variantId, onAddIdentifier }: AddIdentifierFormProps) => {
  const [identifierType, setIdentifierType] = useState("");
  const [identifierValue, setIdentifierValue] = useState("");
  const { toast } = useToast();

  const handleAddIdentifier = () => {
    if (!identifierType || !identifierValue.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a type and enter an identifier value."
      });
      return;
    }

    onAddIdentifier(variantId, {
      type: identifierType,
      value: identifierValue.trim()
    });

    // Reset form
    setIdentifierType("");
    setIdentifierValue("");

    toast({
      title: "Success",
      description: "Identifier added successfully."
    });
  };

  return (
    <div className="flex gap-2 p-3 border-2 border-dashed rounded-lg bg-muted/20">
      <div className="flex-1">
        <Label htmlFor={`identifier-type-${variantId}`} className="text-xs">Type</Label>
        <Select value={identifierType} onValueChange={setIdentifierType}>
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Select type..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UPC">UPC</SelectItem>
            <SelectItem value="ASIN">ASIN</SelectItem>
            <SelectItem value="EAN">EAN</SelectItem>
            <SelectItem value="ISBN">ISBN</SelectItem>
            <SelectItem value="SKU">SKU</SelectItem>
            <SelectItem value="GTIN">GTIN</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1">
        <Label htmlFor={`identifier-value-${variantId}`} className="text-xs">Code</Label>
        <Input
          id={`identifier-value-${variantId}`}
          value={identifierValue}
          onChange={(e) => setIdentifierValue(e.target.value)}
          placeholder="Enter identifier..."
          className="h-8"
        />
      </div>
      <div className="flex items-end">
        <Button 
          onClick={handleAddIdentifier}
          disabled={!identifierType || !identifierValue.trim()}
          size="sm"
          className="gap-1"
        >
          <Plus className="h-3 w-3" />
          Add
        </Button>
      </div>
    </div>
  );
};

interface AmazonVariantConfiguratorProps {
  formState: any;
  updateFormState: (updates: any) => void;
  onComplete: () => void;
}

export const AmazonVariantConfigurator = ({ formState, updateFormState, onComplete }: AmazonVariantConfiguratorProps) => {
  const [variants, setVariants] = useState<any[]>([]);
  const [prefillModalOpen, setPrefillModalOpen] = useState(false);
  const [currentVariantId, setCurrentVariantId] = useState<string | null>(null);
  const [customFormFactor, setCustomFormFactor] = useState<string>('');
  const [showCustomFormFactor, setShowCustomFormFactor] = useState<boolean>(false);
  const { toast } = useToast();

  // Initialize variants from selected combinations
  useEffect(() => {
    if (formState.selectedVariants && formState.selectedVariants.length > 0) {
      const initializedVariants = formState.selectedVariants.map((variant: any, index: number) => ({
        id: `variant-${index}`,
        name: variant.displayName,
        values: variant.values,
        // Variant configuration fields
        customName: '',
        imageUrl: '',
        identifiers: [],
        ingredients: '',
        nutrition: {},
        categories: [],
        formFactor: '',
        packageSize: '',
        packageSizeUnit: 'lb',
        description: '',
        // Prefill data from Amazon parser
        prefilledData: null
      }));
      setVariants(initializedVariants);
    }
  }, [formState.selectedVariants]);

  const updateVariant = (variantId: string, field: string, value: any) => {
    setVariants(prev => prev.map(variant => 
      variant.id === variantId 
        ? { ...variant, [field]: value }
        : variant
    ));
  };

  const addIdentifier = (variantId: string, identifier: { type: string; value: string }) => {
    const variant = variants.find(v => v.id === variantId);
    if (variant) {
      const updatedIdentifiers = [...variant.identifiers, identifier];
      updateVariant(variantId, 'identifiers', updatedIdentifiers);
    }
  };

  const updateIdentifier = (variantId: string, index: number, field: string, value: string) => {
    const variant = variants.find(v => v.id === variantId);
    if (variant) {
      const updatedIdentifiers = [...variant.identifiers];
      updatedIdentifiers[index] = { ...updatedIdentifiers[index], [field]: value };
      updateVariant(variantId, 'identifiers', updatedIdentifiers);
    }
  };

  const removeIdentifier = (variantId: string, index: number) => {
    const variant = variants.find(v => v.id === variantId);
    if (variant) {
      const updatedIdentifiers = variant.identifiers.filter((_: any, i: number) => i !== index);
      updateVariant(variantId, 'identifiers', updatedIdentifiers);
    }
  };

  const handleFormFactorChange = (variantId: string, value: string) => {
    if (value === 'custom') {
      setShowCustomFormFactor(true);
    } else {
      updateVariant(variantId, 'formFactor', value);
      setShowCustomFormFactor(false);
    }
  };

  const handleCustomFormFactorSubmit = (variantId: string) => {
    if (customFormFactor.trim()) {
      updateVariant(variantId, 'formFactor', customFormFactor.trim());
      setCustomFormFactor('');
      setShowCustomFormFactor(false);
    }
  };

  const isVariantComplete = (variant: any) => {
    const hasName = variant.customName && variant.customName.trim().length > 0;
    const hasImage = variant.imageUrl && variant.imageUrl.trim().length > 0;
    return hasName && hasImage;
  };

  const getMissingFields = (variant: any) => {
    const missing = [];
    if (!variant.customName || variant.customName.trim().length === 0) missing.push('Name');
    if (!variant.imageUrl || variant.imageUrl.trim().length === 0) missing.push('Image URL');
    return missing;
  };

  const openPrefillModal = (variantId: string) => {
    setCurrentVariantId(variantId);
    setPrefillModalOpen(true);
  };

  const handlePrefillData = (prefilledData: any) => {
    if (currentVariantId) {
      updateVariant(currentVariantId, 'prefilledData', prefilledData);
      
      // Apply prefilled data to variant fields
      if (prefilledData.imageUrl) {
        updateVariant(currentVariantId, 'imageUrl', prefilledData.imageUrl);
      }
      if (prefilledData.productTitle) {
        updateVariant(currentVariantId, 'customName', prefilledData.productTitle);
      }
      if (prefilledData.identifiers && prefilledData.identifiers.length > 0) {
        updateVariant(currentVariantId, 'identifiers', prefilledData.identifiers);
      }
      if (prefilledData.ingredients) {
        updateVariant(currentVariantId, 'ingredients', prefilledData.ingredients);
      }
      
      toast({
        title: "Success",
        description: "Variant data prefilled from Amazon HTML!"
      });
    }
    setPrefillModalOpen(false);
    setCurrentVariantId(null);
  };

  const handleContinue = () => {
    // Validate that all variants have required fields
    const incompleteVariants = variants.filter(v => {
      const hasName = v.customName && v.customName.trim().length > 0;
      const hasImage = v.imageUrl && v.imageUrl.trim().length > 0;
      return !hasName || !hasImage;
    });
    
    if (incompleteVariants.length > 0) {
      toast({
        variant: "destructive",
        title: "Incomplete Variants",
        description: `Please complete the required fields for ${incompleteVariants.length} variant${incompleteVariants.length !== 1 ? 's' : ''}. Required: Name and Image URL.`
      });
      return;
    }

    updateFormState({ configuredVariants: variants });
    onComplete();
    
    toast({
      title: "Success",
      description: `Configured ${variants.length} variant${variants.length !== 1 ? 's' : ''}. Moving to final review...`
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Configure Variants</h2>
        <p className="text-muted-foreground">
          Set up each variant with product details. Use "Prefill with Parser" to automatically populate data from Amazon HTML.
        </p>
      </div>

      {/* Variants */}
      <div className="space-y-4">
        {variants.map((variant) => (
          <Card key={variant.id} className="border-l-4 border-l-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      {variant.name}
                    </CardTitle>
                    {isVariantComplete(variant) ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Complete
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <X className="h-3 w-3" />
                        Missing: {getMissingFields(variant).join(', ')}
                      </Badge>
                    )}
                  </div>
                  <CardDescription asChild>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(variant.values).map(([key, value]) => (
                        <Badge key={key} variant="outline" className="text-xs">
                          {key}: {value}
                        </Badge>
                      ))}
                    </div>
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openPrefillModal(variant.id)}
                  className="gap-2"
                >
                  <Globe className="h-4 w-4" />
                  Prefill with Parser
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`${variant.id}-name`} className="flex items-center gap-1">
                    Custom Name
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id={`${variant.id}-name`}
                    value={variant.customName}
                    onChange={(e) => updateVariant(variant.id, 'customName', e.target.value)}
                    placeholder="Enter custom variant name"
                    className={!variant.customName || variant.customName.trim().length === 0 ? 'border-red-200 focus:border-red-300' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${variant.id}-image`} className="flex items-center gap-1">
                    Image URL
                    <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id={`${variant.id}-image`}
                      value={variant.imageUrl}
                      onChange={(e) => updateVariant(variant.id, 'imageUrl', e.target.value)}
                      placeholder="Enter image URL"
                      className={!variant.imageUrl || variant.imageUrl.trim().length === 0 ? 'border-red-200 focus:border-red-300' : ''}
                    />
                    {variant.imageUrl && (
                      <img 
                        src={variant.imageUrl} 
                        alt="Preview" 
                        className="w-12 h-12 object-cover rounded border"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Form Factor and Package Size */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`${variant.id}-form-factor`}>
                    Form Factor
                  </Label>
                  <Select 
                    value={variant.formFactor} 
                    onValueChange={(value) => handleFormFactorChange(variant.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select form factor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dry">Dry</SelectItem>
                      <SelectItem value="wet">Wet</SelectItem>
                      <SelectItem value="treat">Treat</SelectItem>
                      <SelectItem value="supplement">Supplement</SelectItem>
                      <SelectItem value="custom">+ Create Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  {showCustomFormFactor && (
                    <div className="flex gap-2">
                      <Input
                        value={customFormFactor}
                        onChange={(e) => setCustomFormFactor(e.target.value)}
                        placeholder="Enter custom form factor"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCustomFormFactorSubmit(variant.id)}
                        disabled={!customFormFactor.trim()}
                      >
                        Add
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCustomFormFactor(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${variant.id}-package-size`}>Package Size</Label>
                  <Input
                    id={`${variant.id}-package-size`}
                    type="number"
                    value={variant.packageSize}
                    onChange={(e) => updateVariant(variant.id, 'packageSize', e.target.value)}
                    placeholder="Enter package size"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${variant.id}-package-unit`}>Unit</Label>
                  <Select 
                    value={variant.packageSizeUnit} 
                    onValueChange={(value) => updateVariant(variant.id, 'packageSizeUnit', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lb">lb</SelectItem>
                      <SelectItem value="oz">oz</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="g">g</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Ingredients */}
              <div className="space-y-2">
                <Label htmlFor={`${variant.id}-ingredients`}>Ingredients</Label>
                <Textarea
                  id={`${variant.id}-ingredients`}
                  value={variant.ingredients}
                  onChange={(e) => updateVariant(variant.id, 'ingredients', e.target.value)}
                  placeholder="Enter ingredients (comma-separated)"
                  rows={3}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor={`${variant.id}-description`}>Description</Label>
                <Textarea
                  id={`${variant.id}-description`}
                  value={variant.description}
                  onChange={(e) => updateVariant(variant.id, 'description', e.target.value)}
                  placeholder="Enter product description"
                  rows={2}
                />
              </div>

              {/* Product Identifiers - Moved to end with more space */}
              <div className="space-y-3 border-t pt-4">
                <div>
                  <Label className="text-sm font-medium">Product Identifiers</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add UPC, ASIN, EAN, or other product identifiers
                  </p>
                </div>
                <div className="space-y-2">
                  {variant.identifiers.map((identifier: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                      <Badge variant="outline">{identifier.type.toUpperCase()}</Badge>
                      <span className="font-mono text-sm flex-1">{identifier.value}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeIdentifier(variant.id, index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  
                  {/* Add Identifier Form - Inline */}
                  <AddIdentifierForm variantId={variant.id} onAddIdentifier={addIdentifier} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Continue Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button 
          onClick={handleContinue}
          className="gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          Continue to Review
        </Button>
      </div>

      {/* Prefill Modal */}
      <AmazonVariantPrefillModal
        isOpen={prefillModalOpen}
        onClose={() => setPrefillModalOpen(false)}
        onPrefill={handlePrefillData}
      />
    </div>
  );
};
