import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Package, ExternalLink, ShoppingCart, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ProductData {
  variant: any;
  productLine: any;
  brand: any;
  ingredients: any[];
  options: any[];
  nutritionalAnalysis: any[];
  sources: any[];
}

export const ProductLookup = () => {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<ProductData[]>([]);

  useEffect(() => {
    fetchAllProducts();
  }, []);

  useEffect(() => {
    // Filter products based on search term
    if (!searchTerm.trim()) {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product => 
        product.variant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.productLine?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.variant.asin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.variant.lookup_key?.includes(searchTerm)
      );
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  const fetchAllProducts = async () => {
    setIsLoading(true);
    try {
      // Fetch all product variants with their related data
      const { data: variants, error: variantsError } = await supabase
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
        .limit(50); // Limit to prevent overwhelming the UI

      if (variantsError) {
        console.error("Error fetching variants:", variantsError);
        throw variantsError;
      }

      // For each variant, fetch additional data
      const productsWithData = await Promise.all(
        (variants || []).map(async (variant) => {
          try {
            // Fetch ingredients
            const { data: ingredients } = await supabase
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

            // Fetch variant options
            const { data: options } = await supabase
              .from('product_variant_options')
              .select(`
                product_option_values (
                  value,
                  product_options (
                    name,
                    label,
                    unit,
                    data_type
                  )
                )
              `)
              .eq('product_variant_id', variant.id);

            // Fetch nutritional analysis
            const { data: nutritionalAnalysis } = await supabase
              .from('nutritional_analysis')
              .select('*')
              .eq('product_line_id', variant.product_lines?.id);

            // Fetch product sources
            const { data: sources } = await supabase
              .from('product_sources')
              .select(`
                *,
                retailers (
                  name,
                  website
                )
              `)
              .eq('product_variant_id', variant.id);

            return {
              variant,
              productLine: variant.product_lines,
              brand: variant.product_lines?.brands,
              ingredients: ingredients?.map(i => i.ingredients).filter(Boolean) || [],
              options: options?.map(o => o.product_option_values).filter(Boolean) || [],
              nutritionalAnalysis: nutritionalAnalysis || [],
              sources: sources || []
            };
          } catch (error) {
            console.error(`Error fetching data for variant ${variant.id}:`, error);
            return {
              variant,
              productLine: variant.product_lines,
              brand: variant.product_lines?.brands,
              ingredients: [],
              options: [],
              nutritionalAnalysis: [],
              sources: []
            };
          }
        })
      );

      setProducts(productsWithData);
      setFilteredProducts(productsWithData);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch products. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 mb-6">
          <Input
            placeholder="Search products..."
            disabled
            className="flex-1"
          />
          <Button disabled>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Search products by name, brand, ASIN, or UPC..."
          value={searchTerm}
          onChange={handleSearch}
          className="flex-1"
        />
        <Button variant="outline">
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
        {searchTerm && ` for "${searchTerm}"`}
      </div>

      {/* Products Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.variant.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex flex-col md:flex-row gap-4">
                  {product.variant.image_url && (
                    <img 
                      src={product.variant.image_url} 
                      alt={product.variant.name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">
                      {product.variant.name || 'Unnamed Product'}
                    </CardTitle>
                    <CardDescription className="text-base mb-3">
                      {product.brand?.name && (
                        <span className="font-semibold">
                          {product.brand.name}
                          {product.brand.website && (
                            <a 
                              href={product.brand.website} 
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
                    <div className="flex flex-wrap gap-2 mb-3">
                      {product.variant.asin && (
                        <Badge variant="outline">ASIN: {product.variant.asin}</Badge>
                      )}
                      {product.variant.lookup_key && (
                        <Badge variant="outline">UPC: {product.variant.lookup_key}</Badge>
                      )}
                      {product.productLine?.target_species?.map((species: string) => (
                        <Badge key={species} variant="secondary">{species}</Badge>
                      ))}
                    </div>
                    {product.productLine?.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {product.productLine.description}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  {/* Ingredients */}
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      Ingredients
                    </h4>
                    {product.ingredients.length > 0 ? (
                      <div className="space-y-1">
                        {product.ingredients.slice(0, 3).map((ingredient) => (
                          <div key={ingredient.id} className="flex items-center gap-1">
                            <span className="truncate">{ingredient.name}</span>
                            {ingredient.is_toxic && (
                              <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />
                            )}
                          </div>
                        ))}
                        {product.ingredients.length > 3 && (
                          <div className="text-muted-foreground">
                            +{product.ingredients.length - 3} more
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-muted-foreground">No ingredients listed</div>
                    )}
                  </div>

                  {/* Options */}
                  <div>
                    <h4 className="font-semibold mb-2">Options</h4>
                    {product.options.length > 0 ? (
                      <div className="space-y-1">
                        {product.options.slice(0, 3).map((option, index) => (
                          <div key={index} className="text-muted-foreground">
                            {option.product_options?.label}: {option.value}
                            {option.product_options?.unit && ` ${option.product_options.unit}`}
                          </div>
                        ))}
                        {product.options.length > 3 && (
                          <div className="text-muted-foreground">
                            +{product.options.length - 3} more
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-muted-foreground">No options listed</div>
                    )}
                  </div>

                  {/* Nutrition */}
                  <div>
                    <h4 className="font-semibold mb-2">Nutrition</h4>
                    {product.nutritionalAnalysis.length > 0 ? (
                      <div className="space-y-1">
                        {product.nutritionalAnalysis.slice(0, 3).map((item) => (
                          <div key={item.id} className="text-muted-foreground">
                            {item.key}: {item.value} {item.unit}
                          </div>
                        ))}
                        {product.nutritionalAnalysis.length > 3 && (
                          <div className="text-muted-foreground">
                            +{product.nutritionalAnalysis.length - 3} more
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-muted-foreground">No nutrition data</div>
                    )}
                  </div>

                  {/* Sources */}
                  <div>
                    <h4 className="font-semibold mb-2">Available At</h4>
                    {product.sources.length > 0 ? (
                      <div className="space-y-1">
                        {product.sources.slice(0, 2).map((source) => (
                          <div key={source.id} className="flex items-center justify-between">
                            <span className="text-muted-foreground truncate">
                              {source.retailer_name}
                            </span>
                            {source.price && (
                              <span className="font-semibold text-primary text-xs">
                                ${source.price}
                              </span>
                            )}
                          </div>
                        ))}
                        {product.sources.length > 2 && (
                          <div className="text-muted-foreground">
                            +{product.sources.length - 2} more
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-muted-foreground">No sources listed</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm ? 'No products found' : 'No products available'}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? `No products match "${searchTerm}". Try a different search term.`
                : 'No products have been added to the database yet.'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
