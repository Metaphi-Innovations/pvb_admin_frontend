import type { DayBookEntry } from "@/lib/accounts/day-book-data";
import { formatDayBookDate } from "@/lib/accounts/day-book-data";
import { formatMoney } from "@/lib/accounts/money-format";

export interface DayBookExportMeta {
  dateFrom: string;
  dateTo: string;
  financialYear: string;
  voucherType: string;
  search: string;
}

export async function exportDayBookToExcel(
  entries: DayBookEntry[],
  meta: DayBookExportMeta,
  summary: { totalDebit: number; totalCredit: number; isBalanced: boolean },
): Promise<void> {
  const XLSX = await import("xlsx");
  const rows = entries.map((e) => ({
    Date: formatDayBookDate(e.date),
    "Voucher No.": e.voucherNo,
    "Voucher Type": e.voucherTypeLabel,
    "Ledger / Party": e.partyLedger,
    Narration: e.narration,
    "Debit (₹)": e.debit || "",
    "Credit (₹)": e.credit || "",
  }));

  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Day Book");

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["Day Book Report"],
    ["Period", `${meta.dateFrom} to ${meta.dateTo}`],
    ["Financial Year", meta.financialYear],
    ["Voucher Type", meta.voucherType],
    ["Search", meta.search || "—"],
    ["Total Entries", entries.length],
    ["Total Debit", summary.totalDebit],
    ["Total Credit", summary.totalCredit],
    ["Balanced", summary.isBalanced ? "Yes" : "No"],
    ...(summary.isBalanced ? [] : [["Difference", summary.totalDebit - summary.totalCredit]]),
  ]);
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Day_Book_${date}.xlsx`);
}

export function exportDayBookToPdf(
  entries: DayBookEntry[],
  meta: DayBookExportMeta,
  summary: { totalDebit: number; totalCredit: number; isBalanced: boolean },
): void {
  const tableRows = entries
    .map(
      (e) => `
    <tr>
      <td>${formatDayBookDate(e.date)}</td>
      <td class="mono">${e.voucherNo}</td>
      <td>${e.voucherTypeLabel}</td>
      <td>${e.partyLedger}</td>
      <td>${e.narration}</td>
      <td class="num">${e.debit ? formatMoney(e.debit) : "—"}</td>
      <td class="num">${e.credit ? formatMoney(e.credit) : "—"}</td>
    </tr>`,
    )
    .join("");

  const balanceNote = summary.isBalanced
    ? '<p class="balanced">Totals are balanced.</p>'
    : `<p class="warning">Warning: Total Debit and Total Credit do not match (difference: ${formatMoney(summary.totalDebit - summary.totalCredit)}).</p>`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Day Book Report</title>
  <style>
    body { font-family: system-ui, sans-serif; font-size: 10px; padding: 24px; color: #111; }
    h1 { font-size: 16px; margin: 0 0 4px; color: #1A3A96; }
    .meta { color: #555; margin-bottom: 12px; font-size: 10px; line-height: 1.5; }
    .summary { display: flex; gap: 24px; margin-bottom: 12px; font-size: 11px; }
    .summary span { font-weight: 600; }
    .balanced { color: #267A2E; font-size: 11px; margin-bottom: 12px; }
    .warning { color: #B91C1C; font-size: 11px; margin-bottom: 12px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 5px 6px; text-align: left; vertical-align: top; }
    th { background: #fff; font-size: 9px; text-transform: uppercase; }
    .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .mono { font-family: monospace; font-size: 9px; color: #B85508; }
    tfoot td { font-weight: 600; background: #fafafa; }
  </style>
</head>
<body>
  <h1>Day Book</h1>
  <p class="meta">
    Period: ${meta.dateFrom} to ${meta.dateTo}<br />
    Financial Year: ${meta.financialYear}<br />
    Voucher Type: ${meta.voucherType}<br />
    Search: ${meta.search || "—"}
  </p>
  <div class="summary">
    <div>Entries: <span>${entries.length}</span></div>
    <div>Total Debit: <span>${formatMoney(summary.totalDebit)}</span></div>
    <div>Total Credit: <span>${formatMoney(summary.totalCredit)}</span></div>
  </div>
  ${balanceNote}
  <table>
    <thead>
      <tr>
        <th>Date</th><th>Voucher No.</th><th>Voucher Type</th><th>Ledger / Party</th>
        <th>Narration</th><th>Debit</th><th>Credit</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
    <tfoot>
      <tr>
        <td colspan="5">Totals</td>
        <td class="num">${formatMoney(summary.totalDebit)}</td>
        <td class="num">${formatMoney(summary.totalCredit)}</td>
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
