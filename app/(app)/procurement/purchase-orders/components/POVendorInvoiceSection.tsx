"use client";

import { Download, Eye, FileText, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/procurement/utils";
import { ProcButton, ProcCardSection } from "../../design/proc-design";
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
        <ProcCardSection accent="green" title="Supplier Invoice" icon={<FileText className="w-3.5 h-3.5 text-[#1E9E61]" />}>
          <p className="text-[12px] text-[#6B80A0] mb-3">No supplier invoice uploaded yet.</p>
          <ProcButton variant="primary" size="sm" onClick={onUpload}>
            Upload Invoice
          </ProcButton>
        </ProcCardSection>
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
      <ProcCardSection accent="green" title="Supplier Invoice" icon={<FileText className="w-3.5 h-3.5 text-[#1E9E61]" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
          {fields.map((f) => (
            <div key={f.label}>
              <p className="text-[11px] font-semibold text-[#6B80A0] mb-0.5">{f.label}</p>
              <p className="text-[#0A1628]">{f.value}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-[#DDE3EF]">
          {invoice.attachment?.dataUrl && (
            <>
              <ProcButton variant="outline" size="sm" onClick={() => window.open(invoice.attachment!.dataUrl, "_blank")}>
                <Eye className="w-3.5 h-3.5" /> View File
              </ProcButton>
              <ProcButton
                variant="outline"
                size="sm"
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = invoice.attachment!.dataUrl!;
                  a.download = invoice.attachment!.fileName;
                  a.click();
                }}
              >
                <Download className="w-3.5 h-3.5" /> Download File
              </ProcButton>
            </>
          )}
          {canUploadPOInvoice(po) && (
            <ProcButton variant="outline" size="sm" onClick={onReplace}>
              <RefreshCw className="w-3.5 h-3.5" /> Replace Invoice
            </ProcButton>
          )}
        </div>
      </ProcCardSection>
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
          <p className="text-[11px] font-medium text-[#0A1628] leading-tight">{info.vendorInvoiceNo}</p>
          <p className="text-[10px] text-[#6B80A0]">{formatListingDate(info.invoiceDate)}</p>
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
