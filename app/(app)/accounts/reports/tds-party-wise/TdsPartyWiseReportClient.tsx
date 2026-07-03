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
  AccountsTableHeadCell,
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
      partyType: partyTypeLabel,
      tdsSection: tdsSectionLabel,
      search: debouncedSearch,
    }),
    [dateFrom, dateTo, partyTypeLabel, tdsSectionLabel, debouncedSearch],
  );

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const rows = flattenTdsSummaryForExport(statement.lines);
      await exportTdsSummaryToExcel(rows, exportMeta, statement.totals);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    const rows = flattenTdsSummaryForExport(statement.lines);
    exportTdsSummaryToPdf(rows, exportMeta, statement.totals);
  };

  const dataLines = statement.lines.filter((l) => l.kind === "data");

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
          disabled={exporting || !statement.hasData}
        />
      }
      filters={
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
              className="h-8 text-[11px] px-2"
              onClick={resetFilters}
            >
              <X className="w-3 h-3 mr-1" /> Reset
            </Button>
          )}
        </ReportFilterRow>
      }
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
        ) : (
          <AccountsTableScroll>
            <AccountsTable minWidth={1000}>
              <AccountsTableHead>
                <AccountsTableHeadRow>
                  <AccountsTableHeadCell>Party Name</AccountsTableHeadCell>
                  <AccountsTableHeadCell>Party Type</AccountsTableHeadCell>
                  <AccountsTableHeadCell>PAN</AccountsTableHeadCell>
                  <AccountsTableHeadCell>TDS Section</AccountsTableHeadCell>
                  <AccountsTableHeadCell align="right">Gross Amount</AccountsTableHeadCell>
                  <AccountsTableHeadCell align="right">TDS Rate</AccountsTableHeadCell>
                  <AccountsTableHeadCell align="right">TDS Amount</AccountsTableHeadCell>
                  <AccountsTableHeadCell align="right">Net Payable</AccountsTableHeadCell>
                </AccountsTableHeadRow>
              </AccountsTableHead>
              <AccountsTableBody>
                {statement.lines
                  .filter((l) => l.kind !== "total")
                  .map((line) => (
                    <TdsSummaryTableRow key={line.id} line={line} />
                  ))}
              </AccountsTableBody>
              <AccountsTableFoot>
                <AccountsTableRow className="bg-muted/30 border-t-2 border-border">
                  <AccountsTableCell colSpan={4} className="font-bold text-xs text-foreground">
                    Totals ({dataLines.length} {dataLines.length === 1 ? "entry" : "entries"})
                  </AccountsTableCell>
                  <AccountsTableCell
                    align="right"
                    money
                    className={cn("font-bold", MONEY_AMOUNT_CLASS)}
                  >
                    {formatMoney(statement.totals.totalGross)}
                  </AccountsTableCell>
                  <AccountsTableCell />
                  <AccountsTableCell
                    align="right"
                    money
                    className={cn("font-bold", MONEY_AMOUNT_CLASS)}
                  >
                    {formatMoney(statement.totals.totalTds)}
                  </AccountsTableCell>
                  <AccountsTableCell
                    align="right"
                    money
                    className={cn("font-bold", MONEY_AMOUNT_CLASS)}
                  >
                    {formatMoney(statement.totals.totalNet)}
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
