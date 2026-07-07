"use client";



import { useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import Link from "next/link";

import {

  FileText,

  Truck,

  FileMinus,

} from "lucide-react";

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

  AccountsTableHeadCell,

  AccountsTableHeadRow,

  AccountsTableRow,

} from "@/components/accounts/AccountsTable";

import {

  AccountsTableEmpty,

  AccountsTableListing,

  AccountsTableToolbar,

  AccountsListingCountFooter,

} from "@/components/accounts/AccountsTableListing";

import {

  ReportDateRangeFilter,

  useReportDateRange,

} from "@/components/accounts/ReportFilters";

import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";

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



function PaymentBadge({ inv }: { inv: PurchaseInvoiceRecord }) {

  const st = getPurchaseInvoicePaymentStatus(inv);

  if (st === "paid")

    return <Badge className="text-xs h-5 bg-emerald-100 text-emerald-700 border-emerald-200">Paid</Badge>;

  if (st === "partial")

    return <Badge className="text-xs h-5 bg-amber-100 text-amber-700 border-amber-200">Partial</Badge>;

  return <Badge className="text-xs h-5 bg-red-100 text-red-700 border-red-200">Unpaid</Badge>;

}



function SourceBadge() {

  return (

    <Badge variant="outline" className="text-xs h-5 text-blue-700 border-blue-200 bg-blue-50">

      GRN

    </Badge>

  );

}



function EstimatedValue(grn: GrnRecord) {

  const est = grn.items.reduce((s, item) => {

    const u = item.unit?.toLowerCase() ?? "";

    const rate = u === "bag" ? 1800 : u === "kg" ? 350 : u === "ltr" ? 900 : 500;

    return s + item.receivedQty * rate;

  }, 0);

  return est;

}



export default function PurchaseInvoiceListClient() {

  const router = useRouter();

  const [tab, setTab] = useState<Tab>("invoices");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<PaymentStatus>("all");

  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_month");



  const invoices = useMemo(() => loadGrnPurchaseInvoices(), []);

  const pendingGrns = useMemo(() => getGrnsPendingInvoice(), []);



  const filtered = useMemo(() => {

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

    const lines = filtered.map((inv) => {

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

      <AccountsTableListing

        className="purchase-invoice-listing"

        toolbar={

          tab === "invoices" ? (

            <AccountsTableToolbar

              search={{

                value: search,

                onChange: setSearch,

                placeholder: "Search invoice no., supplier invoice no., supplier, GRN no…",

              }}

              filters={

                <>

                  <ReportDateRangeFilter

                    preset={preset}

                    dateFrom={dateFrom}

                    dateTo={dateTo}

                    onPresetChange={setPreset}

                    onDateFromChange={setDateFrom}

                    onDateToChange={setDateTo}

                  />

                  <div className="flex items-center gap-1">

                    {(["all", "paid", "partial", "unpaid"] as PaymentStatus[]).map((st) => (

                      <button

                        key={st}

                        type="button"

                        onClick={() => setStatusFilter(st)}

                        className={cn(

                          "h-7 px-2.5 text-sm rounded-lg border font-medium transition-colors",

                          statusFilter === st

                            ? "bg-brand-600 text-white border-brand-600"

                            : "border-border text-muted-foreground hover:bg-muted",

                        )}

                      >

                        {st === "all" ? "All" : PAYMENT_STATUS_LABELS[st]}

                      </button>

                    ))}

                  </div>

                </>

              }

              onExcel={exportCsv}

              onPdf={exportCsv}

              exportDisabled={filtered.length === 0}

            />

          ) : undefined

        }

        subheader={
            <div className="flex items-center gap-1">
              <TabBtn active={tab === "invoices"} onClick={() => setTab("invoices")}>

                <FileText className="w-4 h-4" />

                All Invoices

                <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs font-semibold tabular-nums">

                  {invoices.length}

                </span>

              </TabBtn>

              <TabBtn active={tab === "grn_pending"} onClick={() => setTab("grn_pending")}>

                <Truck className="w-4 h-4" />

                GRN Pending Invoice

                {pendingGrns.length > 0 && (

                  <span className="ml-1 rounded-full bg-amber-500 text-white px-1.5 py-0.5 text-xs font-semibold tabular-nums">

                    {pendingGrns.length}

                  </span>

                )}

              </TabBtn>
            </div>
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

          (tab === "invoices" ? filtered.length : pendingGrns.length) > 0 ? (

            <AccountsListingCountFooter>

              Showing{" "}

              <span className="font-medium text-foreground">

                {tab === "invoices" ? filtered.length : pendingGrns.length}

              </span>{" "}

              {tab === "invoices" ? "invoices" : "pending GRNs"}

            </AccountsListingCountFooter>

          ) : undefined

        }

      >

        {tab === "invoices" ? (

          <AccountsTable minWidth={1480}>

            <AccountsTableHead>

              <AccountsTableHeadRow>

                <AccountsTableHeadCell uppercase>Invoice No</AccountsTableHeadCell>

                <AccountsTableHeadCell uppercase>Supplier Invoice No</AccountsTableHeadCell>

                <AccountsTableHeadCell uppercase className="accounts-col-party">Supplier</AccountsTableHeadCell>

                <AccountsTableHeadCell uppercase>Date</AccountsTableHeadCell>

                <AccountsTableHeadCell uppercase>GRN No</AccountsTableHeadCell>

                <AccountsTableHeadCell uppercase>Source</AccountsTableHeadCell>

                <AccountsTableHeadCell align="right" uppercase>Taxable Value</AccountsTableHeadCell>

                <AccountsTableHeadCell align="right" uppercase>CGST</AccountsTableHeadCell>

                <AccountsTableHeadCell align="right" uppercase>SGST</AccountsTableHeadCell>

                <AccountsTableHeadCell align="right" uppercase>IGST</AccountsTableHeadCell>

                <AccountsTableHeadCell align="right" uppercase>Grand Total</AccountsTableHeadCell>

                <AccountsTableHeadCell align="right" uppercase>Paid</AccountsTableHeadCell>

                <AccountsTableHeadCell align="right" uppercase>Outstanding</AccountsTableHeadCell>

                <AccountsTableHeadCell uppercase>Status</AccountsTableHeadCell>

                <AccountsTableHeadCell align="right" uppercase className={accountsActionColClass("multi")}>Actions</AccountsTableHeadCell>

              </AccountsTableHeadRow>

            </AccountsTableHead>

            <AccountsTableBody>

              {filtered.length === 0 ? (

                <AccountsTableEmpty colSpan={15} message="No purchase invoices found." />

              ) : (

                filtered.map((inv) => {

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

                      <AccountsTableCell><PaymentBadge inv={inv} /></AccountsTableCell>

                      <AccountsTableCell align="right" className={accountsActionColClass("multi")}>

                        <AccountsTableActionCell>

                          <AccountsViewAction href={`/accounts/purchase-invoices/${inv.id}`} />

                          <Link

                            href={`/accounts/debit-notes/new?purchaseInvoiceId=${inv.id}`}

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

        ) : (

          <AccountsTable minWidth={900}>

            <AccountsTableHead>

              <AccountsTableHeadRow>

                <AccountsTableHeadCell uppercase>GRN No</AccountsTableHeadCell>

                <AccountsTableHeadCell uppercase>PO Number</AccountsTableHeadCell>

                <AccountsTableHeadCell uppercase>Supplier</AccountsTableHeadCell>

                <AccountsTableHeadCell uppercase>Warehouse</AccountsTableHeadCell>

                <AccountsTableHeadCell uppercase>Receipt Date</AccountsTableHeadCell>

                <AccountsTableHeadCell align="center" uppercase>Total Qty</AccountsTableHeadCell>

                <AccountsTableHeadCell align="right" uppercase>Est. Value</AccountsTableHeadCell>

                <AccountsTableHeadCell uppercase>Action</AccountsTableHeadCell>

              </AccountsTableHeadRow>

            </AccountsTableHead>

            <AccountsTableBody>

              {pendingGrns.length === 0 ? (

                <AccountsTableEmpty colSpan={8} message="All completed GRNs have purchase invoices." />

              ) : (

                pendingGrns.map((grn) => (

                  <AccountsTableRow key={grn.id}>

                    <AccountsTableCell mono className="font-semibold text-brand-700">{grn.grnNo}</AccountsTableCell>

                    <AccountsTableCell mono className="text-muted-foreground">{grn.poNumber || "—"}</AccountsTableCell>

                    <AccountsTableCell className="font-medium">{grn.vendorName}</AccountsTableCell>

                    <AccountsTableCell className="text-muted-foreground">{grn.warehouse}</AccountsTableCell>

                    <AccountsTableCell>{grn.grnDate}</AccountsTableCell>

                    <AccountsTableCell align="center">{grn.totalQty}</AccountsTableCell>

                    <AccountsTableCell align="right" className="tabular-nums text-muted-foreground">~{formatMoney(EstimatedValue(grn))}</AccountsTableCell>

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

        )}

      </AccountsTableListing>

    </AccountsPageShell>

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


