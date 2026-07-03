import { demoAddDays, demoDateAt, demoFinancialYearStart, demoToday, demoTimestamp } from "@/lib/accounts/demo-date-utils";
/**
 * Demo bank statement rows + book vouchers for manual bank reconciliation.
 * Seeds 12 statement lines and 12+ book entries for the primary HDFC demo bank account.
 */

import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { loadChartOfAccounts, nextId, type ChartOfAccount } from "@/app/(app)/accounts/data";
import {
  createVoucher,
  loadVouchers,
  saveVouchers,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import {
  ensureDemoBankCoaStructure,
  loadBankAccountMasters,
  type BankAccountMaster,
} from "@/lib/accounts/bank-accounts-data";
import { resolveDefaultDemoBankLedger, ensureMasterCoaLedgerLink } from "@/lib/accounts/bank-ledger-resolver";
import { getLedgersUnderSubGroupName } from "@/lib/accounts/coa-hierarchy";
import {
  loadBankEntries,
  loadBankStatements,
  saveBankEntries,
  saveBankStatements,
  type BankStatement,
  type BankStatementEntry,
} from "@/app/(app)/accounts/bank-reconciliation/bank-reconciliation-data";

export const MANUAL_RECON_DEMO_VERSION = "relative-dates-v2";
const VERSION_KEY = "ds_manual_bank_recon_demo_version";
const BOOK_VOUCHER_PREFIX = "MRB-";
const DEMO_FILE = "manual-recon-demo-statement.csv";
const DEMO_STATEMENT_NAME = "Manual Recon Demo — HDFC Apr–Jun 2026";
const RECORDS_KEY = "ds_manual_bank_recon_records_v1";

/** Primary HDFC master used for manual recon demo (not hard-coded id=1). */
export function resolveManualReconHdfcMaster(): BankAccountMaster | null {
  const masters = loadBankAccountMasters().filter((m) => m.status === "active");
  return (
    masters.find((m) => m.defaultForReceipts) ??
    masters.find((m) => m.bankName.toLowerCase().includes("hdfc")) ??
    masters[0] ??
    null
  );
}

function findLedger(namePart: string, accountType?: ChartOfAccount["accountType"]): ChartOfAccount | null {
  const q = namePart.toLowerCase();
  return (
    loadChartOfAccounts().find(
      (r) =>
        r.nodeLevel === "ledger" &&
        r.status === "active" &&
        (!accountType || r.accountType === accountType) &&
        r.accountName.toLowerCase().includes(q),
    ) ?? null
  );
}

function removeManualReconBookVouchers(): void {
  saveVouchers(
    loadVouchers().filter((v) => !v.voucherNumber?.startsWith(BOOK_VOUCHER_PREFIX)),
  );
}

function setVoucherNumber(voucherId: number, voucherNumber: string): void {
  const list = loadVouchers();
  const idx = list.findIndex((v) => v.id === voucherId);
  if (idx >= 0) {
    list[idx] = { ...list[idx], voucherNumber };
    saveVouchers(list);
  }
}

function seedMrReceipt(
  bank: ChartOfAccount,
  party: ChartOfAccount,
  amount: number,
  date: string,
  ref: string,
  voucherNo: string,
  narration: string,
): void {
  const v = createVoucher("receipt", {
    date,
    referenceNo: ref,
    narration,
    status: "posted",
    lines: [
      { id: 1, ledgerId: bank.id, ledgerName: bank.accountName, debit: amount, credit: 0, remarks: narration },
      { id: 2, ledgerId: party.id, ledgerName: party.accountName, debit: 0, credit: amount, remarks: party.accountName },
    ],
  });
  setVoucherNumber(v.id, voucherNo);
}

function seedMrPayment(
  bank: ChartOfAccount,
  party: ChartOfAccount,
  amount: number,
  date: string,
  ref: string,
  voucherNo: string,
  narration: string,
): void {
  const v = createVoucher("payment", {
    date,
    referenceNo: ref,
    narration,
    status: "posted",
    lines: [
      { id: 1, ledgerId: party.id, ledgerName: party.accountName, debit: amount, credit: 0, remarks: party.accountName },
      { id: 2, ledgerId: bank.id, ledgerName: bank.accountName, debit: 0, credit: amount, remarks: narration },
    ],
  });
  setVoucherNumber(v.id, voucherNo);
}

function seedMrJournal(
  lines: Array<{ ledgerId: number; ledgerName: string; debit: number; credit: number }>,
  date: string,
  ref: string,
  voucherNo: string,
  narration: string,
): void {
  const v = createVoucher("journal", {
    date,
    referenceNo: ref,
    narration,
    status: "posted",
    lines: lines.map((e, i) => ({
      id: i + 1,
      ledgerId: e.ledgerId,
      ledgerName: e.ledgerName,
      debit: e.debit,
      credit: e.credit,
      remarks: narration,
    })),
  });
  setVoucherNumber(v.id, voucherNo);
}

/** Book-side demo vouchers scoped to the HDFC bank COA ledger (MRB- prefix). */
export function seedManualReconBookEntries(force = false): void {
  if (typeof window === "undefined") return;

  ensureDemoBankCoaStructure();

  const hdfcMaster = resolveManualReconHdfcMaster();
  if (!hdfcMaster) return;

  const hdfcLedger = ensureMasterCoaLedgerLink(hdfcMaster) ?? resolveDefaultDemoBankLedger();
  if (!hdfcLedger) return;

  const hasEntries = loadVouchers().some((v) => v.voucherNumber?.startsWith(BOOK_VOUCHER_PREFIX));
  if (!force && hasEntries) return;

  if (force) {
    removeManualReconBookVouchers();
    if (typeof window !== "undefined") {
      localStorage.removeItem(RECORDS_KEY);
    }
  }

  const iciciLedger = getLedgersUnderSubGroupName("Bank Accounts").find((l) =>
    l.accountName.toLowerCase().includes("icici"),
  );

  const abc = findLedger("ABC Agro", "Asset") ?? findLedger("ABC Agro");
  const greenHarvest = findLedger("Green Harvest", "Asset") ?? findLedger("Green Harvest");
  const agrochem = findLedger("AgroChem", "Liability") ?? findLedger("AgroChem");
  const electricity = findLedger("Electricity", "Expense") ?? findLedger("Electricity");
  const salary = findLedger("Salary", "Expense") ?? findLedger("salary");
  const rent = findLedger("Rent", "Expense") ?? findLedger("rent");
  const gst = findLedger("GST", "Liability") ?? findLedger("gst payable");
  const tds = findLedger("TDS", "Liability") ?? findLedger("tds payable");
  const bankCharges =
    findLedger("Bank Service", "Expense") ??
    findLedger("Bank Charge", "Expense") ??
    findLedger("HDFC Bank Service", "Expense");
  const interest =
    findLedger("Bank Interest", "Income") ?? findLedger("Interest", "Income");
  const office = findLedger("Office", "Expense") ?? findLedger("Stationery", "Expense");
  const fallbackParty =
    abc ??
    findLedger("Sundry Debtor") ??
    findLedger("Customer") ??
    loadChartOfAccounts().find((r) => r.nodeLevel === "ledger" && r.accountType === "Asset");

  const specs: Array<() => void> = [];

  if (abc) {
    specs.push(() =>
      seedMrReceipt(hdfcLedger, abc, 185000, demoDateAt(0), "NEFT-001", `${BOOK_VOUCHER_PREFIX}RV-001`, "Customer receipt — ABC Agro"),
    );
  }
  if (greenHarvest) {
    specs.push(() =>
      seedMrReceipt(hdfcLedger, greenHarvest, 145000, demoDateAt(1), "NEFT-003", `${BOOK_VOUCHER_PREFIX}RV-002`, "Customer receipt — Green Harvest Agro"),
    );
  }
  if (agrochem) {
    specs.push(() =>
      seedMrPayment(hdfcLedger, agrochem, 245000, demoDateAt(2), "PAY-001", `${BOOK_VOUCHER_PREFIX}PV-001`, "Vendor payment — AgroChem Traders"),
    );
  }
  if (electricity) {
    specs.push(() =>
      seedMrPayment(hdfcLedger, electricity, 18500, demoDateAt(3), "PAY-ELEC", `${BOOK_VOUCHER_PREFIX}PV-002`, "Electricity bill payment"),
    );
  }
  if (salary) {
    specs.push(() =>
      seedMrPayment(hdfcLedger, salary, 320000, demoDateAt(4), "PAY-SAL", `${BOOK_VOUCHER_PREFIX}PV-003`, "Salary payment"),
    );
  }
  if (rent) {
    specs.push(() =>
      seedMrPayment(hdfcLedger, rent, 45000, demoDateAt(5), "PAY-RENT", `${BOOK_VOUCHER_PREFIX}PV-004`, "Rent payment"),
    );
  }
  if (gst) {
    specs.push(() =>
      seedMrPayment(hdfcLedger, gst, 98000, demoDateAt(6), "PAY-GST", `${BOOK_VOUCHER_PREFIX}PV-005`, "GST payment"),
    );
  }
  if (tds) {
    specs.push(() =>
      seedMrPayment(hdfcLedger, tds, 12500, demoDateAt(7), "PAY-TDS", `${BOOK_VOUCHER_PREFIX}PV-006`, "TDS payment"),
    );
  }
  if (bankCharges) {
    specs.push(() =>
      seedMrJournal(
        [
          { ledgerId: bankCharges.id, ledgerName: bankCharges.accountName, debit: 2500, credit: 0 },
          { ledgerId: hdfcLedger.id, ledgerName: hdfcLedger.accountName, debit: 0, credit: 2500 },
        ],
        demoDateAt(8),
        "BCHG-MAY",
        `${BOOK_VOUCHER_PREFIX}JV-001`,
        "Bank charges",
      ),
    );
  }
  if (interest) {
    specs.push(() =>
      seedMrJournal(
        [
          { ledgerId: hdfcLedger.id, ledgerName: hdfcLedger.accountName, debit: 8500, credit: 0 },
          { ledgerId: interest.id, ledgerName: interest.accountName, debit: 0, credit: 8500 },
        ],
        demoDateAt(9),
        "INT-MAY",
        `${BOOK_VOUCHER_PREFIX}JV-002`,
        "Interest received",
      ),
    );
  }
  if (iciciLedger) {
    specs.push(() => {
      const v = createVoucher("contra", {
        date: demoDateAt(10),
        referenceNo: "FT-0001",
        narration: "Fund transfer to ICICI",
        status: "posted",
        lines: [
          { id: 1, ledgerId: iciciLedger.id, ledgerName: iciciLedger.accountName, debit: 200000, credit: 0, remarks: "Transfer in" },
          { id: 2, ledgerId: hdfcLedger.id, ledgerName: hdfcLedger.accountName, debit: 0, credit: 200000, remarks: "Transfer out" },
        ],
      });
      setVoucherNumber(v.id, `${BOOK_VOUCHER_PREFIX}FT-001`);
    });
  }
  if (office) {
    specs.push(() =>
      seedMrPayment(hdfcLedger, office, 12500, demoDateAt(11), "PAY-OFF", `${BOOK_VOUCHER_PREFIX}PV-007`, "Office expense payment"),
    );
  }

  if (specs.length === 0 && fallbackParty) {
    specs.push(() =>
      seedMrReceipt(hdfcLedger, fallbackParty, 100000, demoDateAt(0), "NEFT-DEMO", `${BOOK_VOUCHER_PREFIX}RV-001`, "Demo customer receipt"),
    );
  }

  for (const run of specs) run();
}

type DemoRow = {
  transactionDate: string;
  narration: string;
  debit: number;
  credit: number;
  referenceNo: string;
};

const DEMO_ROWS: DemoRow[] = [
  {
    transactionDate: demoDateAt(0),
    narration: "NEFT CR — ABC Agro Distributor",
    credit: 185000,
    debit: 0,
    referenceNo: "NEFT-001",
  },
  {
    transactionDate: demoDateAt(1),
    narration: "NEFT DR — AgroChem Traders",
    debit: 245000,
    credit: 0,
    referenceNo: "PAY-001",
  },
  {
    transactionDate: demoDateAt(2),
    narration: "NEFT CR — Krishna Retail Store",
    credit: 92000,
    debit: 0,
    referenceNo: "NEFT-002",
  },
  {
    transactionDate: demoDateAt(3),
    narration: "RTGS DR — Fund transfer to ICICI",
    debit: 200000,
    credit: 0,
    referenceNo: "FT-0001",
  },
  {
    transactionDate: demoDateAt(4),
    narration: "NEFT DR — GreenField Suppliers",
    debit: 195000,
    credit: 0,
    referenceNo: "PAY-004",
  },
  {
    transactionDate: demoDateAt(5),
    narration: "SERVICE CHARGES — outward NEFT",
    debit: 2500,
    credit: 0,
    referenceNo: "BCHG-MAY",
  },
  {
    transactionDate: demoDateAt(6),
    narration: "RTGS DR — Fund transfer to Axis",
    debit: 175000,
    credit: 0,
    referenceNo: "FT-0003",
  },
  {
    transactionDate: demoDateAt(7),
    narration: "NEFT CR — bulk urea order collection",
    credit: 210000,
    debit: 0,
    referenceNo: "NEFT-006",
  },
  {
    transactionDate: demoDateAt(8),
    narration: "NEFT CR — Fund transfer from ICICI",
    credit: 95000,
    debit: 0,
    referenceNo: "FT-0005",
  },
  {
    transactionDate: demoDateAt(9),
    narration: "INTEREST CREDIT — quarterly payout",
    credit: 8500,
    debit: 0,
    referenceNo: "INT-MAY",
  },
  {
    transactionDate: demoDateAt(10),
    narration: "RTGS DR — Fund transfer to SBI",
    debit: 110000,
    credit: 0,
    referenceNo: "FT-0006",
  },
  {
    transactionDate: demoDateAt(11),
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
  if (!force && localStorage.getItem(VERSION_KEY) === MANUAL_RECON_DEMO_VERSION) {
    seedManualReconBookEntries(false);
    return;
  }

  ensureDemoBankCoaStructure();
  seedManualReconBookEntries(force);

  const hdfcMaster = resolveManualReconHdfcMaster();
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
  const demoBank = hdfcMaster;

  const statement: BankStatement = {
    id: statementId,
    bankAccountId: demoBank?.id ?? 1,
    bankAccountName: demoBank
      ? `${demoBank.bankName} — ${demoBank.accountType} (${demoBank.accountNumber})`
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
