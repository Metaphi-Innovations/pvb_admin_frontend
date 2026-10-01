"use client";

import { Label } from "@/components/ui/label";
import {
  AutocompleteSelect,
  type AutocompleteOption,
} from "@/components/ui/AutocompleteSelect";
import { cn } from "@/lib/utils";
import { DP_LABEL_CLASS, DP_SELECT_CLASS } from "./direct-purchase-form-ui";

export const DP_TABLE_SELECT_CLASS =
  "h-8 w-full min-w-0 text-[13px] rounded-lg px-2 shadow-none";

export function DirectPurchaseSelectField({
  label,
  required,
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  disabled,
  className,
}: {
  label?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: AutocompleteOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className="space-y-0.5">
      {label ? (
        <Label className={DP_LABEL_CLASS}>
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      ) : null}
      <AutocompleteSelect
        options={options}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        disabled={disabled}
        className={cn(DP_SELECT_CLASS, className)}
      />
    </div>
  );
}

/** Label-less compact select for dense table cells. */
export function DirectPurchaseTableSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  disabled,
  className,
  popoverMinWidth,
}: {
  value: string;
  onChange: (value: string) => void;
  options: AutocompleteOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  /** Minimum dropdown width in px — use when trigger column is narrow. */
  popoverMinWidth?: number;
}) {
  const popoverClassName = cn(
    popoverMinWidth === 100 && "min-w-[100px] w-[max(var(--radix-popover-trigger-width),100px)]",
    popoverMinWidth === 88 && "min-w-[88px] w-[max(var(--radix-popover-trigger-width),88px)]",
    popoverMinWidth == null &&
      "min-w-[var(--radix-popover-trigger-width)] w-[var(--radix-popover-trigger-width)]",
  );

  return (
    <AutocompleteSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      disabled={disabled}
      className={cn(DP_TABLE_SELECT_CLASS, className)}
      popoverClassName={popoverClassName}
    />
  );
}
