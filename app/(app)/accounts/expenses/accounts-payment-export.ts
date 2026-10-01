import {
  getPendingPaymentAmount,
  getRejectedAmount,
  normalizePaymentRecord,
  type AccountPaymentRecord,
} from "./accounts-payment-data";

export async function exportAccountPaymentsToExcel(records: AccountPaymentRecord[]): Promise<void> {
  const XLSX = await import("xlsx");
  const rows = records.map((r) => {
    const rec = normalizePaymentRecord(r);
    return {
      "Expense / Claim No.": rec.referenceNo,
      "Source Module": rec.sourceModuleLabel,
      "Employee Name": rec.employeeName,
      "Employee Code": rec.employeeCode,
      "Claim Date": rec.claimDate,
      Category: rec.categoryName,
      "Claimed Amount": rec.claimedAmount,
      "Approved Amount": rec.approvedAmount,
      "Rejected / Deducted Amount": getRejectedAmount(rec),
      "Paid Amount": rec.paidAmount,
      "Pending Payment Amount": getPendingPaymentAmount(rec),
      "Payment Status": rec.paymentStatus.replaceAll("_", " "),
      "Payment Mode": rec.paymentMode ?? "",
      "Payment Date": rec.paymentDate ?? "",
      "Payment Reference No.": rec.paymentReferenceNo ?? "",
      "Approved By": rec.approvedBy ?? "",
      "Paid By": rec.paidBy ?? "",
    };
  });
  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Payments");
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Accounts_Expenses_Export_${date}.xlsx`);
}
