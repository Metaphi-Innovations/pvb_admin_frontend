import type { ChartOfAccount } from "@/app/(app)/accounts/data";

import { loadChartOfAccounts } from "@/app/(app)/accounts/data";

import { getAncestorPath } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";

import { computeLedgerCurrentBalance } from "@/app/(app)/accounts/masters/ledgers/ledgers-utils";

import { loadVouchers, type AccountingVoucher } from "@/app/(app)/accounts/vouchers/voucher-data";

import { computeCustomerOutstanding } from "@/lib/accounts/receivables-data";

import { computeVendorOutstanding } from "@/lib/accounts/payables-data";

import { statementVoucherNo } from "@/lib/accounts/sales-invoice-accounting";



export type LedgerTypeLabel =

  | "Customer"

  | "Vendor"

  | "Bank"

  | "Cash"

  | "Sales"

  | "Purchase"

  | "Expense"

  | "GST"

  | "Employee Payable"

  | "Loan"

  | "Fixed Asset"

  | "General";



const VOUCHER_TYPE_LABELS: Record<string, string> = {

  sales: "Sales Invoice",

  purchase: "Purchase Invoice",

  receipt: "Receipt Voucher",

  payment: "Payment Voucher",

  journal: "Journal Voucher",

  credit_note: "Credit Note",

  debit_note: "Debit Note",

  contra: "Contra Voucher",

};



export function resolveLedgerType(

  ledger: ChartOfAccount,

  records: ChartOfAccount[],

): LedgerTypeLabel {

  const path = getAncestorPath(records, ledger.id);

  const names = path.map((p) => p.accountName.toLowerCase()).join(" ");

  if (names.includes("trade receivables") || names.includes("sundry debtors")) return "Customer";

  if (names.includes("trade payables") || names.includes("sundry creditors")) return "Vendor";

  if (names.includes("bank accounts") || ledger.bankAccountFlag) return "Bank";

  if (names.includes("cash-in-hand") || names.includes("cash in hand")) return "Cash";

  if (names.includes("income") && names.includes("sales")) return "Sales";

  if (names.includes("purchase") || names.includes("direct expenses")) return "Purchase";

  if (names.includes("expenses payable") || names.includes("employee")) return "Employee Payable";

  if (names.includes("duties") || names.includes("gst")) return "GST";

  if (names.includes("fixed assets") || names.includes("plant & machinery")) return "Fixed Asset";

  if (names.includes("loans") || names.includes("borrowings") || names.includes("secured loans")) return "Loan";

  if (ledger.accountType === "Expense") return "Expense";

  return "General";

}



export function parentGroupLabel(records: ChartOfAccount[], ledger: ChartOfAccount): string {

  const path = getAncestorPath(records, ledger.id);

  const parent = path.length > 1 ? path[path.length - 2] : null;

  return parent?.accountName ?? "—";

}



export function ledgerOutstanding(ledger: ChartOfAccount): number {

  const cust = computeCustomerOutstanding().find(

    (r) => r.ledgerId === ledger.id || r.customerName === ledger.accountName,

  );

  if (cust) return cust.outstanding;

  const vend = computeVendorOutstanding().find(

    (r) => r.ledgerId === ledger.id || r.vendorName === ledger.accountName,

  );

  if (vend) return vend.outstanding;

  return 0;

}



export interface LedgerTransactionRow {

  id: string;

  date: string;

  voucherType: string;

  voucherNo: string;

  particulars: string;

  debit: number;

  credit: number;

  href?: string;

}



function voucherViewHref(v: AccountingVoucher): string | undefined {

  switch (v.voucherType) {

    case "journal":

      return `/accounts/vouchers/journal`;

    case "receipt":

    case "payment":

    case "contra":

      return `/accounts/vouchers?tab=${v.voucherType}`;

    default:

      return `/accounts/vouchers/journal`;

  }

}



/** Posted vouchers only — COA reflects accounting entries, not source documents. */

export function collectLedgerTransactions(ledgerId: number): LedgerTransactionRow[] {

  const rows: LedgerTransactionRow[] = [];



  loadVouchers()

    .filter((v) => v.status === "posted" || v.status === "approved")

    .forEach((v: AccountingVoucher) => {

      v.lines.forEach((line) => {

        if (line.ledgerId !== ledgerId) return;

        rows.push({

          id: `v-${v.id}-${line.id}`,

          date: v.date,

          voucherType: VOUCHER_TYPE_LABELS[v.voucherType] ?? v.voucherType,

          voucherNo: statementVoucherNo(v),

          particulars: line.remarks || v.narration || line.ledgerName || "—",

          debit: Number(line.debit) || 0,

          credit: Number(line.credit) || 0,

          href: voucherViewHref(v),

        });

      });

    });



  return rows.sort((a, b) => b.date.localeCompare(a.date));

}



export interface StatementRow {

  date: string;

  voucherType: string;

  voucherNo: string;

  particulars: string;

  debit: number;

  credit: number;

  runningBalance: number;

  balanceType: "Debit" | "Credit";

}



export function buildLedgerStatement(

  ledger: ChartOfAccount,

  transactions: LedgerTransactionRow[],

): StatementRow[] {

  const balance = computeLedgerCurrentBalance(ledger);

  const isDebitNature =

    balance.balanceType === "Debit" ||

    ledger.accountType === "Asset" ||

    ledger.accountType === "Expense";



  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

  let running = ledger.openingBalance;

  let runningType: "Debit" | "Credit" = ledger.balanceType;



  const rows: StatementRow[] = [];



  rows.push({

    date: "—",

    voucherType: "Opening",

    voucherNo: "—",

    particulars: "Opening Balance",

    debit: ledger.balanceType === "Debit" ? ledger.openingBalance : 0,

    credit: ledger.balanceType === "Credit" ? ledger.openingBalance : 0,

    runningBalance: Math.abs(running),

    balanceType: runningType,

  });



  for (const tx of sorted) {

    if (isDebitNature) {

      running += tx.debit - tx.credit;

      runningType = running >= 0 ? "Debit" : "Credit";

    } else {

      running += tx.credit - tx.debit;

      runningType = running >= 0 ? "Credit" : "Debit";

    }

    rows.push({

      date: tx.date,

      voucherType: tx.voucherType,

      voucherNo: tx.voucherNo,

      particulars: tx.particulars,

      debit: tx.debit,

      credit: tx.credit,

      runningBalance: Math.abs(running),

      balanceType: runningType,

    });

  }



  return rows;

}



export function getLedgerById(id: number): ChartOfAccount | null {

  const records = loadChartOfAccounts();

  const node = records.find(

    (r) => r.id === id && (r.nodeLevel === "ledger" || r.nodeLevel === "sub_ledger"),

  );

  return node ?? null;

}


