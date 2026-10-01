"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DATE_RANGE_PRESET_OPTIONS,
  resolveDateRangePreset,
  type DateRangePresetId,
} from "@/lib/accounts/report-date-presets";
import { AccountsDateInput } from "@/components/accounts/AccountsDateInput";
import {
  ACCOUNTS_FILTER_CONTROL_CLASS,
  ACCOUNTS_FILTER_LABEL_CLASS,
} from "@/components/accounts/ReportFilters";

export function useInvoiceListingDateRange(initialPreset: DateRangePresetId = "last_month") {
  const initial = React.useMemo(() => {
    const { from, to } = resolveDateRangePreset(initialPreset);
    return { preset: initialPreset, from, to };
  }, [initialPreset]);
  const [preset, setPreset] = React.useState<DateRangePresetId>(initial.preset);
  const [dateFrom, setDateFrom] = React.useState(initial.from);
  const [dateTo, setDateTo] = React.useState(initial.to);
  return { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo };
}

export function AccountsInvoiceDateRangeFilter({
  preset,
  dateFrom,
  dateTo,
  onPresetChange,
  onDateFromChange,
  onDateToChange,
}: {
  preset: DateRangePresetId;
  dateFrom: string;
  dateTo: string;
  onPresetChange: (preset: DateRangePresetId) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
}) {
  const handlePresetChange = (value: DateRangePresetId) => {
    onPresetChange(value);
    if (value !== "custom") {
      const { from, to } = resolveDateRangePreset(value);
      onDateFromChange(from);
      onDateToChange(to);
      return;
    }
    if (!dateFrom || !dateTo) {
      const { from, to } = resolveDateRangePreset("last_month");
      onDateFromChange(from);
      onDateToChange(to);
    }
  };

  return (
    <>
      <div className="space-y-1 min-w-[140px]">
        <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Date Range</Label>
        <Select value={preset} onValueChange={(v) => handlePresetChange(v as DateRangePresetId)}>
          <SelectTrigger className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-[140px]")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGE_PRESET_OPTIONS.map((o) => (
              <SelectItem key={o.id} value={o.id} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {preset === "custom" && (
        <>
          <div className="space-y-1 min-w-[120px]">
            <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>From Date</Label>
            <AccountsDateInput
              value={dateFrom}
              onChange={onDateFromChange}
              size="default"
              aria-label="From date"
              className="mt-0 w-[120px]"
            />
          </div>
          <div className="space-y-1 min-w-[120px]">
            <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>To Date</Label>
            <AccountsDateInput
              value={dateTo}
              onChange={onDateToChange}
              size="default"
              aria-label="To date"
              className="mt-0 w-[120px]"
            />
          </div>
        </>
      )}
    </>
  );
}
