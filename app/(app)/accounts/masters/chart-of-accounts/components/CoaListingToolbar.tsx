"use client";

import React from "react";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import {
  DATE_RANGE_PRESET_OPTIONS,
  resolveDateRangePreset,
  type DateRangePresetId,
} from "@/lib/accounts/report-date-presets";
import { cn } from "@/lib/utils";

interface CoaListingToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  preset: DateRangePresetId;
  dateFrom: string;
  dateTo: string;
  onPresetChange: (preset: DateRangePresetId) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onExcel?: () => void;
  onPdf?: () => void;
  exportDisabled?: boolean;
  canCreate?: boolean;
  onNewLedger?: () => void;
}

export function CoaListingToolbar({
  search,
  onSearchChange,
  preset,
  dateFrom,
  dateTo,
  onPresetChange,
  onDateFromChange,
  onDateToChange,
  onExcel,
  onPdf,
  exportDisabled,
  canCreate,
  onNewLedger,
}: CoaListingToolbarProps) {
  const handlePresetChange = (value: DateRangePresetId) => {
    onPresetChange(value);
    if (value !== "custom") {
      const { from, to } = resolveDateRangePreset(value);
      onDateFromChange(from);
      onDateToChange(to);
    }
  };

  return (
    <div className="flex-shrink-0 flex items-center gap-3 px-3 py-2 border-b border-border/60 bg-white">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="relative w-full min-w-[240px] max-w-md flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search accounts…"
            className="h-8 w-full pl-9 pr-3 text-xs rounded-lg border-border bg-white"
          />
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap mb-0">
            Date Range
          </Label>
          <Select value={preset} onValueChange={(v) => handlePresetChange(v as DateRangePresetId)}>
            <SelectTrigger className="h-8 w-[148px] text-xs rounded-lg border-border bg-white">
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
          {preset === "custom" && (
            <>
              <Input
                type="date"
                className="h-8 w-[132px] text-xs rounded-lg border-border bg-white"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
                aria-label="From date"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                className="h-8 w-[132px] text-xs rounded-lg border-border bg-white"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
                aria-label="To date"
              />
            </>
          )}
        </div>
      </div>

      <div className={cn("flex items-center gap-2 flex-shrink-0 ml-auto pl-2")}>
        {canCreate && onNewLedger && (
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={onNewLedger}
          >
            <Plus className="w-3.5 h-3.5" />
            New Ledger
          </Button>
        )}
        <AccountsExportMenu onExcel={onExcel} onPdf={onPdf} disabled={exportDisabled} />
      </div>
    </div>
  );
}
