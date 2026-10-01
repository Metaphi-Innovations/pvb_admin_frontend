/**
 * Voucher listing demo seed — realistic Receipt, Payment, Contra and Journal vouchers
 * for default listing / GL / Day Book review. Idempotent via version key.
 */

import { demoDateAt } from "@/lib/accounts/demo-date-utils";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import {
  createVoucher,
  loadVouchers,
  saveVouchers,
  type VoucherLine,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import type { VoucherTypeCode } from "@/app/(app)/accounts/masters/masters-data";
import { getLedgersUnderSubGroupName } from "@/lib/accounts/coa-hierarchy";
import { resolveDefaultDemoBankLedger, getDemoBankLedgers } from "@/lib/accounts/bank-ledger-resolver";
import { resolveMappingLedger } from "@/lib/accounts/ledger-mappings";
import { resolveLedgerIdByName } from "@/lib/accounts/general-ledger-data";
import { ensureAccountsCoreDemoData } from "@/lib/accounts/accounts-demo-seed";
import { ACCOUNTS_VOUCHERS_UPDATED_EVENT } from "@/lib/accounts/accounts-section-seed";

export const VOUCHER_LISTING_DEMO_SEED_VERSION = "voucher-listing-v1";
const VERSION_KEY = "ds_voucher_listing_demo_seed_version";
const PREFIX = "VCH-DEMO-";

type ResolvedLedger = { id: number; name: string; code: string };

function ledgerLabel(ledger: ChartOfAccount | ResolvedLedger): string {
  return "accountName" in ledger ? ledger.accountName : ledger.name;
}

function isListingDemoVoucher(no: string): boolean {
  return no.startsWith(PREFIX);
}

function cleanupListingDemoVouchers(): void {
  saveVouchers(loadVouchers().filter((v) => !isListingDemoVoucher(v.voucherNumber)));
}

function resolveLedger(...candidates: string[]): ResolvedLedger | null {
  const records = loadChartOfAccounts();
  for (const candidate of candidates) {
    const id = resolveLedgerIdByName(candidate);
    if (!id) continue;
    const ledger = records.find((r) => r.id === id && r.nodeLevel === "ledger");
    if (ledger) {
      return { id: ledger.id, name: ledger.accountName, code: ledger.accountCode };
    }
  }
  return null;
}

function resolveCashLedger(...candidates: string[]): ResolvedLedger | null {
  const cashLedgers = getLedgersUnderSubGroupName("Cash-in-Hand");
  for (const part of candidates) {
    const match = cashLedgers.find((l) =>
      l.accountName.toLowerCase().includes(part.toLowerCase()),
    );
    if (match) {
      return { id: match.id, name: match.accountName, code: match.accountCode };
    }
  }
  return cashLedgers[0]
    ? {
        id: cashLedgers[0].id,
        name: cashLedgers[0].accountName,
        code: cashLedgers[0].accountCode,
      }
    : null;
}

function toLines(
  lines: { ledgerId: number; ledgerName: string; debit: number; credit: number; remarks?: string }[],
): VoucherLine[] {
  return lines.map((l, i) => ({
    id: Date.now() + i + Math.floor(Math.random() * 1000),
    ledgerId: l.ledgerId,
    ledgerName: l.ledgerName,
    debit: l.debit,
    credit: l.credit,
    remarks: l.remarks ?? "",
  }));
}

function hasSeedVoucher(no: string): boolean {
  return loadVouchers().some((v) => v.voucherNumber === no);
}

function postVoucher(spec: {
  no: string;
  type: VoucherTypeCode;
  date: string;
  referenceNo: string;
  narration: string;
  paymentMode?: string;
  lines: { ledgerId: number; ledgerName: string; debit: number; credit: number; remarks?: string }[];
}): void {
  if (hasSeedVoucher(spec.no)) return;

  const voucher = createVoucher(spec.type, {
    date: spec.date,
    referenceNo: spec.referenceNo,
    narration: spec.narration,
    paymentMode: spec.paymentMode,
    status: "posted",
    lines: toLines(spec.lines),
  });

  const list = loadVouchers();
  const idx = list.findIndex((v) => v.id === voucher.id);
  if (idx >= 0) {
    list[idx] = {
      ...list[idx],
      voucherNumber: spec.no,
      createdBy: ACCOUNTS_CURRENT_USER,
      updatedBy: ACCOUNTS_CURRENT_USER,
    };
    saveVouchers(list);
  }
}

function seedReceiptVouchers(): void {
  const hdfc = resolveDefaultDemoBankLedger();
  const cash = resolveCashLedger("Main", "Petty", "Office");
  const customer =
    resolveMappingLedger("sales_receivable", "ABC Agro Distributor", { createIfMissing: true }) ??
    resolveLedger("ABC Agro Distributor", "Krishna Retail Store");
  const interest =
    resolveLedger("Bank Interest - HDFC Current Account", "FD Interest Income", "Interest Income");

  if (hdfc && customer) {
    postVoucher({
      no: `${PREFIX}RV-001`,
      type: "receipt",
      date: demoDateAt(0),
      referenceNo: "UTR/HDFC/20260415001",
      narration: "Customer payment received against outstanding invoice",
      paymentMode: "NEFT/RTGS",
      lines: [
        { ledgerId: hdfc.id, ledgerName: hdfc.accountName, debit: 125000, credit: 0 },
        { ledgerId: customer.id, ledgerName: ledgerLabel(customer), debit: 0, credit: 125000 },
      ],
    });
  }

  if (cash && customer) {
    postVoucher({
      no: `${PREFIX}RV-002`,
      type: "receipt",
      date: demoDateAt(1),
      referenceNo: "CSH/RCPT/0042",
      narration: "Cash receipt from customer at counter",
      paymentMode: "Cash",
      lines: [
        { ledgerId: cash.id, ledgerName: cash.name, debit: 28500, credit: 0 },
        { ledgerId: customer.id, ledgerName: ledgerLabel(customer), debit: 0, credit: 28500 },
      ],
    });
  }

  if (hdfc && interest) {
    postVoucher({
      no: `${PREFIX}RV-003`,
      type: "receipt",
      date: demoDateAt(2),
      referenceNo: "INT/HDFC/APR-2026",
      narration: "Interest income credited by HDFC Bank",
      paymentMode: "NEFT/RTGS",
      lines: [
        { ledgerId: hdfc.id, ledgerName: hdfc.accountName, debit: 6800, credit: 0 },
        { ledgerId: interest.id, ledgerName: interest.name, debit: 0, credit: 6800 },
      ],
    });
  }
}

function seedPaymentVouchers(): void {
  const hdfc = resolveDefaultDemoBankLedger();
  const cash = resolveCashLedger("Main", "Petty", "Office");
  const vendor =
    resolveMappingLedger("purchase_payable", "AgroChem Supplies", { createIfMissing: true }) ??
    resolveMappingLedger("purchase_payable", "Bharat Seeds", { createIfMissing: true }) ??
    resolveLedger("Prime Fertilizers", "Shree Traders");
  const officeExpense =
    resolveLedger("Office Rent", "Rent Expense", "Electricity Expense", "Office Expense") ?? null;
  const gstPayable =
    resolveLedger("CGST Payable", "SGST Payable", "GST Payable", "IGST Payable") ?? null;

  if (hdfc && vendor) {
    postVoucher({
      no: `${PREFIX}PV-001`,
      type: "payment",
      date: demoDateAt(3),
      referenceNo: "UTR/HDFC/20260416002",
      narration: "Vendor payment for purchase bill settlement",
      paymentMode: "NEFT/RTGS",
      lines: [
        { ledgerId: vendor.id, ledgerName: ledgerLabel(vendor), debit: 87500, credit: 0 },
        { ledgerId: hdfc.id, ledgerName: hdfc.accountName, debit: 0, credit: 87500 },
      ],
    });
  }

  if (cash && officeExpense) {
    postVoucher({
      no: `${PREFIX}PV-002`,
      type: "payment",
      date: demoDateAt(4),
      referenceNo: "PETTY/EXP/118",
      narration: "Office expense paid in cash",
      paymentMode: "Cash",
      lines: [
        { ledgerId: officeExpense.id, ledgerName: officeExpense.name, debit: 4500, credit: 0 },
        { ledgerId: cash.id, ledgerName: cash.name, debit: 0, credit: 4500 },
      ],
    });
  }

  if (hdfc && gstPayable) {
    postVoucher({
      no: `${PREFIX}PV-003`,
      type: "payment",
      date: demoDateAt(5),
      referenceNo: "GST/CHALLAN/APR-26",
      narration: "GST payment remitted from HDFC Bank",
      paymentMode: "NEFT/RTGS",
      lines: [
        { ledgerId: gstPayable.id, ledgerName: gstPayable.name, debit: 32400, credit: 0 },
        { ledgerId: hdfc.id, ledgerName: hdfc.accountName, debit: 0, credit: 32400 },
      ],
    });
  }
}

function seedContraVouchers(): void {
  const banks = getDemoBankLedgers();
  const hdfc = banks.hdfc ?? resolveDefaultDemoBankLedger();
  const icici = banks.icici ?? getLedgersUnderSubGroupName("Bank Accounts")[1] ?? hdfc;
  const cash = resolveCashLedger("Main", "Petty", "Office");

  if (hdfc && cash) {
    postVoucher({
      no: `${PREFIX}CV-001`,
      type: "contra",
      date: demoDateAt(6),
      referenceNo: "DEP/CSH/20260417",
      narration: "Cash deposited into HDFC Bank",
      paymentMode: "Cash Deposit",
      lines: [
        { ledgerId: hdfc.id, ledgerName: hdfc.accountName, debit: 50000, credit: 0 },
        { ledgerId: cash.id, ledgerName: cash.name, debit: 0, credit: 50000 },
      ],
    });

    postVoucher({
      no: `${PREFIX}CV-002`,
      type: "contra",
      date: demoDateAt(7),
      referenceNo: "WDL/CSH/20260418",
      narration: "Cash withdrawn from HDFC Bank for petty cash",
      paymentMode: "Cash Withdrawal",
      lines: [
        { ledgerId: cash.id, ledgerName: cash.name, debit: 15000, credit: 0 },
        { ledgerId: hdfc.id, ledgerName: hdfc.accountName, debit: 0, credit: 15000 },
      ],
    });
  }

  if (hdfc && icici && hdfc.id !== icici.id) {
    postVoucher({
      no: `${PREFIX}CV-003`,
      type: "contra",
      date: demoDateAt(8),
      referenceNo: "FT/HDFC-ICICI/8821",
      narration: "Bank-to-bank transfer between operating accounts",
      paymentMode: "Bank Transfer",
      lines: [
        { ledgerId: icici.id, ledgerName: icici.accountName, debit: 100000, credit: 0 },
        { ledgerId: hdfc.id, ledgerName: hdfc.accountName, debit: 0, credit: 100000 },
      ],
    });
  }
}

function seedJournalVouchers(): void {
  const depreciation =
    resolveLedger("Depreciation", "Depreciation Expense") ??
    resolveLedger("Salary Expense", "Rent Expense");
  const accumulated =
    resolveLedger("Accumulated Depreciation", "Office Equipment", "Furniture & Fixtures") ??
    depreciation;
  const salaryExpense = resolveLedger("Salary Expense", "Salary") ?? depreciation;
  const rentExpense = resolveLedger("Rent Expense", "Electricity Expense") ?? salaryExpense;
  const salaryPayable =
    resolveLedger("Salary Payable - HO Staff", "Salary Payable", "Incentive & Bonus Payable") ??
    null;
  const bonusPayable = resolveLedger("Incentive & Bonus Payable", "Salary Payable") ?? salaryPayable;
  const cgst = resolveLedger("CGST Payable", "CGST Output", "Output CGST") ?? null;
  const sgst = resolveLedger("SGST Payable", "SGST Output", "Output SGST") ?? null;
  const gstInput =
    resolveLedger("CGST Input", "SGST Input", "IGST Input", "Input CGST") ?? cgst;

  if (depreciation && accumulated) {
    postVoucher({
      no: `${PREFIX}JV-001`,
      type: "journal",
      date: demoDateAt(9),
      referenceNo: "DEP/APR-2026",
      narration: "Monthly depreciation entry for fixed assets",
      lines: [
        { ledgerId: depreciation.id, ledgerName: depreciation.name, debit: 18000, credit: 0 },
        { ledgerId: accumulated.id, ledgerName: accumulated.name, debit: 0, credit: 18000 },
      ],
    });
  }

  if (salaryExpense && rentExpense && salaryPayable && bonusPayable) {
    postVoucher({
      no: `${PREFIX}JV-002`,
      type: "journal",
      date: demoDateAt(10),
      referenceNo: "SAL/PROV/APR-26",
      narration: "Salary provision entry for April payroll",
      lines: [
        { ledgerId: salaryExpense.id, ledgerName: salaryExpense.name, debit: 450000, credit: 0 },
        { ledgerId: rentExpense.id, ledgerName: rentExpense.name, debit: 25000, credit: 0 },
        { ledgerId: salaryPayable.id, ledgerName: salaryPayable.name, debit: 0, credit: 420000 },
        { ledgerId: bonusPayable.id, ledgerName: bonusPayable.name, debit: 0, credit: 55000 },
      ],
    });
  }

  if (cgst && sgst && gstInput) {
    postVoucher({
      no: `${PREFIX}JV-003`,
      type: "journal",
      date: demoDateAt(11),
      referenceNo: "GST/ADJ/APR-26",
      narration: "GST adjustment entry — offset output liability with input credit",
      lines: [
        { ledgerId: cgst.id, ledgerName: cgst.name, debit: 12500, credit: 0 },
        { ledgerId: sgst.id, ledgerName: sgst.name, debit: 12500, credit: 0 },
        { ledgerId: gstInput.id, ledgerName: gstInput.name, debit: 0, credit: 25000 },
      ],
    });
  }
}

export function seedVoucherListingDemoData(force = false): void {
  if (typeof window === "undefined") return;
  const stored = localStorage.getItem(VERSION_KEY);
  if (!force && stored === VOUCHER_LISTING_DEMO_SEED_VERSION) return;

  if (stored !== VOUCHER_LISTING_DEMO_SEED_VERSION) {
    cleanupListingDemoVouchers();
  }

  ensureAccountsCoreDemoData();
  seedReceiptVouchers();
  seedPaymentVouchers();
  seedContraVouchers();
  seedJournalVouchers();

  localStorage.setItem(VERSION_KEY, VOUCHER_LISTING_DEMO_SEED_VERSION);
  window.dispatchEvent(new CustomEvent(ACCOUNTS_VOUCHERS_UPDATED_EVENT));
}

/** Call on voucher listing pages so demo rows exist even when transactions section was seeded earlier. */
export function ensureVoucherListingDemoOnPageLoad(): void {
  seedVoucherListingDemoData();
}
