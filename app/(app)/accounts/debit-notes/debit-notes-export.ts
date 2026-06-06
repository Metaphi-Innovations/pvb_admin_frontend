import { normalizeDebitNote, REFERENCE_TYPE_LABELS, type DebitNoteRecord } from "./debit-notes-data";

export async function exportDebitNotesToExcel(records: DebitNoteRecord[]): Promise<void> {
  const XLSX = await import("xlsx");
  const rows = records.map((r) => {
    const rec = normalizeDebitNote(r);
    return {
      "Debit Note No.": rec.debitNoteNo,
      Date: rec.debitNoteDate,
      Vendor: rec.vendorName,
      "Reference Type": REFERENCE_TYPE_LABELS[rec.againstType],
      "Reference No.": rec.sourceInvoiceNo || rec.sourcePoNo || "—",
      "PO No.": rec.sourcePoNo || "—",
      Reason: rec.reason,
      "Taxable Amount": rec.taxableAmount,
      "GST Amount": rec.gstAmount,
      "Total Debit Amount": rec.currentDebitAmount,
      Status: rec.status.replaceAll("_", " "),
      "Created By": rec.createdBy,
      "Updated By": rec.updatedBy,
    };
  });
  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Debit Notes");
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Debit_Notes_Export_${date}.xlsx`);
}
