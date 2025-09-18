import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { EnhancedSelect, EnhancedMultiSelect, ComboboxOption } from "@/components/ui/enhanced-select";

// Demo data
const brandOptions: ComboboxOption[] = [
  { value: "1", label: "Purina" },
  { value: "2", label: "Royal Canin" },
  { value: "3", label: "Hill's Science Diet" },
  { value: "4", label: "Blue Buffalo" },
  { value: "5", label: "Wellness" },
  { value: "6", label: "Merrick" },
  { value: "7", label: "Fromm" },
  { value: "8", label: "Taste of the Wild" },
  { value: "9", label: "Orijen" },
  { value: "10", label: "Acana" },
];

const categoryOptions: ComboboxOption[] = [
  { value: "1", label: "Dry Food" },
  { value: "2", label: "Wet Food" },
  { value: "3", label: "Treats" },
  { value: "4", label: "Supplements" },
  { value: "5", label: "Raw Food" },
  { value: "6", label: "Freeze-Dried" },
  { value: "7", label: "Dehydrated" },
  { value: "8", label: "Frozen" },
];

export const EnhancedSelectDemo = () => {
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Select Components Demo</CardTitle>
          <CardDescription>
            These select components allow typing to filter options, making them much more user-friendly for large lists.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Single Select Example */}
          <div className="space-y-2">
            <Label htmlFor="brand-select">Select Brand (Single)</Label>
            <EnhancedSelect
              options={brandOptions}
              value={selectedBrand}
              onValueChange={setSelectedBrand}
              placeholder="Choose a brand..."
              searchPlaceholder="Type to search brands..."
              emptyText="No brands found matching your search."
            />
            {selectedBrand && (
              <p className="text-sm text-muted-foreground">
                Selected: {brandOptions.find(b => b.value === selectedBrand)?.label}
              </p>
            )}
          </div>

          {/* Multi Select Example */}
          <div className="space-y-2">
            <Label htmlFor="category-select">Select Categories (Multiple)</Label>
            <EnhancedMultiSelect
              options={categoryOptions}
              values={selectedCategories}
              onValuesChange={setSelectedCategories}
              placeholder="Choose categories..."
              searchPlaceholder="Type to search categories..."
              emptyText="No categories found matching your search."
              maxDisplay={2}
            />
            {selectedCategories.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedCategories.map(id => 
                  categoryOptions.find(c => c.value === id)?.label
                ).join(", ")}
              </p>
            )}
          </div>

          {/* Benefits */}
          <div className="space-y-2">
            <h4 className="font-semibold">Benefits of Enhanced Select:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Searchable:</strong> Type to filter options instantly</li>
              <li>• <strong>Keyboard Navigation:</strong> Use arrow keys and Enter to select</li>
              <li>• <strong>Accessible:</strong> Full screen reader support</li>
              <li>• <strong>Customizable:</strong> Custom placeholders and empty states</li>
              <li>• <strong>Multi-select:</strong> Select multiple options at once</li>
              <li>• <strong>Fallback:</strong> Can use native select when needed</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
