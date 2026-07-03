import { formatMoney } from "@/lib/accounts/money-format";
import type { JournalRegisterRow, JournalRegisterSummary } from "./journal-register-data";
import { formatJournalRegisterDate } from "./journal-register-data";

export interface JournalRegisterExportMeta {
  dateFrom: string;
  dateTo: string;
  ledger: string;
  search: string;
}

export async function exportJournalRegisterToExcel(
  rows: JournalRegisterRow[],
  meta: JournalRegisterExportMeta,
  summary: JournalRegisterSummary,
): Promise<void> {
  const XLSX = await import("xlsx");
  const dataRows = rows.map((r) => ({
    Date: formatJournalRegisterDate(r.date),
    "Journal No.": r.journalNo,
    "Reference No.": r.referenceNo === "—" ? "" : r.referenceNo,
    "Debit Ledger": r.debitLedger,
    "Credit Ledger": r.creditLedger,
    Narration: r.narration,
    "Debit Amount (₹)": r.debitAmount,
    "Credit Amount (₹)": r.creditAmount,
  }));

  const sheet = XLSX.utils.json_to_sheet(dataRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Journal Register");

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["Journal Register Report"],
    ["Period", `${meta.dateFrom} to ${meta.dateTo}`],
    ["Ledger Filter", meta.ledger || "All"],
    ["Search", meta.search || "—"],
    ["Total Entries", summary.count],
    ["Total Debit", summary.totalDebit],
    ["Total Credit", summary.totalCredit],
    ["Balanced", summary.isBalanced ? "Yes" : "No"],
    ...(summary.isBalanced ? [] : [["Difference", summary.difference]]),
  ]);
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Journal_Register_${date}.xlsx`);
}

export function exportJournalRegisterToPdf(
  rows: JournalRegisterRow[],
  meta: JournalRegisterExportMeta,
  summary: JournalRegisterSummary,
): void {
  const tableRows = rows
    .map(
      (r) => `
    <tr>
      <td>${formatJournalRegisterDate(r.date)}</td>
      <td class="mono">${r.journalNo}</td>
      <td class="mono">${r.referenceNo === "—" ? "" : r.referenceNo}</td>
      <td>${r.debitLedger}</td>
      <td>${r.creditLedger}</td>
      <td>${r.narration}</td>
      <td class="num">${formatMoney(r.debitAmount)}</td>
      <td class="num">${formatMoney(r.creditAmount)}</td>
    </tr>`,
    )
    .join("");

  const balanceNote = summary.isBalanced
    ? '<p class="balanced">Totals are balanced.</p>'
    : `<p class="warning">Warning: Total Debit and Total Credit do not match (difference: ${formatMoney(summary.difference)}).</p>`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Journal Register Report</title>
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
    .balanced { color: #267A2E; margin-top: 12px; }
    .warning { color: #B91C1C; margin-top: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <h1>Journal Register</h1>
  <div class="meta">
    <div>Period: ${meta.dateFrom} to ${meta.dateTo}</div>
    <div>Ledger Filter: ${meta.ledger || "All"}</div>
    <div>Search: ${meta.search || "—"}</div>
    <div>Entries: ${summary.count}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Journal No.</th>
        <th>Reference No.</th>
        <th>Debit Ledger</th>
        <th>Credit Ledger</th>
        <th>Narration</th>
        <th class="num">Debit Amount</th>
        <th class="num">Credit Amount</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
    <tfoot>
      <tr>
        <td colspan="6">Total</td>
        <td class="num">${formatMoney(summary.totalDebit)}</td>
        <td class="num">${formatMoney(summary.totalCredit)}</td>
      </tr>
    </tfoot>
  </table>
  ${balanceNote}
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
