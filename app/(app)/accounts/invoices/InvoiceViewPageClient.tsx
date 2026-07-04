"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Calendar, Download } from "lucide-react";
import { RecordDetailPage } from "@/components/record-detail";
import { loadProducts } from "@/app/(app)/masters/products/product-data";
import {
  calcGstLineSplit,
  getInvoiceById,
  getInvoiceRowActions,
  type InvoiceRecord,
} from "./invoices-data";
import { downloadInvoicePdf } from "./invoice-pdf";
import { formatINR, INVOICES_LIST_PATH } from "./invoice-utils";
import {
  resolveWorkflowStatus,
  WORKFLOW_STATUS_LABELS,
  type AccountsVoucherWorkflowStatus,
} from "@/lib/accounts/accounts-maker-checker";
import { getInvoiceGstBreakup } from "@/lib/accounts/invoice-gst-breakup";
import {
  INVOICE_TYPE_LABELS,
  resolveInvoiceDocumentType,
} from "@/lib/accounts/invoice-type";
import { formatMoneyOrDash } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";

function DetailRow({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xs font-medium mt-0.5">{value ?? "—"}</p>
    </div>
  );
}

function invoiceStatusVariant(
  status: AccountsVoucherWorkflowStatus,
): "active" | "inactive" | "draft" | "blocked" | "neutral" {
  if (status === "draft") return "draft";
  if (status === "posted") return "active";
  if (status === "cancelled" || status === "rejected") return "blocked";
  if (status === "pending_approval" || status === "sent_back") return "neutral";
  return "inactive";
}

const ITEM_COLUMNS = [
  "Product Code",
  "Product Name",
  "HSN",
  "Batch No.",
  "Qty",
  "Rate",
  "Taxable Value",
  "CGST",
  "SGST",
  "IGST",
  "Total",
] as const;

export default function InvoiceViewPageClient({ invoiceId }: { invoiceId: number }) {
  const router = useRouter();
  const [record, setRecord] = useState<InvoiceRecord | null>(null);

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

  const productCodeById = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of loadProducts()) {
      map.set(p.id, p.productCode || p.sku || "—");
    }
    return map;
  }, []);

  if (!record) return null;

  const actions = getInvoiceRowActions(record);
  const workflowStatus = resolveWorkflowStatus(record.workflow, record.invoiceStatus);
  const invoiceType = resolveInvoiceDocumentType(record);
  const gst = getInvoiceGstBreakup(record);
  const interstate = gst.interstate;

  return (
    <RecordDetailPage
      embedded
      listHref={INVOICES_LIST_PATH}
      listLabel="Invoices"
      recordName={record.customerName}
      recordCode={record.invoiceNo}
      statusLabel={WORKFLOW_STATUS_LABELS[workflowStatus]}
      statusVariant={invoiceStatusVariant(workflowStatus)}
      metaItems={[{ icon: Calendar, label: record.invoiceDate }]}
      onEdit={
        actions.includes("edit")
          ? () => router.push(`${INVOICES_LIST_PATH}/${record.id}/edit`)
          : undefined
      }
      headerActions={
        <Button
          variant="outline"
          size="sm"
          className="h-9 text-sm font-medium gap-1"
          onClick={() => downloadInvoicePdf(record)}
        >
          <Download className="w-4 h-4" /> Print / PDF
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-border shadow-sm p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">Invoice Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <DetailRow label="Type" value={INVOICE_TYPE_LABELS[invoiceType]} />
            <DetailRow label="Source No." value={record.salesOrderNo || record.referenceNo} />
            <DetailRow label="Dispatch No." value={record.dispatchNo} />
            <DetailRow label="Party / Customer" value={record.customerName} />
            <DetailRow label="GSTIN" value={record.customerGst} />
            <DetailRow label="Billing Address" value={record.billingAddress} />
            <DetailRow
              label="Shipping Address"
              value={record.shippingAddress || record.billingAddress}
              className="md:col-span-2"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60">
            <h2 className="text-sm font-semibold text-foreground">Items</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[960px]">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {ITEM_COLUMNS.map((h) => (
                    <th
                      key={h}
                      className={cn(
                        "px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-foreground whitespace-nowrap",
                        h !== "Product Name" && h !== "Batch No." && "text-right",
                        (h === "Product Code" || h === "Product Name" || h === "HSN" || h === "Batch No.") &&
                          "text-left",
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {record.lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={ITEM_COLUMNS.length} className="px-4 py-8 text-center text-muted-foreground">
                      No line items on this invoice.
                    </td>
                  </tr>
                ) : (
                  record.lineItems.map((line) => {
                    const split = calcGstLineSplit(line, interstate);
                    const productCode =
                      line.productId != null ? productCodeById.get(line.productId) ?? "—" : "—";
                    return (
                      <tr key={line.id} className="border-b border-border/60 hover:bg-muted/20">
                        <td className="px-3 py-2 font-mono text-brand-700 whitespace-nowrap">{productCode}</td>
                        <td className="px-3 py-2 font-medium">{line.productName}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{line.hsn || "—"}</td>
                        <td className="px-3 py-2 font-mono text-muted-foreground">—</td>
                        <td className="px-3 py-2 text-right tabular-nums">{line.qty}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatINR(line.unitPrice)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatINR(split.taxable)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatMoneyOrDash(split.cgst)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatMoneyOrDash(split.sgst)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatMoneyOrDash(split.igst)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">
                          {formatINR(split.lineTotal)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">Summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-3 max-w-3xl">
            <DetailRow label="Taxable Value" value={formatINR(gst.taxableValue)} />
            <DetailRow label="CGST" value={formatMoneyOrDash(gst.cgst)} />
            <DetailRow label="SGST" value={formatMoneyOrDash(gst.sgst)} />
            <DetailRow label="IGST" value={formatMoneyOrDash(gst.igst)} />
            <DetailRow label="Invoice Total" value={formatINR(gst.invoiceTotal)} />
            <DetailRow label="Received" value={formatINR(record.amountReceived)} />
            <DetailRow label="Balance Due" value={formatINR(record.balanceAmount)} />
          </div>
        </div>
      </div>
    </RecordDetailPage>
  );
}
