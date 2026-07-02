import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import type { CoaTransactionRow } from "@/lib/accounts/coa-accounting-view";
import { formatMoney, formatMoneyWithSide } from "@/lib/accounts/money-format";

export interface LedgerStatementExportMeta {
  ledgerName: string;
  ledgerCode: string;
  ledgerType: string;
  parentGroup: string;
  primaryHead: string;
  dateFrom: string;
  dateTo: string;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingBalanceType: "Debit" | "Credit";
}

function runningBalanceLabel(row: CoaTransactionRow): string {
  if (row.isOpeningRow) {
    return formatMoneyWithSide(row.runningBalance, row.runningBalanceType);
  }
  return formatMoneyWithSide(row.runningBalance, row.runningBalanceType);
}

export async function exportLedgerStatementToExcel(
  rows: CoaTransactionRow[],
  meta: LedgerStatementExportMeta,
): Promise<void> {
  const XLSX = await import("xlsx");
  const dataRows = rows.map((r) => ({
    Date: r.date,
    "Voucher No.": r.voucherNo,
    "Voucher Type": r.voucherType,
    "Reference No.": r.referenceNo,
    "Particulars / Narration": r.narration,
    "Debit (₹)": r.debit || "",
    "Credit (₹)": r.credit || "",
    "Running Balance (Dr/Cr)": runningBalanceLabel(r),
  }));

  const sheet = XLSX.utils.json_to_sheet(dataRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Ledger Statement");

  const summary = XLSX.utils.aoa_to_sheet([
    ["Ledger Name", meta.ledgerName],
    ["Ledger Code", meta.ledgerCode],
    ["Ledger Type", meta.ledgerType],
    ["Parent Group", meta.parentGroup],
    ["Primary Head", meta.primaryHead],
    ["Period", `${meta.dateFrom} to ${meta.dateTo}`],
    ["Total Debit", meta.totalDebit],
    ["Total Credit", meta.totalCredit],
    [
      "Closing Balance",
      formatMoneyWithSide(meta.closingBalance, meta.closingBalanceType),
    ],
  ]);
  XLSX.utils.book_append_sheet(wb, summary, "Summary");

  const safeName = meta.ledgerCode.replace(/[^\w-]+/g, "_");
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Ledger_${safeName}_${date}.xlsx`);
}

export function exportLedgerStatementToPdf(
  rows: CoaTransactionRow[],
  meta: LedgerStatementExportMeta,
): void {
  const tableRows = rows
    .map(
      (r) => `
    <tr>
      <td>${r.date}</td>
      <td>${r.voucherNo}</td>
      <td>${r.voucherType}</td>
      <td>${r.referenceNo}</td>
      <td>${r.narration}</td>
      <td class="num">${r.debit ? formatMoney(r.debit) : "—"}</td>
      <td class="num">${r.credit ? formatMoney(r.credit) : "—"}</td>
      <td class="num">${runningBalanceLabel(r)}</td>
    </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Ledger Statement — ${meta.ledgerName}</title>
  <style>
    body { font-family: system-ui, sans-serif; font-size: 11px; padding: 24px; color: #111; }
    h1 { font-size: 16px; margin: 0 0 4px; }
    .meta { color: #555; margin-bottom: 16px; font-size: 10px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
    th { background: #f5f5f5; font-size: 10px; text-transform: uppercase; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    tfoot td { font-weight: 600; background: #fafafa; }
  </style>
</head>
<body>
  <h1>${meta.ledgerName}</h1>
  <p class="meta">
    ${meta.ledgerCode} · ${meta.ledgerType} · ${meta.parentGroup} · ${meta.primaryHead}<br />
    Period: ${meta.dateFrom} to ${meta.dateTo}
  </p>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Voucher No.</th>
        <th>Voucher Type</th>
        <th>Reference No.</th>
        <th>Particulars / Narration</th>
        <th>Debit (₹)</th>
        <th>Credit (₹)</th>
        <th>Running Balance</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
    <tfoot>
      <tr>
        <td colspan="5"></td>
        <td class="num"><strong>Total Debit</strong><br />${formatMoney(meta.totalDebit)}</td>
        <td class="num"><strong>Total Credit</strong><br />${formatMoney(meta.totalCredit)}</td>
        <td class="num"><strong>Closing Balance</strong><br />${formatMoneyWithSide(meta.closingBalance, meta.closingBalanceType)}</td>
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
  setTimeout(() => win.print(), 400);
}
