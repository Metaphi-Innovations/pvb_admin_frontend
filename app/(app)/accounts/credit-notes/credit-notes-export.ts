import {
  creditNoteSourceToKind,
  normalizeCreditNote,
  type CreditNoteRecord,
} from "./credit-notes-data";
import { CREDIT_NOTE_SOURCE_KIND_LABELS } from "./credit-note-source-types";
import { formatLinkedInvoiceNos } from "./components/LinkedInvoicesMultiSelect";

/** Listing export — filtered records with source and tax columns. */
export async function exportCreditNotesToExcel(records: CreditNoteRecord[]): Promise<void> {
  const XLSX = await import("xlsx");
  const rows = records.map((r) => {
    const rec = normalizeCreditNote(r);
    const kind = creditNoteSourceToKind(rec.source, rec);
    const refDoc =
      kind === "sales_return"
        ? rec.sourceReturnNo ?? ""
        : rec.schemeName ?? rec.schemeCode ?? rec.reason;
    return {
      "Credit Note No.": rec.creditNoteNo,
      Source: CREDIT_NOTE_SOURCE_KIND_LABELS[kind],
      "Reference Document": refDoc,
      "Against Invoice": formatLinkedInvoiceNos(rec.linkedInvoices) || rec.sourceInvoiceNo || "",
      "Linked Invoices": formatLinkedInvoiceNos(rec.linkedInvoices) || rec.sourceInvoiceNo || "",
      "Sales Return No.": rec.sourceReturnNo || "",
      "Scheme Name": rec.schemeName || "",
      Customer: rec.customerName,
      Date: rec.creditNoteDate,
      "Taxable Value": rec.taxableValue,
      CGST: rec.cgstAmount,
      SGST: rec.sgstAmount,
      IGST: rec.igstAmount,
      Total: rec.currentCreditAmount,
      Status: rec.status.replaceAll("_", " "),
    };
  });
  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Credit Notes");
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `CreditNotes_Export_${date}.xlsx`);
}
