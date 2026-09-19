"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableFoot,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import {
  AccountsTableListing,
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
import { AccountsColumnHeader } from "@/components/accounts/AccountsColumnHeader";
import {
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ReportBranchMultiFilter,
  ReportDateRangeFilter,
  ReportFilterRow,
  ReportFilterSummary,
  ReportFinancialYearFilter,
  ReportMoreFilters,
  ReportPartyMultiFilter,
  ReportSearchFilter,
  ReportTdsSectionMultiFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { buildGeneralLedgerHref } from "@/lib/accounts/general-ledger-href";
import {
  formatMoneyString,
  MONEY_AMOUNT_CLASS,
} from "@/lib/accounts/money-format";
import { formatDisplayDate } from "@/lib/accounts/date-display";
import {
  buildEntityFilterSummary,
  countActiveMoreFilters,
  type ReportFilterSummaryItem,
  type ReportMultiSelectOption,
} from "@/lib/accounts/report-multi-filter-utils";
import { useClientMounted } from "@/lib/use-client-mounted";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { CustomerListService } from "@/services/customer-list.service";
import { SupplierListService } from "@/services/supplier-list.service";
import {
  TdsSummaryApiError,
  TdsSummaryApiService,
} from "@/services/tds-summary.service";
import type {
  TdsSummaryApiRow,
  TdsSummaryApplicationModeFilter,
  TdsSummaryFiltersConfig,
  TdsSummaryNatureFilter,
  TdsSummaryQueryParams,
  TdsSummaryReportResult,
  TdsSummarySortBy,
  TdsSummarySortOrder,
} from "@/types/tds-summary.types";

const TITLE = "TDS Summary";
const DESCRIPTION =
  "Transaction-wise TDS deductions for the selected period.";

const SORT_FIELD_MAP: Record<string, TdsSummarySortBy> = {
  month_key: "voucher_date",
  party_name: "party_name",
  invoice_date: "invoice_date",
  invoice_number: "invoice_number",
  taxable_amount: "taxable_amount",
  tds_amount: "tds_amount",
  tds_rate: "tds_rate",
  tds_section: "tds_section",
};

function formatTdsRateDisplay(rate: string | null | undefined): string {
  if (!rate || !String(rate).trim()) return "—";
  const trimmed = String(rate).trim();
  if (/%$/i.test(trimmed) || /slab/i.test(trimmed)) return trimmed;
  return `${trimmed}%`;
}

function formatSectionDisplay(row: TdsSummaryApiRow): string {
  if (row.tds_section_code && row.tds_section_name) {
    return row.tds_section_code;
  }
  return row.tds_section_code ?? row.tds_section_name ?? "—";
}

function resolveInvoiceHref(row: TdsSummaryApiRow): string | null {
  if (!row.invoice_id) return null;
  if (row.invoice_type === "SalesInvoice") {
    return `/accounts/transactions/invoices/${row.invoice_id}`;
  }
  if (row.invoice_type === "PurchaseInvoice") {
    return `/accounts/purchase-invoices/${row.invoice_id}`;
  }
  return null;
}

function resolvePartyHref(row: TdsSummaryApiRow): string | null {
  if (row.party_ledger_id) {
    return buildGeneralLedgerHref({ ledgerId: row.party_ledger_id });
  }
  return null;
}

function TdsSummarySkeleton() {
  return (
    <div className="flex-1 p-4 space-y-2">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-8 bg-muted animate-pulse rounded-md" />
      ))}
    </div>
  );
}

function ServerSortTh({
  label,
  colKey,
  activeKey,
  sortDir,
  onSort,
  align = "left",
}: {
  label: string;
  colKey: string;
  activeKey: string;
  sortDir: TdsSummarySortOrder;
  onSort: (key: string) => void;
  align?: "left" | "right";
}) {
  return (
    <AccountsColumnHeader
      label={label}
      colKey={colKey}
      align={align}
      sortable
      filterable={false}
      sortKey={activeKey}
      sortDir={sortDir}
      onSort={onSort}
    />
  );
}

function TdsSummaryRowView({ row }: { row: TdsSummaryApiRow }) {
  const partyHref = resolvePartyHref(row);
  const invoiceHref = resolveInvoiceHref(row);
  const invoiceDate = row.invoice_date
    ? formatDisplayDate(row.invoice_date, row.invoice_date)
    : "—";
  const invoiceNo = row.invoice_number?.trim() || "—";
  const pan = row.pan?.trim() || "—";

  return (
    <AccountsTableRow className="hover:bg-muted/20">
      <AccountsTableCell className="text-xs whitespace-nowrap tabular-nums">
        {row.month_label}
      </AccountsTableCell>
      <AccountsTableCell
        className="text-xs font-semibold max-w-[180px] truncate"
        title={row.party_name}
      >
        {partyHref ? (
          <Link href={partyHref} className="text-brand-700 hover:underline">
            {row.party_name}
          </Link>
        ) : (
          row.party_name
        )}
      </AccountsTableCell>
      <AccountsTableCell mono className="text-xs uppercase whitespace-nowrap">
        {pan}
      </AccountsTableCell>
      <AccountsTableCell className="text-xs whitespace-nowrap tabular-nums">
        {invoiceDate}
      </AccountsTableCell>
      <AccountsTableCell mono className="text-xs whitespace-nowrap">
        {invoiceHref && invoiceNo !== "—" ? (
          <Link
            href={invoiceHref}
            className="font-semibold text-brand-700 hover:underline"
          >
            {invoiceNo}
          </Link>
        ) : (
          invoiceNo
        )}
      </AccountsTableCell>
      <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
        {formatMoneyString(row.taxable_amount)}
      </AccountsTableCell>
      <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
        {formatMoneyString(row.tds_amount)}
      </AccountsTableCell>
      <AccountsTableCell
        align="right"
        className="text-xs whitespace-nowrap tabular-nums"
      >
        {formatTdsRateDisplay(row.tds_rate)}
      </AccountsTableCell>
      <AccountsTableCell className="whitespace-nowrap">
        <span className="font-mono text-xs font-semibold text-brand-700">
          {formatSectionDisplay(row)}
        </span>
      </AccountsTableCell>
    </AccountsTableRow>
  );
}

export default function TdsSummaryApiPageClient() {
  const mounted = useClientMounted();
  const searchParams = useSearchParams();
  const refreshTick = useAccountsSectionRefresh("journal-vouchers", {
    apiListing: true,
  });
  const appliedDefaults = useRef(false);
  const appliedUrlSection = useRef(false);

  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } =
    useReportDateRange("this_year");

  const [filtersConfig, setFiltersConfig] =
    useState<TdsSummaryFiltersConfig | null>(null);
  const [filtersError, setFiltersError] = useState<string | null>(null);
  const [parties, setParties] = useState<
    Array<{ id: string; name: string; kind?: "customer" | "vendor" }>
  >([]);
  const [partiesError, setPartiesError] = useState<string | null>(null);

  const [financialYearId, setFinancialYearId] = useState("");
  const [month, setMonth] = useState("all");
  const [partyIds, setPartyIds] = useState<string[]>([]);
  const [tdsSectionIds, setTdsSectionIds] = useState<string[]>([]);
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [tdsNature, setTdsNature] = useState<TdsSummaryNatureFilter>("ALL");
  const [applicationMode, setApplicationMode] =
    useState<TdsSummaryApplicationModeFilter>("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState<TdsSummarySortBy>("voucher_date");
  const [sortOrder, setSortOrder] = useState<TdsSummarySortOrder>("desc");

  const [report, setReport] = useState<TdsSummaryReportResult | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<TdsSummaryApiError | null>(
    null,
  );
  const [exporting, setExporting] = useState(false);
  const [ready, setReady] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!mounted) return;
    setReady(true);
  }, [mounted]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!mounted) return;
    const controller = new AbortController();
    void TdsSummaryApiService.getFilters(controller.signal)
      .then((config) => {
        if (!controller.signal.aborted) {
          setFiltersConfig(config);
          setFiltersError(null);
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setFiltersConfig(null);
        setFiltersError(
          error instanceof Error
            ? error.message
            : "Failed to load TDS Summary filters.",
        );
      });
    return () => controller.abort();
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    void Promise.all([
      CustomerListService.dropdown(),
      SupplierListService.dropdown(),
    ])
      .then(([customers, suppliers]) => {
        if (cancelled) return;
        const mapped = [
          ...customers.map((c) => ({
            id: c.customer_id,
            name: c.customer_name,
            kind: "customer" as const,
          })),
          ...suppliers.map((s) => ({
            id: s.supplier_id,
            name: s.supplierName,
            kind: "vendor" as const,
          })),
        ];
        setParties(mapped);
        setPartiesError(null);
        const allowed = new Set(mapped.map((p) => p.id));
        setPartyIds((prev) => prev.filter((id) => allowed.has(id)));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setParties([]);
        setPartiesError(
          error instanceof Error ? error.message : "Failed to load parties.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [mounted]);

  useEffect(() => {
    if (!ready || !filtersConfig || appliedDefaults.current) return;
    if (filtersConfig.defaults.financial_year_id) {
      setFinancialYearId(filtersConfig.defaults.financial_year_id);
    }
    if (filtersConfig.defaults.from_date) {
      setDateFrom(filtersConfig.defaults.from_date);
    }
    if (filtersConfig.defaults.to_date) {
      setDateTo(filtersConfig.defaults.to_date);
    }
    setPreset("custom");
    setPageSize(filtersConfig.defaults.page_size || 25);
    setSortBy(filtersConfig.defaults.sort_by || "voucher_date");
    setSortOrder(filtersConfig.defaults.sort_order || "desc");
    setTdsNature(filtersConfig.defaults.tds_nature || "ALL");
    setApplicationMode(filtersConfig.defaults.application_mode || "ALL");
    appliedDefaults.current = true;
  }, [filtersConfig, ready, setDateFrom, setDateTo, setPreset]);

  // Optional deep-link: ?section=194A or ?section=<uuid>
  useEffect(() => {
    if (!filtersConfig || appliedUrlSection.current) return;
    const fromUrl = searchParams.get("section")?.trim();
    if (!fromUrl) {
      appliedUrlSection.current = true;
      return;
    }
    const byId = filtersConfig.tds_sections.find(
      (s) => s.tds_section_id === fromUrl,
    );
    const byCode = filtersConfig.tds_sections.find(
      (s) => s.tds_code.toUpperCase() === fromUrl.toUpperCase(),
    );
    const match = byId ?? byCode;
    if (match) setTdsSectionIds([match.tds_section_id]);
    appliedUrlSection.current = true;
  }, [filtersConfig, searchParams]);

  const branchOptions = useMemo<ReportMultiSelectOption[]>(
    () =>
      (filtersConfig?.branches ?? []).map((branch) => ({
        value: branch.warehouse_id,
        label: branch.warehouse_name,
      })),
    [filtersConfig],
  );

  const tdsSectionOptions = useMemo<ReportMultiSelectOption[]>(
    () =>
      (filtersConfig?.tds_sections ?? []).map((section) => ({
        value: section.tds_section_id,
        label: section.tds_section_name
          ? `${section.tds_code} — ${section.tds_section_name}`
          : section.tds_code,
        searchText: section.tds_section_name ?? section.tds_code,
      })),
    [filtersConfig],
  );

  const monthOptions = useMemo(
    () => filtersConfig?.months ?? [],
    [filtersConfig],
  );

  const natureOptions = useMemo(
    () =>
      filtersConfig?.tds_natures ?? [
        { value: "ALL" as const, label: "All" },
        { value: "TDS_RECEIVABLE" as const, label: "TDS Receivable" },
        { value: "TDS_PAYABLE" as const, label: "TDS Payable" },
      ],
    [filtersConfig],
  );

  const applicationModeOptions = useMemo(
    () =>
      filtersConfig?.application_modes ?? [
        { value: "ALL" as const, label: "All" },
        { value: "AGAINST_INVOICE" as const, label: "Against Invoice" },
        { value: "ON_ACCOUNT" as const, label: "On Account" },
      ],
    [filtersConfig],
  );

  const queryParams = useMemo<TdsSummaryQueryParams | null>(() => {
    if (!financialYearId || financialYearId === "all" || !dateFrom || !dateTo) {
      return null;
    }
    const allowedPartyIds = new Set(parties.map((p) => p.id));
    const safePartyIds =
      parties.length > 0
        ? partyIds.filter((id) => allowedPartyIds.has(id))
        : partyIds;

    return {
      financial_year_id: financialYearId,
      from_date: dateFrom,
      to_date: dateTo,
      month: month !== "all" ? month : undefined,
      branch_ids: branchIds,
      tds_section_ids: tdsSectionIds,
      party_ids: safePartyIds,
      tds_nature: tdsNature,
      application_mode: applicationMode,
      search: debouncedSearch || undefined,
      page,
      page_size: pageSize,
      sort_by: sortBy,
      sort_order: sortOrder,
    };
  }, [
    applicationMode,
    branchIds,
    dateFrom,
    dateTo,
    debouncedSearch,
    financialYearId,
    month,
    page,
    pageSize,
    parties,
    partyIds,
    sortBy,
    sortOrder,
    tdsNature,
    tdsSectionIds,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    financialYearId,
    dateFrom,
    dateTo,
    month,
    branchIds,
    tdsSectionIds,
    partyIds,
    tdsNature,
    applicationMode,
    debouncedSearch,
    sortBy,
    sortOrder,
    pageSize,
  ]);

  useEffect(() => {
    if (!ready || !queryParams || queryParams.from_date > queryParams.to_date) {
      setReportLoading(false);
      if (!queryParams) setReport(null);
      return;
    }
    const controller = new AbortController();
    setReportLoading(true);
    setReportError(null);
    void TdsSummaryApiService.getReport(queryParams, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setReport(result);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setReport(null);
        setReportError(
          error instanceof TdsSummaryApiError
            ? error
            : new TdsSummaryApiError(
                error instanceof Error
                  ? error.message
                  : "Failed to load TDS Summary.",
              ),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setReportLoading(false);
      });
    return () => controller.abort();
  }, [queryParams, ready, refreshTick, retryKey]);

  const clearFilters = useCallback(() => {
    setMonth("all");
    setPartyIds([]);
    setTdsSectionIds([]);
    setBranchIds([]);
    setTdsNature("ALL");
    setApplicationMode("ALL");
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
    setSortBy("voucher_date");
    setSortOrder("desc");
    if (filtersConfig?.defaults.financial_year_id) {
      setFinancialYearId(filtersConfig.defaults.financial_year_id);
    }
    if (filtersConfig?.defaults.from_date) {
      setDateFrom(filtersConfig.defaults.from_date);
    }
    if (filtersConfig?.defaults.to_date) {
      setDateTo(filtersConfig.defaults.to_date);
    }
    setPreset("custom");
  }, [filtersConfig, setDateFrom, setDateTo, setPreset]);

  const handleFinancialYearChange = useCallback(
    (value: string) => {
      setFinancialYearId(value);
      setMonth("all");
      const fy = filtersConfig?.financial_years.find(
        (item) => item.financial_year_id === value,
      );
      if (fy) {
        setDateFrom(fy.start_date);
        setDateTo(fy.end_date);
        setPreset("custom");
      }
    },
    [filtersConfig, setDateFrom, setDateTo, setPreset],
  );

  const handleSort = useCallback((colKey: string) => {
    const backendField = SORT_FIELD_MAP[colKey];
    if (!backendField) return;
    setSortBy((current) => {
      if (current === backendField) {
        setSortOrder((order) => (order === "asc" ? "desc" : "asc"));
        return current;
      }
      setSortOrder("desc");
      return backendField;
    });
  }, []);

  const handleExport = useCallback(
    async (format: "EXCEL" | "PDF") => {
      if (!queryParams || exporting) return;
      setExporting(true);
      try {
        await TdsSummaryApiService.exportReport({
          ...queryParams,
          format,
        });
      } catch (error) {
        showToast(
          error instanceof Error
            ? error.message
            : "Failed to export TDS Summary.",
          "error",
        );
      } finally {
        setExporting(false);
      }
    },
    [exporting, queryParams],
  );

  const summary = report?.summary;
  const rows = report?.rows ?? [];
  const pagination = report?.pagination;
  const totalRows = pagination?.total_rows ?? 0;

  const moreFiltersActiveCount = countActiveMoreFilters({
    branch: branchIds,
  }) + (tdsNature !== "ALL" ? 1 : 0) + (applicationMode !== "ALL" ? 1 : 0);

  const hasActiveFilters =
    Boolean(search.trim()) ||
    month !== "all" ||
    partyIds.length > 0 ||
    tdsSectionIds.length > 0 ||
    branchIds.length > 0 ||
    tdsNature !== "ALL" ||
    applicationMode !== "ALL";

  const monthLabel =
    month === "all"
      ? "All Months"
      : monthOptions.find((o) => o.value === month)?.label ?? month;

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] => {
    const partyOptions = parties.map((p) => ({
      value: p.id,
      label: p.name,
    }));
    return [
      month !== "all"
        ? {
            id: "month",
            label: "Month",
            value: monthLabel,
            onRemove: () => setMonth("all"),
          }
        : null,
      buildEntityFilterSummary(
        "party",
        "Parties",
        partyIds,
        partyOptions,
        () => setPartyIds([]),
      ),
      buildEntityFilterSummary(
        "tdsSection",
        "TDS Sections",
        tdsSectionIds,
        tdsSectionOptions,
        () => setTdsSectionIds([]),
      ),
      buildEntityFilterSummary(
        "branch",
        "Branch",
        branchIds,
        branchOptions,
        () => setBranchIds([]),
      ),
      tdsNature !== "ALL"
        ? {
            id: "tdsNature",
            label: "TDS Nature",
            value:
              natureOptions.find((o) => o.value === tdsNature)?.label ??
              tdsNature,
            onRemove: () => setTdsNature("ALL"),
          }
        : null,
      applicationMode !== "ALL"
        ? {
            id: "applicationMode",
            label: "Application Mode",
            value:
              applicationModeOptions.find((o) => o.value === applicationMode)
                ?.label ?? applicationMode,
            onRemove: () => setApplicationMode("ALL"),
          }
        : null,
    ].filter((item): item is ReportFilterSummaryItem => item != null);
  }, [
    applicationMode,
    applicationModeOptions,
    branchIds,
    branchOptions,
    month,
    monthLabel,
    natureOptions,
    parties,
    partyIds,
    tdsNature,
    tdsSectionIds,
    tdsSectionOptions,
  ]);

  const activeSortCol =
    Object.entries(SORT_FIELD_MAP).find(([, value]) => value === sortBy)?.[0] ??
    "month_key";

  if (!mounted || !ready) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Reports", TITLE)}
        title={TITLE}
        description={DESCRIPTION}
        hideDescription
        layout="split"
        className="h-full min-h-0"
      >
        <TdsSummarySkeleton />
      </AccountsPageShell>
    );
  }

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", TITLE)}
      title={TITLE}
      description={DESCRIPTION}
      hideDescription
      layout="split"
      className="h-full min-h-0"
      filters={
        <>
          <ReportFilterRow
            className="items-end gap-2"
            end={
              <AccountsExportMenu
                onExcel={() => void handleExport("EXCEL")}
                onPdf={() => void handleExport("PDF")}
                disabled={
                  exporting ||
                  reportLoading ||
                  !queryParams ||
                  totalRows === 0
                }
              />
            }
          >
            <ReportFinancialYearFilter
              value={financialYearId || "all"}
              onChange={handleFinancialYearChange}
            />
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
            <ReportTdsSectionMultiFilter
              values={tdsSectionIds}
              onChange={setTdsSectionIds}
              options={tdsSectionOptions}
            />
            <ReportPartyMultiFilter
              values={partyIds}
              onChange={setPartyIds}
              parties={parties}
            />
            <ReportSearchFilter
              value={search}
              onChange={setSearch}
              placeholder="Party, PAN, invoice no.…"
              className="min-w-[170px]"
            />
            <ReportMoreFilters activeCount={moreFiltersActiveCount}>
              <ReportBranchMultiFilter
                values={branchIds}
                onChange={setBranchIds}
                labeledOptions={branchOptions}
              />
              <div className="space-y-1 min-w-[160px]">
                <Label className={filterLabelClass}>TDS Nature</Label>
                <Select
                  value={tdsNature}
                  onValueChange={(v) =>
                    setTdsNature(v as TdsSummaryNatureFilter)
                  }
                >
                  <SelectTrigger className={cn(filterControlClass, "mt-0 w-[160px]")}>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    {natureOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 min-w-[160px]">
                <Label className={filterLabelClass}>Application Mode</Label>
                <Select
                  value={applicationMode}
                  onValueChange={(v) =>
                    setApplicationMode(v as TdsSummaryApplicationModeFilter)
                  }
                >
                  <SelectTrigger className={cn(filterControlClass, "mt-0 w-[160px]")}>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    {applicationModeOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </ReportMoreFilters>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-sm px-2"
                onClick={clearFilters}
              >
                <X className="w-3 h-3 mr-1" /> Reset
              </Button>
            )}
          </ReportFilterRow>
          <ReportFilterSummary items={filterSummaryItems} />
        </>
      }
    >
      {filtersError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <p>{filtersError}</p>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </div>
      ) : null}

      {partiesError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>Party filter unavailable: {partiesError}</p>
        </div>
      ) : null}

      {reportError ? (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <p>{reportError.message}</p>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => setRetryKey((k) => k + 1)}
            >
              Retry
            </Button>
          </div>
        </div>
      ) : null}

      <AccountsTableListing>
        {!queryParams ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            Select a Financial Year and date range to load the TDS Summary.
          </div>
        ) : reportLoading && !report ? (
          <TdsSummarySkeleton />
        ) : totalRows === 0 && !reportLoading ? (
          <div className="accounts-table-empty py-4 text-center">
            No TDS entries found for the selected filters.
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="block mx-auto mt-1 text-brand-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <AccountsTable minWidth={1120}>
              <AccountsTableHead>
                <AccountsTableHeadRow>
                  <ServerSortTh
                    label="Month"
                    colKey="month_key"
                    activeKey={activeSortCol}
                    sortDir={sortOrder}
                    onSort={handleSort}
                  />
                  <ServerSortTh
                    label="Party Name"
                    colKey="party_name"
                    activeKey={activeSortCol}
                    sortDir={sortOrder}
                    onSort={handleSort}
                  />
                  <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">
                    PAN
                  </th>
                  <ServerSortTh
                    label="Invoice Date"
                    colKey="invoice_date"
                    activeKey={activeSortCol}
                    sortDir={sortOrder}
                    onSort={handleSort}
                  />
                  <ServerSortTh
                    label="Invoice No."
                    colKey="invoice_number"
                    activeKey={activeSortCol}
                    sortDir={sortOrder}
                    onSort={handleSort}
                  />
                  <ServerSortTh
                    label="Amount"
                    colKey="taxable_amount"
                    activeKey={activeSortCol}
                    sortDir={sortOrder}
                    onSort={handleSort}
                    align="right"
                  />
                  <ServerSortTh
                    label="TDS Amount"
                    colKey="tds_amount"
                    activeKey={activeSortCol}
                    sortDir={sortOrder}
                    onSort={handleSort}
                    align="right"
                  />
                  <ServerSortTh
                    label="TDS Rate"
                    colKey="tds_rate"
                    activeKey={activeSortCol}
                    sortDir={sortOrder}
                    onSort={handleSort}
                    align="right"
                  />
                  <ServerSortTh
                    label="TDS Section"
                    colKey="tds_section"
                    activeKey={activeSortCol}
                    sortDir={sortOrder}
                    onSort={handleSort}
                  />
                </AccountsTableHeadRow>
              </AccountsTableHead>
              <AccountsTableBody>
                {rows.map((row) => (
                  <TdsSummaryRowView key={row.id} row={row} />
                ))}
              </AccountsTableBody>
              <AccountsTableFoot>
                <AccountsTableRow className="bg-muted/30 border-t-2 border-border">
                  <AccountsTableCell
                    colSpan={5}
                    className="font-bold text-xs text-foreground"
                  >
                    Totals ({summary?.entry_count ?? 0}{" "}
                    {(summary?.entry_count ?? 0) === 1 ? "entry" : "entries"})
                  </AccountsTableCell>
                  <AccountsTableCell
                    align="right"
                    money
                    className={cn("font-bold", MONEY_AMOUNT_CLASS)}
                  >
                    {formatMoneyString(summary?.taxable_amount ?? "0")}
                  </AccountsTableCell>
                  <AccountsTableCell
                    align="right"
                    money
                    className={cn("font-bold", MONEY_AMOUNT_CLASS)}
                  >
                    {formatMoneyString(summary?.tds_amount ?? "0")}
                  </AccountsTableCell>
                  <AccountsTableCell />
                  <AccountsTableCell />
                </AccountsTableRow>
              </AccountsTableFoot>
            </AccountsTable>
            {totalRows > 0 ? (
              <AccountsTablePagination
                page={pagination?.page ?? page}
                pageSize={pagination?.page_size ?? pageSize}
                totalRecords={totalRows}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
                recordLabel="entries"
              />
            ) : null}
          </>
        )}
      </AccountsTableListing>
    </AccountsPageShell>
  );
}
