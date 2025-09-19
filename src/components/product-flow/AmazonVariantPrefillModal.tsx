import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertTriangle, FileText, Image, Tag, List } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AmazonVariantPrefillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrefill: (data: any) => void;
}

export const AmazonVariantPrefillModal = ({ isOpen, onClose, onPrefill }: AmazonVariantPrefillModalProps) => {
  const [htmlSnippet, setHtmlSnippet] = useState("");
  const [parsedData, setParsedData] = useState<any>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const { toast } = useToast();

  const parseAmazonHtml = (html: string) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const productData: any = {
        identifiers: []
      };

      // Extract image URL from imgTagWrapper
      const imgWrapper = doc.querySelector('.imgTagWrapper img');
      if (imgWrapper) {
        productData.imageUrl = imgWrapper.getAttribute('src') || '';
      } else {
        // Fallback to any Amazon image
        const imgElement = doc.querySelector('img[src*="media-amazon.com"]');
        if (imgElement) {
          productData.imageUrl = imgElement.getAttribute('src') || '';
        }
      }

      // Extract product title
      const titleElement = doc.querySelector('#productTitle');
      if (titleElement) {
        productData.productTitle = titleElement.textContent?.trim().replace(/"/g, '') || '';
      }

      // Extract identifiers with multiple methods
      console.log('Starting identifier extraction...');
      
      // Method 1: Product details table
      const productDetailsTable = doc.querySelector('table.a-keyvalue.prodDetTable, table.prodDetTable');
      if (productDetailsTable) {
        console.log('Found product details table');
        const rows = productDetailsTable.querySelectorAll('tr');
        rows.forEach((row) => {
          const th = row.querySelector('th');
          const td = row.querySelector('td');
          if (th && td) {
            const label = th.textContent?.trim();
            const value = td.textContent?.trim();
            
            if (label && value) {
              console.log(`Table row: ${label} = ${value}`);
              if (label.includes('ASIN')) {
                const asinValues = value.split(/\s+/).filter(v => v.trim());
                asinValues.forEach(asin => {
                  if (asin.trim()) {
                    const exists = productData.identifiers.some(id => id.type === 'ASIN' && id.value === asin.trim());
                    if (!exists) {
                      productData.identifiers.push({ type: 'ASIN', value: asin.trim() });
                      console.log(`Added ASIN: ${asin.trim()}`);
                    }
                  }
                });
              } else if (label.includes('UPC')) {
                const upcValues = value.split(/\s+/).filter(v => v.trim());
                upcValues.forEach(upc => {
                  if (upc.trim()) {
                    const exists = productData.identifiers.some(id => id.type === 'UPC' && id.value === upc.trim());
                    if (!exists) {
                      productData.identifiers.push({ type: 'UPC', value: upc.trim() });
                      console.log(`Added UPC: ${upc.trim()}`);
                    }
                  }
                });
              }
            }
          }
        });
      }

      // Method 2: List format with a-text-bold spans
      const identifierList = doc.querySelectorAll('li span.a-text-bold');
      console.log(`Found ${identifierList.length} bold spans in lists`);
      identifierList.forEach((span) => {
        const text = span.textContent?.trim();
        const parentLi = span.closest('li');
        if (parentLi && text) {
          console.log(`Bold span text: "${text}"`);
          const valueSpan = parentLi.querySelector('span:not(.a-text-bold)');
          if (valueSpan) {
            const value = valueSpan.textContent?.trim();
            console.log(`Value span text: "${value}"`);
            if (value) {
              if (text.includes('ASIN')) {
                const asinValues = value.split(/\s+/).filter(v => v.trim());
                asinValues.forEach(asin => {
                  if (asin.trim()) {
                    const exists = productData.identifiers.some(id => id.type === 'ASIN' && id.value === asin.trim());
                    if (!exists) {
                      productData.identifiers.push({ type: 'ASIN', value: asin.trim() });
                      console.log(`Added ASIN from list: ${asin.trim()}`);
                    }
                  }
                });
              } else if (text.includes('UPC')) {
                const upcValues = value.split(/\s+/).filter(v => v.trim());
                upcValues.forEach(upc => {
                  if (upc.trim()) {
                    const exists = productData.identifiers.some(id => id.type === 'UPC' && id.value === upc.trim());
                    if (!exists) {
                      productData.identifiers.push({ type: 'UPC', value: upc.trim() });
                      console.log(`Added UPC from list: ${upc.trim()}`);
                    }
                  }
                });
              }
            }
          }
        }
      });

      // Method 3: Look for any text containing "ASIN:" or "UPC:"
      const allTextElements = doc.querySelectorAll('*');
      allTextElements.forEach((element) => {
        const text = element.textContent?.trim();
        if (text && (text.includes('ASIN:') || text.includes('UPC:'))) {
          console.log(`Found identifier text: "${text}"`);
          
          // Extract ASIN values
          const asinMatches = text.match(/ASIN:\s*([A-Z0-9]+)/gi);
          if (asinMatches) {
            asinMatches.forEach(match => {
              const asin = match.replace(/ASIN:\s*/i, '').trim();
              if (asin) {
                const exists = productData.identifiers.some(id => id.type === 'ASIN' && id.value === asin);
                if (!exists) {
                  productData.identifiers.push({ type: 'ASIN', value: asin });
                  console.log(`Added ASIN from text: ${asin}`);
                }
              }
            });
          }
          
          // Extract UPC values
          const upcMatches = text.match(/UPC:\s*([0-9]+)/gi);
          if (upcMatches) {
            upcMatches.forEach(match => {
              const upc = match.replace(/UPC:\s*/i, '').trim();
              if (upc) {
                const exists = productData.identifiers.some(id => id.type === 'UPC' && id.value === upc);
                if (!exists) {
                  productData.identifiers.push({ type: 'UPC', value: upc });
                  console.log(`Added UPC from text: ${upc}`);
                }
              }
            });
          }
        }
      });

      console.log(`Total identifiers found: ${productData.identifiers.length}`);

      // Extract ingredients with comprehensive search
      console.log('Starting ingredients extraction...');
      let ingredients = '';
      
      // Method 1: Look for ingredients in the NIC content (expanded section)
      const nicIngredientsDiv = doc.querySelector('#nic-ingredients-content');
      if (nicIngredientsDiv) {
        console.log('Found NIC ingredients div');
        const ingredientsSpan = nicIngredientsDiv.querySelector('span');
        if (ingredientsSpan) {
          ingredients = ingredientsSpan.textContent?.trim() || '';
          console.log('Found ingredients in NIC content:', ingredients.substring(0, 100) + '...');
        }
      }
      
      // Method 2: Look for ingredients in content sections with h4 "Ingredients"
      if (!ingredients) {
        console.log('Searching content sections...');
        const contentSections = doc.querySelectorAll('.a-section.content, .content, div[class*="content"]');
        contentSections.forEach((section, index) => {
          console.log(`Checking content section ${index}`);
          const h4 = section.querySelector('h4');
          if (h4) {
            const h4Text = h4.textContent?.toLowerCase();
            console.log(`H4 text: "${h4Text}"`);
            if (h4Text && h4Text.includes('ingredients')) {
              const p = section.querySelector('p');
              if (p && p.textContent?.trim()) {
                ingredients = p.textContent.trim();
                console.log('Found ingredients in content section:', ingredients.substring(0, 100) + '...');
              }
            }
          }
        });
      }
      
      // Method 3: Look for ingredients in expander content
      if (!ingredients) {
        console.log('Searching expander content...');
        const expanderContent = doc.querySelectorAll('[data-expanded] .a-expander-content, .a-expander-section-content, .a-expander-content');
        expanderContent.forEach((content, index) => {
          console.log(`Checking expander content ${index}`);
          const text = content.textContent?.trim();
          if (text && text.toLowerCase().includes('ingredients')) {
            console.log(`Found ingredients text in expander: ${text.substring(0, 100)}...`);
            // Extract the ingredients part after "Ingredients:"
            const ingredientsMatch = text.match(/ingredients:\s*(.+)/i);
            if (ingredientsMatch) {
              ingredients = ingredientsMatch[1].trim();
              console.log('Found ingredients in expander content:', ingredients.substring(0, 100) + '...');
            }
          }
        });
      }
      
      // Method 4: Look for ingredients in any span that contains "Ingredients:"
      if (!ingredients) {
        console.log('Searching spans for ingredients...');
        const allSpans = doc.querySelectorAll('span');
        console.log(`Found ${allSpans.length} spans`);
        allSpans.forEach((span, index) => {
          const text = span.textContent?.trim();
          if (text && text.toLowerCase().includes('ingredients:')) {
            console.log(`Found ingredients in span ${index}: ${text.substring(0, 100)}...`);
            const ingredientsMatch = text.match(/ingredients:\s*(.+)/i);
            if (ingredientsMatch) {
              ingredients = ingredientsMatch[1].trim();
              console.log('Found ingredients in span:', ingredients.substring(0, 100) + '...');
            }
          }
        });
      }
      
      // Method 5: Look for ingredients in any div that contains "Ingredients"
      if (!ingredients) {
        console.log('Searching divs for ingredients...');
        const allDivs = doc.querySelectorAll('div');
        console.log(`Found ${allDivs.length} divs`);
        allDivs.forEach((div, index) => {
          const text = div.textContent?.trim();
          if (text && text.toLowerCase().includes('ingredients') && text.length > 50) {
            console.log(`Found div with ingredients text: ${text.substring(0, 100)}...`);
            // Check if this div has an h4 with "Ingredients" or contains "Ingredients:"
            const h4 = div.querySelector('h4');
            const hasIngredientsHeader = h4 && h4.textContent?.toLowerCase().includes('ingredients');
            const hasIngredientsColon = text.includes('Ingredients:');
            
            console.log(`Has ingredients header: ${hasIngredientsHeader}, Has ingredients colon: ${hasIngredientsColon}`);
            
            if (hasIngredientsHeader || hasIngredientsColon) {
              // Try to extract just the ingredients part
              const ingredientsMatch = text.match(/ingredients:\s*(.+)/i);
              if (ingredientsMatch) {
                ingredients = ingredientsMatch[1].trim();
                console.log('Found ingredients in div:', ingredients.substring(0, 100) + '...');
              } else if (hasIngredientsHeader) {
                // If we have an h4 with "Ingredients", get the text from the next p element
                const p = div.querySelector('p');
                if (p && p.textContent?.trim()) {
                  ingredients = p.textContent.trim();
                  console.log('Found ingredients in div with h4:', ingredients.substring(0, 100) + '...');
                }
              }
            }
          }
        });
      }
      
      // Method 6: Look for any element containing "Ingredients:" followed by ingredient list
      if (!ingredients) {
        console.log('Searching all elements for ingredients pattern...');
        const allElements = doc.querySelectorAll('*');
        allElements.forEach((element, index) => {
          const text = element.textContent?.trim();
          if (text && text.includes('Ingredients:') && text.length > 100) {
            console.log(`Found element with ingredients pattern: ${text.substring(0, 100)}...`);
            const ingredientsMatch = text.match(/ingredients:\s*(.+)/i);
            if (ingredientsMatch) {
              ingredients = ingredientsMatch[1].trim();
              console.log('Found ingredients in element:', ingredients.substring(0, 100) + '...');
            }
          }
        });
      }
      
      // Clean up the ingredients text
      if (ingredients) {
        console.log('Cleaning up ingredients text...');
        // Remove any HTML entities and clean up the text
        ingredients = ingredients
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, ' ')
          .trim();
        
        productData.ingredients = ingredients;
        console.log('Final ingredients extracted:', ingredients.substring(0, 200) + (ingredients.length > 200 ? '...' : ''));
      } else {
        console.log('No ingredients found in HTML');
      }

      return productData;
    } catch (error) {
      console.error('Error parsing Amazon HTML:', error);
      throw new Error('Failed to parse HTML. Please ensure you copied the complete Amazon product page HTML.');
    }
  };

  const handleParse = async () => {
    if (!htmlSnippet.trim()) {
      setParseError('Please paste the Amazon HTML snippet');
      return;
    }

    setIsParsing(true);
    setParseError(null);

    try {
      const data = parseAmazonHtml(htmlSnippet);
      setParsedData(data);
      
      const extractedFields = [];
      if (data.imageUrl) extractedFields.push("image");
      if (data.productTitle) extractedFields.push("title");
      if (data.identifiers.length > 0) extractedFields.push(`${data.identifiers.length} identifier${data.identifiers.length !== 1 ? 's' : ''}`);
      if (data.ingredients) extractedFields.push("ingredients");
      
      toast({
        title: "Success",
        description: `Product data extracted successfully! Found: ${extractedFields.join(', ')}`
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse HTML';
      setParseError(errorMessage);
    } finally {
      setIsParsing(false);
    }
  };

  const handlePrefill = () => {
    if (parsedData) {
      onPrefill(parsedData);
      handleClose();
    }
  };

  const handleClose = () => {
    setHtmlSnippet("");
    setParsedData(null);
    setParseError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Prefill Variant with Amazon Data
          </DialogTitle>
          <DialogDescription>
            Paste Amazon product HTML to automatically extract product data for this variant, including ingredients, image, title, and identifiers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* HTML Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Paste Amazon HTML</CardTitle>
              <CardDescription>
                Copy the complete HTML from an Amazon product page. The parser will extract ingredients, product title, image URL, and identifiers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Paste Amazon HTML here..."
                value={htmlSnippet}
                onChange={(e) => setHtmlSnippet(e.target.value)}
                rows={8}
                className="font-mono text-xs"
              />
              <Button 
                onClick={handleParse} 
                disabled={isParsing || !htmlSnippet.trim()}
                className="w-full"
              >
                {isParsing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Parse HTML
              </Button>
              {parseError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Parsing Error</span>
                  </div>
                  <p className="text-sm text-destructive mt-1">{parseError}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Parsed Results */}
          {parsedData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  Extracted Product Data
                </CardTitle>
                <CardDescription>
                  Review the extracted data before applying to your variant
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {parsedData.imageUrl && (
                  <div className="flex items-center gap-3">
                    <Image className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Product Image</p>
                      <img src={parsedData.imageUrl} alt="Product" className="w-20 h-20 object-cover rounded border mt-1" />
                    </div>
                  </div>
                )}
                
                {parsedData.productTitle && (
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Product Title</p>
                      <p className="text-sm text-muted-foreground">{parsedData.productTitle}</p>
                    </div>
                  </div>
                )}

                {parsedData.identifiers.length > 0 && (
                  <div className="flex items-center gap-3">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Product Identifiers</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {parsedData.identifiers.map((id: any, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {id.type}: {id.value}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {parsedData.ingredients && (
                  <div className="flex items-start gap-3">
                    <List className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Ingredients</p>
                      <div className="mt-1 p-3 bg-muted/20 rounded-lg border">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                          {parsedData.ingredients}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {parsedData.ingredients.length} characters extracted
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {parsedData && (
              <Button onClick={handlePrefill} className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Apply to Variant
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
