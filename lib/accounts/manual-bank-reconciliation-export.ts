import {
  differenceReasonLabel,
  formatAccountsDate,
  type ManualReconGridRow,
  type ManualReconSummary,
} from "@/lib/accounts/manual-bank-reconciliation-data";

export async function exportManualReconciliationToExcel(
  rows: ManualReconGridRow[],
  summary: ManualReconSummary,
  meta: {
    bankAccount: string;
    dateFrom: string;
    dateTo: string;
    financialYear: string;
  },
) {
  const XLSX = await import("xlsx");

  const detailRows = rows.map((row) => ({
    "Entry Date as per Books": formatAccountsDate(row.entryDate),
    "Voucher No.": row.voucherNo,
    "Party Name": row.partyName,
    "Voucher Type": row.voucherTypeLabel,
    Narration: row.narration,
    "Debit Amount": row.debitAmount || "",
    "Credit Amount": row.creditAmount || "",
    Bank: row.bankName,
    "Bank Processing Date": row.bankProcessingDate
      ? formatAccountsDate(row.bankProcessingDate)
      : "",
    "Statement Reference": row.matchedStatementRef || "",
    Difference: row.differenceAmount || "",
    Status:
      row.status === "reconciled"
        ? "Reconciled"
        : row.status === "difference"
          ? "Difference"
          : row.status === "pending"
            ? "Pending"
            : "Unmatched",
    "Difference Reason": differenceReasonLabel(row.differenceReason),
  }));

  const summaryRows = [
    { Metric: "Bank Account", Value: meta.bankAccount },
    { Metric: "Financial Year", Value: meta.financialYear },
    { Metric: "From Date", Value: formatAccountsDate(meta.dateFrom) },
    { Metric: "To Date", Value: formatAccountsDate(meta.dateTo) },
    { Metric: "", Value: "" },
    { Metric: "Balance as per Books", Value: summary.balanceAsPerBooks },
    { Metric: "Balance as per Bank Statement", Value: summary.balanceAsPerBank },
    { Metric: "Difference", Value: summary.difference },
    { Metric: "", Value: "" },
    { Metric: "Total Entries", Value: summary.totalCount },
    { Metric: "Reconciled", Value: summary.reconciledCount },
    { Metric: "Pending", Value: summary.pendingCount },
    { Metric: "Unmatched", Value: summary.unmatchedCount },
    { Metric: "With Difference", Value: summary.differenceCount },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Summary");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows), "Reconciliation");
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Bank_Reconciliation_${date}.xlsx`);
}
