/**
 * Demo bank statement rows for manual bank reconciliation (reference preview only).
 * Seeds 12 statement lines for the primary HDFC demo bank account.
 */

import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { nextId } from "@/app/(app)/accounts/data";
import { getBankAccountById } from "@/lib/accounts/bank-accounts-data";
import { formatBankAccountMaster } from "@/lib/accounts/bank-account-display";
import {
  loadBankEntries,
  loadBankStatements,
  saveBankEntries,
  saveBankStatements,
  type BankStatement,
  type BankStatementEntry,
} from "@/app/(app)/accounts/bank-reconciliation/bank-reconciliation-data";

export const MANUAL_RECON_DEMO_VERSION = "2026-jul-manual-recon-v1";
const VERSION_KEY = "ds_manual_bank_recon_demo_version";
const DEMO_FILE = "manual-recon-demo-statement.csv";
const DEMO_STATEMENT_NAME = "Manual Recon Demo — HDFC Apr–Jun 2026";

type DemoRow = {
  transactionDate: string;
  narration: string;
  debit: number;
  credit: number;
  referenceNo: string;
};

const DEMO_ROWS: DemoRow[] = [
  {
    transactionDate: "2026-04-08",
    narration: "NEFT CR — ABC Agro Distributor",
    credit: 185000,
    debit: 0,
    referenceNo: "NEFT-001",
  },
  {
    transactionDate: "2026-04-10",
    narration: "NEFT DR — AgroChem Traders",
    debit: 245000,
    credit: 0,
    referenceNo: "PAY-001",
  },
  {
    transactionDate: "2026-04-12",
    narration: "NEFT CR — Krishna Retail Store",
    credit: 92000,
    debit: 0,
    referenceNo: "NEFT-002",
  },
  {
    transactionDate: "2026-04-20",
    narration: "RTGS DR — Fund transfer to ICICI",
    debit: 200000,
    credit: 0,
    referenceNo: "FT-0001",
  },
  {
    transactionDate: "2026-05-05",
    narration: "NEFT DR — GreenField Suppliers",
    debit: 195000,
    credit: 0,
    referenceNo: "PAY-004",
  },
  {
    transactionDate: "2026-05-05",
    narration: "SERVICE CHARGES — outward NEFT",
    debit: 2500,
    credit: 0,
    referenceNo: "BCHG-MAY",
  },
  {
    transactionDate: "2026-05-08",
    narration: "RTGS DR — Fund transfer to Axis",
    debit: 175000,
    credit: 0,
    referenceNo: "FT-0003",
  },
  {
    transactionDate: "2026-05-10",
    narration: "NEFT CR — bulk urea order collection",
    credit: 210000,
    debit: 0,
    referenceNo: "NEFT-006",
  },
  {
    transactionDate: "2026-05-22",
    narration: "NEFT CR — Fund transfer from ICICI",
    credit: 95000,
    debit: 0,
    referenceNo: "FT-0005",
  },
  {
    transactionDate: "2026-05-30",
    narration: "INTEREST CREDIT — quarterly payout",
    credit: 8500,
    debit: 0,
    referenceNo: "INT-MAY",
  },
  {
    transactionDate: "2026-06-01",
    narration: "RTGS DR — Fund transfer to SBI",
    debit: 110000,
    credit: 0,
    referenceNo: "FT-0006",
  },
  {
    transactionDate: "2026-06-15",
    narration: "NEFT CR — seasonal farmer collection",
    credit: 88000,
    debit: 0,
    referenceNo: "NEFT-012",
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
  return {
    id,
    statementId,
    transactionDate: row.transactionDate,
    narration: row.narration,
    debit: row.debit,
    credit: row.credit,
    balance,
    referenceNo: row.referenceNo,
    entryType: row.debit > 0 ? "debit" : "credit",
    matchedModule: "",
    bankCategory: "",
    matchedRecordId: null,
    matchedRecordLabel: "",
    ledgerId: null,
    ledgerName: "",
    remarks: "",
    matchStatus: "unmatched",
    reconciliationStatus: "unmatched",
    reconciledBy: "",
    reconciledAt: "",
  };
}

export function ensureManualReconDemoSeed(force = false): void {
  if (typeof window === "undefined") return;
  if (!force && localStorage.getItem(VERSION_KEY) === MANUAL_RECON_DEMO_VERSION) return;

  const statements = loadBankStatements();
  const existing = findDemoStatement(statements);

  if (existing && !force) {
    localStorage.setItem(VERSION_KEY, MANUAL_RECON_DEMO_VERSION);
    return;
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
      : "HDFC Current A/c (xxxx7890)",
    month: 6,
    year: 2026,
    statementName: DEMO_STATEMENT_NAME,
    fileName: DEMO_FILE,
    uploadedBy: ACCOUNTS_CURRENT_USER,
    uploadedAt: now,
  };

  let balance = 1250000;
  let entryId = nextId(entries);
  const newEntries: BankStatementEntry[] = DEMO_ROWS.map((row) => {
    balance = balance - row.debit + row.credit;
    const entry = buildEntry(statementId, entryId, row, balance);
    entryId += 1;
    return entry;
  });

  saveBankStatements([...statements2, statement]);
  saveBankEntries([...loadBankEntries(), ...newEntries]);
  localStorage.setItem(VERSION_KEY, MANUAL_RECON_DEMO_VERSION);
}
