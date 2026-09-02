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
import { demoFinancialYearStart, demoFinancialYearEnd } from "@/lib/accounts/demo-date-utils";
import { AccountsDateInput } from "@/components/accounts/AccountsDateInput";
import {
  ACCOUNTS_FILTER_CONTROL_CLASS,
  ACCOUNTS_FILTER_LABEL_CLASS,
} from "@/components/accounts/ReportFilters";

export function useInvoiceListingDateRange(initialPreset: DateRangePresetId = "this_year") {
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
  React.useEffect(() => {
    if (preset === "custom") return;
    const { from, to } = resolveDateRangePreset(preset);
    if (dateFrom !== from || dateTo !== to) {
      onPresetChange("custom");
    }
  }, [dateFrom, dateTo, preset, onPresetChange]);

  const handlePresetChange = (value: DateRangePresetId) => {
    onPresetChange(value);
    if (value !== "custom") {
      const { from, to } = resolveDateRangePreset(value);
      onDateFromChange(from);
      onDateToChange(to);
      return;
    }
    const fyStart = demoFinancialYearStart();
    const fyEnd = demoFinancialYearEnd();
    if (!dateFrom || !dateTo || dateFrom < fyStart || dateTo > fyEnd) {
      const { from, to } = resolveDateRangePreset("this_year");
      onDateFromChange(from);
      onDateToChange(to);
    }
  };

  const min = demoFinancialYearStart();
  const max = demoFinancialYearEnd();

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
              min={min}
              max={dateTo || max}
              onChange={(val) => {
                let clamped = val;
                if (min && clamped && clamped < min) clamped = min;
                if (max && clamped && clamped > max) clamped = max;
                onDateFromChange(clamped);
              }}
              size="default"
              aria-label="From date"
              className="mt-0 w-[120px]"
            />
          </div>
          <div className="space-y-1 min-w-[120px]">
            <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>To Date</Label>
            <AccountsDateInput
              value={dateTo}
              min={dateFrom || min}
              max={max}
              onChange={(val) => {
                let clamped = val;
                if (min && clamped && clamped < min) clamped = min;
                if (max && clamped && clamped > max) clamped = max;
                onDateToChange(clamped);
              }}
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
