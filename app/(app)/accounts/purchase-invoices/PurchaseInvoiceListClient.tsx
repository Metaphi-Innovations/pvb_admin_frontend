"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, Truck } from "lucide-react";
import {
  AccountsTableActionCell,
  AccountsViewAction,
  accountsActionColClass,
  ACCOUNTS_ACTION_BTN_CLASS,
} from "@/components/accounts/AccountsTableActions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import {
  AccountsTableEmpty,
  AccountsTableListing,
  AccountsListingFilterCard,
} from "@/components/accounts/AccountsTableListing";
import { Pagination } from "@/components/listing/Pagination";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import {
  ReportSearchFilter,
  ReportDateRangeFilter,
  ReportFilterRow,
  ReportFilterResetButton,
  useReportDateRange,
  ACCOUNTS_FILTER_LABEL_CLASS,
  ACCOUNTS_FILTER_SELECT_CLASS,
} from "@/components/accounts/ReportFilters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { accountsListingFiltersActive } from "@/lib/accounts/use-accounts-listing-reset";
import { INVOICE_LISTING_DATE_PRESETS, resolveDateRangePreset } from "@/lib/accounts/report-date-presets";
import {
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  useAccountsColumnFilterContext,
} from "@/app/(app)/accounts/components/AccountsUI";
import { useDebouncedValue } from "@/app/(app)/accounts/reports/pl/pl-hooks";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { DEBIT_NOTES_LIST_PATH } from "@/app/(app)/accounts/debit-notes/note-utils";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { useLazyFilterColumns } from "@/lib/masters/use-lazy-filter-columns";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { PURCHASE_SOURCE_TYPE_LABELS, type PurchaseSourceType } from "./purchase-invoice-types";
import {
  PurchaseInvoiceService,
  mapPurchaseInvoiceListDto,
  sourceTypeToInvoiceType,
  type EligibleGrnDto,
  type PurchaseInvoiceListRow,
} from "@/services/purchase-invoice.service";
import "./purchase-invoice-listing.css";

type FilterValueOptions = Record<string, { value: string; count: number }[]>;
type FilterFlagMap = Record<string, boolean>;

function mapDropdownOptions(
  rows: Array<Record<string, string>> | undefined,
  fieldName: string,
): { value: string; count: number }[] {
  return (rows || [])
    .map((item) => String(item[fieldName] ?? Object.values(item)[0] ?? ""))
    .filter(Boolean)
    .map((value) => ({ value, count: 0 }));
}

type Tab = "invoices" | "grn_pending";
type SourceTypeFilter = "all" | PurchaseSourceType;

const LISTING_DEFAULT_PRESET = "this_month" as const;

function listingFilterDefaults() {
  const { from, to } = resolveDateRangePreset(LISTING_DEFAULT_PRESET);
  return {
    search: "",
    preset: LISTING_DEFAULT_PRESET,
    dateFrom: from,
    dateTo: to,
    sourceType: "all" as SourceTypeFilter,
  };
}

function ListingFilterReset({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div className="space-y-0.5 shrink-0 self-end">
      <span className={cn(ACCOUNTS_FILTER_LABEL_CLASS, "invisible select-none")} aria-hidden>
        Reset
      </span>
      <ReportFilterResetButton
        showOnlyWhenActive
        active={active}
        onClick={onClick}
        className="h-8 min-h-8 max-h-8 px-3 text-[13px] rounded-md"
      />
    </div>
  );
}

const LISTING_SELECT_TRIGGER_CLASS = cn(
  "accounts-filter-control accounts-filter-select mt-0 h-8 min-h-8 max-h-8",
  ACCOUNTS_FILTER_SELECT_CLASS,
);

function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
}

function SourceTypeBadge({ type }: { type: PurchaseSourceType }) {
  const isGrn = type === "from_grn";
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs h-5",
        isGrn ? "text-orange-700 border-orange-200 bg-orange-50" : "text-brand-700 border-brand-200 bg-brand-50",
      )}
    >
      {PURCHASE_SOURCE_TYPE_LABELS[type]}
    </Badge>
  );
}

function PostingStatusBadge({ status }: { status: PurchaseInvoiceListRow["status"] }) {
  if (status === "PENDING") {
    return (
      <Badge variant="outline" className="text-xs h-5 bg-amber-50 text-amber-700 border-amber-200">
        Pending
      </Badge>
    );
  }
  const cfg =
    status === "POSTED"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={cn("text-xs h-5", cfg)}>
      {status === "POSTED" ? "Posted" : status === "CANCELLED" ? "Cancelled" : "Reversed"}
    </Badge>
  );
}

function ListingSelectFilter<T extends string>({
  label,
  value,
  onChange,
  options,
  widthClass = "w-[148px]",
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  widthClass?: string;
}) {
  return (
    <div className={cn("space-y-0.5 shrink-0", widthClass)}>
      <span className={ACCOUNTS_FILTER_LABEL_CLASS}>{label}</span>
      <Select value={value} onValueChange={(v) => onChange(v as T)}>
        <SelectTrigger className={cn(LISTING_SELECT_TRIGGER_CLASS, widthClass)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function GrnSortSync({
  sortKey,
  sortDir,
  columnFilters,
  onSortChange,
  onFilterChange,
}: {
  sortKey: string;
  sortDir: "asc" | "desc";
  columnFilters: Record<string, unknown>;
  onSortChange: (sortKey: string, sortDir: "asc" | "desc") => void;
  onFilterChange: (filters: Record<string, unknown>) => void;
}) {
  const ctx = useAccountsColumnFilterContext();

  useEffect(() => {
    if (!ctx?.sortKey) return;
    if (ctx.sortKey !== sortKey || ctx.sortDir !== sortDir) {
      onSortChange(ctx.sortKey, ctx.sortDir ?? "asc");
    }
  }, [ctx?.sortKey, ctx?.sortDir, sortKey, sortDir, onSortChange]);

  useEffect(() => {
    if (!ctx) return;
    const ctxFiltersStr = JSON.stringify(ctx.columnFilters || {});
    const propFiltersStr = JSON.stringify(columnFilters || {});
    if (ctxFiltersStr !== propFiltersStr) {
      onFilterChange(ctx.columnFilters || {});
    }
  }, [ctx?.columnFilters, columnFilters, onFilterChange]);

  return null;
}

function PurchaseInvoicesTabTable({
  toolbarRows,
  loading,
  filterOptions,
  filterLoading,
  filterReady,
  onOpenFilter,
}: {
  toolbarRows: PurchaseInvoiceListRow[];
  loading: boolean;
  filterOptions: FilterValueOptions;
  filterLoading: FilterFlagMap;
  filterReady: FilterFlagMap;
  onOpenFilter: (key: string) => void;
}) {
  const router = useRouter();
  const opts = (key: string) => filterOptions[key] || [];
  const filterProps = (key: string) => ({
    valueOptions: opts(key),
    onFilterOpen: () => onOpenFilter(key),
    optionsLoading: Boolean(filterLoading[key]),
    optionsReady: Boolean(filterReady[key]),
  });

  return (
    <>
      <AccountsTable minWidth={1480}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="Source Type" colKey="sourceType" {...filterProps("sourceType")} />
            <SortTh label="Supplier" colKey="vendorName" className="accounts-col-party" {...filterProps("vendorName")} />
            <SortTh label="Supplier Inv. No" colKey="vendorInvoiceNo" {...filterProps("vendorInvoiceNo")} />
            <SortTh label="Invoice Date" colKey="invoiceDate" filterType="date" {...filterProps("invoiceDate")} />
            <SortTh label="Taxable Amount" colKey="taxableAmount" filterType="amount" align="right" {...filterProps("taxableAmount")} />
            <SortTh label="GST Amount" colKey="gstAmount" filterType="amount" align="right" {...filterProps("gstAmount")} />
            <SortTh label="Net Payable" colKey="netPayable" filterType="amount" align="right" {...filterProps("netPayable")} />
            <SortTh label="Posting" colKey="status" {...filterProps("status")} />
            <AccountsColumnHeader
              label="Actions"
              colKey="_actions"
              sortable={false}
              filterable={false}
              align="right"
              className={accountsActionColClass("multi")}
            />
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {loading && toolbarRows.length === 0 ? (
            <AccountsTableEmpty colSpan={9} message="Loading purchase invoices…" />
          ) : toolbarRows.length === 0 ? (
            <AccountsTableEmpty colSpan={9} message="No purchase invoices found." />
          ) : (
            toolbarRows.map((inv) => (
              <AccountsTableRow key={inv.id}>
                <AccountsTableCell>
                  <SourceTypeBadge type={inv.sourceType} />
                </AccountsTableCell>
                <AccountsTableCell className="font-medium">{inv.vendorName}</AccountsTableCell>
                <AccountsTableCell className="text-muted-foreground">{inv.vendorInvoiceNo || "—"}</AccountsTableCell>
                <AccountsTableCell>{inv.invoiceDate || "—"}</AccountsTableCell>
                <AccountsTableCell align="right" money>
                  {formatMoney(inv.taxableAmount)}
                </AccountsTableCell>
                <AccountsTableCell align="right" className="tabular-nums">
                  {formatMoney(inv.gstAmount)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money>
                  {formatMoney(inv.netPayable)}
                </AccountsTableCell>
                <AccountsTableCell>
                  <PostingStatusBadge status={inv.status} />
                </AccountsTableCell>
                <AccountsTableCell align="right" className={accountsActionColClass("multi")}>
                  <AccountsTableActionCell>
                    {inv.isPendingGrn && inv.grnId ? (
                      <Button
                        size="sm"
                        className="h-8 text-xs font-medium bg-brand-600 text-white gap-1"
                        onClick={() =>
                          router.push(`/accounts/purchase-invoices/new?mode=grn&grnId=${inv.grnId}`)
                        }
                      >
                        <Truck className="w-3 h-3" />
                        Create Invoice
                      </Button>
                    ) : (
                      <>
                        <AccountsViewAction href={`/accounts/purchase-invoices/${inv.id}`} />
                        {inv.status === "POSTED" && (
                          <Link
                            href={`${DEBIT_NOTES_LIST_PATH}/new?purchaseInvoiceId=${inv.id}`}
                            title="Debit Note"
                            className={ACCOUNTS_ACTION_BTN_CLASS}
                          >
                            <FileText className="w-4 h-4 text-muted-foreground" />
                          </Link>
                        )}
                      </>
                    )}
                  </AccountsTableActionCell>
                </AccountsTableCell>
              </AccountsTableRow>
            ))
          )}
        </AccountsTableBody>
      </AccountsTable>
    </>
  );
}

function GrnPendingTabTable({
  toolbarRows,
  router,
  loading,
  filterOptions,
  filterLoading,
  filterReady,
  onOpenFilter,
}: {
  toolbarRows: EligibleGrnDto[];
  router: ReturnType<typeof useRouter>;
  loading: boolean;
  filterOptions: FilterValueOptions;
  filterLoading: FilterFlagMap;
  filterReady: FilterFlagMap;
  onOpenFilter: (key: string) => void;
}) {
  const opts = (key: string) => filterOptions[key] || [];
  const filterProps = (key: string) => ({
    valueOptions: opts(key),
    onFilterOpen: () => onOpenFilter(key),
    optionsLoading: Boolean(filterLoading[key]),
    optionsReady: Boolean(filterReady[key]),
  });
  return (
    <>
      <AccountsTable minWidth={1480}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="Source Type" colKey="sourceType" {...filterProps("sourceType")} />
            <SortTh label="Supplier" colKey="supplier_name" className="accounts-col-party" {...filterProps("supplier_name")} />
            <SortTh label="Supplier Inv. No" colKey="supplier_invoice_no" {...filterProps("supplier_invoice_no")} />
            <SortTh label="Invoice Date" colKey="invoiceDate" filterType="date" {...filterProps("invoiceDate")} />
            <SortTh label="Taxable Amount" colKey="taxableAmount" filterType="amount" align="right" {...filterProps("taxableAmount")} />
            <SortTh label="GST Amount" colKey="gstAmount" filterType="amount" align="right" {...filterProps("gstAmount")} />
            <SortTh label="Net Payable" colKey="netPayable" filterType="amount" align="right" {...filterProps("netPayable")} />
            <SortTh label="Posting" colKey="status" {...filterProps("status")} />
            <AccountsColumnHeader label="Action" colKey="_actions" sortable={false} filterable={false} />
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {loading && toolbarRows.length === 0 ? (
            <AccountsTableEmpty colSpan={9} message="Loading eligible GRNs…" />
          ) : toolbarRows.length === 0 ? (
            <AccountsTableEmpty
              colSpan={9}
              message="No QC-completed GRNs with a supplier invoice in Purchase Order Invoices are pending a purchase invoice."
            />
          ) : (
            toolbarRows.map((grn) => (
              <AccountsTableRow key={grn.grn_id}>
                <AccountsTableCell>
                  <SourceTypeBadge type="from_grn" />
                </AccountsTableCell>
                <AccountsTableCell className="font-medium">{grn.supplier_name || "—"}</AccountsTableCell>
                <AccountsTableCell className="text-muted-foreground">{grn.supplier_invoice_no || "—"}</AccountsTableCell>
                <AccountsTableCell>
                  {formatDateOnly(grn.supplier_invoice_date) !== "—"
                    ? formatDateOnly(grn.supplier_invoice_date)
                    : formatDateOnly(grn.grn_date)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money>
                  {formatMoney(Number(grn.invoice_amount || 0))}
                </AccountsTableCell>
                <AccountsTableCell align="right" className="tabular-nums">
                  {formatMoney(Number(grn.gst_amount || 0))}
                </AccountsTableCell>
                <AccountsTableCell align="right" money>
                  {formatMoney(Number(grn.total_invoice_amount || 0))}
                </AccountsTableCell>
                <AccountsTableCell>
                  <PostingStatusBadge status="PENDING" />
                </AccountsTableCell>
                <AccountsTableCell>
                  <Button
                    size="sm"
                    className="h-9 text-sm font-medium bg-brand-600 text-white gap-1"
                    onClick={() =>
                      router.push(`/accounts/purchase-invoices/new?mode=grn&grnId=${grn.grn_id}`)
                    }
                  >
                    <Truck className="w-3 h-3" />
                    Create Invoice
                  </Button>
                </AccountsTableCell>
              </AccountsTableRow>
            ))
          )}
        </AccountsTableBody>
      </AccountsTable>
    </>
  );
}

function PurchaseInvoicesTabBody({
  invoices,
  totalRecords,
  search,
  setSearch,
  sourceTypeFilter,
  setSourceTypeFilter,
  preset,
  setPreset,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  loading,
  filterOptions,
  filterLoading,
  filterReady,
  onOpenFilter,
}: {
  invoices: PurchaseInvoiceListRow[];
  totalRecords: number;
  search: string;
  setSearch: (v: string) => void;
  sourceTypeFilter: SourceTypeFilter;
  setSourceTypeFilter: (v: SourceTypeFilter) => void;
  preset: ReturnType<typeof useReportDateRange>["preset"];
  setPreset: ReturnType<typeof useReportDateRange>["setPreset"];
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  loading: boolean;
  filterOptions: FilterValueOptions;
  filterLoading: FilterFlagMap;
  filterReady: FilterFlagMap;
  onOpenFilter: (key: string) => void;
}) {
  const exportCsv = () => {
    const headers = [
      "Source Type",
      "Supplier",
      "Supplier Invoice No",
      "Invoice Date",
      "Taxable Amount",
      "GST Amount",
      "Net Payable",
      "Posting",
    ];
    const lines = invoices.map((inv) =>
      [
        PURCHASE_SOURCE_TYPE_LABELS[inv.sourceType],
        inv.vendorName,
        inv.vendorInvoiceNo,
        inv.invoiceDate,
        inv.taxableAmount,
        inv.gstAmount,
        inv.netPayable,
        inv.status,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[headers.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "purchase-invoices.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AccountsTableListing
      className="h-full min-h-0"
      toolbar={
        <AccountsListingFilterCard>
          <ReportFilterRow
            end={
              <AccountsExportMenu
                onExcel={exportCsv}
                onPdf={exportCsv}
                disabled={invoices.length === 0}
              />
            }
          >
            <ReportSearchFilter
              value={search}
              onChange={setSearch}
              placeholder="Search invoice no., supplier, supplier invoice no…"
              className="min-w-[220px] flex-1 max-w-md"
            />
            <ListingSelectFilter
              label="Source Type"
              value={sourceTypeFilter}
              onChange={setSourceTypeFilter}
              widthClass="w-[148px]"
              options={[
                { value: "all", label: "All Source Types" },
                { value: "from_grn", label: "From GRN" },
                { value: "direct_purchase", label: "Direct Purchase" },
              ]}
            />
            <ReportDateRangeFilter
              preset={preset}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onPresetChange={setPreset}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
              presetOptions={INVOICE_LISTING_DATE_PRESETS}
            />
            <ListingFilterReset
              active={accountsListingFiltersActive(
                {
                  search,
                  preset,
                  dateFrom,
                  dateTo,
                  sourceType: sourceTypeFilter,
                },
                listingFilterDefaults(),
              )}
              onClick={() => {
                const defaults = listingFilterDefaults();
                setSearch(defaults.search);
                setSourceTypeFilter(defaults.sourceType);
                setPreset(defaults.preset);
                setDateFrom(defaults.dateFrom);
                setDateTo(defaults.dateTo);
                onPageChange(1);
              }}
            />
          </ReportFilterRow>
        </AccountsListingFilterCard>
      }
      footer={
        totalRecords > 0 ? (
          <Pagination
            page={page}
            pageSize={pageSize}
            totalRecords={totalRecords}
            onPageChange={onPageChange}
            onPageSizeChange={(size) => {
              onPageSizeChange(size);
              onPageChange(1);
            }}
            recordLabel="invoices"
            variant="full"
          />
        ) : undefined
      }
    >
      <PurchaseInvoicesTabTable
        toolbarRows={invoices}
        loading={loading}
        filterOptions={filterOptions}
        filterLoading={filterLoading}
        filterReady={filterReady}
        onOpenFilter={onOpenFilter}
      />
    </AccountsTableListing>
  );
}

function GrnPendingTabBody({
  pendingGrns,
  router,
  loading,
  search,
  setSearch,
  page,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
  filterOptions,
  filterLoading,
  filterReady,
  onOpenFilter,
}: {
  pendingGrns: EligibleGrnDto[];
  router: ReturnType<typeof useRouter>;
  loading: boolean;
  search: string;
  setSearch: (v: string) => void;
  page: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  filterOptions: FilterValueOptions;
  filterLoading: FilterFlagMap;
  filterReady: FilterFlagMap;
  onOpenFilter: (key: string) => void;
}) {
  return (
    <AccountsTableListing
      className="h-full min-h-0"
      toolbar={
        <AccountsListingFilterCard>
          <ReportFilterRow>
            <ReportSearchFilter
              value={search}
              onChange={setSearch}
              placeholder="Search GRN no., supplier, warehouse, supplier invoice…"
              className="min-w-[220px] flex-1 max-w-md"
            />
          </ReportFilterRow>
        </AccountsListingFilterCard>
      }
      footer={
        totalRecords > 0 ? (
          <Pagination
            page={page}
            pageSize={pageSize}
            totalRecords={totalRecords}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            recordLabel="pending GRNs"
            variant="full"
          />
        ) : undefined
      }
    >
      <GrnPendingTabTable
        toolbarRows={pendingGrns}
        router={router}
        loading={loading}
        filterOptions={filterOptions}
        filterLoading={filterLoading}
        filterReady={filterReady}
        onOpenFilter={onOpenFilter}
      />
    </AccountsTableListing>
  );
}

export default function PurchaseInvoiceListClient() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("invoices");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [sourceTypeFilter, setSourceTypeFilter] = useState<SourceTypeFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [invoiceSortKey, setInvoiceSortKey] = useState("invoiceDate");
  const [invoiceSortDir, setInvoiceSortDir] = useState<"asc" | "desc">("desc");
  const [invoiceColumnFilters, setInvoiceColumnFilters] = useState<Record<string, unknown>>({});
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } =
    useReportDateRange(LISTING_DEFAULT_PRESET);
  const sectionRefresh = useAccountsSectionRefresh("purchase-invoices");

  const [invoices, setInvoices] = useState<PurchaseInvoiceListRow[]>([]);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [pendingGrns, setPendingGrns] = useState<EligibleGrnDto[]>([]);
  const [pendingGrnTotal, setPendingGrnTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [grnLoading, setGrnLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceFilterOptions, setInvoiceFilterOptions] = useState<FilterValueOptions>({});
  const [invoiceFilterLoading, setInvoiceFilterLoading] = useState<FilterFlagMap>({});
  const [invoiceFilterReady, setInvoiceFilterReady] = useState<FilterFlagMap>({});
  const [grnFilterOptions, setGrnFilterOptions] = useState<FilterValueOptions>({});
  const [grnFilterLoading, setGrnFilterLoading] = useState<FilterFlagMap>({});
  const [grnFilterReady, setGrnFilterReady] = useState<FilterFlagMap>({});
  const { handleOpenFilter: markInvoiceFilterOpened } = useLazyFilterColumns();
  const { handleOpenFilter: markGrnFilterOpened } = useLazyFilterColumns();
  const invoiceFilterLoadedRef = useRef<Set<string>>(new Set());
  const grnFilterLoadedRef = useRef<Set<string>>(new Set());

  const [grnSearch, setGrnSearch] = useState("");
  const debouncedGrnSearch = useDebouncedValue(grnSearch, 300);
  const [grnPage, setGrnPage] = useState(1);
  const [grnPageSize, setGrnPageSize] = useState(25);
  const [grnSortKey, setGrnSortKey] = useState("invoiceDate");
  const [grnSortDir, setGrnSortDir] = useState<"asc" | "desc">("desc");
  const [grnColumnFilters, setGrnColumnFilters] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (tab !== "invoices") return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const ordering =
          invoiceSortDir === "desc" ? `-${invoiceSortKey}` : invoiceSortKey;
        const listRes = await PurchaseInvoiceService.list({
          page,
          page_size: pageSize,
          search: debouncedSearch.trim() || undefined,
          invoice_type: sourceTypeToInvoiceType(sourceTypeFilter),
          from_date: dateFrom || undefined,
          to_date: dateTo || undefined,
          ordering,
          filters:
            Object.keys(invoiceColumnFilters).length > 0
              ? JSON.stringify(invoiceColumnFilters)
              : undefined,
          include_pending: true,
        });
        if (cancelled) return;
        setInvoices((listRes.results || []).map(mapPurchaseInvoiceListDto));
        setInvoiceTotal(listRes.total ?? 0);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load purchase invoices.");
        setInvoices([]);
        setInvoiceTotal(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    tab,
    sectionRefresh,
    page,
    pageSize,
    debouncedSearch,
    sourceTypeFilter,
    dateFrom,
    dateTo,
    invoiceSortKey,
    invoiceSortDir,
    invoiceColumnFilters,
  ]);

  useEffect(() => {
    if (tab !== "invoices") return;
    let cancelled = false;
    (async () => {
      try {
        const pendingRes = await PurchaseInvoiceService.countEligibleGrns();
        if (cancelled) return;
        setPendingGrnTotal(pendingRes.total ?? 0);
      } catch {
        if (!cancelled) setPendingGrnTotal(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, sectionRefresh]);

  useEffect(() => {
    if (tab !== "grn_pending") return;
    let cancelled = false;
    (async () => {
      setGrnLoading(true);
      try {
        const ordering = grnSortDir === "desc" ? `-${grnSortKey}` : grnSortKey;
        const grnRes = await PurchaseInvoiceService.listEligibleGrns({
          page: grnPage,
          page_size: grnPageSize,
          search: debouncedGrnSearch.trim() || undefined,
          ordering,
          filters:
            Object.keys(grnColumnFilters).length > 0
              ? JSON.stringify(grnColumnFilters)
              : undefined,
        });
        if (cancelled) return;
        setPendingGrns(grnRes.results || []);
        setPendingGrnTotal(grnRes.total ?? 0);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load eligible GRNs.");
        setPendingGrns([]);
        setPendingGrnTotal(0);
      } finally {
        if (!cancelled) setGrnLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    tab,
    sectionRefresh,
    grnPage,
    grnPageSize,
    debouncedGrnSearch,
    grnSortKey,
    grnSortDir,
    grnColumnFilters,
  ]);

  useEffect(() => {
    invoiceFilterLoadedRef.current = new Set();
    setInvoiceFilterOptions({});
    setInvoiceFilterLoading({});
    setInvoiceFilterReady({});
  }, [sourceTypeFilter, sectionRefresh]);

  useEffect(() => {
    grnFilterLoadedRef.current = new Set();
    setGrnFilterOptions({});
    setGrnFilterLoading({});
    setGrnFilterReady({});
  }, [sectionRefresh]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sourceTypeFilter, dateFrom, dateTo, invoiceSortKey, invoiceSortDir, invoiceColumnFilters]);

  useEffect(() => {
    setGrnPage(1);
  }, [debouncedGrnSearch, grnSortKey, grnSortDir, grnColumnFilters]);

  const handleInvoiceSortChange = useCallback((key: string, dir: "asc" | "desc") => {
    setInvoiceSortKey(key);
    setInvoiceSortDir(dir);
  }, []);

  const handleInvoiceFilterChange = useCallback((filters: Record<string, unknown>) => {
    setInvoiceColumnFilters(filters);
  }, []);

  const handleGrnSortChange = useCallback((key: string, dir: "asc" | "desc") => {
    setGrnSortKey(key);
    setGrnSortDir(dir);
  }, []);

  const handleGrnFilterChange = useCallback((filters: Record<string, unknown>) => {
    setGrnColumnFilters(filters);
  }, []);

  const openInvoiceFilter = useCallback(
    async (field: string) => {
      markInvoiceFilterOpened(field);
      if (invoiceFilterLoadedRef.current.has(field)) return;
      invoiceFilterLoadedRef.current.add(field);
      setInvoiceFilterLoading((prev) => ({ ...prev, [field]: true }));
      try {
        const rows = await PurchaseInvoiceService.getFilterDropdown(field, {
          invoice_type: sourceTypeToInvoiceType(sourceTypeFilter),
          include_pending: true,
        });
        setInvoiceFilterOptions((prev) => ({
          ...prev,
          [field]: mapDropdownOptions(rows, field),
        }));
      } catch {
        invoiceFilterLoadedRef.current.delete(field);
        setInvoiceFilterOptions((prev) => ({ ...prev, [field]: prev[field] || [] }));
      } finally {
        setInvoiceFilterLoading((prev) => ({ ...prev, [field]: false }));
        setInvoiceFilterReady((prev) => ({ ...prev, [field]: true }));
      }
    },
    [markInvoiceFilterOpened, sourceTypeFilter],
  );

  const openGrnFilter = useCallback(
    async (field: string) => {
      markGrnFilterOpened(field);
      if (grnFilterLoadedRef.current.has(field)) return;
      grnFilterLoadedRef.current.add(field);
      setGrnFilterLoading((prev) => ({ ...prev, [field]: true }));
      try {
        const rows = await PurchaseInvoiceService.getEligibleGrnFilterDropdown(field);
        setGrnFilterOptions((prev) => ({
          ...prev,
          [field]: mapDropdownOptions(rows, field),
        }));
      } catch {
        grnFilterLoadedRef.current.delete(field);
        setGrnFilterOptions((prev) => ({ ...prev, [field]: prev[field] || [] }));
      } finally {
        setGrnFilterLoading((prev) => ({ ...prev, [field]: false }));
        setGrnFilterReady((prev) => ({ ...prev, [field]: true }));
      }
    },
    [markGrnFilterOpened],
  );

  const getInvoiceCellValue = useCallback((row: PurchaseInvoiceListRow, key: string) => {
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const getGrnCellValue = useCallback((row: EligibleGrnDto, key: string) => {
    if (key === "sourceType") return "from_grn";
    if (key === "invoiceDate") {
      return formatDateOnly(row.supplier_invoice_date) !== "—"
        ? formatDateOnly(row.supplier_invoice_date)
        : formatDateOnly(row.grn_date);
    }
    if (key === "taxableAmount") return Number(row.invoice_amount || 0);
    if (key === "gstAmount") return Number(row.gst_amount || 0);
    if (key === "netPayable") return Number(row.total_invoice_amount || 0);
    if (key === "status") return "PENDING";
    if (key === "supplier_invoice_no" || key === "has_supplier_invoice") {
      return row.supplier_invoice_no || "";
    }
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const invoiceColumnConfig = useMemo(
    () => ({
      sourceType: { type: "text" as const },
      vendorName: { type: "text" as const },
      vendorInvoiceNo: { type: "text" as const },
      invoiceDate: { type: "date" as const },
      taxableAmount: { type: "amount" as const },
      gstAmount: { type: "amount" as const },
      netPayable: { type: "amount" as const },
      status: { type: "text" as const },
    }),
    [],
  );

  const grnColumnConfig = useMemo(
    () => ({
      sourceType: { type: "text" as const },
      supplier_name: { type: "text" as const },
      supplier_invoice_no: { type: "text" as const },
      invoiceDate: { type: "date" as const },
      taxableAmount: { type: "amount" as const },
      gstAmount: { type: "amount" as const },
      netPayable: { type: "amount" as const },
      status: { type: "text" as const },
    }),
    [],
  );

  return (
    <div className="purchase-invoice-listing h-full min-h-0">
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Transactions", "Purchase Invoices")}
        title="Purchase Invoices"
        description="GRN-based inventory invoices and direct purchases for expenses, services, and assets."
        hideDescription
        layout="split"
        className="h-full min-h-0"
        subHeader={
          <PurchaseInvoiceTabs
            tab={tab}
            invoiceCount={invoiceTotal}
            pendingCount={pendingGrnTotal}
            onTabChange={setTab}
          />
        }
        actions={
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={() => router.push("/accounts/purchase-invoices/new?mode=direct")}
          >
            <FileText className="w-3.5 h-3.5" />
            Direct Purchase
          </Button>
        }
      >
        <div className="flex flex-col flex-1 min-h-0 h-full">
          {error && (
            <div className="flex-shrink-0 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
          {tab === "invoices" ? (
            <AccountsColumnFilterProvider
              key="invoices"
              rows={invoices}
              getCellValue={getInvoiceCellValue}
              columnConfig={invoiceColumnConfig}
              defaultSortKey="invoiceDate"
              defaultSortDir="desc"
            >
              <div className="flex flex-col flex-1 min-h-0 h-full">
                <GrnSortSync
                  sortKey={invoiceSortKey}
                  sortDir={invoiceSortDir}
                  columnFilters={invoiceColumnFilters}
                  onSortChange={handleInvoiceSortChange}
                  onFilterChange={handleInvoiceFilterChange}
                />
                <PurchaseInvoicesTabBody
                  invoices={invoices}
                  totalRecords={invoiceTotal}
                  search={search}
                  setSearch={setSearch}
                  sourceTypeFilter={sourceTypeFilter}
                  setSourceTypeFilter={setSourceTypeFilter}
                  preset={preset}
                  setPreset={setPreset}
                  dateFrom={dateFrom}
                  setDateFrom={setDateFrom}
                  dateTo={dateTo}
                  setDateTo={setDateTo}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  loading={loading}
                  filterOptions={invoiceFilterOptions}
                  filterLoading={invoiceFilterLoading}
                  filterReady={invoiceFilterReady}
                  onOpenFilter={openInvoiceFilter}
                />
              </div>
            </AccountsColumnFilterProvider>
          ) : (
            <AccountsColumnFilterProvider
              key="grn_pending"
              rows={pendingGrns}
              getCellValue={getGrnCellValue}
              columnConfig={grnColumnConfig}
              defaultSortKey="invoiceDate"
              defaultSortDir="desc"
            >
              <div className="flex flex-col flex-1 min-h-0 h-full">
                <GrnSortSync
                  sortKey={grnSortKey}
                  sortDir={grnSortDir}
                  columnFilters={grnColumnFilters}
                  onSortChange={handleGrnSortChange}
                  onFilterChange={handleGrnFilterChange}
                />
                <GrnPendingTabBody
                  pendingGrns={pendingGrns}
                  router={router}
                  loading={grnLoading}
                  search={grnSearch}
                  setSearch={setGrnSearch}
                  page={grnPage}
                  pageSize={grnPageSize}
                  totalRecords={pendingGrnTotal}
                  onPageChange={setGrnPage}
                  onPageSizeChange={(s) => {
                    setGrnPageSize(s);
                    setGrnPage(1);
                  }}
                  filterOptions={grnFilterOptions}
                  filterLoading={grnFilterLoading}
                  filterReady={grnFilterReady}
                  onOpenFilter={openGrnFilter}
                />
              </div>
            </AccountsColumnFilterProvider>
          )}
        </div>
      </AccountsPageShell>
    </div>
  );
}

function PurchaseInvoiceTabs({
  tab,
  invoiceCount,
  pendingCount,
  onTabChange,
}: {
  tab: Tab;
  invoiceCount: number;
  pendingCount: number;
  onTabChange?: (tab: Tab) => void;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-border pb-0">
      <TabBtn active={tab === "invoices"} onClick={() => onTabChange?.("invoices")}>
        <FileText className="w-4 h-4" />
        All Invoices
        <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs font-semibold tabular-nums">
          {invoiceCount}
        </span>
      </TabBtn>
      <TabBtn active={tab === "grn_pending"} onClick={() => onTabChange?.("grn_pending")}>
        <Truck className="w-4 h-4" />
        GRN Pending Invoice
        {pendingCount > 0 && (
          <span className="ml-1 rounded-full bg-amber-500 text-white px-1.5 py-0.5 text-xs font-semibold tabular-nums">
            {pendingCount}
          </span>
        )}
      </TabBtn>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors -mb-px",
        active
          ? "border-brand-600 text-brand-700"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
