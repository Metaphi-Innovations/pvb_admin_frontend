import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { nextId } from "../data";
import { getBankAccountById } from "@/lib/accounts/bank-accounts-data";
import { formatBankAccountMaster } from "@/lib/accounts/bank-account-display";
import {
  loadBankEntries,
  loadBankStatements,
  saveBankEntries,
  saveBankStatements,
  type BankCategorization,
  type BankStatement,
  type BankStatementEntry,
  type MatchModule,
} from "./bank-reconciliation-data";

export const DEMO_RECON_DATA_VERSION = 2;
const DEMO_VERSION_KEY = "bank-recon-demo-version";
const DEMO_FILE = "demo-sample-entries.csv";
const DEMO_STATEMENT_NAME = "Demo — FY 2026-27 Bank Statement";

type DemoRow = {
  transactionDate: string;
  narration: string;
  debit: number;
  credit: number;
  referenceNo: string;
  bankCategory?: BankCategorization;
  matchedModule?: MatchModule;
  matchedRecordLabel?: string;
  matchStatus?: BankStatementEntry["matchStatus"];
  reconciliationStatus?: BankStatementEntry["reconciliationStatus"];
  remarks?: string;
};

/** Five demo bank statement lines — all uncategorized for manual categorization walkthrough. */
const DEMO_ROWS: DemoRow[] = [
  {
    transactionDate: "2026-04-20",
    narration: "NEFT CR — ABC Agro Distributor",
    credit: 118000,
    debit: 0,
    referenceNo: "NEFT-ABC-001",
    matchStatus: "unmatched",
  },
  {
    transactionDate: "2026-04-28",
    narration: "NEFT CR — Krishna Retail Store (partial)",
    credit: 30000,
    debit: 0,
    referenceNo: "RCPT-INV-002",
    matchStatus: "unmatched",
  },
  {
    transactionDate: "2026-05-10",
    narration: "RTGS CR — Yavatmal Cotton FPO",
    credit: 88500,
    debit: 0,
    referenceNo: "RCPT-INV-003",
    matchStatus: "unmatched",
  },
  {
    transactionDate: "2026-05-18",
    narration: "NEFT CHARGES — outward transfer",
    debit: 250,
    credit: 0,
    referenceNo: "NEFT-CHG-004",
    matchStatus: "unmatched",
  },
  {
    transactionDate: "2026-05-25",
    narration: "INTEREST CREDIT — savings account quarterly interest payout",
    credit: 1500,
    debit: 0,
    referenceNo: "INT-CR-005",
    matchStatus: "unmatched",
  },
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
  const reconciled =
    reconciliationStatus === "reconciled" ||
    reconciliationStatus === "matched" ||
    reconciliationStatus === "ignored";
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
    bankCategory: row.bankCategory ?? "",
    matchedRecordId: null,
    matchedRecordLabel: row.matchedRecordLabel ?? "",
    ledgerId: null,
    ledgerName: row.matchedModule === "other" ? row.matchedRecordLabel ?? "Bank Charges" : "",
    remarks: row.remarks ?? "",
    matchStatus,
    reconciliationStatus,
    reconciledBy: reconciled ? ACCOUNTS_CURRENT_USER : "",
    reconciledAt: reconciled ? new Date().toISOString() : "",
  };
}

/** Load fictional demo statement for accounts walkthrough. Safe for UI testing — not real bank data. */
export function seedAccountsDemoBankReconciliation(force = false): { statementId: number; created: boolean } {
  return seedDummyBankReconciliation(force);
}

/** @deprecated use seedAccountsDemoBankReconciliation */
export function seedDummyBankReconciliation(force = false): { statementId: number; created: boolean } {
  const statements = loadBankStatements();
  const existing = findDemoStatement(statements);
  if (existing && !force) {
    if (typeof window !== "undefined") {
      const storedVersion = window.localStorage.getItem(DEMO_VERSION_KEY);
      if (storedVersion !== String(DEMO_RECON_DATA_VERSION)) {
        return seedDummyBankReconciliation(true);
      }
    }
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

  const demoBank = getBankAccountById(1);
  const statement: BankStatement = {
    id: statementId,
    bankAccountId: 1,
    bankAccountName: demoBank
      ? formatBankAccountMaster(demoBank)
      : "HDFC Current A/c (xxxx4499)",
    month: 5,
    year: 2026,
    statementName: DEMO_STATEMENT_NAME,
    fileName: DEMO_FILE,
    uploadedBy: ACCOUNTS_CURRENT_USER,
    uploadedAt: now,
  };

  let balance = 1500000;
  let entryId = nextId(entries);
  const newEntries: BankStatementEntry[] = DEMO_ROWS.map((row) => {
    balance = balance - row.debit + row.credit;
    const entry = buildEntry(statementId, entryId, row, balance);
    entryId += 1;
    return entry;
  });

  saveBankStatements([...statements2, statement]);
  saveBankEntries([...loadBankEntries(), ...newEntries]);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(DEMO_VERSION_KEY, String(DEMO_RECON_DATA_VERSION));
  }
  return { statementId, created: true };
}

export function isDemoStatement(s: BankStatement): boolean {
  return s.fileName === DEMO_FILE || s.statementName === DEMO_STATEMENT_NAME;
}
