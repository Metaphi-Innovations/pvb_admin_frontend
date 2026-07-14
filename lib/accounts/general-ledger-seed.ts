/**
 * General Ledger demo scenarios — targeted vouchers for GL report testing.
 */

import { demoDateAt, demoDaysAgo, demoFinancialYearStart } from "@/lib/accounts/demo-date-utils";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import {
  createVoucher,
  loadVouchers,
  saveVouchers,
  type VoucherLine,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import type { VoucherTypeCode } from "@/app/(app)/accounts/masters/masters-data";
import { ensureCoaPostingLedgerTransactionsOnPageLoad } from "@/lib/accounts/coa-ledger-transactions-seed";
import { resolveLedgerIdByName } from "@/lib/accounts/general-ledger-data";
import type { GeneralLedgerDemoScenario } from "@/lib/accounts/general-ledger-types";

export const GENERAL_LEDGER_SEED_VERSION = "gl-scenarios-v1";
const VERSION_KEY = "ds_general_ledger_scenarios_seed_version";
const PREFIX = "GL-DEMO-";

function findLedger(name: string): { id: number; name: string } | null {
  const id = resolveLedgerIdByName(name);
  if (!id) return null;
  const ledger = loadChartOfAccounts().find((r) => r.id === id);
  return ledger ? { id: ledger.id, name: ledger.accountName } : null;
}

function hasSeedVoucher(no: string): boolean {
  return loadVouchers().some((v) => v.voucherNumber === no);
}

function toLines(
  lines: { ledgerId: number; ledgerName: string; debit: number; credit: number; remarks?: string }[],
): VoucherLine[] {
  return lines.map((l, i) => ({
    id: Date.now() + i,
    ledgerId: l.ledgerId,
    ledgerName: l.ledgerName,
    debit: l.debit,
    credit: l.credit,
    remarks: l.remarks ?? "",
  }));
}

function postBalancedVoucher(spec: {
  no: string;
  type: VoucherTypeCode;
  date: string;
  narration: string;
  lines: { ledgerId: number; ledgerName: string; debit: number; credit: number; remarks?: string }[];
}) {
  if (hasSeedVoucher(spec.no)) return;
  const voucher = createVoucher(spec.type, {
    date: spec.date,
    narration: spec.narration,
    status: "posted",
    lines: toLines(spec.lines),
    referenceNo: spec.no,
  });
  const list = loadVouchers();
  const idx = list.findIndex((v) => v.id === voucher.id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], voucherNumber: spec.no };
    saveVouchers(list);
  }
}

function seedScenarioVouchers(): void {
  const customer = findLedger("ABC Agro Distributor");
  const supplier = findLedger("AgroChem Supplies") ?? findLedger("Prime Fertilizers");
  const bank = findLedger("HDFC Bank") ?? findLedger("HDFC Current Account");
  const sales = findLedger("Sales Account") ?? findLedger("Sales Accounts");
  const purchase = findLedger("Purchase Account") ?? findLedger("Purchase Accounts");
  const gst = findLedger("CGST Payable") ?? findLedger("GST Payable");
  const expense = findLedger("Office Rent") ?? findLedger("Rent Expense");
  const cash = findLedger("Cash in Hand") ?? findLedger("Petty Cash");

  const recent = demoDateAt(3);
  const prior = demoDaysAgo(45);

  if (customer && sales && bank) {
    postBalancedVoucher({
      no: `${PREFIX}CUST-SI-01`,
      type: "sales",
      date: recent,
      narration: "GL demo — customer sales invoice",
      lines: [
        { ledgerId: customer.id, ledgerName: customer.name, debit: 45000, credit: 0 },
        { ledgerId: sales.id, ledgerName: sales.name, debit: 0, credit: 45000 },
      ],
    });
    postBalancedVoucher({
      no: `${PREFIX}CUST-RV-01`,
      type: "receipt",
      date: demoDateAt(4),
      narration: "GL demo — customer receipt",
      lines: [
        { ledgerId: bank.id, ledgerName: bank.name, debit: 25000, credit: 0 },
        { ledgerId: customer.id, ledgerName: customer.name, debit: 0, credit: 25000 },
      ],
    });
  }

  if (supplier && purchase && bank) {
    postBalancedVoucher({
      no: `${PREFIX}SUP-PI-01`,
      type: "purchase",
      date: recent,
      narration: "GL demo — supplier purchase bill",
      lines: [
        { ledgerId: purchase.id, ledgerName: purchase.name, debit: 32000, credit: 0 },
        { ledgerId: supplier.id, ledgerName: supplier.name, debit: 0, credit: 32000 },
      ],
    });
    postBalancedVoucher({
      no: `${PREFIX}SUP-PV-01`,
      type: "payment",
      date: demoDateAt(5),
      narration: "GL demo — supplier payment",
      lines: [
        { ledgerId: supplier.id, ledgerName: supplier.name, debit: 18000, credit: 0 },
        { ledgerId: bank.id, ledgerName: bank.name, debit: 0, credit: 18000 },
      ],
    });
  }

  if (bank && cash && customer) {
    postBalancedVoucher({
      no: `${PREFIX}BNK-RV-01`,
      type: "receipt",
      date: recent,
      narration: "GL demo — bank receipt",
      lines: [
        { ledgerId: bank.id, ledgerName: bank.name, debit: 15000, credit: 0 },
        { ledgerId: customer.id, ledgerName: customer.name, debit: 0, credit: 15000 },
      ],
    });
    postBalancedVoucher({
      no: `${PREFIX}BNK-PV-01`,
      type: "payment",
      date: demoDateAt(6),
      narration: "GL demo — bank payment",
      lines: [
        {
          ledgerId: expense?.id ?? bank.id,
          ledgerName: expense?.name ?? bank.name,
          debit: 8500,
          credit: 0,
        },
        { ledgerId: bank.id, ledgerName: bank.name, debit: 0, credit: 8500 },
      ],
    });
    postBalancedVoucher({
      no: `${PREFIX}BNK-CV-01`,
      type: "contra",
      date: demoDateAt(7),
      narration: "GL demo — bank contra to cash",
      lines: [
        { ledgerId: cash.id, ledgerName: cash.name, debit: 5000, credit: 0 },
        { ledgerId: bank.id, ledgerName: bank.name, debit: 0, credit: 5000 },
      ],
    });
  }

  if (sales && customer) {
    postBalancedVoucher({
      no: `${PREFIX}SLS-SI-02`,
      type: "sales",
      date: demoDateAt(8),
      narration: "GL demo — sales invoice 2",
      lines: [
        { ledgerId: customer.id, ledgerName: customer.name, debit: 22000, credit: 0 },
        { ledgerId: sales.id, ledgerName: sales.name, debit: 0, credit: 22000 },
      ],
    });
    postBalancedVoucher({
      no: `${PREFIX}SLS-SI-03`,
      type: "sales",
      date: demoDateAt(9),
      narration: "GL demo — sales invoice 3",
      lines: [
        { ledgerId: customer.id, ledgerName: customer.name, debit: 18500, credit: 0 },
        { ledgerId: sales.id, ledgerName: sales.name, debit: 0, credit: 18500 },
      ],
    });
  }

  if (purchase && supplier) {
    postBalancedVoucher({
      no: `${PREFIX}PUR-PI-02`,
      type: "purchase",
      date: demoDateAt(10),
      narration: "GL demo — purchase bill 2",
      lines: [
        { ledgerId: purchase.id, ledgerName: purchase.name, debit: 27500, credit: 0 },
        { ledgerId: supplier.id, ledgerName: supplier.name, debit: 0, credit: 27500 },
      ],
    });
    postBalancedVoucher({
      no: `${PREFIX}PUR-PI-03`,
      type: "purchase",
      date: demoDateAt(11),
      narration: "GL demo — purchase bill 3",
      lines: [
        { ledgerId: purchase.id, ledgerName: purchase.name, debit: 19800, credit: 0 },
        { ledgerId: supplier.id, ledgerName: supplier.name, debit: 0, credit: 19800 },
      ],
    });
  }

  if (gst && sales && customer) {
    postBalancedVoucher({
      no: `${PREFIX}GST-JV-01`,
      type: "journal",
      date: recent,
      narration: "GL demo — GST output accrual",
      lines: [
        { ledgerId: customer.id, ledgerName: customer.name, debit: 5400, credit: 0 },
        { ledgerId: gst.id, ledgerName: gst.name, debit: 0, credit: 5400 },
      ],
    });
  }

  if (expense && bank) {
    postBalancedVoucher({
      no: `${PREFIX}EXP-JV-01`,
      type: "journal",
      date: recent,
      narration: "GL demo — expense accrual journal",
      lines: [
        { ledgerId: expense.id, ledgerName: expense.name, debit: 12000, credit: 0 },
        { ledgerId: bank.id, ledgerName: bank.name, debit: 0, credit: 12000 },
      ],
    });
  }

  if (customer && sales) {
    postBalancedVoucher({
      no: `${PREFIX}CN-01`,
      type: "credit_note",
      date: demoDateAt(12),
      narration: "GL demo — credit note to customer",
      lines: [
        { ledgerId: sales.id, ledgerName: sales.name, debit: 3500, credit: 0 },
        { ledgerId: customer.id, ledgerName: customer.name, debit: 0, credit: 3500 },
      ],
    });
  }

  if (supplier && purchase) {
    postBalancedVoucher({
      no: `${PREFIX}DN-01`,
      type: "debit_note",
      date: demoDateAt(13),
      narration: "GL demo — debit note from supplier",
      lines: [
        { ledgerId: supplier.id, ledgerName: supplier.name, debit: 2800, credit: 0 },
        { ledgerId: purchase.id, ledgerName: purchase.name, debit: 0, credit: 2800 },
      ],
    });
  }

  if (customer && sales && gst) {
    postBalancedVoucher({
      no: `${PREFIX}MULTI-JV-01`,
      type: "journal",
      date: demoDateAt(14),
      narration: "GL demo — multi-line compound entry",
      lines: [
        {
          ledgerId: customer.id,
          ledgerName: customer.name,
          debit: 59000,
          credit: 0,
          remarks: "Composite billing",
        },
        { ledgerId: sales.id, ledgerName: sales.name, debit: 0, credit: 50000 },
        { ledgerId: gst.id, ledgerName: gst.name, debit: 0, credit: 9000 },
      ],
    });
  }

  const openingOnly = findLedger("Security Deposit") ?? findLedger("Rental Deposit");
  if (openingOnly && bank) {
    postBalancedVoucher({
      no: `${PREFIX}OPEN-PRIOR-01`,
      type: "journal",
      date: prior,
      narration: "GL demo — prior period only (opening carry-forward)",
      lines: [
        { ledgerId: openingOnly.id, ledgerName: openingOnly.name, debit: 25000, credit: 0 },
        { ledgerId: bank.id, ledgerName: bank.name, debit: 0, credit: 25000 },
      ],
    });
  }

  void demoFinancialYearStart();
}

export const GENERAL_LEDGER_DEMO_SCENARIOS: GeneralLedgerDemoScenario[] = [
  { id: "customer", label: "Customer — opening, sales, receipts", ledgerName: "ABC Agro Distributor", ledgerId: null },
  { id: "supplier", label: "Supplier — purchases, payments", ledgerName: "AgroChem Supplies", ledgerId: null },
  { id: "bank", label: "Bank — receipt, payment, contra", ledgerName: "HDFC Bank", ledgerId: null },
  { id: "sales", label: "Sales — multiple invoices", ledgerName: "Sales Account", ledgerId: null },
  { id: "purchase", label: "Purchase — multiple bills", ledgerName: "Purchase Account", ledgerId: null },
  { id: "gst", label: "GST ledger postings", ledgerName: "CGST Payable", ledgerId: null },
  { id: "expense", label: "Expense — journal/payment", ledgerName: "Office Rent", ledgerId: null },
  { id: "notes", label: "Credit/debit note entries", ledgerName: "ABC Agro Distributor", ledgerId: null },
  { id: "multi", label: "Multi counter voucher", ledgerName: "ABC Agro Distributor", ledgerId: null },
  { id: "opening-only", label: "Non-zero opening, no period txns", ledgerName: "Security Deposit", ledgerId: null },
];

export function resolveGeneralLedgerDemoScenarios(): GeneralLedgerDemoScenario[] {
  return GENERAL_LEDGER_DEMO_SCENARIOS.map((s) => ({
    ...s,
    ledgerId: resolveLedgerIdByName(s.ledgerName),
  }));
}

export function seedGeneralLedgerScenarios(force = false): void {
  if (typeof window === "undefined") return;
  ensureCoaPostingLedgerTransactionsOnPageLoad();
  if (!force && localStorage.getItem(VERSION_KEY) === GENERAL_LEDGER_SEED_VERSION) return;
  seedScenarioVouchers();
  localStorage.setItem(VERSION_KEY, GENERAL_LEDGER_SEED_VERSION);
}

export function ensureGeneralLedgerScenariosOnPageLoad(): void {
  if (typeof window === "undefined") return;
  ensureCoaPostingLedgerTransactionsOnPageLoad();
  if (localStorage.getItem(VERSION_KEY) !== GENERAL_LEDGER_SEED_VERSION) {
    seedGeneralLedgerScenarios();
  }
}
