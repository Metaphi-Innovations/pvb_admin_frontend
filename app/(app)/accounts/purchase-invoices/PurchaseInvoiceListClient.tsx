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
import { AccountsSummaryBar } from "@/components/accounts/AccountsSummaryBar";
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
} from "@/components/accounts/ReportFilters";
import { resetReportDateRange, accountsListingFiltersActive } from "@/lib/accounts/use-accounts-listing-reset";
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
  loadGrnPurchaseInvoices,
  getGrnsPendingInvoice,
  getPurchaseInvoiceGstBreakup,
  getPurchaseInvoicePaymentStatus,
  type PurchaseInvoiceRecord,
} from "./purchase-invoices-data";
import type { GrnRecord } from "@/app/(app)/warehouse/grn/types";
import "./purchase-invoice-listing.css";

type Tab = "invoices" | "grn_pending";
type PaymentStatus = "all" | "paid" | "partial" | "unpaid";

const PAYMENT_STATUS_LABELS: Record<Exclude<PaymentStatus, "all">, string> = {
  paid: "Paid",
  partial: "Partial",
  unpaid: "Unpaid",
};

function SourceBadge() {
  return (
    <Badge variant="outline" className="text-xs h-5 text-blue-700 border-blue-200 bg-blue-50">
      GRN
    </Badge>
  );
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
    <AccountsTable minWidth={1480}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="Invoice No" colKey="invoiceNo" />
            <SortTh label="Supplier Invoice No" colKey="vendorInvoiceNo" />
            <SortTh label="Supplier" colKey="vendorName" className="accounts-col-party" />
            <SortTh label="Date" colKey="invoiceDate" filterType="date" />
            <SortTh label="GRN No" colKey="grnNo" />
            <SortTh label="Source" colKey="source" />
            <SortTh label="Taxable Value" colKey="taxableValue" filterType="amount" align="right" />
            <SortTh label="CGST" colKey="cgst" filterType="amount" align="right" />
            <SortTh label="SGST" colKey="sgst" filterType="amount" align="right" />
            <SortTh label="IGST" colKey="igst" filterType="amount" align="right" />
            <SortTh label="Grand Total" colKey="grandTotal" filterType="amount" align="right" />
            <SortTh label="Paid" colKey="amountPaid" filterType="amount" align="right" />
            <SortTh label="Outstanding" colKey="outstanding" filterType="amount" align="right" />
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
            <AccountsTableEmpty colSpan={14} message="No purchase invoices found." />
          ) : visible.length === 0 ? (
            <AccountsTableEmpty colSpan={14} message="No records match the column filters." />
          ) : (
            pagedRows.map((inv) => {
              const gst = getPurchaseInvoiceGstBreakup(inv);
              const outstandingAmt = Math.max(0, inv.grandTotal - inv.amountPaid);
              return (
                <AccountsTableRow key={inv.id}>
                  <AccountsTableCell mono className="font-semibold text-brand-700">
                    <Link href={`/accounts/purchase-invoices/${inv.id}`} className="hover:underline">
                      {inv.invoiceNo}
                    </Link>
                  </AccountsTableCell>
                  <AccountsTableCell className="text-muted-foreground">{inv.vendorInvoiceNo || "—"}</AccountsTableCell>
                  <AccountsTableCell className="font-medium">{inv.vendorName}</AccountsTableCell>
                  <AccountsTableCell>{inv.invoiceDate}</AccountsTableCell>
                  <AccountsTableCell mono>{inv.grnNo || "—"}</AccountsTableCell>
                  <AccountsTableCell><SourceBadge /></AccountsTableCell>
                  <AccountsTableCell align="right" money>{formatMoney(gst.taxableValue)}</AccountsTableCell>
                  <AccountsTableCell align="right" className="tabular-nums">{formatMoney(gst.cgst)}</AccountsTableCell>
                  <AccountsTableCell align="right" className="tabular-nums">{formatMoney(gst.sgst)}</AccountsTableCell>
                  <AccountsTableCell align="right" className="tabular-nums">{formatMoney(gst.igst)}</AccountsTableCell>
                  <AccountsTableCell align="right" money>{formatMoney(inv.grandTotal)}</AccountsTableCell>
                  <AccountsTableCell align="right" className="text-emerald-700 tabular-nums">{formatMoney(inv.amountPaid)}</AccountsTableCell>
                  <AccountsTableCell align="right" className="text-red-600 font-semibold tabular-nums">{formatMoney(outstandingAmt)}</AccountsTableCell>
                  <AccountsTableCell align="right" className={accountsActionColClass("multi")}>
                    <AccountsTableActionCell>
                      <AccountsViewAction href={`/accounts/purchase-invoices/${inv.id}`} />
                      <Link
                        href={`${DEBIT_NOTES_LIST_PATH}/new?purchaseInvoiceId=${inv.id}`}
                        title="Debit Note"
                        className={ACCOUNTS_ACTION_BTN_CLASS}
                      >
                        <FileMinus className="w-4 h-4 text-muted-foreground" />
                      </Link>
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
  statusFilter,
  setStatusFilter,
  preset,
  setPreset,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  invoices,
  pendingGrns,
  outstanding,
  paidThisMonth,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  filteredInvoices: PurchaseInvoiceRecord[];
  search: string;
  setSearch: (v: string) => void;
  statusFilter: PaymentStatus;
  setStatusFilter: (v: PaymentStatus) => void;
  preset: ReturnType<typeof useReportDateRange>["preset"];
  setPreset: ReturnType<typeof useReportDateRange>["setPreset"];
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  invoices: PurchaseInvoiceRecord[];
  pendingGrns: GrnRecord[];
  outstanding: number;
  paidThisMonth: number;
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
      const status = PAYMENT_STATUS_LABELS[getPurchaseInvoicePaymentStatus(inv)];
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
      className="purchase-invoice-listing"
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
              placeholder="Search invoice no., supplier invoice no., supplier, GRN no…"
              className="min-w-[200px] flex-1 max-w-md"
            />
            <div className="flex items-end gap-1 flex-wrap">
              {(["all", "paid", "partial", "unpaid"] as PaymentStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    "h-7 px-2.5 text-xs rounded-lg border font-medium transition-colors",
                    statusFilter === st
                      ? "bg-brand-600 text-white border-brand-600"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {st === "all" ? "All" : PAYMENT_STATUS_LABELS[st]}
                </button>
              ))}
            </div>
            <ReportDateRangeFilter
              preset={preset}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onPresetChange={setPreset}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
            <ReportFilterResetButton
              showOnlyWhenActive
              active={
                accountsListingFiltersActive(
                  { search, preset, dateFrom, dateTo, status: statusFilter === "all" ? "" : statusFilter },
                  { search: "", preset: "this_month", dateFrom: "", dateTo: "", status: "" },
                )
              }
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                resetReportDateRange(setPreset, setDateFrom, setDateTo, "this_month");
              }}
            />
          </ReportFilterRow>
        </AccountsListingFilterCard>
      }
      summary={
        <AccountsSummaryBar
          items={[
            { label: "Total Invoices", value: String(invoices.length) },
            { label: "GRN Pending", value: String(pendingGrns.length), warn: pendingGrns.length > 0 },
            { label: "Outstanding Payable", value: formatMoney(outstanding) },
            { label: "Paid This Month", value: formatMoney(paidThisMonth) },
          ]}
        />
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
  invoices,
  outstanding,
  paidThisMonth,
  router,
}: {
  pendingGrns: GrnRecord[];
  invoices: PurchaseInvoiceRecord[];
  outstanding: number;
  paidThisMonth: number;
  router: ReturnType<typeof useRouter>;
}) {
  const columnFiltered = useAccountsFilteredRows(pendingGrns);

  return (
    <AccountsTableListing
      className="purchase-invoice-listing"
      summary={
        <AccountsSummaryBar
          items={[
            { label: "Total Invoices", value: String(invoices.length) },
            { label: "GRN Pending", value: String(pendingGrns.length), warn: pendingGrns.length > 0 },
            { label: "Outstanding Payable", value: formatMoney(outstanding) },
            { label: "Paid This Month", value: formatMoney(paidThisMonth) },
          ]}
        />
      }
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
  const [statusFilter, setStatusFilter] = useState<PaymentStatus>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_month");
  const sectionRefresh = useAccountsSectionRefresh("purchase-invoices");

  const invoices = useMemo(() => loadGrnPurchaseInvoices(), [sectionRefresh]);
  const pendingGrns = useMemo(() => getGrnsPendingInvoice(), []);

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
    if (statusFilter !== "all") {
      list = list.filter((i) => getPurchaseInvoicePaymentStatus(i) === statusFilter);
    }
    if (dateFrom) list = list.filter((i) => i.invoiceDate >= dateFrom);
    if (dateTo) list = list.filter((i) => i.invoiceDate <= dateTo);
    return list;
  }, [invoices, search, statusFilter, dateFrom, dateTo]);

  const outstanding = invoices.reduce(
    (s, i) => s + Math.max(0, i.grandTotal - i.amountPaid),
    0,
  );
  const paidThisMonth = invoices.reduce((s, i) => s + i.amountPaid, 0);

  const getInvoiceCellValue = useCallback((row: PurchaseInvoiceRecord, key: string) => {
    if (key === "paymentStatus") return getPurchaseInvoicePaymentStatus(row);
    if (key === "source") return "GRN";
    if (key === "outstanding") return Math.max(0, row.grandTotal - row.amountPaid);
    const gst = getPurchaseInvoiceGstBreakup(row);
    if (key === "taxableValue") return gst.taxableValue;
    if (key === "cgst") return gst.cgst;
    if (key === "sgst") return gst.sgst;
    if (key === "igst") return gst.igst;
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const getGrnCellValue = useCallback((row: GrnRecord, key: string) => {
    if (key === "estimatedValue") return estimatedGrnValue(row);
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const invoiceColumnConfig = useMemo(
    () => ({
      invoiceNo: { type: "text" as const },
      vendorInvoiceNo: { type: "text" as const },
      vendorName: { type: "text" as const },
      invoiceDate: { type: "date" as const },
      grnNo: { type: "text" as const },
      source: { type: "text" as const },
      taxableValue: { type: "amount" as const },
      cgst: { type: "amount" as const },
      sgst: { type: "amount" as const },
      igst: { type: "amount" as const },
      grandTotal: { type: "amount" as const },
      amountPaid: { type: "amount" as const },
      outstanding: { type: "amount" as const },
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
      description="Create supplier purchase bills from completed GRNs."
      hideDescription
      layout="split"
      className="h-full min-h-0"
      actions={
        <Button
          size="sm"
          className="h-9 text-sm font-medium gap-1.5 bg-brand-600 hover:bg-brand-700 text-white px-2.5"
          onClick={() => router.push("/accounts/purchase-invoices/new?mode=grn")}
        >
          <Truck className="w-4 h-4" />
          From GRN
        </Button>
      }
    >
      <div className="flex flex-col flex-1 min-h-0">
        <PurchaseInvoiceTabs
          tab={tab}
          invoiceCount={invoices.length}
          pendingCount={pendingGrns.length}
          onTabChange={setTab}
          className="flex-shrink-0 px-1 mb-2"
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
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              preset={preset}
              setPreset={setPreset}
              dateFrom={dateFrom}
              setDateFrom={setDateFrom}
              dateTo={dateTo}
              setDateTo={setDateTo}
              invoices={invoices}
              pendingGrns={pendingGrns}
              outstanding={outstanding}
              paidThisMonth={paidThisMonth}
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
            <GrnPendingTabBody
              pendingGrns={pendingGrns}
              invoices={invoices}
              outstanding={outstanding}
              paidThisMonth={paidThisMonth}
              router={router}
            />
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
  className,
}: {
  tab: Tab;
  invoiceCount: number;
  pendingCount: number;
  onTabChange?: (tab: Tab) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
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
