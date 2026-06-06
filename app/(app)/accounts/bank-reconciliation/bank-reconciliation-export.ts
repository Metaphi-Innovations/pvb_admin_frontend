import {
  enrichStatementsWithStats,
  getEntriesForStatement,
  loadBankStatements,
  matchModuleLabel,
  type BankStatement,
  type BankStatementEntry,
} from "./bank-reconciliation-data";
import { monthYearLabel } from "./reconciliation-utils";

function statusLabel(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "";
}

export async function exportStatementsListToExcel(
  statements: ReturnType<typeof enrichStatementsWithStats>,
) {
  const XLSX = await import("xlsx");
  const rows = statements.map((s) => ({
    "Bank Account": s.bankAccountName,
    Month: monthYearLabel(s.month, s.year).split(" ")[0],
    Year: s.year,
    "Statement Name": s.statementName,
    "Total Entries": s.total,
    "Matched Entries": s.matched,
    "Unmatched Entries": s.unmatched,
    "Reconciled Entries": s.reconciled,
    "Upload Status": s.uploadStatus,
    "Uploaded By": s.uploadedBy,
    "Uploaded Date": s.uploadedAt?.slice(0, 10) ?? "",
  }));
  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Statements");
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Bank_Reconciliation_Statements_${date}.xlsx`);
}

export async function exportStatementEntriesToExcel(
  statement: BankStatement,
  entries: BankStatementEntry[],
) {
  const XLSX = await import("xlsx");
  const my = monthYearLabel(statement.month, statement.year);
  const rows = entries.map((e) => ({
    "Bank Account": statement.bankAccountName,
    Month: my.split(" ")[0],
    Year: statement.year,
    "Transaction Date": e.transactionDate,
    Narration: e.narration,
    Debit: e.debit,
    Credit: e.credit,
    Balance: e.balance,
    "Reference No.": e.referenceNo,
    "Matched Module": matchModuleLabel(e.matchedModule),
    "Matched Record": e.matchedRecordLabel,
    Ledger: e.ledgerName,
    "Match Status": statusLabel(e.matchStatus),
    "Reconciliation Status": statusLabel(e.reconciliationStatus),
    Remarks: e.remarks,
    "Reconciled By": e.reconciledBy,
    "Reconciled Date": e.reconciledAt?.slice(0, 10) ?? "",
  }));
  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Entries");
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Bank_Recon_${statement.bankAccountName.replace(/\s+/g, "_")}_${date}.xlsx`);
}

export async function exportAllReconciliationData() {
  const statements = enrichStatementsWithStats(loadBankStatements());
  const XLSX = await import("xlsx");
  const rows: Record<string, string | number>[] = [];
  for (const s of statements) {
    const entries = getEntriesForStatement(s.id);
    const my = monthYearLabel(s.month, s.year);
    for (const e of entries) {
      rows.push({
        "Bank Account": s.bankAccountName,
        Month: my.split(" ")[0],
        Year: s.year,
        "Transaction Date": e.transactionDate,
        Narration: e.narration,
        Debit: e.debit,
        Credit: e.credit,
        Balance: e.balance,
        "Matched Module": matchModuleLabel(e.matchedModule),
        "Matched Record": e.matchedRecordLabel,
        Ledger: e.ledgerName,
        "Match Status": e.matchStatus,
        "Reconciliation Status": e.reconciliationStatus,
        Remarks: e.remarks,
        "Reconciled By": e.reconciledBy,
        "Reconciled Date": e.reconciledAt?.slice(0, 10) ?? "",
      });
    }
  }
  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Reconciliation");
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Bank_Reconciliation_Full_${date}.xlsx`);
}
