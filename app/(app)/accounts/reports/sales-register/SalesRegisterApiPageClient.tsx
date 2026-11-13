"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { AccountsSummaryBar } from "@/components/accounts/AccountsSummaryBar";
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
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportBranchMultiFilter,
  ReportCustomerMultiFilter,
  ReportStatusMultiFilter,
  ReportSalespersonMultiFilter,
  ReportWarehouseMultiFilter,
  ReportFilterSummary,
  ReportFilterField,
  ReportFinancialYearFilter,
  ReportStateFilter,
  ReportSearchFilter,
  ReportFilterResetButton,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import { AccountsColumnHeader } from "@/components/accounts/AccountsColumnHeader";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  formatMoneyString,
  formatMoneyStringOrDash,
  MONEY_AMOUNT_CLASS,
} from "@/lib/accounts/money-format";
import { formatDisplayDate } from "@/lib/accounts/date-display";
import { useClientMounted } from "@/lib/use-client-mounted";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
import type { ReportFilterSummaryItem } from "@/lib/accounts/report-multi-filter-utils";
import {
  buildEntityFilterSummary,
  type ReportMultiSelectOption,
} from "@/lib/accounts/report-multi-filter-utils";
import {
  SalesRegisterApiError,
  SalesRegisterApiService,
} from "@/services/sales-register.service";
import { CustomerListService } from "@/services/customer-list.service";
import type {
  SalesRegisterApiRow,
  SalesRegisterFiltersConfig,
  SalesRegisterGstTypeFilter,
  SalesRegisterInvoiceType,
  SalesRegisterQueryParams,
  SalesRegisterReportResult,
  SalesRegisterReportStatus,
  SalesRegisterRowGrain,
  SalesRegisterSortBy,
  SalesRegisterSortOrder,
} from "@/types/sales-register.types";

const TITLE = "Sales Register";
const DESCRIPTION =
  "Sales Tax Invoices (Posted and Cancelled) with taxable value, CGST/SGST/IGST breakup, and net totals (Posted − Cancelled). Drafts and other sales documents are excluded.";

const GST_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All GST types" },
  { value: "cgst_sgst", label: "CGST/SGST" },
  { value: "igst", label: "IGST" },
];

const STATUS_OPTIONS: { value: "POSTED" | "CANCELLED"; label: string }[] = [
  { value: "POSTED", label: "Posted" },
  { value: "CANCELLED", label: "Cancelled" },
];

const DEFAULT_STATUSES: SalesRegisterReportStatus[] = ["POSTED", "CANCELLED"];

const ROW_GRAIN_OPTIONS: { value: SalesRegisterRowGrain; label: string }[] = [
  { value: "INVOICE", label: "Invoice wise" },
  { value: "ITEM", label: "Item wise" },
];

function statusesMatchDefault(values: string[]): boolean {
  if (values.length !== DEFAULT_STATUSES.length) return false;
  const set = new Set(values);
  return DEFAULT_STATUSES.every((s) => set.has(s));
}

const SORT_FIELD_MAP: Record<string, SalesRegisterSortBy> = {
  invoice_date: "invoice_date",
  invoice_no: "invoice_number",
  customer_name: "customer_name",
  taxable_value: "taxable_amount",
  invoice_total: "invoice_total",
};

function mapGstType(value: string): SalesRegisterGstTypeFilter {
  const lower = value.toLowerCase();
  if (lower === "igst") return "IGST";
  if (lower === "cgst_sgst") return "CGST_SGST";
  return "ALL";
}

function formatStatusForBadge(status: SalesRegisterReportStatus): string {
  return status.toLowerCase();
}

function SalesRegisterSkeleton() {
  return (
    <div className="flex-1 p-4 space-y-2">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-8 bg-muted animate-pulse rounded-md" />
      ))}
    </div>
  );
}

export default function SalesRegisterApiPageClient() {
  const mounted = useClientMounted();
  const refreshTick = useAccountsSectionRefresh("sales-invoices", {
    apiListing: true,
  });
  const appliedDefaults = useRef(false);

  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } =
    useReportDateRange("this_year");

  const [filtersConfig, setFiltersConfig] =
    useState<SalesRegisterFiltersConfig | null>(null);
  const [filtersError, setFiltersError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<
    Array<{ id: string; customerName: string; customerCode: string }>
  >([]);
  const [customersError, setCustomersError] = useState<string | null>(null);
  const [financialYearId, setFinancialYearId] = useState("");
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [warehouseIds, setWarehouseIds] = useState<string[]>([]);
  const [customerIds, setCustomerIds] = useState<string[]>([]);
  const [customerTypeId, setCustomerTypeId] = useState("all");
  const [salespersonIds, setSalespersonIds] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([...DEFAULT_STATUSES]);
  const [invoiceTypes, setInvoiceTypes] = useState<string[]>([]);
  const [stateCode, setStateCode] = useState("all");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [debouncedInvoiceNo, setDebouncedInvoiceNo] = useState("");
  const [gstType, setGstType] = useState("all");
  const [rowGrain, setRowGrain] = useState<SalesRegisterRowGrain>("INVOICE");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState<SalesRegisterSortBy>("invoice_date");
  const [sortOrder, setSortOrder] = useState<SalesRegisterSortOrder>("desc");

  const [report, setReport] = useState<SalesRegisterReportResult | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<SalesRegisterApiError | null>(
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
      setDebouncedInvoiceNo(invoiceNo.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [invoiceNo]);

  useEffect(() => {
    if (!mounted) return;
    const controller = new AbortController();
    void SalesRegisterApiService.getFilters(controller.signal)
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
            : "Failed to load Sales Register filters.",
        );
      });
    return () => controller.abort();
  }, [mounted]);

  // Uncapped master customer dropdown (avoids filters take:500 cap).
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    void CustomerListService.dropdown()
      .then((items) => {
        if (cancelled) return;
        const mapped = items.map((c) => ({
          id: c.customer_id,
          customerName: c.customer_name,
          customerCode: c.customer_code,
        }));
        setCustomers(mapped);
        setCustomersError(null);
        const allowed = new Set(mapped.map((c) => c.id));
        setCustomerIds((prev) => prev.filter((id) => allowed.has(id)));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setCustomers([]);
        setCustomersError(
          error instanceof Error ? error.message : "Failed to load customers.",
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
    setSortBy(filtersConfig.defaults.sort_by || "invoice_date");
    setSortOrder(filtersConfig.defaults.sort_order || "desc");
    setRowGrain(filtersConfig.defaults.row_grain || "INVOICE");
    const defaultStatuses = (filtersConfig.defaults.statuses ?? []).filter(
      (s): s is SalesRegisterReportStatus =>
        s === "POSTED" || s === "CANCELLED",
    );
    setStatuses(
      defaultStatuses.length > 0 ? defaultStatuses : [...DEFAULT_STATUSES],
    );
    appliedDefaults.current = true;
  }, [filtersConfig, ready, setDateFrom, setDateTo, setPreset]);

  const branchOptions = useMemo<ReportMultiSelectOption[]>(
    () =>
      (filtersConfig?.branches ?? []).map((branch) => ({
        value: branch.warehouse_id,
        label: branch.warehouse_name,
      })),
    [filtersConfig],
  );

  const warehouseOptions = useMemo<ReportMultiSelectOption[]>(
    () =>
      (filtersConfig?.warehouses ?? []).map((warehouse) => ({
        value: warehouse.warehouse_id,
        label: warehouse.warehouse_name,
      })),
    [filtersConfig],
  );

  const salespersonOptions = useMemo<ReportMultiSelectOption[]>(
    () =>
      (filtersConfig?.salespeople ?? []).map((person) => ({
        value: person.user_id,
        label: person.name,
      })),
    [filtersConfig],
  );

  const stateOptions = useMemo(
    () =>
      (filtersConfig?.states ?? []).map((state) => ({
        value: state.state_code,
        label: state.state_name,
      })),
    [filtersConfig],
  );

  const customerTypeOptions = filtersConfig?.customer_types ?? [];

  const invoiceTypeOptions = filtersConfig?.invoice_types ?? [
    { value: "SALES" as const, label: "Sales" },
    { value: "DIRECT_SERVICE" as const, label: "Direct Service" },
    { value: "STOCK_TRANSFER" as const, label: "Stock Transfer" },
  ];

  const queryParams = useMemo<SalesRegisterQueryParams | null>(() => {
    if (!financialYearId || financialYearId === "all" || !dateFrom || !dateTo) {
      return null;
    }
    const statusParams = statuses.filter(
      (s): s is SalesRegisterReportStatus =>
        s === "POSTED" || s === "CANCELLED",
    );
    const typeParams = invoiceTypes.filter(
      (t): t is SalesRegisterInvoiceType =>
        t === "SALES" || t === "DIRECT_SERVICE" || t === "STOCK_TRANSFER",
    );
    const allowedCustomerIds = new Set(customers.map((c) => c.id));
    const safeCustomerIds = customerIds.filter((id) => allowedCustomerIds.has(id));
    return {
      financial_year_id: financialYearId,
      from_date: dateFrom,
      to_date: dateTo,
      branch_ids: branchIds,
      warehouse_ids: warehouseIds,
      customer_ids: safeCustomerIds,
      customer_type_id:
        customerTypeId !== "all" ? customerTypeId : undefined,
      salesperson_ids: salespersonIds,
      invoice_number: debouncedInvoiceNo || undefined,
      state_code: stateCode !== "all" ? stateCode : undefined,
      statuses:
        statusParams.length > 0 ? statusParams : [...DEFAULT_STATUSES],
      invoice_types: typeParams.length > 0 ? typeParams : undefined,
      gst_type: mapGstType(gstType),
      row_grain: rowGrain,
      page,
      page_size: pageSize,
      sort_by: sortBy,
      sort_order: sortOrder,
    };
  }, [
    branchIds,
    customerIds,
    customers,
    customerTypeId,
    dateFrom,
    dateTo,
    debouncedInvoiceNo,
    financialYearId,
    gstType,
    invoiceTypes,
    page,
    pageSize,
    rowGrain,
    salespersonIds,
    sortBy,
    sortOrder,
    stateCode,
    statuses,
    warehouseIds,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    financialYearId,
    dateFrom,
    dateTo,
    branchIds,
    warehouseIds,
    customerIds,
    customerTypeId,
    salespersonIds,
    debouncedInvoiceNo,
    stateCode,
    statuses,
    invoiceTypes,
    gstType,
    rowGrain,
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
    void SalesRegisterApiService.getReport(queryParams, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setReport(result);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setReport(null);
        setReportError(
          error instanceof SalesRegisterApiError
            ? error
            : new SalesRegisterApiError(
                error instanceof Error
                  ? error.message
                  : "Failed to load Sales Register.",
              ),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setReportLoading(false);
      });
    return () => controller.abort();
  }, [queryParams, ready, refreshTick, retryKey]);

  const clearFilters = useCallback(() => {
    setBranchIds([]);
    setWarehouseIds([]);
    setCustomerIds([]);
    setCustomerTypeId("all");
    setSalespersonIds([]);
    const defaultStatuses = (filtersConfig?.defaults.statuses ?? []).filter(
      (s): s is SalesRegisterReportStatus =>
        s === "POSTED" || s === "CANCELLED",
    );
    setStatuses(
      defaultStatuses.length > 0 ? defaultStatuses : [...DEFAULT_STATUSES],
    );
    setInvoiceTypes([]);
    setStateCode("all");
    setInvoiceNo("");
    setDebouncedInvoiceNo("");
    setGstType("all");
    setRowGrain(filtersConfig?.defaults.row_grain || "INVOICE");
    setPage(1);
    setSortBy("invoice_date");
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
        await SalesRegisterApiService.exportReport({
          ...queryParams,
          format,
        });
      } catch (error) {
        showToast(
          error instanceof Error
            ? error.message
            : "Failed to export Sales Register.",
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
  const itemWise = rowGrain === "ITEM";
  const hasActiveFilters =
    branchIds.length > 0 ||
    warehouseIds.length > 0 ||
    customerIds.length > 0 ||
    customerTypeId !== "all" ||
    salespersonIds.length > 0 ||
    !statusesMatchDefault(statuses) ||
    invoiceTypes.length > 0 ||
    stateCode !== "all" ||
    Boolean(invoiceNo.trim()) ||
    gstType !== "all" ||
    rowGrain !== "INVOICE";

  const filterSummaryItems = useMemo(() => {
    const items: Array<ReportFilterSummaryItem | null> = [
      buildEntityFilterSummary(
        "branch",
        "Branch",
        branchIds,
        branchOptions,
        () => setBranchIds([]),
      ),
      warehouseIds.length > 0
        ? {
            id: "warehouse",
            label: "Warehouse",
            value:
              warehouseIds.length === 1
                ? warehouseOptions.find((o) => o.value === warehouseIds[0])
                    ?.label ?? warehouseIds[0]
                : `${warehouseIds.length} warehouses`,
            onRemove: () => setWarehouseIds([]),
          }
        : null,
      buildEntityFilterSummary(
        "customer",
        "Customer",
        customerIds,
        customers.map((c) => ({ value: String(c.id), label: c.customerName })),
        () => setCustomerIds([]),
      ),
      customerTypeId !== "all"
        ? {
            id: "customerType",
            label: "Customer Type",
            value:
              customerTypeOptions.find(
                (t) => t.customer_type_id === customerTypeId,
              )?.customer_type_name ?? customerTypeId,
            onRemove: () => setCustomerTypeId("all"),
          }
        : null,
      buildEntityFilterSummary(
        "salesperson",
        "Salesperson",
        salespersonIds,
        salespersonOptions,
        () => setSalespersonIds([]),
      ),
      !statusesMatchDefault(statuses)
        ? {
            id: "status",
            label: "Status",
            value: statuses
              .map(
                (s) =>
                  STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s,
              )
              .join(", "),
            onRemove: () => setStatuses([...DEFAULT_STATUSES]),
          }
        : null,
      invoiceTypes.length > 0
        ? {
            id: "invoice_types",
            label: "Invoice Type",
            value: invoiceTypes
              .map(
                (t) =>
                  invoiceTypeOptions.find((o) => o.value === t)?.label ?? t,
              )
              .join(", "),
            onRemove: () => setInvoiceTypes([]),
          }
        : null,
      stateCode !== "all"
        ? {
            id: "state",
            label: "State",
            value:
              stateOptions.find((s) => s.value === stateCode)?.label ??
              stateCode,
            onRemove: () => setStateCode("all"),
          }
        : null,
      gstType !== "all"
        ? {
            id: "gstType",
            label: "GST Type",
            value:
              GST_TYPE_OPTIONS.find((o) => o.value === gstType)?.label ??
              gstType,
            onRemove: () => setGstType("all"),
          }
        : null,
      rowGrain !== "INVOICE"
        ? {
            id: "rowGrain",
            label: "View",
            value:
              ROW_GRAIN_OPTIONS.find((o) => o.value === rowGrain)?.label ??
              rowGrain,
            onRemove: () => setRowGrain("INVOICE"),
          }
        : null,
      invoiceNo.trim()
        ? {
            id: "invoiceNo",
            label: "Invoice No.",
            value: invoiceNo.trim(),
            onRemove: () => setInvoiceNo(""),
          }
        : null,
    ];
    return items.filter((item): item is ReportFilterSummaryItem => item != null);
  }, [
    branchIds,
    branchOptions,
    customerIds,
    customerTypeId,
    customerTypeOptions,
    customers,
    gstType,
    invoiceNo,
    invoiceTypeOptions,
    invoiceTypes,
    rowGrain,
    salespersonIds,
    salespersonOptions,
    stateCode,
    stateOptions,
    statuses,
    warehouseIds,
    warehouseOptions,
  ]);

  const sortKeyForHeader = (backend: SalesRegisterSortBy): string => {
    const entry = Object.entries(SORT_FIELD_MAP).find(
      ([, value]) => value === backend,
    );
    return entry?.[0] ?? backend;
  };

  const activeSortCol = sortKeyForHeader(sortBy);

  if (!mounted) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Sales", TITLE)}
        title={TITLE}
        description={DESCRIPTION}
      >
        <SalesRegisterSkeleton />
      </AccountsPageShell>
    );
  }

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Sales", TITLE)}
      title={TITLE}
      description={DESCRIPTION}
      filters={
        <>
          <ReportFilterRow
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
            <ReportBranchMultiFilter
              values={branchIds}
              onChange={setBranchIds}
              labeledOptions={branchOptions}
            />
            <ReportWarehouseMultiFilter
              values={warehouseIds}
              onChange={setWarehouseIds}
              labeledOptions={warehouseOptions}
            />
            <ReportCustomerMultiFilter
              values={customerIds}
              onChange={setCustomerIds}
              customers={customers}
            />
            <ReportFilterField label="Customer Type" minWidthClass="min-w-[140px]">
              <Select
                value={customerTypeId}
                onValueChange={setCustomerTypeId}
              >
                <SelectTrigger className={cn(filterControlClass, "w-full")}>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {customerTypeOptions.map((option) => (
                    <SelectItem
                      key={option.customer_type_id}
                      value={option.customer_type_id}
                    >
                      {option.customer_type_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ReportFilterField>
            <ReportSalespersonMultiFilter
              values={salespersonIds}
              onChange={setSalespersonIds}
              labeledOptions={salespersonOptions}
            />
            <ReportSearchFilter
              value={invoiceNo}
              onChange={setInvoiceNo}
              placeholder="Invoice number…"
            />
            <ReportStateFilter
              value={stateCode}
              onChange={setStateCode}
              options={stateOptions}
            />
            <ReportStatusMultiFilter
              values={statuses}
              onChange={(next) =>
                setStatuses(
                  next.length > 0 ? next : [...DEFAULT_STATUSES],
                )
              }
              options={STATUS_OPTIONS}
            />
            <ReportStatusMultiFilter
              label="Invoice Type"
              values={invoiceTypes}
              onChange={setInvoiceTypes}
              options={invoiceTypeOptions.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
            />
            <ReportFilterField label="GST Type" minWidthClass="min-w-[130px]">
              <Select value={gstType} onValueChange={setGstType}>
                <SelectTrigger className={cn(filterControlClass, "w-full")}>
                  <SelectValue placeholder="All GST types" />
                </SelectTrigger>
                <SelectContent>
                  {GST_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ReportFilterField>
            <ReportFilterField label="View" minWidthClass="min-w-[140px]">
              <Select
                value={rowGrain}
                onValueChange={(value) =>
                  setRowGrain(value as SalesRegisterRowGrain)
                }
              >
                <SelectTrigger className={cn(filterControlClass, "w-full")}>
                  <SelectValue placeholder="Invoice wise" />
                </SelectTrigger>
                <SelectContent>
                  {ROW_GRAIN_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ReportFilterField>
          </ReportFilterRow>
          <div className="flex items-center gap-2 w-full">
            <ReportFilterSummary items={filterSummaryItems} />
            <ReportFilterResetButton
              onClick={clearFilters}
              showOnlyWhenActive
              active={hasActiveFilters}
            />
          </div>
        </>
      }
      layout="split"
      className="h-full min-h-0"
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

      {customersError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>Customer filter unavailable: {customersError}</p>
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

      <AccountsTableListing
        summary={
          <AccountsSummaryBar
            items={[
              {
                label: "Posted",
                value: String(summary?.posted?.invoice_count ?? 0),
              },
              {
                label: "Cancelled",
                value: String(summary?.cancelled?.invoice_count ?? 0),
                warn: (summary?.cancelled?.invoice_count ?? 0) > 0,
              },
              {
                label: "Net Taxable",
                value: formatMoneyString(
                  summary?.net?.taxable_amount ?? summary?.taxable_amount ?? "0",
                ),
              },
              {
                label: "Net CGST",
                value: formatMoneyString(summary?.net?.cgst ?? summary?.cgst ?? "0"),
              },
              {
                label: "Net SGST",
                value: formatMoneyString(summary?.net?.sgst ?? summary?.sgst ?? "0"),
              },
              {
                label: "Net IGST",
                value: formatMoneyString(summary?.net?.igst ?? summary?.igst ?? "0"),
              },
              {
                label: "Net Discount",
                value: formatMoneyString(
                  summary?.net?.discount ?? summary?.discount ?? "0",
                ),
              },
              {
                label: "Net Invoice Value",
                value: formatMoneyString(
                  summary?.net?.invoice_value ?? summary?.invoice_value ?? "0",
                ),
              },
            ]}
          />
        }
      >
        {!queryParams ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            Select a Financial Year and date range to load the Sales Register.
          </div>
        ) : reportLoading && !report ? (
          <SalesRegisterSkeleton />
        ) : totalRows === 0 && !reportLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground space-y-2">
            <p>
              {itemWise
                ? "No sales invoice items found for the selected filters."
                : "No Sales Invoices found for the selected filters."}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-brand-600 hover:underline"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <AccountsTable minWidth={itemWise ? 2200 : 1760}>
              <AccountsTableHead>
                <AccountsTableHeadRow>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap w-14">
                    Sr. No.
                  </th>
                  <ServerSortTh
                    label="Invoice Date"
                    colKey="invoice_date"
                    activeKey={activeSortCol}
                    sortDir={sortOrder}
                    onSort={handleSort}
                  />
                  <ServerSortTh
                    label="Invoice Number"
                    colKey="invoice_no"
                    activeKey={activeSortCol}
                    sortDir={sortOrder}
                    onSort={handleSort}
                  />
                  <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">
                    Customer Code
                  </th>
                  <ServerSortTh
                    label="Customer Name"
                    colKey="customer_name"
                    activeKey={activeSortCol}
                    sortDir={sortOrder}
                    onSort={handleSort}
                  />
                  <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">
                    GSTIN
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">
                    State
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">
                    Salesperson
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap min-w-[220px]">
                    Warehouse / Branch
                  </th>
                  {itemWise ? (
                    <>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">
                        Product Code
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">
                        Product Name
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">
                        HSN / SAC
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold whitespace-nowrap">
                        Qty
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">
                        UOM
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold whitespace-nowrap">
                        Rate
                      </th>
                    </>
                  ) : null}
                  <ServerSortTh
                    label="Taxable Amount"
                    colKey="taxable_value"
                    activeKey={activeSortCol}
                    sortDir={sortOrder}
                    onSort={handleSort}
                    align="right"
                  />
                  <th className="px-3 py-2.5 text-right text-xs font-semibold whitespace-nowrap">
                    CGST
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold whitespace-nowrap">
                    SGST
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold whitespace-nowrap">
                    IGST
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold whitespace-nowrap">
                    Discount
                  </th>
                  {itemWise ? null : (
                    <th className="px-3 py-2.5 text-right text-xs font-semibold whitespace-nowrap">
                      Other Charges
                    </th>
                  )}
                  <ServerSortTh
                    label={itemWise ? "Line Total" : "Invoice Total"}
                    colKey="invoice_total"
                    activeKey={activeSortCol}
                    sortDir={sortOrder}
                    onSort={handleSort}
                    align="right"
                  />
                  {itemWise ? null : (
                    <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">
                      Payment Terms
                    </th>
                  )}
                  <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">
                    Status
                  </th>
                </AccountsTableHeadRow>
              </AccountsTableHead>
              <AccountsTableBody>
                {rows.map((row, idx) => (
                  <SalesRegisterRowView
                    key={row.id}
                    row={row}
                    sr={(page - 1) * pageSize + idx + 1}
                    itemWise={itemWise}
                  />
                ))}
              </AccountsTableBody>
              {summary?.posted && summary?.cancelled && summary?.net ? (
                <AccountsTableFoot>
                  <SummaryFooterRow
                    label={`Posted (${summary.posted.invoice_count})`}
                    bucket={summary.posted}
                    itemWise={itemWise}
                  />
                  <SummaryFooterRow
                    label={`Cancelled (${summary.cancelled.invoice_count})`}
                    bucket={summary.cancelled}
                    tone="cancelled"
                    itemWise={itemWise}
                  />
                  <SummaryFooterRow
                    label={`Net (${summary.net.invoice_count})`}
                    bucket={summary.net}
                    tone="net"
                    itemWise={itemWise}
                  />
                </AccountsTableFoot>
              ) : null}
            </AccountsTable>
            {totalRows > 0 ? (
              <AccountsTablePagination
                page={page}
                pageSize={pageSize}
                totalRecords={totalRows}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
                recordLabel={itemWise ? "items" : "invoices"}
              />
            ) : null}
          </>
        )}
      </AccountsTableListing>
    </AccountsPageShell>
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
  sortDir: SalesRegisterSortOrder;
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

function SummaryFooterRow({
  label,
  bucket,
  tone = "default",
  itemWise = false,
}: {
  label: string;
  bucket: {
    taxable_amount: string;
    cgst: string;
    sgst: string;
    igst: string;
    discount: string;
    other_charges: string;
    invoice_value: string;
  };
  tone?: "default" | "cancelled" | "net";
  itemWise?: boolean;
}) {
  const rowClass =
    tone === "cancelled"
      ? "bg-red-50/80 text-red-800"
      : tone === "net"
        ? "bg-slate-50"
        : undefined;
  return (
    <AccountsTableRow className={rowClass}>
      <AccountsTableCell
        colSpan={itemWise ? 15 : 9}
        className="font-semibold text-xs text-foreground"
      >
        {label}
      </AccountsTableCell>
      <AccountsTableCell
        align="right"
        money
        className={cn("font-semibold", MONEY_AMOUNT_CLASS)}
      >
        {formatMoneyString(bucket.taxable_amount)}
      </AccountsTableCell>
      <AccountsTableCell
        align="right"
        money
        className={cn("font-semibold", MONEY_AMOUNT_CLASS)}
      >
        {formatMoneyString(bucket.cgst)}
      </AccountsTableCell>
      <AccountsTableCell
        align="right"
        money
        className={cn("font-semibold", MONEY_AMOUNT_CLASS)}
      >
        {formatMoneyString(bucket.sgst)}
      </AccountsTableCell>
      <AccountsTableCell
        align="right"
        money
        className={cn("font-semibold", MONEY_AMOUNT_CLASS)}
      >
        {formatMoneyString(bucket.igst)}
      </AccountsTableCell>
      <AccountsTableCell
        align="right"
        money
        className={cn("font-semibold", MONEY_AMOUNT_CLASS)}
      >
        {formatMoneyString(bucket.discount)}
      </AccountsTableCell>
      {itemWise ? null : (
        <AccountsTableCell
          align="right"
          money
          className={cn("font-semibold", MONEY_AMOUNT_CLASS)}
        >
          {formatMoneyString(bucket.other_charges)}
        </AccountsTableCell>
      )}
      <AccountsTableCell
        align="right"
        money
        className={cn("font-semibold", MONEY_AMOUNT_CLASS)}
      >
        {formatMoneyString(bucket.invoice_value)}
      </AccountsTableCell>
      <AccountsTableCell colSpan={itemWise ? 1 : 2} />
    </AccountsTableRow>
  );
}

function SalesRegisterRowView({
  row,
  sr,
  itemWise = false,
}: {
  row: SalesRegisterApiRow;
  sr: number;
  itemWise?: boolean;
}) {
  const isCancelled = row.invoice_status === "CANCELLED";
  const invoiceHref = `/accounts/transactions/invoices/${
    row.item?.sales_invoice_id ?? row.id
  }`;
  return (
    <AccountsTableRow
      className={cn(
        "group",
        isCancelled && "bg-red-50/60 text-red-900/90",
      )}
    >
      <AccountsTableCell className="text-xs tabular-nums text-muted-foreground">
        {sr}
      </AccountsTableCell>
      <AccountsTableCell className="text-xs whitespace-nowrap">
        {formatDisplayDate(row.invoice_date, row.invoice_date)}
      </AccountsTableCell>
      <AccountsTableCell
        mono
        className={cn(
          "font-semibold whitespace-nowrap",
          isCancelled ? "text-red-700 line-through" : "text-brand-700",
        )}
      >
        <Link
          href={invoiceHref}
          className="hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.invoice_no}
        </Link>
      </AccountsTableCell>
      <AccountsTableCell mono className="text-xs text-brand-700">
        {row.customer.code || "—"}
      </AccountsTableCell>
      <AccountsTableCell
        className="text-xs font-medium max-w-[160px] truncate"
        title={row.customer.name}
      >
        {row.customer.name}
      </AccountsTableCell>
      <AccountsTableCell mono className="text-xs whitespace-nowrap">
        {row.customer.gstin || "—"}
      </AccountsTableCell>
      <AccountsTableCell className="text-xs whitespace-nowrap">
        {row.state.name || row.state.code || "—"}
      </AccountsTableCell>
      <AccountsTableCell
        className="text-xs max-w-[120px] truncate"
        title={row.salesperson.name || undefined}
      >
        {row.salesperson.name || "—"}
      </AccountsTableCell>
      <AccountsTableCell className="text-xs whitespace-nowrap min-w-[220px]">
        {row.warehouse?.name || row.branch?.name || "—"}
      </AccountsTableCell>
      {itemWise ? (
        <>
          <AccountsTableCell mono className="text-xs text-brand-700">
            {row.item?.product.code || "—"}
          </AccountsTableCell>
          <AccountsTableCell
            className="text-xs font-medium max-w-[180px] truncate"
            title={row.item?.product.name}
          >
            {row.item?.product.name || "—"}
          </AccountsTableCell>
          <AccountsTableCell mono className="text-xs whitespace-nowrap">
            {row.item?.hsn_sac || "—"}
          </AccountsTableCell>
          <AccountsTableCell
            align="right"
            className="text-xs tabular-nums whitespace-nowrap"
          >
            {row.item?.quantity || "—"}
          </AccountsTableCell>
          <AccountsTableCell className="text-xs whitespace-nowrap">
            {row.item?.uom || "—"}
          </AccountsTableCell>
          <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
            {formatMoneyStringOrDash(row.item?.rate ?? null)}
          </AccountsTableCell>
        </>
      ) : null}
      <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
        {formatMoneyString(row.taxable_value)}
      </AccountsTableCell>
      <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
        {formatMoneyStringOrDash(row.cgst)}
      </AccountsTableCell>
      <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
        {formatMoneyStringOrDash(row.sgst)}
      </AccountsTableCell>
      <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
        {formatMoneyStringOrDash(row.igst)}
      </AccountsTableCell>
      <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
        {formatMoneyStringOrDash(row.discount)}
      </AccountsTableCell>
      {itemWise ? null : (
        <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
          {formatMoneyStringOrDash(row.other_charges)}
        </AccountsTableCell>
      )}
      <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
        {formatMoneyString(row.invoice_total)}
      </AccountsTableCell>
      {itemWise ? null : (
        <AccountsTableCell className="text-xs whitespace-nowrap">
          {row.payment_terms || "—"}
        </AccountsTableCell>
      )}
      <AccountsTableCell className="text-xs whitespace-nowrap">
        <StatusBadge status={formatStatusForBadge(row.invoice_status)} />
      </AccountsTableCell>
    </AccountsTableRow>
  );
}
