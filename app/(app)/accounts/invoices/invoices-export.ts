import { normalizeInvoice, type InvoiceRecord, getInvoiceAmountBreakup } from "./invoices-data";
import { INVOICE_AMOUNT_LABELS } from "./invoice-utils";

export async function exportInvoicesToExcel(records: InvoiceRecord[]): Promise<void> {
  const XLSX = await import("xlsx");
  const rows = records.map((r) => {
    const rec = normalizeInvoice(r);
    const { taxableValue, gstAmount, invoiceTotal } = getInvoiceAmountBreakup(rec);
    return {
      "Invoice No.": rec.invoiceNo,
      "Invoice Date": rec.invoiceDate,
      "Customer Name": rec.customerName,
      "GST Number": rec.customerGst,
      [INVOICE_AMOUNT_LABELS.taxableValue]: taxableValue,
      [INVOICE_AMOUNT_LABELS.gstAmount]: gstAmount,
      [INVOICE_AMOUNT_LABELS.invoiceTotal]: invoiceTotal,
      "Amount Received": rec.amountReceived,
      "Balance Due": rec.balanceAmount,
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
