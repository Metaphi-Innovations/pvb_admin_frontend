import { normalizeInvoice, type InvoiceRecord, getInvoiceAmountBreakup } from "./invoices-data";
import { formatINR, INVOICE_AMOUNT_LABELS } from "./invoice-utils";
import { getBankAccountPrintDetails } from "@/components/accounts/WarehouseMappedBankAccountSelect";
import { getInvoiceGstBreakup } from "@/lib/accounts/invoice-gst-breakup";

export function downloadInvoicePdf(invoice: InvoiceRecord): void {
  const rec = normalizeInvoice(invoice);
  const { taxableValue, invoiceTotal } = getInvoiceAmountBreakup(rec);
  const isSalesOrderInvoice = rec.sourceType === "sales_order";
  const isServiceInvoice = rec.sourceType === "service";
  const gst = getInvoiceGstBreakup(rec);
  const bank =
    isSalesOrderInvoice || isServiceInvoice
      ? getBankAccountPrintDetails(rec.bankAccountId)
      : null;

  const rows = isSalesOrderInvoice
    ? rec.lineItems
        .map(
          (l) => `
    <tr>
      <td>${escapeHtml(l.productCode || "—")}</td>
      <td>${escapeHtml(l.productName || "—")}</td>
      <td>${escapeHtml(l.hsn || "—")}</td>
      <td>${escapeHtml(l.batchNo || "—")}</td>
      <td align="right">${l.qty}</td>
      <td>${escapeHtml(l.unit)}</td>
      <td align="right">${formatINR(l.unitPrice)}</td>
      <td align="right">${l.discountPct}%</td>
      <td align="right">${l.taxPct}%</td>
      <td align="right">${formatINR(l.amount)}</td>
    </tr>`,
        )
        .join("")
    : rec.lineItems
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

  const tableHead = isSalesOrderInvoice
    ? `<th>Code</th><th>Product</th><th>HSN</th><th>Batch</th><th>Qty</th><th>Unit</th>
      <th>Rate</th><th>Disc %</th><th>Tax %</th><th>Amount</th>`
    : `<th>Product</th><th>Description</th><th>Qty</th><th>Unit</th>
      <th>Unit Price</th><th>Disc %</th><th>Tax %</th><th>Amount</th>`;

  const taxRows = gst.interstate
    ? `<tr><td class="label">Output IGST</td><td align="right">${formatINR(gst.igst)}</td></tr>`
    : `<tr><td class="label">Output CGST</td><td align="right">${formatINR(gst.cgst)}</td></tr>
       <tr><td class="label">Output SGST</td><td align="right">${formatINR(gst.sgst)}</td></tr>`;

  const bankBlock = bank
    ? `<div style="margin-top:16px;padding:10px;border:1px solid #ddd;border-radius:6px">
        <p style="margin:0 0 4px;font-weight:700">Bank Details (for payment)</p>
        <p style="margin:0" class="muted">${escapeHtml(bank.bankName)} · A/c ${escapeHtml(bank.accountNumber)} · IFSC ${escapeHtml(bank.ifsc)}${bank.branchName ? ` · ${escapeHtml(bank.branchName)}` : ""}</p>
      </div>`
    : "";

  const footerNotes =
    isSalesOrderInvoice || isServiceInvoice
      ? rec.internalRemarks || rec.remarks
        ? `<p style="margin-top:16px"><strong>Narration:</strong> ${escapeHtml(rec.internalRemarks || rec.remarks)}</p>`
        : ""
      : rec.remarks
        ? `<p style="margin-top:16px"><strong>Remarks:</strong> ${escapeHtml(rec.remarks)}</p>`
        : "";

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
  <h1>${isServiceInvoice ? "Service Invoice" : "Tax Invoice"}</h1>
  <p class="muted">${escapeHtml(rec.invoiceNo)} · ${escapeHtml(rec.invoiceDate)}</p>
  <p><strong>Bill To:</strong> ${escapeHtml(rec.customerName)}<br/>
  ${escapeHtml(rec.billingAddress)}<br/>
  ${rec.customerGst ? `GSTIN: ${escapeHtml(rec.customerGst)}` : ""}<br/>
  ${escapeHtml(rec.customerMobile)} · ${escapeHtml(rec.customerEmail)}</p>
  ${
    isSalesOrderInvoice && rec.dispatchNo
      ? `<p class="muted">SO: ${escapeHtml(rec.salesOrderNo || "—")} · Dispatch: ${escapeHtml(rec.dispatchNo)}${rec.dispatchDate ? ` (${escapeHtml(rec.dispatchDate)})` : ""}</p>`
      : ""
  }
  ${rec.lutNumber ? `<p><strong>LUT No.:</strong> ${escapeHtml(rec.lutNumber)}</p>` : ""}
  ${rec.lutDeclaration ? `<p class="muted" style="margin-top:8px;font-weight:600;color:#333">${escapeHtml(rec.lutDeclaration)}</p>` : ""}
  <p class="muted">Due: ${escapeHtml(rec.dueDate)}${rec.referenceNo ? ` · Ref: ${escapeHtml(rec.referenceNo)}` : ""}</p>
  <table>
    <thead><tr>${tableHead}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <table class="totals">
    <tr><td class="label">${INVOICE_AMOUNT_LABELS.taxableValue}</td><td align="right">${formatINR(taxableValue)}</td></tr>
    <tr><td class="label">Discount</td><td align="right">${formatINR(rec.discountTotal)}</td></tr>
    ${taxRows}
    <tr><td class="grand">${INVOICE_AMOUNT_LABELS.invoiceTotal}</td><td align="right" class="grand">${formatINR(invoiceTotal)}</td></tr>
    <tr><td class="label">Received</td><td align="right">${formatINR(rec.amountReceived)}</td></tr>
    <tr><td class="label">Balance Due</td><td align="right">${formatINR(rec.balanceAmount)}</td></tr>
  </table>
  ${bankBlock}
  ${footerNotes}
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
