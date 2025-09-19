import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertTriangle, FileText, Globe, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AmazonGroupAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string | null;
  onParse: (html: string) => void;
}

export const AmazonGroupAvailabilityModal = ({ 
  isOpen, 
  onClose, 
  groupName, 
  onParse 
}: AmazonGroupAvailabilityModalProps) => {
  const [htmlSnippet, setHtmlSnippet] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleParse = async () => {
    if (!htmlSnippet.trim()) {
      setParseError('Please paste the Amazon twister HTML snippet');
      return;
    }

    setIsParsing(true);
    setParseError(null);

    try {
      // Basic validation - check if it contains the twister container
      if (!htmlSnippet.includes('twister-plus-inline-twister')) {
        throw new Error('Please paste the complete Amazon twister HTML section');
      }

      onParse(htmlSnippet);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse HTML';
      setParseError(errorMessage);
    } finally {
      setIsParsing(false);
    }
  };

  const handleClose = () => {
    setHtmlSnippet("");
    setParseError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Determine Active Variants for "{groupName}"
          </DialogTitle>
          <DialogDescription>
            Paste Amazon twister HTML to automatically determine which variants are available for the "{groupName}" group and intelligently select them based on the current Amazon state.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Instructions */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-sm text-blue-800 flex items-center gap-2">
                <Package className="h-4 w-4" />
                How to use this parser
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-700 space-y-2">
              <p><strong>Step 1:</strong> Go to the Amazon product page with the twister options</p>
              <p><strong>Step 2:</strong> Open browser developer tools (F12) and go to the Console tab</p>
              <p><strong>Step 3:</strong> Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl+F</kbd> and search for "twister-plus-inline-twister"</p>
              <p><strong>Step 4:</strong> Right-click on the found element and "Copy outer HTML"</p>
              <p><strong>Step 5:</strong> Paste the HTML here and click "Parse Availability"</p>
              <p className="text-xs text-blue-600 mt-2">
                💡 <strong>Important:</strong> If you need to check different option combinations, refresh the Amazon page after selecting new options, then copy the HTML again to get the updated state.
              </p>
            </CardContent>
          </Card>

          {/* HTML Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Paste Amazon Twister HTML</CardTitle>
              <CardDescription>
                Copy the complete twister section from the Amazon product page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Paste Amazon twister HTML here..."
                value={htmlSnippet}
                onChange={(e) => setHtmlSnippet(e.target.value)}
                rows={12}
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
                Parse Availability
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


          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleParse}
              disabled={isParsing || !htmlSnippet.trim()}
              className="gap-2"
            >
              {isParsing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Apply Availability
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
