import { formatMoney } from "@/lib/accounts/money-format";
import {
  FUND_TRANSFER_MODE_LABELS,
  type FundTransferRecord,
} from "@/lib/accounts/fund-transfer-data";

export interface FundTransferExportMeta {
  dateFrom: string;
  dateTo: string;
  financialYear: string;
  fromAccount: string;
  toAccount: string;
  transferMode: string;
  search: string;
}

export async function exportFundTransfersToExcel(
  rows: FundTransferRecord[],
  meta: FundTransferExportMeta,
): Promise<void> {
  const XLSX = await import("xlsx");
  const dataRows = rows.map((r) => ({
    "Transfer Date": r.transferDate,
    "Transfer No.": r.transferNo,
    "From Account": r.fromAccountName,
    "To Account": r.toAccountName,
    "Amount (₹)": r.amount,
    Mode: FUND_TRANSFER_MODE_LABELS[r.transferMode],
    "Reference No.": r.referenceNo,
    Narration: r.narration,
    Status: r.status === "completed" ? "Completed" : "Cancelled",
  }));

  const sheet = XLSX.utils.json_to_sheet(dataRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Fund Transfers");

  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);
  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["Fund Transfer Report"],
    ["Period", `${meta.dateFrom} to ${meta.dateTo}`],
    ["Financial Year", meta.financialYear],
    ["From Account", meta.fromAccount],
    ["To Account", meta.toAccount],
    ["Mode", meta.transferMode],
    ["Search", meta.search || "—"],
    ["Total Transfers", rows.length],
    ["Total Amount", totalAmount],
  ]);
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Fund_Transfers_${date}.xlsx`);
}

export function exportFundTransfersToPdf(
  rows: FundTransferRecord[],
  meta: FundTransferExportMeta,
): void {
  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);
  const tableRows = rows
    .map(
      (r) => `
    <tr>
      <td>${r.transferDate}</td>
      <td class="mono">${r.transferNo}</td>
      <td>${r.fromAccountName}</td>
      <td>${r.toAccountName}</td>
      <td class="num">${formatMoney(r.amount)}</td>
      <td>${FUND_TRANSFER_MODE_LABELS[r.transferMode]}</td>
      <td class="mono">${r.referenceNo || "—"}</td>
      <td>${r.status === "completed" ? "Completed" : "Cancelled"}</td>
    </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Fund Transfer Report</title>
  <style>
    body { font-family: system-ui, sans-serif; font-size: 11px; padding: 24px; color: #111; }
    h1 { font-size: 16px; margin: 0 0 4px; }
    .meta { color: #555; margin-bottom: 16px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f5f5f5; font-weight: 600; }
    .num, .mono { font-family: ui-monospace, monospace; }
    .num { text-align: right; }
    tfoot td { font-weight: 700; background: #fafafa; }
  </style>
</head>
<body>
  <h1>Fund Transfer</h1>
  <div class="meta">
    <div>Period: ${meta.dateFrom} to ${meta.dateTo}</div>
    <div>Financial Year: ${meta.financialYear}</div>
    <div>From Account: ${meta.fromAccount}</div>
    <div>To Account: ${meta.toAccount}</div>
    <div>Mode: ${meta.transferMode}</div>
    <div>Search: ${meta.search || "—"}</div>
    <div>Total Transfers: ${rows.length} · Total Amount: ${formatMoney(totalAmount)}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Transfer Date</th>
        <th>Transfer No.</th>
        <th>From Account</th>
        <th>To Account</th>
        <th>Amount</th>
        <th>Mode</th>
        <th>Reference No.</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows || '<tr><td colspan="8">No records</td></tr>'}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4">Total</td>
        <td class="num">${formatMoney(totalAmount)}</td>
        <td colspan="3"></td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}
