import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface FilterChipsProps {
  filters: {
    ageRanges: string[];
    brands: string[];
    flavors: string[];
    containerTypes: string[];
    healthBenefits: string[];
    itemForms: string[];
    dogSizes: string[];
    dietTypes: string[];
    allergenInfo: string[];
  };
  onRemoveFilter: (category: string, value: string) => void;
  onClearAll: () => void;
}

export const FilterChips = ({ filters, onRemoveFilter, onClearAll }: FilterChipsProps) => {
  const allFilters = [
    ...filters.ageRanges.map(value => ({ category: 'Age Range', value })),
    ...filters.brands.map(value => ({ category: 'Brand', value })),
    ...filters.flavors.map(value => ({ category: 'Flavor', value })),
    ...filters.containerTypes.map(value => ({ category: 'Container', value })),
    ...filters.healthBenefits.map(value => ({ category: 'Health Benefit', value })),
    ...filters.itemForms.map(value => ({ category: 'Form', value })),
    ...filters.dogSizes.map(value => ({ category: 'Dog Size', value })),
    ...filters.dietTypes.map(value => ({ category: 'Diet', value })),
    ...filters.allergenInfo.map(value => ({ category: 'Allergen', value }))
  ];

  if (allFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm font-medium text-muted-foreground">
        Active filters:
      </span>
      {allFilters.map((filter, index) => (
        <Badge
          key={`${filter.category}-${filter.value}-${index}`}
          variant="secondary"
          className="flex items-center gap-1 pr-1"
        >
          <span className="text-xs">
            {filter.category}: {filter.value}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemoveFilter(filter.category.toLowerCase().replace(' ', ''), filter.value)}
            className="h-4 w-4 p-0 hover:bg-transparent"
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={onClearAll}
        className="text-xs h-6"
      >
        Clear All
      </Button>
    </div>
  );
};

