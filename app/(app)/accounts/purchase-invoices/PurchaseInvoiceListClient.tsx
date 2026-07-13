"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, Truck, FileMinus } from "lucide-react";
import {
  AccountsTableActionCell,
  AccountsViewAction,
  accountsActionColClass,
  ACCOUNTS_ACTION_BTN_CLASS,
} from "@/components/accounts/AccountsTableActions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsVoucherStatusBadge } from "@/components/accounts/AccountsVoucherStatusBadge";
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
  AccountsTablePagination,
  AccountsListingCountFooter,
  AccountsListingFilterCard,
} from "@/components/accounts/AccountsTableListing";
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
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { DEBIT_NOTES_LIST_PATH } from "@/app/(app)/accounts/debit-notes/note-utils";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import {
  loadAllPurchaseInvoices,
  getGrnsPendingInvoice,
  getPurchaseInvoiceGstBreakup,
  getPurchaseInvoicePaymentStatus,
  getPurchaseInvoiceApprovalStatus,
  getPurchaseInvoicePostingStatus,
  hasPurchaseInvoiceAttachment,
  resolvePurchaseSourceType,
  PURCHASE_SOURCE_TYPE_LABELS,
  type PurchaseInvoiceRecord,
  type PurchaseNature,
  type PurchaseSourceType,
} from "./purchase-invoices-data";
import { PURCHASE_NATURE_LABELS } from "./purchase-invoice-direct-utils";
import { PURCHASE_INVOICE_DEMO_SCENARIO_LABELS } from "./purchase-invoice-seed";
import { PURCHASE_INVOICE_DIRECT_DEMO_LABELS } from "./purchase-invoice-direct-seed";
import { PurchaseInvoiceAttachmentLink } from "./PurchaseInvoiceAttachmentLink";
import type { GrnRecord } from "@/app/(app)/warehouse/grn/types";
import "./purchase-invoice-listing.css";

type Tab = "invoices" | "grn_pending";
type SourceTypeFilter = "all" | PurchaseSourceType;
type NatureFilter = "all" | PurchaseNature;

const LISTING_DEFAULT_PRESET = "this_month" as const;

function listingFilterDefaults() {
  const { from, to } = resolveDateRangePreset(LISTING_DEFAULT_PRESET);
  return {
    search: "",
    preset: LISTING_DEFAULT_PRESET,
    dateFrom: from,
    dateTo: to,
    sourceType: "all" as SourceTypeFilter,
    nature: "all" as NatureFilter,
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

function SourceTypeBadge({ type }: { type: PurchaseSourceType }) {
  const isGrn = type === "from_grn";
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs h-5",
        isGrn ? "text-blue-700 border-blue-200 bg-blue-50" : "text-brand-700 border-brand-200 bg-brand-50",
      )}
    >
      {PURCHASE_SOURCE_TYPE_LABELS[type]}
    </Badge>
  );
}

function PaymentStatusBadge({ status }: { status: ReturnType<typeof getPurchaseInvoicePaymentStatus> }) {
  const labels = { paid: "Paid", partial: "Partial", unpaid: "Unpaid" } as const;
  const cfg = {
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    partial: "bg-amber-50 text-amber-700 border-amber-200",
    unpaid: "bg-red-50 text-red-700 border-red-200",
  }[status];
  return (
    <Badge variant="outline" className={cn("text-xs h-5", cfg)}>
      {labels[status]}
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

function demoLabel(inv: PurchaseInvoiceRecord): string | undefined {
  return PURCHASE_INVOICE_DEMO_SCENARIO_LABELS[inv.id] ?? PURCHASE_INVOICE_DIRECT_DEMO_LABELS[inv.id];
}

function estimatedGrnValue(grn: GrnRecord) {
  return grn.items.reduce((s, item) => {
    const u = item.unit?.toLowerCase() ?? "";
    const rate = u === "bag" ? 1800 : u === "kg" ? 350 : u === "ltr" ? 900 : 500;
    return s + item.receivedQty * rate;
  }, 0);
}

function PurchaseInvoicesTabTable({
  toolbarRows,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  toolbarRows: PurchaseInvoiceRecord[];
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const visible = useAccountsFilteredRows(toolbarRows);
  const pagedRows = useMemo(
    () => visible.slice((page - 1) * pageSize, page * pageSize),
    [visible, page, pageSize],
  );

  return (
    <>
    <AccountsTable minWidth={1900}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="Invoice No" colKey="invoiceNo" />
            <SortTh label="Source Type" colKey="sourceType" />
            <SortTh label="Supplier" colKey="vendorName" className="accounts-col-party" />
            <SortTh label="Supplier Inv. No" colKey="vendorInvoiceNo" />
            <SortTh label="Invoice Date" colKey="invoiceDate" filterType="date" />
            <SortTh label="Purchase Nature" colKey="purchaseNature" />
            <SortTh label="Taxable Amount" colKey="taxableAmount" filterType="amount" align="right" />
            <SortTh label="GST Amount" colKey="gstAmount" filterType="amount" align="right" />
            <SortTh label="Net Payable" colKey="netPayable" filterType="amount" align="right" />
            <SortTh label="Due Date" colKey="dueDate" filterType="date" />
            <SortTh label="Approval" colKey="approvalStatus" />
            <SortTh label="Posting" colKey="postingStatus" />
            <SortTh label="Payment" colKey="paymentStatus" />
            <SortTh label="Attachment" colKey="hasAttachment" align="center" />
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
          {toolbarRows.length === 0 ? (
            <AccountsTableEmpty colSpan={16} message="No purchase invoices found." />
          ) : visible.length === 0 ? (
            <AccountsTableEmpty colSpan={16} message="No records match the column filters." />
          ) : (
            pagedRows.map((inv) => {
              const gst = getPurchaseInvoiceGstBreakup(inv);
              const gstAmount = gst.cgst + gst.sgst + gst.igst;
              const sourceType = resolvePurchaseSourceType(inv);
              const label = demoLabel(inv);
              return (
                <AccountsTableRow key={inv.id}>
                  <AccountsTableCell mono className="font-semibold text-brand-700">
                    <Link href={`/accounts/purchase-invoices/${inv.id}`} className="hover:underline">
                      {inv.invoiceNo}
                    </Link>
                    {label && (
                      <span className="block text-[10px] font-normal text-muted-foreground mt-0.5">{label}</span>
                    )}
                  </AccountsTableCell>
                  <AccountsTableCell>
                    <SourceTypeBadge type={sourceType} />
                  </AccountsTableCell>
                  <AccountsTableCell className="font-medium">{inv.vendorName}</AccountsTableCell>
                  <AccountsTableCell className="text-muted-foreground">{inv.vendorInvoiceNo || "—"}</AccountsTableCell>
                  <AccountsTableCell>{inv.invoiceDate}</AccountsTableCell>
                  <AccountsTableCell className="text-xs">
                    {inv.purchaseNature ? PURCHASE_NATURE_LABELS[inv.purchaseNature] : sourceType === "from_grn" ? "Inventory" : "—"}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money>{formatMoney(inv.taxableAmount ?? gst.taxableValue)}</AccountsTableCell>
                  <AccountsTableCell align="right" className="tabular-nums">{formatMoney(gstAmount)}</AccountsTableCell>
                  <AccountsTableCell align="right" money>{formatMoney(inv.netPayable ?? inv.grandTotal)}</AccountsTableCell>
                  <AccountsTableCell>{inv.dueDate || "—"}</AccountsTableCell>
                  <AccountsTableCell>
                    <AccountsVoucherStatusBadge workflow={inv.workflow} />
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs capitalize">
                    {getPurchaseInvoicePostingStatus(inv)}
                  </AccountsTableCell>
                  <AccountsTableCell>
                    <PaymentStatusBadge status={getPurchaseInvoicePaymentStatus(inv)} />
                  </AccountsTableCell>
                  <AccountsTableCell align="center">
                    <PurchaseInvoiceAttachmentLink attachment={inv.attachment} />
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className={accountsActionColClass("multi")}>
                    <AccountsTableActionCell>
                      <AccountsViewAction href={`/accounts/purchase-invoices/${inv.id}`} />
                      {sourceType === "from_grn" && (
                        <Link
                          href={`${DEBIT_NOTES_LIST_PATH}/new?purchaseInvoiceId=${inv.id}`}
                          title="Debit Note"
                          className={ACCOUNTS_ACTION_BTN_CLASS}
                        >
                          <FileMinus className="w-4 h-4 text-muted-foreground" />
                        </Link>
                      )}
                    </AccountsTableActionCell>
                  </AccountsTableCell>
                </AccountsTableRow>
              );
            })
          )}
        </AccountsTableBody>
      </AccountsTable>
      {visible.length > 0 && (
        <AccountsTablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={visible.length}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </>
  );
}

function GrnPendingTabTable({
  toolbarRows,
  router,
}: {
  toolbarRows: GrnRecord[];
  router: ReturnType<typeof useRouter>;
}) {
  const visible = useAccountsFilteredRows(toolbarRows);

  return (
    <AccountsTable minWidth={900}>
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <SortTh label="GRN No" colKey="grnNo" />
          <SortTh label="PO Number" colKey="poNumber" />
          <SortTh label="Supplier" colKey="vendorName" className="accounts-col-party" />
          <SortTh label="Warehouse" colKey="warehouse" />
          <SortTh label="Receipt Date" colKey="grnDate" filterType="date" />
          <SortTh label="Total Qty" colKey="totalQty" filterType="amount" align="center" />
          <SortTh label="Est. Value" colKey="estimatedValue" filterType="amount" align="right" />
          <AccountsColumnHeader
            label="Action"
            colKey="_actions"
            sortable={false}
            filterable={false}
          />
        </AccountsTableHeadRow>
      </AccountsTableHead>
      <AccountsTableBody>
        {toolbarRows.length === 0 ? (
          <AccountsTableEmpty colSpan={8} message="All completed GRNs have purchase invoices." />
        ) : visible.length === 0 ? (
          <AccountsTableEmpty colSpan={8} message="No records match the column filters." />
        ) : (
          visible.map((grn) => (
            <AccountsTableRow key={grn.id}>
              <AccountsTableCell mono className="font-semibold text-brand-700">{grn.grnNo}</AccountsTableCell>
              <AccountsTableCell mono className="text-muted-foreground">{grn.poNumber || "—"}</AccountsTableCell>
              <AccountsTableCell className="font-medium">{grn.vendorName}</AccountsTableCell>
              <AccountsTableCell className="text-muted-foreground">{grn.warehouse}</AccountsTableCell>
              <AccountsTableCell>{grn.grnDate}</AccountsTableCell>
              <AccountsTableCell align="center">{grn.totalQty}</AccountsTableCell>
              <AccountsTableCell align="right" className="tabular-nums text-muted-foreground">
                ~{formatMoney(estimatedGrnValue(grn))}
              </AccountsTableCell>
              <AccountsTableCell>
                <Button
                  size="sm"
                  className="h-9 text-sm font-medium bg-brand-600 text-white gap-1"
                  onClick={() => router.push(`/accounts/purchase-invoices/new?mode=grn&grnId=${grn.id}`)}
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
  );
}

function PurchaseInvoicesTabBody({
  filteredInvoices,
  search,
  setSearch,
  sourceTypeFilter,
  setSourceTypeFilter,
  natureFilter,
  setNatureFilter,
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
}: {
  filteredInvoices: PurchaseInvoiceRecord[];
  search: string;
  setSearch: (v: string) => void;
  sourceTypeFilter: SourceTypeFilter;
  setSourceTypeFilter: (v: SourceTypeFilter) => void;
  natureFilter: NatureFilter;
  setNatureFilter: (v: NatureFilter) => void;
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
}) {
  const columnFiltered = useAccountsFilteredRows(filteredInvoices);

  const exportCsv = () => {
    const headers = [
      "Invoice No",
      "Supplier Invoice No",
      "Supplier",
      "Date",
      "GRN No",
      "Taxable Value",
      "CGST",
      "SGST",
      "IGST",
      "Grand Total",
      "Paid",
      "Outstanding",
      "Status",
    ];
    const lines = columnFiltered.map((inv) => {
      const gst = getPurchaseInvoiceGstBreakup(inv);
      const outstandingAmt = Math.max(0, inv.grandTotal - inv.amountPaid);
      const status = { paid: "Paid", partial: "Partial", unpaid: "Unpaid" }[getPurchaseInvoicePaymentStatus(inv)];
      return [
        inv.invoiceNo,
        inv.vendorInvoiceNo,
        inv.vendorName,
        inv.invoiceDate,
        inv.grnNo,
        gst.taxableValue,
        gst.cgst,
        gst.sgst,
        gst.igst,
        inv.grandTotal,
        inv.amountPaid,
        outstandingAmt,
        status,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });
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
      toolbar={
        <AccountsListingFilterCard>
          <ReportFilterRow
            end={
              <AccountsExportMenu
                onExcel={exportCsv}
                onPdf={exportCsv}
                disabled={columnFiltered.length === 0}
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
              value={natureFilter}
              onChange={setNatureFilter}
              widthClass="w-[148px]"
              options={[
                { value: "all", label: "All Nature" },
                ...(Object.keys(PURCHASE_NATURE_LABELS) as PurchaseNature[]).map((k) => ({
                  value: k,
                  label: PURCHASE_NATURE_LABELS[k],
                })),
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
                  nature: natureFilter,
                },
                listingFilterDefaults(),
              )}
              onClick={() => {
                const defaults = listingFilterDefaults();
                setSearch(defaults.search);
                setSourceTypeFilter(defaults.sourceType);
                setNatureFilter(defaults.nature);
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
        columnFiltered.length > 0 ? (
          <AccountsListingCountFooter>
            Showing{" "}
            <span className="font-medium text-foreground">{columnFiltered.length}</span> invoices
          </AccountsListingCountFooter>
        ) : undefined
      }
    >
      <PurchaseInvoicesTabTable
        toolbarRows={filteredInvoices}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </AccountsTableListing>
  );
}

function GrnPendingTabBody({
  pendingGrns,
  router,
}: {
  pendingGrns: GrnRecord[];
  router: ReturnType<typeof useRouter>;
}) {
  const columnFiltered = useAccountsFilteredRows(pendingGrns);

  return (
    <AccountsTableListing
      footer={
        columnFiltered.length > 0 ? (
          <AccountsListingCountFooter>
            Showing{" "}
            <span className="font-medium text-foreground">{columnFiltered.length}</span> pending GRNs
          </AccountsListingCountFooter>
        ) : undefined
      }
    >
      <GrnPendingTabTable toolbarRows={pendingGrns} router={router} />
    </AccountsTableListing>
  );
}

export default function PurchaseInvoiceListClient() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("invoices");
  const [search, setSearch] = useState("");
  const [sourceTypeFilter, setSourceTypeFilter] = useState<SourceTypeFilter>("all");
  const [natureFilter, setNatureFilter] = useState<NatureFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } =
    useReportDateRange(LISTING_DEFAULT_PRESET);
  const sectionRefresh = useAccountsSectionRefresh("purchase-invoices");

  const invoices = useMemo(() => loadAllPurchaseInvoices(), [sectionRefresh]);
  const pendingGrns = useMemo(() => getGrnsPendingInvoice(), [sectionRefresh]);

  const filteredInvoices = useMemo(() => {
    let list = invoices;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.invoiceNo.toLowerCase().includes(q) ||
          i.vendorInvoiceNo.toLowerCase().includes(q) ||
          i.vendorName.toLowerCase().includes(q) ||
          i.grnNo.toLowerCase().includes(q),
      );
    }
    if (sourceTypeFilter !== "all") {
      list = list.filter((i) => resolvePurchaseSourceType(i) === sourceTypeFilter);
    }
    if (natureFilter !== "all") {
      list = list.filter((i) => i.purchaseNature === natureFilter);
    }
    if (dateFrom) list = list.filter((i) => i.invoiceDate >= dateFrom);
    if (dateTo) list = list.filter((i) => i.invoiceDate <= dateTo);
    return list;
  }, [invoices, search, sourceTypeFilter, natureFilter, dateFrom, dateTo]);

  const getInvoiceCellValue = useCallback((row: PurchaseInvoiceRecord, key: string) => {
    if (key === "paymentStatus") return getPurchaseInvoicePaymentStatus(row);
    if (key === "sourceType") return resolvePurchaseSourceType(row);
    if (key === "approvalStatus") return getPurchaseInvoiceApprovalStatus(row);
    if (key === "postingStatus") return getPurchaseInvoicePostingStatus(row);
    if (key === "hasAttachment") return hasPurchaseInvoiceAttachment(row.attachment);
    if (key === "taxableAmount") return row.taxableAmount ?? getPurchaseInvoiceGstBreakup(row).taxableValue;
    if (key === "gstAmount") {
      const g = getPurchaseInvoiceGstBreakup(row);
      return g.cgst + g.sgst + g.igst;
    }
    if (key === "netPayable") return row.netPayable ?? row.grandTotal;
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const getGrnCellValue = useCallback((row: GrnRecord, key: string) => {
    if (key === "estimatedValue") return estimatedGrnValue(row);
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const invoiceColumnConfig = useMemo(
    () => ({
      invoiceNo: { type: "text" as const },
      sourceType: { type: "text" as const },
      vendorName: { type: "text" as const },
      vendorInvoiceNo: { type: "text" as const },
      invoiceDate: { type: "date" as const },
      purchaseNature: { type: "text" as const },
      taxableAmount: { type: "amount" as const },
      gstAmount: { type: "amount" as const },
      netPayable: { type: "amount" as const },
      dueDate: { type: "date" as const },
      approvalStatus: { type: "text" as const },
      postingStatus: { type: "text" as const },
      paymentStatus: { type: "text" as const },
      hasAttachment: { type: "text" as const },
    }),
    [],
  );

  const grnColumnConfig = useMemo(
    () => ({
      grnNo: { type: "text" as const },
      poNumber: { type: "text" as const },
      vendorName: { type: "text" as const },
      warehouse: { type: "text" as const },
      grnDate: { type: "date" as const },
      totalQty: { type: "amount" as const },
      estimatedValue: { type: "amount" as const },
    }),
    [],
  );

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Transactions", "Purchase Invoices")}
      title="Purchase Invoices"
      description="GRN-based inventory invoices and direct purchases for expenses, services, and assets."
      hideDescription
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
      <div className="space-y-2">
        <PurchaseInvoiceTabs
          tab={tab}
          invoiceCount={invoices.length}
          pendingCount={pendingGrns.length}
          onTabChange={setTab}
        />
        {tab === "invoices" ? (
          <AccountsColumnFilterProvider
            key="invoices"
            rows={filteredInvoices}
            getCellValue={getInvoiceCellValue}
            columnConfig={invoiceColumnConfig}
            defaultSortKey="invoiceDate"
            defaultSortDir="desc"
          >
            <PurchaseInvoicesTabBody
              filteredInvoices={filteredInvoices}
              search={search}
              setSearch={setSearch}
              sourceTypeFilter={sourceTypeFilter}
              setSourceTypeFilter={setSourceTypeFilter}
              natureFilter={natureFilter}
              setNatureFilter={setNatureFilter}
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
            />
          </AccountsColumnFilterProvider>
        ) : (
          <AccountsColumnFilterProvider
            key="grn_pending"
            rows={pendingGrns}
            getCellValue={getGrnCellValue}
            columnConfig={grnColumnConfig}
            defaultSortKey="grnDate"
            defaultSortDir="desc"
          >
            <GrnPendingTabBody pendingGrns={pendingGrns} router={router} />
          </AccountsColumnFilterProvider>
        )}
      </div>
    </AccountsPageShell>
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
