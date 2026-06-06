import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { nextId } from "../data";
import {
  loadBankEntries,
  loadBankStatements,
  saveBankEntries,
  saveBankStatements,
  type BankStatement,
  type BankStatementEntry,
  type MatchModule,
} from "./bank-reconciliation-data";

const DEMO_FILE = "demo-sample-entries.csv";
const DEMO_STATEMENT_NAME = "Demo — June 2026 (Sample Entries)";

type DemoRow = {
  transactionDate: string;
  narration: string;
  debit: number;
  credit: number;
  referenceNo: string;
  matchedModule?: MatchModule;
  matchedRecordLabel?: string;
  matchStatus?: BankStatementEntry["matchStatus"];
  reconciliationStatus?: BankStatementEntry["reconciliationStatus"];
  remarks?: string;
};

const DEMO_ROWS: DemoRow[] = [
  { transactionDate: "2026-06-01", narration: "NEFT CR — Customer payment INV batch", credit: 177000, debit: 0, referenceNo: "DEMO-UTR-001" },
  { transactionDate: "2026-06-02", narration: "RTGS DR — Vendor purchase settlement", debit: 118000, credit: 0, referenceNo: "DEMO-PUR-002" },
  { transactionDate: "2026-06-03", narration: "UPI DR — Employee expense reimbursement", debit: 4500, credit: 0, referenceNo: "DEMO-EXP-003" },
  { transactionDate: "2026-06-05", narration: "CHQ PAID — Advance to supplier", debit: 25000, credit: 0, referenceNo: "DEMO-CHQ-004" },
  { transactionDate: "2026-06-06", narration: "NEFT CR — Sales credit note adjustment", credit: 8500, debit: 0, referenceNo: "DEMO-CN-005" },
  { transactionDate: "2026-06-08", narration: "BANK CHARGES — NEFT outward", debit: 25, credit: 0, referenceNo: "DEMO-BC-006" },
  { transactionDate: "2026-06-10", narration: "SALARY TRANSFER — Payroll May", debit: 80000, credit: 0, referenceNo: "DEMO-JRN-007" },
  { transactionDate: "2026-06-12", narration: "NEFT DR — TA/DA claim payout", debit: 3200, credit: 0, referenceNo: "DEMO-TADA-008" },
  { transactionDate: "2026-06-15", narration: "RTGS CR — FPO cooperative receipt", credit: 95000, debit: 0, referenceNo: "DEMO-UTR-009" },
  { transactionDate: "2026-06-18", narration: "DEBIT NOTE — Vendor adjustment", debit: 5400, credit: 0, referenceNo: "DEMO-DN-010" },
  { transactionDate: "2026-06-20", narration: "INTEREST CREDIT — Quarter", credit: 1250, debit: 0, referenceNo: "DEMO-INT-011" },
  { transactionDate: "2026-06-22", narration: "CASH DEPOSIT — Branch", credit: 50000, debit: 0, referenceNo: "DEMO-CD-012" },
  { transactionDate: "2026-06-25", narration: "GST PAYMENT — Statutory", debit: 18500, credit: 0, referenceNo: "DEMO-GST-013" },
  { transactionDate: "2026-06-28", narration: "NEFT DR — Manual vendor payment", debit: 7500, credit: 0, referenceNo: "DEMO-PAY-014" },
  { transactionDate: "2026-06-30", narration: "AMB MAINT CHARGES — Month end", debit: 590, credit: 0, referenceNo: "DEMO-BC-015" },
];

function findDemoStatement(statements: BankStatement[]): BankStatement | undefined {
  return statements.find((s) => s.fileName === DEMO_FILE || s.statementName === DEMO_STATEMENT_NAME);
}

function buildEntry(
  statementId: number,
  id: number,
  row: DemoRow,
  balance: number,
): BankStatementEntry {
  const debit = row.debit;
  const credit = row.credit;
  const matchStatus = row.matchStatus ?? "unmatched";
  const reconciliationStatus = row.reconciliationStatus ?? matchStatus;
  return {
    id,
    statementId,
    transactionDate: row.transactionDate,
    narration: row.narration,
    debit,
    credit,
    balance,
    referenceNo: row.referenceNo,
    entryType: debit > 0 ? "debit" : "credit",
    matchedModule: row.matchedModule ?? "",
    matchedRecordId: null,
    matchedRecordLabel: row.matchedRecordLabel ?? "",
    ledgerId: null,
    ledgerName: row.matchedModule === "other" ? "Bank Charges" : "",
    remarks: row.remarks ?? "",
    matchStatus,
    reconciliationStatus,
    reconciledBy:
      reconciliationStatus === "reconciled" || reconciliationStatus === "ignored"
        ? ACCOUNTS_CURRENT_USER
        : "",
    reconciledAt:
      reconciliationStatus === "reconciled" || reconciliationStatus === "ignored"
        ? new Date().toISOString()
        : "",
  };
}

/** Load fictional demo statement (June 2026, HDFC). Safe for UI testing — not real bank data. */
export function seedDummyBankReconciliation(force = false): { statementId: number; created: boolean } {
  const statements = loadBankStatements();
  const existing = findDemoStatement(statements);
  if (existing && !force) {
    return { statementId: existing.id, created: false };
  }

  let entries = loadBankEntries();
  if (existing && force) {
    entries = entries.filter((e) => e.statementId !== existing.id);
    saveBankEntries(entries);
    saveBankStatements(statements.filter((s) => s.id !== existing.id));
  }

  const statements2 = loadBankStatements();
  const statementId = nextId(statements2);
  const now = new Date().toISOString();

  const statement: BankStatement = {
    id: statementId,
    bankAccountId: 1,
    bankAccountName: "HDFC Current Account",
    month: 6,
    year: 2026,
    statementName: DEMO_STATEMENT_NAME,
    fileName: DEMO_FILE,
    uploadedBy: ACCOUNTS_CURRENT_USER,
    uploadedAt: now,
  };

  let balance = 1200000;
  let entryId = nextId(entries);
  const newEntries: BankStatementEntry[] = DEMO_ROWS.map((row) => {
    balance = balance - row.debit + row.credit;
    const entry = buildEntry(statementId, entryId, row, balance);
    entryId += 1;
    return entry;
  });

  // Show variety of statuses on last rows
  const matchedIdx = newEntries.length - 4;
  const reconciledIdx = newEntries.length - 3;
  const ignoredIdx = newEntries.length - 2;
  if (newEntries[matchedIdx]) {
    newEntries[matchedIdx] = {
      ...newEntries[matchedIdx],
      matchedModule: "expenses",
      matchedRecordLabel: "EXP-0001 / Sample expense",
      matchStatus: "matched",
      reconciliationStatus: "matched",
    };
  }
  if (newEntries[reconciledIdx]) {
    newEntries[reconciledIdx] = {
      ...newEntries[reconciledIdx],
      matchedModule: "other",
      ledgerName: "Bank Charges",
      matchedRecordLabel: "",
      matchStatus: "reconciled",
      reconciliationStatus: "reconciled",
      reconciledBy: ACCOUNTS_CURRENT_USER,
      reconciledAt: now,
      remarks: "Reconciled to ledger",
    };
  }
  if (newEntries[ignoredIdx]) {
    newEntries[ignoredIdx] = {
      ...newEntries[ignoredIdx],
      matchStatus: "ignored",
      reconciliationStatus: "ignored",
      reconciledBy: ACCOUNTS_CURRENT_USER,
      reconciledAt: now,
      remarks: "Duplicate / not applicable",
    };
  }

  saveBankStatements([...statements2, statement]);
  saveBankEntries([...loadBankEntries(), ...newEntries]);
  return { statementId, created: true };
}

export function isDemoStatement(s: BankStatement): boolean {
  return s.fileName === DEMO_FILE || s.statementName === DEMO_STATEMENT_NAME;
}
