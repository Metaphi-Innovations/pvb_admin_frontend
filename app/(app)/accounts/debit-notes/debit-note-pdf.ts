import { normalizeDebitNote, REFERENCE_TYPE_LABELS, type DebitNoteRecord } from "./debit-notes-data";
import { formatINR } from "./note-utils";

export function downloadDebitNotePdf(record: DebitNoteRecord): void {
  const rec = normalizeDebitNote(record);
  const rows =
    rec.againstType === "standalone_adjustment"
      ? ""
      : rec.lineItems
          .map(
            (l) => `
    <tr>
      <td>${escapeHtml(l.productName || "—")}</td>
      <td align="right">${l.invoiceQty}</td>
      <td align="right">${l.returnQty}</td>
      <td>${escapeHtml(l.uom)}</td>
      <td align="right">${formatINR(l.unitPrice)}</td>
      <td align="right">${l.taxPct}%</td>
      <td align="right">${formatINR(l.debitAmount)}</td>
    </tr>`,
          )
          .join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${rec.debitNoteNo}</title>
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
  <h1>Debit Note</h1>
  <p class="muted">${rec.debitNoteNo} · ${rec.debitNoteDate}</p>
  <p><strong>Vendor:</strong> ${escapeHtml(rec.vendorName)}</p>
  <p class="muted">Reference: ${REFERENCE_TYPE_LABELS[rec.againstType]}
  ${rec.sourceInvoiceNo ? ` · PI: ${escapeHtml(rec.sourceInvoiceNo)}` : ""}
  ${rec.sourcePoNo ? ` · PO: ${escapeHtml(rec.sourcePoNo)}` : ""}</p>
  <p><strong>Reason:</strong> ${escapeHtml(rec.reason)}</p>
  ${
    rows
      ? `<table>
    <thead><tr>
      <th>Product</th><th>Inv Qty</th><th>Return Qty</th><th>UOM</th><th>Rate</th><th>GST %</th><th>Debit Amt</th>
    </tr></thead><tbody>${rows}</tbody></table>`
      : `<p>Standalone adjustment: ${formatINR(rec.standaloneDebitAmount)}</p>`
  }
  <table class="totals">
    <tr><td class="label">Taxable Amount</td><td align="right">${formatINR(rec.taxableAmount)}</td></tr>
    <tr><td class="label">GST Amount</td><td align="right">${formatINR(rec.gstAmount)}</td></tr>
    <tr><td class="grand">Total Debit</td><td align="right" class="grand">${formatINR(rec.currentDebitAmount)}</td></tr>
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
