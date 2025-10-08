import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { IngredientBackfill } from '@/lib/ingredientBackfill';
import { Database, RefreshCw, CheckCircle, AlertTriangle, BarChart3 } from 'lucide-react';

interface ProcessingStats {
  totalVariants: number;
  variantsWithIngredientText: number;
  variantsWithIngredientAnalysis: number;
  totalIngredients: number;
  totalIngredientRelationships: number;
}

export default function IngredientBackfillPage() {
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const { toast } = useToast();

  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      const stats = await IngredientBackfill.getProcessingStats();
      setStats(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load processing statistics."
      });
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleBackfill = async () => {
    setIsProcessing(true);
    setProcessingResult(null);
    
    try {
      const result = await IngredientBackfill.backfillAllVariants();
      setProcessingResult(result);
      
      toast({
        title: "Backfill Complete",
        description: `Processed ${result.processed} variants, created ${result.ingredientsCreated} ingredients, linked ${result.ingredientsLinked} relationships.`
      });
      
      // Reload stats
      await loadStats();
    } catch (error) {
      console.error('Error during backfill:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process ingredients. Please try again."
      });
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const variantsNeedingProcessing = stats ? 
    stats.variantsWithIngredientText - stats.variantsWithIngredientAnalysis : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ingredient Processing</h1>
          <p className="text-muted-foreground">
            Process ingredient data for existing product variants
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={loadStats} 
            disabled={isLoadingStats}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingStats ? 'animate-spin' : ''}`} />
            Refresh Stats
          </Button>
          <Button 
            onClick={handleBackfill} 
            disabled={isProcessing || variantsNeedingProcessing === 0}
          >
            <Database className="h-4 w-4 mr-2" />
            {isProcessing ? 'Processing...' : 'Process Ingredients'}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Variants</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalVariants || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Ingredient Text</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.variantsWithIngredientText || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.variantsWithIngredientAnalysis || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ingredients</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalIngredients || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Processing Status */}
      {variantsNeedingProcessing > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Processing Required
            </CardTitle>
            <CardDescription>
              {variantsNeedingProcessing} variants have ingredient text but no ingredient relationships.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Variants needing processing</span>
                <Badge variant="outline">{variantsNeedingProcessing}</Badge>
              </div>
              <Progress 
                value={stats ? (stats.variantsWithIngredientAnalysis / stats.variantsWithIngredientText) * 100 : 0} 
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                {stats ? Math.round((stats.variantsWithIngredientAnalysis / stats.variantsWithIngredientText) * 100) : 0}% complete
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Results */}
      {processingResult && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{processingResult.processed}</div>
                <div className="text-sm text-muted-foreground">Variants Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{processingResult.ingredientsCreated}</div>
                <div className="text-sm text-muted-foreground">Ingredients Created</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{processingResult.ingredientsLinked}</div>
                <div className="text-sm text-muted-foreground">Relationships Linked</div>
              </div>
            </div>
            
            {processingResult.errors.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Errors encountered:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {processingResult.errors.slice(0, 5).map((error: string, index: number) => (
                        <li key={index} className="text-sm">{error}</li>
                      ))}
                      {processingResult.errors.length > 5 && (
                        <li className="text-sm text-muted-foreground">
                          ... and {processingResult.errors.length - 5} more errors
                        </li>
                      )}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {variantsNeedingProcessing === 0 && stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              All Up to Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              All variants with ingredient text have been processed. No action needed.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
