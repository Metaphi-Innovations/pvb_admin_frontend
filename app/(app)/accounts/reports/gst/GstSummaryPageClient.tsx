"use client";

import { useCallback, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import { AccountsTableListing } from "@/components/accounts/AccountsTableListing";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportSearchFilter,
  useReportDateRange,
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
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "../pl/pl-hooks";
import {
  buildGstSummaryStatement,
  flattenGstSummaryForExport,
  type GstRateFilter,
  type GstSummaryLine,
  type GstTypeFilter,
} from "./gst-summary-data";
import { exportGstSummaryToExcel, exportGstSummaryToPdf } from "./gst-summary-export";
import { resolveDateRangePreset } from "@/lib/accounts/report-date-presets";

const GST_TYPE_OPTIONS: { value: GstTypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "output", label: "Output GST" },
  { value: "input", label: "Input GST" },
  { value: "rcm", label: "RCM" },
];

const GST_RATE_OPTIONS: { value: GstRateFilter; label: string }[] = [
  { value: "all", label: "All rates" },
  { value: "5", label: "5%" },
  { value: "12", label: "12%" },
  { value: "18", label: "18%" },
  { value: "28", label: "28%" },
];

function formatGstAmount(amount: number | undefined, highlightNegative = false): string {
  if (amount == null) return "—";
  if (highlightNegative && amount < 0) {
    return `(${formatMoney(Math.abs(amount))})`;
  }
  return formatMoney(amount);
}

function filterGstDisplayLines(lines: GstSummaryLine[], visibleDataIds: Set<string>): GstSummaryLine[] {
  const visibleSectionIds = new Set<string>();
  let currentSectionId: string | null = null;
  for (const line of lines) {
    if (line.kind === "section") {
      currentSectionId = line.id;
      continue;
    }
    if (line.kind === "data" && visibleDataIds.has(line.id) && currentSectionId) {
      visibleSectionIds.add(currentSectionId);
    }
  }
  return lines.filter((line) => {
    if (line.kind === "section") return visibleSectionIds.has(line.id);
    if (line.kind === "data") return visibleDataIds.has(line.id);
    if (line.kind === "total" || line.kind === "net") return visibleDataIds.size > 0;
    return false;
  });
}

function GstSummaryTableRow({ line }: { line: GstSummaryLine }) {
  const a = line.amounts;

  if (line.kind === "section") {
    return (
      <AccountsTableRow className="bg-muted/20">
        <AccountsTableCell
          colSpan={7}
          className="text-xs font-bold text-navy-700 py-2 uppercase tracking-wide"
        >
          {line.label}
        </AccountsTableCell>
      </AccountsTableRow>
    );
  }

  const isHighlight = line.kind === "total" || line.kind === "net";
  const isNet = line.kind === "net";
  const showOnlyTotalGst = line.kind === "total" || line.kind === "net";

  return (
    <AccountsTableRow
      className={cn(
        isHighlight && "bg-muted/30 border-t border-border",
        isNet && "bg-brand-50/40",
      )}
    >
      <AccountsTableCell
        className={cn(
          "text-xs",
          isHighlight ? "font-bold text-foreground" : "text-foreground",
          isNet && line.amounts && line.amounts.totalGst < 0 && "text-emerald-700",
        )}
      >
        {line.label}
      </AccountsTableCell>
      <AccountsTableCell align="right" money className={cn(isHighlight && "font-bold", MONEY_AMOUNT_CLASS)}>
        {showOnlyTotalGst ? "—" : formatGstAmount(a?.taxableValue)}
      </AccountsTableCell>
      <AccountsTableCell align="right" money className={cn(isHighlight && "font-bold", MONEY_AMOUNT_CLASS)}>
        {showOnlyTotalGst ? "—" : formatGstAmount(a?.cgst)}
      </AccountsTableCell>
      <AccountsTableCell align="right" money className={cn(isHighlight && "font-bold", MONEY_AMOUNT_CLASS)}>
        {showOnlyTotalGst ? "—" : formatGstAmount(a?.sgst)}
      </AccountsTableCell>
      <AccountsTableCell align="right" money className={cn(isHighlight && "font-bold", MONEY_AMOUNT_CLASS)}>
        {showOnlyTotalGst ? "—" : formatGstAmount(a?.igst)}
      </AccountsTableCell>
      <AccountsTableCell
        align="right"
        money
        className={cn(
          isHighlight && "font-bold",
          MONEY_AMOUNT_CLASS,
          isNet && a && a.totalGst < 0 && "text-emerald-700",
        )}
      >
        {formatGstAmount(a?.totalGst, isNet)}
      </AccountsTableCell>
      <AccountsTableCell align="right" money className={cn(isHighlight && "font-bold", MONEY_AMOUNT_CLASS)}>
        {showOnlyTotalGst ? "—" : formatGstAmount(a?.totalInvoiceValue)}
      </AccountsTableCell>
    </AccountsTableRow>
  );
}

function GstSummaryBody({
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
  statement: ReturnType<typeof buildGstSummaryStatement>;
  hasFilters: boolean;
  resetFilters: () => void;
  exportMeta: Parameters<typeof exportGstSummaryToExcel>[1];
  exporting: boolean;
  setExporting: (v: boolean) => void;
  filterBar: React.ReactNode;
}) {
  const dataLines = useMemo(
    () => statement.lines.filter((l) => l.kind === "data"),
    [statement.lines],
  );
  const columnFilteredDataLines = useAccountsFilteredRows(dataLines);
  const visibleDataIds = useMemo(
    () => new Set(columnFilteredDataLines.map((l) => l.id)),
    [columnFilteredDataLines],
  );
  const displayLines = useMemo(
    () => filterGstDisplayLines(statement.lines, visibleDataIds),
    [statement.lines, visibleDataIds],
  );

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const rows = flattenGstSummaryForExport(displayLines);
      await exportGstSummaryToExcel(rows, exportMeta, statement.totals);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    const rows = flattenGstSummaryForExport(displayLines);
    exportGstSummaryToPdf(rows, exportMeta, statement.totals);
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "GST Summary")}
      title="GST Summary"
      description="Output GST, input GST and RCM summary for the selected period."
      hideDescription
      layout="split"
      className="h-full min-h-0"
      actions={
        <AccountsExportMenu
          onExcel={handleExportExcel}
          onPdf={handleExportPdf}
          disabled={exporting || columnFilteredDataLines.length === 0}
        />
      }
      filters={filterBar}
    >
      <AccountsTableListing>
        {!mounted ? (
          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
            Loading GST Summary…
          </div>
        ) : !statement.hasData ? (
          <div className="accounts-table-empty py-4 text-center">
            No GST entries match the current filters.
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
        ) : dataLines.length > 0 && columnFilteredDataLines.length === 0 ? (
          <div className="accounts-table-empty py-4 text-center text-sm text-muted-foreground">
            No records match the column filters.
          </div>
        ) : (
          <AccountsTableScroll>
            <AccountsTable minWidth={900}>
              <AccountsTableHead>
                <AccountsTableHeadRow>
                  <SortTh label="GST Type" colKey="label" />
                  <SortTh label="Taxable Value" colKey="taxableValue" filterType="amount" align="right" />
                  <SortTh label="CGST" colKey="cgst" filterType="amount" align="right" />
                  <SortTh label="SGST" colKey="sgst" filterType="amount" align="right" />
                  <SortTh label="IGST" colKey="igst" filterType="amount" align="right" />
                  <SortTh label="Total GST" colKey="totalGst" filterType="amount" align="right" />
                  <SortTh label="Total Invoice Value" colKey="totalInvoiceValue" filterType="amount" align="right" />
                </AccountsTableHeadRow>
              </AccountsTableHead>
              <AccountsTableBody>
                {displayLines.map((line) => (
                  <GstSummaryTableRow key={line.id} line={line} />
                ))}
              </AccountsTableBody>
            </AccountsTable>
          </AccountsTableScroll>
        )}
      </AccountsTableListing>
    </AccountsPageShell>
  );
}

export default function GstSummaryPageClient() {
  const mounted = useClientMounted();

  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_year");
  const [gstType, setGstType] = useState<GstTypeFilter>("all");
  const [gstRate, setGstRate] = useState<GstRateFilter>("all");
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 300);

  const gstTypeLabel = GST_TYPE_OPTIONS.find((o) => o.value === gstType)?.label ?? "All";
  const gstRateLabel = GST_RATE_OPTIONS.find((o) => o.value === gstRate)?.label ?? "All rates";

  const statement = useMemo(
    () =>
      buildGstSummaryStatement({
        gstType,
        gstRate,
        search: debouncedSearch,
      }),
    [gstType, gstRate, debouncedSearch],
  );

  const dataLines = useMemo(
    () => statement.lines.filter((l) => l.kind === "data"),
    [statement.lines],
  );

  const getCellValue = useCallback((row: GstSummaryLine, key: string) => {
    if (key === "label") return row.label;
    const a = row.amounts;
    if (!a) return null;
    return (a as unknown as Record<string, unknown>)[key];
  }, []);

  const columnConfig = useMemo(
    () => ({
      label: { type: "text" as const },
      taxableValue: { type: "amount" as const },
      cgst: { type: "amount" as const },
      sgst: { type: "amount" as const },
      igst: { type: "amount" as const },
      totalGst: { type: "amount" as const },
      totalInvoiceValue: { type: "amount" as const },
    }),
    [],
  );

  const hasFilters =
    Boolean(search.trim()) ||
    gstType !== "all" ||
    gstRate !== "all";

  const resetFilters = useCallback(() => {
    setSearch("");
    setGstType("all");
    setGstRate("all");
    setPreset("this_year");
    const { from, to } = resolveDateRangePreset("this_year");
    setDateFrom(from);
    setDateTo(to);
  }, [setPreset, setDateFrom, setDateTo]);

  const exportMeta = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYear: "",
      gstType: gstTypeLabel,
      gstRate: gstRateLabel,
      search: debouncedSearch,
    }),
    [dateFrom, dateTo, gstTypeLabel, gstRateLabel, debouncedSearch],
  );

  const filterBar = (
    <ReportFilterRow className="items-end gap-2">
      <ReportDateRangeFilter
        preset={preset}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onPresetChange={setPreset}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />
      <div className="space-y-1 min-w-[130px]">
        <Label className={filterLabelClass}>GST Type</Label>
        <Select value={gstType} onValueChange={(v) => setGstType(v as GstTypeFilter)}>
          <SelectTrigger className={cn(filterControlClass, "mt-0 w-[130px]")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GST_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1 min-w-[110px]">
        <Label className={filterLabelClass}>GST Rate</Label>
        <Select value={gstRate} onValueChange={(v) => setGstRate(v as GstRateFilter)}>
          <SelectTrigger className={cn(filterControlClass, "mt-0 w-[110px]")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GST_RATE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ReportSearchFilter
        value={search}
        onChange={setSearch}
        placeholder="GST type…"
        className="min-w-[160px]"
      />
      {hasFilters && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-sm px-2"
          onClick={resetFilters}
        >
          Reset
        </Button>
      )}
    </ReportFilterRow>
  );

  return (
    <AccountsColumnFilterProvider
      rows={dataLines}
      getCellValue={getCellValue}
      columnConfig={columnConfig}
      defaultSortKey="label"
      defaultSortDir="asc"
    >
      <GstSummaryBody
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
