"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
} from "@/components/accounts/ReportFilters";
import { useSearchParams } from "next/navigation";
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
  AccountsTableFoot,
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
} from "@/components/accounts/ReportFilters";
import {
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "../pl/pl-hooks";
import {
  buildTdsSummaryStatement,
  flattenTdsSummaryForExport,
  formatTdsRate,
  TDS_SECTION_OPTIONS,
  type TdsSummaryLine,
  type TdsSummaryRow,
} from "./tds-summary-data";
import { exportTdsSummaryToExcel, exportTdsSummaryToPdf } from "./tds-summary-export";
import { resolveDateRangePreset } from "@/lib/accounts/report-date-presets";

const PARTY_TYPE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "Supplier", label: "Supplier" },
  { value: "Contractor", label: "Contractor" },
  { value: "Professional", label: "Professional" },
  { value: "Employee", label: "Employee" },
  { value: "Other", label: "Other" },
] as const;

const PARTY_TYPE_COLUMN_OPTIONS = PARTY_TYPE_OPTIONS.filter((o) => o.value !== "all").map(
  (o) => o.value,
);

function filterTdsDisplayLines(lines: TdsSummaryLine[], visibleDataIds: Set<string>): TdsSummaryLine[] {
  const visibleSectionIds = new Set<string>();
  let currentSectionId: string | null = null;
  for (const line of lines) {
    if (line.kind === "section") {
      currentSectionId = line.id;
      continue;
    }
    if (line.kind === "data" && line.row && visibleDataIds.has(line.row.id) && currentSectionId) {
      visibleSectionIds.add(currentSectionId);
    }
  }
  return lines.filter((line) => {
    if (line.kind === "total") return false;
    if (line.kind === "section") return visibleSectionIds.has(line.id);
    if (line.kind === "data") return Boolean(line.row && visibleDataIds.has(line.row.id));
    return false;
  });
}

function TdsDataRow({ row }: { row: TdsSummaryRow }) {
  return (
    <AccountsTableRow>
      <AccountsTableCell className="text-xs font-semibold text-foreground max-w-[180px] truncate" title={row.partyName}>
        {row.partyName}
      </AccountsTableCell>
      <AccountsTableCell className="text-xs whitespace-nowrap">{row.partyType}</AccountsTableCell>
      <AccountsTableCell mono className="text-xs uppercase whitespace-nowrap">
        {row.pan}
      </AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap">
        <span className="font-mono text-xs font-semibold text-brand-700">{row.tdsSection}</span>
      </AccountsTableCell>
      <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
        {formatMoney(row.grossAmount)}
      </AccountsTableCell>
      <AccountsTableCell align="right" className="text-xs whitespace-nowrap">
        {formatTdsRate(row.tdsRate)}
      </AccountsTableCell>
      <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
        {formatMoney(row.tdsAmount)}
      </AccountsTableCell>
      <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
        {formatMoney(row.netPayable)}
      </AccountsTableCell>
    </AccountsTableRow>
  );
}

function TdsSummaryTableRow({ line }: { line: TdsSummaryLine }) {
  if (line.kind === "section") {
    return (
      <AccountsTableRow className="bg-muted/20">
        <AccountsTableCell
          colSpan={8}
          className="text-xs font-bold text-navy-700 py-2 uppercase tracking-wide"
        >
          {line.label}
        </AccountsTableCell>
      </AccountsTableRow>
    );
  }

  if (line.kind === "data" && line.row) {
    return <TdsDataRow row={line.row} />;
  }

  return null;
}

function TdsPartyWiseBody({
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
  statement: ReturnType<typeof buildTdsSummaryStatement>;
  hasFilters: boolean;
  resetFilters: () => void;
  exportMeta: Parameters<typeof exportTdsSummaryToExcel>[1];
  exporting: boolean;
  setExporting: (v: boolean) => void;
  filterBar: React.ReactNode;
}) {
  const dataRows = useMemo(
    () =>
      statement.lines
        .filter((l): l is TdsSummaryLine & { row: TdsSummaryRow } => l.kind === "data" && Boolean(l.row))
        .map((l) => l.row),
    [statement.lines],
  );
  const columnFilteredDataRows = useAccountsFilteredRows(dataRows);
  const visibleDataIds = useMemo(
    () => new Set(columnFilteredDataRows.map((r) => r.id)),
    [columnFilteredDataRows],
  );
  const displayLines = useMemo(
    () => filterTdsDisplayLines(statement.lines, visibleDataIds),
    [statement.lines, visibleDataIds],
  );
  const totals = useMemo(
    () => ({
      totalGross: columnFilteredDataRows.reduce((s, r) => s + r.grossAmount, 0),
      totalTds: columnFilteredDataRows.reduce((s, r) => s + r.tdsAmount, 0),
      totalNet: columnFilteredDataRows.reduce((s, r) => s + r.netPayable, 0),
    }),
    [columnFilteredDataRows],
  );

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const exportLines = [...displayLines, { id: "total-row", kind: "total" as const }];
      const rows = flattenTdsSummaryForExport(exportLines);
      await exportTdsSummaryToExcel(rows, exportMeta, totals);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    const exportLines = [...displayLines, { id: "total-row", kind: "total" as const }];
    const rows = flattenTdsSummaryForExport(exportLines);
    exportTdsSummaryToPdf(rows, exportMeta, totals);
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "TDS Summary")}
      title="TDS Summary"
      description="Party-wise and section-wise TDS deductions for the selected period."
      hideDescription
      layout="split"
      className="h-full min-h-0"
      actions={
        <AccountsExportMenu
          onExcel={handleExportExcel}
          onPdf={handleExportPdf}
          disabled={exporting || columnFilteredDataRows.length === 0}
        />
      }
      filters={filterBar}
    >
      <AccountsTableListing>
        {!mounted ? (
          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
            Loading TDS Summary…
          </div>
        ) : !statement.hasData ? (
          <div className="accounts-table-empty py-4 text-center">
            No TDS entries match the current filters.
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
        ) : dataRows.length > 0 && columnFilteredDataRows.length === 0 ? (
          <div className="accounts-table-empty py-4 text-center text-sm text-muted-foreground">
            No records match the column filters.
          </div>
        ) : (
          <AccountsTableScroll>
            <AccountsTable minWidth={1000}>
              <AccountsTableHead>
                <AccountsTableHeadRow>
                  <SortTh label="Party Name" colKey="partyName" />
                  <AccountsColumnHeader
                    label="Party Type"
                    colKey="partyType"
                    filterType="status"
                    sortable={false}
                    statusOptions={PARTY_TYPE_COLUMN_OPTIONS}
                  />
                  <SortTh label="PAN" colKey="pan" />
                  <SortTh label="TDS Section" colKey="tdsSection" />
                  <SortTh label="Gross Amount" colKey="grossAmount" filterType="amount" align="right" />
                  <SortTh label="TDS Rate" colKey="tdsRate" filterType="amount" align="right" />
                  <SortTh label="TDS Amount" colKey="tdsAmount" filterType="amount" align="right" />
                  <SortTh label="Net Payable" colKey="netPayable" filterType="amount" align="right" />
                </AccountsTableHeadRow>
              </AccountsTableHead>
              <AccountsTableBody>
                {displayLines.map((line) => (
                  <TdsSummaryTableRow key={line.id} line={line} />
                ))}
              </AccountsTableBody>
              <AccountsTableFoot>
                <AccountsTableRow className="bg-muted/30 border-t-2 border-border">
                  <AccountsTableCell colSpan={4} className="font-bold text-xs text-foreground">
                    Totals ({columnFilteredDataRows.length}{" "}
                    {columnFilteredDataRows.length === 1 ? "entry" : "entries"})
                  </AccountsTableCell>
                  <AccountsTableCell
                    align="right"
                    money
                    className={cn("font-bold", MONEY_AMOUNT_CLASS)}
                  >
                    {formatMoney(totals.totalGross)}
                  </AccountsTableCell>
                  <AccountsTableCell />
                  <AccountsTableCell
                    align="right"
                    money
                    className={cn("font-bold", MONEY_AMOUNT_CLASS)}
                  >
                    {formatMoney(totals.totalTds)}
                  </AccountsTableCell>
                  <AccountsTableCell
                    align="right"
                    money
                    className={cn("font-bold", MONEY_AMOUNT_CLASS)}
                  >
                    {formatMoney(totals.totalNet)}
                  </AccountsTableCell>
                </AccountsTableRow>
              </AccountsTableFoot>
            </AccountsTable>
          </AccountsTableScroll>
        )}
      </AccountsTableListing>
    </AccountsPageShell>
  );
}

export default function TdsPartyWiseReportClient() {
  const searchParams = useSearchParams();
  const mounted = useClientMounted();

  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_year");
  const [partyType, setPartyType] = useState("all");
  const [tdsSection, setTdsSection] = useState("all");
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    const fromUrl = searchParams.get("section");
    if (fromUrl) setTdsSection(fromUrl.toUpperCase());
  }, [searchParams]);

  const partyTypeLabel =
    PARTY_TYPE_OPTIONS.find((o) => o.value === partyType)?.label ?? "All";
  const tdsSectionLabel =
    tdsSection === "all"
      ? "All Sections"
      : (TDS_SECTION_OPTIONS.find((o) => o.value === tdsSection)?.label ?? tdsSection);

  const statement = useMemo(
    () =>
      buildTdsSummaryStatement({
        partyType,
        tdsSection,
        search: debouncedSearch,
      }),
    [partyType, tdsSection, debouncedSearch],
  );

  const dataRows = useMemo(
    () =>
      statement.lines
        .filter((l): l is TdsSummaryLine & { row: TdsSummaryRow } => l.kind === "data" && Boolean(l.row))
        .map((l) => l.row),
    [statement.lines],
  );

  const getCellValue = useCallback(
    (row: TdsSummaryRow, key: string) => {
      if (key === "tdsRate") return row.tdsRate;
      return (row as unknown as Record<string, unknown>)[key];
    },
    [],
  );

  const columnConfig = useMemo(
    () => ({
      partyName: { type: "text" as const },
      partyType: { type: "status" as const, options: PARTY_TYPE_COLUMN_OPTIONS },
      pan: { type: "text" as const },
      tdsSection: { type: "text" as const },
      grossAmount: { type: "amount" as const },
      tdsRate: { type: "amount" as const },
      tdsAmount: { type: "amount" as const },
      netPayable: { type: "amount" as const },
    }),
    [],
  );

  const hasFilters =
    Boolean(search.trim()) ||
    partyType !== "all" ||
    tdsSection !== "all";

  const resetFilters = useCallback(() => {
    setSearch("");
    setPartyType("all");
    setTdsSection("all");
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
      partyType: partyTypeLabel,
      tdsSection: tdsSectionLabel,
      search: debouncedSearch,
    }),
    [dateFrom, dateTo, partyTypeLabel, tdsSectionLabel, debouncedSearch],
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
        <Label className={filterLabelClass}>Party Type</Label>
        <Select value={partyType} onValueChange={setPartyType}>
          <SelectTrigger className={cn(filterControlClass, "mt-0 w-[130px]")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PARTY_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1 min-w-[170px]">
        <Label className={filterLabelClass}>TDS Section</Label>
        <Select value={tdsSection} onValueChange={setTdsSection}>
          <SelectTrigger className={cn(filterControlClass, "mt-0 w-[170px]")}>
            <SelectValue placeholder="All sections" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All Sections
            </SelectItem>
            {TDS_SECTION_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ReportSearchFilter
        value={search}
        onChange={setSearch}
        placeholder="Party, PAN, section…"
        className="min-w-[180px]"
      />
      {hasFilters && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-sm px-2"
          onClick={resetFilters}
        >
          <X className="w-3 h-3 mr-1" /> Reset
        </Button>
      )}
    </ReportFilterRow>
  );

  return (
    <AccountsColumnFilterProvider
      rows={dataRows}
      getCellValue={getCellValue}
      columnConfig={columnConfig}
      defaultSortKey="partyName"
      defaultSortDir="asc"
    >
      <TdsPartyWiseBody
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
