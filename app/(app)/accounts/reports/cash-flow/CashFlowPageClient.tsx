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
import { MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import {
  resolveDateRangePreset,
  type DateRangePresetId,
} from "@/lib/accounts/report-date-presets";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "../pl/pl-hooks";
import {
  buildCashFlowStatement,
  filterCashFlowStatement,
  flattenCashFlowForExport,
  formatSignedCashFlowAmount,
  type CashFlowLineItem,
  type CashFlowStatement,
} from "./cash-flow-data";
import { exportCashFlowToExcel, exportCashFlowToPdf } from "./cash-flow-export";

const PLACEHOLDER_DATE = "2025-04-01";

function CashFlowRow({ line }: { line: CashFlowLineItem }) {
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
          {formatSignedCashFlowAmount(line.amount)}
        </AccountsTableCell>
      </AccountsTableRow>
    );
  }

  if (line.kind === "summary") {
    const isClosing = line.id === "closing-balance";
    return (
      <AccountsTableRow
        className={cn(
          "border-t border-border",
          isClosing ? "bg-brand-50 border-t-2 border-brand-300" : "bg-muted/20",
        )}
      >
        <AccountsTableCell
          className={cn(
            "font-bold text-xs",
            isClosing ? "text-brand-800 uppercase tracking-wide" : "text-foreground",
          )}
        >
          {line.particular}
        </AccountsTableCell>
        <AccountsTableCell
          align="right"
          money
          className={cn(
            "font-bold",
            MONEY_AMOUNT_CLASS,
            isClosing && "text-brand-800",
          )}
        >
          {formatSignedCashFlowAmount(line.amount)}
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
        {formatSignedCashFlowAmount(line.amount)}
      </AccountsTableCell>
    </AccountsTableRow>
  );
}

function CashFlowBody({
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
  statement: CashFlowStatement;
  hasFilters: boolean;
  resetFilters: () => void;
  exportMeta: Parameters<typeof exportCashFlowToExcel>[1];
  exporting: boolean;
  setExporting: (v: boolean) => void;
  filterBar: React.ReactNode;
}) {
  const columnFilteredLines = useAccountsFilteredRows(statement.lines);

  const exportStatement = useMemo(
    (): CashFlowStatement => ({
      ...statement,
      lines: columnFilteredLines,
    }),
    [statement, columnFilteredLines],
  );

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const rows = flattenCashFlowForExport(exportStatement);
      await exportCashFlowToExcel(rows, exportMeta, exportStatement);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    const rows = flattenCashFlowForExport(exportStatement);
    exportCashFlowToPdf(rows, exportMeta, exportStatement);
  };

  const showTable = mounted && statement.hasData;

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Cash Flow")}
      title="Cash Flow"
      description="Cash flow statement for the selected period."
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
            Loading Cash Flow…
          </div>
        ) : !showTable ? (
          <div className="accounts-table-empty py-4 text-center">
            No Cash Flow entries match the current search.
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
                <CashFlowRow key={line.id} line={line} />
              ))}
            </AccountsTableBody>
          </AccountsTable>
        )}
      </AccountsTableListing>
    </AccountsPageShell>
  );
}

export default function CashFlowPageClient() {
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
        netOperating: 0,
        netInvesting: 0,
        netFinancing: 0,
        netChange: 0,
        openingBalance: 0,
        closingBalance: 0,
        hasData: false,
      };
    }
    return buildCashFlowStatement();
  }, [mounted, dateFrom, dateTo]);

  const statement = useMemo(
    () => filterCashFlowStatement(sourceStatement, { search: debouncedSearch }),
    [sourceStatement, debouncedSearch],
  );

  const getCellValue = useCallback(
    (row: CashFlowLineItem, key: string) => (row as unknown as Record<string, unknown>)[key],
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
      <CashFlowBody
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
