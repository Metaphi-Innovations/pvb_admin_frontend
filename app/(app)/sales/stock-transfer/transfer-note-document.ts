import { type StockTransfer } from "./stock-transfer-data";
import { calculateOrderTotalsSummary, getProductById } from "@/app/(app)/sales/orders/orders-data";
import { type PackingList } from "@/app/(app)/sales/orders/packing-list-data";

function formatRupee(n: number | undefined | null): string {
  if (n === undefined || n === null || isNaN(n)) return "₹0.00";
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildTransferNoteHtml(transfer: StockTransfer): string {
  const totals = calculateOrderTotalsSummary(transfer.lineItems, transfer.additionalExpenses || []);
  const printDate = new Date().toISOString().slice(0, 10);

  const rows = transfer.lineItems
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

  const expensesRows = (transfer.additionalExpenses || [])
    .map(exp => `
      <tr>
        <td colspan="6" style="padding:4px 8px;border:1px solid #e5e7eb;text-align:right">${exp.expenseName}:</td>
        <td style="padding:4px 8px;border:1px solid #e5e7eb;text-align:right;font-weight:600">${formatRupee(exp.netAmount)}</td>
      </tr>
    `)
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Transfer Note - ${transfer.transferNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 32px; }
    h1 { font-size: 20px; color: #1A3A96; margin-bottom: 4px; }
    h2 { font-size: 14px; color: #1a1a1a; margin-bottom: 16px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 24px; }
    .section { margin-bottom: 16px; }
    .label { font-size: 10px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #f3f4f6; padding: 8px; border: 1px solid #e5e7eb; text-align: left; font-size: 11px; }
    .totals { margin-top: 16px; width: 280px; margin-left: auto; }
    .totals tr td { padding: 4px 8px; font-size: 12px; }
    .grand { font-weight: 700; color: #1A3A96; font-size: 14px; }
    .footer { margin-top: 32px; font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 12px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>STOCK TRANSFER NOTE</h1>
      <p>Paramverse Bio ERP</p>
    </div>
    <div style="text-align:right">
      <h2>Document No: ${transfer.transferNumber}</h2>
      <p><span class="label">Date</span><br/><strong>${transfer.transferDate}</strong></p>
      <p style="margin-top:8px"><span class="label">Expected Delivery Date</span><br/>${transfer.deliveryDate}</p>
    </div>
  </div>

  <div class="section" style="display:flex;gap:48px;margin-bottom:24px">
    <div>
      <p class="label" style="font-weight:700">Source Warehouse</p>
      <p style="font-weight:600;margin-top:4px">${transfer.sourceWarehouseName}</p>
      <p>${transfer.sourceWarehouseCode}</p>
    </div>
    <div style="border-left:1px solid #e5e7eb;padding-left:48px">
      <p class="label" style="font-weight:700">Target Warehouse</p>
      <p style="font-weight:600;margin-top:4px">${transfer.targetWarehouseName}</p>
      <p>${transfer.targetWarehouseCode}</p>
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
      ${expensesRows}
    </tbody>
  </table>

  <table class="totals">
    <tr><td>Product Subtotal:</td><td style="text-align:right">${formatRupee(totals.productSubtotal)}</td></tr>
    <tr><td>Product Discount Total:</td><td style="text-align:right">${formatRupee(totals.productDiscountTotal)}</td></tr>
    <tr><td>Additional Expenses:</td><td style="text-align:right">${formatRupee(totals.netAdditionalExpenses)}</td></tr>
    <tr><td>Taxable Amount:</td><td style="text-align:right">${formatRupee(totals.taxableAmount)}</td></tr>
    <tr><td>Total GST:</td><td style="text-align:right">${formatRupee(totals.totalGst)}</td></tr>
    <tr><td class="grand">Grand Total:</td><td class="grand" style="text-align:right">${formatRupee(totals.grandTotal)}</td></tr>
  </table>

  <div class="footer">
    <p><strong>Notes:</strong> This document serves as proof of material transfer between warehouses. Verify item counts before accepting shipment.</p>
    <p style="margin-top:8px">Generated on ${printDate} · Transfer Ref: ${transfer.transferNumber}</p>
  </div>
</body>
</html>`;
}

export function downloadTransferNote(transfer: StockTransfer): void {
  const html = buildTransferNoteHtml(transfer);
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.document.title = `TransferNote-${transfer.transferNumber}.pdf`;
  win.focus();
  setTimeout(() => win.print(), 400);
}

export function printTransferPackingList(transfer: StockTransfer): void {
  const rows = transfer.lineItems.map((line, i) => {
    const product = line.productId ? getProductById(line.productId) : undefined;
    return `
      <tr>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:center">${i + 1}</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb">${line.productCode} — ${line.productName}</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:center">${product?.uom || "KG"}</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">${line.quantity}</td>
      </tr>
    `;
  }).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Packing List - ${transfer.transferNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; padding: 32px; color: #1a1a1a; }
    h1 { font-size: 18px; color: #1A3A96; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #f3f4f6; padding: 8px; border: 1px solid #e5e7eb; text-align: left; font-size: 11px; }
  </style>
</head>
<body>
  <h1>Transfer Packing List — ${transfer.transferNumber}</h1>
  <p>Source Warehouse: ${transfer.sourceWarehouseName} · Target Warehouse: ${transfer.targetWarehouseName} · Date: ${transfer.transferDate}</p>
  <table>
    <thead>
      <tr>
        <th style="width:32px">#</th>
        <th>Product</th>
        <th style="text-align:center;width:80px">UOM</th>
        <th style="text-align:right;width:100px">Qty</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

export function printTransferPackingListDocument(list: PackingList, transfer: StockTransfer): void {
  const rows = list.lines.flatMap((line, li) =>
    line.allocations
      .filter(a => a.allocatedBaseQty > 0)
      .map((alloc, ai) => `
        <tr>
          <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:center">${li + 1}.${ai + 1}</td>
          <td style="padding:6px 8px;border:1px solid #e5e7eb">${line.productCode} — ${line.productName}</td>
          <td style="padding:6px 8px;border:1px solid #e5e7eb;font-family:monospace">${alloc.batchNumber}</td>
          <td style="padding:6px 8px;border:1px solid #e5e7eb">${alloc.expiryDate}</td>
          <td style="padding:6px 8px;border:1px solid #e5e7eb;font-family:monospace">${alloc.cartonNumber}</td>
          <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">${alloc.allocatedPackingQty} ${alloc.packingUnit}</td>
          <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">${alloc.allocatedBaseQty} ${alloc.baseUnit}</td>
        </tr>
      `),
  ).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Packing List - ${transfer.transferNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 32px; }
    h1 { font-size: 20px; color: #1A3A96; margin-bottom: 4px; }
    h2 { font-size: 14px; color: #1a1a1a; margin-bottom: 16px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 24px; }
    .section { margin-bottom: 16px; }
    .label { font-size: 10px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #f3f4f6; padding: 8px; border: 1px solid #e5e7eb; text-align: left; font-size: 11px; }
    .footer { margin-top: 32px; font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 12px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>STOCK TRANSFER PACKING LIST</h1>
      <p>Paramverse Bio ERP</p>
    </div>
    <div style="text-align:right">
      <h2>Document No: ${list.packingListNumber}</h2>
      <p><span class="label">Date</span><br/><strong>${list.createdDate}</strong></p>
      <p style="margin-top:8px"><span class="label">Transfer Ref</span><br/>${transfer.transferNumber}</p>
    </div>
  </div>

  <div class="section" style="display:flex;gap:48px;margin-bottom:24px">
    <div>
      <p class="label" style="font-weight:700">Source Warehouse</p>
      <p style="font-weight:600;margin-top:4px">${transfer.sourceWarehouseName}</p>
      <p>${transfer.sourceWarehouseCode}</p>
    </div>
    <div style="border-left:1px solid #e5e7eb;padding-left:48px">
      <p class="label" style="font-weight:700">Target Warehouse</p>
      <p style="font-weight:600;margin-top:4px">${transfer.targetWarehouseName}</p>
      <p>${transfer.targetWarehouseCode}</p>
    </div>
  </div>

  ${list.hasInsufficientStock ? '<p style="color:#b45309;margin-bottom:8px;font-weight:600">⚠ Warning: Insufficient stock in source warehouse. Partial allocations included.</p>' : ""}

  <table>
    <thead>
      <tr>
        <th style="width:32px">#</th>
        <th>Product</th>
        <th>Batch</th>
        <th>Expiry</th>
        <th>Box/Carton</th>
        <th style="text-align:right;width:100px">Packing Qty</th>
        <th style="text-align:right;width:100px">Base Qty</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="7" style="padding:12px;text-align:center;color:#6b7280">No packed items</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    <p><strong>Notes:</strong> This packing list specifies carton/box allocations under FEFO guidelines for the transfer. Verify batch numbers and box IDs during dispatch and receiving.</p>
  </div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}
