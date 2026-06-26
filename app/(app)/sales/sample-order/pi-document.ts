// ── Proforma Invoice — printable / download document ────────────────────────

import { COMPANY_BILLING } from "@/lib/procurement/config";
import {
  type SalesOrder,
  calculateOrderTotalsSummary,
  hydrateOrderLineItems,
  todayStr,
} from "./orders-data";

function formatRupee(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildPIHtml(order: SalesOrder): string {
  const hydrated = hydrateOrderLineItems(order);
  const totals = calculateOrderTotalsSummary(hydrated.lineItems);
  const piDate = todayStr();

  const rows = hydrated.lineItems
    .filter(l => l.productId)
    .map((line, i) => `
      <tr>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:center">${i + 1}</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb">${line.productCode} — ${line.productName}</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">${line.quantity}</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">${formatRupee(line.unitPrice)}</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">${line.discount}%</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">${formatRupee(line.gstAmount)}</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right;font-weight:600">${formatRupee(line.lineTotal)}</td>
      </tr>
    `)
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>PI-${order.soNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 32px; }
    h1 { font-size: 20px; color: #B85508; margin-bottom: 4px; }
    h2 { font-size: 14px; color: #1A3A96; margin-bottom: 16px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 24px; }
    .section { margin-bottom: 16px; }
    .label { font-size: 10px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #f3f4f6; padding: 8px; border: 1px solid #e5e7eb; text-align: left; font-size: 11px; }
    .totals { margin-top: 16px; width: 280px; margin-left: auto; }
    .totals tr td { padding: 4px 8px; font-size: 12px; }
    .grand { font-weight: 700; color: #B85508; font-size: 14px; }
    .footer { margin-top: 32px; font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 12px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${COMPANY_BILLING.companyName}</h1>
      <p>${COMPANY_BILLING.billingAddress}</p>
      <p>GSTIN: ${COMPANY_BILLING.gstNumber}</p>
    </div>
    <div style="text-align:right">
      <h2>PROFORMA INVOICE</h2>
      <p><span class="label">PI No.</span><br/><strong>${order.soNumber}</strong></p>
      <p style="margin-top:8px"><span class="label">PI Date</span><br/>${piDate}</p>
    </div>
  </div>

  <div class="section" style="display:flex;gap:48px">
    <div>
      <p class="label">Bill To</p>
      <p style="font-weight:600;margin-top:4px">${order.customerName}</p>
      <p>${order.customerCode}</p>
      <p>Territory: ${order.territory}</p>
    </div>
    <div>
      <p class="label">Salesman</p>
      <p style="font-weight:600;margin-top:4px">${order.salesManName}</p>
      <p style="margin-top:8px"><span class="label">Delivery Date</span><br/>${order.deliveryDate}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:32px">#</th>
        <th>Product</th>
        <th style="text-align:right">Qty</th>
        <th style="text-align:right">Unit Price</th>
        <th style="text-align:right">Discount (%)</th>
        <th style="text-align:right">GST</th>
        <th style="text-align:right">Line Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="7" style="padding:12px;text-align:center;color:#6b7280">No line items</td></tr>'}
    </tbody>
  </table>

  <table class="totals">
    <tr><td>Subtotal (Before Discount):</td><td style="text-align:right">${formatRupee(totals.subtotalBeforeDiscount)}</td></tr>
    <tr><td>Total Item Discounts:</td><td style="text-align:right">${formatRupee(totals.totalItemDiscounts)}</td></tr>
    <tr><td>Net Total:</td><td style="text-align:right">${formatRupee(totals.netTotal)}</td></tr>
    <tr><td>Total GST:</td><td style="text-align:right">${formatRupee(totals.totalGst)}</td></tr>
    <tr><td class="grand">Grand Total:</td><td class="grand" style="text-align:right">${formatRupee(totals.grandTotal)}</td></tr>
  </table>

  <div class="footer">
    <p><strong>Terms &amp; Notes:</strong> This is a Proforma Invoice and not a tax invoice. Prices are subject to confirmation at dispatch. Payment terms as per customer agreement.</p>
    <p style="margin-top:8px">Generated on ${piDate} · Order Ref: ${order.soNumber}</p>
  </div>
</body>
</html>`;
}

/** Open printable PI in new window and trigger print (Save as PDF). */
export function downloadProformaInvoice(order: SalesOrder): void {
  const html = buildPIHtml(order);
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.document.title = `PI-${order.soNumber}.pdf`;
  win.focus();
  setTimeout(() => win.print(), 400);
}

/** Print packing list document. */
export function printPackingListDocument(list: import("./packing-list-data").PackingList): void {
  const rows = list.lines.flatMap((line, li) =>
    line.allocations
      .filter(a => a.allocatedBaseQty > 0)
      .map((alloc, ai) => `
        <tr>
          <td style="padding:6px 8px;border:1px solid #e5e7eb">${li + 1}.${ai + 1}</td>
          <td style="padding:6px 8px;border:1px solid #e5e7eb">${line.productCode} — ${line.productName}</td>
          <td style="padding:6px 8px;border:1px solid #e5e7eb">${alloc.batchNumber}</td>
          <td style="padding:6px 8px;border:1px solid #e5e7eb">${alloc.expiryDate}</td>
          <td style="padding:6px 8px;border:1px solid #e5e7eb">${alloc.cartonNumber}</td>
          <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">${alloc.allocatedPackingQty} ${alloc.packingUnit}</td>
          <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">${alloc.allocatedBaseQty} ${alloc.baseUnit}</td>
        </tr>
      `),
  ).join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${list.packingListNumber}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; padding: 32px; }
  h1 { font-size: 18px; color: #1A3A96; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { background: #f3f4f6; padding: 8px; border: 1px solid #e5e7eb; text-align: left; font-size: 11px; }
</style></head><body>
  <h1>Packing List — ${list.packingListNumber}</h1>
  <p>SO: ${list.salesOrderNumber} · Customer: ${list.customerName} · Warehouse: ${list.warehouseName} · Date: ${list.createdDate}</p>
  ${list.hasInsufficientStock ? '<p style="color:#b45309;margin-top:8px">⚠ Insufficient stock in selected warehouse</p>' : ""}
  <table><thead><tr>
    <th>#</th><th>Product</th><th>Batch</th><th>Expiry</th><th>Box/Carton</th><th style="text-align:right">Packing Qty</th><th style="text-align:right">Base Qty</th>
  </tr></thead><tbody>${rows}</tbody></table>
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}


