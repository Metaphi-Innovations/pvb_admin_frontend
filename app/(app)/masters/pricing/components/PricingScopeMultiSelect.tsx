"use client";

import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const MAX_VISIBLE_CHIPS = 2;

interface PricingScopeMultiSelectProps {
  label: string;
  required?: boolean;
  options: readonly string[];
  optionLabels?: Record<string, string>;
  selected: string[];
  onChange: (values: string[]) => void;
  selectAllLabel: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  invalid?: boolean;
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
  labels,
  onRemove,
  disabled,
}: {
  values: string[];
  labels?: Record<string, string>;
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
          label={labels?.[value] ?? value}
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
  optionLabels,
  selected,
  onChange,
  selectAllLabel,
  placeholder = "Select...",
  disabled = false,
  error,
  invalid = false,
}: PricingScopeMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(selected);

  const isDisabled = disabled;
  const allSelected = draft.length === options.length && options.length > 0;
  const allDraftSelected = draft.length === options.length && options.length > 0;
  const showSelectAll = options.length > 0;
  const showInvalid = invalid || Boolean(error?.trim());
  const errorMessage = error?.trim() || "";

  const toggleValue = (value: string) => {
    setDraft(
      draft.includes(value)
        ? draft.filter((item) => item !== value)
        : [...draft, value],
    );
  };

  const selectAll = () => setDraft([...options]);
  const clearAll = () => setDraft([]);
  const removeChip = (value: string) => onChange(selected.filter((item) => item !== value));

  const handleOpenChange = (next: boolean) => {
    if (isDisabled) return;
    if (next) {
      setDraft(selected);
      setOpen(true);
      return;
    }
    setDraft(selected);
    setOpen(false);
  };

  const handleDone = () => {
    onChange(draft);
    setOpen(false);
  };
  const resolveLabel = (value: string) => optionLabels?.[value] ?? value;

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-foreground">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </Label>

      <div
        className={cn(
          "rounded-lg border bg-white p-2 shadow-sm",
          showInvalid ? "border-red-300 ring-1 ring-red-100" : "border-border",
          isDisabled && "bg-muted/25",
        )}
      >
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={isDisabled}
              aria-label={`${label} selector`}
              className={cn(
                triggerBaseClass,
                showInvalid
                  ? "border-red-400 hover:border-red-400"
                  : "border-border hover:border-brand-400 hover:bg-brand-50/40",
                "focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200",
                isDisabled && "cursor-not-allowed opacity-60 hover:border-border hover:bg-white",
              )}
            >
              {selected.length === 0 ? (
                <span className="truncate text-muted-foreground">{placeholder}</span>
              ) : (
                <CompactChipRow
                  values={selected}
                  labels={Object.fromEntries(
                    selected.map((value) => [value, resolveLabel(value)]),
                  )}
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
              <span className="text-[11px] text-muted-foreground">{draft.length} selected</span>
              {draft.length > 0 && (
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
              {showSelectAll && (
                <>
                  <button
                    type="button"
                    onClick={() => (allSelected ? clearAll() : selectAll())}
                    className="flex w-full items-start gap-2 rounded px-1.5 py-1.5 text-left hover:bg-muted"
                  >
                    <span
                      className={cn(
                        "mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border",
                        allSelected
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-border bg-white",
                      )}
                    >
                      {allSelected && <Check className="h-2.5 w-2.5" />}
                    </span>
                    <span className="text-xs font-semibold text-brand-700">
                      {selectAllLabel} ({options.length})
                    </span>
                  </button>
                  <div className="my-1 border-t border-border" />
                </>
              )}
              {options.map((option) => {
                const checked = draft.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleValue(option)}
                    className="flex w-full items-start gap-2 rounded px-1.5 py-1.5 text-left hover:bg-muted"
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
                    <span className="text-xs text-foreground">{resolveLabel(option)}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between border-t border-border px-2.5 py-2">
              <span className="text-[10px] text-muted-foreground">
                {draft.length} of {options.length} selected
                {allDraftSelected ? " (all)" : ""}
              </span>
              <button
                type="button"
                onClick={handleDone}
                className="text-[11px] font-medium text-brand-600 hover:text-brand-700"
              >
                Done
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {errorMessage ? <p className="text-[11px] font-medium text-red-500">{errorMessage}</p> : null}
    </div>
  );
}
