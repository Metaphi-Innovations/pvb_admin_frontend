"use client";

/**
 * Accounts module filter UI (date range popover + calendar inputs).
 * Used only by `/accounts/*` routes and `components/accounts/*` consumers.
 * Do not wire into global `ModuleFiltersBar`, `FilterPopover`, or other modules.
 */

import React, { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountsDateInput } from "@/components/accounts/AccountsDateInput";

const sectionLabelClass =
  "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground";

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
  size = "compact",
}: {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  showLabel?: boolean;
  size?: "compact" | "default";
}) {
  return (
    <div className="space-y-1.5">
      {showLabel && <p className={sectionLabelClass}>Date Range</p>}
      <div className="grid grid-cols-2 gap-1.5">
        <AccountsDateInput
          value={dateFrom}
          onChange={onDateFromChange}
          aria-label="From date"
          size={size}
        />
        <AccountsDateInput
          value={dateTo}
          onChange={onDateToChange}
          aria-label="To date"
          size={size}
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
            "h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 transition-colors font-medium",
            activeCount > 0
              ? "border-brand-400 bg-brand-50 text-brand-700"
              : "border-border text-muted-foreground hover:bg-muted hover:text-foreground bg-white",
            className,
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filter
          {activeCount > 0 && (
            <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">
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
            className="h-7 px-3 text-xs bg-brand-600 text-white rounded-md hover:bg-brand-700 transition-colors"
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
  statusOptions?: AccountsFilterStatusOption[];
  status?: string[];
  onStatusChange?: (status: string[]) => void;
  align?: "start" | "end" | "center";
  className?: string;
}

/** Filter popover with draft → apply pattern for listing pages */
export function AccountsListingDateFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  statusOptions,
  status,
  onStatusChange,
  align = "end",
  className,
}: AccountsListingDateFilterProps) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(dateFrom);
  const [draftTo, setDraftTo] = useState(dateTo);
  const [draftStatus, setDraftStatus] = useState<string[]>(status ?? []);

  useEffect(() => {
    if (open) {
      setDraftFrom(dateFrom);
      setDraftTo(dateTo);
      setDraftStatus(status ?? []);
    }
  }, [open, dateFrom, dateTo, status]);

  const activeCount =
    (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (status?.length ?? 0);

  const handleApply = () => {
    onDateFromChange(draftFrom);
    onDateToChange(draftTo);
    onStatusChange?.(draftStatus);
    setOpen(false);
  };

  const handleReset = () => {
    setDraftFrom("");
    setDraftTo("");
    setDraftStatus([]);
    onDateFromChange("");
    onDateToChange("");
    onStatusChange?.([]);
    setOpen(false);
  };

  return (
    <AccountsListingFilterPopover
      open={open}
      onOpenChange={setOpen}
      activeCount={activeCount}
      statusOptions={statusOptions}
      status={draftStatus}
      onStatusChange={onStatusChange ? setDraftStatus : undefined}
      dateFrom={draftFrom}
      dateTo={draftTo}
      onDateFromChange={setDraftFrom}
      onDateToChange={setDraftTo}
      onApply={handleApply}
      onReset={handleReset}
      align={align}
      className={className}
    />
  );
}
