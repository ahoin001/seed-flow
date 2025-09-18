import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  RefreshCw, 
  Trash2, 
  CheckCircle, 
  Package, 
  Barcode,
  Loader2,
  Eye,
  EyeOff
} from "lucide-react";
import { NavigationHeader } from "@/components/NavigationHeader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DuplicateGroup {
  id: string;
  name: string;
  ingredients: string;
  variants: Array<{
    id: number;
    name: string;
    brand: string;
    skus: Array<{
      upc?: string;
      ean?: string;
      asin?: string;
    }>;
    created_at: string;
  }>;
  total_variants: number;
  total_skus: number;
}

interface DuplicateVariant {
  id: number;
  name: string;
  brand: string;
  ingredients: string;
  skus: Array<{
    upc?: string;
    ean?: string;
    asin?: string;
  }>;
  created_at: string;
  isSelected: boolean;
}

const DuplicatesPage = () => {
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Set<number>>(new Set());
  const [showResolved, setShowResolved] = useState(false);
  const { toast } = useToast();

  // Fetch duplicate groups
  const fetchDuplicates = async () => {
    setIsLoading(true);
    try {
      // This is a complex query to find duplicates
      // We'll need to create a function in Supabase for this
      const { data, error } = await supabase.rpc('find_duplicate_products');
      
      if (error) {
        console.error('Error fetching duplicates:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch duplicate products."
        });
        return;
      }

      setDuplicateGroups(data || []);
    } catch (err) {
      console.error('Error:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while fetching duplicates."
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh duplicates
  const refreshDuplicates = async () => {
    setIsRefreshing(true);
    await fetchDuplicates();
    setIsRefreshing(false);
  };

  // Select variant for keeping
  const toggleVariantSelection = (variantId: number) => {
    setSelectedVariants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(variantId)) {
        newSet.delete(variantId);
      } else {
        newSet.add(variantId);
      }
      return newSet;
    });
  };

  // Resolve duplicates by keeping selected variants and removing others
  const resolveDuplicates = async (groupId: string) => {
    if (selectedVariants.size === 0) {
      toast({
        variant: "destructive",
        title: "No Selection",
        description: "Please select at least one variant to keep."
      });
      return;
    }

    try {
      const group = duplicateGroups.find(g => g.id === groupId);
      if (!group) return;

      const variantsToDelete = group.variants
        .filter(v => !selectedVariants.has(v.id))
        .map(v => v.id);

      // Delete variants that weren't selected
      for (const variantId of variantsToDelete) {
        const { error } = await supabase
          .from('product_variants')
          .delete()
          .eq('id', variantId);
        
        if (error) {
          console.error('Error deleting variant:', error);
          throw error;
        }
      }

      toast({
        title: "Duplicates Resolved",
        description: `Removed ${variantsToDelete.length} duplicate variants.`
      });

      // Refresh the list
      await refreshDuplicates();
      setSelectedGroup(null);
      setSelectedVariants(new Set());
    } catch (err) {
      console.error('Error resolving duplicates:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to resolve duplicates."
      });
    }
  };

  useEffect(() => {
    fetchDuplicates();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <NavigationHeader title="Duplicate Management" showBuildButton={true} />
      <div className="container mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            Duplicate Management
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Review and resolve duplicate products in your database
          </p>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Button
              onClick={refreshDuplicates}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-resolved"
                checked={showResolved}
                onCheckedChange={(checked) => setShowResolved(checked as boolean)}
              />
              <label htmlFor="show-resolved" className="text-sm">
                Show resolved duplicates
              </label>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm">
            {duplicateGroups.length} duplicate groups found
          </Badge>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card className="max-w-4xl mx-auto">
            <CardContent className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Scanning for duplicates...</p>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && duplicateGroups.length === 0 && (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-12 text-center">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Duplicates Found</h3>
              <p className="text-muted-foreground">
                Your database is clean! No duplicate products detected.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Duplicate Groups */}
        {!isLoading && duplicateGroups.length > 0 && (
          <div className="space-y-4">
            {duplicateGroups.map((group) => (
              <Card key={group.id} className="shadow-elegant">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        {group.name}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {group.total_variants} variants • {group.total_skus} SKUs
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedGroup(group)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium text-sm">Ingredients:</span>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {group.ingredients}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {group.variants.slice(0, 3).map((variant) => (
                        <Badge key={variant.id} variant="outline">
                          {variant.brand} - {variant.name}
                        </Badge>
                      ))}
                      {group.variants.length > 3 && (
                        <Badge variant="secondary">
                          +{group.variants.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Duplicate Resolution Modal */}
        {selectedGroup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Resolve Duplicates: {selectedGroup.name}</CardTitle>
                    <CardDescription>
                      Select which variants to keep. Unselected variants will be deleted.
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedGroup(null)}
                  >
                    <EyeOff className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-y-auto max-h-96">
                <div className="space-y-4">
                  {selectedGroup.variants.map((variant) => (
                    <Card key={variant.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedVariants.has(variant.id)}
                          onCheckedChange={() => toggleVariantSelection(variant.id)}
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium">{variant.name}</h4>
                              <p className="text-sm text-muted-foreground">{variant.brand}</p>
                            </div>
                            <Badge variant="outline">
                              {new Date(variant.created_at).toLocaleDateString()}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {variant.skus.map((sku, index) => (
                              <div key={index} className="flex gap-1">
                                {sku.upc && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Barcode className="h-3 w-3 mr-1" />
                                    UPC: {sku.upc}
                                  </Badge>
                                )}
                                {sku.ean && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Barcode className="h-3 w-3 mr-1" />
                                    EAN: {sku.ean}
                                  </Badge>
                                )}
                                {sku.asin && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Barcode className="h-3 w-3 mr-1" />
                                    ASIN: {sku.asin}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
              <div className="border-t p-4 flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {selectedVariants.size} of {selectedGroup.variants.length} variants selected
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedGroup(null);
                      setSelectedVariants(new Set());
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => resolveDuplicates(selectedGroup.id)}
                    disabled={selectedVariants.size === 0}
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Resolve Duplicates
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default DuplicatesPage;
