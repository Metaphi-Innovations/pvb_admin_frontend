"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ModuleFiltersBar } from "@/components/module/ModuleFiltersBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Banknote,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Mail,
  MoreVertical,
  Pencil,
  Plus,
  Receipt,
  Send,
  XCircle,
} from "lucide-react";
import { SectionTabs } from "../components/AccountsUI";
import {
  cancelInvoice,
  computeInvoiceTabCounts,
  filterInvoices,
  getInvoiceRowActions,
  listInvoiceCreators,
  loadInvoices,
  markInvoiceSent,
  receiveInvoicePayment,
  type InvoiceRecord,
} from "./invoices-data";
import { InvoiceStatusBadge } from "./components/InvoiceStatusBadge";
import { InvoicePaymentStatusBadge } from "./components/InvoicePaymentStatusBadge";
import { InvoiceReceivePaymentModal } from "./components/InvoiceReceivePaymentModal";
import { InvoiceCancelDialog } from "./components/InvoiceCancelDialog";
import { exportInvoicesToExcel } from "./invoices-export";
import { downloadInvoicePdf } from "./invoice-pdf";
import { formatINR, INVOICES_BREADCRUMB, INVOICES_LIST_PATH } from "./invoice-utils";

const TABS = [
  { id: "all", label: "All Invoices" },
  { id: "draft", label: "Draft" },
  { id: "sent", label: "Sent" },
  { id: "partially_paid", label: "Partially Paid" },
  { id: "paid", label: "Paid" },
  { id: "cancelled", label: "Cancelled" },
];

export default function InvoicesPageClient() {
  const [records, setRecords] = useState<InvoiceRecord[]>([]);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [invoiceStatus, setInvoiceStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [createdBy, setCreatedBy] = useState("all");
  const [receiveTarget, setReceiveTarget] = useState<InvoiceRecord | null>(null);
  const [cancelTarget, setCancelTarget] = useState<InvoiceRecord | null>(null);
  const [exporting, setExporting] = useState(false);

  const refresh = useCallback(() => setRecords(loadInvoices()), []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const creators = useMemo(() => listInvoiceCreators(records), [records]);

  const listFilters = useMemo(
    () => ({ tab, search, invoiceStatus, paymentStatus, dateFrom, dateTo, createdBy }),
    [tab, search, invoiceStatus, paymentStatus, dateFrom, dateTo, createdBy],
  );
  const visible = useMemo(() => filterInvoices(records, listFilters), [records, listFilters]);
  const counts = useMemo(() => computeInvoiceTabCounts(records), [records]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportInvoicesToExcel(visible);
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-[1680px] mx-auto space-y-3">
        <PageHeader
          title="Invoices"
          description="Customer invoices and collection tracking. Simple billing for finance teams."
          icon={FileText}
          breadcrumbs={INVOICES_BREADCRUMB}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                disabled={exporting || visible.length === 0}
                onClick={handleExport}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                {exporting ? "Exporting…" : "Export Excel"}
              </Button>
              <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white" asChild>
                <Link href={`${INVOICES_LIST_PATH}/new`}>
                  <Plus className="w-3.5 h-3.5" />
                  Create Invoice
                </Link>
              </Button>
            </div>
          }
        />

        <SectionTabs tabs={TABS} active={tab} onChange={setTab} counts={counts} />

        <ModuleFiltersBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Invoice no., customer…">
          <Select value={invoiceStatus} onValueChange={setInvoiceStatus}>
            <SelectTrigger className="h-8 w-[130px] text-xs bg-white">
              <SelectValue placeholder="Invoice status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Invoice Status</SelectItem>
              <SelectItem value="draft" className="text-xs">Draft</SelectItem>
              <SelectItem value="sent" className="text-xs">Sent</SelectItem>
              <SelectItem value="cancelled" className="text-xs">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={paymentStatus} onValueChange={setPaymentStatus}>
            <SelectTrigger className="h-8 w-[140px] text-xs bg-white">
              <SelectValue placeholder="Payment status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Payment Status</SelectItem>
              <SelectItem value="unpaid" className="text-xs">Unpaid</SelectItem>
              <SelectItem value="partially_paid" className="text-xs">Partially Paid</SelectItem>
              <SelectItem value="paid" className="text-xs">Paid</SelectItem>
            </SelectContent>
          </Select>
          <Select value={createdBy} onValueChange={setCreatedBy}>
            <SelectTrigger className="h-8 w-[120px] text-xs bg-white">
              <SelectValue placeholder="Created by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Users</SelectItem>
              {creators.map((c) => (
                <SelectItem key={c} value={c} className="text-xs">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" className="h-8 w-[130px] text-xs" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input type="date" className="h-8 w-[130px] text-xs" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </ModuleFiltersBar>

        <div className="page-shell overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-300px)]">
            <table className="w-full text-table min-w-[1680px]">
              <thead className="sticky top-0 z-10 bg-white border-b border-border">
                <tr>
                  {[
                    "Invoice No.",
                    "Invoice Date",
                    "Customer Name",
                    "Mobile",
                    "Total",
                    "Tax",
                    "Grand Total",
                    "Received",
                    "Balance",
                    "Payment Status",
                    "Invoice Status",
                    "Created By",
                    "Updated By",
                    "",
                  ].map((h) => (
                    <th
                      key={h || "a"}
                      className="px-2.5 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-12 text-center text-xs text-muted-foreground">
                      No invoices yet. Create your first customer invoice.
                    </td>
                  </tr>
                ) : (
                  visible.map((r) => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-brand-50/25">
                      <td className="px-2.5 py-2 text-xs font-mono font-medium">{r.invoiceNo}</td>
                      <td className="px-2.5 py-2 text-xs text-muted-foreground">{r.invoiceDate}</td>
                      <td className="px-2.5 py-2 text-xs">{r.customerName}</td>
                      <td className="px-2.5 py-2 text-xs text-muted-foreground">{r.customerMobile || "—"}</td>
                      <td className="px-2.5 py-2 text-xs text-right font-medium tabular-nums">{formatINR(r.subtotal)}</td>
                      <td className="px-2.5 py-2 text-xs text-right font-medium tabular-nums">{formatINR(r.taxAmount)}</td>
                      <td className="px-2.5 py-2 text-xs text-right font-medium tabular-nums">{formatINR(r.grandTotal)}</td>
                      <td className="px-2.5 py-2 text-xs text-right font-medium tabular-nums">{formatINR(r.amountReceived)}</td>
                      <td className="px-2.5 py-2 text-xs text-right font-medium tabular-nums">{formatINR(r.balanceAmount)}</td>
                      <td className="px-2.5 py-2">
                        <InvoicePaymentStatusBadge status={r.paymentStatus} />
                      </td>
                      <td className="px-2.5 py-2">
                        <InvoiceStatusBadge status={r.invoiceStatus} />
                      </td>
                      <td className="px-2.5 py-2 text-xs text-muted-foreground">{r.createdBy}</td>
                      <td className="px-2.5 py-2 text-xs text-muted-foreground">{r.updatedBy}</td>
                      <td className="px-2.5 py-2 sticky right-0 bg-white">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {getInvoiceRowActions(r).map((a) => {
                              if (a === "view")
                                return (
                                  <DropdownMenuItem key="view" asChild>
                                    <Link href={`${INVOICES_LIST_PATH}/${r.id}`} className="text-xs gap-2">
                                      <Eye className="w-3.5 h-3.5" /> View
                                    </Link>
                                  </DropdownMenuItem>
                                );
                              if (a === "edit")
                                return (
                                  <DropdownMenuItem key="edit" asChild>
                                    <Link href={`${INVOICES_LIST_PATH}/${r.id}/edit`} className="text-xs gap-2">
                                      <Pencil className="w-3.5 h-3.5" /> Edit
                                    </Link>
                                  </DropdownMenuItem>
                                );
                              if (a === "pdf")
                                return (
                                  <DropdownMenuItem key="pdf" className="text-xs gap-2" onClick={() => downloadInvoicePdf(r)}>
                                    <Download className="w-3.5 h-3.5" /> Download PDF
                                  </DropdownMenuItem>
                                );
                              if (a === "email")
                                return (
                                  <DropdownMenuItem key="email" className="text-xs gap-2 text-muted-foreground" disabled>
                                    <Mail className="w-3.5 h-3.5" /> Send Email (soon)
                                  </DropdownMenuItem>
                                );
                              if (a === "receive")
                                return (
                                  <DropdownMenuItem
                                    key="receive"
                                    className="text-xs gap-2 text-brand-700"
                                    onClick={() => setReceiveTarget(r)}
                                  >
                                    <Banknote className="w-3.5 h-3.5" /> Receive Payment
                                  </DropdownMenuItem>
                                );
                              if (a === "cancel")
                                return (
                                  <DropdownMenuItem
                                    key="cancel"
                                    className="text-xs gap-2 text-red-600"
                                    onClick={() => setCancelTarget(r)}
                                  >
                                    <XCircle className="w-3.5 h-3.5" /> Cancel
                                  </DropdownMenuItem>
                                );
                              if (a === "post")
                                return (
                                  <DropdownMenuItem
                                    key="post"
                                    className="text-xs gap-2 text-brand-700"
                                    onClick={() => {
                                      markInvoiceSent(r.id);
                                      refresh();
                                    }}
                                  >
                                    <Send className="w-3.5 h-3.5" /> Post Invoice
                                  </DropdownMenuItem>
                                );
                              if (a === "credit_note")
                                return (
                                  <DropdownMenuItem key="credit_note" asChild>
                                    <Link
                                      href={`/accounts/transactions/credit-notes/new?invoiceId=${r.id}`}
                                      className="text-xs gap-2"
                                    >
                                      <Receipt className="w-3.5 h-3.5" /> Create Credit Note
                                    </Link>
                                  </DropdownMenuItem>
                                );
                              return null;
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <InvoiceReceivePaymentModal
        open={!!receiveTarget}
        onClose={() => setReceiveTarget(null)}
        invoice={receiveTarget}
        onConfirm={(payload) => {
          if (!receiveTarget) return;
          receiveInvoicePayment(receiveTarget.id, payload);
          refresh();
          setReceiveTarget(null);
        }}
      />

      <InvoiceCancelDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        invoiceNo={cancelTarget?.invoiceNo ?? ""}
        onConfirm={(reason) => {
          if (!cancelTarget) return;
          cancelInvoice(cancelTarget.id, reason);
          refresh();
          setCancelTarget(null);
        }}
      />
    </AppLayout>
  );
}
