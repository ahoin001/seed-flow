import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, X, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FilterState {
  ageRanges: string[];
  brands: string[];
  flavors: string[];
  containerTypes: string[];
  healthBenefits: string[];
  itemForms: string[];
  dogSizes: string[];
  dietTypes: string[];
  allergenInfo: string[];
}

interface ProductFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
  initialFilters?: FilterState;
}

export const ProductFilters = ({ onFiltersChange, initialFilters }: ProductFiltersProps) => {
  const [filters, setFilters] = useState<FilterState>(initialFilters || {
    ageRanges: [],
    brands: [],
    flavors: [],
    containerTypes: [],
    healthBenefits: [],
    itemForms: [],
    dogSizes: [],
    dietTypes: [],
    allergenInfo: []
  });

  const [filterOptions, setFilterOptions] = useState({
    ageRanges: [],
    brands: [],
    flavors: [],
    containerTypes: [],
    healthBenefits: [],
    itemForms: [],
    dogSizes: [],
    dietTypes: [],
    allergenInfo: []
  });

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Load filter options from database
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        // Load age ranges
        const { data: ageRanges } = await supabase
          .from('age_ranges')
          .select('name')
          .eq('is_active', true)
          .order('name');

        // Load brands
        const { data: brands } = await supabase
          .from('brands')
          .select('name')
          .eq('is_active', true)
          .order('name');

        // Load flavors
        const { data: flavors } = await supabase
          .from('flavors')
          .select('name')
          .order('name');

        // Load container types
        const { data: containerTypes } = await supabase
          .from('package_types')
          .select('container_type')
          .eq('is_amazon_filter', true)
          .not('container_type', 'is', null)
          .order('container_type');

        // Load health benefits
        const { data: healthBenefits } = await supabase
          .from('health_benefits')
          .select('name')
          .eq('is_active', true)
          .order('name');

        // Load dog sizes
        const { data: dogSizes } = await supabase
          .from('dog_sizes')
          .select('name')
          .eq('is_active', true)
          .order('name');

        // Load diet types
        const { data: dietTypes } = await supabase
          .from('diet_types')
          .select('name')
          .eq('is_active', true)
          .order('name');

        // Load allergen info
        const { data: allergenInfo } = await supabase
          .from('allergen_info')
          .select('name')
          .eq('is_active', true)
          .order('name');

        setFilterOptions({
          ageRanges: ageRanges?.map(item => item.name) || [],
          brands: brands?.map(item => item.name) || [],
          flavors: flavors?.map(item => item.name) || [],
          containerTypes: [...new Set(containerTypes?.map(item => item.container_type))] || [],
          healthBenefits: healthBenefits?.map(item => item.name) || [],
          itemForms: ['Pellet', 'Granule', 'Chunk', 'Flake', 'Liquid', 'Pate', 'Stick', 'Capsule', 'Powder', 'Tablet'],
          dogSizes: dogSizes?.map(item => item.name) || [],
          dietTypes: dietTypes?.map(item => item.name) || [],
          allergenInfo: allergenInfo?.map(item => item.name) || []
        });
      } catch (error) {
        console.error('Error loading filter options:', error);
      }
    };

    loadFilterOptions();
  }, []);

  const updateFilter = (category: keyof FilterState, value: string, checked: boolean) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      if (checked) {
        newFilters[category] = [...newFilters[category], value];
      } else {
        newFilters[category] = newFilters[category].filter(item => item !== value);
      }
      return newFilters;
    });
  };

  const clearFilter = (category: keyof FilterState) => {
    setFilters(prev => ({
      ...prev,
      [category]: []
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      ageRanges: [],
      brands: [],
      flavors: [],
      containerTypes: [],
      healthBenefits: [],
      itemForms: [],
      dogSizes: [],
      dietTypes: [],
      allergenInfo: []
    });
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // Notify parent component when filters change
  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const FilterSection = ({ 
    title, 
    category, 
    options, 
    sectionKey 
  }: { 
    title: string; 
    category: keyof FilterState; 
    options: string[]; 
    sectionKey: string;
  }) => {
    const isExpanded = expandedSections.has(sectionKey);
    const selectedCount = filters[category].length;

    return (
      <Collapsible open={isExpanded} onOpenChange={() => toggleSection(sectionKey)}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-0 h-auto">
            <div className="flex items-center gap-2">
              <span className="font-medium">{title}</span>
              {selectedCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {selectedCount}
                </Badge>
              )}
            </div>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 mt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              {options.length} options
            </span>
            {selectedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearFilter(category)}
                className="text-xs h-6 px-2"
              >
                Clear
              </Button>
            )}
          </div>
          <div className="max-h-32 overflow-y-auto space-y-2">
            {options.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${category}-${option}`}
                  checked={filters[category].includes(option)}
                  onCheckedChange={(checked) => updateFilter(category, option, checked as boolean)}
                />
                <Label
                  htmlFor={`${category}-${option}`}
                  className="text-sm cursor-pointer flex-1"
                >
                  {option}
                </Label>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const totalActiveFilters = Object.values(filters).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
            {totalActiveFilters > 0 && (
              <Badge variant="secondary">
                {totalActiveFilters}
              </Badge>
            )}
          </CardTitle>
          {totalActiveFilters > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs"
            >
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <FilterSection
          title="Age Range"
          category="ageRanges"
          options={filterOptions.ageRanges}
          sectionKey="ageRanges"
        />

        <FilterSection
          title="Brands"
          category="brands"
          options={filterOptions.brands}
          sectionKey="brands"
        />

        <FilterSection
          title="Flavor"
          category="flavors"
          options={filterOptions.flavors}
          sectionKey="flavors"
        />

        <FilterSection
          title="Container Type"
          category="containerTypes"
          options={filterOptions.containerTypes}
          sectionKey="containerTypes"
        />

        <FilterSection
          title="Specific Uses"
          category="healthBenefits"
          options={filterOptions.healthBenefits}
          sectionKey="healthBenefits"
        />

        <FilterSection
          title="Item Form"
          category="itemForms"
          options={filterOptions.itemForms}
          sectionKey="itemForms"
        />

        <FilterSection
          title="Dog Size"
          category="dogSizes"
          options={filterOptions.dogSizes}
          sectionKey="dogSizes"
        />

        <FilterSection
          title="Diet Type"
          category="dietTypes"
          options={filterOptions.dietTypes}
          sectionKey="dietTypes"
        />

        <FilterSection
          title="Allergen Information"
          category="allergenInfo"
          options={filterOptions.allergenInfo}
          sectionKey="allergenInfo"
        />
      </CardContent>
    </Card>
  );
};

