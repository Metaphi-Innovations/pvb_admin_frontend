import { normalizeInvoice, type InvoiceRecord } from "./invoices-data";

export async function exportInvoicesToExcel(records: InvoiceRecord[]): Promise<void> {
  const XLSX = await import("xlsx");
  const rows = records.map((r) => {
    const rec = normalizeInvoice(r);
    return {
      "Invoice No.": rec.invoiceNo,
      "Invoice Date": rec.invoiceDate,
      "Customer Name": rec.customerName,
      "GST Number": rec.customerGst,
      "Grand Total": rec.grandTotal,
      "Amount Received": rec.amountReceived,
      "Balance Amount": rec.balanceAmount,
      "Payment Status": rec.paymentStatus.replaceAll("_", " "),
      "Invoice Status": rec.invoiceStatus,
      "Created By": rec.createdBy,
      "Updated By": rec.updatedBy,
    };
  });
  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Invoices");
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Invoices_Export_${date}.xlsx`);
}
