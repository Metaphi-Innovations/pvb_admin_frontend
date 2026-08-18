import { formatMoney } from "@/lib/accounts/money-format";
import { PURCHASE_SOURCE_TYPE_LABELS } from "./purchase-invoice-types";
import type { PurchaseInvoiceRecord } from "./purchase-invoices-data";

export function downloadPurchaseInvoicePdf(invoice: PurchaseInvoiceRecord): void {
  const sourceLabel =
    invoice.sourceType === "direct_purchase"
      ? PURCHASE_SOURCE_TYPE_LABELS.direct_purchase
      : PURCHASE_SOURCE_TYPE_LABELS.from_grn;
  const rows = (invoice.lineItems || [])
    .map(
      (line) => `
    <tr>
      <td>${escapeHtml(line.productName || "—")}</td>
      <td>${escapeHtml(line.description || "—")}</td>
      <td align="right">${line.invoiceQty}</td>
      <td>${escapeHtml(line.unit || "—")}</td>
      <td align="right">${formatMoney(line.unitPrice)}</td>
      <td align="right">${line.taxPct}%</td>
      <td align="right">${formatMoney(line.lineAmount)}</td>
    </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(invoice.invoiceNo)}</title>
<style>
  body { font-family: system-ui, sans-serif; font-size: 12px; color: #111; padding: 24px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .muted { color: #666; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; }
  th { background: #f5f5f5; text-align: left; font-size: 10px; text-transform: uppercase; }
  .totals { margin-top: 16px; width: 280px; margin-left: auto; }
  .totals td { border: none; padding: 4px 0; }
  .totals .label { color: #666; }
  .grand { font-weight: 700; font-size: 14px; }
</style></head><body>
  <h1>Purchase Invoice</h1>
  <p class="muted">${escapeHtml(invoice.invoiceNo)} · ${escapeHtml(invoice.invoiceDate || "—")} · ${escapeHtml(sourceLabel)}</p>
  <p><strong>Supplier:</strong> ${escapeHtml(invoice.vendorName || "—")}<br/>
  Supplier Inv. No: ${escapeHtml(invoice.vendorInvoiceNo || "—")}<br/>
  ${invoice.warehouse ? `Warehouse: ${escapeHtml(invoice.warehouse)}<br/>` : ""}
  ${invoice.grnNo ? `GRN: ${escapeHtml(invoice.grnNo)}<br/>` : ""}
  ${invoice.poNumber ? `PO: ${escapeHtml(invoice.poNumber)}` : ""}</p>
  <table>
    <thead>
      <tr>
        <th>Product</th><th>Description</th><th>Qty</th><th>Unit</th>
        <th>Rate</th><th>GST %</th><th>Taxable</th>
      </tr>
    </thead>
    <tbody>${rows || `<tr><td colspan="7">No line items</td></tr>`}</tbody>
  </table>
  <table class="totals">
    <tr><td class="label">Taxable Amount</td><td align="right">${formatMoney(invoice.taxableAmount ?? invoice.subtotal)}</td></tr>
    <tr><td class="label">GST Amount</td><td align="right">${formatMoney(invoice.taxAmount)}</td></tr>
    <tr><td class="grand">Net Payable</td><td align="right" class="grand">${formatMoney(invoice.netPayable ?? invoice.grandTotal)}</td></tr>
  </table>
  ${invoice.remarks ? `<p style="margin-top:16px"><strong>Remarks:</strong> ${escapeHtml(invoice.remarks)}</p>` : ""}
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) {
    alert("Please allow pop-ups to download PDF.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
