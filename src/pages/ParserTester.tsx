import { useState } from "react";
import { NavigationHeader } from "@/components/NavigationHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronDown, 
  ChevronRight, 
  Code, 
  Globe, 
  Search, 
  Package, 
  CheckCircle,
  AlertCircle,
  Info
} from "lucide-react";
import { AmazonHtmlParser } from "@/components/product-flow/AmazonHtmlParser";
import { AmazonGroupAvailabilityModal } from "@/components/product-flow/AmazonGroupAvailabilityModal";
import { AmazonVariantPrefillModal } from "@/components/product-flow/AmazonVariantPrefillModal";
import { AmazonVariantPrefillParser } from "@/components/product-flow/AmazonVariantPrefillParser";

interface ParserInfo {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'working' | 'partial' | 'needs-improvement';
  capabilities: string[];
  limitations: string[];
}

const parsers: ParserInfo[] = [
  {
    id: 'amazon-html-parser',
    name: 'Amazon Get All Options  and Option ValuesParser',
    description: 'Extracts product options and variants from Amazon product pages',
    icon: <Globe className="h-5 w-5" />,
    status: 'working',
    capabilities: [
      'Extracts option types (size, color, etc.)',
      'Extracts option values for each type',
      'Saves to database automatically',
      'Avoids duplicate entries',
      'Handles complex Amazon HTML structure'
    ],
    limitations: [
      'Requires specific HTML element (twister-plus-inline-twister)',
      'May need page refresh for updated options',
      'Limited to Amazon product pages'
    ]
  },
  {
    id: 'amazon-group-availability',
    name: 'Amazon Organize Variants into Groups Parser',
    description: 'Determines which variant combinations are available in stock',
    icon: <Package className="h-5 w-5" />,
    status: 'working',
    capabilities: [
      'Parses availability for specific option combinations',
      'Identifies in-stock vs out-of-stock variants',
      'Handles dynamic option changes',
      'Updates variant availability status'
    ],
    limitations: [
      'Requires page refresh after option selection',
      'Amazon-specific implementation',
      'May not work with all product types'
    ]
  },
  {
    id: 'amazon-variant-prefill',
    name: 'Amazon Variant Prefill Parser',
    description: 'Extracts product identifiers and details from Amazon product pages',
    icon: <Search className="h-5 w-5" />,
    status: 'working',
    capabilities: [
      'Extracts UPC, ASIN, GTIN, EAN identifiers',
      'Extracts product specifications (Item Form, Brand, etc.)',
      'Parses Amazon product detail tables',
      'Handles multiple HTML formats',
      'Confidence scoring for data reliability',
      'Optimized for pet food listings'
    ],
    limitations: [
      'Requires specific Amazon HTML structure',
      'May miss data in non-standard formats',
      'Confidence scores based on data completeness'
    ]
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'working':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'partial':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'needs-improvement':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'working':
      return <CheckCircle className="h-4 w-4" />;
    case 'partial':
      return <AlertCircle className="h-4 w-4" />;
    case 'needs-improvement':
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <Info className="h-4 w-4" />;
  }
};

export default function ParserTester() {
  const [openParsers, setOpenParsers] = useState<string[]>([]);
  const [testFormState, setTestFormState] = useState<any>({
    parsedOptions: [],
    selectedOptionTypes: [],
    configuredVariants: []
  });

  const toggleParser = (parserId: string) => {
    setOpenParsers(prev => 
      prev.includes(parserId) 
        ? prev.filter(id => id !== parserId)
        : [...prev, parserId]
    );
  };

  const updateTestFormState = (updates: any) => {
    setTestFormState(prev => ({ ...prev, ...updates }));
  };

  const renderParserComponent = (parserId: string) => {
    switch (parserId) {
      case 'amazon-html-parser':
        return (
          <AmazonHtmlParser
            formState={testFormState}
            updateFormState={updateTestFormState}
            onComplete={() => console.log('Amazon HTML Parser completed')}
          />
        );
      case 'amazon-group-availability':
        return (
          <div className="p-4 border rounded-lg bg-muted/20">
            <p className="text-sm text-muted-foreground mb-4">
              This parser is used within the Amazon Variant Selector. 
              Click "Determine Active" on a variant group to test it.
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                // Simulate opening the modal
                console.log('Amazon Group Availability Parser would open here');
              }}
            >
              Test Group Availability Parser
            </Button>
          </div>
        );
       case 'amazon-variant-prefill':
         return (
           <AmazonVariantPrefillParser
             onExtract={(data) => {
               console.log('Extracted data:', data);
               // You can add more processing here if needed
             }}
           />
         );
      default:
        return <div className="p-4 text-muted-foreground">Parser component not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader 
        title="Parser Tester" 
        showBuildButton={true}
        showLookupButton={true}
        showDuplicatesButton={true}
        showAmazonButton={true}
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Parser Tester</h1>
            <p className="text-muted-foreground">
              Test and review the capabilities of our various HTML parsers. 
              Each parser is designed for specific use cases in the Amazon product workflow.
            </p>
          </div>

          <div className="space-y-4">
            {parsers.map((parser) => (
              <Card key={parser.id} className="border-l-4 border-l-primary/20">
                <Collapsible 
                  open={openParsers.includes(parser.id)}
                  onOpenChange={() => toggleParser(parser.id)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {openParsers.includes(parser.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div className="flex items-center gap-2">
                            {parser.icon}
                            <CardTitle className="text-lg">{parser.name}</CardTitle>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`${getStatusColor(parser.status)} flex items-center gap-1`}
                          >
                            {getStatusIcon(parser.status)}
                            {parser.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {parser.capabilities.length} capabilities
                          </Badge>
                        </div>
                      </div>
                      <CardDescription className="text-sm">
                        {parser.description}
                      </CardDescription>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Parser Component */}
                        <div>
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <Code className="h-4 w-4" />
                            Parser Component
                          </h4>
                          {renderParserComponent(parser.id)}
                        </div>
                        
                        {/* Parser Info */}
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-2 text-green-700">Capabilities</h4>
                            <ul className="text-sm space-y-1">
                              {parser.capabilities.map((capability, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                                  <span>{capability}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <div>
                            <h4 className="font-medium mb-2 text-amber-700">Limitations</h4>
                            <ul className="text-sm space-y-1">
                              {parser.limitations.map((limitation, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <AlertCircle className="h-3 w-3 text-amber-600 mt-0.5 flex-shrink-0" />
                                  <span>{limitation}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
