"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDisplayDate } from "@/lib/accounts/date-display";
import { formatCnMoney } from "../credit-note-form-utils";
import { SalesInvoiceService } from "@/services/sales-invoice.service";
import type { SalesInvoiceDetailDto } from "@/services/sales-invoice.service";

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | number | null;
  mono?: boolean;
}) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 py-1.5 border-b border-border/50 last:border-0 items-baseline">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span
        className={`text-xs font-medium text-foreground break-words ${
          mono ? "font-mono text-brand-700" : ""
        }`}
      >
        {String(value)}
      </span>
    </div>
  );
}

export type InvoiceRefSummary = {
  reference_id: string;
  reference_code?: string | null;
  reference_date?: string | null;
  eligible_amount?: string | number | null;
};

export function CreditNoteInvoiceDetailsModal({
  open,
  onClose,
  invoiceRef,
}: {
  open: boolean;
  onClose: () => void;
  invoiceRef: InvoiceRefSummary | null;
}) {
  const [loading, setLoading] = useState(false);
  const [invoiceDetail, setInvoiceDetail] = useState<SalesInvoiceDetailDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastFetchedId, setLastFetchedId] = useState<string | null>(null);

  // Fetch full details when modal opens for an invoice
  if (open && invoiceRef?.reference_id && invoiceRef.reference_id !== lastFetchedId && !loading) {
    setLastFetchedId(invoiceRef.reference_id);
    setLoading(true);
    setLoadError(null);
    SalesInvoiceService.getById(invoiceRef.reference_id)
      .then((data) => {
        setInvoiceDetail(data);
      })
      .catch((err) => {
        console.warn("Could not fetch full sales invoice details:", err);
        setLoadError("Full invoice details could not be loaded.");
        setInvoiceDetail(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  const title =
    invoiceDetail?.invoice_number ||
    invoiceRef?.reference_code ||
    invoiceRef?.reference_id ||
    "Invoice Details";

  const invoiceDate =
    invoiceDetail?.invoice_date || invoiceRef?.reference_date;

  const customerName =
    invoiceDetail?.customer?.customer_name ||
    (invoiceDetail?.customer_snapshot as any)?.customer_name;

  const warehouseName =
    invoiceDetail?.warehouse?.warehouse_name ||
    (invoiceDetail?.warehouse_snapshot as any)?.warehouse_name;

  const totalAmount =
    invoiceDetail?.invoice_amount != null
      ? formatCnMoney(invoiceDetail.invoice_amount)
      : null;

  const taxableAmount =
    invoiceDetail?.taxable_amount != null
      ? formatCnMoney(invoiceDetail.taxable_amount)
      : invoiceRef?.eligible_amount != null
      ? formatCnMoney(invoiceRef.eligible_amount)
      : null;

  const gstAmount =
    invoiceDetail?.gst_amount != null
      ? formatCnMoney(invoiceDetail.gst_amount)
      : null;

  const status = invoiceDetail?.status;

  const items = Array.isArray(invoiceDetail?.items) ? invoiceDetail.items : [];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <span>{title}</span>
            {status ? (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                {status}
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            Contributing sales invoice details (reference only)
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground gap-2 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
            Loading invoice details…
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-muted/20 px-3 py-1">
              <InfoRow label="Invoice Number" value={title} mono />
              <InfoRow
                label="Invoice Date"
                value={invoiceDate ? formatDisplayDate(invoiceDate) : "—"}
              />
              <InfoRow label="Customer" value={customerName} />
              <InfoRow label="Warehouse" value={warehouseName} />
              <InfoRow label="Taxable Amount" value={taxableAmount} mono />
              {gstAmount ? <InfoRow label="GST Amount" value={gstAmount} mono /> : null}
              {totalAmount ? <InfoRow label="Total Amount" value={totalAmount} mono /> : null}
              {invoiceDetail?.dispatch?.dispatch_number ? (
                <InfoRow
                  label="Dispatch Number"
                  value={invoiceDetail.dispatch.dispatch_number}
                  mono
                />
              ) : null}
              {invoiceDetail?.sales_order?.so_number ? (
                <InfoRow
                  label="Sales Order"
                  value={invoiceDetail.sales_order.so_number}
                  mono
                />
              ) : null}
            </div>

            {items.length > 0 ? (
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/40 px-3 py-1.5 text-[11px] font-medium text-foreground border-b border-border">
                  Line Items ({items.length})
                </div>
                <div className="max-h-44 overflow-y-auto">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-muted/20 text-muted-foreground border-b border-border/50 sticky top-0">
                      <tr>
                        <th className="px-3 py-1.5 font-medium">Product / Description</th>
                        <th className="px-2 py-1.5 font-medium text-right">Qty</th>
                        <th className="px-2 py-1.5 font-medium text-right">Rate</th>
                        <th className="px-3 py-1.5 font-medium text-right">Taxable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-mono text-[10px]">
                      {items.map((it: any, idx) => {
                        const pName =
                          it.product?.product_name ||
                          it.product_name ||
                          (it.product_snapshot as any)?.product_name ||
                          it.description ||
                          `Item #${idx + 1}`;
                        const qty = it.quantity != null ? String(it.quantity) : "—";
                        const rate =
                          it.unit_price != null
                            ? formatCnMoney(it.unit_price)
                            : it.rate != null
                            ? formatCnMoney(it.rate)
                            : "—";
                        const taxable =
                          it.taxable_amount != null
                            ? formatCnMoney(it.taxable_amount)
                            : "—";
                        return (
                          <tr key={it.sales_invoice_item_id || idx} className="hover:bg-muted/10">
                            <td className="px-3 py-1 font-sans text-xs text-foreground truncate max-w-[180px]">
                              {pName}
                            </td>
                            <td className="px-2 py-1 text-right">{qty}</td>
                            <td className="px-2 py-1 text-right">{rate}</td>
                            <td className="px-3 py-1 text-right text-brand-700 font-semibold">
                              {taxable}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {loadError ? (
              <p className="text-[11px] text-amber-600 italic px-1">{loadError}</p>
            ) : null}
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
