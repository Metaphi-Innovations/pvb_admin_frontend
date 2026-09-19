"use client";

import {
  AutocompleteSelect,
  type AutocompleteOption,
} from "@/components/ui/AutocompleteSelect";
import { cn } from "@/lib/utils";

interface SchemeSearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: AutocompleteOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

/** Dense searchable single-select used across Scheme create/edit forms. */
export function SchemeSearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  disabled = false,
  error = false,
  className,
}: SchemeSearchableSelectProps) {
  return (
    <AutocompleteSelect
      options={options}
      value={value}
      onChange={(next) => onChange(String(next ?? ""))}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      disabled={disabled}
      error={error}
      className={cn(
        "h-7 rounded-md px-2 text-[11px] shadow-none",
        "scheme-ctrl",
        className,
      )}
    />
  );
}

export function toSchemeSelectOptions(
  values: readonly string[],
  labels?: Partial<Record<string, string>>,
): AutocompleteOption[] {
  return values.map((value) => ({
    value,
    label: labels?.[value] ?? value,
  }));
}
