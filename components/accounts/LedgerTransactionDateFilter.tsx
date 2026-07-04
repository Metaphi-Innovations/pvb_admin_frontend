"use client";

import React, { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronsUpDown, Download, FileDown, FileSpreadsheet, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountsFilterDateRangeSection } from "@/components/accounts/AccountsListingFilter";
import {
  DATE_RANGE_PRESET_OPTIONS,
  type DateRangePresetId,
} from "@/lib/accounts/report-date-presets";
import {
  defaultLedgerDateRangeState,
  resolvePresetDateRange,
  type LedgerDateRangeState,
} from "@/lib/accounts/ledger-transaction-date-filter";
import { useFY } from "@/lib/fy-store";

const filterControlClass =
  "h-9 text-[13px] font-medium rounded-lg border border-border bg-background focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:border-brand-400";

const exportTriggerClass = cn(
  filterControlClass,
  "inline-flex items-center justify-center gap-1.5 px-3 hover:bg-muted/30 transition-colors ml-auto",
  "disabled:pointer-events-none disabled:opacity-50",
);

export function useLedgerTransactionDateFilter(options?: { autoApply?: boolean }) {
  const { selectedFY } = useFY();
  const autoApply = options?.autoApply ?? false;
  const [applied, setApplied] = useState<LedgerDateRangeState>(() =>
    defaultLedgerDateRangeState(selectedFY.id),
  );
  const [draft, setDraft] = useState<LedgerDateRangeState>(applied);

  useEffect(() => {
    const next = defaultLedgerDateRangeState(selectedFY.id);
    setApplied(next);
    setDraft(next);
  }, [selectedFY.id]);

  const apply = () => {
    const range = resolvePresetDateRange(draft.preset, { from: draft.from, to: draft.to });
    const next = { preset: draft.preset, ...range };
    setApplied(next);
    setDraft(next);
  };

  const setPreset = (preset: DateRangePresetId) => {
    const range = resolvePresetDateRange(preset, { from: draft.from, to: draft.to });
    const next = { preset, ...range };
    setDraft(next);
    if (autoApply && preset !== "custom") {
      setApplied(next);
    }
  };

  return {
    applied,
    draft,
    setPreset,
    setDraftFrom: (from: string) => setDraft((d) => ({ ...d, from })),
    setDraftTo: (to: string) => setDraft((d) => ({ ...d, to })),
    apply,
  };
}

export function LedgerTransactionDateFilter({
  preset,
  dateFrom,
  dateTo,
  onPresetChange,
  onDateFromChange,
  onDateToChange,
  onApply,
  search,
  onSearchChange,
  searchPlaceholder = "Search voucher no., narration or reference…",
  onExportExcel,
  onExportPdf,
  exporting = false,
  autoApplyPresets = false,
}: {
  preset: DateRangePresetId;
  dateFrom: string;
  dateTo: string;
  onPresetChange: (preset: DateRangePresetId) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onApply: () => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
  exporting?: boolean;
  /** When true, preset changes apply immediately; Apply is shown only for custom range. */
  autoApplyPresets?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const presetLabel =
    DATE_RANGE_PRESET_OPTIONS.find((o) => o.id === preset)?.label ?? "Custom Range";
  const showExport = onExportExcel || onExportPdf;
  const showApply = !autoApplyPresets || preset === "custom";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {onSearchChange !== undefined && (
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className={cn(filterControlClass, "pl-8 w-full")}
          />
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          className={cn(
            filterControlClass,
            "min-w-[140px] px-2.5 flex items-center justify-between hover:bg-muted/30 transition-colors text-left",
          )}
        >
          <span className="truncate text-foreground">{presetLabel}</span>
          <ChevronsUpDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-44 p-1">
          {DATE_RANGE_PRESET_OPTIONS.map((option) => {
            const selected = preset === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onPresetChange(option.id);
                  if (option.id !== "custom") setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left rounded-lg transition-colors",
                  selected ? "bg-brand-50 text-brand-700" : "hover:bg-muted/60 text-foreground",
                )}
              >
                {selected ? (
                  <Check className="w-4 h-4 text-brand-600 flex-shrink-0" />
                ) : (
                  <span className="w-3.5 flex-shrink-0" />
                )}
                <span className="flex-1">{option.label}</span>
              </button>
            );
          })}
        </PopoverContent>
      </Popover>

      {preset === "custom" && (
        <AccountsFilterDateRangeSection
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={onDateFromChange}
          onDateToChange={onDateToChange}
          size="default"
        />
      )}

      {showApply && (
        <Button
          type="button"
          size="sm"
          className="h-9 text-[13px] font-medium bg-brand-600 hover:bg-brand-700 text-white px-3"
          onClick={onApply}
        >
          Apply
        </Button>
      )}

      {showExport && (
        <DropdownMenu>
          <DropdownMenuTrigger disabled={exporting} className={exportTriggerClass}>
            <Download className="w-4 h-4" />
            Export
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {onExportExcel && (
              <DropdownMenuItem
                className="text-xs gap-2 cursor-pointer"
                disabled={exporting}
                onClick={onExportExcel}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </DropdownMenuItem>
            )}
            {onExportPdf && (
              <DropdownMenuItem className="text-xs gap-2 cursor-pointer" onClick={onExportPdf}>
                <FileDown className="w-4 h-4" />
                PDF
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
