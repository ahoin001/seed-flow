import { useState } from "react";
import { NavigationHeader } from "@/components/NavigationHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Globe, Settings, Package, FileText, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BrandProductLineTab } from "@/components/product-flow/BrandProductLineTab";
import { AmazonHtmlParser } from "@/components/product-flow/AmazonHtmlParser";
import { AmazonVariantSelector } from "@/components/product-flow/AmazonVariantSelector";
import { AmazonVariantConfigurator } from "@/components/product-flow/AmazonVariantConfigurator";
import { AmazonReviewCreate } from "@/components/product-flow/AmazonReviewCreate";

interface AmazonFormState {
  // Step 1: Brand and Product Line
  brandId?: number;
  productLineId?: number;
  brand?: any;
  productLine?: any;
  
  // Step 2: Options from Amazon HTML
  parsedOptions: any[];
  selectedOptionTypes: any[];
  
  // Step 3: Variant Selection
  selectedVariants: any[];
  
  // Step 4: Variant Configuration
  configuredVariants: any[];
  
  // Completion tracking
  completedTabs: string[];
  
  // Additional fields for Amazon flow
  parsedItemForm?: string;
}

const tabs = [
  {
    id: "brand-product-line",
    label: "Brand & Product Line",
    description: "Set up brand and product line",
    icon: Building,
  },
  {
    id: "amazon-options",
    label: "Parse Options",
    description: "Extract options from Amazon HTML",
    icon: FileText,
  },
  {
    id: "variant-selection", 
    label: "Select Variants",
    description: "Choose variant combinations",
    icon: Settings,
  },
  {
    id: "variant-config",
    label: "Configure Variants", 
    description: "Set up variant details",
    icon: Package,
  },
  {
    id: "review-create",
    label: "Review & Create",
    description: "Final review and creation",
    icon: Check,
  },
];

export default function AmazonFlow() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("brand-product-line");
  const [formState, setFormState] = useState<AmazonFormState>({
    brandId: undefined,
    productLineId: undefined,
    brand: null,
    productLine: null,
    parsedOptions: [],
    selectedOptionTypes: [],
    selectedVariants: [],
    configuredVariants: [],
    completedTabs: [],
    parsedItemForm: undefined,
  });

  const updateFormState = (updates: Partial<AmazonFormState>) => {
    setFormState(prev => ({ ...prev, ...updates }));
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

  const handleProductCreated = () => {
    // Reset form state for fresh start
    setFormState({
      brandId: undefined,
      productLineId: undefined,
      brand: null,
      productLine: null,
      parsedOptions: [],
      selectedOptionTypes: [],
      selectedVariants: [],
      configuredVariants: [],
      completedTabs: [],
      parsedItemForm: undefined,
    });
    
    // Redirect to step 1
    setActiveTab("brand-product-line");
    
    toast({
      title: "Product Created Successfully!",
      description: "Ready to create another product. Start with step 1.",
    });
  };

  const getCompletionStatus = () => {
    const completedCount = formState.completedTabs.length;
    const totalSteps = 5;
    return `${completedCount} out of ${totalSteps} steps completed`;
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <NavigationHeader title="Build Product From Amazon" showLookupButton={true} showDuplicatesButton={true} showBuildButton={true} showParserTesterButton={true} />
      
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            Build Product From Amazon
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Parse Amazon product pages to quickly create product variants with pre-filled data
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm font-medium">
            <Globe className="h-4 w-4" />
            {getCompletionStatus()}
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Progress Steps */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-4">
              {tabs.map((tab, index) => {
                const isCompleted = formState.completedTabs.includes(tab.id);
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                
                return (
                  <div key={tab.id} className="flex items-center">
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex flex-col items-center p-3 rounded-lg transition-all ${
                        isActive 
                          ? 'bg-primary text-primary-foreground shadow-lg' 
                          : isCompleted 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                      <div className="mt-2 text-center max-w-24">
                        <div className="text-sm font-medium leading-tight">{tab.label}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {tab.description}
                        </div>
                      </div>
                    </button>
                    {index < tabs.length - 1 && (
                      <div className="w-8 h-0.5 bg-border mx-2" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsContent value="brand-product-line" className="mt-6">
              <BrandProductLineTab 
                formState={formState}
                updateFormState={updateFormState}
                onComplete={() => handleTabComplete("brand-product-line")}
              />
            </TabsContent>

            <TabsContent value="amazon-options" className="mt-6">
              <AmazonHtmlParser 
                formState={formState}
                updateFormState={updateFormState}
                onComplete={() => handleTabComplete("amazon-options")}
              />
            </TabsContent>

            <TabsContent value="variant-selection" className="mt-6">
              <AmazonVariantSelector 
                formState={formState}
                updateFormState={updateFormState}
                onComplete={() => handleTabComplete("variant-selection")}
              />
            </TabsContent>

            <TabsContent value="variant-config" className="mt-6">
              <AmazonVariantConfigurator 
                formState={formState}
                updateFormState={updateFormState}
                onComplete={() => handleTabComplete("variant-config")}
              />
            </TabsContent>

            <TabsContent value="review-create" className="mt-6">
              <AmazonReviewCreate 
                formState={formState}
                updateFormState={updateFormState}
                onComplete={handleProductCreated}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
