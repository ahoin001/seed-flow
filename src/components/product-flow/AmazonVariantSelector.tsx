import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle, Package, Settings, ChevronDown, ChevronRight, Grid3X3, List, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AmazonGroupAvailabilityModal } from "./AmazonGroupAvailabilityModal";

interface AmazonVariantSelectorProps {
  formState: any;
  updateFormState: (updates: any) => void;
  onComplete: () => void;
}

export const AmazonVariantSelector = ({ formState, updateFormState, onComplete }: AmazonVariantSelectorProps) => {
  const [allCombinations, setAllCombinations] = useState<any[]>([]);
  const [selectedCombinations, setSelectedCombinations] = useState<Set<string>>(new Set());
  const [dontGenerateAll, setDontGenerateAll] = useState(false);
  const [groupedCombinations, setGroupedCombinations] = useState<any>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [parserModalOpen, setParserModalOpen] = useState(false);
  const [currentGroupName, setCurrentGroupName] = useState<string | null>(null);
  const { toast } = useToast();

  // Generate all possible combinations
  useEffect(() => {
    if (formState.selectedOptionTypes && formState.selectedOptionTypes.length > 0) {
      const combinations = generateCombinations(formState.selectedOptionTypes);
      setAllCombinations(combinations);
      
      // Group combinations by primary option (first option type)
      const grouped = groupCombinations(combinations, formState.selectedOptionTypes);
      setGroupedCombinations(grouped);
      
      // Auto-expand first few groups
      const groupKeys = Object.keys(grouped);
      setExpandedGroups(new Set(groupKeys.slice(0, 3)));
      
      // If not generating all, start with none selected
      if (dontGenerateAll) {
        setSelectedCombinations(new Set());
      } else {
        // If generating all, select all combinations
        setSelectedCombinations(new Set(combinations.map(c => c.id)));
      }
    }
  }, [formState.selectedOptionTypes, dontGenerateAll]);

  const generateCombinations = (optionTypes: any[]) => {
    if (optionTypes.length === 0) return [];
    
    const combinations: any[] = [];
    
    // Generate cartesian product of all option values
    const generateCartesian = (arrays: any[][], current: any[] = [], index = 0) => {
      if (index === arrays.length) {
        const combination = {
          id: current.map(c => c.value).join('_'),
          name: current.map(c => `${c.optionName}: ${c.value}`).join(', '),
          values: current.reduce((acc, curr) => {
            acc[curr.optionName] = curr.value;
            return acc;
          }, {}),
          displayName: current.map(c => c.value).join(' × ')
        };
        combinations.push(combination);
        return;
      }
      
      for (const value of arrays[index]) {
        generateCartesian(arrays, [...current, value], index + 1);
      }
    };
    
    const valueArrays = optionTypes.map(option => 
      option.selectedValues.map((value: string) => ({
        optionName: option.name,
        value: value
      }))
    );
    
    generateCartesian(valueArrays);
    return combinations;
  };

  const groupCombinations = (combinations: any[], optionTypes: any[]) => {
    if (optionTypes.length === 0) return {};
    
    const primaryOption = optionTypes[0];
    const groups: any = {};
    
    combinations.forEach(combination => {
      const primaryValue = combination.values[primaryOption.name];
      if (!groups[primaryValue]) {
        groups[primaryValue] = {
          name: primaryValue,
          optionType: primaryOption.name,
          combinations: []
        };
      }
      groups[primaryValue].combinations.push(combination);
    });
    
    return groups;
  };

  const toggleCombinationSelection = (combinationId: string) => {
    const newSelected = new Set(selectedCombinations);
    if (newSelected.has(combinationId)) {
      newSelected.delete(combinationId);
    } else {
      newSelected.add(combinationId);
    }
    setSelectedCombinations(newSelected);
  };

  const selectAllCombinations = () => {
    setSelectedCombinations(new Set(allCombinations.map(c => c.id)));
  };

  const deselectAllCombinations = () => {
    setSelectedCombinations(new Set());
  };

  const toggleGroupSelection = (groupName: string) => {
    const group = groupedCombinations[groupName];
    if (!group) return;
    
    const groupCombinationIds = group.combinations.map((c: any) => c.id);
    const selectedInGroup = groupCombinationIds.filter((id: string) => selectedCombinations.has(id)).length;
    const allGroupSelected = selectedInGroup === groupCombinationIds.length;
    
    const newSelected = new Set(selectedCombinations);
    if (allGroupSelected) {
      // Deselect all in group
      groupCombinationIds.forEach((id: string) => newSelected.delete(id));
    } else {
      // Select all in group
      groupCombinationIds.forEach((id: string) => newSelected.add(id));
    }
    setSelectedCombinations(newSelected);
  };

  const toggleGroupExpansion = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  const expandAllGroups = () => {
    setExpandedGroups(new Set(Object.keys(groupedCombinations)));
  };

  const collapseAllGroups = () => {
    setExpandedGroups(new Set());
  };

  const openParserModal = (groupName: string) => {
    setCurrentGroupName(groupName);
    setParserModalOpen(true);
  };

  const parseAvailabilityFromHtml = (html: string, groupName: string) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Find the twister container
      const twisterContainer = doc.getElementById('twister-plus-inline-twister');
      if (!twisterContainer) {
        throw new Error('Could not find Amazon twister container in HTML');
      }

      // Find all option rows
      const optionRows = twisterContainer.querySelectorAll('[id^="inline-twister-row-"]');
      const availabilityMap: { [key: string]: boolean } = {};
      
      // First, identify which primary option is currently selected/active
      let selectedPrimaryOption: string | null = null;
      let selectedPrimaryValue: string | null = null;
      
      optionRows.forEach((row) => {
        const rowId = row.id;
        const optionName = rowId.replace('inline-twister-row-', '');
        
        // Check if this is the primary option (first option type)
        const isPrimaryOption = formState.selectedOptionTypes?.[0]?.name === optionName;
        
        if (isPrimaryOption) {
          // Find the currently selected value in the primary option
          const selectedValueSpan = row.querySelector('.inline-twister-dim-title-value');
          if (selectedValueSpan) {
            selectedPrimaryValue = selectedValueSpan.textContent?.trim() || null;
            selectedPrimaryOption = optionName;
            console.log(`Primary option selected: ${selectedPrimaryOption} = ${selectedPrimaryValue}`);
          }
          return; // Skip processing this row for now
        }
      });
      
      // Now process all option rows to build availability map
      optionRows.forEach((row) => {
        const rowId = row.id;
        const optionName = rowId.replace('inline-twister-row-', '');
        
        // Find the ul with option values
        const valueList = row.querySelector('ul[role="radiogroup"]');
        if (valueList) {
          const listItems = valueList.querySelectorAll('li');
          
          listItems.forEach((li) => {
            // Get the option value text - try multiple selectors
            const valueSpan = li.querySelector('.swatch-title-text-display, .swatch-title-text, .swatch-title-text-single-line');
            if (valueSpan) {
              const value = valueSpan.textContent?.trim();
              if (value) {
                // Check availability based on data-csa-c-slot-id
                const slotId = li.getAttribute('data-csa-c-slot-id');
                const isAvailable = slotId?.includes('swatchAvailable') || false;
                
                // Create a key for this option value
                const key = `${optionName}:${value}`;
                availabilityMap[key] = isAvailable;
                
                console.log(`Parsed: ${key} = ${isAvailable} (slotId: ${slotId})`);
              }
            }
          });
        }
      });

      // If we have a selected primary option, we need to be more intelligent about availability
      if (selectedPrimaryOption && selectedPrimaryValue) {
        console.log(`Smart parsing for primary option: ${selectedPrimaryOption} = ${selectedPrimaryValue}`);
        
        // For the primary option, only the selected value should be available
        const primaryKey = `${selectedPrimaryOption}:${selectedPrimaryValue}`;
        availabilityMap[primaryKey] = true;
        
        // Mark all other primary option values as unavailable
        const primaryOptionRow = twisterContainer.querySelector(`[id="inline-twister-row-${selectedPrimaryOption}"]`);
        if (primaryOptionRow) {
          const primaryValueList = primaryOptionRow.querySelector('ul[role="radiogroup"]');
          if (primaryValueList) {
            const primaryListItems = primaryValueList.querySelectorAll('li');
            primaryListItems.forEach((li) => {
              const valueSpan = li.querySelector('.swatch-title-text-display, .swatch-title-text, .swatch-title-text-single-line');
              if (valueSpan) {
                const value = valueSpan.textContent?.trim();
                if (value && value !== selectedPrimaryValue) {
                  const key = `${selectedPrimaryOption}:${value}`;
                  availabilityMap[key] = false;
                  console.log(`Marked other primary value as unavailable: ${key}`);
                }
              }
            });
          }
        }
        
        // Now, for secondary options, we need to understand that when a primary option is selected,
        // only certain secondary option values should be available based on the current Amazon state
        console.log(`Analyzing secondary options for primary selection: ${selectedPrimaryValue}`);
        
        // Find all secondary option rows (not the primary one)
        optionRows.forEach((row) => {
          const rowId = row.id;
          const optionName = rowId.replace('inline-twister-row-', '');
          
          // Skip the primary option row
          if (optionName === selectedPrimaryOption) return;
          
          console.log(`Processing secondary option: ${optionName}`);
          
          // For secondary options, we need to be more careful about availability
          // The HTML shows the current state, so we should trust what's marked as available/unavailable
          const valueList = row.querySelector('ul[role="radiogroup"]');
          if (valueList) {
            const listItems = valueList.querySelectorAll('li');
            
            listItems.forEach((li) => {
              const valueSpan = li.querySelector('.swatch-title-text-display, .swatch-title-text, .swatch-title-text-single-line');
              if (valueSpan) {
                const value = valueSpan.textContent?.trim();
                if (value) {
                  const slotId = li.getAttribute('data-csa-c-slot-id');
                  const isAvailable = slotId?.includes('swatchAvailable') || false;
                  
                  const key = `${optionName}:${value}`;
                  availabilityMap[key] = isAvailable;
                  
                  console.log(`Secondary option ${key}: ${isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'} (slotId: ${slotId})`);
                }
              }
            });
          }
        });
      }

      console.log('Final availability map:', availabilityMap);
      console.log('Summary of parsed availability:');
      Object.entries(availabilityMap).forEach(([key, value]) => {
        console.log(`  ${key}: ${value ? '✅ AVAILABLE' : '❌ UNAVAILABLE'}`);
      });
      return availabilityMap;
    } catch (error) {
      console.error('Error parsing availability:', error);
      throw new Error('Failed to parse Amazon twister HTML for availability');
    }
  };

  const applyAvailabilityToGroup = (availabilityMap: { [key: string]: boolean }, groupName: string) => {
    const group = groupedCombinations[groupName];
    if (!group) return;

    const newSelected = new Set(selectedCombinations);
    
    // Get the primary option name (first option type)
    const primaryOptionName = formState.selectedOptionTypes?.[0]?.name;
    
    console.log(`Applying availability to group: ${groupName}`);
    console.log(`Primary option: ${primaryOptionName}`);
    console.log(`Availability map keys:`, Object.keys(availabilityMap));
    
    group.combinations.forEach((combination: any) => {
      const combinationId = combination.id;
      
      // Check if this combination is available
      let isAvailable = true;
      let availabilityReasons: string[] = [];
      
      // For each option value in the combination, check availability
      Object.entries(combination.values).forEach(([optionName, value]) => {
        const key = `${optionName}:${value}`;
        const optionAvailability = availabilityMap[key];
        
        // If we have explicit availability data for this option value
        if (optionAvailability !== undefined) {
          if (optionAvailability === false) {
            isAvailable = false;
            availabilityReasons.push(`${key} is explicitly unavailable`);
          } else {
            availabilityReasons.push(`${key} is explicitly available`);
          }
        } else {
          // If we don't have explicit data, make intelligent decisions
          if (optionName === primaryOptionName) {
            // For primary option, if it matches the group name, it should be available
            if (value === groupName) {
              isAvailable = true;
              availabilityReasons.push(`${key} matches group name (primary option)`);
            } else {
              // If it's a different primary option value, it should be unavailable
              isAvailable = false;
              availabilityReasons.push(`${key} is different from group name (primary option)`);
            }
          } else {
            // For secondary options, if we don't have explicit data, be more permissive
            // This allows for cases where not all combinations are explicitly marked
            console.log(`No explicit availability data for ${key}, assuming available for secondary option`);
            availabilityReasons.push(`${key} has no explicit data (secondary option, assuming available)`);
          }
        }
      });
      
      // Update selection based on availability
      if (isAvailable) {
        newSelected.add(combinationId);
        console.log(`✅ Selected combination: ${combinationId} (${combination.displayName}) - Reasons: ${availabilityReasons.join(', ')}`);
      } else {
        newSelected.delete(combinationId);
        console.log(`❌ Deselected combination: ${combinationId} (${combination.displayName}) - Reasons: ${availabilityReasons.join(', ')}`);
      }
    });
    
    setSelectedCombinations(newSelected);
    
    const availableCount = group.combinations.filter((c: any) => {
      let isAvailable = true;
      Object.entries(c.values).forEach(([optionName, value]) => {
        const key = `${optionName}:${value}`;
        const optionAvailability = availabilityMap[key];
        
        if (optionAvailability !== undefined) {
          if (optionAvailability === false) {
            isAvailable = false;
          }
        } else {
          // For secondary options without explicit data, be more permissive
          if (optionName !== primaryOptionName && value === groupName) {
            isAvailable = true;
          }
        }
      });
      return isAvailable;
    }).length;
    
    toast({
      title: "Availability Updated",
      description: `${availableCount} of ${group.combinations.length} variants in "${groupName}" are available and have been selected.`
    });
  };

  const handleContinue = () => {
    const selectedVariants = allCombinations.filter(c => selectedCombinations.has(c.id));
    
    if (selectedVariants.length === 0) {
      toast({
        variant: "destructive",
        title: "No Variants Selected",
        description: "Please select at least one variant combination to continue."
      });
      return;
    }

    updateFormState({ selectedVariants });
    onComplete();
    
    toast({
      title: "Success",
      description: `Selected ${selectedVariants.length} variant${selectedVariants.length !== 1 ? 's' : ''}. Moving to step 3...`
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Select Variant Combinations</h2>
        <p className="text-muted-foreground">
          Choose which variant combinations you want to create. Not all combinations may exist for your product.
        </p>
      </div>


      {/* Variant Combinations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Available Variant Combinations
              </CardTitle>
              <CardDescription>
                {allCombinations.length} total combinations found from {formState.selectedOptionTypes?.length || 0} option types
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="gap-1"
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
                {viewMode === 'grid' ? 'List' : 'Grid'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selection Controls */}
          <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {selectedCombinations.size} of {allCombinations.length} selected
                </span>
                {selectedCombinations.size > 0 && (
                  <Badge variant="secondary">
                    {Math.round((selectedCombinations.size / allCombinations.length) * 100)}%
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllCombinations}
                  disabled={selectedCombinations.size === allCombinations.length}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deselectAllCombinations}
                  disabled={selectedCombinations.size === 0}
                >
                  Deselect All
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={expandAllGroups}
                className="gap-1"
              >
                <ChevronDown className="h-4 w-4" />
                Expand All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={collapseAllGroups}
                className="gap-1"
              >
                <ChevronRight className="h-4 w-4" />
                Collapse All
              </Button>
            </div>
          </div>

          {/* Grouped Combinations */}
          <div className="space-y-3">
            {Object.entries(groupedCombinations).map(([groupName, group]: [string, any]) => {
              const groupCombinationIds = group.combinations.map((c: any) => c.id);
              const selectedInGroup = groupCombinationIds.filter((id: string) => selectedCombinations.has(id)).length;
              const isGroupFullySelected = selectedInGroup === groupCombinationIds.length;
              const isGroupPartiallySelected = selectedInGroup > 0 && selectedInGroup < groupCombinationIds.length;
              const isExpanded = expandedGroups.has(groupName);
              
              return (
                <Collapsible key={groupName} open={isExpanded} onOpenChange={() => toggleGroupExpansion(groupName)}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isGroupFullySelected}
                          ref={(el) => {
                            if (el) el.indeterminate = isGroupPartiallySelected;
                          }}
                          onChange={() => toggleGroupSelection(groupName)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <div>
                            <h3 className="font-medium">{group.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {selectedInGroup} of {groupCombinationIds.length} selected
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openParserModal(groupName);
                          }}
                          className="gap-1 text-xs"
                        >
                          <Globe className="h-3 w-3" />
                          Determine Active
                        </Button>
                        <Badge variant="outline" className="text-xs">
                          {groupCombinationIds.length} variants
                        </Badge>
                        {isGroupFullySelected && <CheckCircle className="h-4 w-4 text-primary" />}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className={`ml-8 mt-2 space-y-2 ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2' : 'space-y-2'}`}>
                      {group.combinations.map((combination: any) => {
                        const isSelected = selectedCombinations.has(combination.id);
                        return (
                          <div
                            key={combination.id}
                            className={`border rounded-lg p-3 cursor-pointer transition-all ${
                              isSelected 
                                ? 'border-primary bg-primary/5 shadow-sm' 
                                : 'border-border hover:border-primary/50 hover:bg-muted/20'
                            }`}
                            onClick={() => toggleCombinationSelection(combination.id)}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={isSelected}
                                onChange={() => toggleCombinationSelection(combination.id)}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-sm truncate">{combination.displayName}</h4>
                                  {isSelected && <CheckCircle className="h-3 w-3 text-primary flex-shrink-0" />}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {combination.name}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>

          {/* Continue Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button 
              onClick={handleContinue}
              disabled={selectedCombinations.size === 0}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Continue with {selectedCombinations.size} Variant{selectedCombinations.size !== 1 ? 's' : ''}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {selectedCombinations.size > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">
                Ready to configure {selectedCombinations.size} variant{selectedCombinations.size !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              You can use the "Prefill with Parser" button on each variant card to automatically populate data from Amazon HTML.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Parser Modal */}
      <AmazonGroupAvailabilityModal
        isOpen={parserModalOpen}
        onClose={() => setParserModalOpen(false)}
        groupName={currentGroupName}
        onParse={(html) => {
          try {
            const availabilityMap = parseAvailabilityFromHtml(html, currentGroupName || '');
            applyAvailabilityToGroup(availabilityMap, currentGroupName || '');
            setParserModalOpen(false);
          } catch (error) {
            toast({
              variant: "destructive",
              title: "Parsing Error",
              description: error instanceof Error ? error.message : 'Failed to parse HTML'
            });
          }
        }}
      />
    </div>
  );
};
