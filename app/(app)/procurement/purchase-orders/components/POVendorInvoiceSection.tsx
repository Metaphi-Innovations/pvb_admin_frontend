"use client";

import { Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecordSectionCard } from "@/components/record-detail";
import { formatCurrency } from "@/lib/procurement/utils";
import { formatListingDate } from "../../components/listing/ListingCells";
import type { PurchaseOrder } from "../po-data";
import type { POVendorInvoiceView } from "@/services/purchase-order.service";

function POVendorInvoiceCard({ invoice }: { invoice: POVendorInvoiceView }) {
  const attachmentUrl = invoice.attachmentUrls[0];
  const attachmentName = attachmentUrl?.split("/").pop() ?? "—";

  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden shadow-sm">
      <div className="px-3 py-2.5 bg-muted/30 border-b border-border grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Invoice No.</p>
          <p className="text-xs font-mono font-semibold text-brand-700 mt-0.5">{invoice.vendorInvoiceNo || "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Invoice Date</p>
          <p className="text-xs text-foreground mt-0.5">{formatListingDate(invoice.invoiceDate) || "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Amount</p>
          <p className="text-xs font-semibold tabular-nums text-foreground mt-0.5">{formatCurrency(invoice.grandTotal)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Invoice Amount</p>
          <p className="text-xs tabular-nums text-foreground mt-0.5">{formatCurrency(invoice.subtotal)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">GST Amount</p>
          <p className="text-xs tabular-nums text-foreground mt-0.5">{formatCurrency(invoice.taxAmount)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Uploaded File</p>
          <p className="text-xs text-foreground mt-0.5 truncate" title={attachmentName}>{attachmentName}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Uploaded By</p>
          <p className="text-xs text-foreground mt-0.5">{invoice.createdBy || "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Uploaded On</p>
          <p className="text-xs text-foreground mt-0.5">{formatListingDate(invoice.createdAt.slice(0, 10))}</p>
        </div>
      </div>
      {(invoice.remarks || attachmentUrl) && (
        <div className="px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-border/60">
          {invoice.remarks ? (
            <p className="text-[11px] text-muted-foreground flex-1 min-w-0">
              <span className="font-medium text-foreground">Remarks: </span>
              {invoice.remarks}
            </p>
          ) : (
            <span />
          )}
          {attachmentUrl && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1.5 shrink-0"
              onClick={() => window.open(attachmentUrl, "_blank")}
            >
              <Eye className="w-3 h-3" /> View File
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** Read-only supplier invoices linked via GRN → Invoice (no upload from PO). */
export function POVendorInvoiceSection({
  invoices = [],
}: {
  po?: PurchaseOrder;
  onUpload?: () => void;
  refreshKey?: number;
  invoices?: POVendorInvoiceView[];
}) {
  if (invoices.length === 0) {
    return (
      <div id="vendor-invoice">
        <RecordSectionCard title="Supplier Invoices" icon={FileText} accent="green">
          <p className="text-xs text-muted-foreground">
            No supplier invoice yet. Invoices uploaded from GRN will appear here.
          </p>
        </RecordSectionCard>
      </div>
    );
  }

  return (
    <div id="vendor-invoice">
      <RecordSectionCard title="Supplier Invoices" icon={FileText} accent="green">
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <POVendorInvoiceCard key={invoice.id} invoice={invoice} />
          ))}
        </div>
      </RecordSectionCard>
    </div>
  );
}

export function InvoiceListingCell({
  hasInvoice = false,
  invoiceCount = 0,
  onView,
}: {
  hasInvoice?: boolean;
  invoiceCount?: number;
  onView: () => void;
  /** @deprecated Upload from PO is disabled; kept for call-site compatibility. */
  onUpload?: () => void;
  canUpload?: boolean;
}) {
  const count = invoiceCount > 0 ? invoiceCount : hasInvoice ? 1 : 0;

  return (
    <div
      className="py-1.5 flex flex-col items-start gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      {count > 0 ? (
        <>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
            {count > 1 ? `${count} Invoices` : "Invoice Uploaded"}
          </span>

          <button
            type="button"
            className="text-[10px] text-brand-600 hover:underline inline-flex items-center gap-0.5"
            onClick={onView}
          >
            <Eye className="w-3 h-3" />
            View
          </button>
        </>
      ) : (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
          Not Uploaded
        </span>
      )}
    </div>
  );
}
