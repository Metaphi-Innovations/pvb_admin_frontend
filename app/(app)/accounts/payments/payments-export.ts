import { normalizeCompanyPayment, payeeDisplay, sourceTypeLabel, type CompanyPaymentRecord } from "./payments-data";

export async function exportPaymentsToExcel(records: CompanyPaymentRecord[]): Promise<void> {
  const XLSX = await import("xlsx");
  const rows = records.map((r) => {
    const rec = normalizeCompanyPayment(r);
    return {
      "Payment No.": rec.paymentNo,
      "Payment Date": rec.paymentDate,
      Payee: payeeDisplay(rec),
      "Source Type": sourceTypeLabel(rec.sourceType),
      "Reference No.": rec.sourceReferenceNo,
      Amount: rec.approvedAmount,
      "Paid Amount": rec.paidAmount,
      "Balance Amount": rec.balanceAmount,
      Status: rec.paymentStatus.replaceAll("_", " "),
      "Payment Mode": rec.paymentMode ?? "",
      "Created By": rec.createdBy,
      "Updated By": rec.updatedBy,
    };
  });
  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Payments");
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Payments_Export_${date}.xlsx`);
}
