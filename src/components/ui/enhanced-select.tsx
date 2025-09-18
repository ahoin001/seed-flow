import * as React from "react"
import { Combobox, MultiCombobox, ComboboxOption } from "./combobox"

// Enhanced Select component that uses Combobox by default
interface EnhancedSelectProps {
  options: ComboboxOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  // Allow fallback to native select for specific cases
  useNativeSelect?: boolean
}

export function EnhancedSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No options found.",
  disabled = false,
  className,
  useNativeSelect = false,
}: EnhancedSelectProps) {
  // If useNativeSelect is true, render a native select
  if (useNativeSelect) {
    return (
      <select
        value={value || ""}
        onChange={(e) => onValueChange?.(e.target.value)}
        disabled={disabled}
        className={className}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    )
  }

  // Default to Combobox for searchable functionality
  return (
    <Combobox
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyText={emptyText}
      disabled={disabled}
      className={className}
    />
  )
}

// Multi-select version
interface EnhancedMultiSelectProps {
  options: ComboboxOption[]
  values?: string[]
  onValuesChange?: (values: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  maxDisplay?: number
}

export function EnhancedMultiSelect({
  options,
  values = [],
  onValuesChange,
  placeholder = "Select options...",
  searchPlaceholder = "Search...",
  emptyText = "No options found.",
  disabled = false,
  className,
  maxDisplay = 3,
}: EnhancedMultiSelectProps) {
  return (
    <MultiCombobox
      options={options}
      values={values}
      onValuesChange={onValuesChange}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyText={emptyText}
      disabled={disabled}
      className={className}
      maxDisplay={maxDisplay}
    />
  )
}

// Export the ComboboxOption type for convenience
export type { ComboboxOption }
