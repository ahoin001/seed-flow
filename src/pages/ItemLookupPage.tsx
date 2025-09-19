import { useState, useCallback, useEffect } from "react";
import { Search, Package, AlertTriangle, Loader2, ExternalLink, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { NavigationHeader } from "@/components/NavigationHeader";
import { ProductLookup } from "@/components/ProductLookup";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ProductData {
  variant: any;
  productLine: any;
  brand: any;
  ingredients: any[];
  options: any[];
  nutritionalAnalysis: any[];
  sources: any[];
}

const ItemLookupPage = () => {
  const [activeTab, setActiveTab] = useState("browse");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Auto-detect input type
  const detectInputType = (input: string) => {
    const cleanInput = input.trim();
    if (/^[A-Z0-9]{10}$/i.test(cleanInput)) {
      return 'asin';
    } else if (/^\d{12,13}$/.test(cleanInput)) {
      return 'upc';
    }
    return 'unknown';
  };

  // Validate input format
  const validateInput = (input: string) => {
    const type = detectInputType(input);
    if (type === 'unknown') {
      return { valid: false, message: "Please enter a valid 10-character ASIN or 12-13 digit UPC" };
    }
    return { valid: true, type };
  };

  // Fetch product data
  const fetchProductData = async (searchValue: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Step 1: Lookup product variant
      const { data: variant, error: variantError } = await supabase
        .from('product_variants')
        .select(`
          *,
          product_lines (
            id,
            name,
            description,
            target_species,
            brands (
              id,
              name,
              website,
              contact_email
            )
          )
        `)
        .or(`asin.eq.${searchValue},lookup_key.eq.${searchValue}`)
        .single();

      if (variantError || !variant) {
        setError("Product not found. Please check the ASIN or UPC and try again.");
        setProductData(null);
        return;
      }

      // Step 2: Fetch ingredients
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('product_variant_ingredients')
        .select(`
          ingredients (
            id,
            name,
            is_toxic,
            is_controversial,
            notes,
            tags
          )
        `)
        .eq('product_variant_id', variant.id);

      // Step 3: Fetch related data (flavors, formulations, package types)
      const [flavorResult, formulationResult, packageTypeResult] = await Promise.all([
        variant.flavor_id ? supabase.from('flavors').select('*').eq('id', variant.flavor_id).single() : Promise.resolve({ data: null, error: null }),
        variant.formulation_id ? supabase.from('formulations').select('*').eq('id', variant.formulation_id).single() : Promise.resolve({ data: null, error: null }),
        variant.package_type_id ? supabase.from('package_types').select('*').eq('id', variant.package_type_id).single() : Promise.resolve({ data: null, error: null })
      ]);

      // Step 5: Fetch product sources
      const { data: sources, error: sourcesError } = await supabase
        .from('product_sources')
        .select(`
          *,
          retailers (
            name,
            website
          )
        `)
        .eq('product_variant_id', variant.id);

      setProductData({
        variant,
        productLine: variant.product_lines,
        brand: variant.product_lines?.brands,
        ingredients: ingredients?.map(i => i.ingredients).filter(Boolean) || [],
        options: [], // Simplified for now - can be enhanced later
        nutritionalAnalysis: [], // Simplified for now - can be enhanced later
        sources: [] // Simplified for now - can be enhanced later
      });

    } catch (err) {
      console.error('Error fetching product data:', err);
      setError("An error occurred while searching. Please try again.");
      toast({
        variant: "destructive",
        title: "Search Error",
        description: "Failed to fetch product data. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search
  const debouncedSearch = useCallback(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        const validation = validateInput(searchTerm);
        if (validation.valid) {
          fetchProductData(searchTerm.trim());
        } else {
          setError(validation.message);
        }
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    const cleanup = debouncedSearch();
    return cleanup;
  }, [debouncedSearch]);

  const handleSearch = () => {
    if (searchTerm.trim()) {
      const validation = validateInput(searchTerm);
      if (validation.valid) {
        fetchProductData(searchTerm.trim());
      } else {
        setError(validation.message);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <NavigationHeader title="Product Lookup" showBuildButton={true} showDuplicatesButton={true} showParserTesterButton={true} />
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            Product Lookup
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Browse all products or search by specific UPC/ASIN codes
          </p>
        </div>

        {/* Tab Navigation */}
        <Card className="max-w-4xl mx-auto mb-8 shadow-elegant">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="browse">Browse All Products</TabsTrigger>
              <TabsTrigger value="search">Search by UPC/ASIN</TabsTrigger>
            </TabsList>

            <TabsContent value="browse" className="mt-6">
              <ProductLookup />
            </TabsContent>

            <TabsContent value="search" className="mt-6">
              {/* Search Form */}
              <Card className="max-w-2xl mx-auto mb-8 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Product
            </CardTitle>
            <CardDescription>
              Enter a 10-character ASIN or 12-13 digit UPC to find product details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter ASIN or UPC..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
                disabled={isLoading}
              />
              <Button 
                onClick={handleSearch} 
                disabled={isLoading || !searchTerm.trim()}
                variant="premium"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            {error && (
              <div className="mt-3 text-sm text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <Card className="max-w-4xl mx-auto shadow-elegant">
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !productData && !error && (
          <Card className="max-w-2xl mx-auto shadow-elegant">
            <CardContent className="p-12 text-center">
              <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Enter an ASIN or UPC to begin search</h3>
              <p className="text-muted-foreground">
                Search our database for detailed product information, ingredients, and pricing
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {productData && (
          <Card className="max-w-6xl mx-auto shadow-elegant">
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-4">
                {productData.variant.image_url && (
                  <img 
                    src={productData.variant.image_url} 
                    alt={productData.variant.name}
                    className="w-32 h-32 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-2">
                    {productData.variant.name || 'Unnamed Product'}
                  </CardTitle>
                  <CardDescription className="text-base mb-3">
                    {productData.brand?.name && (
                      <span className="font-semibold">
                        {productData.brand.name}
                        {productData.brand.website && (
                          <a 
                            href={productData.brand.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="ml-2 inline-flex items-center text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </span>
                    )}
                  </CardDescription>
                  <div className="flex flex-wrap gap-2">
                    {productData.variant.asin && (
                      <Badge variant="outline">ASIN: {productData.variant.asin}</Badge>
                    )}
                    {productData.variant.lookup_key && (
                      <Badge variant="outline">UPC: {productData.variant.lookup_key}</Badge>
                    )}
                    {productData.productLine?.target_species?.map((species: string) => (
                      <Badge key={species} variant="secondary">{species}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
                  <TabsTrigger value="options">Options</TabsTrigger>
                  <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
                  <TabsTrigger value="sources">Where to Buy</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Product Information</h3>
                    <p className="text-muted-foreground">
                      {productData.productLine?.description || 'No description available'}
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="ingredients" className="space-y-4">
                  <h3 className="text-lg font-semibold mb-4">Ingredients List</h3>
                  {productData.ingredients.length > 0 ? (
                    <div className="grid gap-3">
                      {productData.ingredients.map((ingredient) => (
                        <Card key={ingredient.id} className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{ingredient.name}</h4>
                              {ingredient.notes && (
                                <p className="text-sm text-muted-foreground mt-1">{ingredient.notes}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {ingredient.is_toxic && (
                                <Badge variant="destructive">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Toxic
                                </Badge>
                              )}
                              {ingredient.is_controversial && (
                                <Badge variant="warning">Controversial</Badge>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No ingredient information available</p>
                  )}
                </TabsContent>

                <TabsContent value="options" className="space-y-4">
                  <h3 className="text-lg font-semibold mb-4">Product Options</h3>
                  {productData.options.length > 0 ? (
                    <div className="grid gap-3">
                      {productData.options.map((option, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">
                              {option.product_options?.label || option.product_options?.name}
                            </span>
                            <span className="text-muted-foreground">
                              {option.value}
                              {option.product_options?.unit && ` ${option.product_options.unit}`}
                            </span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No product options available</p>
                  )}
                </TabsContent>

                <TabsContent value="nutrition" className="space-y-4">
                  <h3 className="text-lg font-semibold mb-4">Nutritional Analysis</h3>
                  {productData.nutritionalAnalysis.length > 0 ? (
                    <div className="grid gap-3">
                      {productData.nutritionalAnalysis.map((item) => (
                        <Card key={item.id} className="p-4">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{item.key}</span>
                            <span className="text-muted-foreground">
                              {item.value} {item.unit}
                            </span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No nutritional analysis available</p>
                  )}
                </TabsContent>

                <TabsContent value="sources" className="space-y-4">
                  <h3 className="text-lg font-semibold mb-4">Available Sources</h3>
                  {productData.sources.length > 0 ? (
                    <div className="grid gap-4">
                      {productData.sources.map((source) => (
                        <Card key={source.id} className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{source.retailer_name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={source.availability === 'in_stock' ? 'secondary' : 'outline'}>
                                  {source.availability?.replace('_', ' ')}
                                </Badge>
                                {source.price && (
                                  <span className="text-lg font-semibold text-primary">
                                    ${source.price} {source.currency}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                              <a href={source.url} target="_blank" rel="noopener noreferrer">
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Visit Store
                              </a>
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No purchase sources available</p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default ItemLookupPage;