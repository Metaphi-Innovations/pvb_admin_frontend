import { demoDateAt } from "@/lib/accounts/demo-date-utils";

/**

 * Seeds exactly 2 posted voucher lines per COA posting ledger (plus opening balance in UI).

 * Uses a balanced ring: each ledger appears in exactly two double-entry vouchers.

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



export const COA_LEDGER_TXN_SEED_VERSION = "exact-2-ring-v3";

const VERSION_KEY = "ds_coa_ledger_txn_seed_version";

export const COA_DEMO_VOUCHER_PREFIX = "COA-DMO-";



const DEMO_DATES = [demoDateAt(8), demoDateAt(16)];



const DEFAULT_VOUCHER_TYPES: Record<AccountType, [string, string]> = {

  Asset: ["Receipt Voucher", "Journal Voucher"],

  Liability: ["Payment Voucher", "Journal Voucher"],

  Income: ["Sales Invoice", "Journal Voucher"],

  Expense: ["Payment Voucher", "Journal Voucher"],

  Equity: ["Journal Voucher", "Receipt Voucher"],

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



function resolveVoucherTypes(ledger: ChartOfAccount, records: ChartOfAccount[]): [string, string] {

  const spec = resolveSpecializedGroupType(ledger, records);

  switch (spec) {

    case "bank_accounts":

      return ["Receipt Voucher", "Contra Voucher"];

    case "cash_in_hand":

      return ["Receipt Voucher", "Payment Voucher"];

    case "sundry_debtors":

      return ["Sales Invoice", "Receipt Voucher"];

    case "sundry_creditors":

      return ["Purchase Invoice", "Payment Voucher"];

    case "gst_duties":

    case "gst_output":

    case "gst_input":

    case "gst_payable":

    case "gst_receivable":

      return ["Journal Voucher", "Payment Voucher"];

    case "inventory":

      return ["Journal Voucher", "Purchase Invoice"];

    case "tds_payable":

      return ["Journal Voucher", "Payment Voucher"];

    case "tds_receivable":

      return ["Journal Voucher", "Receipt Voucher"];

    default:

      return DEFAULT_VOUCHER_TYPES[ledger.accountType] ?? ["Journal Voucher", "Journal Voucher"];

  }

}



/** Primary-side debit/credit for a ledger line (increases normal balance). */

function primaryMovement(

  ledger: ChartOfAccount,

  records: ChartOfAccount[],

  txnIndex: 0 | 1,

  amount: number,

): { debit: number; credit: number; voucherType: string } {

  const types = resolveVoucherTypes(ledger, records);

  const voucherType = types[txnIndex] ?? "Journal Voucher";

  const isCreditNature =

    ledger.accountType === "Liability" || ledger.accountType === "Income";



  if (ledger.accountType === "Expense") {

    return { debit: amount, credit: 0, voucherType };

  }

  if (ledger.accountType === "Income") {

    return { debit: 0, credit: amount, voucherType };

  }

  if (isCreditNature) {

    if (voucherType.includes("Payment") || voucherType.includes("Debit")) {

      return { debit: amount, credit: 0, voucherType };

    }

    return { debit: 0, credit: amount, voucherType };

  }

  if (

    voucherType.includes("Receipt") ||

    voucherType.includes("Credit") ||

    (voucherType.includes("Contra") && ledger.accountType === "Asset")

  ) {

    if (voucherType.includes("Contra") && txnIndex === 1) {

      return { debit: 0, credit: amount, voucherType };

    }

    if (voucherType.includes("Receipt")) {

      return { debit: amount, credit: 0, voucherType };

    }

    return { debit: 0, credit: amount, voucherType };

  }

  return { debit: amount, credit: 0, voucherType };

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

  return ([0, 1] as const).map((txnIndex) => {

    const movement = primaryMovement(

      ledger,

      records,

      txnIndex,

      hashAmount(`${ledger.accountName}-${txnIndex}`, 8500, 42000),

    );

    return {

      date: DEMO_DATES[txnIndex],

      voucherNo: `${COA_DEMO_VOUCHER_PREFIX}${ledger.id}-${String(txnIndex + 1).padStart(2, "0")}`,

      voucherType: movement.voucherType,

      partyName: ledger.parentAccount ?? ledger.accountName,

      particulars: `${movement.voucherType} — ${ledger.accountName}`,

      debit: movement.debit,

      credit: movement.credit,

    };

  });

}



function setVoucherNumber(voucherId: number, voucherNumber: string): void {

  const list = loadVouchers();

  const idx = list.findIndex((v) => v.id === voucherId);

  if (idx >= 0) {

    list[idx] = { ...list[idx], voucherNumber };

    saveVouchers(list);

  }

}



export function purgeCoaDemoVouchers(): void {

  saveVouchers(loadVouchers().filter((v) => !v.voucherNumber.startsWith(COA_DEMO_VOUCHER_PREFIX)));

}



/** Count posted COA-DMO voucher lines per ledger id. */

export function countCoaDemoLinesByLedger(): Map<number, number> {

  const map = new Map<number, number>();

  for (const v of loadVouchers()) {

    if (!v.voucherNumber.startsWith(COA_DEMO_VOUCHER_PREFIX)) continue;

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



/** True when any postable ledger has fewer than 2 COA-DMO lines or version is stale. */

export function coaLedgerTransactionsNeedRepair(): boolean {

  if (typeof window === "undefined") return false;

  if (localStorage.getItem(VERSION_KEY) !== COA_LEDGER_TXN_SEED_VERSION) return true;



  const records = loadChartOfAccounts();

  const postable = getPostableCoaAccounts(records);

  if (postable.length === 0) return false;



  const counts = countCoaDemoLinesByLedger();

  return postable.some((ledger) => (counts.get(ledger.id) ?? 0) < 2);

}



function postRingVoucher(

  primary: ChartOfAccount,

  contra: ChartOfAccount,

  records: ChartOfAccount[],

  txnIndex: 0 | 1,

  voucherNo: string,

  date: string,

): void {

  const amount = hashAmount(`${primary.id}-${contra.id}-${txnIndex}`, 8500, 42000);

  const primaryLine = primaryMovement(primary, records, txnIndex, amount);



  const v = createVoucher(mapDisplayTypeToCode(primaryLine.voucherType), {

    date,

    referenceNo: voucherNo,

    narration: `${primaryLine.voucherType} — ${primary.accountName}`,

    status: "posted",

    lines: [

      {

        id: 1,

        ledgerId: primary.id,

        ledgerName: primary.accountName,

        debit: primaryLine.debit,

        credit: primaryLine.credit,

        remarks: primaryLine.voucherType,

      },

      {

        id: 2,

        ledgerId: contra.id,

        ledgerName: contra.accountName,

        debit: primaryLine.credit,

        credit: primaryLine.debit,

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



/** Post exactly 2 demo transactions per posting ledger via balanced ring vouchers. */

export function seedCoaPostingLedgerTransactions(force = false): void {

  if (typeof window === "undefined") return;



  const stored = localStorage.getItem(VERSION_KEY);

  if (!force && stored === COA_LEDGER_TXN_SEED_VERSION && !coaLedgerTransactionsNeedRepair()) {

    return;

  }



  purgeCoaDemoVouchers();



  const records = loadChartOfAccounts();

  const postable = getPostableCoaAccounts(records).sort((a, b) => a.id - b.id);

  const n = postable.length;

  if (n === 0) return;



  const existingNos = new Set(loadVouchers().map((v) => v.voucherNumber));



  if (n === 1) {

    const only = postable[0];

    const fallback =

      records.find(

        (r) =>

          r.nodeLevel === "ledger" &&

          r.status === "active" &&

          r.id !== only.id,

      ) ?? only;



    for (const txnIndex of [0, 1] as const) {

      const voucherNo = `${COA_DEMO_VOUCHER_PREFIX}${only.id}-0${txnIndex + 1}`;

      if (!existingNos.has(voucherNo)) {

        postRingVoucher(only, fallback, records, txnIndex, voucherNo, DEMO_DATES[txnIndex]);

        existingNos.add(voucherNo);

      }

    }

  } else {

    for (let i = 0; i < n; i++) {

      const primary = postable[i];

      const contra = postable[(i + 1) % n];

      const voucherNo = `${COA_DEMO_VOUCHER_PREFIX}${primary.id}-01`;

      if (!existingNos.has(voucherNo)) {

        postRingVoucher(primary, contra, records, (i % 2) as 0 | 1, voucherNo, DEMO_DATES[i % 2]);

        existingNos.add(voucherNo);

      }

    }

  }



  localStorage.setItem(VERSION_KEY, COA_LEDGER_TXN_SEED_VERSION);

  dispatchVouchersUpdated();

}



/** Repair missing COA demo transactions on page load without wiping other vouchers. */

export function ensureCoaPostingLedgerTransactionsOnPageLoad(): void {

  if (coaLedgerTransactionsNeedRepair()) {

    seedCoaPostingLedgerTransactions(true);

  }

}


