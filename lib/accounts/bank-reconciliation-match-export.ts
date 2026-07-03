import { formatAccountsDate } from "@/lib/accounts/manual-bank-reconciliation-data";
import {
  matchStatusLabel,
  type ReconciliationGridRow,
  type ReconciliationSummary,
} from "@/lib/accounts/bank-reconciliation-match-grid";

export async function exportBankReconciliationReport(
  rows: ReconciliationGridRow[],
  summary: ReconciliationSummary,
  meta: {
    bankAccount: string;
    dateFrom: string;
    dateTo: string;
  },
) {
  const XLSX = await import("xlsx");

  const detailRows = rows.map((row) => ({
    "Bank Account": meta.bankAccount,
    "Statement Date": row.statementDate ? formatAccountsDate(row.statementDate) : "",
    "Book Date": row.bookDate ? formatAccountsDate(row.bookDate) : "",
    Description: row.description,
    "Voucher No": row.voucherNo,
    "Reference No": row.referenceNo,
    "Bank Amount": row.bankDebit || row.bankCredit || "",
    "Book Amount": row.bookDebit || row.bookCredit || "",
    Difference: row.difference,
    "Match Status": matchStatusLabel(row.matchStatus),
    Remarks: row.remarks,
  }));

  const summaryRows = [
    { Metric: "Bank Account", Value: meta.bankAccount },
    { Metric: "From Date", Value: formatAccountsDate(meta.dateFrom) },
    { Metric: "To Date", Value: formatAccountsDate(meta.dateTo) },
    { Metric: "Book Closing Balance", Value: summary.bookClosingBalance },
    { Metric: "Statement Closing Balance", Value: summary.statementClosingBalance },
    { Metric: "Net Difference", Value: summary.netDifference },
    { Metric: "Matched", Value: summary.matchedCount },
    { Metric: "Suggested Match", Value: summary.suggestedCount },
    { Metric: "Unmatched in Bank", Value: summary.unmatchedBankCount },
    { Metric: "Unmatched in Books", Value: summary.unmatchedBooksCount },
    { Metric: "Difference", Value: summary.differenceCount },
    { Metric: "Ignored", Value: summary.ignoredCount },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Summary");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows), "Reconciliation");
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Bank_Reconciliation_Report_${date}.xlsx`);
}
