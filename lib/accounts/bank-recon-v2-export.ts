/**
 * Export filtered bank reconciliation register rows (v2 workspace).
 */

import type { BankReconTransactionRecord } from "@/lib/accounts/bank-recon-register";
import { formatMoney } from "@/lib/accounts/money-format";

export async function exportBankReconTransactionsToExcel(
  rows: BankReconTransactionRecord[],
  accountLabel: string,
): Promise<void> {
  const XLSX = await import("xlsx");
  const date = new Date().toISOString().slice(0, 10);

  const data = rows.map((t) => ({
    "Statement Date": t.statementDate,
    "Value Date": t.valueDate ?? "",
    "Book Date": t.bookDate ?? "",
    "Reconciliation Date": t.reconciliationDate ?? "",
    Reference: t.reference,
    UTR: t.utrNumber ?? "",
    "Cheque No": t.chequeNo ?? "",
    Narration: t.narration,
    Deposit: t.deposit ? formatMoney(t.deposit) : "",
    Withdrawal: t.withdrawal ? formatMoney(t.withdrawal) : "",
    Source: t.source,
    "Match Status": t.matchStatus,
    "Verification Status": t.verificationStatus,
    "Reconciliation Status": t.reconciliationStatus ?? "",
    "Party / Ledger": t.partyLedger ?? "",
    "Posted Voucher": t.relatedRecord?.voucherNumber ?? "",
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");

  const safeLabel = accountLabel.replace(/[^\w-]+/g, "_").slice(0, 40);
  XLSX.writeFile(wb, `Bank_Recon_${safeLabel}_${date}.xlsx`);
}
