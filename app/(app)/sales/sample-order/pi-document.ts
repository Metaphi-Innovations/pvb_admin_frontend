// ── Sample Issue Note — printable / download document ───────────────────────

import {
  SAMPLE_BILLING_DETAILS,
  SAMPLE_ORDER_LINE_DISCOUNT_PERCENT,
  type SalesOrder,
  hydrateOrderLineItems,
  todayStr,
} from "./orders-data";

function formatRupee(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildSampleIssueHtml(order: SalesOrder): string {
  const hydrated = hydrateOrderLineItems(order);
  const docDate = todayStr();
  const employeeLine = order.issuedToEmployeeName
    ? `${order.issuedToEmployeeName}${order.issuedToEmployeeRole ? ` (${order.issuedToEmployeeRole})` : ""}`
    : order.salesManName;

  let grossSubtotal = 0;
  let discountTotal = 0;

  const rows = hydrated.lineItems
    .filter((l) => l.productId)
    .map((line, i) => {
      const rate = line.unitPrice;
      const gross = line.quantity * rate;
      const discAmt = line.discountValue || gross * (SAMPLE_ORDER_LINE_DISCOUNT_PERCENT / 100);
      grossSubtotal += gross;
      discountTotal += discAmt;
      return `
      <tr>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:center">${i + 1}</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb">${line.productCode} — ${line.productName}</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">${line.quantity}</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb">${line.unit || "—"}</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">${formatRupee(rate)}</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">${SAMPLE_ORDER_LINE_DISCOUNT_PERCENT}%</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">${formatRupee(discAmt)}</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right;font-weight:600">${formatRupee(0)}</td>
      </tr>
    `;
    })
    .join("");

  const recipientBlock = order.recipientName
    ? `<p style="margin-top:6px"><span class="label">Optional Recipient / Distributor</span><br/>${order.recipientName}${order.recipientContact ? ` · ${order.recipientContact}` : ""}</p>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Sample Issue-${order.soNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 32px; position: relative; }
    .watermark {
      position: fixed; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 72px; font-weight: 800; color: rgba(220, 38, 38, 0.08); letter-spacing: 0.08em; z-index: 0; pointer-events: none;
    }
    .content { position: relative; z-index: 1; }
    h1 { font-size: 20px; color: #B85508; margin-bottom: 4px; }
    h2 { font-size: 14px; color: #1A3A96; margin-bottom: 8px; }
    .banner { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 8px 12px; border-radius: 8px; font-weight: 700; text-align: center; margin-bottom: 16px; letter-spacing: 0.06em; }
    .header { display: flex; justify-content: space-between; margin-bottom: 24px; }
    .section { margin-bottom: 16px; }
    .label { font-size: 10px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #f3f4f6; padding: 8px; border: 1px solid #e5e7eb; text-align: left; font-size: 11px; }
    .totals { margin-top: 16px; width: 320px; margin-left: auto; }
    .totals tr td { padding: 4px 8px; font-size: 12px; }
    .grand { font-weight: 700; color: #B85508; font-size: 14px; }
    .footer { margin-top: 32px; font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 12px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="watermark">NOT FOR SALE</div>
  <div class="content">
    <div class="banner">SAMPLE ISSUE / NOT FOR SALE</div>
    <div class="header">
      <div>
        <h1>${SAMPLE_BILLING_DETAILS.companyName}</h1>
        <p>Sample Issue Note — Zero Value Document</p>
      </div>
      <div style="text-align:right">
        <h2>SAMPLE ISSUE NOTE</h2>
        <p><span class="label">Sample Order No.</span><br/><strong>${order.soNumber}</strong></p>
        <p style="margin-top:8px"><span class="label">Issue Date</span><br/>${docDate}</p>
      </div>
    </div>

    <div class="section" style="display:flex;gap:48px;flex-wrap:wrap">
      <div>
        <p class="label">Bill To</p>
        <p style="font-weight:600;margin-top:4px">${SAMPLE_BILLING_DETAILS.companyName}</p>
        <p style="margin-top:4px;font-size:11px">${SAMPLE_BILLING_DETAILS.address}</p>
      </div>
      <div>
        <p class="label">Issued To Employee</p>
        <p style="font-weight:600;margin-top:4px">${employeeLine}</p>
        ${recipientBlock}
      </div>
      <div>
        <p class="label">Source Warehouse</p>
        <p style="font-weight:600;margin-top:4px">${order.warehouseName || "—"}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:32px">#</th>
          <th>Product</th>
          <th style="text-align:right">Qty</th>
          <th>Unit</th>
          <th style="text-align:right">Rate</th>
          <th style="text-align:right">Disc. %</th>
          <th style="text-align:right">Disc. Amt</th>
          <th style="text-align:right">Final Amt</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="8" style="padding:12px;text-align:center;color:#6b7280">No line items</td></tr>'}
      </tbody>
    </table>

    <table class="totals">
      <tr><td>Product Subtotal:</td><td style="text-align:right">${formatRupee(grossSubtotal)}</td></tr>
      <tr><td>Product Discount Total:</td><td style="text-align:right">${formatRupee(discountTotal)}</td></tr>
      <tr><td>Taxable Amount:</td><td style="text-align:right">${formatRupee(0)}</td></tr>
      <tr><td class="grand">Grand Total:</td><td class="grand" style="text-align:right">${formatRupee(0)}</td></tr>
    </table>

    <div class="footer">
      <p><strong>Note:</strong> This is a sample issue document only. Not a tax invoice. Not for sale. No receivable, revenue, credit limit, or payment term impact.</p>
      ${order.remarks ? `<p style="margin-top:8px"><strong>Remarks:</strong> ${order.remarks}</p>` : ""}
      <p style="margin-top:8px">Generated on ${docDate} · Ref: ${order.soNumber}</p>
    </div>
  </div>
</body>
</html>`;
}

/** Open printable Sample Issue Note and trigger print (Save as PDF). */
export function downloadProformaInvoice(order: SalesOrder): void {
  if (typeof window === "undefined") return;
  const html = buildSampleIssueHtml(order);
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.document.title = `SampleIssue-${order.soNumber}.pdf`;
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
  <p>Sample Order: ${list.salesOrderNumber} · Issued To: ${list.customerName} · Warehouse: ${list.warehouseName} · Date: ${list.createdDate}</p>
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
