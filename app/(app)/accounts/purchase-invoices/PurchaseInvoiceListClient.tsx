"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, FileText, Paperclip, Plus, Truck, XCircle } from "lucide-react";
import {
  AccountsMoreActions,
  AccountsTableActionCell,
  AccountsViewAction,
  accountsActionColClass,
  ACCOUNTS_ACTION_BTN_CLASS,
  ACCOUNTS_ACTION_ICON_CLASS,
} from "@/components/accounts/AccountsTableActions";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { showToast } from "@/lib/toast";
import { PurchaseInvoiceCancelDialog } from "./components/PurchaseInvoiceCancelDialog";
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
import {
  INVOICE_LISTING_DATE_PRESETS,
  resolveDateRangePreset,
} from "@/lib/accounts/report-date-presets";
import {
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  useAccountsColumnFilterContext,
} from "@/app/(app)/accounts/components/AccountsUI";
import { useDebouncedValue } from "@/app/(app)/accounts/reports/pl/pl-hooks";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { useLazyFilterColumns } from "@/lib/masters/use-lazy-filter-columns";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { PURCHASE_SOURCE_TYPE_LABELS, type PurchaseNature, type PurchaseSourceType } from "./purchase-invoice-types";
import { downloadPurchaseInvoicePdf } from "./purchase-invoice-pdf";
import {
  PurchaseInvoiceService,
  mapPurchaseInvoiceDetailToRecord,
  mapPurchaseInvoiceListDto,
  sourceTypeToInvoiceType,
  type EligibleGrnDto,
  type PurchaseInvoiceApprovalStatus,
  type PurchaseInvoiceListRow,
  type PurchaseInvoicePaymentStatus,
} from "@/services/purchase-invoice.service";
import "./purchase-invoice-listing.css";

const PURCHASE_NATURE_OPTION_LABELS: Record<string, string> = {
  inventory: "Inventory",
  expense: "Expense",
  service: "Service",
  fixed_asset: "Fixed Asset",
  other_non_stock: "Capital Goods",
};

const PURCHASE_NATURE_COLUMN_FILTER_OPTIONS = Object.keys(PURCHASE_NATURE_OPTION_LABELS).map(
  (value) => ({ value, count: 0 }),
);
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
type PurchaseNatureFilter = "all" | "inventory" | PurchaseNature;

const LISTING_DEFAULT_PRESET = "all_transactions" as const;
const PURCHASE_INVOICE_DATE_PRESETS = [
  ...INVOICE_LISTING_DATE_PRESETS.filter((option) => option.id !== "custom"),
  { id: "all_transactions" as const, label: "All Transactions" },
  ...INVOICE_LISTING_DATE_PRESETS.filter((option) => option.id === "custom"),
];

function listingFilterDefaults() {
  const { from, to } = resolveDateRangePreset(LISTING_DEFAULT_PRESET);
  return {
    search: "",
    preset: LISTING_DEFAULT_PRESET,
    dateFrom: from,
    dateTo: to,
    sourceType: "all" as SourceTypeFilter,
    purchaseNature: "all" as PurchaseNatureFilter,
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

function isQcCompletedStatus(status: string | null | undefined): boolean {
  return String(status ?? "").trim().toUpperCase() === "QC_COMPLETED";
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

function ApprovalStatusBadge({ status }: { status: PurchaseInvoiceApprovalStatus }) {
  const cfg =
    status === "approved"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "pending_approval"
        ? "bg-orange-50 text-orange-700 border-orange-200"
        : "bg-sky-50 text-sky-700 border-sky-200";
  const label =
    status === "approved"
      ? "Approved"
      : status === "pending_approval"
        ? "Pending Approval"
        : "Draft";
  return (
    <Badge variant="outline" className={cn("text-xs h-5 font-medium", cfg)}>
      {label}
    </Badge>
  );
}

function PaymentStatusBadge({ status }: { status: PurchaseInvoicePaymentStatus }) {
  const map = {
    paid: { status: "approved" as const, label: "Paid" },
    partial: { status: "partial" as const, label: "Partial" },
    unpaid: { status: "pending" as const, label: "Unpaid" },
  };
  const cfg = map[status];
  return <StatusBadge status={cfg.status} label={cfg.label} size="sm" />;
}

function PostingStatusText({ label }: { label: string }) {
  return <span className="text-xs text-muted-foreground">{label}</span>;
}

function ListingRowActions({
  viewHref,
  canDownload,
  canCancel,
  downloading,
  actionBusy,
  onDownload,
  onCancel,
}: {
  viewHref: string;
  canDownload: boolean;
  canCancel?: boolean;
  downloading: boolean;
  actionBusy?: boolean;
  onDownload: () => void;
  onCancel?: () => void;
}) {
  return (
    <AccountsTableActionCell>
      <AccountsViewAction href={viewHref} />
      {canDownload ? (
        <button
          type="button"
          title="Download"
          aria-label="Download"
          disabled={downloading}
          className={ACCOUNTS_ACTION_BTN_CLASS}
          onClick={onDownload}
        >
          <Download className={ACCOUNTS_ACTION_ICON_CLASS} />
        </button>
      ) : null}
      {canCancel && onCancel ? (
        <AccountsMoreActions contentClassName="w-44">
          <DropdownMenuItem
            className="text-xs gap-2 text-red-600"
            disabled={actionBusy}
            onClick={onCancel}
          >
            <XCircle className="w-4 h-4" /> Cancel
          </DropdownMenuItem>
        </AccountsMoreActions>
      ) : null}
    </AccountsTableActionCell>
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
    if (!ctx) return;
    const nextKey = ctx.sortKey || "";
    const nextDir = ctx.sortDir ?? "asc";
    if (nextKey !== sortKey || (nextKey !== "" && nextDir !== sortDir)) {
      onSortChange(nextKey, nextDir);
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
  downloadingId,
  onDownload,
  actionBusy,
  onCancel,
}: {
  toolbarRows: PurchaseInvoiceListRow[];
  loading: boolean;
  filterOptions: FilterValueOptions;
  filterLoading: FilterFlagMap;
  filterReady: FilterFlagMap;
  onOpenFilter: (key: string) => void;
  downloadingId: string | null;
  onDownload: (row: PurchaseInvoiceListRow) => void;
  actionBusy?: boolean;
  onCancel?: (row: PurchaseInvoiceListRow) => void;
}) {
  const opts = (key: string) => filterOptions[key] || [];
  const filterProps = (key: string) => {
    const loaded = opts(key);
    const isReady = Boolean(filterReady[key]);
    return {
      ...(isReady && loaded.length === 0 ? {} : { valueOptions: loaded }),
      onFilterOpen: () => onOpenFilter(key),
      optionsLoading: Boolean(filterLoading[key]),
      optionsReady: isReady,
    };
  };

  return (
    <>
      <AccountsTable minWidth={2040}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="Invoice No" colKey="invoiceNo" {...filterProps("invoiceNo")} />
            <SortTh label="Source Type" colKey="sourceType" {...filterProps("sourceType")} />
            <SortTh label="Supplier" colKey="vendorName" className="accounts-col-party" {...filterProps("vendorName")} />
            <SortTh label="Supplier Inv. No" colKey="vendorInvoiceNo" {...filterProps("vendorInvoiceNo")} />
            <SortTh label="Invoice Date" colKey="invoiceDate" filterType="date" {...filterProps("invoiceDate")} />
            <SortTh label="Purchase Nature" colKey="purchaseNature" {...filterProps("purchaseNature")} />
            <SortTh label="Taxable Amount" colKey="taxableAmount" filterType="amount" align="right" {...filterProps("taxableAmount")} />
            <SortTh label="GST Amount" colKey="gstAmount" filterType="amount" align="right" {...filterProps("gstAmount")} />
            <SortTh label="Net Payable" colKey="netPayable" filterType="amount" align="right" {...filterProps("netPayable")} />
            <SortTh label="Due Date" colKey="dueDate" filterType="date" {...filterProps("dueDate")} />
            <SortTh label="Approval" colKey="approvalStatus" {...filterProps("approvalStatus")} />
            <SortTh label="Posting" colKey="postingStatusLabel" filterable={false} />
            <SortTh label="Payment" colKey="paymentStatus" {...filterProps("paymentStatus")} />
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
            <AccountsTableEmpty colSpan={14} message="Loading purchase invoices…" />
          ) : toolbarRows.length === 0 ? (
            <AccountsTableEmpty colSpan={14} message="No purchase invoices found." />
          ) : (
            toolbarRows.map((inv) => (
              <AccountsTableRow key={inv.id}>
                <AccountsTableCell className="font-medium">
                  {PurchaseInvoiceService.isUuid(inv.id) ? (
                    <Link
                      href={`/accounts/purchase-invoices/${inv.id}`}
                      className="text-brand-700 hover:text-brand-800 hover:underline"
                    >
                      {inv.invoiceNo || "—"}
                    </Link>
                  ) : (
                    inv.invoiceNo || "—"
                  )}
                </AccountsTableCell>
                <AccountsTableCell>
                  <SourceTypeBadge type={inv.sourceType} />
                </AccountsTableCell>
                <AccountsTableCell className="font-medium">{inv.vendorName}</AccountsTableCell>
                <AccountsTableCell className="text-muted-foreground">{inv.vendorInvoiceNo || "—"}</AccountsTableCell>
                <AccountsTableCell>{inv.invoiceDate || "—"}</AccountsTableCell>
                <AccountsTableCell>{inv.purchaseNatureLabel}</AccountsTableCell>
                <AccountsTableCell align="right" money>
                  {formatMoney(inv.taxableAmount)}
                </AccountsTableCell>
                <AccountsTableCell align="right" className="tabular-nums">
                  {formatMoney(inv.gstAmount)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money>
                  {formatMoney(inv.netPayable)}
                </AccountsTableCell>
                <AccountsTableCell>{inv.dueDate || "—"}</AccountsTableCell>
                <AccountsTableCell>
                  <ApprovalStatusBadge status={inv.approvalStatus} />
                </AccountsTableCell>
                <AccountsTableCell>
                  <PostingStatusText label={inv.postingStatusLabel} />
                </AccountsTableCell>
                <AccountsTableCell>
                  <PaymentStatusBadge status={inv.paymentStatus} />
                </AccountsTableCell>

                <AccountsTableCell align="right" className={accountsActionColClass("multi")}>
                  <ListingRowActions
                    viewHref={`/accounts/purchase-invoices/${inv.id}`}
                    canDownload={PurchaseInvoiceService.isUuid(inv.id)}
                    canCancel={
                      PurchaseInvoiceService.isUuid(inv.id) &&
                      inv.status === "POSTED" &&
                      !inv.isPendingGrn
                    }
                    downloading={downloadingId === inv.id}
                    actionBusy={actionBusy}
                    onDownload={() => onDownload(inv)}
                    onCancel={onCancel ? () => onCancel(inv) : undefined}
                  />
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
  loading,
  filterOptions,
  filterLoading,
  filterReady,
  onOpenFilter,
  onCreateInvoice,
}: {
  toolbarRows: EligibleGrnDto[];
  loading: boolean;
  filterOptions: FilterValueOptions;
  filterLoading: FilterFlagMap;
  filterReady: FilterFlagMap;
  onOpenFilter: (key: string) => void;
  onCreateInvoice: (grn: EligibleGrnDto) => void;
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
      <AccountsTable minWidth={1280}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="GRN No" colKey="grn_number" {...filterProps("grn_number")} />
            <SortTh label="PO Number" colKey="po_no" {...filterProps("po_no")} />
            <SortTh label="Supplier" colKey="supplier_name" className="accounts-col-party" {...filterProps("supplier_name")} />
            <SortTh label="Warehouse" colKey="warehouse_name" {...filterProps("warehouse_name")} />
            <SortTh label="Receipt Date" colKey="grn_date" filterType="date" {...filterProps("grn_date")} />
            <SortTh label="Total Qty" colKey="total_received_qty" filterType="amount" align="right" {...filterProps("total_received_qty")} />
            <SortTh label="Est. Value" colKey="total_invoice_amount" filterType="amount" align="right" {...filterProps("total_invoice_amount")} />
            <AccountsColumnHeader
              label="Actions"
              colKey="_actions"
              sortable={false}
              filterable={false}
              align="right"
              className={accountsActionColClass("cta")}
            />
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {loading && toolbarRows.length === 0 ? (
            <AccountsTableEmpty colSpan={8} message="Loading pending GRNs…" />
          ) : toolbarRows.length === 0 ? (
            <AccountsTableEmpty
              colSpan={8}
              message="No purchase-order GRNs are pending a purchase invoice."
            />
          ) : (
            toolbarRows.map((grn) => (
              <AccountsTableRow key={grn.grn_id}>
                <AccountsTableCell className="font-medium">{grn.grn_number || "—"}</AccountsTableCell>
                <AccountsTableCell>{grn.po_no || "—"}</AccountsTableCell>
                <AccountsTableCell className="font-medium">{grn.supplier_name || "—"}</AccountsTableCell>
                <AccountsTableCell>{grn.warehouse_name || "—"}</AccountsTableCell>
                <AccountsTableCell>{formatDateOnly(grn.grn_date)}</AccountsTableCell>
                <AccountsTableCell align="right" className="tabular-nums">
                  {Number(grn.total_received_qty || 0).toLocaleString("en-IN")}
                </AccountsTableCell>
                <AccountsTableCell align="right" money>
                  {formatMoney(Number(grn.total_invoice_amount || 0))}
                </AccountsTableCell>
                <AccountsTableCell align="right" actions="cta">
                  <Button
                    size="sm"
                    className="h-7 px-2 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white gap-1 whitespace-nowrap"
                    onClick={() => onCreateInvoice(grn)}
                  >
                    <FileText className="w-3 h-3" />
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
  purchaseNatureFilter,
  setPurchaseNatureFilter,
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
  downloadingId,
  onDownload,
  exporting,
  onExportExcel,
  onExportCsv,
  actionBusy,
  onCancel,
}: {
  invoices: PurchaseInvoiceListRow[];
  totalRecords: number;
  search: string;
  setSearch: (v: string) => void;
  sourceTypeFilter: SourceTypeFilter;
  setSourceTypeFilter: (v: SourceTypeFilter) => void;
  purchaseNatureFilter: PurchaseNatureFilter;
  setPurchaseNatureFilter: (v: PurchaseNatureFilter) => void;
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
  downloadingId: string | null;
  onDownload: (row: PurchaseInvoiceListRow) => void;
  exporting: boolean;
  onExportExcel: () => void;
  onExportCsv: () => void;
  actionBusy?: boolean;
  onCancel?: (row: PurchaseInvoiceListRow) => void;
}) {
  return (
    <AccountsTableListing
      className="h-full min-h-0"
      toolbar={
        <AccountsListingFilterCard>
          <ReportFilterRow
            end={
              <AccountsExportMenu
                onExcel={onExportExcel}
                onCsv={onExportCsv}
                // onPdf={onExportCsv}
                disabled={exporting}
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
            <ListingSelectFilter
              label="Purchase Nature"
              value={purchaseNatureFilter}
              onChange={setPurchaseNatureFilter}
              widthClass="w-[148px]"
              options={[
                { value: "all", label: "All Nature" },
                { value: "inventory", label: "Inventory" },
                { value: "expense", label: "Expense" },
                { value: "service", label: "Service" },
                { value: "fixed_asset", label: "Fixed Asset" },
                { value: "other_non_stock", label: "Capital Goods" },
              ]}
            />
            <ReportDateRangeFilter
              preset={preset}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onPresetChange={setPreset}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
              presetOptions={PURCHASE_INVOICE_DATE_PRESETS}
            />
            <ListingFilterReset
              active={accountsListingFiltersActive(
                {
                  search,
                  preset,
                  dateFrom,
                  dateTo,
                  sourceType: sourceTypeFilter,
                  purchaseNature: purchaseNatureFilter,
                },
                listingFilterDefaults(),
              )}
              onClick={() => {
                const defaults = listingFilterDefaults();
                setSearch(defaults.search);
                setSourceTypeFilter(defaults.sourceType);
                setPurchaseNatureFilter(defaults.purchaseNature);
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
        downloadingId={downloadingId}
        onDownload={onDownload}
        actionBusy={actionBusy}
        onCancel={onCancel}
      />
    </AccountsTableListing>
  );
}

function GrnPendingTabBody({
  pendingGrns,
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
  onCreateInvoice,
}: {
  pendingGrns: EligibleGrnDto[];
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
  onCreateInvoice: (grn: EligibleGrnDto) => void;
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
              placeholder="Search GRN no., PO number, supplier, warehouse…"
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
        loading={loading}
        filterOptions={filterOptions}
        filterLoading={filterLoading}
        filterReady={filterReady}
        onOpenFilter={onOpenFilter}
        onCreateInvoice={onCreateInvoice}
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
  const [purchaseNatureFilter, setPurchaseNatureFilter] = useState<PurchaseNatureFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [invoiceSortKey, setInvoiceSortKey] = useState("");
  const [invoiceSortDir, setInvoiceSortDir] = useState<"asc" | "desc">("asc");
  const [invoiceColumnFilters, setInvoiceColumnFilters] = useState<Record<string, unknown>>({});
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } =
    useReportDateRange(LISTING_DEFAULT_PRESET);
  const sectionRefresh = useAccountsSectionRefresh("purchase-invoices", {
    apiListing: true,
  });

  const [invoices, setInvoices] = useState<PurchaseInvoiceListRow[]>([]);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [pendingGrns, setPendingGrns] = useState<EligibleGrnDto[]>([]);
  const [pendingGrnTotal, setPendingGrnTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [grnLoading, setGrnLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<PurchaseInvoiceListRow | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const cancelBusyRef = useRef(false);
  const [listRefreshKey, setListRefreshKey] = useState(0);
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
  const [grnSortKey, setGrnSortKey] = useState("");
  const [grnSortDir, setGrnSortDir] = useState<"asc" | "desc">("asc");
  const [grnColumnFilters, setGrnColumnFilters] = useState<Record<string, unknown>>({});
  const invoiceFiltersKey = useMemo(() => {
    const merged: Record<string, unknown> = { ...invoiceColumnFilters };
    if (purchaseNatureFilter !== "all") {
      merged.purchaseNature = { selectedValues: [purchaseNatureFilter] };
    }
    return JSON.stringify(merged);
  }, [invoiceColumnFilters, purchaseNatureFilter]);
  const grnFiltersKey = JSON.stringify(grnColumnFilters);

  useEffect(() => {
    if (tab !== "invoices") return;
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const ordering = invoiceSortKey
          ? invoiceSortDir === "desc"
            ? `-${invoiceSortKey}`
            : invoiceSortKey
          : undefined;
        const listRes = await PurchaseInvoiceService.list(
          {
            page,
            page_size: pageSize,
            search: debouncedSearch.trim() || undefined,
            invoice_type: sourceTypeToInvoiceType(sourceTypeFilter),
            from_date: dateFrom || undefined,
            to_date: dateTo || undefined,
            ordering,
            filters: invoiceFiltersKey !== "{}" ? invoiceFiltersKey : undefined,
            include_pending: false,
          },
          ac.signal,
        );
        if (ac.signal.aborted) return;
        setInvoices((listRes.results || []).map(mapPurchaseInvoiceListDto));
        setInvoiceTotal(listRes.total ?? 0);
      } catch (e) {
        if (ac.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Failed to load purchase invoices.");
        setInvoices([]);
        setInvoiceTotal(0);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => {
      ac.abort();
    };
  }, [
    tab,
    sectionRefresh,
    page,
    pageSize,
    debouncedSearch,
    sourceTypeFilter,
    purchaseNatureFilter,
    dateFrom,
    dateTo,
    invoiceSortKey,
    invoiceSortDir,
    invoiceFiltersKey,
    listRefreshKey,
  ]);

  useEffect(() => {
    if (tab !== "invoices") return;
    const ac = new AbortController();
    (async () => {
      try {
        const pendingRes = await PurchaseInvoiceService.countPendingGrns(ac.signal);
        if (ac.signal.aborted) return;
        setPendingGrnTotal(pendingRes.total ?? 0);
      } catch {
        if (!ac.signal.aborted) setPendingGrnTotal(0);
      }
    })();
    return () => {
      ac.abort();
    };
  }, [tab, sectionRefresh]);

  useEffect(() => {
    if (tab !== "grn_pending") return;
    const ac = new AbortController();
    (async () => {
      setGrnLoading(true);
      try {
        const ordering = grnSortKey
          ? grnSortDir === "desc"
            ? `-${grnSortKey}`
            : grnSortKey
          : undefined;
        const grnRes = await PurchaseInvoiceService.listPendingGrns(
          {
            page: grnPage,
            page_size: grnPageSize,
            search: debouncedGrnSearch.trim() || undefined,
            ordering,
            filters: grnFiltersKey !== "{}" ? grnFiltersKey : undefined,
          },
          ac.signal,
        );
        if (ac.signal.aborted) return;
        setPendingGrns(grnRes.results || []);
        setPendingGrnTotal(grnRes.total ?? 0);
      } catch (e) {
        if (ac.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Failed to load pending GRNs.");
        setPendingGrns([]);
        setPendingGrnTotal(0);
      } finally {
        if (!ac.signal.aborted) setGrnLoading(false);
      }
    })();
    return () => {
      ac.abort();
    };
  }, [
    tab,
    sectionRefresh,
    grnPage,
    grnPageSize,
    debouncedGrnSearch,
    grnSortKey,
    grnSortDir,
    grnFiltersKey,
  ]);

  useEffect(() => {
    invoiceFilterLoadedRef.current = new Set();
    setInvoiceFilterOptions({});
    setInvoiceFilterLoading({});
    setInvoiceFilterReady({});
  }, [sourceTypeFilter, purchaseNatureFilter, sectionRefresh]);

  useEffect(() => {
    grnFilterLoadedRef.current = new Set();
    setGrnFilterOptions({});
    setGrnFilterLoading({});
    setGrnFilterReady({});
  }, [sectionRefresh]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sourceTypeFilter, purchaseNatureFilter, dateFrom, dateTo, invoiceSortKey, invoiceSortDir, invoiceFiltersKey]);

  useEffect(() => {
    setGrnPage(1);
  }, [debouncedGrnSearch, grnSortKey, grnSortDir, grnFiltersKey]);

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

  const handleDownloadInvoice = useCallback(async (row: PurchaseInvoiceListRow) => {
    if (!PurchaseInvoiceService.isUuid(row.id)) return;
    setDownloadingId(row.id);
    setError(null);
    try {
      const dto = await PurchaseInvoiceService.getById(row.id);
      downloadPurchaseInvoicePdf(mapPurchaseInvoiceDetailToRecord(dto));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to download purchase invoice.");
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const buildExportQuery = useCallback(() => {
    const ordering = invoiceSortKey
      ? invoiceSortDir === "desc"
        ? `-${invoiceSortKey}`
        : invoiceSortKey
      : undefined;
    return {
      search: debouncedSearch.trim() || undefined,
      invoice_type: sourceTypeToInvoiceType(sourceTypeFilter),
      from_date: dateFrom || undefined,
      to_date: dateTo || undefined,
      ordering,
      filters: invoiceFiltersKey !== "{}" ? invoiceFiltersKey : undefined,
      include_pending: false,
    };
  }, [
    debouncedSearch,
    sourceTypeFilter,
    dateFrom,
    dateTo,
    invoiceSortKey,
    invoiceSortDir,
    invoiceFiltersKey,
  ]);

  const handleExportInvoices = useCallback(
    async (format: "csv" | "xlsx") => {
      setExporting(true);
      setError(null);
      try {
        await PurchaseInvoiceService.export({
          ...buildExportQuery(),
          format,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to export purchase invoices.");
      } finally {
        setExporting(false);
      }
    },
    [buildExportQuery],
  );

  const handleCreateInvoiceFromGrn = useCallback(
    async (grn: EligibleGrnDto) => {
      if (!isQcCompletedStatus(grn.status)) {
        setError(
          `QC has not been completed for ${grn.grn_number}. Complete QC before creating the purchase invoice.`,
        );
        return;
      }
      setError(null);
      router.push(`/accounts/purchase-invoices/new?mode=grn&grnId=${grn.grn_id}`);
    },
    [router],
  );

  const openInvoiceFilter = useCallback(
    async (field: string) => {
      markInvoiceFilterOpened(field);
      if (field === "purchaseNature") {
        if (invoiceFilterLoadedRef.current.has(field)) return;
        invoiceFilterLoadedRef.current.add(field);
        setInvoiceFilterOptions((prev) => ({
          ...prev,
          purchaseNature: PURCHASE_NATURE_COLUMN_FILTER_OPTIONS,
        }));
        setInvoiceFilterReady((prev) => ({ ...prev, purchaseNature: true }));
        return;
      }
      if (invoiceFilterLoadedRef.current.has(field)) return;
      invoiceFilterLoadedRef.current.add(field);
      setInvoiceFilterLoading((prev) => ({ ...prev, [field]: true }));
      try {
        const rows = await PurchaseInvoiceService.getFilterDropdown(field, {
          invoice_type: sourceTypeToInvoiceType(sourceTypeFilter),
          include_pending: false,
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
        const rows = await PurchaseInvoiceService.getPendingGrnFilterDropdown(field);
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
    if (key === "purchaseNature") {
      return row.sourceType === "from_grn" ? "inventory" : row.purchaseNature ?? "expense";
    }
    if (key === "hasAttachment") return row.hasAttachment ? "yes" : "no";
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const getGrnCellValue = useCallback((row: EligibleGrnDto, key: string) => {
    if (key === "grn_date") return formatDateOnly(row.grn_date);
    if (key === "total_received_qty") return Number(row.total_received_qty || 0);
    if (key === "total_invoice_amount") return Number(row.total_invoice_amount || 0);
    if (key === "po_no") return row.po_no || "";
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const invoiceColumnConfig = useMemo(
    () => ({
      invoiceNo: { type: "text" as const },
      sourceType: { type: "text" as const },
      vendorName: { type: "text" as const },
      vendorInvoiceNo: { type: "text" as const },
      invoiceDate: { type: "date" as const },
      purchaseNature: {
        type: "text" as const,
        optionLabels: PURCHASE_NATURE_OPTION_LABELS,
      },
      taxableAmount: { type: "amount" as const },
      gstAmount: { type: "amount" as const },
      netPayable: { type: "amount" as const },
      dueDate: { type: "date" as const },
      approvalStatus: { type: "text" as const },
      postingStatusLabel: { type: "text" as const },
      paymentStatus: { type: "text" as const },
      hasAttachment: { type: "text" as const },
    }),
    [],
  );

  const grnColumnConfig = useMemo(
    () => ({
      grn_number: { type: "text" as const },
      po_no: { type: "text" as const },
      supplier_name: { type: "text" as const },
      warehouse_name: { type: "text" as const },
      grn_date: { type: "date" as const },
      total_received_qty: { type: "amount" as const },
      total_invoice_amount: { type: "amount" as const },
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
            <Plus className="w-3.5 h-3.5" />
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
                  purchaseNatureFilter={purchaseNatureFilter}
                  setPurchaseNatureFilter={setPurchaseNatureFilter}
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
                  downloadingId={downloadingId}
                  onDownload={handleDownloadInvoice}
                  exporting={exporting}
                  onExportExcel={() => handleExportInvoices("xlsx")}
                  onExportCsv={() => handleExportInvoices("csv")}
                  actionBusy={cancelBusy}
                  onCancel={setCancelTarget}
                />
              </div>
            </AccountsColumnFilterProvider>
          ) : (
            <AccountsColumnFilterProvider
              key="grn_pending"
              rows={pendingGrns}
              getCellValue={getGrnCellValue}
              columnConfig={grnColumnConfig}
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
                  onCreateInvoice={handleCreateInvoiceFromGrn}
                />
              </div>
            </AccountsColumnFilterProvider>
          )}
        </div>
      </AccountsPageShell>

      <PurchaseInvoiceCancelDialog
        open={!!cancelTarget}
        onClose={() => {
          if (!cancelBusy) setCancelTarget(null);
        }}
        invoiceNo={cancelTarget?.invoiceNo}
        busy={cancelBusy}
        onConfirm={async (payload) => {
          if (!cancelTarget || cancelBusyRef.current) return;
          cancelBusyRef.current = true;
          setCancelBusy(true);
          try {
            await PurchaseInvoiceService.cancel(cancelTarget.id, payload);
            showToast(
              cancelTarget.invoiceNo
                ? `Cancelled ${cancelTarget.invoiceNo}`
                : "Purchase invoice cancelled.",
              "success",
            );
            setCancelTarget(null);
            setListRefreshKey((k) => k + 1);
          } catch (e) {
            showToast(
              e instanceof Error ? e.message : "Failed to cancel purchase invoice.",
              "error",
            );
          } finally {
            cancelBusyRef.current = false;
            setCancelBusy(false);
          }
        }}
      />
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
