import { normalizeCreditNote, type CreditNoteRecord } from "./credit-notes-data";

export async function exportCreditNotesToExcel(records: CreditNoteRecord[]): Promise<void> {
  const XLSX = await import("xlsx");
  const rows = records.map((r) => {
    const rec = normalizeCreditNote(r);
    return {
      "Credit Note No.": rec.creditNoteNo,
      Date: rec.creditNoteDate,
      Customer: rec.customerName,
      "Reference Invoice No.": rec.sourceInvoiceNo,
      "Reference Sales Order No.": rec.sourceOrderNo,
      "Original Amount": rec.originalAmount,
      "Already Adjusted": rec.alreadyAdjustedAmount,
      "Credit Amount": rec.currentCreditAmount,
      Reason: rec.reason,
      Status: rec.status.replaceAll("_", " "),
      "Created By": rec.createdBy,
      "Updated By": rec.updatedBy,
    };
  });
  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Credit Notes");
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `CreditNotes_Export_${date}.xlsx`);
}
