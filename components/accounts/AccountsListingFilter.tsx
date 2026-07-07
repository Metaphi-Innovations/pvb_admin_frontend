"use client";

/**
 * Accounts module filter UI (date range popover + calendar inputs).
 * Used only by `/accounts/*` routes and `components/accounts/*` consumers.
 * Do not wire into global `ModuleFiltersBar`, `FilterPopover`, or other modules.
 */

import React, { useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountsDateInput } from "@/components/accounts/AccountsDateInput";
import {
  ACCOUNTS_DATE_FILTER_WIDTH_CLASS,
  ACCOUNTS_FILTER_LABEL_CLASS,
} from "@/lib/accounts/accounts-typography";
import { ReportDateRangeFilter } from "@/components/accounts/ReportFilters";
import {
  resolveDateRangePreset,
  type DateRangePresetId,
} from "@/lib/accounts/report-date-presets";

const sectionLabelClass = ACCOUNTS_FILTER_LABEL_CLASS;

export interface AccountsFilterStatusOption {
  value: string;
  label: string;
}

export function AccountsFilterDateRangeSection({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  showLabel = true,
}: {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  showLabel?: boolean;
  /** @deprecated ignored — all date inputs use compact filter sizing */
  size?: "compact" | "default";
}) {
  return (
    <div className="space-y-0.5">
      {showLabel && <span className={ACCOUNTS_FILTER_LABEL_CLASS}>Date Range</span>}
      <div className="flex items-center gap-1.5">
        <AccountsDateInput
          value={dateFrom}
          onChange={onDateFromChange}
          aria-label="From date"
          className={ACCOUNTS_DATE_FILTER_WIDTH_CLASS}
        />
        <span className="text-xs text-[#9CA3AF] select-none" aria-hidden>
          —
        </span>
        <AccountsDateInput
          value={dateTo}
          onChange={onDateToChange}
          aria-label="To date"
          className={ACCOUNTS_DATE_FILTER_WIDTH_CLASS}
        />
      </div>
    </div>
  );
}

export interface AccountsListingFilterPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeCount: number;
  statusOptions?: AccountsFilterStatusOption[];
  status?: string[];
  onStatusChange?: (status: string[]) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
  align?: "start" | "end" | "center";
  className?: string;
}

export function AccountsListingFilterPopover({
  open,
  onOpenChange,
  activeCount,
  statusOptions,
  status = [],
  onStatusChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onApply,
  onReset,
  align = "end",
  className,
}: AccountsListingFilterPopoverProps) {
  const showStatus = Boolean(statusOptions?.length && onStatusChange);

  const toggleStatus = (value: string) => {
    if (!onStatusChange) return;
    onStatusChange(
      status.includes(value) ? status.filter((s) => s !== value) : [...status, value],
    );
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "h-7 px-2.5 text-sm border rounded-lg inline-flex items-center gap-1.5 transition-colors font-medium",
            activeCount > 0
              ? "border-brand-400 bg-brand-50 text-brand-700"
              : "border-border text-muted-foreground hover:bg-muted hover:text-foreground bg-white",
            className,
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filter
          {activeCount > 0 && (
            <span className="w-4 h-4 text-xs bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">
              {activeCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-56 p-0" sideOffset={4}>
        <div className="px-3 py-2.5 border-b border-border">
          <p className="text-xs font-semibold text-foreground">Filter</p>
        </div>

        {showStatus && (
          <div className="px-3 py-2.5 border-b border-border space-y-1.5">
            <p className={sectionLabelClass}>Status</p>
            {statusOptions!.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2.5 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded accent-brand-600 cursor-pointer"
                  checked={status.includes(option.value)}
                  onChange={() => toggleStatus(option.value)}
                />
                <span className="text-xs text-foreground group-hover:text-brand-700 transition-colors">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        )}

        <div className="px-3 py-2.5 border-b border-border">
          <AccountsFilterDateRangeSection
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={onDateFromChange}
            onDateToChange={onDateToChange}
          />
        </div>

        <div className="px-3 py-2 flex items-center justify-between">
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
          <button
            type="button"
            onClick={onApply}
            className="h-7 px-3 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700 transition-colors"
          >
            Apply
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export interface AccountsListingDateFilterProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  /** Default preset when parent starts with empty dates */
  initialPreset?: DateRangePresetId;
  statusOptions?: AccountsFilterStatusOption[];
  status?: string[];
  onStatusChange?: (status: string[]) => void;
  align?: "start" | "end" | "center";
  className?: string;
}

/** Standard accounts listing date range — preset dropdown + optional status filter popover */
export function AccountsListingDateFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  initialPreset = "this_year",
  statusOptions,
  status,
  onStatusChange,
  align = "end",
  className,
}: AccountsListingDateFilterProps) {
  const [preset, setPreset] = useState<DateRangePresetId>(initialPreset);
  const [open, setOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState<string[]>(status ?? []);
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    if (!dateFrom && !dateTo) {
      const { from, to } = resolveDateRangePreset(initialPreset);
      onDateFromChange(from);
      onDateToChange(to);
    }
    didInit.current = true;
  }, [dateFrom, dateTo, initialPreset, onDateFromChange, onDateToChange]);

  const showStatusFilter = Boolean(statusOptions?.length && onStatusChange);

  useEffect(() => {
    if (open) setDraftStatus(status ?? []);
  }, [open, status]);

  const activeCount = status?.length ?? 0;

  const handleApply = () => {
    onStatusChange?.(draftStatus);
    setOpen(false);
  };

  const handleReset = () => {
    setDraftStatus([]);
    onStatusChange?.([]);
    setOpen(false);
  };

  const dateRangeFilter = (
    <ReportDateRangeFilter
      preset={preset}
      dateFrom={dateFrom}
      dateTo={dateTo}
      onPresetChange={setPreset}
      onDateFromChange={onDateFromChange}
      onDateToChange={onDateToChange}
    />
  );

  if (!showStatusFilter) {
    return dateRangeFilter;
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      {dateRangeFilter}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "h-7 px-2.5 text-sm border rounded-lg inline-flex items-center gap-1.5 transition-colors font-medium",
              activeCount > 0
                ? "border-brand-400 bg-brand-50 text-brand-700"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground bg-white",
              className,
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filter
            {activeCount > 0 && (
              <span className="w-4 h-4 text-xs bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">
                {activeCount}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align={align} className="w-56 p-0" sideOffset={4}>
          <div className="px-3 py-2.5 border-b border-border">
            <p className="text-xs font-semibold text-foreground">Filter by Status</p>
          </div>
          <div className="px-3 py-2.5 space-y-1.5">
            {statusOptions!.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2.5 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded accent-brand-600 cursor-pointer"
                  checked={draftStatus.includes(option.value)}
                  onChange={() =>
                    setDraftStatus((prev) =>
                      prev.includes(option.value)
                        ? prev.filter((s) => s !== option.value)
                        : [...prev, option.value],
                    )
                  }
                />
                <span className="text-xs text-foreground group-hover:text-brand-700 transition-colors">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
          <div className="px-3 py-2 flex items-center justify-between border-t border-border">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="h-7 px-3 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700 transition-colors"
            >
              Apply
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
