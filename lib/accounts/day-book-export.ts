import type { DayBookEntry } from "@/lib/accounts/day-book-data";
import { formatDayBookDate } from "@/lib/accounts/day-book-data";
import { formatMoney } from "@/lib/accounts/money-format";

function statusLabel(status: DayBookEntry["status"]): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export async function exportDayBookToExcel(
  entries: DayBookEntry[],
  meta: { dateFrom: string; dateTo: string; financialYear: string },
): Promise<void> {
  const XLSX = await import("xlsx");
  const rows = entries.map((e) => ({
    Date: formatDayBookDate(e.date),
    Time: e.time,
    "Voucher No.": e.voucherNo,
    "Voucher Type": e.voucherTypeLabel,
    "Party / Ledger": e.partyLedger,
    Narration: e.narration,
    "Debit (₹)": e.debit,
    "Credit (₹)": e.credit,
    "Created By": e.createdBy,
    Status: statusLabel(e.status),
  }));

  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Day Book");

  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
  const summary = XLSX.utils.aoa_to_sheet([
    ["Day Book Report"],
    ["Period", `${meta.dateFrom} to ${meta.dateTo}`],
    ["Financial Year", meta.financialYear],
    ["Total Vouchers", entries.length],
    ["Total Debit", totalDebit],
    ["Total Credit", totalCredit],
    ["Net Difference", totalDebit - totalCredit],
  ]);
  XLSX.utils.book_append_sheet(wb, summary, "Summary");

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Day_Book_${date}.xlsx`);
}

export function exportDayBookToPdf(
  entries: DayBookEntry[],
  meta: { dateFrom: string; dateTo: string; financialYear: string },
): void {
  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
  const net = totalDebit - totalCredit;

  const tableRows = entries
    .map(
      (e) => `
    <tr>
      <td>${formatDayBookDate(e.date)}</td>
      <td>${e.time}</td>
      <td class="mono">${e.voucherNo}</td>
      <td>${e.voucherTypeLabel}</td>
      <td>${e.partyLedger}</td>
      <td>${e.narration}</td>
      <td class="num">${formatMoney(e.debit)}</td>
      <td class="num">${formatMoney(e.credit)}</td>
      <td>${e.createdBy}</td>
      <td>${statusLabel(e.status)}</td>
    </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Day Book Report</title>
  <style>
    body { font-family: system-ui, sans-serif; font-size: 10px; padding: 24px; color: #111; }
    h1 { font-size: 16px; margin: 0 0 4px; color: #1A3A96; }
    .meta { color: #555; margin-bottom: 16px; font-size: 10px; }
    .summary { display: flex; gap: 24px; margin-bottom: 16px; font-size: 11px; }
    .summary span { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 5px 6px; text-align: left; vertical-align: top; }
    th { background: #f5f5f5; font-size: 9px; text-transform: uppercase; }
    .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .mono { font-family: monospace; font-size: 9px; color: #B85508; }
    tfoot td { font-weight: 600; background: #fafafa; }
  </style>
</head>
<body>
  <h1>Day Book</h1>
  <p class="meta">Period: ${meta.dateFrom} to ${meta.dateTo} · ${meta.financialYear}</p>
  <div class="summary">
    <div>Vouchers: <span>${entries.length}</span></div>
    <div>Total Debit: <span>${formatMoney(totalDebit)}</span></div>
    <div>Total Credit: <span>${formatMoney(totalCredit)}</span></div>
    <div>Net Difference: <span>${formatMoney(net)}</span></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Date</th><th>Time</th><th>Voucher No.</th><th>Type</th><th>Party</th>
        <th>Narration</th><th>Debit</th><th>Credit</th><th>Created By</th><th>Status</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
    <tfoot>
      <tr>
        <td colspan="6">Totals</td>
        <td class="num">${formatMoney(totalDebit)}</td>
        <td class="num">${formatMoney(totalCredit)}</td>
        <td colspan="2"></td>
      </tr>
    </tfoot>
  </table>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
