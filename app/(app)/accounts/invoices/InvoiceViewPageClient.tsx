"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Banknote, Calendar, Download, Eye, FileText, Pencil, Receipt } from "lucide-react";
import { RecordDetailPage } from "@/components/record-detail";
import { InvoiceStatusBadge } from "./components/InvoiceStatusBadge";
import { InvoicePaymentStatusBadge } from "./components/InvoicePaymentStatusBadge";
import { InvoiceReceivePaymentModal } from "./components/InvoiceReceivePaymentModal";
import { InvoiceCancelDialog } from "./components/InvoiceCancelDialog";
import {
  cancelInvoice,
  getInvoiceById,
  getInvoiceRowActions,
  markInvoiceSent,
  receiveInvoicePayment,
  type InvoiceRecord,
} from "./invoices-data";
import { downloadInvoicePdf } from "./invoice-pdf";
import { formatINR, INVOICES_LIST_PATH } from "./invoice-utils";
import { SalesInvoiceAccountingPanel } from "@/components/accounts/SalesInvoiceAccountingPanel";
import { loadCreditNotes } from "@/app/(app)/accounts/credit-notes/credit-notes-data";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xs font-medium mt-0.5">{value ?? "—"}</p>
    </div>
  );
}

function invoiceStatusVariant(status: string): "active" | "inactive" | "draft" | "blocked" | "neutral" {
  if (status === "draft") return "draft";
  if (status === "sent") return "active";
  if (status === "cancelled") return "blocked";
  return "neutral";
}

export default function InvoiceViewPageClient({ invoiceId }: { invoiceId: number }) {
  const router = useRouter();
  const [record, setRecord] = useState<InvoiceRecord | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const refresh = () => {
    const r = getInvoiceById(invoiceId);
    if (!r) {
      router.replace(INVOICES_LIST_PATH);
      return;
    }
    setRecord(r);
  };

  useEffect(() => {
    refresh();
  }, [invoiceId]);

  if (!record) return null;

  const actions = getInvoiceRowActions(record);
  const creditNotes = loadCreditNotes().filter((cn) => cn.sourceInvoiceId === record.id);

  return (
    <RecordDetailPage
      embedded
      listHref={INVOICES_LIST_PATH}
      listLabel="Invoices"
      recordName={record.customerName}
      recordCode={record.invoiceNo}
      statusLabel={record.invoiceStatus.charAt(0).toUpperCase() + record.invoiceStatus.slice(1)}
      statusVariant={invoiceStatusVariant(record.invoiceStatus)}
      metaItems={[
        { icon: Calendar, label: record.invoiceDate },
        { label: `Due ${record.dueDate}` },
      ]}
      onEdit={actions.includes("edit") ? () => router.push(`${INVOICES_LIST_PATH}/${record.id}/edit`) : undefined}
      secondaryAction={
        actions.includes("receive")
          ? { label: "Receive Payment", onClick: () => setPayOpen(true) }
          : undefined
      }
      headerActions={
        <div className="flex items-center gap-2 flex-wrap">
          {actions.includes("post") && (
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
              onClick={() => {
                markInvoiceSent(record.id);
                refresh();
              }}
            >
              Post Invoice
            </Button>
          )}
          {actions.includes("credit_note") && (
            <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1">
              <Link href={`/accounts/transactions/credit-notes/new?invoiceId=${record.id}`}>
                <Receipt className="w-3.5 h-3.5" /> Create Credit Note
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => downloadInvoicePdf(record)}>
            <Download className="w-3.5 h-3.5" /> Print / PDF
          </Button>
          {actions.includes("receive") && (
            <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1" onClick={() => setPayOpen(true)}>
              <Banknote className="w-3.5 h-3.5" /> Receive Payment
            </Button>
          )}
        </div>
      }
      sidebar={{
        summary: [
          { label: "Subtotal", value: formatINR(record.subtotal) },
          { label: "Discount", value: formatINR(record.discountTotal) },
          { label: "Tax", value: formatINR(record.taxAmount) },
          { label: "Grand Total", value: formatINR(record.grandTotal), highlight: true },
          { label: "Received", value: formatINR(record.amountReceived) },
          { label: "Balance", value: formatINR(record.balanceAmount) },
        ],
        activity: [...record.activity].reverse().slice(0, 5).map((a, i) => ({
          id: `${a.at}-${i}`,
          title: a.action.replaceAll("_", " "),
          subtitle: a.detail,
          date: new Date(a.at).toLocaleString(),
        })),
        quickActions: [
          {
            label: "Download PDF",
            icon: Download,
            variant: "outline" as const,
            onClick: () => downloadInvoicePdf(record),
          },
          ...(actions.includes("cancel")
            ? [
                {
                  label: "Cancel Invoice",
                  onClick: () => setCancelOpen(true),
                  variant: "outline" as const,
                },
              ]
            : []),
        ],
      }}
    >
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-white border border-border/60 h-9 p-0.5">
          <TabsTrigger value="overview" className="text-xs h-8">Overview</TabsTrigger>
          <TabsTrigger value="items" className="text-xs h-8">Items</TabsTrigger>
          <TabsTrigger value="ledger" className="text-xs h-8">Ledger Impact</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs h-8">Payments / Receipts</TabsTrigger>
          <TabsTrigger value="credits" className="text-xs h-8">Credit Notes</TabsTrigger>
          <TabsTrigger value="activity" className="text-xs h-8">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 m-0">
          <div className="flex items-center gap-2 flex-wrap">
            <InvoiceStatusBadge status={record.invoiceStatus} />
            <InvoicePaymentStatusBadge status={record.paymentStatus} />
          </div>
          <div className="bg-white rounded-lg border border-border/60 p-4">
            <h2 className="text-sm font-semibold mb-3">Customer Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <DetailRow label="Customer Name" value={record.customerName} />
              <DetailRow label="Sales Order" value={record.salesOrderNo || record.referenceNo} />
              <DetailRow label="Dispatch" value={record.dispatchNo} />
              <DetailRow label="Mobile" value={record.customerMobile} />
              <DetailRow label="Email" value={record.customerEmail} />
              <DetailRow label="GSTIN" value={record.customerGst} />
              <DetailRow label="Billing Address" value={record.billingAddress} />
              <DetailRow label="Due Date" value={record.dueDate} />
              <DetailRow label="Grand Total" value={formatINR(record.grandTotal)} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="items" className="m-0">
          <div className="bg-white rounded-lg border border-border/60 p-4 overflow-x-auto">
            <table className="w-full text-xs min-w-[640px]">
              <thead className="border-b">
                <tr>
                  {["Product", "Qty", "Unit", "Rate", "Tax%", "Amount"].map((h) => (
                    <th key={h} className="py-1.5 text-left text-[10px] uppercase text-muted-foreground font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {record.lineItems.map((l) => (
                  <tr key={l.id} className="border-b border-border/40">
                    <td className="py-1.5">{l.productName}</td>
                    <td className="py-1.5">{l.qty}</td>
                    <td className="py-1.5">{l.unit}</td>
                    <td className="py-1.5 tabular-nums">{formatINR(l.unitPrice)}</td>
                    <td className="py-1.5">{l.taxPct}%</td>
                    <td className="py-1.5 tabular-nums font-medium">{formatINR(l.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="ledger" className="m-0">
          {record.invoiceStatus !== "cancelled" && <SalesInvoiceAccountingPanel invoice={record} />}
        </TabsContent>

        <TabsContent value="payments" className="m-0">
          <div className="bg-white rounded-lg border border-border/60 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Payment History</h2>
              <p className="text-xs font-semibold text-emerald-700">Total Received: {formatINR(record.amountReceived)}</p>
            </div>
            {record.collections.length === 0 ? (
              <p className="text-xs text-muted-foreground">No payments received yet. Balance {formatINR(record.balanceAmount)}.</p>
            ) : (
              <div className="space-y-3">
                {record.collections.map((c, i) => (
                  <div key={c.id} className="text-xs border-l-2 border-brand-200 pl-3">
                    <p className="font-medium">Payment {i + 1} · {formatINR(c.amount)}</p>
                    <p className="text-muted-foreground">Date: {c.paymentDate} · Mode: {c.paymentMode}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="credits" className="m-0">
          <div className="bg-white rounded-lg border border-border/60 p-4">
            {creditNotes.length === 0 ? (
              <p className="text-xs text-muted-foreground">No credit notes against this invoice.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {creditNotes.map((cn) => (
                  <li key={cn.id}>
                    <Link href={`/accounts/transactions/credit-notes/${cn.id}`} className="text-brand-700 hover:underline font-medium">
                      {cn.creditNoteNo}
                    </Link>
                    {" — "}
                    {formatINR(cn.currentCreditAmount)} ({cn.status})
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="m-0">
          <div className="bg-white rounded-lg border border-border/60 p-4">
            <div className="space-y-2">
              {[...record.activity].reverse().map((a, i) => (
                <div key={i} className="text-xs border-l-2 border-muted pl-3 py-0.5">
                  <p className="font-medium capitalize">{a.action.replaceAll("_", " ")}</p>
                  <p className="text-muted-foreground">{a.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <InvoiceReceivePaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        invoice={record}
        onConfirm={(payload) => {
          receiveInvoicePayment(record.id, payload);
          refresh();
        }}
      />

      <InvoiceCancelDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        invoiceNo={record.invoiceNo}
        onConfirm={(reason) => {
          cancelInvoice(record.id, reason);
          refresh();
        }}
      />
    </RecordDetailPage>
  );
}
