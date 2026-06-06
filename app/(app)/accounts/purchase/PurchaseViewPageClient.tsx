"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Download, Eye, Pencil } from "lucide-react";
import { AccountsFormLayout } from "../expenses/components/AccountsFormLayout";
import {
  getPurchaseInvoiceById,
  PURCHASE_SOURCE_LABELS,
  type PurchaseInvoiceRecord,
} from "../purchase-invoices/purchase-invoices-data";
import { ThreeWayMatchComparisonTable } from "@/components/erp/ThreeWayMatchComparisonTable";
import { ThreeWayMatchStatusBadge } from "@/components/erp/ThreeWayMatchStatusBadge";
import { getThreeWayMatchForPurchase } from "@/lib/erp/three-way-match";
import {
  formatINR,
  getPurchasePaymentStatus,
  PURCHASE_BREADCRUMB,
  PURCHASE_LIST_PATH,
  PURCHASE_PAYMENT_STATUS_LABELS,
} from "./purchase-utils";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-xs font-medium mt-0.5">{value || "—"}</p>
    </div>
  );
}

export default function PurchaseViewPageClient({ purchaseId }: { purchaseId: number }) {
  const router = useRouter();
  const [record, setRecord] = useState<PurchaseInvoiceRecord | null>(null);

  useEffect(() => {
    const r = getPurchaseInvoiceById(purchaseId);
    if (!r) router.replace(PURCHASE_LIST_PATH);
    else setRecord(r);
  }, [purchaseId, router]);

  if (!record) return null;

  const isPO = record.source === "po_invoice";
  const match = getThreeWayMatchForPurchase(record);
  const payStatus = getPurchasePaymentStatus(record.amountPaid, record.grandTotal);

  return (
    <AccountsFormLayout
      title="View Purchase"
      breadcrumb={[...PURCHASE_BREADCRUMB]}
      code={record.invoiceNo}
      footer={
        <div className="flex gap-2">
          {record.source === "manual_entry" && (
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" asChild>
              <Link href={`${PURCHASE_LIST_PATH}/${record.id}/edit`}>
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Link>
            </Button>
          )}
          {record.poId && (
            <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
              <Link href={`/procurement/purchase-orders/${record.poId}`}>View PO</Link>
            </Button>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-8 items-start">
        <div className="lg:col-span-2 space-y-4">
          <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-brand-50 text-brand-700 border border-brand-200">
            {PURCHASE_SOURCE_LABELS[record.source]}
          </div>

          {isPO ? (
            <div className="rounded-lg border bg-white p-4 space-y-3">
              <h2 className="text-sm font-semibold">PO Invoice Integration</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <DetailRow label="PO No." value={record.poNumber} />
                <DetailRow label="Vendor Invoice No." value={record.vendorInvoiceNo} />
                <DetailRow label="Vendor" value={record.vendorName} />
                <DetailRow label="Invoice Amount" value={formatINR(record.subtotal)} />
                <DetailRow label="Purchase No." value={record.invoiceNo} />
                <DetailRow label="Purchase Status" value={PURCHASE_PAYMENT_STATUS_LABELS[payStatus]} />
              </div>
              {match && (
                <div className="pt-2 border-t space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold">3-Way Match Status</span>
                    <ThreeWayMatchStatusBadge status={match.status} />
                    {!match.matchReady && (
                      <span className="text-[11px] text-amber-700">
                        Pending — PO approval, invoice, GRN, or QC not complete.
                      </span>
                    )}
                  </div>
                  {match.matchReady && <ThreeWayMatchComparisonTable match={match} />}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border bg-white p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <DetailRow label="Vendor" value={record.vendorName} />
              <DetailRow label="Vendor Invoice No." value={record.vendorInvoiceNo} />
              <DetailRow label="Vendor Invoice Date" value={record.invoiceDate} />
              <DetailRow label="Purchase No." value={record.invoiceNo} />
              <DetailRow label="Invoice Amount" value={formatINR(record.subtotal)} />
              <DetailRow label="GST Amount" value={formatINR(record.taxAmount)} />
              <DetailRow label="Total Amount" value={formatINR(record.grandTotal)} />
              <DetailRow label="Purchase Status" value={PURCHASE_PAYMENT_STATUS_LABELS[payStatus]} />
            </div>
          )}

          {record.lineItems.length > 0 && (
            <div className="bg-white rounded-lg border p-4 overflow-x-auto">
              <h2 className="text-sm font-semibold mb-3">Products (from PO)</h2>
              <table className="w-full text-xs min-w-[640px]">
                <thead className="border-b">
                  <tr>
                    {["Product", "Qty", "UOM", "Rate", "GST %", "Line Amt"].map((h) => (
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
                      <td className="py-1.5">{l.invoiceQty}</td>
                      <td className="py-1.5">{l.unit}</td>
                      <td className="py-1.5 tabular-nums">{formatINR(l.unitPrice)}</td>
                      <td className="py-1.5">{l.taxPct ? `${l.taxPct}%` : "—"}</td>
                      <td className="py-1.5 tabular-nums">{formatINR(l.lineAmount + l.taxAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {record.attachment && (
            <div className="bg-white rounded-lg border p-4">
              <h2 className="text-sm font-semibold mb-2">Invoice Attachment</h2>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium">{record.attachment.documentName}</span>
                <span className="text-muted-foreground">{record.attachment.fileName}</span>
                {record.attachment.dataUrl && (
                  <>
                    <button type="button" className="p-1 hover:bg-muted rounded" onClick={() => window.open(record.attachment!.dataUrl, "_blank")}>
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <a href={record.attachment.dataUrl} download={record.attachment.fileName} className="p-1 hover:bg-muted rounded">
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </>
                )}
              </div>
            </div>
          )}

          {record.remarks && (
            <div className="bg-white rounded-lg border p-4 text-xs">
              <p className="text-[10px] uppercase text-muted-foreground mb-1">Remarks</p>
              <p>{record.remarks}</p>
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-20">
          <div className="rounded-lg border bg-white p-4 space-y-2 text-xs">
            <h2 className="text-xs font-semibold uppercase text-muted-foreground">Summary</h2>
            <div className="flex justify-between"><span className="text-muted-foreground">Taxable</span><span className="tabular-nums">{formatINR(record.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">GST</span><span className="tabular-nums">{formatINR(record.taxAmount)}</span></div>
            <div className="flex justify-between font-semibold text-brand-700 pt-2 border-t"><span>Total</span><span className="tabular-nums">{formatINR(record.grandTotal)}</span></div>
            <div className="pt-2 border-t text-[10px] text-muted-foreground">
              <p>Created by {record.createdBy}</p>
              <p>{new Date(record.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </AccountsFormLayout>
  );
}
