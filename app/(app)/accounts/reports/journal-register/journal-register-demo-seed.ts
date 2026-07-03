import { demoAddDays, demoDateAt, demoFinancialYearStart, demoToday, demoTimestamp } from "@/lib/accounts/demo-date-utils";
/**
 * Journal Register demo seed — creates 25 posted journal vouchers for the report only.
 * Isolated from voucher posting logic; runs once per browser via version key.
 */

import {
  createVoucher,
  loadVouchers,
  saveVouchers,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";

export const JOURNAL_REGISTER_DEMO_SEED_VERSION = "relative-dates-v3";
const VERSION_KEY = "ds_journal_register_demo_seed_version";

interface JournalSeedSpec {
  journalNo: string;
  date: string;
  referenceNo: string;
  debitLedger: string;
  creditLedger: string;
  narration: string;
  amount: number;
}

const JOURNAL_REGISTER_SEEDS: JournalSeedSpec[] = [
  { journalNo: "JV-00001", date: demoDateAt(0), referenceNo: "REF-001", debitLedger: "Salary Expense", creditLedger: "Salary Payable", narration: "Monthly salary provision", amount: 125000 },
  { journalNo: "JV-00002", date: demoDateAt(1), referenceNo: "REF-002", debitLedger: "Rent Expense", creditLedger: "Outstanding Rent", narration: "Office rent provision", amount: 35000 },
  { journalNo: "JV-00003", date: demoDateAt(2), referenceNo: "REF-003", debitLedger: "Depreciation", creditLedger: "Accumulated Depreciation", narration: "Monthly depreciation", amount: 18000 },
  { journalNo: "JV-00004", date: demoDateAt(3), referenceNo: "REF-004", debitLedger: "Interest Expense", creditLedger: "Loan Account", narration: "Interest accrued on term loan", amount: 12500 },
  { journalNo: "JV-00005", date: demoDateAt(4), referenceNo: "REF-005", debitLedger: "Provision for Expenses", creditLedger: "Provision Account", narration: "Quarterly expense provision", amount: 22000 },
  { journalNo: "JV-00006", date: demoDateAt(5), referenceNo: "REF-006", debitLedger: "Insurance Expense", creditLedger: "Outstanding Insurance", narration: "Insurance premium amortization", amount: 8500 },
  { journalNo: "JV-00007", date: demoDateAt(6), referenceNo: "REF-007", debitLedger: "Electricity Expense", creditLedger: "Electricity Payable", narration: "Monthly electricity bill provision", amount: 14200 },
  { journalNo: "JV-00008", date: demoDateAt(7), referenceNo: "REF-008", debitLedger: "Telephone Expense", creditLedger: "Outstanding Expenses", narration: "Telecom charges accrual", amount: 4800 },
  { journalNo: "JV-00009", date: demoDateAt(8), referenceNo: "REF-009", debitLedger: "Professional Fees", creditLedger: "Professional Fees Payable", narration: "CA audit fees provision", amount: 25000 },
  { journalNo: "JV-00010", date: demoDateAt(9), referenceNo: "REF-010", debitLedger: "Bad Debts Expense", creditLedger: "Provision for Doubtful Debts", narration: "Debtor provision for ageing receivables", amount: 15000 },
  { journalNo: "JV-00011", date: demoDateAt(10), referenceNo: "REF-011", debitLedger: "Prepaid Rent", creditLedger: "Rent Expense", narration: "Prepaid rent adjustment for Q1", amount: 12000 },
  { journalNo: "JV-00012", date: demoDateAt(11), referenceNo: "REF-012", debitLedger: "Bank Account", creditLedger: "Interest Income", narration: "FD interest accrued for April", amount: 6800 },
  { journalNo: "JV-00013", date: demoDateAt(12), referenceNo: "REF-013", debitLedger: "Commission Expense", creditLedger: "Commission Payable", narration: "Field agent commission accrual", amount: 45000 },
  { journalNo: "JV-00014", date: demoDateAt(13), referenceNo: "REF-014", debitLedger: "Warehouse Rent", creditLedger: "Outstanding Rent", narration: "Warehouse lease provision", amount: 28000 },
  { journalNo: "JV-00015", date: demoDateAt(14), referenceNo: "REF-015", debitLedger: "Vehicle Maintenance", creditLedger: "Outstanding Expenses", narration: "Fleet maintenance accrual", amount: 9500 },
  { journalNo: "JV-00016", date: demoDateAt(15), referenceNo: "REF-016", debitLedger: "Donation Expense", creditLedger: "Bank Account", narration: "CSR donation — rural education fund", amount: 20000 },
  { journalNo: "JV-00017", date: demoDateAt(16), referenceNo: "REF-017", debitLedger: "Loss on Asset Disposal", creditLedger: "Fixed Asset", narration: "Old warehouse equipment write-off", amount: 32000 },
  { journalNo: "JV-00018", date: demoDateAt(17), referenceNo: "REF-018", debitLedger: "Foreign Exchange Loss", creditLedger: "Bank Account", narration: "FX revaluation loss on import payable", amount: 5600 },
  { journalNo: "JV-00019", date: demoDateAt(18), referenceNo: "REF-019", debitLedger: "Bonus Expense", creditLedger: "Bonus Payable", narration: "Annual bonus provision", amount: 85000 },
  { journalNo: "JV-00020", date: demoDateAt(19), referenceNo: "REF-020", debitLedger: "Leave Encashment", creditLedger: "Leave Encashment Payable", narration: "Leave liability provision", amount: 42000 },
  { journalNo: "JV-00021", date: demoDateAt(20), referenceNo: "REF-021", debitLedger: "Gratuity Expense", creditLedger: "Gratuity Payable", narration: "Gratuity actuarial provision", amount: 38000 },
  { journalNo: "JV-00022", date: demoDateAt(21), referenceNo: "REF-022", debitLedger: "Statutory Dues", creditLedger: "PF Payable", narration: "PF employer contribution for May", amount: 18750 },
  { journalNo: "JV-00023", date: demoDateAt(22), referenceNo: "REF-023", debitLedger: "ESI Expense", creditLedger: "ESI Payable", narration: "ESI employer contribution for May", amount: 6200 },
  { journalNo: "JV-00024", date: demoDateAt(23), referenceNo: "REF-024", debitLedger: "Round-off Adjustment", creditLedger: "Sundry Creditors", narration: "Voucher round-off adjustment", amount: 150 },
  { journalNo: "JV-00025", date: demoDateAt(24), referenceNo: "REF-025", debitLedger: "Depreciation", creditLedger: "Accumulated Depreciation", narration: "Q1 additional depreciation charge", amount: 22000 },
];

function setVoucherNumber(voucherId: number, voucherNumber: string): void {
  const list = loadVouchers();
  const idx = list.findIndex((v) => v.id === voucherId);
  if (idx >= 0) {
    list[idx] = { ...list[idx], voucherNumber };
    saveVouchers(list);
  }
}

function activeFinancialYear() {
  const years = loadFinancialYears();
  return years.find((fy) => fy.status === "active") ?? years[0];
}

function seedJournalRegisterVouchers(): void {
  const existing = loadVouchers();
  const fy = activeFinancialYear();

  for (const spec of JOURNAL_REGISTER_SEEDS) {
    if (existing.some((v) => v.voucherNumber === spec.journalNo)) continue;

    const v = createVoucher("journal", {
      date: spec.date,
      referenceNo: spec.referenceNo,
      narration: spec.narration,
      status: "posted",
      financialYearId: fy?.id ?? null,
      financialYearName: fy?.name ?? "",
      lines: [
        {
          id: Date.now() + Math.random() * 1000,
          ledgerId: null,
          ledgerName: spec.debitLedger,
          debit: spec.amount,
          credit: 0,
          remarks: spec.narration,
        },
        {
          id: Date.now() + Math.random() * 1000 + 1,
          ledgerId: null,
          ledgerName: spec.creditLedger,
          debit: 0,
          credit: spec.amount,
          remarks: spec.narration,
        },
      ],
    });
    setVoucherNumber(v.id, spec.journalNo);

    const list = loadVouchers();
    const idx = list.findIndex((x) => x.id === v.id);
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        createdBy: ACCOUNTS_CURRENT_USER,
        updatedBy: ACCOUNTS_CURRENT_USER,
      };
      saveVouchers(list);
    }
  }
}

export function ensureJournalRegisterDemoSeed(): void {
  if (typeof window === "undefined") return;
  try {
    const current = localStorage.getItem(VERSION_KEY);
    if (current === JOURNAL_REGISTER_DEMO_SEED_VERSION) return;
    seedJournalRegisterVouchers();
    localStorage.setItem(VERSION_KEY, JOURNAL_REGISTER_DEMO_SEED_VERSION);
  } catch {
    /* ignore */
  }
}
