import { demoAddDays, demoDateAt, demoFinancialYearStart, demoToday, demoTimestamp } from "@/lib/accounts/demo-date-utils";
/**
 * Bundled demo ledger transactions — 5 deterministic entries per posting ledger.
 * Merged with posted vouchers when building COA ledger detail view.
 */

import type { ChartOfAccount, AccountType } from "../../data";
import { isPostingLedger } from "@/lib/accounts/coa-hierarchy";
import {
  buildBundledCoaDemoLedgers,
  COA_DEMO_SOURCE_MODULE,
} from "./coa-demo-bundle";

export interface CoaDemoTransactionSeed {
  ledgerId: number;
  date: string;
  voucherNo: string;
  voucherType: string;
  partyName: string;
  particulars: string;
  debit: number;
  credit: number;
}

const DEMO_DATES = ["2026-04-08", "2026-04-22", "2026-05-06", "2026-05-20", "2026-06-03"];

const DEMO_PARTIES = [
  "ABC Agro Distributor",
  "GreenField Suppliers",
  "AgroChem Traders",
  "Vidarbha Agro Mart",
  "Balaji CNF Services",
  "HDFC Current Account",
  "Office Petty Cash",
];

const VOUCHER_TYPES: Record<AccountType, string[]> = {
  Asset: [
    "Sales Invoice",
    "Receipt Voucher",
    "Journal Voucher",
    "Credit Note",
    "Receipt Voucher",
  ],
  Liability: [
    "Purchase Invoice",
    "Payment Voucher",
    "Journal Voucher",
    "Debit Note",
    "Payment Voucher",
  ],
  Income: [
    "Sales Invoice",
    "Journal Voucher",
    "Credit Note",
    "Sales Invoice",
    "Receipt Voucher",
  ],
  Expense: [
    "Payment Voucher",
    "Journal Voucher",
    "Purchase Invoice",
    "Payment Voucher",
    "Debit Note",
  ],
  Equity: ["Journal Voucher", "Receipt Voucher", "Payment Voucher", "Journal Voucher", "Contra"],
};

function hashInt(seed: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

function hashAmount(seed: string, base: number, spread: number): number {
  const bump = hashInt(seed, spread);
  return Math.round((base + bump) / 100) * 100;
}

function voucherPrefix(voucherType: string): string {
  if (voucherType.includes("Sales")) return "SI";
  if (voucherType.includes("Receipt")) return "RV";
  if (voucherType.includes("Payment")) return "PV";
  if (voucherType.includes("Journal")) return "JV";
  if (voucherType.includes("Credit")) return "CN";
  if (voucherType.includes("Debit")) return "DN";
  if (voucherType.includes("Purchase")) return "PI";
  if (voucherType.includes("Contra")) return "CT";
  return "VCH";
}

function buildTransactionsForLedger(ledger: ChartOfAccount): CoaDemoTransactionSeed[] {
  const types = VOUCHER_TYPES[ledger.accountType] ?? VOUCHER_TYPES.Asset;
  const isCreditNature =
    ledger.accountType === "Liability" || ledger.accountType === "Income";

  return DEMO_DATES.map((date, index) => {
    const voucherType = types[index];
    const partyName = DEMO_PARTIES[hashInt(`${ledger.id}-${index}`, DEMO_PARTIES.length)];
    const amount = hashAmount(`${ledger.accountName}-${index}`, 8500, 42000);
    const prefix = voucherPrefix(voucherType);
    const seq = String(1000 + hashInt(`${ledger.id}-v${index}`, 900)).padStart(4, "0");

    let debit = 0;
    let credit = 0;
    if (isCreditNature) {
      if (voucherType.includes("Payment") || voucherType.includes("Debit")) {
        debit = amount;
      } else {
        credit = amount;
      }
    } else if (voucherType.includes("Receipt") || voucherType.includes("Credit")) {
      credit = amount;
    } else {
      debit = amount;
    }

    if (ledger.accountType === "Expense") {
      debit = amount;
      credit = 0;
      if (voucherType.includes("Payment")) {
        debit = 0;
        credit = amount;
      }
    }

    if (ledger.accountType === "Income") {
      credit = amount;
      debit = 0;
      if (voucherType.includes("Credit")) {
        debit = amount;
        credit = 0;
      }
    }

    return {
      ledgerId: ledger.id,
      date,
      voucherNo: `${prefix}-DMO-${seq}`,
      voucherType,
      partyName,
      particulars: `${voucherType} — ${ledger.accountName}`,
      debit,
      credit,
    };
  });
}

let cachedByLedgerId: Map<number, CoaDemoTransactionSeed[]> | null = null;

function getTransactionCache(): Map<number, CoaDemoTransactionSeed[]> {
  if (cachedByLedgerId) return cachedByLedgerId;

  const map = new Map<number, CoaDemoTransactionSeed[]>();
  const allLedgers = buildBundledCoaDemoLedgers();

  for (const ledger of allLedgers) {
    if (!isPostingLedger(ledger, allLedgers)) continue;
    map.set(ledger.id, buildTransactionsForLedger(ledger));
  }

  cachedByLedgerId = map;
  return map;
}

export function getBundledDemoTransactions(ledgerId: number): CoaDemoTransactionSeed[] {
  return getTransactionCache().get(ledgerId) ?? [];
}

export function isBundledDemoLedger(ledger: ChartOfAccount): boolean {
  return ledger.erpSourceModule === COA_DEMO_SOURCE_MODULE;
}

export function getBundledDemoTransactionCount(): number {
  let count = 0;
  getTransactionCache().forEach((rows) => {
    count += rows.length;
  });
  return count;
}
