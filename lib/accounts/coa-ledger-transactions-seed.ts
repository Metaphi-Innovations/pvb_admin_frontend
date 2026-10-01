/**
 * Frontend-only mock transactions for COA Ledger Statement validation.
 * Creates 3–4 posted vouchers per posting ledger (Opening Balance is UI-synthetic).
 * Marked with referenceNo COA-LEDGER-STMT-DEMO so they can be purged / replaced later.
 */

import {
  createVoucher,
  loadVouchers,
  saveVouchers,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import type { VoucherTypeCode } from "@/app/(app)/accounts/masters/masters-data";
import {
  getPostableCoaAccounts,
  loadChartOfAccounts,
  type AccountType,
  type ChartOfAccount,
} from "@/app/(app)/accounts/data";
import { resolveSpecializedGroupType } from "@/lib/accounts/coa-specialized-groups";
import { isLedgerMovementVoucherStatus } from "@/lib/accounts/running-balance";
import { ACCOUNTS_VOUCHERS_UPDATED_EVENT } from "@/lib/accounts/accounts-section-seed";
import { demoDateAt } from "@/lib/accounts/demo-date-utils";

export const COA_LEDGER_TXN_SEED_VERSION = "realistic-3to5-v1";
const VERSION_KEY = "ds_coa_ledger_txn_seed_version";

/** @deprecated Prefer DEMO_REFERENCE — kept so purge still removes older seeds. */
export const COA_DEMO_VOUCHER_PREFIX = "COA-DMO-";

export const COA_LEDGER_STMT_DEMO_REF = "COA-LEDGER-STMT-DEMO";

const MIN_DEMO_LINES_PER_LEDGER = 3;

type VoucherPrefix = "SI" | "RV" | "PV" | "JV" | "PI" | "CN" | "DN" | "CV";

interface MockTxnTemplate {
  prefix: VoucherPrefix;
  voucherType: string;
  /** Primary line increases / decreases the ledger in the natural direction for this event. */
  side: "debit" | "credit";
  narration: (ledgerName: string) => string;
  partyName?: string;
}

function hashInt(seed: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % Math.max(1, mod);
}

function hashAmount(seed: string, base: number, spread: number): number {
  return Math.round((base + hashInt(seed, spread)) / 100) * 100;
}

function mapDisplayTypeToCode(voucherType: string): VoucherTypeCode {
  if (voucherType.includes("Sales")) return "sales";
  if (voucherType.includes("Receipt")) return "receipt";
  if (voucherType.includes("Payment")) return "payment";
  if (voucherType.includes("Purchase")) return "purchase";
  if (voucherType.includes("Credit")) return "credit_note";
  if (voucherType.includes("Debit")) return "debit_note";
  if (voucherType.includes("Contra")) return "contra";
  return "journal";
}

function isFixedAssetLedger(ledger: ChartOfAccount, records: ChartOfAccount[]): boolean {
  let cur: ChartOfAccount | undefined = ledger;
  for (let i = 0; i < 8 && cur; i++) {
    if (cur.accountName.trim().toLowerCase() === "fixed assets") return true;
    cur =
      cur.parentAccountId != null
        ? records.find((r) => r.id === cur!.parentAccountId)
        : undefined;
  }
  return false;
}

function isIntangibleLedger(ledger: ChartOfAccount): boolean {
  return /intangible|amorti/i.test(`${ledger.accountName} ${ledger.parentAccount ?? ""}`);
}

/** Type-specific voucher templates (Opening Balance is added by the statement UI). */
function resolveTxnTemplates(ledger: ChartOfAccount, records: ChartOfAccount[]): MockTxnTemplate[] {
  const spec = resolveSpecializedGroupType(ledger, records);
  const name = ledger.accountName;

  if (spec === "sundry_debtors") {
    return [
      {
        prefix: "SI",
        voucherType: "Sales Invoice",
        side: "debit",
        partyName: name,
        narration: (n) => `Sale of goods to ${n}`,
      },
      {
        prefix: "RV",
        voucherType: "Receipt Voucher",
        side: "credit",
        partyName: name,
        narration: (n) => `Receipt against outstanding from ${n}`,
      },
      {
        prefix: "CN",
        voucherType: "Credit Note",
        side: "credit",
        partyName: name,
        narration: (n) => `Credit note for sales return — ${n}`,
      },
    ];
  }

  if (spec === "sundry_creditors") {
    return [
      {
        prefix: "PI",
        voucherType: "Purchase Invoice",
        side: "credit",
        partyName: name,
        narration: (n) => `Purchase of goods from ${n}`,
      },
      {
        prefix: "PV",
        voucherType: "Payment Voucher",
        side: "debit",
        partyName: name,
        narration: (n) => `Payment against payable to ${n}`,
      },
      {
        prefix: "DN",
        voucherType: "Debit Note",
        side: "debit",
        partyName: name,
        narration: (n) => `Debit note for purchase return — ${n}`,
      },
    ];
  }

  if (spec === "bank_accounts") {
    return [
      {
        prefix: "RV",
        voucherType: "Receipt Voucher",
        side: "debit",
        narration: (n) => `Customer receipt deposited to ${n}`,
      },
      {
        prefix: "PV",
        voucherType: "Payment Voucher",
        side: "credit",
        narration: (n) => `Supplier payment from ${n}`,
      },
      {
        prefix: "CV",
        voucherType: "Contra Voucher",
        side: "credit",
        narration: (n) => `Cash withdrawal from ${n}`,
      },
      {
        prefix: "JV",
        voucherType: "Journal Voucher",
        side: "debit",
        narration: (n) => `Bank charges reversal — ${n}`,
      },
    ];
  }

  if (spec === "cash_in_hand") {
    return [
      {
        prefix: "RV",
        voucherType: "Receipt Voucher",
        side: "debit",
        narration: (n) => `Cash receipt into ${n}`,
      },
      {
        prefix: "PV",
        voucherType: "Payment Voucher",
        side: "credit",
        narration: (n) => `Cash payment from ${n}`,
      },
      {
        prefix: "JV",
        voucherType: "Journal Voucher",
        side: "debit",
        narration: (n) => `Petty cash adjustment — ${n}`,
      },
    ];
  }

  if (isFixedAssetLedger(ledger, records)) {
    const depLabel = isIntangibleLedger(ledger) ? "Amortization" : "Depreciation";
    return [
      {
        prefix: "PI",
        voucherType: "Purchase Voucher",
        side: "debit",
        narration: (n) => `Capital purchase — ${n}`,
      },
      {
        prefix: "JV",
        voucherType: "Journal Voucher",
        side: "debit",
        narration: (n) => `Capitalization entry — ${n}`,
      },
      {
        prefix: "JV",
        voucherType: "Journal Voucher",
        side: "credit",
        narration: (n) => `${depLabel} charged on ${n}`,
      },
    ];
  }

  if (
    spec === "gst_duties" ||
    spec === "gst_output" ||
    spec === "gst_input" ||
    spec === "gst_payable" ||
    spec === "gst_receivable"
  ) {
    return [
      {
        prefix: "JV",
        voucherType: "Journal Voucher",
        side: ledger.accountType === "Liability" ? "credit" : "debit",
        narration: (n) => `GST posting — ${n}`,
      },
      {
        prefix: "PV",
        voucherType: "Payment Voucher",
        side: ledger.accountType === "Liability" ? "debit" : "credit",
        narration: (n) => `GST settlement — ${n}`,
      },
      {
        prefix: "JV",
        voucherType: "Journal Voucher",
        side: ledger.accountType === "Liability" ? "credit" : "debit",
        narration: (n) => `GST adjustment — ${n}`,
      },
    ];
  }

  if (spec === "tds_payable") {
    return [
      {
        prefix: "JV",
        voucherType: "Journal Voucher",
        side: "credit",
        narration: (n) => `TDS deducted — ${n}`,
      },
      {
        prefix: "PV",
        voucherType: "Payment Voucher",
        side: "debit",
        narration: (n) => `TDS remittance — ${n}`,
      },
      {
        prefix: "JV",
        voucherType: "Journal Voucher",
        side: "credit",
        narration: (n) => `TDS provision adjustment — ${n}`,
      },
    ];
  }

  if (spec === "tds_receivable") {
    return [
      {
        prefix: "JV",
        voucherType: "Journal Voucher",
        side: "debit",
        narration: (n) => `TDS receivable booked — ${n}`,
      },
      {
        prefix: "RV",
        voucherType: "Receipt Voucher",
        side: "credit",
        narration: (n) => `TDS refund / credit — ${n}`,
      },
      {
        prefix: "JV",
        voucherType: "Journal Voucher",
        side: "debit",
        narration: (n) => `TDS receivable adjustment — ${n}`,
      },
    ];
  }

  if (spec === "inventory") {
    return [
      {
        prefix: "PI",
        voucherType: "Purchase Invoice",
        side: "debit",
        narration: (n) => `Stock inward — ${n}`,
      },
      {
        prefix: "JV",
        voucherType: "Journal Voucher",
        side: "credit",
        narration: (n) => `Stock issue / COGS — ${n}`,
      },
      {
        prefix: "JV",
        voucherType: "Journal Voucher",
        side: "debit",
        narration: (n) => `Inventory valuation adjustment — ${n}`,
      },
    ];
  }

  const byType: Record<AccountType, MockTxnTemplate[]> = {
    Expense: [
      {
        prefix: "PV",
        voucherType: "Payment Voucher",
        side: "debit",
        narration: (n) => `Expense payment — ${n}`,
      },
      {
        prefix: "JV",
        voucherType: "Journal Voucher",
        side: "debit",
        narration: (n) => `Expense accrual — ${n}`,
      },
      {
        prefix: "JV",
        voucherType: "Journal Voucher",
        side: "credit",
        narration: (n) => `Expense reversal / allocation — ${n}`,
      },
    ],
    Income: [
      {
        prefix: "SI",
        voucherType: "Sales Invoice",
        side: "credit",
        narration: (n) => `Revenue recognition — ${n}`,
      },
      {
        prefix: "RV",
        voucherType: "Receipt Voucher",
        side: "credit",
        narration: (n) => `Income receipt — ${n}`,
      },
      {
        prefix: "JV",
        voucherType: "Journal Voucher",
        side: "credit",
        narration: (n) => `Income adjustment — ${n}`,
      },
      {
        prefix: "CN",
        voucherType: "Credit Note",
        side: "debit",
        narration: (n) => `Income reversal / credit note — ${n}`,
      },
    ],
    Asset: [
      {
        prefix: "RV",
        voucherType: "Receipt Voucher",
        side: "debit",
        narration: (n) => `Asset receipt / increase — ${n}`,
      },
      {
        prefix: "JV",
        voucherType: "Journal Voucher",
        side: "debit",
        narration: (n) => `Asset adjustment — ${n}`,
      },
      {
        prefix: "PV",
        voucherType: "Payment Voucher",
        side: "credit",
        narration: (n) => `Asset utilization / reduction — ${n}`,
      },
    ],
    Liability: [
      {
        prefix: "PI",
        voucherType: "Purchase Invoice",
        side: "credit",
        narration: (n) => `Liability booked — ${n}`,
      },
      {
        prefix: "PV",
        voucherType: "Payment Voucher",
        side: "debit",
        narration: (n) => `Liability settlement — ${n}`,
      },
      {
        prefix: "JV",
        voucherType: "Journal Voucher",
        side: "credit",
        narration: (n) => `Liability adjustment — ${n}`,
      },
    ],
    Equity: [
      {
        prefix: "JV",
        voucherType: "Journal Voucher",
        side: "credit",
        narration: (n) => `Capital / equity infusion — ${n}`,
      },
      {
        prefix: "RV",
        voucherType: "Receipt Voucher",
        side: "debit",
        narration: (n) => `Owner contribution receipt — ${n}`,
      },
      {
        prefix: "JV",
        voucherType: "Journal Voucher",
        side: "debit",
        narration: (n) => `Drawings / equity adjustment — ${n}`,
      },
    ],
  };

  return byType[ledger.accountType] ?? byType.Expense;
}

function findContra(
  primary: ChartOfAccount,
  records: ChartOfAccount[],
  voucherType: string,
): ChartOfAccount {
  const postable = getPostableCoaAccounts(records);
  const others = postable.filter((r) => r.id !== primary.id);
  const bySpec = (spec: string) =>
    others.find((r) => resolveSpecializedGroupType(r, records) === spec);
  const byType = (t: AccountType) => others.find((r) => r.accountType === t);

  if (voucherType.includes("Sales") || voucherType.includes("Credit Note")) {
    return byType("Income") ?? bySpec("bank_accounts") ?? others[0] ?? primary;
  }
  if (voucherType.includes("Purchase") || voucherType.includes("Debit Note")) {
    return byType("Expense") ?? byType("Asset") ?? bySpec("bank_accounts") ?? others[0] ?? primary;
  }
  if (voucherType.includes("Receipt")) {
    return bySpec("sundry_debtors") ?? byType("Income") ?? bySpec("cash_in_hand") ?? others[0] ?? primary;
  }
  if (voucherType.includes("Payment")) {
    return bySpec("sundry_creditors") ?? byType("Expense") ?? bySpec("bank_accounts") ?? others[0] ?? primary;
  }
  if (voucherType.includes("Contra")) {
    return bySpec("cash_in_hand") ?? bySpec("bank_accounts") ?? others[0] ?? primary;
  }
  return byType("Expense") ?? byType("Income") ?? others[0] ?? primary;
}

export interface CoaLedgerTxnSpec {
  date: string;
  voucherNo: string;
  voucherType: string;
  partyName: string;
  particulars: string;
  debit: number;
  credit: number;
}

export function buildCoaLedgerTransactionSpecs(
  ledger: ChartOfAccount,
  records = loadChartOfAccounts(),
): CoaLedgerTxnSpec[] {
  const templates = resolveTxnTemplates(ledger, records);
  return templates.map((tpl, idx) => {
    const amount = hashAmount(`${ledger.id}-${tpl.prefix}-${idx}`, 12000, 48000);
    return {
      date: demoDateAt(2 + idx * 3),
      voucherNo: `${tpl.prefix}-${String(ledger.id * 10 + idx + 1).padStart(4, "0")}`,
      voucherType: tpl.voucherType,
      partyName: tpl.partyName ?? ledger.parentAccount ?? ledger.accountName,
      particulars: tpl.narration(ledger.accountName),
      debit: tpl.side === "debit" ? amount : 0,
      credit: tpl.side === "credit" ? amount : 0,
    };
  });
}

function isCoaDemoVoucher(v: { voucherNumber: string; referenceNo?: string }): boolean {
  return (
    v.referenceNo === COA_LEDGER_STMT_DEMO_REF ||
    v.voucherNumber.startsWith(COA_DEMO_VOUCHER_PREFIX)
  );
}

export function purgeCoaDemoVouchers(): void {
  saveVouchers(loadVouchers().filter((v) => !isCoaDemoVoucher(v)));
}

/** Count posted demo voucher lines per ledger id. */
export function countCoaDemoLinesByLedger(): Map<number, number> {
  const map = new Map<number, number>();
  for (const v of loadVouchers()) {
    if (!isCoaDemoVoucher(v)) continue;
    if (!isLedgerMovementVoucherStatus(v.status)) continue;
    for (const line of v.lines) {
      if (!line.ledgerId) continue;
      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;
      if (debit === 0 && credit === 0) continue;
      map.set(line.ledgerId, (map.get(line.ledgerId) ?? 0) + 1);
    }
  }
  return map;
}

export function coaLedgerTransactionsNeedRepair(): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(VERSION_KEY) !== COA_LEDGER_TXN_SEED_VERSION) return true;

  const records = loadChartOfAccounts();
  const postable = getPostableCoaAccounts(records);
  if (postable.length === 0) return false;

  const counts = countCoaDemoLinesByLedger();
  return postable.some((ledger) => (counts.get(ledger.id) ?? 0) < MIN_DEMO_LINES_PER_LEDGER);
}

function setVoucherNumber(voucherId: number, voucherNumber: string): void {
  const list = loadVouchers();
  const idx = list.findIndex((v) => v.id === voucherId);
  if (idx >= 0) {
    list[idx] = { ...list[idx], voucherNumber, referenceNo: COA_LEDGER_STMT_DEMO_REF };
    saveVouchers(list);
  }
}

function postMockVoucher(args: {
  primary: ChartOfAccount;
  contra: ChartOfAccount;
  template: MockTxnTemplate;
  voucherNo: string;
  date: string;
  amount: number;
}): void {
  const { primary, contra, template, voucherNo, date, amount } = args;
  const debit = template.side === "debit" ? amount : 0;
  const credit = template.side === "credit" ? amount : 0;

  const v = createVoucher(mapDisplayTypeToCode(template.voucherType), {
    date,
    referenceNo: COA_LEDGER_STMT_DEMO_REF,
    narration: template.narration(primary.accountName),
    status: "posted",
    lines: [
      {
        id: 1,
        ledgerId: primary.id,
        ledgerName: primary.accountName,
        debit,
        credit,
        remarks: template.voucherType,
        contactName: template.partyName,
      },
      {
        id: 2,
        ledgerId: contra.id,
        ledgerName: contra.accountName,
        debit: credit,
        credit: debit,
        remarks: contra.accountName,
      },
    ],
  });
  setVoucherNumber(v.id, voucherNo);
}

function dispatchVouchersUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ACCOUNTS_VOUCHERS_UPDATED_EVENT));
  }
}

/** Seed 3–4 realistic demo transactions per posting ledger. */
export function seedCoaPostingLedgerTransactions(force = false): void {
  if (typeof window === "undefined") return;

  const stored = localStorage.getItem(VERSION_KEY);
  if (!force && stored === COA_LEDGER_TXN_SEED_VERSION && !coaLedgerTransactionsNeedRepair()) {
    return;
  }

  purgeCoaDemoVouchers();

  const records = loadChartOfAccounts();
  const postable = getPostableCoaAccounts(records).sort((a, b) => a.id - b.id);
  if (postable.length === 0) return;

  const counters: Record<VoucherPrefix, number> = {
    SI: 1,
    RV: 1,
    PV: 1,
    JV: 1,
    PI: 1,
    CN: 1,
    DN: 1,
    CV: 1,
  };

  const existingNos = new Set(loadVouchers().map((v) => v.voucherNumber));

  const nextNo = (prefix: VoucherPrefix): string => {
    let n = counters[prefix]++;
    let candidate = `${prefix}-${String(n).padStart(4, "0")}`;
    while (existingNos.has(candidate)) {
      n = counters[prefix]++;
      candidate = `${prefix}-${String(n).padStart(4, "0")}`;
    }
    existingNos.add(candidate);
    return candidate;
  };

  for (const primary of postable) {
    const templates = resolveTxnTemplates(primary, records);
    templates.forEach((template, idx) => {
      const contra = findContra(primary, records, template.voucherType);
      const voucherNo = nextNo(template.prefix);
      const amount = hashAmount(`${primary.id}-${template.prefix}-${idx}`, 12000, 48000);
      postMockVoucher({
        primary,
        contra,
        template,
        voucherNo,
        date: demoDateAt(2 + idx * 3),
        amount,
      });
    });
  }

  localStorage.setItem(VERSION_KEY, COA_LEDGER_TXN_SEED_VERSION);
  dispatchVouchersUpdated();
}

/** Repair missing COA demo transactions on page load without wiping other vouchers. */
export function ensureCoaPostingLedgerTransactionsOnPageLoad(): void {
  const needed = coaLedgerTransactionsNeedRepair();
  if (needed) {
    seedCoaPostingLedgerTransactions(true);
  }
}
