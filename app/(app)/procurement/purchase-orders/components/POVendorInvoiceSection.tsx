"use client";

import { Download, Eye, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecordSectionCard } from "@/components/record-detail";
import { formatCurrency } from "@/lib/procurement/utils";
import { formatListingDate } from "../../components/listing/ListingCells";
import type { PurchaseOrder } from "../po-data";
import { canUploadPOInvoice, getPOVendorInvoice } from "../po-invoice-utils";

export function POVendorInvoiceSection({
  po,
  onUpload,
  onReplace,
  refreshKey = 0,
}: {
  po: PurchaseOrder;
  onUpload: () => void;
  onReplace: () => void;
  refreshKey?: number;
}) {
  void refreshKey;
  const invoice = getPOVendorInvoice(po.id);

  if (!invoice) {
    if (!canUploadPOInvoice(po)) return null;
    return (
      <div id="vendor-invoice">
        <RecordSectionCard title="Supplier Invoice" icon={FileText} accent="green">
          <p className="text-xs text-muted-foreground mb-3">No supplier invoice uploaded yet.</p>
          <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={onUpload}>
            Upload Invoice
          </Button>
        </RecordSectionCard>
      </div>
    );
  }

  const uploadedDate = invoice.updatedAt.slice(0, 10);
  const fields = [
    { label: "Supplier Invoice No.", value: invoice.vendorInvoiceNo },
    { label: "Supplier Invoice Date", value: formatListingDate(invoice.invoiceDate) },
    { label: "Invoice Amount", value: formatCurrency(invoice.subtotal) },
    { label: "GST Amount", value: formatCurrency(invoice.taxAmount) },
    { label: "Total Amount", value: formatCurrency(invoice.grandTotal) },
    { label: "Invoice Attachment", value: invoice.attachment?.fileName ?? "—" },
    { label: "Uploaded By", value: invoice.createdBy },
    { label: "Uploaded Date", value: formatListingDate(uploadedDate) },
  ];

  return (
    <div id="vendor-invoice">
      <RecordSectionCard title="Supplier Invoice" icon={FileText} accent="green">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
          {fields.map((f) => (
            <div key={f.label}>
              <p className="text-[11px] font-medium text-muted-foreground mb-0.5">{f.label}</p>
              <p className="text-foreground">{f.value}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border">
          {invoice.attachment?.dataUrl && (
            <>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => window.open(invoice.attachment!.dataUrl, "_blank")}>
                <Eye className="w-3.5 h-3.5" /> View File
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = invoice.attachment!.dataUrl!;
                  a.download = invoice.attachment!.fileName;
                  a.click();
                }}
              >
                <Download className="w-3.5 h-3.5" /> Download File
              </Button>
            </>
          )}
          {canUploadPOInvoice(po) && (
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={onReplace}>
              <RefreshCw className="w-3.5 h-3.5" /> Replace Invoice
            </Button>
          )}
        </div>
      </RecordSectionCard>
    </div>
  );
}

export function InvoiceListingCell({
  po,
  onView,
  onUpload,
}: {
  po: PurchaseOrder;
  onView: () => void;
  onUpload: () => void;
}) {
  const info = getPOVendorInvoice(po.id);
  const uploaded = !!info || po.status === "invoice_uploaded" || po.status === "closed";

  return (
    <div className="py-1.5 space-y-1" onClick={(e) => e.stopPropagation()}>
      {uploaded && info ? (
        <>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
            Invoice Uploaded
          </span>
          <p className="text-[11px] font-medium text-foreground leading-tight">{info.vendorInvoiceNo}</p>
          <p className="text-[10px] text-muted-foreground">{formatListingDate(info.invoiceDate)}</p>
          <button type="button" className="text-[10px] text-brand-600 hover:underline inline-flex items-center gap-0.5" onClick={onView}>
            <Eye className="w-3 h-3" /> View
          </button>
        </>
      ) : (
        <>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
            Not Uploaded
          </span>
          {canUploadPOInvoice(po) && (
            <button type="button" className="text-[10px] text-brand-600 hover:underline block" onClick={onUpload}>
              Upload
            </button>
          )}
        </>
      )}
    </div>
  );
}
