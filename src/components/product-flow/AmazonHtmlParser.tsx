import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

interface ParsedOption {
  name: string;
  displayName: string;
  values: string[];
}

interface AmazonHtmlParserProps {
  formState: any;
  updateFormState: (updates: any) => void;
  onComplete: () => void;
}

interface OptionAnalysis {
  option: ParsedOption;
  isNew: boolean;
  newValues: string[];
  existingValues: string[];
}

export const AmazonHtmlParser = ({ formState, updateFormState, onComplete }: AmazonHtmlParserProps) => {
  const [htmlSnippet, setHtmlSnippet] = useState("");
  const [parsedOptions, setParsedOptions] = useState<ParsedOption[]>([]);
  const [optionAnalysis, setOptionAnalysis] = useState<OptionAnalysis[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const { toast } = useToast();

  const parseAmazonHtml = (html: string): ParsedOption[] => {
    try {
      // Create a temporary DOM parser
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Find the main twister container
      const twisterContainer = doc.getElementById('twister-plus-inline-twister');
      if (!twisterContainer) {
        throw new Error('Could not find Amazon twister container in HTML. Please ensure you copied the complete twister section.');
      }

      const options: ParsedOption[] = [];
      
      // Find all option rows (flavor_name, size_name, etc.)
      const optionRows = twisterContainer.querySelectorAll('[id^="inline-twister-row-"]');
      
      if (optionRows.length === 0) {
        throw new Error('No option rows found. Please ensure the HTML contains Amazon product options.');
      }
      
      optionRows.forEach((row) => {
        const rowId = row.id;
        const optionName = rowId.replace('inline-twister-row-', '');
        
        // Find the option display name - try multiple selectors
        let displayName = optionName;
        const titleElement = row.querySelector('[id^="inline-twister-dim-title-"]');
        if (titleElement) {
          const secondaryText = titleElement.querySelector('.a-color-secondary')?.textContent?.trim();
          if (secondaryText) {
            displayName = secondaryText.replace(':', '').trim();
          }
        }
        
        // Find all option values - try multiple selectors
        const valueElements = row.querySelectorAll('.swatch-title-text-display, .swatch-title-text');
        const values: string[] = [];
        
        valueElements.forEach((element) => {
          const value = element.textContent?.trim();
          if (value && value.length > 0 && !values.includes(value)) {
            // Clean up the value
            const cleanValue = value.replace(/\s+/g, ' ').trim();
            if (cleanValue) {
              values.push(cleanValue);
            }
          }
        });
        
        // If no values found with primary selector, try alternative
        if (values.length === 0) {
          const altValueElements = row.querySelectorAll('[class*="swatch"] [class*="text"]');
          altValueElements.forEach((element) => {
            const value = element.textContent?.trim();
            if (value && value.length > 0 && !values.includes(value)) {
              const cleanValue = value.replace(/\s+/g, ' ').trim();
              if (cleanValue) {
                values.push(cleanValue);
              }
            }
          });
        }
        
        if (values.length > 0) {
          options.push({
            name: optionName,
            displayName: displayName,
            values: values
          });
        } else {
          console.warn(`No values found for option: ${optionName}`);
        }
      });
      
      if (options.length === 0) {
        throw new Error('No valid options found. Please check that the HTML contains Amazon product options with values.');
      }
      
      return options;
    } catch (error) {
      console.error('Error parsing Amazon HTML:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to parse HTML. Please ensure you copied the complete Amazon product options HTML.');
    }
  };

  const analyzeOptions = async (options: ParsedOption[]): Promise<OptionAnalysis[]> => {
    const analysis: OptionAnalysis[] = [];
    
    for (const option of options) {
      // Check if option type exists
      const { data: existingOption } = await supabase
        .from('product_options')
        .select('id')
        .eq('name', option.name)
        .single();

      let newValues: string[] = [];
      let existingValues: string[] = [];

      if (existingOption) {
        // Get existing values for this option type
        const { data: existingValuesData } = await supabase
          .from('option_values')
          .select('label')
          .eq('option_type_id', existingOption.id);

        const existingValueSet = new Set(existingValuesData?.map(v => v.label) || []);
        
        newValues = option.values.filter(value => !existingValueSet.has(value));
        existingValues = option.values.filter(value => existingValueSet.has(value));
      } else {
        newValues = option.values;
      }

      analysis.push({
        option,
        isNew: !existingOption,
        newValues,
        existingValues
      });
    }

    return analysis;
  };

  const handleParse = async () => {
    if (!htmlSnippet.trim()) {
      setParseError('Please paste the Amazon HTML snippet');
      return;
    }

    setIsParsing(true);
    setParseError(null);

    try {
      const options = parseAmazonHtml(htmlSnippet);
      setParsedOptions(options);
      
      if (options.length === 0) {
        setParseError('No options found in the HTML. Please check that you copied the complete twister section.');
        return;
      }

      // Analyze what will be saved
      const analysis = await analyzeOptions(options);
      setOptionAnalysis(analysis);

      const totalNewOptions = analysis.filter(a => a.isNew).length;
      const totalNewValues = analysis.reduce((sum, a) => sum + a.newValues.length, 0);
      const totalExistingOptions = analysis.filter(a => !a.isNew).length;

      let description = `Found ${options.length} option type${options.length !== 1 ? 's' : ''} with ${options.reduce((sum, opt) => sum + opt.values.length, 0)} total values.`;
      if (totalNewOptions > 0) description += ` ${totalNewOptions} new option type${totalNewOptions !== 1 ? 's' : ''}.`;
      if (totalNewValues > 0) description += ` ${totalNewValues} new value${totalNewValues !== 1 ? 's' : ''}.`;
      if (totalExistingOptions > 0) description += ` ${totalExistingOptions} existing option${totalExistingOptions !== 1 ? 's' : ''} will be updated.`;

      toast({
        title: "Success",
        description
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse HTML';
      setParseError(errorMessage);
    } finally {
      setIsParsing(false);
    }
  };

  const saveOptionsToDatabase = async () => {
    if (parsedOptions.length === 0) return;

    setIsParsing(true);
    try {
      let newOptionsCount = 0;
      let newValuesCount = 0;
      let existingOptionsCount = 0;

      // Save option types and values to database
      for (const option of parsedOptions) {
        // Check if option type already exists
        const { data: existingOption, error: checkError } = await supabase
          .from('product_options')
          .select('id, label')
          .eq('name', option.name)
          .single();

        let optionId: number;
        
        if (existingOption) {
          optionId = existingOption.id;
          existingOptionsCount++;
          console.log(`Using existing option: ${option.name} (${existingOption.label})`);
        } else {
          // Create new option type
          const { data: newOption, error: createError } = await supabase
            .from('product_options')
            .insert({
              name: option.name,
              label: option.displayName,
              data_type: 'select',
              unit: null,
              options: option.values
            })
            .select('id')
            .single();

          if (createError) throw createError;
          optionId = newOption.id;
          newOptionsCount++;
          console.log(`Created new option: ${option.name} (${option.displayName})`);
        }

        // Get existing values for this option type
        const { data: existingValues, error: valuesError } = await supabase
          .from('option_values')
          .select('label')
          .eq('option_type_id', optionId);

        if (valuesError) {
          console.warn(`Failed to fetch existing values for ${option.name}:`, valuesError);
        }

        const existingValueSet = new Set(existingValues?.map(v => v.label) || []);

        // Save only new option values
        const newValues = option.values.filter(value => !existingValueSet.has(value));
        
        if (newValues.length > 0) {
          const valueInserts = newValues.map(value => ({
            option_type_id: optionId,
            value: value,
            label: value
          }));

          const { error: valueError } = await supabase
            .from('option_values')
            .insert(valueInserts);

          if (valueError) {
            console.warn(`Failed to save values for option "${option.name}":`, valueError);
          } else {
            newValuesCount += newValues.length;
            console.log(`Added ${newValues.length} new values for ${option.name}:`, newValues);
          }
        } else {
          console.log(`All values for ${option.name} already exist`);
        }
      }

      // Show summary of what was saved
      const summary = [];
      if (newOptionsCount > 0) summary.push(`${newOptionsCount} new option type${newOptionsCount !== 1 ? 's' : ''}`);
      if (newValuesCount > 0) summary.push(`${newValuesCount} new value${newValuesCount !== 1 ? 's' : ''}`);
      if (existingOptionsCount > 0) summary.push(`${existingOptionsCount} existing option${existingOptionsCount !== 1 ? 's' : ''} reused`);

      toast({
        title: "Success",
        description: `Saved successfully! ${summary.join(', ')}. You will now be taken to step 3 to configure variants.`
      });

      // Update form state with parsed options
      updateFormState({ 
        parsedOptions: parsedOptions,
        selectedOptionTypes: parsedOptions.map(opt => ({
          name: opt.name,
          displayName: opt.displayName,
          selectedValues: opt.values
        }))
      });
      
      // Mark this step as complete
      onComplete();
      
    } catch (error) {
      console.error('Error saving options:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save options to database"
      });
    } finally {
      setIsParsing(false);
    }
  };

  const clearParser = () => {
    setHtmlSnippet("");
    setParsedOptions([]);
    setOptionAnalysis([]);
    setParseError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-semibold mb-2">Amazon HTML Parser</h3>
        <p className="text-muted-foreground">
          Paste Amazon product HTML to automatically extract option types and values
        </p>
      </div>

      {/* HTML Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            HTML Snippet
          </CardTitle>
          <CardDescription>
            Copy the HTML from Amazon's product page that contains the option selectors (twister section)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="html-snippet">Amazon HTML</Label>
            <Textarea
              id="html-snippet"
              placeholder="Paste the Amazon HTML snippet here..."
              value={htmlSnippet}
              onChange={(e) => setHtmlSnippet(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleParse}
              disabled={!htmlSnippet.trim() || isParsing}
            >
              {isParsing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Parse HTML
            </Button>
            <Button 
              variant="outline" 
              onClick={clearParser}
              disabled={isParsing}
            >
              Clear
            </Button>
          </div>

          {parseError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Parsed Results */}
      {parsedOptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Extracted Options
            </CardTitle>
            <CardDescription>
              Found {parsedOptions.length} option type{parsedOptions.length !== 1 ? 's' : ''} with {parsedOptions.reduce((sum, opt) => sum + opt.values.length, 0)} total values
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {optionAnalysis.map((analysis, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="font-semibold">{analysis.option.displayName}</h4>
                  <Badge variant="secondary">{analysis.option.values.length} values</Badge>
                  <Badge variant="outline" className="text-xs">
                    {analysis.option.name}
                  </Badge>
                  {analysis.isNew ? (
                    <Badge variant="default" className="text-xs">New Option</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Existing Option</Badge>
                  )}
                </div>
                
                {analysis.newValues.length > 0 && (
                  <div className="mb-2">
                    <p className="text-sm font-medium text-green-700 mb-1">New values to be added:</p>
                    <div className="flex flex-wrap gap-1">
                      {analysis.newValues.map((value, valueIndex) => (
                        <Badge key={valueIndex} variant="default" className="text-xs">
                          {value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {analysis.existingValues.length > 0 && (
                  <div className="mb-2">
                    <p className="text-sm font-medium text-blue-700 mb-1">Existing values (will be reused):</p>
                    <div className="flex flex-wrap gap-1">
                      {analysis.existingValues.map((value, valueIndex) => (
                        <Badge key={valueIndex} variant="outline" className="text-xs">
                          {value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            <div className="flex gap-2 pt-4 border-t">
              <Button 
                onClick={saveOptionsToDatabase}
                disabled={isParsing}
                className="flex-1"
              >
                {isParsing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Save Options & Use
              </Button>
              <Button 
                variant="outline" 
                onClick={clearParser}
                disabled={isParsing}
              >
                Clear & Start Over
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm text-blue-800">How to use this parser</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-700 space-y-2">
          <p><strong>Step 1:</strong> Go to any Amazon product page with multiple options (size, color, etc.)</p>
          <p><strong>Step 2:</strong> Open browser developer tools (F12) and go to the Console tab</p>
          <p><strong>Step 3:</strong> Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl+F</kbd> and search for "twister-plus-inline-twister"</p>
          <p><strong>Step 4:</strong> Right-click on the found element and "Copy outer HTML"</p>
          <p><strong>Step 5:</strong> Paste the HTML here and click "Parse HTML"</p>
          <p className="text-xs text-blue-600 mt-2">
            💡 Tip: The parser will automatically avoid duplicates and only save new options/values to your database.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
