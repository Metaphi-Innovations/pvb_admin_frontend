"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableFoot,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import { AccountsTableListing } from "@/components/accounts/AccountsTableListing";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
} from "@/components/accounts/ReportFilters";
import {
  AccountsColumnFilterProvider,
  SortTh,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import {
  resolveDateRangePreset,
  type DateRangePresetId,
} from "@/lib/accounts/report-date-presets";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "../pl/pl-hooks";
import {
  buildBalanceSheetStatement,
  filterBalanceSheetStatement,
  flattenBalanceSheetForExport,
  type BalanceSheetLineItem,
  type BalanceSheetStatement,
} from "./balance-sheet-data";
import { exportBalanceSheetToExcel, exportBalanceSheetToPdf } from "./balance-sheet-export";

const PLACEHOLDER_DATE = "2025-04-01";

function formatBsAmount(amount: number): string {
  return formatMoney(amount);
}

function BalanceSheetRow({ line }: { line: BalanceSheetLineItem }) {
  if (line.kind === "section") {
    return (
      <AccountsTableRow className="bg-muted/20">
        <AccountsTableCell colSpan={2} className="text-xs font-bold text-navy-700 py-2">
          {line.particular}
        </AccountsTableCell>
      </AccountsTableRow>
    );
  }

  if (line.kind === "total") {
    return (
      <AccountsTableRow className="bg-muted/30 border-t border-border">
        <AccountsTableCell className="font-bold text-foreground text-xs">
          {line.particular}
        </AccountsTableCell>
        <AccountsTableCell align="right" money className={cn("font-bold", MONEY_AMOUNT_CLASS)}>
          {line.amount != null ? formatBsAmount(line.amount) : "—"}
        </AccountsTableCell>
      </AccountsTableRow>
    );
  }

  return (
    <AccountsTableRow>
      <AccountsTableCell className="text-xs text-foreground pl-4">
        {line.particular}
      </AccountsTableCell>
      <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
        {line.amount != null ? formatBsAmount(line.amount) : "—"}
      </AccountsTableCell>
    </AccountsTableRow>
  );
}

function BalanceSheetBody({
  mounted,
  statement,
  hasFilters,
  resetFilters,
  exportMeta,
  exporting,
  setExporting,
  filterBar,
}: {
  mounted: boolean;
  statement: BalanceSheetStatement;
  hasFilters: boolean;
  resetFilters: () => void;
  exportMeta: Parameters<typeof exportBalanceSheetToExcel>[1];
  exporting: boolean;
  setExporting: (v: boolean) => void;
  filterBar: React.ReactNode;
}) {
  const columnFilteredLines = useAccountsFilteredRows(statement.lines);

  const exportStatement = useMemo(
    (): BalanceSheetStatement => ({
      ...statement,
      lines: columnFilteredLines,
    }),
    [statement, columnFilteredLines],
  );

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const rows = flattenBalanceSheetForExport(exportStatement);
      await exportBalanceSheetToExcel(rows, exportMeta, exportStatement);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    const rows = flattenBalanceSheetForExport(exportStatement);
    exportBalanceSheetToPdf(rows, exportMeta, exportStatement);
  };

  const showTable = mounted && statement.hasData;

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Balance Sheet")}
      title="Balance Sheet"
      description="Asset and liability statement for the selected period."
      hideDescription
      layout="split"
      className="h-full min-h-0"
      actions={
        <AccountsExportMenu
          onExcel={handleExportExcel}
          onPdf={handleExportPdf}
          disabled={exporting || !mounted || columnFilteredLines.length === 0}
        />
      }
      filters={filterBar}
    >
      <AccountsTableListing>
        {!mounted ? (
          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
            Loading Balance Sheet…
          </div>
        ) : !showTable ? (
          <div className="accounts-table-empty py-4 text-center">
            No Balance Sheet entries match the current search.
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="block mx-auto mt-1 text-brand-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : statement.lines.length > 0 && columnFilteredLines.length === 0 ? (
          <div className="accounts-table-empty py-4 text-center text-sm text-muted-foreground">
            No records match the column filters.
          </div>
        ) : (
          <AccountsTable minWidth={520}>
            <AccountsTableHead>
              <AccountsTableHeadRow>
                <SortTh label="Particular" colKey="particular" />
                <SortTh label="Amount" colKey="amount" filterType="amount" align="right" />
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {columnFilteredLines.map((line) => (
                <BalanceSheetRow key={line.id} line={line} />
              ))}
            </AccountsTableBody>
            <AccountsTableFoot>
              <AccountsTableRow className="border-t-2 border-border bg-muted/20">
                <AccountsTableCell className="font-bold text-xs text-foreground">
                  Total Assets
                </AccountsTableCell>
                <AccountsTableCell
                  align="right"
                  money
                  className={cn("font-bold", MONEY_AMOUNT_CLASS)}
                >
                  {formatBsAmount(statement.totalAssets)}
                </AccountsTableCell>
              </AccountsTableRow>
              <AccountsTableRow className="bg-muted/20">
                <AccountsTableCell className="font-bold text-xs text-foreground">
                  Total Liabilities
                </AccountsTableCell>
                <AccountsTableCell
                  align="right"
                  money
                  className={cn("font-bold", MONEY_AMOUNT_CLASS)}
                >
                  {formatBsAmount(statement.totalLiabilities)}
                </AccountsTableCell>
              </AccountsTableRow>
              <AccountsTableRow className="bg-muted/30">
                <AccountsTableCell className="font-bold text-xs text-foreground">
                  Difference
                </AccountsTableCell>
                <AccountsTableCell
                  align="right"
                  money
                  className={cn(
                    "font-bold",
                    MONEY_AMOUNT_CLASS,
                    statement.difference !== 0 && "text-red-700",
                  )}
                >
                  {formatBsAmount(Math.abs(statement.difference))}
                </AccountsTableCell>
              </AccountsTableRow>
              <AccountsTableRow className="border-t border-border">
                <AccountsTableCell colSpan={2} className="py-2.5">
                  <p
                    className={cn(
                      "text-xs font-bold text-center",
                      statement.isBalanced ? "text-emerald-700" : "text-red-700",
                    )}
                  >
                    {statement.isBalanced
                      ? "Balance Sheet is balanced"
                      : "Balance Sheet is not balanced"}
                  </p>
                </AccountsTableCell>
              </AccountsTableRow>
            </AccountsTableFoot>
          </AccountsTable>
        )}
      </AccountsTableListing>
    </AccountsPageShell>
  );
}

export default function BalanceSheetPageClient() {
  const mounted = useClientMounted();

  const [preset, setPreset] = useState<DateRangePresetId>("this_month");
  const [dateFrom, setDateFrom] = useState(PLACEHOLDER_DATE);
  const [dateTo, setDateTo] = useState(PLACEHOLDER_DATE);
  const [datesReady, setDatesReady] = useState(false);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    const { from, to } = resolveDateRangePreset("this_month");
    setDateFrom(from);
    setDateTo(to);
    setDatesReady(true);
  }, []);

  const handlePresetChange = useCallback((value: DateRangePresetId) => {
    setPreset(value);
    if (value !== "custom") {
      const { from, to } = resolveDateRangePreset(value);
      setDateFrom(from);
      setDateTo(to);
    }
  }, []);

  const sourceStatement = useMemo(() => {
    if (!mounted) {
      return {
        lines: [],
        totalLiabilities: 0,
        totalAssets: 0,
        difference: 0,
        isBalanced: true,
        hasData: false,
      };
    }
    return buildBalanceSheetStatement();
  }, [mounted, dateFrom, dateTo]);

  const statement = useMemo(
    () => filterBalanceSheetStatement(sourceStatement, { search: debouncedSearch }),
    [sourceStatement, debouncedSearch],
  );

  const getCellValue = useCallback(
    (row: BalanceSheetLineItem, key: string) => (row as unknown as Record<string, unknown>)[key],
    [],
  );

  const columnConfig = useMemo(
    () => ({
      particular: { type: "text" as const },
      amount: { type: "amount" as const },
    }),
    [],
  );

  const hasFilters =
    Boolean(search.trim()) ||
    (datesReady && preset !== "this_month");

  const resetFilters = useCallback(() => {
    setSearch("");
    setPreset("this_month");
    const { from, to } = resolveDateRangePreset("this_month");
    setDateFrom(from);
    setDateTo(to);
  }, []);

  const exportMeta = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYear: "",
    }),
    [dateFrom, dateTo],
  );

  const filterBar = (
    <ReportFilterRow className="items-end gap-2">
      <ReportDateRangeFilter
        preset={preset}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onPresetChange={handlePresetChange}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />
      <div className="space-y-0.5 min-w-[180px] flex-1">
        <Label className={filterLabelClass}>Search Particular</Label>
        <div className="relative">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name…"
            className={cn(filterControlClass, "pr-7")}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      {hasFilters && (
        <Button variant="outline" size="sm" className="h-8 text-sm px-2" onClick={resetFilters}>
          Reset
        </Button>
      )}
    </ReportFilterRow>
  );

  return (
    <AccountsColumnFilterProvider
      rows={statement.lines}
      getCellValue={getCellValue}
      columnConfig={columnConfig}
      defaultSortKey="particular"
      defaultSortDir="asc"
    >
      <BalanceSheetBody
        mounted={mounted}
        statement={statement}
        hasFilters={hasFilters}
        resetFilters={resetFilters}
        exportMeta={exportMeta}
        exporting={exporting}
        setExporting={setExporting}
        filterBar={filterBar}
      />
    </AccountsColumnFilterProvider>
  );
}
