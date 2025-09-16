import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, X, Package, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface DuplicateIdentifier {
  identifier_type: string;
  identifier_value: string;
  product_variant_id: string;
  product_name: string;
  brand_name: string;
  is_primary: boolean;
}

interface IdentifierDuplicateCheckerProps {
  identifiers: Array<{
    identifier_type: string;
    identifier_value: string;
  }>;
  onDuplicateFound: (duplicates: DuplicateIdentifier[]) => void;
  onNoDuplicates: () => void;
}

export const IdentifierDuplicateChecker = ({ 
  identifiers, 
  onDuplicateFound, 
  onNoDuplicates 
}: IdentifierDuplicateCheckerProps) => {
  const [isChecking, setIsChecking] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateIdentifier[]>([]);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (identifiers.length > 0 && !hasChecked) {
      checkForDuplicates();
    }
  }, [identifiers]);

  const checkForDuplicates = async () => {
    setIsChecking(true);
    setHasChecked(true);
    
    try {
      const duplicateResults: DuplicateIdentifier[] = [];

      for (const identifier of identifiers) {
        const { data, error } = await supabase
          .from("product_identifiers")
          .select(`
            identifier_type,
            identifier_value,
            is_primary,
            product_variant_id,
            product_variants!inner(
              name,
              product_lines!inner(
                name,
                brands!inner(name)
              )
            )
          `)
          .eq("identifier_type", identifier.identifier_type)
          .eq("identifier_value", identifier.identifier_value)
          .eq("is_active", true);

        if (!error && data && data.length > 0) {
          data.forEach(match => {
            duplicateResults.push({
              identifier_type: match.identifier_type,
              identifier_value: match.identifier_value,
              product_variant_id: match.product_variant_id,
              product_name: match.product_variants.name || 'Unknown Product',
              brand_name: match.product_variants.product_lines.brands.name,
              is_primary: match.is_primary
            });
          });
        }
      }

      setDuplicates(duplicateResults);

      if (duplicateResults.length > 0) {
        onDuplicateFound(duplicateResults);
      } else {
        onNoDuplicates();
      }
    } catch (error) {
      console.error("Error checking for identifier duplicates:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to check for duplicate identifiers."
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleIgnoreDuplicates = () => {
    onNoDuplicates();
  };

  if (isChecking) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking for duplicate identifiers...</p>
        </CardContent>
      </Card>
    );
  }

  if (duplicates.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6 text-center">
          <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
          <h3 className="text-lg font-semibold text-green-800 mb-2">No Duplicate Identifiers Found</h3>
          <p className="text-green-700">
            All identifiers are unique and can be safely added.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong>Duplicate identifiers found!</strong> The following identifiers are already in use:
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        {duplicates.map((duplicate, index) => (
          <Card key={index} className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-red-900">{duplicate.product_name}</h4>
                    <Badge variant="destructive">Duplicate</Badge>
                    {duplicate.is_primary && (
                      <Badge variant="secondary">Primary</Badge>
                    )}
                  </div>
                  <div className="text-sm text-red-700 mb-2">
                    <span className="font-medium">{duplicate.brand_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {duplicate.identifier_type}: {duplicate.identifier_value}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/product-lookup?search=${duplicate.identifier_value}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View Product
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={handleIgnoreDuplicates}>
          <X className="h-4 w-4 mr-1" />
          Ignore & Continue
        </Button>
        <Button 
          variant="destructive" 
          onClick={() => {
            toast({
              title: "Action Required",
              description: "Please update the duplicate identifiers before proceeding."
            });
          }}
        >
          <AlertTriangle className="h-4 w-4 mr-1" />
          Fix Duplicates
        </Button>
      </div>
    </div>
  );
};
