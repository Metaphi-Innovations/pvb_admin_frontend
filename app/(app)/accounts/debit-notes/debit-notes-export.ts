import {
  DEBIT_NOTE_SOURCE_LABELS,
  normalizeDebitNote,
  type DebitNoteRecord,
} from "./debit-notes-data";

export async function exportDebitNotesToExcel(records: DebitNoteRecord[]): Promise<void> {
  const XLSX = await import("xlsx");
  const rows = records.map((r) => {
    const rec = normalizeDebitNote(r);
    const refDoc =
      rec.source === "purchase_return"
        ? rec.sourceReturnNo ?? ""
        : rec.reason;
    return {
      "Debit Note No.": rec.debitNoteNo,
      Source: DEBIT_NOTE_SOURCE_LABELS[rec.source],
      "Reference Document": refDoc,
      "Purchase Invoice": rec.sourceInvoiceNo || "",
      "Purchase Return No.": rec.sourceReturnNo || "",
      Supplier: rec.vendorName,
      Date: rec.debitNoteDate,
      "Taxable Value": rec.taxableAmount,
      CGST: rec.cgstAmount,
      SGST: rec.sgstAmount,
      IGST: rec.igstAmount,
      Total: rec.currentDebitAmount,
      Status: rec.status.replaceAll("_", " "),
    };
  });
  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Debit Notes");
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Debit_Notes_Export_${date}.xlsx`);
}
