import type { GrnOcrExtractedInvoice } from "../types";

export function OcrExtractedInvoiceSection({
  invoices,
  description = "Stored as-is for Procurement/Accounts consumption. Warehouse does not validate or match this data.",
}: {
  invoices: GrnOcrExtractedInvoice[];
  description?: string;
}) {
  if (invoices.length === 0) return null;

  return (
    <div className="space-y-3">
      {description && (
        <p className="text-[11px] text-muted-foreground">{description}</p>
      )}
      {invoices.map((inv) => (
        <div key={inv.invoiceId} className="rounded-lg border border-border bg-white overflow-hidden shadow-sm">
          <div className="px-3 py-2.5 bg-muted/30 border-b border-border grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Invoice No.</p>
              <p className="text-xs font-mono font-semibold text-brand-700 mt-0.5">{inv.invoiceNumber}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Supplier</p>
              <p className="text-xs font-medium text-foreground mt-0.5 truncate">{inv.supplierName}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Invoice Date</p>
              <p className="text-xs text-foreground mt-0.5">{inv.invoiceDate}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">OCR Confidence</p>
              <p className="text-xs font-semibold text-emerald-700 mt-0.5">{(inv.confidenceScore * 100).toFixed(0)}%</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground min-w-[120px]">Product</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-24">SKU</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-28">Batch No.</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-28">MFG Date</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-28">Expiry Date</th>
                  <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-20">Invoice Qty</th>
                  <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-24">Unit Price</th>
                  <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-16">GST</th>
                  <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-24">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {inv.lineItems.map((line, li) => (
                  <tr key={li} className="border-b border-border/50 bg-muted/5">
                    <td className="px-3 py-2 text-xs font-medium text-foreground">{line.productName}</td>
                    <td className="px-3 py-2 text-xs font-mono text-muted-foreground">{line.sku}</td>
                    <td className="px-3 py-2 text-xs font-mono font-semibold text-foreground">{line.batchNumber}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{line.mfgDate}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{line.expDate}</td>
                    <td className="px-3 py-2 text-xs text-center tabular-nums">{line.invoiceQty}</td>
                    <td className="px-3 py-2 text-xs text-center tabular-nums">{line.unitPrice}</td>
                    <td className="px-3 py-2 text-xs text-center tabular-nums">{line.gst}%</td>
                    <td className="px-3 py-2 text-xs text-center tabular-nums font-medium">{line.totalAmount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
