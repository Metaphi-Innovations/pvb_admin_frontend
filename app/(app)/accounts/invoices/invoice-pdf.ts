import { normalizeInvoice, type InvoiceRecord } from "./invoices-data";
import { formatINR } from "./invoice-utils";

export function downloadInvoicePdf(invoice: InvoiceRecord): void {
  const rec = normalizeInvoice(invoice);
  const rows = rec.lineItems
    .map(
      (l) => `
    <tr>
      <td>${escapeHtml(l.productName || "—")}</td>
      <td>${escapeHtml(l.description)}</td>
      <td align="right">${l.qty}</td>
      <td>${escapeHtml(l.unit)}</td>
      <td align="right">${formatINR(l.unitPrice)}</td>
      <td align="right">${l.discountPct}%</td>
      <td align="right">${l.taxPct}%</td>
      <td align="right">${formatINR(l.amount)}</td>
    </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${rec.invoiceNo}</title>
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
  <h1>Tax Invoice</h1>
  <p class="muted">${rec.invoiceNo} · ${rec.invoiceDate}</p>
  <p><strong>Bill To:</strong> ${escapeHtml(rec.customerName)}<br/>
  ${escapeHtml(rec.billingAddress)}<br/>
  ${rec.customerGst ? `GSTIN: ${escapeHtml(rec.customerGst)}` : ""}<br/>
  ${escapeHtml(rec.customerMobile)} · ${escapeHtml(rec.customerEmail)}</p>
  <p class="muted">Due: ${rec.dueDate}${rec.referenceNo ? ` · Ref: ${escapeHtml(rec.referenceNo)}` : ""}</p>
  <table>
    <thead><tr>
      <th>Product</th><th>Description</th><th>Qty</th><th>Unit</th>
      <th>Unit Price</th><th>Disc %</th><th>Tax %</th><th>Amount</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <table class="totals">
    <tr><td class="label">Subtotal</td><td align="right">${formatINR(rec.subtotal)}</td></tr>
    <tr><td class="label">Discount</td><td align="right">${formatINR(rec.discountTotal)}</td></tr>
    <tr><td class="label">Tax</td><td align="right">${formatINR(rec.taxAmount)}</td></tr>
    <tr><td class="grand">Grand Total</td><td align="right" class="grand">${formatINR(rec.grandTotal)}</td></tr>
    <tr><td class="label">Received</td><td align="right">${formatINR(rec.amountReceived)}</td></tr>
    <tr><td class="label">Balance</td><td align="right">${formatINR(rec.balanceAmount)}</td></tr>
  </table>
  ${rec.remarks ? `<p style="margin-top:16px"><strong>Remarks:</strong> ${escapeHtml(rec.remarks)}</p>` : ""}
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
