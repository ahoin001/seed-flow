import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NavigationHeader } from "@/components/NavigationHeader";
import { BrandProductLineTab } from "@/components/product-flow/BrandProductLineTab";
import { EnhancedVariantOptionsTab } from "@/components/product-flow/EnhancedVariantOptionsTab";
import { ProductVariantTab } from "@/components/product-flow/ProductVariantTab";
import { ReviewCreateTab } from "@/components/product-flow/ReviewCreateTab";
import { Package, Cog, Palette, FileText, Leaf, CheckCircle, Check } from "lucide-react";

export interface FormState {
  brandId?: number;
  productLineId?: number;
  variantIds: number[];
  categoryIds: number[];
  completedTabs: string[];
  isNewProductLine?: boolean;
  optionTypeIds?: number[];
  selectedOptionTypes?: Array<{
    id: number;
    name: string;
    label: string;
    data_type: string;
    selectedValues: string[];
  }>;
  variantPermutations?: number;
  generatedVariants?: Array<{
    id: string;
    name: string;
    optionValues: Record<string, string>;
    data: {
      variant_name_suffix: string;
      image_url: string;
      upc: string;
      ean: string;
      asin: string;
      form_factor: string;
      optionValues: Record<string, string>;
      isActive: boolean;
    };
  }>;
  normalizedProductData?: any;
}

const ProductFlow = () => {
  const [activeTab, setActiveTab] = useState("brand-product-line");
  const [formState, setFormState] = useState<FormState>({
    variantIds: [],
    categoryIds: [],
    completedTabs: []
  });

  const tabs = [
    { 
      id: "brand-product-line", 
      label: "Brand & Product Line", 
      icon: Package,
      description: "Create brand and product line"
    },
    { 
      id: "option-types", 
      label: "Variant Options", 
      icon: Cog,
      description: "Configure variant option types"
    },
    { 
      id: "variants", 
      label: "Product Variants", 
      icon: Palette,
      description: "Configure variants with categories, identifiers, and nutrition"
    },
    { 
      id: "review-create", 
      label: "Review & Create", 
      icon: CheckCircle,
      description: "Review and create product"
    }
  ];

  const updateFormState = (updates: Partial<FormState>) => {
    setFormState(prev => ({ ...prev, ...updates }));
  };

  const clearWorkflow = () => {
    setFormState({
      variantIds: [],
      categoryIds: [],
      completedTabs: []
    });
    setActiveTab("brand-product-line");
  };

  const handleTabComplete = (tabId: string) => {
    const newCompletedTabs = [...formState.completedTabs, tabId];
    updateFormState({ completedTabs: newCompletedTabs });
    
    // Auto-advance to next tab
    const currentIndex = tabs.findIndex(tab => tab.id === tabId);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1].id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <NavigationHeader title="SniffSafe Data Seed" showLookupButton={true} showDuplicatesButton={true} showAmazonButton={true} showParserTesterButton={true} />
      
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            Build Your Product
          </h1>
          <p className="text-muted-foreground text-lg">
            Create comprehensive pet food products with variants, nutrition data, and more
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Progress Steps - Desktop Only */}
          <div className="mb-8">
            <div className="flex items-center justify-between relative">
              {/* Progress Line */}
              <div className="absolute top-6 left-0 right-0 h-0.5 bg-muted">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ 
                    width: `${(formState.completedTabs.length / (tabs.length - 1)) * 100}%` 
                  }}
                />
              </div>
              
              {/* Step Indicators */}
              {tabs.map((tab, index) => {
                const isCompleted = formState.completedTabs.includes(tab.id);
                const isCurrent = activeTab === tab.id;
                const isDisabled = index > 0 && !formState.completedTabs.includes(tabs[index - 1].id);
                
                return (
                  <div key={tab.id} className="flex flex-col items-center relative z-10">
                    <button
                      onClick={() => !isDisabled && setActiveTab(tab.id)}
                      className={`w-12 h-12 rounded-full p-0 flex items-center justify-center transition-all ${
                        isCompleted 
                          ? 'bg-primary text-primary-foreground' 
                          : isCurrent 
                          ? 'bg-primary/20 text-primary border-2 border-primary' 
                          : 'bg-muted text-muted-foreground'
                      } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-primary/10'}`}
                      disabled={isDisabled}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <tab.icon className="h-5 w-5" />
                      )}
                    </button>
                    <div className="mt-2 text-center max-w-24">
                      <div className="text-sm font-medium leading-tight">{tab.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {tab.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <TabsContent value="brand-product-line" className="mt-6">
            <BrandProductLineTab 
              formState={formState}
              updateFormState={updateFormState}
              onComplete={() => handleTabComplete("brand-product-line")}
            />
          </TabsContent>

          <TabsContent value="option-types" className="mt-6">
            <EnhancedVariantOptionsTab 
              formState={formState}
              updateFormState={updateFormState}
              onComplete={() => handleTabComplete("option-types")}
            />
          </TabsContent>

          <TabsContent value="variants" className="mt-6">
            <ProductVariantTab 
              formState={formState}
              updateFormState={updateFormState}
              onComplete={() => handleTabComplete("variants")}
            />
          </TabsContent>


          <TabsContent value="review-create" className="mt-6">
            <ReviewCreateTab 
              formState={formState}
              updateFormState={updateFormState}
              onComplete={() => {
                handleTabComplete("review-create");
                clearWorkflow();
              }}
              onNavigateToStep={(stepId) => setActiveTab(stepId)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProductFlow;