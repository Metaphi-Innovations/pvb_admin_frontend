"use client";

import { Check, ChevronDown, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const MAX_VISIBLE_CHIPS = 2;

interface PricingScopeMultiSelectProps {
  label: string;
  required?: boolean;
  options: readonly string[];
  selected: string[];
  onChange: (values: string[]) => void;
  applyToAll: boolean;
  onApplyToAllChange: (checked: boolean) => void;
  applyToAllLabel: string;
  selectAllLabel: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

function ScopeChip({
  label,
  onRemove,
  disabled,
}: {
  label: string;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  return (
    <span className="inline-flex max-w-[8.5rem] items-center gap-0.5 rounded border border-brand-200 bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-800">
      <span className="truncate">{label}</span>
      {onRemove && !disabled ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="shrink-0 text-brand-600 hover:text-brand-800"
          aria-label={`Remove ${label}`}
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </span>
  );
}

function CompactChipRow({
  values,
  onRemove,
  disabled,
}: {
  values: string[];
  onRemove?: (value: string) => void;
  disabled?: boolean;
}) {
  const visible = values.slice(0, MAX_VISIBLE_CHIPS);
  const overflow = values.length - MAX_VISIBLE_CHIPS;

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
      {visible.map((value) => (
        <ScopeChip
          key={value}
          label={value}
          disabled={disabled}
          onRemove={onRemove ? () => onRemove(value) : undefined}
        />
      ))}
      {overflow > 0 ? (
        <span className="inline-flex items-center rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}

const triggerBaseClass =
  "flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-white px-2.5 text-left text-xs shadow-sm transition-colors";

export function PricingScopeMultiSelect({
  label,
  required,
  options,
  selected,
  onChange,
  applyToAll,
  onApplyToAllChange,
  applyToAllLabel,
  selectAllLabel,
  placeholder = "Select...",
  disabled = false,
  error,
}: PricingScopeMultiSelectProps) {
  const isDisabled = disabled || applyToAll;
  const allSelected = selected.length === options.length && options.length > 0;

  const toggleValue = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  };

  const selectAll = () => onChange([...options]);
  const clearAll = () => onChange([]);
  const removeChip = (value: string) => onChange(selected.filter((item) => item !== value));

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-foreground">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </Label>

      <div
        className={cn(
          "rounded-lg border bg-white p-2 shadow-sm",
          error ? "border-red-300 ring-1 ring-red-100" : "border-border",
          isDisabled && "bg-muted/25",
        )}
      >
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={isDisabled}
              aria-label={`${label} selector`}
              className={cn(
                triggerBaseClass,
                error
                  ? "border-red-400 hover:border-red-400"
                  : "border-border hover:border-brand-400 hover:bg-brand-50/40",
                "focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200",
                isDisabled && "cursor-not-allowed opacity-60 hover:border-border hover:bg-white",
                applyToAll && "border-dashed bg-muted/25",
              )}
            >
              {applyToAll ? (
                <span className="truncate font-medium text-brand-700">{applyToAllLabel}</span>
              ) : selected.length === 0 ? (
                <span className="truncate text-muted-foreground">{placeholder}</span>
              ) : (
                <CompactChipRow
                  values={selected}
                  onRemove={isDisabled ? undefined : removeChip}
                  disabled={isDisabled}
                />
              )}
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[var(--radix-popover-trigger-width)] border border-border p-0 shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-border bg-muted/25 px-2.5 py-1.5">
              <button
                type="button"
                onClick={selectAll}
                className="text-[11px] font-semibold text-brand-600 hover:text-brand-700"
              >
                {selectAllLabel}
              </button>
              {selected.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="max-h-52 overflow-y-auto p-1">
              {options.map((option) => {
                const checked = selected.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleValue(option)}
                    className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-brand-50"
                  >
                    <span
                      className={cn(
                        "mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border",
                        checked
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-border bg-white",
                      )}
                    >
                      {checked && <Check className="h-2.5 w-2.5" />}
                    </span>
                    <span className="text-xs text-foreground">{option}</span>
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        <label
          className={cn(
            "mt-2 flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-2 py-1.5 text-xs",
            applyToAll
              ? "border-brand-200 bg-brand-50/60 text-brand-800"
              : "border-border bg-muted/20 text-muted-foreground",
          )}
        >
          <Checkbox
            checked={applyToAll}
            disabled={disabled}
            onCheckedChange={(checked) => {
              const next = checked === true;
              onApplyToAllChange(next);
              if (next) onChange([]);
            }}
          />
          <span className="font-medium">{applyToAllLabel}</span>
          {allSelected && !applyToAll ? (
            <span className="text-[10px] font-semibold text-brand-600">(all selected)</span>
          ) : null}
        </label>
      </div>

      {error ? <p className="text-[11px] font-medium text-red-500">{error}</p> : null}
    </div>
  );
}
