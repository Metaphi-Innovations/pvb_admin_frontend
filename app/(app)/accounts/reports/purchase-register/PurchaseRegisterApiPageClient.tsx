"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ReportWarehouseMultiFilter,
  ReportFilterSummary,
  ReportFilterField,
  ReportFinancialYearFilter,
  ReportSearchFilter,
  ReportFilterResetButton,
  ReportVendorMultiFilter,
  ReportStatusMultiFilter,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import { AccountsColumnHeader } from "@/components/accounts/AccountsColumnHeader";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  formatMoneyString,
  MONEY_AMOUNT_CLASS,
} from "@/lib/accounts/money-format";
import { formatDisplayDate } from "@/lib/accounts/date-display";
import { formatSignedRoundOff } from "@/components/accounts/voucher-form/VoucherSignedRoundOffInput";
import { useClientMounted } from "@/lib/use-client-mounted";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
import { resolveDateRangePreset } from "@/lib/accounts/report-date-presets";
import type { ReportFilterSummaryItem } from "@/lib/accounts/report-multi-filter-utils";
import {
  buildEntityFilterSummary,
  type ReportMultiSelectOption,
} from "@/lib/accounts/report-multi-filter-utils";
import {
  PurchaseRegisterApiError,
  PurchaseRegisterApiService,
} from "@/services/purchase-register.service";
import { SupplierListService } from "@/services/supplier-list.service";
import type {
  PurchaseRegisterApiRow,
  PurchaseRegisterFiltersConfig,
  PurchaseRegisterGstr2bSimpleStatus,
  PurchaseRegisterInvoiceType,
  PurchaseRegisterQueryParams,
  PurchaseRegisterReportResult,
  PurchaseRegisterReportStatus,
  PurchaseRegisterSortBy,
  PurchaseRegisterSortOrder,
} from "@/types/purchase-register.types";
import {
  DEFAULT_VISIBLE_API_COLUMNS,
  estimateApiTableMinWidth,
  getVisibleApiColumnDefs,
  type PurchaseRegisterApiColKey,
} from "./purchase-register-api-columns";
import { PurchaseRegister2bSheet } from "./components/PurchaseRegister2bSheet";
import "./purchase-register-compact.css";

const TITLE = "Purchase Register";
const DESCRIPTION =
  "Posted Purchase Invoices and Debit Notes with taxable value, GST breakup, and GSTR-2B reconciliation overlay. Drafts are excluded.";

const SORT_FIELD_MAP: Record<string, PurchaseRegisterSortBy> = {
  purchase_date: "purchase_date",
  voucher_number: "voucher_number",
  supplier_name: "supplier_name",
  supplier_invoice_date: "supplier_invoice_date",
  taxable_value: "taxable_value",
  total_invoice_value: "total_invoice_value",
};

const INVOICE_TYPE_LABELS: Record<PurchaseRegisterInvoiceType, string> = {
  PURCHASE: "Purchase",
  DIRECT_PURCHASE: "Direct Purchase",
  STOCK_TRANSFER: "Stock Transfer",
};

const GSTR2B_STATUS_LABELS: Record<PurchaseRegisterGstr2bSimpleStatus, string> =
  {
    matched: "Matched",
    partially_matched: "Partially Matched",
    missing_in_2b: "Missing in 2B",
    mismatch: "Mismatch",
    not_applicable: "Not Applicable",
  };

const STATUS_FALLBACK: { value: PurchaseRegisterReportStatus; label: string }[] =
  [
    { value: "POSTED", label: "Posted" },
    { value: "CANCELLED", label: "Cancelled" },
    { value: "REVERSED", label: "Reversed" },
  ];

/** Supported money: real zero shows 0.00; null → em dash (Not Available). */
function formatSupportedMoney(
  amount: string | number | null | undefined,
): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  return formatMoneyString(amount);
}

function formatStatusForBadge(status: PurchaseRegisterReportStatus): string {
  return status.toLowerCase();
}

function gstr2bTone(
  status: PurchaseRegisterGstr2bSimpleStatus,
): "emerald" | "amber" | "rose" | "slate" {
  if (status === "matched") return "emerald";
  if (status === "partially_matched") return "amber";
  if (status === "not_applicable") return "slate";
  return "rose";
}

function StatusPill({
  label,
  tone,
  onClick,
}: {
  label: string;
  tone: "emerald" | "amber" | "rose" | "slate" | "orange";
  onClick?: (e: React.MouseEvent) => void;
}) {
  const tones: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-200",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    rose: "bg-rose-50 text-rose-800 border-rose-200",
    slate: "bg-slate-50 text-slate-600 border-slate-200",
    orange: "bg-orange-50 text-orange-800 border-orange-200",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap",
        tones[tone],
        onClick && "hover:opacity-80 cursor-pointer",
        !onClick && "cursor-default",
      )}
    >
      {label}
    </button>
  );
}

function buildPurchaseVoucherHref(row: PurchaseRegisterApiRow): string {
  if (row.source_kind === "debit_note") {
    return `/accounts/transactions/debit-notes/${row.source_id}`;
  }
  return `/accounts/purchase-invoices/${row.source_id}`;
}

/** Production GSTR-2B URL contract (fy / from / to / gstin). */
function buildGstr2bHref(
  row: PurchaseRegisterApiRow,
  financialYearId?: string,
): string {
  const params = new URLSearchParams();
  if (financialYearId) params.set("fy", financialYearId);
  if (row.purchase_date) {
    params.set("from", row.purchase_date);
    params.set("to", row.purchase_date);
  }
  if (row.recipient_gstin) params.set("gstin", row.recipient_gstin);
  const qs = params.toString();
  return qs
    ? `/accounts/reports/gst-summary/gstr2b?${qs}`
    : "/accounts/reports/gst-summary/gstr2b";
}

function PurchaseRegisterSkeleton() {
  return (
    <div className="flex-1 p-4 space-y-2">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-8 bg-muted animate-pulse rounded-md" />
      ))}
    </div>
  );
}

export default function PurchaseRegisterApiPageClient() {
  const mounted = useClientMounted();
  const refreshTick = useAccountsSectionRefresh("purchase-invoices", {
    apiListing: true,
  });
  const appliedDefaults = useRef(false);

  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } =
    useReportDateRange("this_year");

  const [filtersConfig, setFiltersConfig] =
    useState<PurchaseRegisterFiltersConfig | null>(null);
  const [filtersError, setFiltersError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<
    Array<{ id: string; vendorName: string; vendorCode?: string }>
  >([]);
  const [suppliersError, setSuppliersError] = useState<string | null>(null);

  const [financialYearId, setFinancialYearId] = useState("");
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [warehouseIds, setWarehouseIds] = useState<string[]>([]);
  const [supplierIds, setSupplierIds] = useState<string[]>([]);
  const [supplierGstin, setSupplierGstin] = useState("");
  const [debouncedSupplierGstin, setDebouncedSupplierGstin] = useState("");
  const [invoiceTypes, setInvoiceTypes] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [gstr2bStatuses, setGstr2bStatuses] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const [hsnSac, setHsnSac] = useState("");
  const [debouncedHsnSac, setDebouncedHsnSac] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] =
    useState<PurchaseRegisterSortBy>("purchase_date");
  const [sortOrder, setSortOrder] =
    useState<PurchaseRegisterSortOrder>("desc");

  const [report, setReport] = useState<PurchaseRegisterReportResult | null>(
    null,
  );
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] =
    useState<PurchaseRegisterApiError | null>(null);
  const [exporting, setExporting] = useState(false);
  const [ready, setReady] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const visibleCols = DEFAULT_VISIBLE_API_COLUMNS;
  const [sheetRow, setSheetRow] = useState<PurchaseRegisterApiRow | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;
    setReady(true);
  }, [mounted]);

  useEffect(() => {
    const t = window.setTimeout(
      () => setDebouncedSupplierGstin(supplierGstin.trim()),
      300,
    );
    return () => window.clearTimeout(t);
  }, [supplierGstin]);

  useEffect(() => {
    const t = window.setTimeout(
      () => setDebouncedProductSearch(productSearch.trim()),
      300,
    );
    return () => window.clearTimeout(t);
  }, [productSearch]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedHsnSac(hsnSac.trim()), 300);
    return () => window.clearTimeout(t);
  }, [hsnSac]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!mounted) return;
    const controller = new AbortController();
    void PurchaseRegisterApiService.getFilters(controller.signal)
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
            : "Failed to load Purchase Register filters.",
        );
      });
    return () => controller.abort();
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    void SupplierListService.dropdown()
      .then((items) => {
        if (cancelled) return;
        const mapped = items.map((s) => ({
          id: s.supplier_id,
          vendorName: s.supplierName,
          vendorCode: s.supplierCode,
        }));
        setSuppliers(mapped);
        setSuppliersError(null);
        const allowed = new Set(mapped.map((s) => s.id));
        setSupplierIds((prev) => prev.filter((id) => allowed.has(id)));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSuppliers([]);
        setSuppliersError(
          error instanceof Error ? error.message : "Failed to load suppliers.",
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
    // Preserve UI default: current financial year (this_year).
    setPageSize(filtersConfig.defaults.page_size || 25);
    setSortBy(filtersConfig.defaults.sort_by || "purchase_date");
    setSortOrder(filtersConfig.defaults.sort_order || "desc");
    appliedDefaults.current = true;
  }, [filtersConfig, ready]);

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

  const invoiceTypeOptions = filtersConfig?.invoice_types ?? [
    { value: "PURCHASE" as const, label: "Purchase" },
    { value: "DIRECT_PURCHASE" as const, label: "Direct Purchase" },
    { value: "STOCK_TRANSFER" as const, label: "Stock Transfer" },
  ];

  const statusOptions = filtersConfig?.statuses ?? STATUS_FALLBACK;

  const gstr2bOptions = filtersConfig?.gstr2b_statuses ?? [
    { value: "matched" as const, label: "Matched" },
    { value: "partially_matched" as const, label: "Partially Matched" },
    { value: "missing_in_2b" as const, label: "Missing in 2B" },
    { value: "mismatch" as const, label: "Mismatch" },
    { value: "not_applicable" as const, label: "Not Applicable" },
  ];

  const queryParams = useMemo<PurchaseRegisterQueryParams | null>(() => {
    if (!financialYearId || financialYearId === "all" || !dateFrom || !dateTo) {
      return null;
    }
    const statusParams = statuses.filter(
      (s): s is PurchaseRegisterReportStatus =>
        s === "POSTED" || s === "CANCELLED" || s === "REVERSED",
    );
    const typeParams = invoiceTypes.filter(
      (t): t is PurchaseRegisterInvoiceType =>
        t === "PURCHASE" ||
        t === "DIRECT_PURCHASE" ||
        t === "STOCK_TRANSFER",
    );
    const gstrParams = gstr2bStatuses.filter(
      (s): s is PurchaseRegisterGstr2bSimpleStatus =>
        s === "matched" ||
        s === "partially_matched" ||
        s === "missing_in_2b" ||
        s === "mismatch" ||
        s === "not_applicable",
    );
    const allowedSupplierIds = new Set(suppliers.map((s) => s.id));
    const safeSupplierIds = supplierIds.filter((id) =>
      allowedSupplierIds.has(id),
    );

    return {
      financial_year_id: financialYearId,
      from_date: dateFrom,
      to_date: dateTo,
      branch_ids: branchIds,
      warehouse_ids: warehouseIds,
      supplier_ids: safeSupplierIds,
      supplier_gstin: debouncedSupplierGstin || undefined,
      invoice_types: typeParams.length > 0 ? typeParams : undefined,
      statuses: statusParams.length > 0 ? statusParams : undefined,
      gstr2b_statuses: gstrParams.length > 0 ? gstrParams : undefined,
      product_search: debouncedProductSearch || undefined,
      hsn_sac: debouncedHsnSac || undefined,
      search: debouncedSearch || undefined,
      page,
      page_size: pageSize,
      sort_by: sortBy,
      sort_order: sortOrder,
    };
  }, [
    branchIds,
    dateFrom,
    dateTo,
    debouncedHsnSac,
    debouncedProductSearch,
    debouncedSearch,
    debouncedSupplierGstin,
    financialYearId,
    gstr2bStatuses,
    invoiceTypes,
    page,
    pageSize,
    sortBy,
    sortOrder,
    statuses,
    supplierIds,
    suppliers,
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
    supplierIds,
    debouncedSupplierGstin,
    invoiceTypes,
    statuses,
    gstr2bStatuses,
    debouncedProductSearch,
    debouncedHsnSac,
    debouncedSearch,
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
    void PurchaseRegisterApiService.getReport(queryParams, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setReport(result);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setReport(null);
        setReportError(
          error instanceof PurchaseRegisterApiError
            ? error
            : new PurchaseRegisterApiError(
                error instanceof Error
                  ? error.message
                  : "Failed to load Purchase Register.",
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
    setSupplierIds([]);
    setSupplierGstin("");
    setDebouncedSupplierGstin("");
    setInvoiceTypes([]);
    setStatuses([]);
    setGstr2bStatuses([]);
    setProductSearch("");
    setDebouncedProductSearch("");
    setHsnSac("");
    setDebouncedHsnSac("");
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
    setSortBy("purchase_date");
    setSortOrder("desc");
    setSelectedRowId(null);
    if (filtersConfig?.defaults.financial_year_id) {
      setFinancialYearId(filtersConfig.defaults.financial_year_id);
    }
    const range = resolveDateRangePreset("this_year");
    setDateFrom(range.from);
    setDateTo(range.to);
    setPreset("this_year");
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
        await PurchaseRegisterApiService.exportReport({
          ...queryParams,
          format,
        });
      } catch (error) {
        showToast(
          error instanceof Error
            ? error.message
            : "Failed to export Purchase Register.",
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
  const selectedRow = selectedRowId
    ? rows.find((r) => r.id === selectedRowId) ?? null
    : null;

  const hasActiveFilters =
    branchIds.length > 0 ||
    warehouseIds.length > 0 ||
    supplierIds.length > 0 ||
    Boolean(supplierGstin.trim()) ||
    invoiceTypes.length > 0 ||
    statuses.length > 0 ||
    gstr2bStatuses.length > 0 ||
    Boolean(productSearch.trim()) ||
    Boolean(hsnSac.trim()) ||
    Boolean(search.trim());

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
        "supplier",
        "Supplier",
        supplierIds,
        suppliers.map((s) => ({
          value: s.id,
          label: s.vendorName,
          searchText: s.vendorCode,
        })),
        () => setSupplierIds([]),
      ),
      debouncedSupplierGstin
        ? {
            id: "supplier_gstin",
            label: "Supplier GSTIN",
            value: debouncedSupplierGstin,
            onRemove: () => {
              setSupplierGstin("");
              setDebouncedSupplierGstin("");
            },
          }
        : null,
      invoiceTypes.length > 0
        ? {
            id: "invoice_types",
            label: "Invoice Type",
            value: invoiceTypes
              .map(
                (t) =>
                  INVOICE_TYPE_LABELS[t as PurchaseRegisterInvoiceType] ?? t,
              )
              .join(", "),
            onRemove: () => setInvoiceTypes([]),
          }
        : null,
      statuses.length > 0
        ? {
            id: "statuses",
            label: "Status",
            value: statuses
              .map(
                (s) =>
                  statusOptions.find((o) => o.value === s)?.label ?? s,
              )
              .join(", "),
            onRemove: () => setStatuses([]),
          }
        : null,
      gstr2bStatuses.length > 0
        ? {
            id: "gstr2b",
            label: "GSTR-2B",
            value: gstr2bStatuses
              .map(
                (s) =>
                  GSTR2B_STATUS_LABELS[
                    s as PurchaseRegisterGstr2bSimpleStatus
                  ] ?? s,
              )
              .join(", "),
            onRemove: () => setGstr2bStatuses([]),
          }
        : null,
      debouncedProductSearch
        ? {
            id: "product",
            label: "Product",
            value: debouncedProductSearch,
            onRemove: () => {
              setProductSearch("");
              setDebouncedProductSearch("");
            },
          }
        : null,
      debouncedHsnSac
        ? {
            id: "hsn",
            label: "HSN/SAC",
            value: debouncedHsnSac,
            onRemove: () => {
              setHsnSac("");
              setDebouncedHsnSac("");
            },
          }
        : null,
      debouncedSearch
        ? {
            id: "search",
            label: "Search",
            value: debouncedSearch,
            onRemove: () => {
              setSearch("");
              setDebouncedSearch("");
            },
          }
        : null,
    ];
    return items.filter(Boolean) as ReportFilterSummaryItem[];
  }, [
    branchIds,
    branchOptions,
    debouncedHsnSac,
    debouncedProductSearch,
    debouncedSearch,
    debouncedSupplierGstin,
    gstr2bStatuses,
    invoiceTypes,
    statusOptions,
    statuses,
    supplierIds,
    suppliers,
    warehouseIds,
    warehouseOptions,
  ]);

  const supportNotes = useMemo(() => {
    const notes: string[] = [];
    if (!report) return notes;
    const { support, health, notes: n } = report;
    if (support.rcm === "NOT_AVAILABLE") notes.push("RCM reporting not available");
    if (support.books_itc === "NOT_AVAILABLE")
      notes.push("Books ITC not available");
    if (support.cess === "NOT_AVAILABLE") notes.push("Cess not available");
    if (support.tds === "NOT_AVAILABLE") notes.push("TDS not available");
    if (support.document_type === "NOT_AVAILABLE")
      notes.push("Statutory document type not available");
    if (support.debit_note_gstr2b === "NOT_AVAILABLE")
      notes.push("Debit Note GSTR-2B reconciliation deferred");
    if (support.branch === "DERIVED_AS_WAREHOUSE")
      notes.push("Branch derived from warehouse");
    for (const w of health.warnings ?? []) {
      if (w && !notes.includes(w)) notes.push(w);
    }
    if (n.unsupported) notes.push(n.unsupported);
    return notes.slice(0, 6);
  }, [report]);

  const activeSortCol =
    Object.entries(SORT_FIELD_MAP).find(([, v]) => v === sortBy)?.[0] ??
    "purchase_date";

  const defs = getVisibleApiColumnDefs(visibleCols);

  const renderCell = (
    row: PurchaseRegisterApiRow,
    key: PurchaseRegisterApiColKey,
  ) => {
    switch (key) {
      case "purchase_date":
        return formatDisplayDate(row.purchase_date);
      case "posting_date":
        return (
          <span className="inline-flex items-center gap-1">
            {formatDisplayDate(row.posting_date)}
            {row.posting_date_is_fallback ? (
              <span className="text-[9px] text-muted-foreground" title="Fallback">
                *
              </span>
            ) : null}
          </span>
        );
      case "supplier_invoice_date":
        return row.supplier_invoice_date
          ? formatDisplayDate(row.supplier_invoice_date)
          : "—";
      case "voucher_number":
        return (
          <Link
            href={buildPurchaseVoucherHref(row)}
            className="font-mono text-xs font-semibold text-brand-700 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.voucher_number}
            {row.is_duplicate_supplier_invoice ? (
              <span className="ml-1 text-[10px] text-amber-700 font-medium">
                (Dup)
              </span>
            ) : null}
          </Link>
        );
      case "supplier_invoice_number":
        return row.supplier_invoice_number || "—";
      case "supplier_name":
        return row.supplier.name || "—";
      case "supplier_gstin":
        return row.supplier.gstin || "—";
      case "invoice_type":
        if (!row.invoice_type) {
          return row.source_kind === "debit_note" ? "Debit Note" : "—";
        }
        return INVOICE_TYPE_LABELS[row.invoice_type] ?? row.invoice_type;
      case "purchase_type":
        if (!row.purchase_type) return "—";
        return row.purchase_type === "local" ? "Local" : "Interstate";
      case "branch":
        return row.branch.name || "—";
      case "warehouse":
        return row.warehouse.name || "—";
      case "po_number":
        return row.po.number || "—";
      case "grn_number":
        return row.grn.number || "—";
      case "hsn_sac":
        return row.hsn_sac || "—";
      case "taxable_value":
      case "cgst":
      case "sgst":
      case "igst":
      case "gst_total":
      case "total_invoice_value":
        return (
          <span className={MONEY_AMOUNT_CLASS}>
            {formatSupportedMoney(row[key])}
          </span>
        );
      case "cess":
      case "other_charges":
      case "tcs_amount":
        return (
          <span className={MONEY_AMOUNT_CLASS}>
            {formatSupportedMoney(row[key])}
          </span>
        );
      case "round_off": {
        const n = Number(row.round_off);
        return (
          <span className={MONEY_AMOUNT_CLASS}>
            {Number.isFinite(n) ? formatSignedRoundOff(n) : "—"}
          </span>
        );
      }
      case "gstr2b_simple_status":
        return (
          <StatusPill
            label={GSTR2B_STATUS_LABELS[row.gstr2b_simple_status]}
            tone={gstr2bTone(row.gstr2b_simple_status)}
            onClick={(e) => {
              e.stopPropagation();
              setSheetRow(row);
            }}
          />
        );
      case "voucher_status":
        return (
          <StatusBadge status={formatStatusForBadge(row.voucher_status)} />
        );
      default:
        return "—";
    }
  };

  if (!mounted || !ready) {
    return (
      <AccountsPageShell
        title={TITLE}
        description={DESCRIPTION}
        breadcrumbs={accountsBreadcrumb("Reports", TITLE)}
      >
        <PurchaseRegisterSkeleton />
      </AccountsPageShell>
    );
  }

  return (
    <AccountsPageShell
      title={TITLE}
      description={DESCRIPTION}
      breadcrumbs={accountsBreadcrumb("Reports", TITLE)}
      className="purchase-register-report"
      actions={
        <AccountsExportMenu
          disabled={!queryParams || exporting || reportLoading}
          disabledTitle={
            !queryParams
              ? "Select Financial Year and date range to export"
              : exporting
                ? "Export in progress…"
                : undefined
          }
          onExcel={() => void handleExport("EXCEL")}
          onPdf={() => void handleExport("PDF")}
        />
      }
    >
      <ReportFilterRow>
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
        <ReportVendorMultiFilter
          values={supplierIds}
          onChange={setSupplierIds}
          vendors={suppliers}
        />
        <ReportFilterField label="Supplier GSTIN">
          <Input
            value={supplierGstin}
            onChange={(e) => setSupplierGstin(e.target.value)}
            placeholder="GSTIN…"
            className={cn(filterControlClass, "min-w-[140px]")}
          />
        </ReportFilterField>
        <ReportStatusMultiFilter
          label="Invoice Type"
          values={invoiceTypes}
          onChange={setInvoiceTypes}
          options={invoiceTypeOptions.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
        />
        <ReportStatusMultiFilter
          label="Voucher Status"
          values={statuses}
          onChange={setStatuses}
          options={statusOptions.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
        />
        <ReportStatusMultiFilter
          label="GSTR-2B Status"
          values={gstr2bStatuses}
          onChange={setGstr2bStatuses}
          options={gstr2bOptions.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
        />
        <ReportFilterField label="Product">
          <Input
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Product name…"
            className={cn(filterControlClass, "min-w-[140px]")}
          />
        </ReportFilterField>
        <ReportFilterField label="HSN / SAC">
          <Input
            value={hsnSac}
            onChange={(e) => setHsnSac(e.target.value)}
            placeholder="HSN/SAC…"
            className={cn(filterControlClass, "min-w-[120px]")}
          />
        </ReportFilterField>
        <ReportSearchFilter
          value={search}
          onChange={setSearch}
          placeholder="Search voucher / invoice…"
        />
        <ReportFilterResetButton onClick={clearFilters} />
      </ReportFilterRow>

      {filterSummaryItems.length > 0 ? (
        <ReportFilterSummary items={filterSummaryItems} />
      ) : null}

      {filtersError || suppliersError ? (
        <div className="mx-4 mb-2 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            {filtersError ? <p>{filtersError}</p> : null}
            {suppliersError ? <p>{suppliersError}</p> : null}
          </div>
        </div>
      ) : null}

      {supportNotes.length > 0 ? (
        <div className="mx-4 mb-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground/80">Report notes: </span>
          {supportNotes.join(" · ")}
        </div>
      ) : null}

      {reportError ? (
        <div className="mx-4 mb-3 flex gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-900">
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
                label: "Documents",
                value: String(summary?.document_count ?? 0),
              },
              {
                label: "Taxable Value",
                value: formatSupportedMoney(summary?.taxable_value ?? "0"),
              },
              {
                label: "CGST",
                value: formatSupportedMoney(summary?.cgst ?? "0"),
              },
              {
                label: "SGST",
                value: formatSupportedMoney(summary?.sgst ?? "0"),
              },
              {
                label: "IGST",
                value: formatSupportedMoney(summary?.igst ?? "0"),
              },
              {
                label: "Invoice Value",
                value: formatSupportedMoney(
                  summary?.total_invoice_value ?? "0",
                ),
              },
            ]}
          />
        }
        footer={
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground px-1">
            <span>Row links open the source voucher.</span>
            {selectedRow ? (
              <>
                <Link
                  href={buildGstr2bHref(selectedRow, financialYearId)}
                  className="text-brand-600 hover:underline"
                >
                  Open GSTR-2B
                </Link>
                {selectedRow.po.id ? (
                  <Link
                    href={`/procurement/purchase-orders/${selectedRow.po.id}`}
                    className="text-brand-600 hover:underline"
                  >
                    Open PO
                  </Link>
                ) : null}
              </>
            ) : (
              <span className="text-muted-foreground/80">
                Select a row to enable GSTR-2B / PO footer links.
              </span>
            )}
          </div>
        }
      >
        {!queryParams ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            Select a Financial Year and date range to load the Purchase Register.
          </div>
        ) : reportLoading && !report ? (
          <PurchaseRegisterSkeleton />
        ) : totalRows === 0 && !reportLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground space-y-2">
            <p>No purchase documents found for the selected filters.</p>
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
            <AccountsTable minWidth={estimateApiTableMinWidth(visibleCols)}>
              <AccountsTableHead>
                <AccountsTableHeadRow>
                  {defs.map((col) => {
                    const sortKey = col.sortKey;
                    if (sortKey && SORT_FIELD_MAP[sortKey]) {
                      return (
                        <ServerSortTh
                          key={col.key}
                          label={col.label}
                          colKey={sortKey}
                          activeKey={activeSortCol}
                          sortDir={sortOrder}
                          onSort={handleSort}
                          align={col.align === "right" ? "right" : "left"}
                        />
                      );
                    }
                    return (
                      <th
                        key={col.key}
                        className={cn(
                          "px-3 py-2.5 text-xs font-semibold whitespace-nowrap",
                          col.align === "right" ? "text-right" : "text-left",
                        )}
                      >
                        {col.label}
                      </th>
                    );
                  })}
                </AccountsTableHeadRow>
              </AccountsTableHead>
              <AccountsTableBody>
                {rows.map((row) => (
                  <AccountsTableRow
                    key={row.id}
                    className={cn(
                      "group cursor-pointer",
                      selectedRowId === row.id && "bg-brand-50/40",
                    )}
                    onClick={() => setSelectedRowId(row.id)}
                  >
                    {defs.map((col) => {
                      return (
                        <AccountsTableCell
                          key={col.key}
                          align={col.align === "right" ? "right" : "left"}
                          money={Boolean(col.money)}
                          mono={
                            col.key === "supplier_gstin" ||
                            col.key === "supplier_invoice_number" ||
                            col.key === "hsn_sac"
                          }
                          className="text-xs whitespace-nowrap"
                          onClick={
                            col.key === "gstr2b_simple_status"
                              ? (e) => e.stopPropagation()
                              : undefined
                          }
                        >
                          {renderCell(row, col.key)}
                        </AccountsTableCell>
                      );
                    })}
                  </AccountsTableRow>
                ))}
              </AccountsTableBody>
              {summary ? (
                <AccountsTableFoot>
                  <AccountsTableRow>
                    {defs.map((col, i) => {
                      if (i === 0) {
                        return (
                          <AccountsTableCell
                            key={col.key}
                            className="font-semibold text-xs text-foreground"
                            colSpan={1}
                          >
                            Totals ({summary.document_count} doc
                            {summary.document_count === 1 ? "" : "s"})
                          </AccountsTableCell>
                        );
                      }
                      const moneyKeys: PurchaseRegisterApiColKey[] = [
                        "taxable_value",
                        "cgst",
                        "sgst",
                        "igst",
                        "gst_total",
                        "total_invoice_value",
                        "round_off",
                        "other_charges",
                        "tcs_amount",
                        "cess",
                      ];
                      if (!moneyKeys.includes(col.key)) {
                        return <AccountsTableCell key={col.key} />;
                      }
                      let display = "—";
                      if (col.key === "taxable_value")
                        display = formatSupportedMoney(summary.taxable_value);
                      else if (col.key === "cgst")
                        display = formatSupportedMoney(summary.cgst);
                      else if (col.key === "sgst")
                        display = formatSupportedMoney(summary.sgst);
                      else if (col.key === "igst")
                        display = formatSupportedMoney(summary.igst);
                      else if (col.key === "gst_total")
                        display = formatSupportedMoney(summary.gst_total);
                      else if (col.key === "total_invoice_value")
                        display = formatSupportedMoney(
                          summary.total_invoice_value,
                        );
                      else if (col.key === "round_off") {
                        const n = Number(summary.round_off);
                        display = Number.isFinite(n)
                          ? formatSignedRoundOff(n)
                          : "—";
                      } else if (col.key === "other_charges")
                        display = formatSupportedMoney(summary.other_charges);
                      else if (col.key === "tcs_amount")
                        display = formatSupportedMoney(summary.tcs_amount);
                      else if (col.key === "cess")
                        display = formatSupportedMoney(summary.cess);

                      return (
                        <AccountsTableCell
                          key={col.key}
                          align="right"
                          money
                          className={cn("font-semibold", MONEY_AMOUNT_CLASS)}
                        >
                          {display}
                        </AccountsTableCell>
                      );
                    })}
                  </AccountsTableRow>
                </AccountsTableFoot>
              ) : null}
            </AccountsTable>

            <AccountsTablePagination
              page={page}
              pageSize={pageSize}
              totalRecords={totalRows}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              recordLabel="documents"
            />
          </>
        )}
      </AccountsTableListing>

      <PurchaseRegister2bSheet
        open={!!sheetRow}
        onClose={() => setSheetRow(null)}
        row={sheetRow}
        financialYearId={financialYearId}
      />
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
  className,
}: {
  label: string;
  colKey: string;
  activeKey: string;
  sortDir: PurchaseRegisterSortOrder;
  onSort: (key: string) => void;
  align?: "left" | "right";
  className?: string;
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
      className={className}
    />
  );
}
