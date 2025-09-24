import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Package, 
  Tag, 
  Image, 
  FileText,
  Copy,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExtractedData {
  identifiers: Array<{
    type: string;
    value: string;
  }>;
  productDetails: {
    itemForm?: string;
    brandName?: string;
    flavor?: string;
    ageRange?: string;
    containerType?: string;
    breedRecommendation?: string;
    allergenInfo?: string;
    specialIngredients?: string;
    manufacturer?: string;
    specificUses?: string;
    occasion?: string;
    dogBreedSize?: string;
    animalFoodIngredientClaim?: string;
    animalFoodNutrientContentClaim?: string;
    animalFoodDietType?: string;
    itemTypeName?: string;
  };
  ingredients: string[];
  imageUrl?: string;
  specifications: {
    itemHeight?: string;
    itemWeight?: string;
    dimensions?: string;
  };
  confidence: {
    identifiers: number;
    productDetails: number;
    ingredients: number;
    imageUrl: number;
    specifications: number;
  };
}

interface AmazonVariantPrefillParserProps {
  onExtract?: (data: ExtractedData) => void;
  onClose?: () => void;
}

export function AmazonVariantPrefillParser({ onExtract, onClose }: AmazonVariantPrefillParserProps) {
  const [htmlInput, setHtmlInput] = useState("");
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const parseHtml = (html: string): ExtractedData => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const extractedData: ExtractedData = {
      identifiers: [],
      productDetails: {},
      ingredients: [],
      imageUrl: undefined,
      specifications: {},
      confidence: {
        identifiers: 0,
        productDetails: 0,
        ingredients: 0,
        imageUrl: 0,
        specifications: 0
      }
    };

    let identifierCount = 0;
    let productDetailCount = 0;
    let ingredientCount = 0;
    let imageUrlCount = 0;
    let specificationCount = 0;

    // Extract from product detail table
    const detailTable = doc.querySelector('.a-keyvalue.prodDetTable');
    if (detailTable) {
      const rows = detailTable.querySelectorAll('tr');
      
      rows.forEach(row => {
        const th = row.querySelector('th.a-color-secondary.a-size-base.prodDetSectionEntry');
        const td = row.querySelector('td.a-size-base.prodDetAttrValue');
        
        if (th && td) {
          const label = th.textContent?.trim().toLowerCase();
          const value = td.textContent?.trim();
          
          if (label && value) {
            // Extract identifiers - look for specific identifier types
            if (label.includes('upc')) {
              // Split by spaces and filter out empty strings
              const upcCodes = value.split(/\s+/).filter(code => code.trim().length > 0);
              upcCodes.forEach(code => {
                extractedData.identifiers.push({ type: 'UPC', value: code.trim() });
                identifierCount++;
              });
            } else if (label.includes('asin')) {
              // Split by spaces and filter out empty strings
              const asinCodes = value.split(/\s+/).filter(code => code.trim().length > 0);
              asinCodes.forEach(code => {
                extractedData.identifiers.push({ type: 'ASIN', value: code.trim() });
                identifierCount++;
              });
            } else if (label.includes('ean')) {
              // Split by spaces and filter out empty strings
              const eanCodes = value.split(/\s+/).filter(code => code.trim().length > 0);
              eanCodes.forEach(code => {
                extractedData.identifiers.push({ type: 'EAN', value: code.trim() });
                identifierCount++;
              });
            }
            
            // Extract product details
            else if (label.includes('item form')) {
              extractedData.productDetails.itemForm = value;
              productDetailCount++;
            } else if (label.includes('brand name')) {
              extractedData.productDetails.brandName = value;
              productDetailCount++;
            } else if (label.includes('flavor')) {
              extractedData.productDetails.flavor = value;
              productDetailCount++;
            } else if (label.includes('age range')) {
              extractedData.productDetails.ageRange = value;
              productDetailCount++;
            } else if (label.includes('container type')) {
              extractedData.productDetails.containerType = value;
              productDetailCount++;
            } else if (label.includes('breed recommendation')) {
              extractedData.productDetails.breedRecommendation = value;
              productDetailCount++;
            } else if (label.includes('allergen information')) {
              extractedData.productDetails.allergenInfo = value;
              productDetailCount++;
            } else if (label.includes('special ingredients')) {
              extractedData.productDetails.specialIngredients = value;
              productDetailCount++;
            } else if (label.includes('manufacturer')) {
              extractedData.productDetails.manufacturer = value;
              productDetailCount++;
            } else if (label.includes('specific uses for product')) {
              extractedData.productDetails.specificUses = value;
              productDetailCount++;
            } else if (label.includes('occasion')) {
              extractedData.productDetails.occasion = value;
              productDetailCount++;
            } else if (label.includes('dog breed size')) {
              extractedData.productDetails.dogBreedSize = value;
              productDetailCount++;
            } else if (label.includes('animal food ingredient claim')) {
              extractedData.productDetails.animalFoodIngredientClaim = value;
              productDetailCount++;
            } else if (label.includes('animal food nutrient content claim')) {
              extractedData.productDetails.animalFoodNutrientContentClaim = value;
              productDetailCount++;
            } else if (label.includes('animal food diet type')) {
              extractedData.productDetails.animalFoodDietType = value;
              productDetailCount++;
            } else if (label.includes('item type name')) {
              extractedData.productDetails.itemTypeName = value;
              productDetailCount++;
            }
            
            // Extract specifications
            else if (label.includes('item height')) {
              extractedData.specifications.itemHeight = value;
              specificationCount++;
            } else if (label.includes('item weight')) {
              extractedData.specifications.itemWeight = value;
              specificationCount++;
            } else if (label.includes('dimensions')) {
              extractedData.specifications.dimensions = value;
              specificationCount++;
            }
          }
        }
      });
    }

    // Extract from alternative product details format
    const altRows = doc.querySelectorAll('tr.a-spacing-small.po-item_form, tr[class*="po-"]');
    altRows.forEach(row => {
      const labelSpan = row.querySelector('span.a-size-base.a-text-bold');
      const valueSpan = row.querySelector('span.a-size-base.po-break-word');
      
      if (labelSpan && valueSpan) {
        const label = labelSpan.textContent?.trim().toLowerCase();
        const value = valueSpan.textContent?.trim();
        
        if (label && value) {
          if (label.includes('item form')) {
            extractedData.productDetails.itemForm = value;
            productDetailCount++;
          }
        }
      }
    });

    // Extract ingredients from the ingredients section
    const ingredientsSection = doc.querySelector('#nic-ingredients-content');
    if (ingredientsSection) {
      const ingredientsText = ingredientsSection.textContent?.trim();
      if (ingredientsText) {
        // Split by comma and clean up each ingredient
        const ingredients = ingredientsText
          .split(',')
          .map(ingredient => ingredient.trim())
          .filter(ingredient => ingredient.length > 0);
        
        extractedData.ingredients = ingredients;
        ingredientCount = ingredients.length;
      }
    }

    // Also look for ingredients in special ingredients field
    if (extractedData.productDetails.specialIngredients) {
      const specialIngredients = extractedData.productDetails.specialIngredients
        .split(',')
        .map(ingredient => ingredient.trim())
        .filter(ingredient => ingredient.length > 0);
      
      // Merge with existing ingredients, avoiding duplicates
      specialIngredients.forEach(ingredient => {
        if (!extractedData.ingredients.includes(ingredient)) {
          extractedData.ingredients.push(ingredient);
        }
      });
    }

    // Extract image URL from various possible locations
    const imageSelectors = [
      '#landingImage', // Main product image
      '.a-dynamic-image', // Dynamic product images
      '#imgTagWrapperId img', // Image wrapper
      '.a-spacing-small img', // Small spacing images
      'img[data-old-hires]', // High resolution images
      'img[data-a-dynamic-image]' // Dynamic images
    ];

    for (const selector of imageSelectors) {
      const imgElement = doc.querySelector(selector) as HTMLImageElement;
      if (imgElement && imgElement.src) {
        // Clean up the image URL (remove size parameters)
        let imageUrl = imgElement.src;
        if (imageUrl.includes('._')) {
          // Remove Amazon's size parameters (e.g., ._AC_SX679_.)
          imageUrl = imageUrl.replace(/\._[^_]+_\./g, '.');
        }
        extractedData.imageUrl = imageUrl;
        imageUrlCount = 1;
        break;
      }
    }

    // Calculate confidence scores
    extractedData.confidence.identifiers = Math.min(100, (identifierCount / 3) * 100); // Removed GTIN, now 3 types
    extractedData.confidence.productDetails = Math.min(100, (productDetailCount / 15) * 100);
    extractedData.confidence.ingredients = Math.min(100, (ingredientCount / 5) * 100);
    extractedData.confidence.imageUrl = Math.min(100, imageUrlCount * 100);
    extractedData.confidence.specifications = Math.min(100, (specificationCount / 3) * 100);

    return extractedData;
  };

  const handleParse = async () => {
    if (!htmlInput.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter HTML content to parse."
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const data = parseHtml(htmlInput);
      setExtractedData(data);
      
      toast({
        title: "Success",
        description: `Extracted ${Object.keys(data.identifiers).length + Object.keys(data.productDetails).length + Object.keys(data.specifications).length} data points.`
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to parse HTML. Please check the format."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseData = () => {
    if (extractedData && onExtract) {
      // Add parsed Item Form to the extracted data
      const dataWithItemForm = {
        ...extractedData,
        parsedItemForm: extractedData.productDetails.itemForm
      };
      onExtract(dataWithItemForm);
      toast({
        title: "Success",
        description: "Data extracted and ready to use."
      });
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="space-y-6">
      {/* HTML Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Amazon Product HTML Parser
          </CardTitle>
          <CardDescription>
            Paste HTML from Amazon product pages to extract product identifiers and details.
            Focus on pet food listings for best results.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="html-input">HTML Content</Label>
            <Textarea
              id="html-input"
              value={htmlInput}
              onChange={(e) => setHtmlInput(e.target.value)}
              placeholder="Paste Amazon product HTML here..."
              rows={8}
              className="font-mono text-sm"
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleParse} 
              disabled={isLoading || !htmlInput.trim()}
              className="gap-2"
            >
              <Search className="h-4 w-4" />
              {isLoading ? "Parsing..." : "Parse HTML"}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setHtmlInput("")}
              disabled={!htmlInput.trim()}
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Extracted Data Display */}
      {extractedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Extracted Data
            </CardTitle>
            <CardDescription>
              Review the extracted information below. Confidence scores indicate data reliability.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Identifiers */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Product Identifiers
                </h4>
                <Badge className={getConfidenceBadge(extractedData.confidence.identifiers)}>
                  {Math.round(extractedData.confidence.identifiers)}% confidence
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {extractedData.identifiers.map((identifier, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/20">
                    <Badge variant="outline" className="text-xs">{identifier.type}</Badge>
                    <span className="font-mono text-sm flex-1">{identifier.value}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigator.clipboard.writeText(identifier.value)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Product Details */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Product Details
                </h4>
                <Badge className={getConfidenceBadge(extractedData.confidence.productDetails)}>
                  {Math.round(extractedData.confidence.productDetails)}% confidence
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(extractedData.productDetails).map(([key, value]) => (
                  <div key={key} className="p-3 border rounded-lg bg-muted/20">
                    <div className="text-xs text-muted-foreground mb-1 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="text-sm font-medium">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Image URL */}
            {extractedData.imageUrl && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Product Image
                  </h4>
                  <Badge className={getConfidenceBadge(extractedData.confidence.imageUrl)}>
                    {Math.round(extractedData.confidence.imageUrl)}% confidence
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/20">
                    <span className="font-mono text-sm flex-1 break-all">{extractedData.imageUrl}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigator.clipboard.writeText(extractedData.imageUrl!)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex justify-center">
                    <img 
                      src={extractedData.imageUrl} 
                      alt="Product preview" 
                      className="max-w-xs max-h-48 object-contain border rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Ingredients */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Ingredients
                </h4>
                <Badge className={getConfidenceBadge(extractedData.confidence.ingredients)}>
                  {Math.round(extractedData.confidence.ingredients)}% confidence
                </Badge>
              </div>
              
              <div className="space-y-2">
                {extractedData.ingredients.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {extractedData.ingredients.map((ingredient, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {ingredient}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">
                    No ingredients found
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Specifications */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Specifications
                </h4>
                <Badge className={getConfidenceBadge(extractedData.confidence.specifications)}>
                  {Math.round(extractedData.confidence.specifications)}% confidence
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(extractedData.specifications).map(([key, value]) => (
                  <div key={key} className="p-3 border rounded-lg bg-muted/20">
                    <div className="text-xs text-muted-foreground mb-1 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="text-sm font-medium">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handleUseData} className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Use This Data
              </Button>
              <Button variant="outline" onClick={() => setExtractedData(null)}>
                Parse Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
