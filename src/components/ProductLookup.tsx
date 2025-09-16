import { useState, useEffect, useMemo } from "react";
import { Search, Package, ChevronRight, ChevronDown, Filter, Loader2, AlertTriangle, ExternalLink, ShoppingCart, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ScanResultModal } from "@/components/ScanResultModal";

interface ProductVariant {
  id: string;
  name: string;
  sku: string | null;
  base_weight: number | null;
  weight_unit: string;
  packaging_type: string | null;
  options: Array<{
    option_type: string;
    option_display_name: string;
    option_value: string;
    option_display_value: string;
    numeric_value: number | null;
    unit: string | null;
  }>;
  identifiers: Array<{
    identifier_type: string;
    identifier_value: string;
    is_primary: boolean;
  }>;
  sources: Array<{
    retailer_name: string;
    price: number | null;
    currency: string;
    availability: string;
    url: string | null;
  }>;
}

interface ProductLine {
  id: string;
  name: string;
  description: string | null;
  target_species: string[];
  brand: {
    id: string;
    name: string;
    website: string | null;
  };
  variants: ProductVariant[];
}

interface SearchFilters {
  brand: string[];
  species: string[];
  hasVariants: boolean;
  hasIdentifiers: boolean;
}

export const ProductLookup = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<SearchFilters>({
    brand: [],
    species: [],
    hasVariants: false,
    hasIdentifiers: false
  });
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableSpecies, setAvailableSpecies] = useState<string[]>([]);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");

  // Fetch all products and variants
  useEffect(() => {
    fetchAllProducts();
  }, []);

  const fetchAllProducts = async () => {
    setIsLoading(true);
    try {
      // Fetch product lines with their variants and related data
      const { data: productLinesData, error: productLinesError } = await supabase
        .from("product_variants_with_options")
        .select("*")
        .eq("is_active", true);

      if (productLinesError) throw productLinesError;

      // Group variants by product line
      const productLinesMap = new Map<string, ProductLine>();
      const brandsSet = new Set<string>();
      const speciesSet = new Set<string>();

      productLinesData?.forEach((variant: any) => {
        const productLineId = variant.product_line_id;
        
        if (!productLinesMap.has(productLineId)) {
          productLinesMap.set(productLineId, {
            id: productLineId,
            name: variant.product_line_name,
            description: null, // We'll need to fetch this separately
            target_species: [],
            brand: {
              id: "",
              name: variant.brand_name,
              website: null
            },
            variants: []
          });
        }

        // Add brand to available brands
        brandsSet.add(variant.brand_name);

        // Create variant object
        const variantObj: ProductVariant = {
          id: variant.id,
          name: variant.name,
          sku: variant.sku,
          base_weight: variant.base_weight,
          weight_unit: variant.weight_unit,
          packaging_type: variant.packaging_type,
          options: Array.isArray(variant.options) ? variant.options : [],
          identifiers: [], // We'll fetch these separately
          sources: [] // We'll fetch these separately
        };

        productLinesMap.get(productLineId)!.variants.push(variantObj);
      });

      // Fetch identifiers for all variants
      const variantIds = productLinesData?.map((v: any) => v.id) || [];
      if (variantIds.length > 0) {
        const { data: identifiersData, error: identifiersError } = await supabase
          .from("product_identifiers")
          .select("product_variant_id, identifier_type, identifier_value, is_primary")
          .in("product_variant_id", variantIds)
          .eq("is_active", true);

        if (!identifiersError && identifiersData) {
          identifiersData.forEach((identifier: any) => {
            const productLine = Array.from(productLinesMap.values()).find(pl => 
              pl.variants.some(v => v.id === identifier.product_variant_id)
            );
            if (productLine) {
              const variant = productLine.variants.find(v => v.id === identifier.product_variant_id);
              if (variant) {
                variant.identifiers.push({
                  identifier_type: identifier.identifier_type,
                  identifier_value: identifier.identifier_value,
                  is_primary: identifier.is_primary
                });
              }
            }
          });
        }
      }

      // Fetch sources for all variants
      if (variantIds.length > 0) {
        const { data: sourcesData, error: sourcesError } = await supabase
          .from("product_sources")
          .select("product_variant_id, retailer_name, price, currency, availability, url")
          .in("product_variant_id", variantIds)
          .eq("is_active", true);

        if (!sourcesError && sourcesData) {
          sourcesData.forEach((source: any) => {
            const productLine = Array.from(productLinesMap.values()).find(pl => 
              pl.variants.some(v => v.id === source.product_variant_id)
            );
            if (productLine) {
              const variant = productLine.variants.find(v => v.id === source.product_variant_id);
              if (variant) {
                variant.sources.push({
                  retailer_name: source.retailer_name,
                  price: source.price,
                  currency: source.currency,
                  availability: source.availability,
                  url: source.url
                });
              }
            }
          });
        }
      }

      // Fetch product line details
      const productLineIds = Array.from(productLinesMap.keys());
      if (productLineIds.length > 0) {
        const { data: productLineDetails, error: detailsError } = await supabase
          .from("product_lines")
          .select("id, description, target_species")
          .in("id", productLineIds);

        if (!detailsError && productLineDetails) {
          productLineDetails.forEach((detail: any) => {
            const productLine = productLinesMap.get(detail.id);
            if (productLine) {
              productLine.description = detail.description;
              productLine.target_species = detail.target_species || [];
              detail.target_species?.forEach((species: string) => speciesSet.add(species));
            }
          });
        }
      }

      setProductLines(Array.from(productLinesMap.values()));
      setAvailableBrands(Array.from(brandsSet).sort());
      setAvailableSpecies(Array.from(speciesSet).sort());

    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch product data."
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fuzzy search function
  const fuzzySearch = (text: string, query: string): boolean => {
    if (!query) return true;
    
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Exact match
    if (textLower.includes(queryLower)) return true;
    
    // Fuzzy match - check if all query characters appear in order
    let queryIndex = 0;
    for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
      if (textLower[i] === queryLower[queryIndex]) {
        queryIndex++;
      }
    }
    
    return queryIndex === queryLower.length;
  };

  // Filter and search products
  const filteredProducts = useMemo(() => {
    return productLines.filter(productLine => {
      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        
        // Search in product line name
        if (fuzzySearch(productLine.name, searchTerm)) return true;
        
        // Search in brand name
        if (fuzzySearch(productLine.brand.name, searchTerm)) return true;
        
        // Search in variant names
        if (productLine.variants.some(variant => fuzzySearch(variant.name, searchTerm))) return true;
        
        // Search in identifiers (UPC, ASIN, etc.)
        if (productLine.variants.some(variant => 
          variant.identifiers.some(identifier => 
            fuzzySearch(identifier.identifier_value, searchTerm)
          )
        )) return true;
        
        // Search in option types and values (Size, Flavor, etc.)
        if (productLine.variants.some(variant => 
          variant.options.some(option => 
            fuzzySearch(option.option_type, searchTerm) ||
            fuzzySearch(option.option_value, searchTerm) ||
            fuzzySearch(option.option_display_name, searchTerm) ||
            fuzzySearch(option.option_display_value, searchTerm)
          )
        )) return true;
        
        return false;
      }
      
      // Brand filter
      if (filters.brand.length > 0 && !filters.brand.includes(productLine.brand.name)) {
        return false;
      }
      
      // Species filter
      if (filters.species.length > 0 && !filters.species.some(species => 
        productLine.target_species.includes(species)
      )) {
        return false;
      }
      
      // Has variants filter
      if (filters.hasVariants && productLine.variants.length === 0) {
        return false;
      }
      
      // Has identifiers filter
      if (filters.hasIdentifiers && !productLine.variants.some(variant => 
        variant.identifiers.length > 0
      )) {
        return false;
      }
      
      return true;
    });
  }, [productLines, searchTerm, filters]);

  const toggleProductExpansion = (productId: string) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const clearFilters = () => {
    setFilters({
      brand: [],
      species: [],
      hasVariants: false,
      hasIdentifiers: false
    });
  };

  const hasActiveFilters = filters.brand.length > 0 || filters.species.length > 0 || 
                          filters.hasVariants || filters.hasIdentifiers;

  const handleVariantClick = (variantId: string) => {
    setSelectedVariantId(variantId);
    setScanModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Products
          </CardTitle>
          <CardDescription>
            Search by product name, brand, UPC, ASIN, or any identifier
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Search products, brands, UPC, ASIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            {isLoading && <Loader2 className="h-4 w-4 animate-spin self-center" />}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            {/* Brand Filter */}
            <Select
              value={filters.brand.length > 0 ? filters.brand[0] : "all"}
              onValueChange={(value) => setFilters(prev => ({ 
                ...prev, 
                brand: value === "all" ? [] : [value] 
              }))}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Brands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {availableBrands.map((brand) => (
                  <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Species Filter */}
            <Select
              value={filters.species.length > 0 ? filters.species[0] : "all"}
              onValueChange={(value) => setFilters(prev => ({ 
                ...prev, 
                species: value === "all" ? [] : [value] 
              }))}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Species" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Species</SelectItem>
                {availableSpecies.map((species) => (
                  <SelectItem key={species} value={species}>{species}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Checkbox Filters */}
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasVariants"
                  checked={filters.hasVariants}
                  onCheckedChange={(checked) => setFilters(prev => ({ 
                    ...prev, 
                    hasVariants: checked === true 
                  }))}
                />
                <Label htmlFor="hasVariants" className="text-sm">Has Variants</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasIdentifiers"
                  checked={filters.hasIdentifiers}
                  onCheckedChange={(checked) => setFilters(prev => ({ 
                    ...prev, 
                    hasIdentifiers: checked === true 
                  }))}
                />
                <Label htmlFor="hasIdentifiers" className="text-sm">Has UPC/ASIN</Label>
              </div>
            </div>

            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>

          {/* Results Count */}
          <div className="text-sm text-muted-foreground">
            Showing {filteredProducts.length} of {productLines.length} products
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      <div className="space-y-4">
        {filteredProducts.map((productLine) => (
          <Card key={productLine.id} className="shadow-elegant">
            <Collapsible
              open={expandedProducts.has(productLine.id)}
              onOpenChange={() => toggleProductExpansion(productLine.id)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        {productLine.name}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        <div className="flex items-center gap-4">
                          <span className="font-medium">{productLine.brand.name}</span>
                          {productLine.brand.website && (
                            <a 
                              href={productLine.brand.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Website
                            </a>
                          )}
                        </div>
                        {productLine.description && (
                          <p className="mt-1">{productLine.description}</p>
                        )}
                      </CardDescription>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {productLine.target_species.map((species) => (
                          <Badge key={species} variant="secondary">{species}</Badge>
                        ))}
                        <Badge variant="outline">
                          {productLine.variants.length} variant{productLine.variants.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {expandedProducts.has(productLine.id) ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {productLine.variants.map((variant) => (
                      <div key={variant.id} className="border rounded-lg p-4 bg-muted/30">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-lg">{variant.name}</h4>
                            
                            {/* Variant Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                              {/* Basic Info */}
                              <div>
                                <h5 className="text-sm font-medium text-muted-foreground mb-2">Details</h5>
                                <div className="space-y-1 text-sm">
                                  {variant.sku && (
                                    <div><span className="font-medium">SKU:</span> {variant.sku}</div>
                                  )}
                                  {variant.base_weight && (
                                    <div>
                                      <span className="font-medium">Weight:</span> {variant.base_weight} {variant.weight_unit}
                                    </div>
                                  )}
                                  {variant.packaging_type && (
                                    <div><span className="font-medium">Packaging:</span> {variant.packaging_type}</div>
                                  )}
                                </div>
                              </div>

                              {/* Identifiers */}
                              <div>
                                <h5 className="text-sm font-medium text-muted-foreground mb-2">Identifiers</h5>
                                {variant.identifiers.length > 0 ? (
                                  <div className="space-y-1">
                                    {variant.identifiers.map((identifier, index) => (
                                      <div key={index} className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                          {identifier.identifier_type}
                                        </Badge>
                                        <span className="text-sm font-mono">
                                          {identifier.identifier_value}
                                        </span>
                                        {identifier.is_primary && (
                                          <Badge variant="secondary" className="text-xs">Primary</Badge>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">No identifiers</span>
                                )}
                              </div>
                            </div>

                            {/* Options */}
                            {variant.options.length > 0 && (
                              <div className="mt-4">
                                <h5 className="text-sm font-medium text-muted-foreground mb-2">Options</h5>
                                <div className="flex flex-wrap gap-2">
                                  {variant.options.map((option, index) => (
                                    <Badge key={index} variant="outline">
                                      {option.option_display_name}: {option.option_display_value}
                                      {option.numeric_value && ` (${option.numeric_value}${option.unit || ''})`}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Sources */}
                            {variant.sources.length > 0 && (
                              <div className="mt-4">
                                <h5 className="text-sm font-medium text-muted-foreground mb-2">Available At</h5>
                                <div className="space-y-2">
                                  {variant.sources.map((source, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-background rounded border">
                                      <div className="flex items-center gap-3">
                                        <span className="font-medium">{source.retailer_name}</span>
                                        <Badge variant={source.availability === 'in_stock' ? 'secondary' : 'outline'}>
                                          {source.availability?.replace('_', ' ')}
                                        </Badge>
                                        {source.price && (
                                          <span className="font-semibold text-primary">
                                            ${source.price} {source.currency}
                                          </span>
                                        )}
                                      </div>
                                      {source.url && (
                                        <Button variant="outline" size="sm" asChild>
                                          <a href={source.url} target="_blank" rel="noopener noreferrer">
                                            <ShoppingCart className="h-4 w-4 mr-1" />
                                            Visit
                                          </a>
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleVariantClick(variant.id)}
                              className="flex items-center gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              View Scan Result
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}

        {/* Empty State */}
        {filteredProducts.length === 0 && !isLoading && (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No products found</h3>
              <p className="text-muted-foreground">
                {searchTerm || hasActiveFilters 
                  ? "Try adjusting your search terms or filters"
                  : "No products are currently available"
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Scan Result Modal */}
      <ScanResultModal
        isOpen={scanModalOpen}
        onClose={() => setScanModalOpen(false)}
        variantId={selectedVariantId}
      />
    </div>
  );
};
