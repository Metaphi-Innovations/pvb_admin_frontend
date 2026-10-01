"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
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
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ReportBranchMultiFilter,
  ReportDateRangeFilter,
  ReportFilterRow,
  ReportFilterSummary,
  ReportFinancialYearFilter,
  ReportMoreFilters,
  ReportProductMultiFilter,
  ReportSearchFilter,
  ReportTdsSectionMultiFilter,
  ReportVoucherTypeMultiFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import {
  AccountsClearAllColumnFiltersButton,
  AccountsColumnFilterProvider,
  SortTh,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import {
  buildBranchFilterSummary,
  buildEntityFilterSummary,
  countActiveMoreFilters,
  formatMultiSelectLabel,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";
import { resolveDateRangePreset } from "@/lib/accounts/report-date-presets";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "../pl/pl-hooks";
import {
  buildTdsSummaryReport,
  computeTdsSummaryTotals,
  getDefaultTdsFinancialYearId,
  getTdsBranchOptions,
  getTdsMonthOptions,
  getTdsPartyOptions,
  TDS_DEDUCTEE_TYPE_OPTIONS,
  TDS_SECTION_OPTIONS,
  TDS_VOUCHER_TYPE_OPTIONS,
  type TdsSummaryTxnRow,
} from "./tds-summary-data";
import { exportTdsSummaryToExcel, exportTdsSummaryToPdf } from "./tds-summary-export";

function TdsTxnRow({ row }: { row: TdsSummaryTxnRow }) {
  return (
    <AccountsTableRow className="hover:bg-muted/20">
      <AccountsTableCell className="text-xs whitespace-nowrap tabular-nums">
        {row.month}
      </AccountsTableCell>
      <AccountsTableCell className="text-xs font-semibold max-w-[180px] truncate" title={row.partyName}>
        <Link
          href={row.partyLedgerHref}
          className="text-brand-700 hover:underline"
        >
          {row.partyName}
        </Link>
      </AccountsTableCell>
      <AccountsTableCell mono className="text-xs uppercase whitespace-nowrap">
        {row.pan}
      </AccountsTableCell>
      <AccountsTableCell className="text-xs whitespace-nowrap tabular-nums">
        {row.invoiceDateDisplay}
      </AccountsTableCell>
      <AccountsTableCell mono className="text-xs whitespace-nowrap">
        <Link
          href={row.invoiceHref}
          className="font-semibold text-brand-700 hover:underline"
        >
          {row.invoiceNo}
        </Link>
      </AccountsTableCell>
      <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
        {formatMoney(row.amount)}
      </AccountsTableCell>
      <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
        {formatMoney(row.tdsAmount)}
      </AccountsTableCell>
      <AccountsTableCell align="right" className="text-xs whitespace-nowrap tabular-nums">
        {row.tdsRate}
      </AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap">
        <span className="font-mono text-xs font-semibold text-brand-700">{row.tdsSection}</span>
      </AccountsTableCell>
    </AccountsTableRow>
  );
}

function TdsSummaryBody({
  mounted,
  toolbarRows,
  hasFilters,
  resetFilters,
  exportMeta,
  exporting,
  setExporting,
  filterBar,
}: {
  mounted: boolean;
  toolbarRows: TdsSummaryTxnRow[];
  hasFilters: boolean;
  resetFilters: () => void;
  exportMeta: Parameters<typeof exportTdsSummaryToExcel>[1];
  exporting: boolean;
  setExporting: (v: boolean) => void;
  filterBar: (end?: ReactNode) => ReactNode;
}) {
  const visible = useAccountsFilteredRows(toolbarRows);
  const totals = useMemo(() => computeTdsSummaryTotals(visible), [visible]);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await exportTdsSummaryToExcel(visible, exportMeta, totals);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    exportTdsSummaryToPdf(visible, exportMeta, totals);
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "TDS Summary")}
      title="TDS Summary"
      description="Transaction-wise TDS deductions for the selected period."
      hideDescription
      layout="split"
      className="h-full min-h-0"
      filters={filterBar(
        <>
          <AccountsClearAllColumnFiltersButton />
          <AccountsExportMenu
            onExcel={handleExportExcel}
            onPdf={handleExportPdf}
            disabled={exporting || visible.length === 0}
          />
        </>,
      )}
    >
      <AccountsTableListing>
        {!mounted ? (
          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
            Loading TDS Summary…
          </div>
        ) : toolbarRows.length === 0 ? (
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
        ) : visible.length === 0 ? (
          <div className="accounts-table-empty py-4 text-center text-sm text-muted-foreground">
            No records match the column filters.
          </div>
        ) : (
          <AccountsTableScroll>
            <AccountsTable minWidth={1120}>
              <AccountsTableHead>
                <AccountsTableHeadRow>
                  <SortTh label="Month" colKey="monthKey" />
                  <SortTh label="Party Name" colKey="partyName" />
                  <SortTh label="PAN" colKey="pan" />
                  <SortTh label="Invoice Date" colKey="invoiceDate" filterType="date" />
                  <SortTh label="Invoice No." colKey="invoiceNo" />
                  <SortTh label="Amount" colKey="amount" filterType="amount" align="right" />
                  <SortTh label="TDS Amount" colKey="tdsAmount" filterType="amount" align="right" />
                  <SortTh label="TDS Rate" colKey="tdsRateValue" filterType="amount" align="right" />
                  <SortTh label="TDS Section" colKey="tdsSection" />
                </AccountsTableHeadRow>
              </AccountsTableHead>
              <AccountsTableBody>
                {visible.map((row) => (
                  <TdsTxnRow key={row.id} row={row} />
                ))}
              </AccountsTableBody>
              <AccountsTableFoot>
                <AccountsTableRow className="bg-muted/30 border-t-2 border-border">
                  <AccountsTableCell colSpan={5} className="font-bold text-xs text-foreground">
                    Totals ({totals.count} {totals.count === 1 ? "entry" : "entries"})
                  </AccountsTableCell>
                  <AccountsTableCell
                    align="right"
                    money
                    className={cn("font-bold", MONEY_AMOUNT_CLASS)}
                  >
                    {formatMoney(totals.totalAmount)}
                  </AccountsTableCell>
                  <AccountsTableCell
                    align="right"
                    money
                    className={cn("font-bold", MONEY_AMOUNT_CLASS)}
                  >
                    {formatMoney(totals.totalTds)}
                  </AccountsTableCell>
                  <AccountsTableCell />
                  <AccountsTableCell />
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

  const [fyId, setFyId] = useState("all");
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } =
    useReportDateRange("this_year");
  const [month, setMonth] = useState("all");
  const [partyIds, setPartyIds] = useState<string[]>([]);
  const [tdsSections, setTdsSections] = useState<string[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [voucherTypes, setVoucherTypes] = useState<string[]>([]);
  const [deducteeTypes, setDeducteeTypes] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    if (!mounted) return;
    setFyId(getDefaultTdsFinancialYearId());
  }, [mounted]);

  useEffect(() => {
    const fromUrl = searchParams.get("section");
    if (fromUrl) setTdsSections([fromUrl.toUpperCase()]);
  }, [searchParams]);

  const allSourceRows = useMemo(
    () => (mounted ? buildTdsSummaryReport({
      financialYearId: "all",
      dateFrom: "",
      dateTo: "",
      month: "all",
      tdsSection: [],
      partyIds: [],
      search: "",
      branch: [],
      voucherType: [],
      deducteeType: [],
    }).rows : []),
    [mounted],
  );

  const partyOptions = useMemo(() => getTdsPartyOptions(allSourceRows), [allSourceRows]);
  const branchOptions = useMemo(() => getTdsBranchOptions(allSourceRows), [allSourceRows]);
  const tdsSectionOptions = useMemo(
    () => TDS_SECTION_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
    [],
  );
  const voucherTypeOptions = useMemo(
    () => TDS_VOUCHER_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    [],
  );
  const deducteeOptions = useMemo(
    () => TDS_DEDUCTEE_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    [],
  );

  const report = useMemo(
    () =>
      buildTdsSummaryReport({
        financialYearId: fyId,
        dateFrom,
        dateTo,
        month,
        tdsSection: tdsSections,
        partyIds,
        search: debouncedSearch,
        branch: branches,
        voucherType: voucherTypes,
        deducteeType: deducteeTypes,
      }),
    [
      fyId,
      dateFrom,
      dateTo,
      month,
      tdsSections,
      partyIds,
      debouncedSearch,
      branches,
      voucherTypes,
      deducteeTypes,
    ],
  );

  const monthOptions = useMemo(() => {
    const forMonths = buildTdsSummaryReport({
      financialYearId: fyId,
      dateFrom,
      dateTo,
      month: "all",
      tdsSection: [],
      partyIds: [],
      search: "",
      branch: [],
      voucherType: [],
      deducteeType: [],
    }).rows;
    return getTdsMonthOptions(forMonths.length > 0 ? forMonths : allSourceRows);
  }, [fyId, dateFrom, dateTo, allSourceRows]);

  const getCellValue = useCallback((row: TdsSummaryTxnRow, key: string) => {
    if (key === "monthKey") return row.monthKey;
    if (key === "invoiceDate") return row.invoiceDate;
    if (key === "tdsRateValue") return row.tdsRateValue;
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const columnConfig = useMemo(
    () => ({
      monthKey: { type: "text" as const },
      partyName: { type: "text" as const },
      pan: { type: "text" as const },
      invoiceDate: { type: "date" as const },
      invoiceNo: { type: "text" as const },
      amount: { type: "amount" as const },
      tdsAmount: { type: "amount" as const },
      tdsRateValue: { type: "amount" as const },
      tdsSection: { type: "text" as const },
    }),
    [],
  );

  const moreFiltersActiveCount =
    countActiveMoreFilters({
      branch: branches,
      voucherType: voucherTypes,
    }) + (deducteeTypes.length > 0 ? 1 : 0);

  const hasFilters =
    Boolean(search.trim()) ||
    month !== "all" ||
    partyIds.length > 0 ||
    tdsSections.length > 0 ||
    branches.length > 0 ||
    voucherTypes.length > 0 ||
    deducteeTypes.length > 0 ||
    fyId !== getDefaultTdsFinancialYearId();

  const resetFilters = useCallback(() => {
    setSearch("");
    setMonth("all");
    setPartyIds([]);
    setTdsSections([]);
    setBranches([]);
    setVoucherTypes([]);
    setDeducteeTypes([]);
    setFyId(getDefaultTdsFinancialYearId());
    setPreset("this_year");
    const { from, to } = resolveDateRangePreset("this_year");
    setDateFrom(from);
    setDateTo(to);
  }, [setPreset, setDateFrom, setDateTo]);

  const financialYearLabel = useMemo(() => {
    if (fyId === "all") return "All years";
    return loadFinancialYears().find((f) => String(f.id) === fyId)?.name ?? "—";
  }, [fyId]);

  const monthLabel =
    month === "all"
      ? "All Months"
      : monthOptions.find((o) => o.value === month)?.label ?? month;

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] =>
    [
      month !== "all"
        ? {
            id: "month",
            label: "Month",
            value: monthLabel,
            onRemove: () => setMonth("all"),
          }
        : null,
      buildEntityFilterSummary("party", "Parties", partyIds, partyOptions, () => setPartyIds([])),
      buildEntityFilterSummary(
        "tdsSection",
        "TDS Sections",
        tdsSections,
        tdsSectionOptions,
        () => setTdsSections([]),
      ),
      buildBranchFilterSummary(branches, () => setBranches([])),
      buildEntityFilterSummary(
        "voucherType",
        "Voucher Types",
        voucherTypes,
        voucherTypeOptions,
        () => setVoucherTypes([]),
      ),
      buildEntityFilterSummary(
        "deducteeType",
        "Deductee Types",
        deducteeTypes,
        deducteeOptions,
        () => setDeducteeTypes([]),
      ),
    ].filter((item): item is ReportFilterSummaryItem => item != null),
  [
    month,
    monthLabel,
    partyIds,
    partyOptions,
    tdsSections,
    tdsSectionOptions,
    branches,
    voucherTypes,
    voucherTypeOptions,
    deducteeTypes,
    deducteeOptions,
  ]);

  const exportMeta = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYear: financialYearLabel,
      month: monthLabel,
      tdsSection: formatMultiSelectLabel(
        tdsSections,
        tdsSectionOptions,
        "Section",
        "All Sections",
      ),
      party: formatMultiSelectLabel(partyIds, partyOptions, "Party", "All Parties"),
      search: debouncedSearch,
      branch: formatMultiSelectLabel(
        branches,
        branchOptions.map((b) => ({ value: b, label: b })),
        "Branch",
        "All",
      ),
      voucherType: formatMultiSelectLabel(
        voucherTypes,
        voucherTypeOptions,
        "Type",
        "All",
      ),
      deducteeType: formatMultiSelectLabel(
        deducteeTypes,
        deducteeOptions,
        "Type",
        "All",
      ),
    }),
    [
      dateFrom,
      dateTo,
      financialYearLabel,
      monthLabel,
      tdsSections,
      tdsSectionOptions,
      partyIds,
      partyOptions,
      debouncedSearch,
      branches,
      branchOptions,
      voucherTypes,
      voucherTypeOptions,
      deducteeTypes,
      deducteeOptions,
    ],
  );

  const filterBar = (end?: ReactNode) => (
    <>
      <ReportFilterRow className="items-end gap-2" end={end}>
        <ReportFinancialYearFilter value={fyId} onChange={setFyId} />
        <ReportDateRangeFilter
          preset={preset}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onPresetChange={setPreset}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
        />
        <div className="space-y-1 min-w-[120px]">
          <Label className={filterLabelClass}>Month</Label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className={cn(filterControlClass, "mt-0 w-[120px]")}>
              <SelectValue placeholder="All months" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All months
              </SelectItem>
              {monthOptions.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ReportTdsSectionMultiFilter values={tdsSections} onChange={setTdsSections} />
        <ReportProductMultiFilter
          values={partyIds}
          onChange={setPartyIds}
          products={partyOptions}
          label="Party"
        />
        <ReportSearchFilter
          value={search}
          onChange={setSearch}
          placeholder="Party, PAN, invoice no.…"
          className="min-w-[170px]"
        />
        <ReportMoreFilters activeCount={moreFiltersActiveCount}>
          <ReportBranchMultiFilter
            values={branches}
            onChange={setBranches}
            options={branchOptions}
          />
          <ReportVoucherTypeMultiFilter
            values={voucherTypes}
            onChange={setVoucherTypes}
            options={voucherTypeOptions}
          />
          <ReportProductMultiFilter
            values={deducteeTypes}
            onChange={setDeducteeTypes}
            products={deducteeOptions}
            label="TDS Deductee Type"
          />
        </ReportMoreFilters>
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
      <ReportFilterSummary items={filterSummaryItems} />
    </>
  );

  return (
    <AccountsColumnFilterProvider
      rows={report.rows}
      getCellValue={getCellValue}
      columnConfig={columnConfig}
      defaultSortKey="defaultSortKey"
      defaultSortDir="asc"
    >
      <TdsSummaryBody
        mounted={mounted}
        toolbarRows={report.rows}
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
