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
  ReportStatusMultiFilter,
  ReportTdsSectionMultiFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { buildGeneralLedgerHref } from "@/lib/accounts/general-ledger-href";
import {
  applyAccountsColumnFilters,
  collectColumnValueCounts,
} from "@/lib/accounts/column-filter-engine";
import type {
  AccountsColumnFilterState,
  AccountsColumnFilters,
  ColumnValueOption,
} from "@/lib/accounts/column-filter-types";
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

/** API accepts a single enum including ALL; empty or both dimensions → ALL. */
function mapTdsNature(values: string[]): TdsSummaryNatureFilter {
  const cleaned = values.filter(
    (v): v is Exclude<TdsSummaryNatureFilter, "ALL"> =>
      v === "TDS_RECEIVABLE" || v === "TDS_PAYABLE",
  );
  if (cleaned.length === 0 || cleaned.length >= 2) return "ALL";
  return cleaned[0]!;
}

function mapTdsApplicationMode(
  values: string[],
): TdsSummaryApplicationModeFilter {
  const cleaned = values.filter(
    (v): v is Exclude<TdsSummaryApplicationModeFilter, "ALL"> =>
      v === "AGAINST_INVOICE" || v === "ON_ACCOUNT",
  );
  if (cleaned.length === 0 || cleaned.length >= 2) return "ALL";
  return cleaned[0]!;
}

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

function selectedColumnValues(
  filter?: AccountsColumnFilterState,
): string[] {
  return (filter?.selectedValues ?? [])
    .map((v) => String(v).trim())
    .filter(Boolean);
}

function getTdsFilterCell(row: TdsSummaryApiRow, colKey: string): string {
  switch (colKey) {
    case "party_name":
      return row.party_name || "";
    case "pan":
      return row.pan || "";
    case "invoice_number":
      return row.invoice_number || "";
    case "tds_section":
      return formatSectionDisplay(row);
    case "month_key":
      return row.month_label || row.month_key || "";
    default:
      return "";
  }
}

function ServerSortTh({
  label,
  colKey,
  activeKey,
  sortDir,
  onSort,
  align = "left",
  filterable = false,
  filterType = "text",
  filterValue,
  onFilterChange,
  valueOptions,
}: {
  label: string;
  colKey: string;
  activeKey: string;
  sortDir: TdsSummarySortOrder;
  onSort: (key: string) => void;
  align?: "left" | "right";
  filterable?: boolean;
  filterType?: "text" | "status";
  filterValue?: AccountsColumnFilterState;
  onFilterChange?: (value: AccountsColumnFilterState | undefined) => void;
  valueOptions?: ColumnValueOption[];
}) {
  return (
    <AccountsColumnHeader
      label={label}
      colKey={colKey}
      align={align}
      sortable
      filterable={filterable}
      filterType={filterType}
      sortKey={activeKey}
      sortDir={sortDir}
      onSort={onSort}
      filterValue={filterValue}
      onFilterChange={onFilterChange}
      valueOptions={valueOptions}
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
  const [tdsNatures, setTdsNatures] = useState<string[]>([]);
  const [applicationModes, setApplicationModes] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState<TdsSummarySortBy>("voucher_date");
  const [columnFilters, setColumnFilters] = useState<AccountsColumnFilters>({});
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
    {
      const nature = filtersConfig.defaults.tds_nature || "ALL";
      setTdsNatures(nature === "ALL" ? [] : [nature]);
      const mode = filtersConfig.defaults.application_mode || "ALL";
      setApplicationModes(mode === "ALL" ? [] : [mode]);
    }
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
      (filtersConfig?.tds_natures ?? [
        { value: "TDS_RECEIVABLE" as const, label: "TDS Receivable" },
        { value: "TDS_PAYABLE" as const, label: "TDS Payable" },
      ]).filter((o) => o.value !== "ALL"),
    [filtersConfig],
  );

  const applicationModeOptions = useMemo(
    () =>
      (filtersConfig?.application_modes ?? [
        { value: "AGAINST_INVOICE" as const, label: "Against Invoice" },
        { value: "ON_ACCOUNT" as const, label: "On Account" },
      ]).filter((o) => o.value !== "ALL"),
    [filtersConfig],
  );

  const handleColumnFilterChange = useCallback(
    (colKey: string, value: AccountsColumnFilterState | undefined) => {
      setColumnFilters((prev) => {
        if (!value) {
          const next = { ...prev };
          delete next[colKey];
          return next;
        }
        return { ...prev, [colKey]: value };
      });
    },
    [],
  );

  const queryParams = useMemo<TdsSummaryQueryParams | null>(() => {
    if (!financialYearId || financialYearId === "all" || !dateFrom || !dateTo) {
      return null;
    }
    const allowedPartyIds = new Set(parties.map((p) => p.id));
    const toolbarPartyIds =
      parties.length > 0
        ? partyIds.filter((id) => allowedPartyIds.has(id))
        : partyIds;
    const colPartyNames = selectedColumnValues(columnFilters.party_name);
    const colPartyIds =
      colPartyNames.length > 0
        ? parties
            .filter((p) => colPartyNames.includes(p.name))
            .map((p) => p.id)
        : [];
    const safePartyIds =
      colPartyIds.length > 0
        ? toolbarPartyIds.length > 0
          ? toolbarPartyIds.filter((id) => colPartyIds.includes(id))
          : colPartyIds
        : toolbarPartyIds;

    const colSections = selectedColumnValues(columnFilters.tds_section);
    const colSectionIds =
      colSections.length > 0
        ? (filtersConfig?.tds_sections ?? [])
            .filter(
              (s) =>
                colSections.includes(s.tds_code) ||
                colSections.includes(s.tds_section_name ?? "") ||
                colSections.includes(s.tds_section_id),
            )
            .map((s) => s.tds_section_id)
        : [];
    const effectiveSectionIds =
      colSectionIds.length > 0
        ? tdsSectionIds.length > 0
          ? tdsSectionIds.filter((id) => colSectionIds.includes(id))
          : colSectionIds
        : tdsSectionIds;

    return {
      financial_year_id: financialYearId,
      from_date: dateFrom,
      to_date: dateTo,
      month: month !== "all" ? month : undefined,
      branch_ids: branchIds,
      tds_section_ids: effectiveSectionIds,
      party_ids: safePartyIds,
      tds_nature: mapTdsNature(tdsNatures),
      application_mode: mapTdsApplicationMode(applicationModes),
      search: debouncedSearch || undefined,
      page,
      page_size: pageSize,
      sort_by: sortBy,
      sort_order: sortOrder,
    };
  }, [
    applicationModes,
    branchIds,
    columnFilters,
    dateFrom,
    dateTo,
    debouncedSearch,
    filtersConfig,
    financialYearId,
    month,
    page,
    pageSize,
    parties,
    partyIds,
    sortBy,
    sortOrder,
    tdsNatures,
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
    tdsNatures,
    applicationModes,
    debouncedSearch,
    pageSize,
    columnFilters,
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
    setTdsNatures([]);
    setApplicationModes([]);
    setSearch("");
    setDebouncedSearch("");
    setColumnFilters({});
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

  const handleSort = useCallback(
    (colKey: string) => {
      const backendField = SORT_FIELD_MAP[colKey];
      if (!backendField) return;
      if (sortBy === backendField) {
        setSortOrder((order) => (order === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(backendField);
        // First click A→Z / low→high (matches AccountsColumnHeader tooltip).
        setSortOrder("asc");
      }
      setPage(1);
    },
    [sortBy],
  );

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
  const fetchedRows = report?.rows ?? [];
  const filterOptionsByColumn = useMemo(() => {
    const out: Record<string, ColumnValueOption[]> = {
      tds_section: (filtersConfig?.tds_sections ?? []).map((s) => ({
        value: s.tds_code,
        count: 0,
      })),
    };
    for (const key of ["party_name", "pan", "invoice_number", "month_key"] as const) {
      out[key] = collectColumnValueCounts(fetchedRows, key, getTdsFilterCell);
    }
    return out;
  }, [fetchedRows, filtersConfig]);

  const rows = useMemo(
    () =>
      applyAccountsColumnFilters(fetchedRows, columnFilters, getTdsFilterCell),
    [fetchedRows, columnFilters],
  );

  const filterableProps = useCallback(
    (colKey: string) => ({
      filterable: true as const,
      filterType: "text" as const,
      filterValue: columnFilters[colKey],
      onFilterChange: (value: AccountsColumnFilterState | undefined) =>
        handleColumnFilterChange(colKey, value),
      valueOptions: filterOptionsByColumn[colKey] ?? [],
    }),
    [columnFilters, filterOptionsByColumn, handleColumnFilterChange],
  );

  const pagination = report?.pagination;
  const totalRows = pagination?.total_rows ?? 0;

  const moreFiltersActiveCount = countActiveMoreFilters({
    branch: branchIds,
  }) + (tdsNatures.length > 0 ? 1 : 0) + (applicationModes.length > 0 ? 1 : 0);

  const hasActiveFilters =
    Boolean(search.trim()) ||
    month !== "all" ||
    partyIds.length > 0 ||
    tdsSectionIds.length > 0 ||
    branchIds.length > 0 ||
    tdsNatures.length > 0 ||
    applicationModes.length > 0 ||
    Object.values(columnFilters).some(
      (f) => f?.selectedValues && f.selectedValues.length > 0,
    );

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
      buildEntityFilterSummary(
        "tdsNature",
        "TDS Nature",
        tdsNatures,
        natureOptions,
        () => setTdsNatures([]),
      ),
      buildEntityFilterSummary(
        "applicationMode",
        "Application Mode",
        applicationModes,
        applicationModeOptions,
        () => setApplicationModes([]),
      ),
    ].filter((item): item is ReportFilterSummaryItem => item != null);
  }, [
    applicationModes,
    applicationModeOptions,
    branchIds,
    branchOptions,
    month,
    monthLabel,
    natureOptions,
    parties,
    partyIds,
    tdsNatures,
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
              <ReportStatusMultiFilter
                label="TDS Nature"
                values={tdsNatures}
                onChange={setTdsNatures}
                options={natureOptions}
              />
              <ReportStatusMultiFilter
                label="Application Mode"
                values={applicationModes}
                onChange={setApplicationModes}
                options={applicationModeOptions}
              />
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
                    {...filterableProps("month_key")}
                  />
                  <ServerSortTh
                    label="Party Name"
                    colKey="party_name"
                    activeKey={activeSortCol}
                    sortDir={sortOrder}
                    onSort={handleSort}
                    {...filterableProps("party_name")}
                  />
                  <AccountsColumnHeader
                    label="PAN"
                    colKey="pan"
                    sortable={false}
                    {...filterableProps("pan")}
                  />
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
                    {...filterableProps("invoice_number")}
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
                    {...filterableProps("tds_section")}
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
