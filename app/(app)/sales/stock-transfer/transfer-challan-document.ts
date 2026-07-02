import type { StockTransfer } from "./stock-transfer-data";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildStockTransferChallanHtml(
  transfer: StockTransfer,
  dispatchNo: string,
): string {
  const rows = transfer.lineItems
    .map((line) => {
      const batchInfo = line.batchAllocations?.length
        ? line.batchAllocations.map((b) => `${b.batchNumber} (×${b.allocatedQty})`).join(", ")
        : line.batchNumber ?? "—";
      return `<tr>
        <td>${escapeHtml(line.productName)}</td>
        <td>${escapeHtml(line.productCode)}</td>
        <td>${escapeHtml(batchInfo)}</td>
        <td style="text-align:right">${line.packedQty ?? line.quantity}</td>
        <td style="text-align:right">₹${(line.lineTotal ?? 0).toLocaleString("en-IN")}</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Stock Transfer Challan ${escapeHtml(transfer.transferNumber)}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
    h1 { font-size: 20px; margin: 0 0 4px; color: #1A3A96; }
    .meta { font-size: 12px; color: #555; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
  </style></head><body>
  <h1>Stock Transfer Challan / GST Transfer Document</h1>
  <div class="meta">
    Transfer No: <strong>${escapeHtml(transfer.transferNumber)}</strong> ·
    Dispatch No: <strong>${escapeHtml(dispatchNo)}</strong><br/>
    From: <strong>${escapeHtml(transfer.sourceWarehouseName)}</strong> →
    To: <strong>${escapeHtml(transfer.targetWarehouseName)}</strong><br/>
    Transfer Date: ${escapeHtml(transfer.transferDate)} ·
    Reason: ${escapeHtml(transfer.reasonPurpose ?? "—")}
  </div>
  <table>
    <thead><tr><th>Product</th><th>SKU</th><th>Batch</th><th>Qty</th><th>Value</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="margin-top:16px;font-size:12px;">Total Transfer Value: <strong>₹${transfer.totalAmount.toLocaleString("en-IN")}</strong></p>
  </body></html>`;
}

export function downloadStockTransferChallan(transfer: StockTransfer, dispatchNo: string): void {
  if (typeof window === "undefined") return;
  const html = buildStockTransferChallanHtml(transfer, dispatchNo);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${transfer.transferNumber}-challan.html`;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
