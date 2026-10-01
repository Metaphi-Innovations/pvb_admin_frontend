"use client";

import React, { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ChevronsUpDown, Search, X } from "lucide-react";
import {
  formatSchemeProductOptionLabel,
  type SchemeProductSelectOption,
} from "../product-discount-scheme";

interface SchemeProductMultiSelectProps {
  label?: string;
  options: SchemeProductSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  error?: boolean;
  /** Inline validation message under the control. */
  errorMessage?: string;
  required?: boolean;
  dense?: boolean;
  /**
   * @deprecated No longer renders chips below the field. Kept for call-site compatibility.
   * Closed field always uses a single-line compact count summary when dense.
   */
  showChips?: boolean;
  /** @deprecated Unused — closed field no longer renders chip overflow. */
  maxVisibleChips?: number;
  /** Show Clear All in the opened dropdown footer only. */
  showClearAll?: boolean;
  /** Prefer Code/SKU — Name — Pack Size in list options. */
  preferIdentityLabel?: boolean;
  /**
   * When empty, treat placeholder as the active summary (e.g. Near Expiry “All Products”)
   * instead of a muted empty hint.
   */
  emptyAsSummary?: boolean;
  className?: string;
}

function handleScrollableWheel(event: React.WheelEvent<HTMLElement>) {
  const current = event.currentTarget;
  if (current.scrollHeight <= current.clientHeight) return;

  const atTop = current.scrollTop <= 0;
  const atBottom = current.scrollTop + current.clientHeight >= current.scrollHeight - 1;
  const scrollingUp = event.deltaY < 0;
  const scrollingDown = event.deltaY > 0;

  if ((scrollingUp && atTop) || (scrollingDown && atBottom)) return;

  event.preventDefault();
  event.stopPropagation();
  current.scrollTop += event.deltaY;
}

function optionIdentityLabel(opt: SchemeProductSelectOption, preferIdentity: boolean): string {
  if (!preferIdentity) return opt.label;
  return formatSchemeProductOptionLabel({
    productName: opt.productName || opt.label,
    productCode: opt.productCode,
    sku: opt.sku,
    packSizeLabel: opt.packSizeLabel,
  });
}

function ProductMetaLine({ opt }: { opt: SchemeProductSelectOption }) {
  const items = [
    opt.sku ? { key: "sku", text: `SKU: ${opt.sku}` } : null,
    opt.productCode ? { key: "code", text: `Code: ${opt.productCode}` } : null,
    opt.scientificName ? { key: "sci", text: opt.scientificName } : null,
    opt.packSizeLabel ? { key: "pack", text: opt.packSizeLabel } : null,
    opt.category ? { key: "cat", text: opt.category } : null,
    opt.segment ? { key: "seg", text: opt.segment } : null,
    opt.hsnCode ? { key: "hsn", text: `HSN: ${opt.hsnCode}` } : null,
    opt.supplier ? { key: "sup", text: opt.supplier } : null,
  ].filter((item): item is { key: string; text: string } => Boolean(item));

  if (items.length === 0) return null;

  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {items.map((item) => (
        <span
          key={item.key}
          className="inline-flex max-w-full truncate rounded bg-muted/60 px-1.5 py-0.5 text-[10px] leading-tight text-muted-foreground"
        >
          {item.text}
        </span>
      ))}
    </span>
  );
}

export function SchemeProductMultiSelect({
  label = "Products",
  options,
  value,
  onChange,
  placeholder = "Search and select products...",
  searchPlaceholder = "Search name, code, or SKU…",
  disabled = false,
  error = false,
  errorMessage,
  required = false,
  dense = false,
  showChips = false,
  maxVisibleChips: _maxVisibleChips = 3,
  showClearAll,
  preferIdentityLabel = false,
  emptyAsSummary = false,
  className,
}: SchemeProductMultiSelectProps) {
  void showChips;
  void _maxVisibleChips;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const clearAllEnabled = showClearAll ?? false;

  const filtered = options.filter((opt) => {
    const haystack = `${opt.label} ${opt.productName ?? ""} ${opt.scientificName ?? ""} ${opt.sublabel ?? ""} ${opt.searchText ?? ""}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  const filteredValues = filtered.map((opt) => opt.value);
  const allFilteredSelected =
    filteredValues.length > 0 && filteredValues.every((id) => value.includes(id));

  const selectedOptions = useMemo(
    () =>
      value
        .map((id) => options.find((opt) => opt.value === id))
        .filter((opt): opt is SchemeProductSelectOption => Boolean(opt)),
    [options, value],
  );

  const toggleValue = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((item) => item !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      onChange(value.filter((id) => !filteredValues.includes(id)));
      return;
    }
    onChange([...new Set([...value, ...filteredValues])]);
  };

  const singleSelected = value.length === 1 ? selectedOptions[0] ?? null : null;

  /** Fixed single-line closed summary — never expands with chips or overflow badges. */
  const compactTriggerLabel =
    value.length === 0
      ? null
      : value.length === 1
        ? "1 Product Selected"
        : `${value.length} Products Selected`;

  const emptyTrigger = (
    <span
      className={cn(
        "truncate",
        emptyAsSummary ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {placeholder}
    </span>
  );

  const triggerContent =
    dense || preferIdentityLabel ? (
      value.length === 0 ? (
        emptyTrigger
      ) : (
        <span className="truncate text-foreground">{compactTriggerLabel}</span>
      )
    ) : value.length === 0 ? (
      emptyTrigger
    ) : value.length === 1 && singleSelected ? (
      <span className="min-w-0 flex-1 truncate font-medium text-foreground text-xs">
        {optionIdentityLabel(singleSelected, preferIdentityLabel)}
      </span>
    ) : (
      <span className="truncate text-foreground">{`${value.length} Products Selected`}</span>
    );

  const showError = Boolean(errorMessage) || error;

  return (
    <div className={cn("w-full", dense ? "space-y-0.5" : "space-y-1", className)}>
      <Label
        className={cn(
          "font-medium text-muted-foreground",
          dense ? "text-[10px]" : "text-[11px]",
        )}
      >
        {label}
        {required && <span className="text-red-500"> *</span>}
      </Label>
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (!disabled) setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "scheme-ctrl flex w-full cursor-pointer items-center justify-between border border-border bg-white text-left transition-colors select-none focus:outline-none",
              dense
                ? "h-7 min-h-7 max-h-7 rounded-md px-2 py-0 text-[11px] shadow-none overflow-hidden"
                : "h-9 min-h-9 max-h-9 rounded-lg px-3 py-0 text-xs shadow-sm overflow-hidden",
              open && !showError ? "border-brand-500 ring-2 ring-brand-200" : "",
              showError
                ? "border-red-400 ring-1 ring-red-200"
                : !open
                  ? "hover:border-brand-300 hover:bg-muted/20"
                  : "",
              disabled && "cursor-not-allowed bg-muted/30 opacity-50",
            )}
          >
            <span className="min-w-0 flex-1 truncate">{triggerContent}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className={cn(
            "rounded-xl border border-border bg-white p-0 shadow-lg overflow-hidden",
            dense
              ? "w-[var(--radix-popover-trigger-width)] min-w-[min(28rem,90vw)]"
              : "w-[var(--radix-popover-trigger-width)]",
          )}
          align="start"
          sideOffset={4}
        >
          <div
            className="max-h-[min(22rem,var(--radix-popover-content-available-height))] overflow-y-auto overscroll-contain"
            onWheelCapture={handleScrollableWheel}
          >
            <div className="sticky top-0 z-10 border-b border-border bg-white">
              <div className="p-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-[9px] h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    autoFocus
                    className="h-8 w-full rounded-lg border border-border bg-muted/10 pl-8 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-200"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="absolute right-2 top-[7px] rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {filtered.length > 0 ? (
                <button
                  type="button"
                  onClick={toggleAllFiltered}
                  className="flex w-full items-center gap-2 px-3 py-2 text-[11px] font-semibold text-brand-600 hover:bg-muted/60"
                >
                  <Checkbox checked={allFilteredSelected} className="h-3.5 w-3.5" />
                  Select All Filtered ({filtered.length})
                </button>
              ) : null}
            </div>

            <div className="p-1.5">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-1 py-4">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <p className="text-[11px] text-muted-foreground">
                    {query ? `No results for "${query}"` : "No products available"}
                  </p>
                </div>
              ) : (
                <>
                  {filtered.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={opt.disabled}
                      onClick={() => toggleValue(opt.value)}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40",
                        value.includes(opt.value) && "bg-brand-50",
                      )}
                    >
                      <Checkbox
                        checked={value.includes(opt.value)}
                        className="mt-0.5 h-3.5 w-3.5 flex-shrink-0"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold leading-snug text-foreground">
                          {optionIdentityLabel(opt, preferIdentityLabel)}
                        </span>
                        {!preferIdentityLabel ? <ProductMetaLine opt={opt} /> : null}
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="sticky bottom-0 z-10 flex items-center justify-between border-t border-border bg-white px-2.5 py-2">
            <span className="text-[10px] text-muted-foreground">
              {value.length} of {options.length} selected
            </span>
            <div className="flex items-center gap-2">
              {clearAllEnabled && value.length > 0 ? (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  Clear All
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[11px] font-medium text-brand-600 hover:text-brand-700"
              >
                Done
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {errorMessage ? (
        <p className="text-[11px] text-red-500">{errorMessage}</p>
      ) : null}
    </div>
  );
}
