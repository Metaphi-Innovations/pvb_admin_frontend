/** Demo ledger impact preview builders — frontend only, no posting. */

export interface ImpactAmounts {
  taxable: number;
  gst: number;
  total: number;
  partyLedger?: string;
}

export function salesInvoiceImpact({
  taxable,
  gst,
  total,
  partyLedger = "Customer Ledger",
}: ImpactAmounts) {
  return [
    { ledger: partyLedger, debit: total, note: "Receivable from customer" },
    { ledger: "Sales Ledger", credit: taxable, note: "Revenue" },
    { ledger: "Output GST Ledger", credit: gst, note: "CGST + SGST + IGST" },
  ];
}

export function purchaseInvoiceImpact({
  taxable,
  gst,
  total,
  partyLedger = "Vendor Ledger",
}: ImpactAmounts) {
  return [
    { ledger: "Purchase Ledger", debit: taxable, note: "Purchase expense" },
    { ledger: "Input GST Ledger", debit: gst, note: "Input tax credit" },
    { ledger: partyLedger, credit: total, note: "Payable to vendor" },
  ];
}

export function creditNoteImpact({
  taxable,
  gst,
  total,
  partyLedger = "Customer Ledger",
}: ImpactAmounts) {
  return [
    { ledger: "Sales Return / Sales Ledger", debit: taxable },
    { ledger: "Output GST Ledger", debit: gst },
    { ledger: partyLedger, credit: total, note: "Reduce customer outstanding" },
  ];
}

export function debitNoteImpact({
  taxable,
  gst,
  total,
  partyLedger = "Vendor Ledger",
}: ImpactAmounts) {
  return [
    { ledger: partyLedger, debit: total, note: "Reduce vendor payable" },
    { ledger: "Purchase Return / Purchase Ledger", credit: taxable },
    { ledger: "Input GST Ledger", credit: gst },
  ];
}

export function claimApprovedImpact(amount: number, expenseLedger = "Expense Ledger") {
  return [
    { ledger: expenseLedger, debit: amount },
    { ledger: "Employee Payable Ledger", credit: amount },
  ];
}

export function claimPaidImpact(amount: number, bankLedger = "Bank Ledger") {
  return [
    { ledger: "Employee Payable Ledger", debit: amount },
    { ledger: bankLedger, credit: amount },
  ];
}

export interface JournalImpactLine {
  ledgerName: string;
  debit: number;
  credit: number;
  narration?: string;
}

export function journalEntryImpact(lines: JournalImpactLine[]) {
  return lines
    .filter((l) => l.debit > 0 || l.credit > 0)
    .map((l) => ({
      ledger: l.ledgerName || "—",
      debit: l.debit > 0 ? l.debit : undefined,
      credit: l.credit > 0 ? l.credit : undefined,
      note: l.narration,
    }));
}
