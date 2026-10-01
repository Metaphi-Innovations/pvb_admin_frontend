"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Calendar, Download, Eye, Pencil } from "lucide-react";
import { RecordDetailPage } from "@/components/record-detail";
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
  PURCHASE_LIST_PATH,
  PURCHASE_PAYMENT_STATUS_LABELS,
} from "./purchase-utils";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import { purchaseInvoiceImpactResolved } from "@/lib/accounts/resolved-impact-previews";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="text-xs font-medium mt-0.5">{value || "—"}</p>
    </div>
  );
}

function purchaseStatusVariant(status: string): "active" | "inactive" | "draft" | "blocked" | "neutral" {
  if (status === "paid") return "active";
  if (status === "partial") return "neutral";
  if (status === "unpaid") return "draft";
  return "neutral";
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
    <RecordDetailPage
      embedded
      listHref={PURCHASE_LIST_PATH}
      listLabel="Purchases"
      recordName={record.vendorName}
      recordCode={record.invoiceNo}
      statusLabel={PURCHASE_PAYMENT_STATUS_LABELS[payStatus]}
      statusVariant={purchaseStatusVariant(payStatus)}
      typeBadge={
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase bg-brand-50 text-brand-700 border border-brand-200">
          {PURCHASE_SOURCE_LABELS[record.source]}
        </span>
      }
      metaItems={[
        { icon: Calendar, label: record.invoiceDate },
        { label: record.vendorInvoiceNo },
      ]}
      onEdit={record.source === "manual_entry" ? () => router.push(`${PURCHASE_LIST_PATH}/${record.id}/edit`) : undefined}
      secondaryAction={
        record.poId
          ? { label: "View PO", onClick: () => router.push(`/procurement/purchase-orders/${record.poId}`) }
          : undefined
      }
      sidebar={{
        summary: [
          { label: "Taxable", value: formatINR(record.subtotal) },
          { label: "GST", value: formatINR(record.taxAmount) },
          { label: "Total", value: formatINR(record.grandTotal), highlight: true },
          { label: "Payment Status", value: PURCHASE_PAYMENT_STATUS_LABELS[payStatus] },
          { label: "Created By", value: record.createdBy },
        ],
        quickActions: [
          ...(record.poId
            ? [
                {
                  label: "View PO",
                  variant: "outline" as const,
                  onClick: () => router.push(`/procurement/purchase-orders/${record.poId}`),
                },
              ]
            : []),
          ...(record.source === "manual_entry"
            ? [
                {
                  label: "Edit Purchase",
                  icon: Pencil,
                  variant: "outline" as const,
                  onClick: () => router.push(`${PURCHASE_LIST_PATH}/${record.id}/edit`),
                },
              ]
            : []),
        ],
      }}
    >
      <div className="space-y-4">
        <LedgerImpactPreview
          title="Accounting Entry"
          lines={purchaseInvoiceImpactResolved({
            vendorName: record.vendorName,
            taxable: record.subtotal,
            taxAmount: record.taxAmount,
            grandTotal: record.grandTotal,
          })}
        />
        {isPO ? (
          <div className="rounded-lg border bg-white p-4 space-y-3">
            <h2 className="text-sm font-semibold">PO Invoice Integration</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <DetailRow label="PO No." value={record.poNumber} />
              <DetailRow label="Supplier Invoice No." value={record.vendorInvoiceNo} />
              <DetailRow label="Supplier" value={record.vendorName} />
              <DetailRow label="Invoice Amount" value={formatINR(record.subtotal)} />
              <DetailRow label="Purchase No." value={record.invoiceNo} />
              <DetailRow label="Purchase Status" value={PURCHASE_PAYMENT_STATUS_LABELS[payStatus]} />
            </div>
            {match && (
              <div className="pt-2 border-t space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase text-muted-foreground font-semibold">3-Way Match Status</span>
                  <ThreeWayMatchStatusBadge status={match.status} />
                  {!match.matchReady && (
                    <span className="text-xs text-amber-700">
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
            <DetailRow label="Supplier" value={record.vendorName} />
            <DetailRow label="Supplier Invoice No." value={record.vendorInvoiceNo} />
            <DetailRow label="Supplier Invoice Date" value={record.invoiceDate} />
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
            <table className="accounts-table w-full min-w-[640px]">
              <thead className="border-b">
                <tr>
                  {["Product", "Qty", "UOM", "Rate", "GST %", "Line Amt"].map((h) => (
                    <th key={h} className="py-1.5 text-left text-xs uppercase text-muted-foreground font-semibold">
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
                    <Eye className="w-4 h-4" />
                  </button>
                  <a href={record.attachment.dataUrl} download={record.attachment.fileName} className="p-1 hover:bg-muted rounded">
                    <Download className="w-4 h-4" />
                  </a>
                </>
              )}
            </div>
          </div>
        )}

        {record.remarks && (
          <div className="bg-white rounded-lg border p-4 text-xs">
            <p className="text-xs uppercase text-muted-foreground mb-1">Remarks</p>
            <p>{record.remarks}</p>
          </div>
        )}
      </div>
    </RecordDetailPage>
  );
}
