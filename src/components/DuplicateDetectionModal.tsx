import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, X, Search, Package, Building2, ExternalLink, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface DuplicateProduct {
  id: string;
  name: string;
  brand_name: string;
  similarity_score: number;
  match_type: 'exact' | 'similar' | 'potential';
  identifiers: Array<{
    identifier_type: string;
    identifier_value: string;
    is_primary: boolean;
  }>;
  variants_count: number;
  created_at: string;
}

interface DuplicateDetectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmNew: () => void;
  onSelectExisting: (productId: string) => void;
  productData: {
    brandName: string;
    productLineName: string;
    identifiers?: Array<{
      identifier_type: string;
      identifier_value: string;
    }>;
  };
}

export const DuplicateDetectionModal = ({ 
  isOpen, 
  onClose, 
  onConfirmNew, 
  onSelectExisting,
  productData 
}: DuplicateDetectionModalProps) => {
  const [duplicates, setDuplicates] = useState<DuplicateProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDuplicate, setSelectedDuplicate] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      detectDuplicates();
    }
  }, [isOpen, productData]);

  const detectDuplicates = async () => {
    setIsLoading(true);
    try {
      const duplicates: DuplicateProduct[] = [];

      // 1. Check for exact brand + product model name matches
      const { data: exactMatches, error: exactError } = await supabase
        .from("product_models")
        .select(`
          id,
          name,
          created_at,
          brands!inner(name),
          product_variants(id),
          barcodes(barcode, barcode_type, is_primary)
        `)
        .eq("brands.name", productData.brandName)
        .ilike("name", `%${productData.productLineName}%`);

      if (!exactError && exactMatches) {
        exactMatches.forEach(match => {
          duplicates.push({
            id: match.id,
            name: match.name,
            brand_name: match.brands.name,
            similarity_score: 95,
            match_type: 'exact',
            identifiers: match.barcodes || [],
            variants_count: match.product_variants?.length || 0,
            created_at: match.created_at
          });
        });
      }

      // 2. Check for similar product model names (fuzzy matching)
      const { data: similarMatches, error: similarError } = await supabase
        .from("product_models")
        .select(`
          id,
          name,
          created_at,
          brands!inner(name),
          product_variants(id),
          barcodes(barcode, barcode_type, is_primary)
        `)
        .neq("brands.name", productData.brandName)
        .ilike("name", `%${productData.productLineName}%`);

      if (!similarError && similarMatches) {
        similarMatches.forEach(match => {
          duplicates.push({
            id: match.id,
            name: match.name,
            brand_name: match.brands.name,
            similarity_score: 75,
            match_type: 'similar',
            identifiers: match.barcodes || [],
            variants_count: match.product_variants?.length || 0,
            created_at: match.created_at
          });
        });
      }

      // 3. Check for identifier matches (UPC, ASIN, etc.)
      if (productData.identifiers && productData.identifiers.length > 0) {
        for (const identifier of productData.identifiers) {
          const { data: identifierMatches, error: identifierError } = await supabase
            .from("product_identifiers")
            .select(`
              product_variant_id,
              identifier_type,
              identifier_value,
              is_primary,
              product_variants!inner(
                id,
                name,
                product_lines!inner(
                  id,
                  name,
                  created_at,
                  brands!inner(name)
                )
              )
            `)
            .eq("identifier_type", identifier.identifier_type)
            .eq("identifier_value", identifier.identifier_value)
            .eq("is_active", true);

          if (!identifierError && identifierMatches) {
            identifierMatches.forEach(match => {
              const productLine = match.product_variants.product_lines;
              duplicates.push({
                id: productLine.id,
                name: productLine.name,
                brand_name: productLine.brands.name,
                similarity_score: 100,
                match_type: 'exact',
                identifiers: [{
                  identifier_type: match.identifier_type,
                  identifier_value: match.identifier_value,
                  is_primary: match.is_primary
                }],
                variants_count: 1,
                created_at: productLine.created_at
              });
            });
          }
        }
      }

      // Remove duplicates and sort by similarity score
      const uniqueDuplicates = duplicates.filter((dup, index, self) => 
        index === self.findIndex(d => d.id === dup.id)
      ).sort((a, b) => b.similarity_score - a.similarity_score);

      setDuplicates(uniqueDuplicates);
    } catch (error) {
      console.error("Error detecting duplicates:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to check for duplicate products."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getMatchTypeColor = (matchType: string) => {
    switch (matchType) {
      case 'exact': return 'destructive';
      case 'similar': return 'default';
      case 'potential': return 'secondary';
      default: return 'outline';
    }
  };

  const getMatchTypeLabel = (matchType: string) => {
    switch (matchType) {
      case 'exact': return 'Exact Match';
      case 'similar': return 'Similar Name';
      case 'potential': return 'Potential Duplicate';
      default: return 'Unknown';
    }
  };

  const filteredDuplicates = duplicates.filter(dup => 
    dup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dup.brand_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hasExactMatches = duplicates.some(dup => dup.match_type === 'exact');
  const hasSimilarMatches = duplicates.some(dup => dup.match_type === 'similar');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Duplicate Detection
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Alert */}
          {duplicates.length > 0 && (
            <Alert className={hasExactMatches ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {hasExactMatches ? (
                  <span className="text-red-800">
                    <strong>Exact matches found!</strong> We found {duplicates.filter(d => d.match_type === 'exact').length} product(s) 
                    that appear to be identical to what you're trying to create.
                  </span>
                ) : (
                  <span className="text-yellow-800">
                    <strong>Similar products found!</strong> We found {duplicates.length} product(s) 
                    with similar names that you should review before proceeding.
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search Results</Label>
            <Input
              id="search"
              placeholder="Search by product name or brand..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Checking for duplicates...</p>
              </div>
            </div>
          ) : duplicates.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Duplicates Found</h3>
                <p className="text-muted-foreground mb-4">
                  Great! We didn't find any existing products that match your input.
                </p>
                <Button onClick={onConfirmNew} variant="premium">
                  Continue Creating New Product
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="all" className="space-y-4">
              <TabsList>
                <TabsTrigger value="all">All Results ({duplicates.length})</TabsTrigger>
                {hasExactMatches && (
                  <TabsTrigger value="exact">
                    Exact Matches ({duplicates.filter(d => d.match_type === 'exact').length})
                  </TabsTrigger>
                )}
                {hasSimilarMatches && (
                  <TabsTrigger value="similar">
                    Similar ({duplicates.filter(d => d.match_type === 'similar').length})
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                {filteredDuplicates.map((duplicate) => (
                  <Card key={duplicate.id} className={`cursor-pointer transition-colors ${
                    selectedDuplicate === duplicate.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{duplicate.name}</h4>
                            <Badge variant={getMatchTypeColor(duplicate.match_type)}>
                              {getMatchTypeLabel(duplicate.match_type)}
                            </Badge>
                            <Badge variant="outline">
                              {duplicate.similarity_score}% match
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {duplicate.brand_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {duplicate.variants_count} variant{duplicate.variants_count !== 1 ? 's' : ''}
                            </span>
                            <span>Created: {new Date(duplicate.created_at).toLocaleDateString()}</span>
                          </div>
                          {duplicate.identifiers.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {duplicate.identifiers.slice(0, 3).map((identifier, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {identifier.identifier_type}: {identifier.identifier_value}
                                </Badge>
                              ))}
                              {duplicate.identifiers.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{duplicate.identifiers.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedDuplicate(
                              selectedDuplicate === duplicate.id ? null : duplicate.id
                            )}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {selectedDuplicate === duplicate.id ? 'Hide' : 'View'}
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => onSelectExisting(duplicate.id)}
                          >
                            Use This Product
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {hasExactMatches && (
                <TabsContent value="exact" className="space-y-4">
                  {filteredDuplicates.filter(d => d.match_type === 'exact').map((duplicate) => (
                    <Card key={duplicate.id} className="border-red-200 bg-red-50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-red-900">{duplicate.name}</h4>
                              <Badge variant="destructive">Exact Match</Badge>
                            </div>
                            <div className="text-sm text-red-700 mb-2">
                              This product appears to be identical to what you're trying to create.
                            </div>
                            <div className="flex items-center gap-4 text-sm text-red-600">
                              <span>{duplicate.brand_name}</span>
                              <span>{duplicate.variants_count} variants</span>
                            </div>
                          </div>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => onSelectExisting(duplicate.id)}
                          >
                            Use This Product
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              )}

              {hasSimilarMatches && (
                <TabsContent value="similar" className="space-y-4">
                  {filteredDuplicates.filter(d => d.match_type === 'similar').map((duplicate) => (
                    <Card key={duplicate.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{duplicate.name}</h4>
                              <Badge variant="default">Similar Name</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground mb-2">
                              This product has a similar name but different brand.
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{duplicate.brand_name}</span>
                              <span>{duplicate.variants_count} variants</span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onSelectExisting(duplicate.id)}
                          >
                            Use This Product
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              )}
            </Tabs>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <div className="flex gap-2">
              {duplicates.length > 0 && (
                <Button
                  variant="outline"
                  onClick={onConfirmNew}
                  className="text-orange-600 border-orange-200 hover:bg-orange-50"
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Create Anyway
                </Button>
              )}
              {duplicates.length === 0 && (
                <Button onClick={onConfirmNew} variant="premium">
                  Continue Creating
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

