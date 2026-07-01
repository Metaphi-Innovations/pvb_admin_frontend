import { normalizeCreditNote, type CreditNoteRecord } from "./credit-notes-data";

/** Listing export — columns match the credit note listing table. */
export async function exportCreditNotesToExcel(records: CreditNoteRecord[]): Promise<void> {
  const XLSX = await import("xlsx");
  const rows = records.map((r) => {
    const rec = normalizeCreditNote(r);
    return {
      Date: rec.creditNoteDate,
      "Credit Note No.": rec.creditNoteNo,
      "Reference Number": rec.sourceInvoiceNo || "",
      "Customer Name": rec.customerName,
      Amount: rec.currentCreditAmount,
    };
  });
  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Credit Notes");
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `CreditNotes_Export_${date}.xlsx`);
}
