"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Banknote, Download, Eye, Pencil } from "lucide-react";
import { AccountsFormLayout } from "../expenses/components/AccountsFormLayout";
import { InvoiceStatusBadge } from "./components/InvoiceStatusBadge";
import { InvoicePaymentStatusBadge } from "./components/InvoicePaymentStatusBadge";
import { InvoiceReceivePaymentModal } from "./components/InvoiceReceivePaymentModal";
import { InvoiceCancelDialog } from "./components/InvoiceCancelDialog";
import {
  cancelInvoice,
  getInvoiceById,
  getInvoiceRowActions,
  receiveInvoicePayment,
  type InvoiceRecord,
} from "./invoices-data";
import { downloadInvoicePdf } from "./invoice-pdf";
import { formatINR, INVOICES_BREADCRUMB, INVOICES_LIST_PATH } from "./invoice-utils";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xs font-medium mt-0.5">{value ?? "—"}</p>
    </div>
  );
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

  return (
    <AccountsFormLayout
      title="View Invoice"
      breadcrumb={[...INVOICES_BREADCRUMB]}
      code={record.invoiceNo}
      footer={
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => downloadInvoicePdf(record)}>
            <Download className="w-3.5 h-3.5" /> PDF
          </Button>
          {actions.includes("edit") && (
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" asChild>
              <Link href={`${INVOICES_LIST_PATH}/${record.id}/edit`}>
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Link>
            </Button>
          )}
          {actions.includes("receive") && (
            <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1" onClick={() => setPayOpen(true)}>
              <Banknote className="w-3.5 h-3.5" /> Receive Payment
            </Button>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-8 items-start">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <InvoiceStatusBadge status={record.invoiceStatus} />
            <InvoicePaymentStatusBadge status={record.paymentStatus} />
          </div>

          <div className="bg-white rounded-lg border border-border/60 p-4">
            <h2 className="text-sm font-semibold mb-3">Customer Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <DetailRow label="Customer Name" value={record.customerName} />
              <DetailRow label="Mobile" value={record.customerMobile} />
              <DetailRow label="Email" value={record.customerEmail} />
              <DetailRow label="GST Number" value={record.customerGst} />
              <DetailRow label="Billing Address" value={record.billingAddress} />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-border/60 p-4">
            <h2 className="text-sm font-semibold mb-3">Invoice Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <DetailRow label="Invoice Date" value={record.invoiceDate} />
              <DetailRow label="Due Date" value={record.dueDate} />
              <DetailRow label="Reference No." value={record.referenceNo} />
              <DetailRow label="Remarks" value={record.remarks} />
              {record.cancellationReason && (
                <DetailRow label="Cancellation Reason" value={record.cancellationReason} />
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-border/60 p-4 overflow-x-auto">
            <h2 className="text-sm font-semibold mb-3">Products / Services</h2>
            <table className="w-full text-xs min-w-[640px]">
              <thead className="border-b">
                <tr>
                  {["Product", "Description", "Qty", "Unit", "Price", "Disc%", "Tax%", "Amount"].map((h) => (
                    <th key={h} className="py-1.5 text-left text-[10px] uppercase text-muted-foreground font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {record.lineItems.map((l) => (
                  <tr key={l.id} className="border-b border-border/40">
                    <td className="py-1.5">{l.productName}</td>
                    <td className="py-1.5 text-muted-foreground">{l.description}</td>
                    <td className="py-1.5">{l.qty}</td>
                    <td className="py-1.5">{l.unit}</td>
                    <td className="py-1.5 tabular-nums">{formatINR(l.unitPrice)}</td>
                    <td className="py-1.5">{l.discountPct}%</td>
                    <td className="py-1.5">{l.taxPct}%</td>
                    <td className="py-1.5 tabular-nums font-medium">{formatINR(l.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
                    <p className="font-medium">
                      Payment {i + 1} · {formatINR(c.amount)}
                    </p>
                    <p className="text-muted-foreground">
                      Date: {c.paymentDate} · Mode: {c.paymentMode}
                    </p>
                    {c.referenceNo && <p className="text-muted-foreground">Ref: {c.referenceNo}</p>}
                    {c.remarks && <p className="mt-1">{c.remarks}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {record.attachments.length > 0 && (
            <div className="bg-white rounded-lg border border-border/60 p-4">
              <h2 className="text-sm font-semibold mb-3">Attachments</h2>
              <div className="space-y-2">
                {record.attachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-2 text-xs py-1.5 px-2 border rounded">
                    <span className="font-medium">{att.documentName}</span>
                    <span className="text-muted-foreground flex-1 truncate">{att.fileName}</span>
                    {att.dataUrl && (
                      <>
                        <button type="button" className="p-1" onClick={() => window.open(att.dataUrl, "_blank")}>
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <a href={att.dataUrl} download={att.fileName} className="p-1">
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg border border-border/60 p-4">
            <h2 className="text-sm font-semibold mb-3">Activity Timeline</h2>
            <div className="space-y-2">
              {[...record.activity].reverse().map((a, i) => (
                <div key={i} className="text-xs border-l-2 border-muted pl-3 py-0.5">
                  <p className="font-medium capitalize">{a.action.replaceAll("_", " ")}</p>
                  <p className="text-muted-foreground">{a.detail}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {a.by} · {new Date(a.at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-20 space-y-3">
          <div className="bg-white rounded-lg border border-border/60 p-4 space-y-2 text-xs">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</h2>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{formatINR(record.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span className="tabular-nums">{formatINR(record.discountTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span className="tabular-nums">{formatINR(record.taxAmount)}</span>
            </div>
            <div className="flex justify-between font-semibold text-sm pt-2 border-t">
              <span>Grand Total</span>
              <span className="text-brand-700 tabular-nums">{formatINR(record.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>Received</span>
              <span className="tabular-nums">{formatINR(record.amountReceived)}</span>
            </div>
            <div className="flex justify-between text-amber-700 font-medium">
              <span>Balance</span>
              <span className="tabular-nums">{formatINR(record.balanceAmount)}</span>
            </div>
          </div>
          {actions.includes("cancel") && (
            <Button variant="outline" size="sm" className="h-8 text-xs w-full text-red-600" onClick={() => setCancelOpen(true)}>
              Cancel Invoice
            </Button>
          )}
        </div>
      </div>

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
    </AccountsFormLayout>
  );
}
