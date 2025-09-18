import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, Package, ExternalLink, ShoppingCart, AlertTriangle, Edit, Trash2, Eye, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ScanResultsPopup } from "@/components/ScanResultsPopup";

interface ProductVariant {
  id: number;
  variant_name_suffix: string;
  form_factor: string;
  package_size_value: number;
  package_size_unit: string;
  image_url: string;
  ingredient_list_text: string;
  barcodes: any[];
  options: any[];
}

interface ProductModel {
  id: number;
  name: string;
  base_description: string;
  species: string;
  life_stage: string;
  brand: {
    id: number;
    name: string;
    website_url: string;
    manufacturer: string;
    country_of_origin: string;
  };
  variants: ProductVariant[];
}

export const ProductLookup = () => {
  const [productModels, setProductModels] = useState<ProductModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filteredProductModels, setFilteredProductModels] = useState<ProductModel[]>([]);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [editingProductModel, setEditingProductModel] = useState<ProductModel | null>(null);
  const [isScanResultsOpen, setIsScanResultsOpen] = useState(false);
  const [expandedProductModels, setExpandedProductModels] = useState<Set<number>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'productModel' | 'variant' | null;
    item: ProductModel | ProductVariant | null;
  }>({ type: null, item: null });

  useEffect(() => {
    fetchAllProducts();
  }, []);

  useEffect(() => {
    // Filter product models based on search term
    if (!searchTerm.trim()) {
      setFilteredProductModels(productModels);
    } else {
      const filtered = productModels.filter(productModel => {
        // Search in product model name and brand
        const matchesProductModel = productModel.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          productModel.brand?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Search in variants
        const matchesVariant = productModel.variants.some(variant => 
          variant.variant_name_suffix?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          variant.ingredient_list_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          variant.barcodes?.some(barcode => 
            barcode.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
          )
        );
        
        return matchesProductModel || matchesVariant;
      });
      setFilteredProductModels(filtered);
    }
  }, [searchTerm, productModels]);

  const fetchAllProducts = async () => {
    setIsLoading(true);
    try {
      // Fetch all product models with their variants
      const { data: productModels, error: productModelsError } = await supabase
        .from('product_models')
        .select(`
          *,
          brands (
            id,
            name,
            website_url,
            manufacturer,
            country_of_origin
          ),
          product_variants (
            *,
            barcodes (
              *
            )
          )
        `)
        .limit(50); // Limit to prevent overwhelming the UI

      if (productModelsError) {
        console.error("Error fetching product models:", productModelsError);
        throw productModelsError;
      }

      // Transform the data to group variants under their product models
      const transformedProductModels = (productModels || []).map(productModel => ({
        id: productModel.id,
        name: productModel.name,
        base_description: productModel.base_description,
        species: productModel.species,
        life_stage: productModel.life_stage,
        brand: productModel.brands,
        variants: (productModel.product_variants || []).map(variant => ({
          id: variant.id,
          variant_name_suffix: variant.variant_name_suffix,
          form_factor: variant.form_factor,
          package_size_value: variant.package_size_value,
          package_size_unit: variant.package_size_unit,
          image_url: variant.image_url,
          ingredient_list_text: variant.ingredient_list_text,
          barcodes: variant.barcodes || [],
          options: [] // Will be populated if needed
        }))
      }));

      setProductModels(transformedProductModels);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load products. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const toggleProductModel = (productModelId: number) => {
    setExpandedProductModels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productModelId)) {
        newSet.delete(productModelId);
      } else {
        newSet.add(productModelId);
      }
      return newSet;
    });
  };

  const expandAllProductModels = () => {
    const allIds = new Set(productModels.map(pm => pm.id));
    setExpandedProductModels(allIds);
  };

  const collapseAllProductModels = () => {
    setExpandedProductModels(new Set());
  };

  const handleEditVariant = (variant: ProductVariant, productModel: ProductModel) => {
    setEditingVariant(variant);
    setEditingProductModel(productModel);
    setIsScanResultsOpen(true);
  };

  const handleDeleteVariant = (variant: ProductVariant) => {
    setDeleteConfirm({ type: 'variant', item: variant });
  };

  const handleDeleteProductModel = (productModel: ProductModel) => {
    setDeleteConfirm({ type: 'productModel', item: productModel });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.item) return;

    try {
      if (deleteConfirm.type === 'variant') {
        const variant = deleteConfirm.item as ProductVariant;
        const { error } = await supabase
          .from('product_variants')
          .delete()
          .eq('id', variant.id);

        if (error) throw error;

        toast({
          title: "Success!",
          description: "Product variant deleted successfully."
        });
      } else if (deleteConfirm.type === 'productModel') {
        const productModel = deleteConfirm.item as ProductModel;
        const { error } = await supabase
          .from('product_models')
          .delete()
          .eq('id', productModel.id);

        if (error) throw error;

        toast({
          title: "Success!",
          description: "Product model and all its variants deleted successfully."
        });
      }

      // Refresh the products list
      fetchAllProducts();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete item."
      });
    } finally {
      setDeleteConfirm({ type: null, item: null });
    }
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

      {/* Results Count and Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {filteredProductModels.length} product model{filteredProductModels.length !== 1 ? 's' : ''} found
          {searchTerm && ` for "${searchTerm}"`}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={expandAllProductModels}
            disabled={filteredProductModels.length === 0}
          >
            Expand All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={collapseAllProductModels}
            disabled={filteredProductModels.length === 0}
          >
            Collapse All
          </Button>
        </div>
      </div>

      {/* Products Grid */}
      {filteredProductModels.length > 0 ? (
        <div className="grid gap-6">
          {filteredProductModels.map((productModel) => (
            <Card key={productModel.id} className="hover:shadow-md transition-shadow">
              <CardHeader 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleProductModel(productModel.id)}
              >
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">
                        {productModel.name}
                      </CardTitle>
                      {expandedProductModels.has(productModel.id) ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <CardDescription className="text-base mb-3">
                      {productModel.brand?.name && (
                        <span className="font-semibold">
                          {productModel.brand.name}
                          {productModel.brand.website_url && (
                            <a 
                              href={productModel.brand.website_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="ml-2 inline-flex items-center text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </span>
                      )}
                    </CardDescription>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {productModel.species && (
                        <Badge variant="secondary">{productModel.species}</Badge>
                      )}
                      {productModel.life_stage && (
                        <Badge variant="outline">{productModel.life_stage}</Badge>
                      )}
                      <Badge variant="outline">{productModel.variants.length} variant{productModel.variants.length !== 1 ? 's' : ''}</Badge>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProductModel(productModel);
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete Product
                      </Button>
                    </div>
                    {productModel.base_description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {productModel.base_description}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              {expandedProductModels.has(productModel.id) && (
                <CardContent>
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg">Variants</h4>
                    <div className="grid gap-3">
                      {productModel.variants.map((variant) => (
                      <Card key={variant.id} className="bg-muted/20">
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row gap-4">
                            {variant.image_url && (
                              <img 
                                src={variant.image_url} 
                                alt={variant.variant_name_suffix}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-semibold">{variant.variant_name_suffix}</h5>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditVariant(variant, productModel)}
                                  >
                                    <Edit className="h-3 w-3 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteVariant(variant)}
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2 mb-2">
                                {variant.barcodes?.slice(0, 3).map((barcode) => (
                                  <Badge key={barcode.id} variant="outline" className="text-xs">
                                    {barcode.barcode_type.toUpperCase()}: {barcode.barcode}
                                  </Badge>
                                ))}
                                {variant.barcodes?.length > 3 && (
                                  <Badge variant="outline" className="text-xs">+{variant.barcodes.length - 3} more</Badge>
                                )}
                                {variant.package_size_value && variant.package_size_unit && (
                                  <Badge variant="secondary" className="text-xs">
                                    {variant.package_size_value} {variant.package_size_unit}
                                  </Badge>
                                )}
                                {variant.form_factor && (
                                  <Badge variant="outline" className="text-xs">{variant.form_factor}</Badge>
                                )}
                              </div>
                              {variant.ingredient_list_text && (
                                <div className="text-sm text-muted-foreground line-clamp-2">
                                  {variant.ingredient_list_text}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
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

      {/* Scan Results Popup */}
      <ScanResultsPopup
        isOpen={isScanResultsOpen}
        onClose={() => {
          setIsScanResultsOpen(false);
          setEditingVariant(null);
          setEditingProductModel(null);
        }}
        variant={editingVariant}
        productModel={editingProductModel}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm.type !== null} onOpenChange={() => setDeleteConfirm({ type: null, item: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteConfirm.type === 'productModel' ? 'Delete Product Model' : 'Delete Product Variant'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm.type === 'productModel' ? (
                <>
                  Are you sure you want to delete <strong>{(deleteConfirm.item as ProductModel)?.name}</strong>? 
                  This will also delete all {deleteConfirm.item ? (deleteConfirm.item as ProductModel).variants.length : 0} variants associated with this product model.
                  <br /><br />
                  <strong>This action cannot be undone.</strong>
                </>
              ) : (
                <>
                  Are you sure you want to delete the variant <strong>{(deleteConfirm.item as ProductVariant)?.variant_name_suffix}</strong>?
                  <br /><br />
                  <strong>This action cannot be undone.</strong>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
