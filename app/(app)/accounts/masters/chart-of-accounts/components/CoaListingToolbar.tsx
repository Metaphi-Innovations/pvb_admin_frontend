"use client";

import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { AccountsListingFilterCard } from "@/components/accounts/AccountsListingHeader";
import {
  ReportDateRangeFilter,
  ReportSearchFilter,
} from "@/components/accounts/ReportFilters";
import type { DateRangePresetId } from "@/lib/accounts/report-date-presets";
import { ACCOUNTS_ACTION_BUTTON_CLASS } from "@/lib/accounts/accounts-typography";
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
  searchPlaceholder?: string;
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
  searchPlaceholder = "Search accounts…",
}: CoaListingToolbarProps) {
  return (
    <AccountsListingFilterCard
      actions={
        <>
          {canCreate && onNewLedger && (
            <Button
              type="button"
              size="sm"
              className={cn(
                ACCOUNTS_ACTION_BUTTON_CLASS,
                "bg-[#FF7A00] hover:bg-brand-700 text-white border-0 px-2.5",
              )}
              onClick={onNewLedger}
            >
              <Plus className="w-4 h-4" />
              New Ledger
            </Button>
          )}
          <AccountsExportMenu onExcel={onExcel} onPdf={onPdf} disabled={exportDisabled} />
        </>
      }
    >
      <ReportDateRangeFilter
        preset={preset}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onPresetChange={onPresetChange}
        onDateFromChange={onDateFromChange}
        onDateToChange={onDateToChange}
      />
      <ReportSearchFilter
        value={search}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
        className="min-w-[180px] flex-1 max-w-sm"
      />
    </AccountsListingFilterCard>
  );
}
