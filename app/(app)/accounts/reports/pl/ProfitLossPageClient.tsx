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
import {
  buildPandLStatement,
  filterPandLStatement,
  flattenPandLForExport,
  type PandLLineItem,
  type PandLStatement,
} from "./pl-data";
import { exportPandLToExcel, exportPandLToPdf } from "./pl-export";
import { useDebouncedValue } from "./pl-hooks";

const PLACEHOLDER_DATE = "2025-04-01";
const EMPTY_MESSAGE = "No Profit & Loss data available for the selected period.";

function formatPlAmount(amount: number): string {
  return formatMoney(amount);
}

function PandLRow({ line }: { line: PandLLineItem }) {
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
          {line.amount != null ? formatPlAmount(line.amount) : "—"}
        </AccountsTableCell>
      </AccountsTableRow>
    );
  }

  if (line.kind === "net") {
    const isProfit = line.particular === "Net Profit";
    return (
      <AccountsTableRow className="bg-brand-50 border-t-2 border-brand-300">
        <AccountsTableCell className="font-bold text-brand-800 text-xs uppercase tracking-wide">
          {line.particular}
        </AccountsTableCell>
        <AccountsTableCell
          align="right"
          money
          className={cn(
            "font-bold text-sm",
            isProfit ? "text-emerald-700" : "text-red-700",
            MONEY_AMOUNT_CLASS,
          )}
        >
          {line.amount != null ? formatPlAmount(line.amount) : "—"}
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
        {line.amount != null ? formatPlAmount(line.amount) : "—"}
      </AccountsTableCell>
    </AccountsTableRow>
  );
}

function ProfitLossBody({
  mounted,
  statement,
  bodyLines,
  hasFilters,
  resetFilters,
  exportMeta,
  exporting,
  setExporting,
  filterBar,
}: {
  mounted: boolean;
  statement: PandLStatement;
  bodyLines: PandLLineItem[];
  hasFilters: boolean;
  resetFilters: () => void;
  exportMeta: Parameters<typeof exportPandLToExcel>[1];
  exporting: boolean;
  setExporting: (v: boolean) => void;
  filterBar: React.ReactNode;
}) {
  const columnFilteredBodyLines = useAccountsFilteredRows(bodyLines);
  const netLine = statement.lines.find((l) => l.kind === "net");

  const exportStatement = useMemo(
    (): PandLStatement => ({
      ...statement,
      lines: netLine ? [...columnFilteredBodyLines, netLine] : columnFilteredBodyLines,
    }),
    [statement, columnFilteredBodyLines, netLine],
  );

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const rows = flattenPandLForExport(exportStatement);
      await exportPandLToExcel(rows, exportMeta, exportStatement);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    const rows = flattenPandLForExport(exportStatement);
    exportPandLToPdf(rows, exportMeta, exportStatement);
  };

  const showTable = mounted && statement.hasData;

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Profit & Loss")}
      title="Profit & Loss"
      description="Income and expense statement for the selected period."
      hideDescription
      layout="split"
      className="h-full min-h-0"
      actions={
        <AccountsExportMenu
          onExcel={handleExportExcel}
          onPdf={handleExportPdf}
          disabled={exporting || !mounted || columnFilteredBodyLines.length === 0}
        />
      }
      filters={filterBar}
    >
      <AccountsTableListing>
        {!mounted ? (
          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
            Loading Profit & Loss…
          </div>
        ) : !showTable ? (
          <div className="accounts-table-empty py-4 text-center">
            {EMPTY_MESSAGE}
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
        ) : bodyLines.length > 0 && columnFilteredBodyLines.length === 0 ? (
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
              {columnFilteredBodyLines.map((line) => (
                <PandLRow key={line.id} line={line} />
              ))}
            </AccountsTableBody>
            {netLine && (
              <AccountsTableFoot>
                <PandLRow line={netLine} />
              </AccountsTableFoot>
            )}
          </AccountsTable>
        )}
      </AccountsTableListing>
    </AccountsPageShell>
  );
}

export default function ProfitLossPageClient() {
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
        totalIncome: 0,
        totalExpenses: 0,
        netProfit: 0,
        hasData: false,
      };
    }
    return buildPandLStatement();
  }, [mounted, dateFrom, dateTo]);

  const statement = useMemo(
    () => filterPandLStatement(sourceStatement, { search: debouncedSearch }),
    [sourceStatement, debouncedSearch],
  );

  const bodyLines = useMemo(
    () => statement.lines.filter((l) => l.kind !== "net"),
    [statement.lines],
  );

  const getCellValue = useCallback(
    (row: PandLLineItem, key: string) => (row as unknown as Record<string, unknown>)[key],
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
      rows={bodyLines}
      getCellValue={getCellValue}
      columnConfig={columnConfig}
      defaultSortKey="particular"
      defaultSortDir="asc"
    >
      <ProfitLossBody
        mounted={mounted}
        statement={statement}
        bodyLines={bodyLines}
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
