import {
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
    "Party Name": row.partyName,
    "Voucher Type": row.voucherTypeLabel,
    "Debit Amount": row.debitAmount || "",
    "Credit Amount": row.creditAmount || "",
    "Bank Processing Date": row.bankProcessingDate
      ? formatAccountsDate(row.bankProcessingDate)
      : "",
    Status: row.status === "reconciled" ? "Reconciled" : "Pending",
    "Voucher No.": row.voucherNo,
  }));

  const summaryRows = [
    { Metric: "Bank Account", Value: meta.bankAccount },
    { Metric: "Financial Year", Value: meta.financialYear },
    { Metric: "From Date", Value: formatAccountsDate(meta.dateFrom) },
    { Metric: "To Date", Value: formatAccountsDate(meta.dateTo) },
    { Metric: "Balance as per Books", Value: summary.balanceAsPerBooks },
    { Metric: "Balance as per Bank Statement", Value: summary.balanceAsPerBank },
    { Metric: "Difference", Value: summary.difference },
    { Metric: "Pending Transactions", Value: summary.pendingCount },
    { Metric: "Reconciled Transactions", Value: summary.reconciledCount },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Summary");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows), "Reconciliation");
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Bank_Reconciliation_${date}.xlsx`);
}
